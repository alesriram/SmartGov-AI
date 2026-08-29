import { useState, useEffect } from "react";
import { api } from "../api";

const CATEGORY_HINTS = [
  "Pothole / road damage",
  "Garbage overflow / waste dump",
  "Water leakage / pipe burst",
  "Damaged streetlight / outage",
  "Illegal parking / traffic jam",
  "Public health hazard / sewage",
];

const SUPPORTED_LANGUAGES = [
  { code: "auto", label: "🌐 Auto-Detect", speechLang: "en-IN" },
  { code: "te", label: "Telugu (తెలుగు)", speechLang: "te-IN" },
  { code: "tinglish", label: "Tinglish", speechLang: "en-IN" },
  { code: "hi", label: "Hindi (हिंदी)", speechLang: "hi-IN" },
  { code: "hinglish", label: "Hinglish", speechLang: "hi-IN" },
  { code: "ta", label: "Tamil (தமிழ்)", speechLang: "ta-IN" },
  { code: "kn", label: "Kannada (ಕನ್ನಡ)", speechLang: "kn-IN" },
  { code: "en", label: "English", speechLang: "en-IN" },
];

const DEPARTMENT_HEADS_FALLBACK = {
  roads: {
    name: "Dr. Rajeshwar Rao",
    title: "Chief Superintending Engineer (Roads & Bridges)",
    email: "rajeshwar.rao@smartcity.gov",
    phone: "+91 (040) 2345-8711",
    office: "Engineering Wing, 2nd Floor, Civic Infrastructure Complex, Hyderabad",
  },
  sanitation: {
    name: "Smt. Sunitha Reddy, IAS",
    title: "Additional Commissioner (Solid Waste & Sanitation Management)",
    email: "sunitha.reddy@smartcity.gov",
    phone: "+91 (040) 2345-8722",
    office: "Environment & Swachh Directorate, 4th Floor, Municipal HQ, Hyderabad",
  },
  water_supply: {
    name: "Er. K. V. Ramanathan",
    title: "Director of Water Operations & Sewerage Management",
    email: "kv.ramanathan@smartcity.gov",
    phone: "+91 (040) 2345-8733",
    office: "Water Works Bhavan, Zonal Khairatabad Division, Hyderabad",
  },
  electricity: {
    name: "Sri. Mohammed Arshad",
    title: "Chief Electrical Inspector & Urban Lighting Lead",
    email: "m.arshad@smartcity.gov",
    phone: "+91 (040) 2345-8744",
    office: "Electrical Distribution Cell, Power Sub-Station Circle, Hyderabad",
  },
  traffic: {
    name: "Vikram Simha, IPS",
    title: "Deputy Commissioner of Police (Traffic & Intelligent Mobility)",
    email: "vikram.traffic@smartcity.gov",
    phone: "+91 (040) 2345-8755",
    office: "Traffic Command & Control Centre, Nampally, Hyderabad",
  },
  public_health: {
    name: "Dr. Priya Nambiar",
    title: "Chief Municipal Health Officer (Urban Health & Epidemic Prevention)",
    email: "priya.health@smartcity.gov",
    phone: "+91 (040) 2345-8766",
    office: "Public Health Directorate, Medical Complex, Himayatnagar, Hyderabad",
  },
  general: {
    name: "Sri. Anand Vardhan",
    title: "Joint Secretary (Public Grievance Redressal & Citizen Care)",
    email: "anand.grievance@smartcity.gov",
    phone: "+91 (040) 2345-8777",
    office: "Citizen Facilitation Centre, Ground Floor, Central Secretariat, Hyderabad",
  },
};

