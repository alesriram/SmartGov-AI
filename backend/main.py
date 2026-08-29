import datetime
import json
import os
import re
import shutil
import uuid
from collections import Counter
from typing import List, Optional

from fastapi import BackgroundTasks, Body, Depends, FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import func
from sqlalchemy.orm import Session

import models
import schemas
from agents.workflow import run_workflow
from analytics.forecasting import forecast_complaints, get_hotspots
from assistant_service import (
    generate_ai_assistant_response,
    get_llm_status,
    save_llm_config,
    test_llm_connection,
)
from cv_module.detector import analyze_image
from database import Base, SessionLocal, engine, get_db
from mailservice import get_department_head, send_complaint_acknowledgement
from nlp_module.processor import process_complaint_text

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Smart City Complaint Management & Predictive Analytics Platform",
    description="Backend API: CV issue detection, NLP, multi-agent routing, "
                "predictive analytics, and GIS-ready endpoints.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")

@app.on_event("startup")
def on_startup():
    try:
        from seed_data import seed
        seed()
    except Exception as e:
        print("Startup database seed notice:", e)



@app.get("/")
def root():
    return {
        "message": "AI Smart City Complaint Management Platform API",
        "docs": "/docs",
        "endpoints": [
            "/complaints [POST] - submit a complaint (with optional image)",
            "/complaints [GET] - list complaints (filterable)",
            "/complaints/{id} [GET] - complaint detail incl. agent trace",
            "/dashboard/stats [GET]",
            "/analytics/forecast [GET]",
            "/analytics/hotspots [GET]",
            "/departments [GET]",
            "/assistant/chat [POST] - ask the AI civic operations agent",
        ],
    }


@app.get("/assistant/config")
def assistant_get_config():
    """Returns active LLM provider, models, and key configuration status."""
    return get_llm_status()


@app.post("/assistant/config")
def assistant_save_config(payload: dict = Body(...)):
    """Tests and saves LLM configuration (Groq, Gemini, or OpenAI) to .env."""
    provider = (payload or {}).get("provider", "").strip().lower()
    api_key = (payload or {}).get("api_key", "").strip()
    model = (payload or {}).get("model")

    if not provider or not api_key:
        raise HTTPException(400, "Both 'provider' and 'api_key' are required")

    test_res = test_llm_connection(provider=provider, api_key=api_key, model=model)
    if not test_res.get("success"):
        raise HTTPException(400, f"API key validation failed: {test_res.get('error')}")

    save_res = save_llm_config(provider=provider, api_key=api_key, model=model)
    return {
        "success": True,
        "message": f"Successfully connected to {provider.upper()}!",
        "provider": provider,
        "model": save_res.get("model"),
        "test_reply": test_res.get("message"),
    }


@app.post("/assistant/chat")
def assistant_chat(payload: dict = Body(...), db: Session = Depends(get_db)):
    question = (payload or {}).get("question", "")
    if not question or not str(question).strip():
        raise HTTPException(400, "Question is required")

    clean_q = str(question).strip()
    preferred_provider = (payload or {}).get("provider")

    # 1. Fetch dashboard stats
    dashboard = dashboard_stats(db=db)
    stats_data = dashboard.model_dump() if hasattr(dashboard, "model_dump") else dashboard

    # 2. Fetch recent and critical complaints
    recent_complaints = list_complaints(limit=30, db=db)
    complaints_data = [c.model_dump() if hasattr(c, "model_dump") else c for c in recent_complaints]

    # 3. Fetch departments & capacity
    depts_data = list_departments(db=db)

    # 4. Fetch predictive hotspots
    hotspots_raw = analytics_hotspots(db=db)
    hotspots_data = [h.model_dump() if hasattr(h, "model_dump") else h for h in hotspots_raw]

    # 5. Targeted retrieval based on operator question (IDs or keywords)
    query_matched = []
    # Check for specific ID mention like "#12" or "complaint 15" or "id 7"
    id_matches = re.findall(r"(?:#|complaint\s+|id\s+)(\d+)", clean_q, flags=re.IGNORECASE)
    if id_matches:
        for mid in id_matches[:3]:
            try:
                c_item = db.query(models.Complaint).filter(models.Complaint.id == int(mid)).first()
                if c_item:
                    query_matched.append(_to_out(c_item).model_dump())
            except Exception:
                pass

    # Keyword search across complaint description, category, and address
    words = [w.lower() for w in re.findall(r"\b[a-zA-Z]{4,}\b", clean_q) if w.lower() not in ["what", "where", "which", "about", "there", "these", "please", "could", "would", "should"]]
    if words and len(query_matched) < 5:
        q_filter = db.query(models.Complaint)
        for w in words[:3]:
            q_filter = q_filter.filter(
                models.Complaint.description.ilike(f"%{w}%") |
                models.Complaint.category.ilike(f"%{w}%") |
                models.Complaint.address.ilike(f"%{w}%")
            )
        matched_items = q_filter.limit(5).all()
        for item in matched_items:
            item_dict = _to_out(item).model_dump()
            if not any(qm["id"] == item_dict["id"] for qm in query_matched):
                query_matched.append(item_dict)

    # 6. Generate accurate response through multi-LLM engine
    answer, source, model = generate_ai_assistant_response(
        question=clean_q,
        stats=stats_data,
        complaints=complaints_data,
        departments=depts_data,
        hotspots=hotspots_data,
        query_matched=query_matched,
        preferred_provider=preferred_provider,
    )

    return {
        "answer": answer,
        "source": source,
        "model": model,
    }


