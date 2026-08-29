# AI Smart City Complaint Management & Predictive Analytics Platform

A working full-stack capstone project: citizens submit complaints (text + photo
+ location), the system runs them through a Computer Vision detector, an NLP
pipeline, and a 4-agent AI workflow (Classification → Routing → Priority →
Response), then surfaces everything on a live GIS/analytics dashboard.

```
smartcity-ai/
├── backend/                # FastAPI service
│   ├── main.py              # API routes
│   ├── models.py / schemas.py / database.py
│   ├── cv_module/detector.py       # image analysis
│   ├── nlp_module/processor.py     # text analysis
│   ├── agents/workflow.py          # 4-agent pipeline
│   ├── analytics/forecasting.py    # forecasting + hotspots
│   └── seed_data.py         # generates 45 days of demo complaints
└── frontend/                # React (Vite) dashboard
    └── src/
        ├── App.jsx
        └── components/       # TopBar, AgentPipeline, charts, map, forms
```

## Quick start

### 1. Backend

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1   # PowerShell
# or: .\venv\Scripts\activate.bat   # Command Prompt
pip install -r requirements.txt
python seed_data.py           # creates smartcity.db with demo departments + 45 days of complaints
uvicorn main:app --reload     # http://localhost:8000  (docs at /docs)
```

To send acknowledgement emails, configure SMTP before starting the backend:

```powershell
$env:SMTP_HOST="smtp.gmail.com"
$env:SMTP_PORT="587"
$env:SMTP_USERNAME="alesriram27@gmail.com"
$env:SMTP_PASSWORD="txuevhatcacmkhbn"
$env:SMTP_FROM="alesriram27@gmail.com"
$env:SMTP_USE_SSL="false"
```

The user's `Contact` value is treated as an email address when it contains a
valid email format. SMTP delivery is best-effort: a complaint remains saved if
SMTP is not configured or the mail server is unavailable.

### AI Copilot LLM Integration (Groq & Gemini)

SmartGov Copilot supports **Groq** (Llama 3.3 70B), **Google Gemini** (1.5 / 2.0 Flash), and **OpenAI**:

Configure your key directly in `backend/.env` or click **"LLM API Settings"** in the Copilot UI:

```powershell
# Option A: Groq (Recommended - Free & Fast: https://console.groq.com)
$env:GROQ_API_KEY="gsk_..."
$env:GROQ_MODEL="llama-3.3-70b-versatile"

# Option B: Google Gemini (Free: https://aistudio.google.com)
$env:GEMINI_API_KEY="AIzaSy..."
$env:GEMINI_MODEL="gemini-1.5-flash"
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev                 # http://localhost:5173
```

Open the frontend URL — the "Command Center" tab loads live stats, charts,
the hotspot map, and the complaint feed; "Report an Issue" lets you submit a
new complaint (with an optional photo) and watch the AI agents process it in
real time in the pipeline panel.

## What's real vs. simulated (read this before your demo/viva)

Being upfront about this will make your project defense much stronger —
judges respect honesty about scope far more than an unlabeled black box.

| Component | Status |
|---|---|
| FastAPI backend, REST API, SQLAlchemy ORM, SQLite DB | **Real**, fully functional |
| NLP (category/urgency/entity extraction, summarization) | **Real**, rule-based (keyword + regex) by default. A drop-in real-LLM path (`_llm_nlp` in `nlp_module/processor.py`) is included — set `OPENAI_API_KEY` to switch it on automatically. |
| 4-agent workflow (Classification/Routing/Priority/Response) | **Real** working pipeline with full decision tracing. Implemented as a sequential state machine so it runs with zero dependencies; structured to be a 1:1 port to a real `langgraph.StateGraph` (see comments in `agents/workflow.py`). |
| Generic object detection (cars, people, etc.) | **Real** YOLOv8n (COCO-pretrained) via Ultralytics, runs actual CPU inference on uploaded images. |
| Civic-issue detection (pothole, garbage overflow, etc.) | **Simulated.** No public pretrained model detects "pothole" or "garbage overflow" — these require a custom-labeled dataset. `cv_module/detector.py` uses classic OpenCV image statistics (edge density, color masks) to produce plausible, explainable results in the exact output schema a fine-tuned YOLOv8 model would return. Swapping in a real fine-tuned model later is a one-function change — see the comments at the top of that file, and consider Roboflow's public pothole/garbage-overflow datasets for training data. |
| Forecasting (complaint volume prediction) | **Real** scikit-learn regression trained on (synthetic) historical complaint counts. |
| Hotspot detection | **Real** grid-based geospatial clustering on actual stored lat/long data. |
| GIS map | **Real** Leaflet map with live data from the API. |
| Dashboard, charts, live agent trace visualization | **Real**, all wired to live API data, auto-refreshes every 15s. |

## Suggested next steps to strengthen this for competition

1. **Fine-tune YOLOv8 on a real civic dataset** (Roboflow has open pothole and
   garbage datasets) and swap it into `cv_module/detector.py` — this is the
   single highest-impact upgrade and is genuinely a manageable weekend task.
2. **Wire in a real LLM** (`OPENAI_API_KEY` or a local Llama 3 via Groq) for
   the NLP module — the code path already exists, it's one env var away.
3. **Port `agents/workflow.py` to real LangGraph** — the functions are
   already shaped as graph nodes; this mainly demonstrates you understand the
   multi-agent framework mentioned in your proposal.
4. **Swap SQLite → PostgreSQL** for the "production-grade" story — change one
   line in `database.py`.
5. **Add authentication** (citizen login, department-staff login) if your
   rubric rewards role-based access control.
6. **Deploy** the backend (Render/Railway) and frontend (Vercel/Netlify) so
   you can demo from a live URL instead of localhost.

## Tech stack

Python, FastAPI, SQLAlchemy, SQLite, OpenCV, Ultralytics YOLOv8, scikit-learn,
React, Vite, Recharts, Leaflet/react-leaflet, Axios.
