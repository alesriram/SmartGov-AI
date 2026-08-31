"""
Multi-Agent Workflow
---------------------
Coordinates four specialized agents to process a complaint end-to-end:
  1. Classification Agent  - determines category/subcategory from NLP + CV output
  2. Routing Agent         - determines which department should handle it
  3. Priority Assessment Agent - determines urgency (low/medium/high/critical)
  4. Citizen Response Agent - drafts an automated acknowledgement to the citizen

Design note: This is implemented as a plain, dependency-free sequential state
machine so the project runs anywhere with zero setup. It mirrors exactly how
you'd structure this as a LangGraph `StateGraph` — each function below is a
"node", and `run_workflow` is the graph's linear edge sequence. To port to
real LangGraph:

    from langgraph.graph import StateGraph, END
    graph = StateGraph(ComplaintState)
    graph.add_node("classify", classification_agent)
    graph.add_node("route", routing_agent)
    graph.add_node("prioritize", priority_agent)
    graph.add_node("respond", response_agent)
    graph.add_edge("classify", "route")
    graph.add_edge("route", "prioritize")
    graph.add_edge("prioritize", "respond")
    graph.add_edge("respond", END)
    graph.set_entry_point("classify")
    app = graph.compile()

each agent function's signature (state in, state out) is already compatible
with that pattern.
"""
from typing import Dict, List, Optional

DEPARTMENT_MAP = {
    "roads": "Roads & Infrastructure Department (Pavement & Corridor Division)",
    "sanitation": "Sanitation & Waste Management Department (Solid Waste Division)",
    "water_supply": "Water Supply & Sewerage Board (Pipeline Triage Unit)",
    "electricity": "Electricity & Street Lighting Department (Safety & Grid Division)",
    "traffic": "Traffic Police & Urban Transit Enforcement Division",
    "public_health": "Public Health & Vector Control Department",
    "general": "General Municipal Grievance Cell",
}

CRITICAL_SAFETY_KEYWORDS = [
    "sparking", "live wire", "open wire", "electric shock", "transformer",
    "open manhole", "manhole open", "child fell", "accident", "fatal",
    "sinkhole", "deep hole", "submerged", "flooding inside", "contamination",
    "dengue", "malaria outbreak", "hospital", "school gate", "danger", "khatra",
    "emergency", "urgent", "immediate danger"
]

HIGH_SAFETY_KEYWORDS = [
    "heavy traffic", "water logging", "overflow", "stray dogs", "dark street",
    "no lights", "leakage", "pipeline burst", "stink", "foul smell", "garbage pile",
    "broken signal", "divider broken", "bad odor", "blocked road"
]


def classification_agent(state: Dict) -> Dict:
    """Multi-modal classification agent combining NLP intent + Computer Vision confidence."""
    nlp_res = state.get("nlp_result", {})
    nlp_cat = nlp_res.get("category", "general")
    cv_res = state.get("cv_result", {})
    cv_cat_raw = cv_res.get("top_category")
    cv_conf = cv_res.get("confidence", 0.0)

    cv_to_dept = {
        "pothole": "roads",
        "road_damage": "roads",
        "garbage_overflow": "sanitation",
        "water_leakage": "water_supply",
        "damaged_streetlight": "electricity",
        "illegal_parking": "traffic",
    }
    cv_cat = cv_to_dept.get(cv_cat_raw)

    confidence = 0.85
    if cv_cat and cv_cat == nlp_cat:
        final_cat = nlp_cat
        confidence = min(0.98, max(0.90, cv_conf + 0.15))
        source = f"Multimodal Agreement (CV: {cv_cat_raw} @ {round(cv_conf*100)}% + NLP)"
    elif cv_cat and cv_conf >= 0.78 and nlp_cat in ["general", "roads"]:
        final_cat = cv_cat
        confidence = cv_conf
        source = f"High-Confidence Computer Vision ({cv_cat_raw} @ {round(cv_conf*100)}%)"
    elif nlp_cat and nlp_cat != "general":
        final_cat = nlp_cat
        source = f"Multilingual NLP Intent Analysis"
    elif cv_cat:
        final_cat = cv_cat
        source = f"Computer Vision Detection ({cv_cat_raw})"
    else:
        final_cat = "general"
        source = "Heuristic Grievance Match"

    state["category"] = final_cat
    state["subcategory"] = cv_cat_raw or nlp_res.get("subcategory") or final_cat
    state["confidence_score"] = round(confidence, 2)
    state["trace"].append({
        "agent": "Classification Agent",
        "decision": f"category={final_cat} (conf: {round(confidence*100)}%)",
        "reason": source,
    })
    return state


