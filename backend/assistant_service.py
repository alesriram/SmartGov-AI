import json
import os
import re
from typing import Any, Dict, List, Optional, Tuple
from urllib import request, error

from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ENV_PATH = os.path.join(BASE_DIR, ".env")
load_dotenv(ENV_PATH)

DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b"
DEFAULT_GEMINI_MODEL = "gemini-3.6-flash"
DEFAULT_OPENAI_MODEL = "gpt-4o-mini"
HTTP_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) SmartGovAI/1.0"


def reload_env():
    """Reload environment variables from backend/.env file."""
    load_dotenv(ENV_PATH, override=True)


def get_llm_status() -> Dict[str, Any]:
    """Returns the current LLM configuration and which provider is active."""
    reload_env()
    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    gemini_key = (os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or "").strip()
    openai_key = os.getenv("OPENAI_API_KEY", "").strip()
    configured_provider = os.getenv("LLM_PROVIDER", "auto").strip().lower()

    # Determine active provider
    if configured_provider in ["groq", "gemini", "openai"]:
        active = configured_provider
    elif groq_key:
        active = "groq"
    elif gemini_key:
        active = "gemini"
    elif openai_key:
        active = "openai"
    else:
        active = "fallback"

    groq_model = os.getenv("GROQ_MODEL", DEFAULT_GROQ_MODEL).strip()
    gemini_model = os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL).strip()
    openai_model = os.getenv("OPENAI_MODEL", DEFAULT_OPENAI_MODEL).strip()

    active_model = {
        "groq": groq_model,
        "gemini": gemini_model,
        "openai": openai_model,
        "fallback": "local-rule-engine",
    }.get(active, "local-rule-engine")

    return {
        "active_provider": active,
        "active_model": active_model,
        "has_groq": bool(groq_key),
        "has_gemini": bool(gemini_key),
        "has_openai": bool(openai_key),
        "groq_key_masked": f"{groq_key[:6]}...{groq_key[-4:]}" if len(groq_key) > 10 else ("Configured" if groq_key else ""),
        "gemini_key_masked": f"{gemini_key[:6]}...{gemini_key[-4:]}" if len(gemini_key) > 10 else ("Configured" if gemini_key else ""),
        "openai_key_masked": f"{openai_key[:6]}...{openai_key[-4:]}" if len(openai_key) > 10 else ("Configured" if openai_key else ""),
        "groq_model": groq_model,
        "gemini_model": gemini_model,
        "openai_model": openai_model,
        "configured_provider": configured_provider,
    }


def save_llm_config(provider: str, api_key: Optional[str] = None, model: Optional[str] = None) -> Dict[str, Any]:
    """Updates the .env file with the specified LLM provider and API key / model."""
    provider = provider.lower().strip()
    key_var_map = {
        "groq": ("GROQ_API_KEY", "GROQ_MODEL", model or DEFAULT_GROQ_MODEL),
        "gemini": ("GEMINI_API_KEY", "GEMINI_MODEL", model or DEFAULT_GEMINI_MODEL),
        "openai": ("OPENAI_API_KEY", "OPENAI_MODEL", model or DEFAULT_OPENAI_MODEL),
    }

    if provider not in key_var_map:
        return {"success": False, "error": f"Unsupported provider: {provider}"}

    key_var, model_var, default_mod = key_var_map[provider]
    actual_model = (model or os.getenv(model_var) or default_mod).strip()

    # If api_key was not provided, keep current key
    if not api_key:
        api_key = os.getenv(key_var, "").strip()
    else:
        api_key = api_key.strip()

    # Read existing .env
    lines = []
    if os.path.exists(ENV_PATH):
        with open(ENV_PATH, "r", encoding="utf-8") as f:
            lines = f.readlines()

    def set_or_append(var_name: str, val: str, file_lines: List[str]) -> List[str]:
        found = False
        new_lines = []
        pattern = re.compile(rf"^\s*{var_name}\s*=")
        for line in file_lines:
            if pattern.match(line):
                new_lines.append(f"{var_name}={val}\n")
                found = True
            else:
                new_lines.append(line)
        if not found:
            new_lines.append(f"{var_name}={val}\n")
        return new_lines

    if api_key:
        lines = set_or_append(key_var, api_key, lines)
    if actual_model:
        lines = set_or_append(model_var, actual_model, lines)
    lines = set_or_append("LLM_PROVIDER", provider, lines)

    with open(ENV_PATH, "w", encoding="utf-8") as f:
        f.writelines(lines)

    # Update runtime environment
    if api_key:
        os.environ[key_var] = api_key
    if actual_model:
        os.environ[model_var] = actual_model
    os.environ["LLM_PROVIDER"] = provider
    reload_env()

    return {
        "success": True,
        "message": f"Successfully activated {provider.upper()} (Model: {actual_model})",
        "provider": provider,
        "model": actual_model,
    }


