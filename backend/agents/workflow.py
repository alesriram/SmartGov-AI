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
    "roads": "Roads & Infrastructure Department",
    "sanitation": "Sanitation & Waste Management Department",
    "water_supply": "Water Supply & Sewerage Board",
    "electricity": "Electricity & Street Lighting Department",
    "traffic": "Traffic Police / Urban Transport Authority",
    "public_health": "Public Health Department",
    "general": "General Grievance Cell",
}

CRITICAL_CATEGORIES = {"public_health", "electricity"}


def classification_agent(state: Dict) -> Dict:
    """Combines NLP category + CV top_category, resolves conflicts, sets confidence."""
    nlp_category = state["nlp_result"]["category"]
    cv_category_raw = state.get("cv_result", {}).get("top_category")

    cv_to_dept_category = {
        "pothole": "roads",
        "road_damage": "roads",
        "garbage_overflow": "sanitation",
        "water_leakage": "water_supply",
        "damaged_streetlight": "electricity",
        "illegal_parking": "traffic",
    }
    cv_category = cv_to_dept_category.get(cv_category_raw)

    if cv_category and cv_category != nlp_category and nlp_category == "general":
        final_category = cv_category
        source = "cv_module (text was ambiguous)"
    elif cv_category and cv_category == nlp_category:
        final_category = nlp_category
        source = "nlp+cv agreement"
    else:
        final_category = nlp_category
        source = "nlp_module"

    state["category"] = final_category
    state["subcategory"] = cv_category_raw
    state["trace"].append({
        "agent": "Classification Agent",
        "decision": f"category={final_category}",
        "reason": f"resolved via {source}",
    })
    return state


def routing_agent(state: Dict) -> Dict:
    department = DEPARTMENT_MAP.get(state["category"], DEPARTMENT_MAP["general"])
    state["department"] = department
    state["trace"].append({
        "agent": "Routing Agent",
        "decision": f"routed_to={department}",
        "reason": f"category '{state['category']}' maps to this department",
    })
    return state


def priority_agent(state: Dict) -> Dict:
    urgency_signal = state["nlp_result"]["urgency_signal"]
    category = state["category"]
    cv_confidences = [d["confidence"] for d in state.get("cv_result", {}).get("detections", [])]
    max_cv_conf = max(cv_confidences) if cv_confidences else 0

    score = {"low": 0, "medium": 1, "high": 2, "critical": 3}[urgency_signal]
    if category in CRITICAL_CATEGORIES:
        score += 1
    if max_cv_conf > 0.8:
        score += 1

    score = min(score, 3)
    priority = ["low", "medium", "high", "critical"][score]

    state["priority"] = priority
    state["trace"].append({
        "agent": "Priority Assessment Agent",
        "decision": f"priority={priority}",
        "reason": f"text_urgency={urgency_signal}, category_risk={category in CRITICAL_CATEGORIES}, cv_confidence={max_cv_conf}",
    })
    return state


def response_agent(state: Dict) -> Dict:
    dept = state["department"]
    priority = state["priority"]
    category = state["category"].replace("_", " ")

    eta_map = {"critical": "4 hours", "high": "24 hours", "medium": "3-5 days", "low": "7-10 days"}
    eta = eta_map[priority]

    response = (
        f"Thank you for reporting this {category} issue. Your complaint has been "
        f"classified as '{priority.upper()}' priority and routed to the {dept}. "
        f"Expected initial response time: {eta}. You will receive status updates "
        f"via SMS/email/dashboard."
    )
    state["ai_response"] = response
    state["trace"].append({
        "agent": "Citizen Response Agent",
        "decision": "drafted_acknowledgement",
        "reason": f"eta={eta} based on priority={priority}",
    })
    return state


def run_workflow(nlp_result: Dict, cv_result: Optional[Dict] = None) -> Dict:
    """Executes the 4-agent pipeline sequentially and returns the final state."""
    state = {
        "nlp_result": nlp_result,
        "cv_result": cv_result or {},
        "trace": [],
    }
    state = classification_agent(state)
    state = routing_agent(state)
    state = priority_agent(state)
    state = response_agent(state)
    return state