# ---------------------------------------------------------------------------
# Complaint submission (runs CV + NLP + multi-agent workflow synchronously)
# ---------------------------------------------------------------------------
@app.post("/complaints", response_model=schemas.ComplaintOut)
async def submit_complaint(
    background_tasks: BackgroundTasks,
    description: str = Form(...),
    citizen_name: Optional[str] = Form(None),
    citizen_contact: Optional[str] = Form(None),
    original_language: str = Form("en"),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    address: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
):
    orig_lang = original_language if isinstance(original_language, str) else getattr(original_language, "default", "en")
    c_name = citizen_name if isinstance(citizen_name, str) or citizen_name is None else getattr(citizen_name, "default", None)
    c_contact = citizen_contact if isinstance(citizen_contact, str) or citizen_contact is None else getattr(citizen_contact, "default", None)
    c_addr = address if isinstance(address, str) or address is None else getattr(address, "default", None)

    # 1. Save image if provided
    image_path = None
    cv_result = None
    if image and hasattr(image, "filename") and image.filename:
        ext = os.path.splitext(image.filename)[1] or ".jpg"
        filename = f"{uuid.uuid4().hex}{ext}"
        full_path = os.path.join(UPLOAD_DIR, filename)
        with open(full_path, "wb") as f:
            shutil.copyfileobj(image.file, f)
        image_path = f"/uploads/{filename}"

        # Run CV detector
        cv_result = analyze_image(full_path)

    # 2. Process text with NLP
    nlp_result = process_complaint_text(description)

    # 3. Multi-agent workflow (classification -> routing -> priority -> response)
    agent_state = run_workflow(nlp_result, cv_result)

    # 4. Resolve department record
    dept = db.query(models.Department).filter(
        models.Department.name == agent_state["department"]
    ).first()

    # 5. Persist
    complaint = models.Complaint(
        citizen_name=c_name,
        citizen_contact=c_contact,
        description=description,
        original_language=nlp_result.get("detected_language") or orig_lang,
        translated_description=nlp_result.get("translated_description"),
        image_path=image_path,
        detected_objects=json.dumps(cv_result) if cv_result else None,
        category=agent_state["category"],
        subcategory=agent_state["subcategory"],
        priority=agent_state["priority"],
        status=models.ComplaintStatus.ROUTED,
        latitude=latitude,
        longitude=longitude,
        address=c_addr,
        department_id=dept.id if dept else None,
        ai_summary=nlp_result.get("summary"),
        ai_response=agent_state["ai_response"],
        agent_trace=json.dumps(agent_state["trace"]),
    )
    db.add(complaint)
    db.commit()
    db.refresh(complaint)

    complaint_payload = {
        "id": complaint.id,
        "citizen_name": complaint.citizen_name,
        "citizen_contact": complaint.citizen_contact,
        "category": complaint.category,
        "priority": complaint.priority.value if hasattr(complaint.priority, "value") else str(complaint.priority),
        "department_name": dept.name if dept else "Municipal Department",
        "address": complaint.address,
        "description": complaint.description,
        "ai_response": complaint.ai_response,
    }

    # Dispatch email acknowledgement immediately so cloud workers guarantee delivery before idling
    email_dispatched = False
    try:
        email_dispatched = send_complaint_acknowledgement(complaint_payload)
        print(f"[main] Complaint #{complaint.id} acknowledgement dispatched: {email_dispatched} to '{complaint.citizen_contact}'")
    except Exception as mail_err:
        print(f"[main] Complaint #{complaint.id} email dispatch encountered error: {mail_err}")

    return _to_out(complaint, email_dispatched=email_dispatched)