def call_groq_api(prompt: str, system_prompt: str, api_key: str, model: str = DEFAULT_GROQ_MODEL) -> str:
    """Calls Groq Cloud OpenAI-compatible API."""
    url = "https://api.groq.com/openai/v1/chat/completions"
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.3,
        "max_tokens": 450,
    }

    req = request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": HTTP_USER_AGENT,
        },
        method="POST",
    )

    with request.urlopen(req, timeout=25) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        content = data["choices"][0]["message"]["content"]
        # Strip <think>...</think> tags if emitted by reasoning models
        cleaned = re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL).strip()
        return cleaned or content.strip()


def call_gemini_api(prompt: str, system_prompt: str, api_key: str, model: str = DEFAULT_GEMINI_MODEL) -> str:
    """Calls Google Gemini Generative Language REST API with automatic model fallback."""
    clean_model = model.strip()
    if clean_model.startswith("models/"):
        clean_model = clean_model[len("models/"):]

    # Map deprecated models to active Google models on v1beta
    model_aliases = {
        "gemini-1.5-flash": "gemini-3.6-flash",
        "gemini-1.5-pro": "gemini-2.5-pro",
        "gemini-2.0-flash": "gemini-3.6-flash",
    }
    if clean_model in model_aliases:
        clean_model = model_aliases[clean_model]

    def _execute_gemini_call(target_model: str) -> str:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{target_model}:generateContent?key={api_key}"
        payload = {
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": prompt}],
                }
            ],
            "systemInstruction": {
                "parts": [{"text": system_prompt}]
            },
            "generationConfig": {
                "temperature": 0.3,
                "maxOutputTokens": 450,
            },
        }

        req = request.Request(
            url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "User-Agent": HTTP_USER_AGENT,
            },
            method="POST",
        )

        with request.urlopen(req, timeout=25) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            candidates = data.get("candidates", [])
            if not candidates:
                raise ValueError("Gemini returned empty candidates")
            parts = candidates[0].get("content", {}).get("parts", [])
            if not parts or "text" not in parts[0]:
                raise ValueError("No text part in Gemini response")
            text = parts[0]["text"].strip()
            cleaned = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()
            return cleaned or text

    try:
        return _execute_gemini_call(clean_model)
    except error.HTTPError as e:
        # If Google reports 404 for an older model, fall back automatically to gemini-3.6-flash
        if e.code == 404 and clean_model != "gemini-3.6-flash":
            return _execute_gemini_call("gemini-3.6-flash")
        raise


def call_openai_api(prompt: str, system_prompt: str, api_key: str, model: str = DEFAULT_OPENAI_MODEL) -> str:
    """Calls OpenAI Chat Completions API."""
    url = "https://api.openai.com/v1/chat/completions"
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt},
        ],
        "temperature": 0.3,
        "max_tokens": 450,
    }

    req = request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "User-Agent": HTTP_USER_AGENT,
        },
        method="POST",
    )

    with request.urlopen(req, timeout=25) as resp:
        data = json.loads(resp.read().decode("utf-8"))
        return data["choices"][0]["message"]["content"].strip()