def routing_agent(state: Dict) -> Dict:
    """Workload and specialization-aware routing agent."""
    category = state.get("category", "general")
    priority = state.get("priority", "medium")
    dept = DEPARTMENT_MAP.get(category, DEPARTMENT_MAP["general"])

    is_rapid_dispatch = priority in ["critical", "high"]
    dispatch_unit = f"🚨 Rapid Response Unit ({dept})" if is_rapid_dispatch else dept

    state["department"] = dept
    state["dispatch_unit"] = dispatch_unit
    state["trace"].append({
        "agent": "Routing Agent",
        "decision": f"routed_to={dept}",
        "reason": f"Category '{category}' allocated to specialized authority; Rapid Unit: {is_rapid_dispatch}",
    })
    return state


def priority_agent(state: Dict) -> Dict:
    """Multi-factor priority & SLA assessment agent."""
    nlp_res = state.get("nlp_result", {})
    text = (nlp_res.get("translated_description") or nlp_res.get("summary") or "").lower()
    nlp_urgency = nlp_res.get("urgency_signal", "medium")
    category = state.get("category", "general")
    cv_res = state.get("cv_result", {})
    cv_conf = cv_res.get("confidence", 0.0)

    # Risk score calculation (0 to 10 scale)
    base_scores = {"critical": 8, "high": 5, "medium": 3, "low": 1}
    risk_score = base_scores.get(nlp_urgency, 3)

    critical_keyword_hit = [kw for kw in CRITICAL_SAFETY_KEYWORDS if kw in text]
    high_keyword_hit = [kw for kw in HIGH_SAFETY_KEYWORDS if kw in text]

    if critical_keyword_hit:
        risk_score += 4
    elif high_keyword_hit:
        risk_score += 2

    if category in ["electricity", "public_health"]:
        risk_score += 2

    if cv_conf > 0.85:
        risk_score += 1

    if risk_score >= 8 or bool(critical_keyword_hit):
        final_priority = "critical"
        sla = "2 to 4 Hours (Emergency Directive)"
    elif risk_score >= 5:
        final_priority = "high"
        sla = "12 to 24 Hours"
    elif risk_score >= 3:
        final_priority = "medium"
        sla = "48 to 72 Hours"
    else:
        final_priority = "low"
        sla = "5 to 7 Business Days"

    state["priority"] = final_priority
    state["sla_target"] = sla
    state["trace"].append({
        "agent": "Priority Assessment Agent",
        "decision": f"priority={final_priority} (SLA: {sla})",
        "reason": f"Risk Score: {risk_score}/10 | Keywords: {critical_keyword_hit or high_keyword_hit or 'Standard'} | Category: {category}",
    })
    return state


def response_agent(state: Dict) -> Dict:
    """Citizen response agent producing concise, empathetic acknowledgements with emojis."""
    dept = state.get("department", "Municipal Support Team")
    priority = state.get("priority", "medium").upper()
    category = state.get("category", "civic issue").replace("_", " ").title()
    sla = state.get("sla_target", "24-48 hours")

    pri_emoji = "🚨" if priority == "CRITICAL" else "⚠️" if priority == "HIGH" else "📋"

    response = (
        f"✅ Grievance Acknowledged | {pri_emoji} Priority: {priority}\n"
        f"🏛️ Routed to: {dept}\n"
        f"⏱️ Target Resolution SLA: {sla}\n"
        f"📍 Issue Classified: {category}. Field inspectors have been alerted."
    )

    state["ai_response"] = response
    state["trace"].append({
        "agent": "Citizen Response Agent",
        "decision": f"Generated concise civic receipt with SLA: {sla}",
        "reason": "Structured executive format with verified routing and timeline.",
    })
    return state


def run_workflow(nlp_result: Dict, cv_result: Optional[Dict] = None) -> Dict:
    """Executes the 4-agent pipeline sequentially and returns the final state."""
    state = {
        "nlp_result": nlp_result or {},
        "cv_result": cv_result or {},
        "trace": [],
    }
    state = classification_agent(state)
    state = priority_agent(state)
    state = routing_agent(state)
    state = response_agent(state)
    return state
