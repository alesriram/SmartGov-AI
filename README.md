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

To send acknowledgement emails, configure Brevo API (recommended for Render cloud) or Gmail SMTP:

```powershell
# Option A: Brevo HTTPS REST API (Recommended for Render Cloud - Bypasses SMTP port restrictions)
$env:BREVO_API_KEY="xkeysib-..."

# Option B: Standard Gmail SMTP (Works for local testing)
$env:SMTP_HOST="smtp.gmail.com"
$env:SMTP_PORT="465"
$env:SMTP_USERNAME="your_email@gmail.com"
$env:SMTP_PASSWORD="your_16_character_app_password"
$env:SMTP_FROM="your_email@gmail.com"
$env:SMTP_USE_SSL="true"
```

The user's `Contact` value is treated as an email address when it contains a
valid email format. The system automatically dispatches an official HTML receipt
with ticket ID and assigned Department Head details.

### AI Copilot LLM Integration (Groq, Gemini & OpenAI)

SmartGov Copilot supports **Groq** (Llama 3.3 70B / GPT-OSS), **Google Gemini** (1.5 / 2.0 Flash), and **OpenAI**:

Configure your key directly in `backend/.env` or click **"LLM API Settings"** in the Copilot UI:

```powershell
# Option A: Groq (Recommended - Free & Fast: https://console.groq.com)
$env:GROQ_API_KEY="gsk_..."
$env:GROQ_MODEL="llama-3.3-70b-versatile"

# Option B: Google Gemini (Free: https://aistudio.google.com)
$env:GEMINI_API_KEY="AIzaSy..."
$env:GEMINI_MODEL="gemini-1.5-flash"

# Option C: OpenAI (Optional)
$env:OPENAI_API_KEY="sk-..."
$env:OPENAI_MODEL="gpt-4o-mini"
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
| Citizen Auth & Session Persistence | **Real**, citizen signup/signin, profile drawer, persistent session across refreshes, and 1-click fast login. |
| Cloud Notification Dispatch | **Real**, Brevo HTTPS API on Port 443 (bypasses cloud SMTP blocks) + Gmail SMTP with dual-port fallback. |
| Multilingual Speech-to-Text & TTS | **Real**, Web Speech API supporting Telugu, Tinglish, Hindi, Tamil, Kannada, and English. |

## Tech Stack

**Single-Line (Resume / Portfolio):**
> **Tech Stack:** Python, FastAPI, React.js, Vite, OpenCV, YOLOv8, Groq (Llama 3) / Google Gemini / GPT-4o-mini, Multi-Agent Workflow, Scikit-learn, Pandas, NumPy, SQLAlchemy, SQLite, Leaflet GIS API, Web Speech API, Brevo API, Render.

**Categorized Breakdown:**
* **Frontend:** React 19, Vite 8, Leaflet GIS (`react-leaflet`), Recharts, Custom Vanilla CSS
* **Backend:** Python 3.11, FastAPI, Uvicorn, Pydantic v2, SQLAlchemy 2.0, SQLite
* **AI & Computer Vision:** Ultralytics YOLOv8 (`yolov8n.pt`), OpenCV (`opencv-python-headless`)
* **LLMs & Multi-Agent:** Groq Cloud (Llama 3.3 70B), Google Gemini Flash, OpenAI GPT-4o-mini, 4-Agent Pipeline
* **Data Science & ML:** Scikit-learn, Pandas, NumPy
* **Cloud & DevOps:** Render (IaC Blueprint), Brevo HTTPS REST API, Gmail SMTP, Git / GitHub

## Cloud Deployment & 24/7 Keepalive (Render & UptimeRobot)

* **Deployment Blueprint:** Configured via `render.yaml` with zero-downtime healthcheck path (`/health`).
* **UptimeRobot Keepalive:** To prevent Render's free tier from sleeping after 15 minutes, set up a free HTTP monitor pointing to:
  `https://smartcity-backend.onrender.com/health` (5-minute interval).
* **Diagnostic Test:** Visit `https://smartcity-backend.onrender.com/docs` to test endpoints and email delivery.