def test_llm_connection(provider: str, api_key: str, model: Optional[str] = None) -> Dict[str, Any]:
    """Sends a quick lightweight test prompt to verify the API key and model."""
    provider = provider.lower().strip()
    test_sys = "You are an AI assistant. Answer in one short sentence."
    test_user = "Test connection. Reply with 'Connected to SmartGov AI Copilot successfully.'"

    try:
        if provider == "groq":
            mod = model or DEFAULT_GROQ_MODEL
            ans = call_groq_api(test_user, test_sys, api_key, mod)
            return {"success": True, "provider": "groq", "model": mod, "message": ans}
        elif provider == "gemini":
            mod = model or DEFAULT_GEMINI_MODEL
            ans = call_gemini_api(test_user, test_sys, api_key, mod)
            return {"success": True, "provider": "gemini", "model": mod, "message": ans}
        elif provider == "openai":
            mod = model or DEFAULT_OPENAI_MODEL
            ans = call_openai_api(test_user, test_sys, api_key, mod)
            return {"success": True, "provider": "openai", "model": mod, "message": ans}
        else:
            return {"success": False, "error": f"Unknown provider: {provider}"}
    except error.HTTPError as e:
        err_body = ""
        try:
            err_body = e.read().decode("utf-8")
            parsed = json.loads(err_body)
            err_msg = parsed.get("error", {}).get("message") or parsed.get("message") or err_body
        except Exception:
            err_msg = err_body or str(e)
        return {"success": False, "error": f"HTTP {e.code}: {err_msg}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def _build_rich_context(
    stats: Optional[Dict[str, Any]],
    complaints: Optional[List[Dict[str, Any]]],
    departments: Optional[List[Dict[str, Any]]] = None,
    hotspots: Optional[List[Dict[str, Any]]] = None,
    query_matched: Optional[List[Dict[str, Any]]] = None,
) -> str:
    """Builds an exhaustive, highly structured operational context for accurate LLM answers."""
    sections = []

    # 1. Executive Operations KPIs
    if stats:
        tot = stats.get("total_complaints", 0)
        rec = stats.get("received", 0)
        inp = stats.get("in_progress", 0)
        res = stats.get("resolved", 0)
        crit = stats.get("critical_open", 0)
        avg_h = stats.get("avg_resolution_hours") or "N/A"
        sections.append(
            "=== LIVE OPERATIONS SUMMARY ===\n"
            f"• Total Complaints Logged: {tot}\n"
            f"• Awaiting Triage/Dispatch: {rec}\n"
            f"• In Progress / Routed: {inp}\n"
            f"• Resolved Successfully: {res}\n"
            f"• Critical & Open (High Risk): {crit}\n"
            f"• Average Resolution Time: {avg_h} hours"
        )

        cat_breakdown = stats.get("category_breakdown") or {}
        if cat_breakdown:
            cat_str = ", ".join(f"{k}: {v}" for k, v in sorted(cat_breakdown.items(), key=lambda x: -x[1]))
            sections.append(f"• Category Breakdown: {cat_str}")

        pri_breakdown = stats.get("priority_breakdown") or {}
        if pri_breakdown:
            pri_str = ", ".join(f"{k}: {v}" for k, v in pri_breakdown.items())
            sections.append(f"• Priority Breakdown: {pri_str}")

    # 2. Departments Workload & Deployment Capacity
    if departments:
        dept_lines = ["=== MUNICIPAL DEPARTMENTS & CAPACITY ==="]
        for d in departments:
            name = d.get("name", "Unknown")
            officers = d.get("active_officers", 0)
            open_cases = d.get("open_complaints", 0)
            dept_lines.append(f"• {name}: {open_cases} open cases, {officers} active officers deployed")
        sections.append("\n".join(dept_lines))

    # 3. High Risk / Critical Open Incidents (Top Priority)
    if complaints:
        critical_list = [
            c for c in complaints
            if str(c.get("priority", "")).lower() in ["critical", "high"] and str(c.get("status", "")).lower() != "resolved"
        ][:8]
        if critical_list:
            crit_lines = ["=== OPEN CRITICAL & HIGH-PRIORITY INCIDENTS ==="]
            for c in critical_list:
                cid = c.get("id")
                cat = c.get("category") or "general"
                pri = c.get("priority")
                status = c.get("status")
                addr = c.get("address") or "Unspecified location"
                desc = (c.get("description") or "").replace("\n", " ")[:140]
                dept = c.get("department") or "Pending Routing"
                crit_lines.append(
                    f"• [ID #{cid}] {cat.upper()} ({pri.upper()}, status: {status}) at {addr} | Dept: {dept}\n"
                    f"  Details: {desc}"
                )
            sections.append("\n".join(crit_lines))

    # 4. Relevant Query Matches (if user searched or asked about specific topic/ID)
    if query_matched:
        match_lines = ["=== COMPLAINTS MATCHING THE OPERATOR'S QUERY ==="]
        for c in query_matched[:6]:
            cid = c.get("id")
            cat = c.get("category")
            status = c.get("status")
            pri = c.get("priority")
            addr = c.get("address") or "N/A"
            desc = (c.get("description") or "").replace("\n", " ")[:180]
            dept = c.get("department") or "N/A"
            match_lines.append(
                f"• Complaint #{cid} [{cat}, {pri}, {status}] at {addr} ({dept}): \"{desc}\""
            )
        sections.append("\n".join(match_lines))

    # 5. Hotspot Predictive GIS Clusters
    if hotspots:
        hot_lines = ["=== PREDICTIVE HOTSPOT GIS CLUSTERS ==="]
        for h in hotspots[:5]:
            lat = h.get("latitude")
            lon = h.get("longitude")
            cat = h.get("category", "mixed")
            weight = h.get("weight") or h.get("complaint_count") or "High density"
            hot_lines.append(f"• Location ({lat:.4f}, {lon:.4f}) — Category: {cat}, Density: {weight}")
        sections.append("\n".join(hot_lines))

    return "\n\n".join(sections) if sections else "No operational data available."