def _to_out(c: models.Complaint, email_dispatched: Optional[bool] = None) -> schemas.ComplaintOut:
    head = get_department_head(c.category)
    return schemas.ComplaintOut(
        id=c.id,
        citizen_name=c.citizen_name,
        citizen_contact=c.citizen_contact,
        description=c.description,
        original_language=c.original_language,
        translated_description=c.translated_description,
        category=c.category,
        subcategory=c.subcategory,
        priority=c.priority.value if hasattr(c.priority, "value") else c.priority,
        status=c.status.value if hasattr(c.status, "value") else c.status,
        latitude=c.latitude,
        longitude=c.longitude,
        address=c.address,
        department=c.department.name if c.department else None,
        department_head=head,
        ai_summary=c.ai_summary,
        ai_response=c.ai_response,
        detected_objects=c.detected_objects,
        image_path=c.image_path,
        created_at=c.created_at,
        email_dispatched=email_dispatched,
    )


@app.post("/test-email")
def test_email(to: str = "alesaisriramkumar@gmail.com"):
    """Instant test endpoint to verify email delivery from Render or local server."""
    payload = {
        "id": 8888,
        "citizen_name": "Email Diagnostic Test",
        "citizen_contact": to,
        "category": "traffic",
        "priority": "High",
        "department_name": "Traffic Management Department",
        "address": "Diagnostic Run, Hyderabad",
        "description": f"Verification test email sent to {to}",
        "ai_response": "Test verification email dispatched successfully.",
    }
    sent = send_complaint_acknowledgement(payload)
    return {"status": "success" if sent else "failed", "recipient": to, "sent": sent}


@app.get("/complaints", response_model=List[schemas.ComplaintOut])
def list_complaints(
    category: Optional[str] = None,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    search: Optional[str] = None,
    citizen: Optional[str] = None,
    limit: int = 200,
    db: Session = Depends(get_db),
):
    q = db.query(models.Complaint)
    if category:
        q = q.filter(models.Complaint.category == category)
    if status:
        q = q.filter(models.Complaint.status == status)
    if priority:
        q = q.filter(models.Complaint.priority == priority)
    if citizen:
        q = q.filter(
            models.Complaint.citizen_name.ilike(f"%{citizen}%") |
            models.Complaint.citizen_contact.ilike(f"%{citizen}%")
        )
    if search:
        search_term = search.strip()
        if search_term.isdigit():
            q = q.filter(
                (models.Complaint.id == int(search_term)) |
                models.Complaint.description.ilike(f"%{search_term}%") |
                models.Complaint.address.ilike(f"%{search_term}%") |
                models.Complaint.citizen_name.ilike(f"%{search_term}%")
            )
        else:
            q = q.filter(
                models.Complaint.description.ilike(f"%{search_term}%") |
                models.Complaint.address.ilike(f"%{search_term}%") |
                models.Complaint.citizen_name.ilike(f"%{search_term}%")
            )
    complaints = q.order_by(models.Complaint.created_at.desc()).limit(limit).all()
    return [_to_out(c) for c in complaints]


@app.get("/complaints/{complaint_id}")
def get_complaint(complaint_id: int, db: Session = Depends(get_db)):
    c = db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()
    if not c:
        raise HTTPException(404, "Complaint not found")
    out = _to_out(c).model_dump()
    out["agent_trace"] = json.loads(c.agent_trace) if c.agent_trace else []
    return out


@app.delete("/complaints/{complaint_id}")
def delete_complaint(complaint_id: int, db: Session = Depends(get_db)):
    c = db.query(models.Complaint).filter(models.Complaint.id == complaint_id).first()
    if not c:
        raise HTTPException(404, "Complaint not found")
    db.delete(c)
    db.commit()
    return {"success": True, "id": complaint_id}