export default function ReportForm({ onSubmitted, user }) {
  const [form, setForm] = useState({
    citizen_name: user?.fullName || "",
    citizen_contact: user?.email || "",
    description: "",
    address: "",
    latitude: "",
    longitude: "",
  });
  const [selectedLang, setSelectedLang] = useState("auto");
  const [isListening, setIsListening] = useState(false);
  const [speechStatus, setSpeechStatus] = useState("");
  const [recognitionInstance, setRecognitionInstance] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [error, setError] = useState(null);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionInstance) {
        try { recognitionInstance.stop(); } catch {}
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [recognitionInstance]);

  // Voice speech-to-text recognition
  const toggleSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    if (isListening && recognitionInstance) {
      try { recognitionInstance.stop(); } catch {}
      setIsListening(false);
      setSpeechStatus("");
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;

      const langObj = SUPPORTED_LANGUAGES.find((l) => l.code === selectedLang) || SUPPORTED_LANGUAGES[0];
      recognition.lang = langObj.speechLang || "en-IN";

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechStatus(`Listening in ${langObj.label}... Speak clearly.`);
      };

      recognition.onresult = (event) => {
        let currentInterim = "";
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            const finalWord = event.results[i][0].transcript;
            setForm((f) => ({
              ...f,
              description: f.description ? `${f.description} ${finalWord.trim()}` : finalWord.trim(),
            }));
          } else {
            currentInterim += event.results[i][0].transcript;
          }
        }
        if (currentInterim) {
          setSpeechStatus(`Transcribing: "${currentInterim}"`);
        }
      };

      recognition.onerror = (event) => {
        console.warn("Speech recognition notice:", event.error);
        if (event.error !== "no-speech") {
          setSpeechStatus(`Speech notice: ${event.error}. You can speak again or type.`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        setSpeechStatus("");
      };

      recognition.start();
      setRecognitionInstance(recognition);
    } catch (err) {
      console.error("Speech recognition start failed:", err);
      setIsListening(false);
      setSpeechStatus("Could not access microphone.");
    }
  };

  // Text-to-speech feedback
  const toggleTextToSpeech = () => {
    if (!window.speechSynthesis) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    const text = form.description || "Please type or speak your civic grievance.";
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleImage = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const useLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((f) => ({
          ...f,
          latitude: pos.coords.latitude.toFixed(5),
          longitude: pos.coords.longitude.toFixed(5),
        }));
      },
      () => {
        setForm((f) => ({ ...f, latitude: "17.4399", longitude: "78.4983" }));
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isListening && recognitionInstance) {
      try { recognitionInstance.stop(); } catch {}
      setIsListening(false);
    }

    if (!form.description.trim()) {
      setError("⚠️ Please type or speak your civic grievance in the description box before submitting!");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (selectedLang && selectedLang !== "auto") {
        fd.append("original_language", selectedLang);
      }
      if (image) fd.append("image", image);
      const data = await api.submitComplaint(fd);
      setModalData(data);
    } catch (err) {
      setError(err?.response?.data?.detail || "Submission failed. Is the backend running?");
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setForm({
      citizen_name: user?.fullName || "",
      citizen_contact: user?.email || "",
      description: "",
      address: "",
      latitude: "",
      longitude: "",
    });
    setImage(null);
    setImagePreview(null);
    setModalData(null);
    setError(null);
    setIsListening(false);
    setSpeechStatus("");
  };

  // Get department head from returned data or fallback map
  const headDetails = modalData?.department_head ||
    DEPARTMENT_HEADS_FALLBACK[modalData?.category] ||
    DEPARTMENT_HEADS_FALLBACK.general;

  return (
    <div className="report-fullwidth-container">
      <form className="panel report-form-full" onSubmit={handleSubmit}>
        <div className="panel-head report-head">
          <div>
            <h3>Report a Civic Issue</h3>
            <span className="panel-sub mono">
              Multi-lingual voice &amp; text recognition with automatic English translation
            </span>
          </div>
          <span className="civic-badge-pill">⚡ Instant AI Triage</span>
        </div>

        {/* Description Field with Top-Right Mic & Minimal English Placeholder */}
        <div className="field">
          <div className="desc-header-row">
            <span className="field-title-bold">
              Describe the Civic Grievance <span className="text-danger">*</span>
            </span>

            <div className="desc-tools-group">
              {/* Language Selector Dropdown */}
              <div className="lang-picker-wrap" title="Select language or leave as Auto-Detect">
                <select
                  value={selectedLang}
                  onChange={(e) => setSelectedLang(e.target.value)}
                  className="lang-select-input"
                >
                  {SUPPORTED_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>{l.label}</option>
                  ))}
                </select>
              </div>

              {/* Text-To-Speech Listen Button */}
              {form.description && (
                <button
                  type="button"
                  className={`tts-listen-btn ${isSpeaking ? "active" : ""}`}
                  onClick={toggleTextToSpeech}
                  title={isSpeaking ? "Stop audio" : "Listen to grievance text"}
                >
                  {isSpeaking ? "🔊 Reading..." : "🔉 Listen"}
                </button>
              )}

              {/* Microphone Voice Input Button (TOP RIGHT CORNER) */}
              <button
                type="button"
                className={`mic-record-btn ${isListening ? "listening" : ""}`}
                onClick={toggleSpeechRecognition}
                title={isListening ? "Stop voice recording" : "Click to speak grievance (Telugu, Tinglish, Hindi, Tamil, Kannada, English)"}
                aria-label="Microphone speech-to-text"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span>{isListening ? "Listening…" : "Voice"}</span>
              </button>
            </div>
          </div>

          {/* Active Voice Listening Animation Bar */}
          {isListening && (
            <div className="speech-pulse-bar">
              <span className="speech-pulse-dot" />
              <span className="speech-status-text">{speechStatus || "Listening to your voice... Speak now."}</span>
              <button type="button" className="speech-stop-link" onClick={toggleSpeechRecognition}>Done ⏹</button>
            </div>
          )}

          <textarea
            required
            rows={4}
            placeholder="Type or Speak..."
            value={form.description}
            onChange={update("description")}
          />

          <div className="hint-row">
            <span className="hint-label">Quick Suggestions:</span>
            {CATEGORY_HINTS.map((h) => (
              <button
                type="button"
                className="hint-chip-btn"
                key={h}
                onClick={() => setForm((f) => ({ ...f, description: f.description ? `${f.description} - ${h}` : h }))}
              >
                + {h}
              </button>
            ))}
          </div>
        </div>

        {/* Citizen Details Row */}
        <div className="field-row">
          <label className="field">
            <span>Your Name (optional)</span>
            <input
              value={form.citizen_name}
              onChange={update("citizen_name")}
              placeholder="e.g. Alex Morgan or Citizen Name"
            />
          </label>
          <label className="field">
            <span>Email for Instant Notification &amp; Tracking</span>
            <input
              type="email"
              value={form.citizen_contact}
              onChange={update("citizen_contact")}
              placeholder="e.g. your_email@gmail.com"
            />
            <span style={{ fontSize: "11px", color: "var(--text-muted, #64748b)", marginTop: "4px" }}>
              ✉️ Enter your email to receive the official ticket receipt &amp; department contacts.
            </span>
          </label>
        </div>

        {/* Location & GPS Row */}
        <div className="field-row">
          <label className="field">
            <span>Address / Landmark</span>
            <input
              value={form.address}
              onChange={update("address")}
              placeholder="e.g. Miyapur Crossroads, Near Metro Station, Hyderabad"
            />
          </label>
          <label className="field">
            <span>GPS Geolocation Coordinates</span>
            <div className="coord-row">
              <input placeholder="Latitude" value={form.latitude} onChange={update("latitude")} />
              <input placeholder="Longitude" value={form.longitude} onChange={update("longitude")} />
              <button type="button" className="btn-ghost coord-btn" onClick={useLocation}>
                📍 Use My Location
              </button>
            </div>
          </label>
        </div>

        {/* Photo Evidence Upload */}
        <label className="field">
          <span>Photo Evidence (optional — runs real-time Computer Vision analysis)</span>
          <div className="upload-box">
            <input type="file" accept="image/*" onChange={handleImage} id="report-img-upload" />
            <span className="upload-hint">
              📁 Click to attach photo evidence (potholes, garbage, water leaks, traffic blockages)
            </span>
          </div>
        </label>
        {imagePreview && (
          <div className="preview-wrap">
            <img className="img-preview" src={imagePreview} alt="Civic issue evidence" />
            <button type="button" className="btn-clear-img" onClick={() => { setImage(null); setImagePreview(null); }}>
              Remove photo
            </button>
          </div>
        )}

        {/* Submit button & status */}
        <div className="report-submit-row">
          <button className="btn-primary report-btn-submit" type="submit" disabled={submitting}>
            {submitting ? (
              <span className="btn-loading-flex">
                <span className="status-pulse" /> Running CV + Multilingual Translation &amp; Triage…
              </span>
            ) : (
              "Submit Civic Grievance & Dispatch Team →"
            )}
          </button>
          {error && <p className="form-error">{error}</p>}
        </div>
      </form>

      {/* Acknowledgement Popup Modal */}
      {modalData && (
        <div className="profile-modal-backdrop" onClick={() => setModalData(null)}>
          <div className="acknowledgement-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ack-header">
              <div className="ack-header-icon">✓</div>
              <div>
                <div className="ack-super-label">Official Grievance Acknowledgement</div>
                <h3 className="ack-title">Grievance Registered Successfully</h3>
              </div>
              <button type="button" className="icon-close" onClick={() => setModalData(null)}>×</button>
            </div>

            <div className="ack-scroll-body">
              <div className="ack-ticket-hero">
                <div className="ticket-hero-left">
                  <span className="ticket-hero-label">Tracking Ticket Number</span>
                  <div className="ticket-hero-id mono">#{modalData.id}</div>
                </div>
                <div className="ticket-hero-badges">
                  <span className={`badge ${modalData.priority === "critical" ? "badge-danger" : modalData.priority === "high" ? "badge-amber" : "badge-blue"}`}>
                    {modalData.priority?.toUpperCase()} PRIORITY
                  </span>
                  <span className="status-pill routed">
                    {modalData.status?.replace(/_/g, " ").toUpperCase()}
                  </span>
                  {modalData.original_language && (
                    <span className="badge badge-lang">
                      🌐 {modalData.original_language}
                    </span>
                  )}
                </div>
              </div>

              {modalData.citizen_contact || form.citizen_contact ? (
                <div style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.3)", borderRadius: "8px", padding: "10px 14px", margin: "14px 0 16px", display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", color: "var(--text-primary, #0f172a)" }}>
                  <span style={{ fontSize: "18px" }}>📧</span>
                  <span>Official acknowledgement dispatched to <strong>{modalData.citizen_contact || form.citizen_contact}</strong> (check your inbox / spam folder).</span>
                </div>
              ) : (
                <div style={{ background: "rgba(14, 165, 233, 0.08)", border: "1px solid rgba(14, 165, 233, 0.25)", borderRadius: "8px", padding: "10px 14px", margin: "14px 0 16px", display: "flex", alignItems: "center", gap: "10px", fontSize: "13px", color: "var(--text-primary, #0f172a)" }}>
                  <span style={{ fontSize: "18px" }}>🔔</span>
                  <span>Alert dispatched directly to the Municipal Operations Command Centre.</span>
                </div>
              )}

              <div className="ack-triage-grid">
                <div className="ack-grid-item">
                  <span className="ack-item-label">Issue Category</span>
                  <strong className="ack-item-val">{modalData.category?.replace(/_/g, " ").toUpperCase()}</strong>
                </div>
                <div className="ack-grid-item">
                  <span className="ack-item-label">Assigned Department</span>
                  <strong className="ack-item-val">{modalData.department || "Municipal Operations"}</strong>
                </div>
                <div className="ack-grid-item">
                  <span className="ack-item-label">Incident Location</span>
                  <strong className="ack-item-val text-ellipsis">📍 {modalData.address || "Hyderabad Zone"}</strong>
                </div>
                <div className="ack-grid-item">
                  <span className="ack-item-label">Resolution SLA Target</span>
                  <strong className="ack-item-val text-teal">⏱️ Within 24–48 Hours</strong>
                </div>
              </div>

              <div className="ack-quote-box">
                <div className="ack-quote-head">
                  <span className="ack-quote-title">Original Citizen Submission:</span>
                  {modalData.original_language && (
                    <span className="ack-lang-chip">Input: {modalData.original_language}</span>
                  )}
                </div>
                <p>"{modalData.description}"</p>
              </div>

              {modalData.translated_description &&
                modalData.translated_description.trim().toLowerCase() !== modalData.description.trim().toLowerCase() && (
                <div className="ack-translation-box">
                  <div className="ack-trans-head">
                    <span className="ack-trans-title">🌐 Auto-Translated to English:</span>
                    <span className="ack-trans-verified">AI Verified</span>
                  </div>
                  <p>"{modalData.translated_description}"</p>
                </div>
              )}

              {modalData.ai_response && (
                <div className="ack-ai-box">
                  <span className="ack-ai-title">🤖 SmartGov Automated Citizen Acknowledgement:</span>
                  <p>{modalData.ai_response}</p>
                </div>
              )}

              {/* Department Head Card */}
              <div className="ack-dept-head-card">
                <div className="dept-head-top">
                  <div className="dept-head-avatar">
                    {(headDetails?.name || "H").charAt(0)}
                  </div>
                  <div>
                    <span className="dept-head-lead-label">Head of Assigned Department:</span>
                    <h4 className="dept-head-name">{headDetails?.name}</h4>
                    <div className="dept-head-title">{headDetails?.title}</div>
                  </div>
                </div>

                <div className="dept-head-contacts">
                  <div className="head-contact-item">
                    <span>Official Email:</span>
                    <a href={`mailto:${headDetails?.email}`} className="head-link">{headDetails?.email}</a>
                  </div>
                  <div className="head-contact-item">
                    <span>Direct Helpline:</span>
                    <strong className="head-phone">{headDetails?.phone}</strong>
                  </div>
                  <div className="head-contact-item">
                    <span>Zonal Office:</span>
                    <span>{headDetails?.office}</span>
                  </div>
                </div>

                <div className="dept-head-notice">
                  ℹ️ For direct field updates or rapid escalation, citizen services can contact this departmental cell quoting <strong>Ticket #{modalData.id}</strong>.
                </div>
              </div>
            </div>

            <div className="ack-modal-actions">
              <button
                type="button"
                className="btn-ghost"
                onClick={handleResetForm}
              >
                + File Another Civic Grievance
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setModalData(null);
                  onSubmitted?.(modalData);
                }}
              >
                Track in Complaint History →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