def _fallback_response(
    question: str,
    stats: Optional[Dict[str, Any]],
    complaints: Optional[List[Dict[str, Any]]],
    departments: Optional[List[Dict[str, Any]]] = None,
) -> str:
    """Smart structured response when external LLM is offline or no API key is supplied."""
    q = question.lower()
    total = (stats or {}).get("total_complaints", 0)
    critical = (stats or {}).get("critical_open", 0)
    in_progress = (stats or {}).get("in_progress", 0)
    resolved = (stats or {}).get("resolved", 0)
    avg_res = (stats or {}).get("avg_resolution_hours") or "48"

    # Category breakdown
    cat_data = (stats or {}).get("category_breakdown", {})
    top_cat = max(cat_data.items(), key=lambda x: x[1])[0] if cat_data else "roads"

    lines = []

    if any(k in q for k in ["priority", "urgent", "critical", "escalate", "what should i"]):
        lines.append(f"### 🚨 Operational Priority Briefing\n")
        lines.append(
            f"Based on real-time city telemetry, there are **{critical} open critical-priority complaints** "
            f"out of **{in_progress} active cases** currently in progress."
        )
        lines.append("\n**Immediate Action Directives:**")
        lines.append("1. **Public Health & Electrical Emergencies**: Dispatch rapid-response crews immediately to clear active hazardous wires and contamination cases.")
        lines.append(f"2. **Primary Hotspot Queue**: Focus road and sanitation teams on `{top_cat.replace('_', ' ').title()}` ({cat_data.get(top_cat, 0)} total reports logged).")
        lines.append("3. **Escalations**: Coordinate with the zonal department leads to meet the target resolution SLA under 24 hours.")

    elif any(k in q for k in ["route", "routing", "team", "department", "assign"]):
        lines.append(f"### 📋 Department Routing & Allocation\n")
        lines.append("The multi-agent routing engine recommends the following operational distribution:")
        if departments:
            for d in departments[:5]:
                name = d.get("name")
                open_cnt = d.get("open_complaints", 0)
                officers = d.get("active_officers", 5)
                lines.append(f"• **{name}**: {open_cnt} pending complaints | {officers} field units active.")
        else:
            lines.append(f"• **Roads & Infrastructure**: Assigned high-volume pothole and transit corridor repairs.")
            lines.append(f"• **Electricity & Street Lighting**: High priority for nighttime safety and intersection signals.")
            lines.append(f"• **Sanitation & Waste**: Dedicated zonal cluster routing.")

    elif any(k in q for k in ["summary", "status", "overview", "snapshot", "report"]):
        lines.append(f"### 📊 Smart City Operational Snapshot\n")
        lines.append(f"• **Total Recorded Inflow**: {total} citizen grievances")
        lines.append(f"• **Currently Under Action**: {in_progress} active cases")
        lines.append(f"• **Critical Open Escalations**: {critical} high-risk tickets")
        lines.append(f"• **Successfully Resolved**: {resolved} tickets ({round((resolved / total * 100) if total else 0)}% resolution rate)")
        lines.append(f"• **Average Turnaround Time**: ~{avg_res} hours")

    elif any(k in q for k in ["hotspot", "map", "gis", "cluster", "location"]):
        lines.append(f"### 📍 GIS Hotspot Intelligence\n")
        lines.append(
            f"The predictive clustering model indicates high report concentrations in dense commercial and residential sectors. "
            f"The highest density of recurring alerts is in **{top_cat.replace('_', ' ').title()}**."
        )
        lines.append("Dispatching proactive patrols to these coordinates mitigates duplicate grievances by up to 35%.")

    else:
        lines.append(f"### 🏛️ SmartGov Operations Copilot\n")
        lines.append(
            f"The system is monitoring **{total} complaints** ({critical} critical open, {in_progress} in progress). "
            f"The dominant civic demand is in **{top_cat.replace('_', ' ').title()}**."
        )
        lines.append(f"\nYou can ask me to:\n- *Summarize critical incidents*\n- *Recommend routing priorities*\n- *Analyze department bottlenecks*\n- *Inspect GIS hotspots*")

    lines.append("\n\n---")
    lines.append(
        "> 💡 **Tip**: Add a free **Groq** (`GROQ_API_KEY`) or **Gemini** (`GEMINI_API_KEY`) in **LLM Settings** (top-right of this page) "
        "to unlock instant multi-model generative intelligence for any question!"
    )

    return "\n".join(lines)