@app.get("/departments")
def list_departments(db: Session = Depends(get_db)):
    depts = db.query(models.Department).all()
    return [
        {
            "id": d.id, "name": d.name, "category": d.category,
            "email": d.email, "active_officers": d.active_officers,
            "open_complaints": db.query(models.Complaint).filter(
                models.Complaint.department_id == d.id,
                models.Complaint.status != models.ComplaintStatus.RESOLVED,
            ).count(),
        }
        for d in depts
    ]


# ---------------------------------------------------------------------------
# Dashboard stats
# ---------------------------------------------------------------------------
@app.get("/dashboard/stats", response_model=schemas.DashboardStats)
def dashboard_stats(db: Session = Depends(get_db)):
    total = db.query(models.Complaint).count()
    received = db.query(models.Complaint).filter(
        models.Complaint.status == models.ComplaintStatus.RECEIVED).count()
    in_progress = db.query(models.Complaint).filter(
        models.Complaint.status.in_([models.ComplaintStatus.IN_PROGRESS,
                                      models.ComplaintStatus.ROUTED,
                                      models.ComplaintStatus.CLASSIFIED])).count()
    resolved = db.query(models.Complaint).filter(
        models.Complaint.status == models.ComplaintStatus.RESOLVED).count()
    critical_open = db.query(models.Complaint).filter(
        models.Complaint.priority == models.Priority.CRITICAL,
        models.Complaint.status != models.ComplaintStatus.RESOLVED,
    ).count()

    resolved_complaints = db.query(models.Complaint).filter(
        models.Complaint.status == models.ComplaintStatus.RESOLVED,
        models.Complaint.resolved_at.isnot(None),
    ).all()
    if resolved_complaints:
        hours = [
            (c.resolved_at - c.created_at).total_seconds() / 3600
            for c in resolved_complaints
        ]
        avg_resolution_hours = round(sum(hours) / len(hours), 1)
    else:
        avg_resolution_hours = None

    all_complaints = db.query(models.Complaint).all()
    category_breakdown = dict(Counter(c.category for c in all_complaints if c.category))
    priority_breakdown = dict(Counter(
        c.priority.value if hasattr(c.priority, "value") else c.priority
        for c in all_complaints if c.priority
    ))

    return schemas.DashboardStats(
        total_complaints=total,
        received=received,
        in_progress=in_progress,
        resolved=resolved,
        critical_open=critical_open,
        avg_resolution_hours=avg_resolution_hours,
        category_breakdown=category_breakdown,
        priority_breakdown=priority_breakdown,
    )


# ---------------------------------------------------------------------------
# Predictive analytics
# ---------------------------------------------------------------------------
@app.get("/analytics/forecast")
def analytics_forecast(days_ahead: int = 7, db: Session = Depends(get_db)):
    complaints = db.query(models.Complaint).all()
    daily_counts = Counter(
        (c.created_at.strftime("%Y-%m-%d"), c.category)
        for c in complaints if c.category
    )
    historical = [
        {"date": date, "category": cat, "count": count}
        for (date, cat), count in daily_counts.items()
    ]
    return forecast_complaints(historical, days_ahead=days_ahead)


@app.get("/analytics/hotspots", response_model=List[schemas.HotspotOut])
def analytics_hotspots(db: Session = Depends(get_db)):
    complaints = db.query(models.Complaint).filter(
        models.Complaint.latitude.isnot(None),
        models.Complaint.longitude.isnot(None),
    ).all()
    data = [
        {"latitude": c.latitude, "longitude": c.longitude, "category": c.category}
        for c in complaints
    ]
    return get_hotspots(data)


@app.get("/analytics/trends")
def analytics_trends(db: Session = Depends(get_db)):
    """Last-30-days daily complaint counts, for trend line charts."""
    since = datetime.datetime.utcnow() - datetime.timedelta(days=30)
    complaints = db.query(models.Complaint).filter(
        models.Complaint.created_at >= since
    ).all()
    daily = Counter(c.created_at.strftime("%Y-%m-%d") for c in complaints)
    days = sorted(daily.keys())
    return [{"date": d, "count": daily[d]} for d in days]