def generate_ai_assistant_response(
    question: str,
    stats: Optional[Dict[str, Any]] = None,
    complaints: Optional[List[Dict[str, Any]]] = None,
    departments: Optional[List[Dict[str, Any]]] = None,
    hotspots: Optional[List[Dict[str, Any]]] = None,
    query_matched: Optional[List[Dict[str, Any]]] = None,
    preferred_provider: Optional[str] = None,
    preferred_model: Optional[str] = None,
) -> Tuple[str, str, str]:
    """
    Orchestrates LLM inference across Groq, Gemini, and OpenAI with automatic fallback.
    Returns: (response_text, provider_name, model_name)
    """
    reload_env()

    # Build rich operational context
    context = _build_rich_context(stats, complaints, departments, hotspots, query_matched)

    system_prompt = (
        "You are SmartGov Copilot, the AI Operations Director for a modern smart city platform.\n"
        "Your responses must be SHORT, HIGHLY ACCURATE, and naturally include RELEVANT CIVIC EMOJIS.\n\n"
        "MANDATORY GUIDELINES:\n"
        "1. BE SHORT & CONCISE: Maximum 2 to 4 bullet points or 1-2 focused sentences. Avoid long-winded introductions, redundant disclaimers, or filler text.\n"
        "2. USE RELEVANT EMOJIS: Use emojis naturally whenever appropriate (🚨 for critical emergencies, 🚧 for roads/potholes, 💧 for water/leakage, ⚡ for electricity, 🗑️ for waste/sanitation, 📍 for locations/wards, 📊 for stats/telemetry, ⏱️ for SLAs, ✅ for resolved/confirmed).\n"
        "3. HIGH ACCURACY: Ground every statement in the Live Telemetry below. Quote exact figures and complaint IDs (e.g. [#12]). Never hallucinate fake complaints or numbers.\n"
        "4. DIRECT ANSWER: Address the operator's query immediately in the very first sentence."
    )

    user_prompt = (
        f"Operator Query: {question}\n\n"
        f"--- LIVE CITY OPERATIONS TELEMETRY ---\n"
        f"{context}\n"
        f"--------------------------------------\n\n"
        f"Please provide a short, accurate, and emoji-rich response based on the operational data above."
    )

    groq_key = os.getenv("GROQ_API_KEY", "").strip()
    gemini_key = (os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY") or "").strip()
    openai_key = os.getenv("OPENAI_API_KEY", "").strip()

    groq_mod = (preferred_model if preferred_provider == "groq" else None) or os.getenv("GROQ_MODEL", DEFAULT_GROQ_MODEL)
    gemini_mod = (preferred_model if preferred_provider == "gemini" else None) or os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODEL)
    openai_mod = (preferred_model if preferred_provider == "openai" else None) or os.getenv("OPENAI_MODEL", DEFAULT_OPENAI_MODEL)

    # Order of providers to try
    providers_to_try = []

    pref = (preferred_provider or os.getenv("LLM_PROVIDER", "auto")).strip().lower()

    if pref == "groq" and groq_key:
        providers_to_try.append(("groq", groq_key, groq_mod))
    elif pref == "gemini" and gemini_key:
        providers_to_try.append(("gemini", gemini_key, gemini_mod))
    elif pref == "openai" and openai_key:
        providers_to_try.append(("openai", openai_key, openai_mod))

    # Add remaining available providers
    if groq_key and ("groq", groq_key, groq_mod) not in providers_to_try:
        providers_to_try.append(("groq", groq_key, groq_mod))
    if gemini_key and ("gemini", gemini_key, gemini_mod) not in providers_to_try:
        providers_to_try.append(("gemini", gemini_key, gemini_mod))
    if openai_key and ("openai", openai_key, openai_mod) not in providers_to_try:
        providers_to_try.append(("openai", openai_key, openai_mod))

    # Try each provider in sequence
    for p_name, p_key, p_model in providers_to_try:
        try:
            if p_name == "groq":
                ans = call_groq_api(user_prompt, system_prompt, p_key, p_model)
                if ans:
                    return ans, "groq", p_model
            elif p_name == "gemini":
                ans = call_gemini_api(user_prompt, system_prompt, p_key, p_model)
                if ans:
                    return ans, "gemini", p_model
            elif p_name == "openai":
                ans = call_openai_api(user_prompt, system_prompt, p_key, p_model)
                if ans:
                    return ans, "openai", p_model
        except Exception:
            # Continue to next provider if one fails (e.g. rate limit, exhausted quota)
            continue

    # Fallback to rich rule-based response generator
    fallback_text = _fallback_response(question, stats, complaints, departments)
    return fallback_text, "fallback", "smartgov-local-engine"
