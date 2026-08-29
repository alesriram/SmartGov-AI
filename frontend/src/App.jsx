import { useEffect, useState } from "react";
import { api } from "./api";
import "./app.css";

import TopBar from "./components/TopBar";
import StatStrip from "./components/StatStrip";
import AgentPipeline from "./components/AgentPipeline";
import TrendChart from "./components/TrendChart";
import CategoryChart from "./components/CategoryChart";
import HotspotMap from "./components/HotspotMap";
import OperationalInsights from "./components/OperationalInsights";
import ComplaintHistory from "./components/ComplaintHistory";
import DepartmentPanel from "./components/DepartmentPanel";
import ReportForm from "./components/ReportForm";
import AIAgentConsole from "./components/AIAgentConsole";

const emptyForm = {
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
};

const DEMO_USER = {
  fullName: "Demo Operator",
  email: "demo@city.gov",
  password: "demo123",
};

const normalizeEmail = (value = "") => value.trim().toLowerCase();

export default function App() {
  const [view, setView] = useState("overview");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authMode, setAuthMode] = useState("signin");
  const [authForm, setAuthForm] = useState(emptyForm);
  const [authError, setAuthError] = useState("");
  const [registeredUsers, setRegisteredUsers] = useState(() => {
    try {
      const saved = localStorage.getItem("smartgov-registered-users");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [currentUser, setCurrentUser] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState({ fullName: "", email: "" });
  const [stats, setStats] = useState(null);
  const [trends, setTrends] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedTrace, setSelectedTrace] = useState(null);
  const [loadError, setLoadError] = useState(false);

  const loadAll = async () => {
    try {
      const [s, t, h, c, d] = await Promise.all([
        api.stats(), api.trends(), api.hotspots(),
        api.complaints({ limit: 30 }), api.departments(),
      ]);
      setStats(s); setTrends(t); setHotspots(h); setComplaints(c); setDepartments(d);
      setLoadError(false);
    } catch (e) {
      setLoadError(true);
    }
  };

  useEffect(() => {
    localStorage.setItem("smartgov-registered-users", JSON.stringify(registeredUsers));
  }, [registeredUsers]);

  useEffect(() => {
    if (!isAuthenticated) return;

    loadAll();
    const interval = setInterval(loadAll, 15000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const handleSelectComplaint = async (id) => {
    setSelectedId(id);
    const detail = await api.complaint(id);
    setSelectedTrace(detail.agent_trace);
  };

  const handleSubmitted = (data) => {
    loadAll();
    setView("history");
  };

  const handleDeleteComplaint = async (id) => {
    try {
      await api.deleteComplaint(id);
      setComplaints((prev) => prev.filter((c) => c.id !== id));
      loadAll();
    } catch (err) {
      console.error("Failed to delete complaint:", err);
    }
  };

  const handleAuthChange = (event) => {
    const { name, value } = event.target;
    setAuthForm((current) => ({ ...current, [name]: value }));
    setAuthError("");
  };

  const handleAuthSubmit = (event) => {
    event.preventDefault();

    const email = normalizeEmail(authForm.email);
    const password = authForm.password.trim();

    if (authMode === "signup" && !authForm.fullName.trim()) {
      setAuthError("Please enter your full name.");
      return;
    }

    if (!email || !password) {
      setAuthError("Email and password are required.");
      return;
    }

    if (authMode === "signup") {
      if (authForm.password !== authForm.confirmPassword) {
        setAuthError("Passwords do not match.");
        return;
      }

      const alreadyRegistered = registeredUsers.some(
        (user) => normalizeEmail(user.email) === email
      );

      if (alreadyRegistered) {
        setAuthMode("signin");
        setAuthForm((current) => ({ ...current, email, password: "", confirmPassword: "" }));
        setAuthError("This email is already registered. Please login instead.");
        return;
      }

      const nextUser = {
        fullName: authForm.fullName.trim(),
        email,
        password,
      };

      setRegisteredUsers((current) => {
        const alreadyExists = current.some((user) => normalizeEmail(user.email) === email);
        if (alreadyExists) {
          return current.map((user) => normalizeEmail(user.email) === email ? nextUser : user);
        }
        return [...current, nextUser];
      });
      setCurrentUser(nextUser);
      setAuthError("");
      setIsAuthenticated(true);
      return;
    }

    const demoMatch = email === normalizeEmail(DEMO_USER.email) && password === DEMO_USER.password;
    const matchedUser = registeredUsers.find(
      (user) => normalizeEmail(user.email) === email && user.password === password
    );

    if (demoMatch || matchedUser) {
      setCurrentUser(demoMatch ? DEMO_USER : matchedUser);
      setIsAuthenticated(true);
      setAuthError("");
      return;
    }

    setAuthError("Invalid email or password. Please try again.");
  };

  const openProfile = () => {
    setProfileDraft({
      fullName: currentUser?.fullName || "",
      email: currentUser?.email || "",
    });
    setProfileOpen(true);
  };

  const saveProfile = () => {
    if (!currentUser) return;

    const nextUser = {
      ...currentUser,
      fullName: profileDraft.fullName.trim() || currentUser.fullName,
      email: normalizeEmail(profileDraft.email) || currentUser.email,
    };

    setCurrentUser(nextUser);
    setRegisteredUsers((users) =>
      users.map((user) =>
        normalizeEmail(user.email) === normalizeEmail(currentUser.email) ? nextUser : user
      )
    );
    setProfileOpen(false);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    setAuthMode("signin");
    setAuthForm(emptyForm);
    setAuthError("");
    setProfileOpen(false);
  };

  if (!isAuthenticated) {
    return (
      <div className="auth-page">
        <header className="auth-topbar">
          <div className="auth-brand-row">
            <span className="brand-mark auth-brand-mark">
              <span className="brand-dot" />
            </span>
            <span className="brand-name">SmartGov AI</span>
          </div>
        </header>

        <main className="auth-shell">
          <section className="auth-hero-panel">
            <div className="auth-hero-inner">
              <div className="auth-product-title">
                <span className="brand-mark auth-brand-mark small">
                  <span className="brand-dot" />
                </span>
                <span>SmartGov AI Civic Portal</span>
              </div>

              <p>
                Autonomous municipal grievance resolution, real-time Computer Vision triage,
                and multi-agent operations command for modern urban governance.
              </p>

              <ul className="feature-list">
                <li><span className="feature-icon">✓</span> Real-Time Computer Vision Pothole &amp; Garbage Detection</li>
                <li><span className="feature-icon">✓</span> 4-Agent Autonomous Routing &amp; Priority SLA Triage</li>
                <li><span className="feature-icon">✓</span> Multilingual Voice &amp; Regional Dialect Auto-Translation</li>
                <li><span className="feature-icon">✓</span> Predictive GIS Hotspots &amp; Department Telemetry</li>
              </ul>
            </div>
          </section>

          <section className="auth-card-panel">
            <div className="auth-card-inner">
              <div className="auth-header">
                <h2>{authMode === "signin" ? "Welcome Back ✨" : "Join SmartGov ✨"}</h2>
                <p>
                  {authMode === "signin"
                    ? "Sign in with your credentials or continue as Demo Operator below."
                    : "Create your citizen account to file and track grievances."}
                </p>
              </div>

              <div className="auth-toggle">
                <button
                  type="button"
                  className={authMode === "signin" ? "auth-tab active" : "auth-tab"}
                  onClick={() => setAuthMode("signin")}
                >
                  Login
                </button>
                <button
                  type="button"
                  className={authMode === "signup" ? "auth-tab active" : "auth-tab"}
                  onClick={() => setAuthMode("signup")}
                >
                  Sign Up
                </button>
              </div>

              <form className="auth-form" onSubmit={handleAuthSubmit}>
                {authMode === "signup" && (
                  <label className="field auth-field">
                    <span>Full name</span>
                    <input
                      type="text"
                      name="fullName"
                      value={authForm.fullName}
                      onChange={handleAuthChange}
                      placeholder="Alex Morgan"
                    />
                  </label>
                )}

                <label className="field auth-field">
                  <span>Email</span>
                  <input
                    type="email"
                    name="email"
                    value={authForm.email}
                    onChange={handleAuthChange}
                    placeholder="name@city.gov"
                  />
                </label>

                <label className="field auth-field">
                  <span>Password</span>
                  <input
                    type="password"
                    name="password"
                    value={authForm.password}
                    onChange={handleAuthChange}
                    placeholder={authMode === "signin" ? "Enter your password" : "Create a password"}
                  />
                </label>

                {authMode === "signup" && (
                  <label className="field auth-field">
                    <span>Confirm password</span>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={authForm.confirmPassword}
                      onChange={handleAuthChange}
                      placeholder="Re-enter your password"
                    />
                  </label>
                )}

                <div className="auth-meta">
                  {authMode === "signin" && (
                    <label className="remember-me">
                      <input type="checkbox" defaultChecked />
                      <span>Remember me</span>
                    </label>
                  )}
                  {authMode === "signin" && <button type="button" className="text-btn">Forgot password?</button>}
                </div>

                {authError && <div className="form-error auth-error">{authError}</div>}

                <button type="submit" className="btn-primary auth-submit-btn">
                  {authMode === "signin" ? "Login" : "Create account"}
                </button>

                <button
                  type="button"
                  className="btn-ghost auth-demo-btn"
                  onClick={() => {
                    setCurrentUser(DEMO_USER);
                    setRegisteredUsers((current) => {
                      const hasDemo = current.some((user) => normalizeEmail(user.email) === normalizeEmail(DEMO_USER.email));
                      return hasDemo ? current : [...current, DEMO_USER];
                    });
                    setAuthError("");
                    setIsAuthenticated(true);
                  }}
                >
                  Continue as demo operator
                </button>
              </form>
            </div>
          </section>
        </main>
      </div>
    );
  }

  return (
    <div className={`app-shell${sidebarOpen ? " sidebar-open" : ""}`}>
      <TopBar
        view={view}
        setView={setView}
        user={currentUser}
        onOpenProfile={openProfile}
        onLogout={handleLogout}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((v) => !v)}
      />

      <div className="main-panel">
        {loadError && (
          <div className="banner-error">
            Can't reach the backend API. Start it with{" "}
            <code>uvicorn main:app --reload</code> in the <code>backend/</code> folder.
          </div>
        )}

        {view === "overview" && (
          <main className="dashboard-grid">
            <StatStrip stats={stats} />

            <AgentPipeline
              trace={selectedTrace}
              complaintLabel={selectedId}
            />

            <div className="grid-row grid-row-3">
              <TrendChart trends={trends} />
              <CategoryChart breakdown={stats?.category_breakdown} />
              <DepartmentPanel departments={departments} />
            </div>

            <div className="grid-row grid-row-2">
              <HotspotMap hotspots={hotspots} />
              <OperationalInsights
                stats={stats}
                complaints={complaints}
                departments={departments}
                onNavigateHistory={() => setView("history")}
              />
            </div>
          </main>
        )}

        {view === "copilot" && (
          <main className="dashboard-grid">
            <AIAgentConsole stats={stats} complaints={complaints} />
          </main>
        )}

        {view === "history" && (
          <main className="dashboard-grid">
            <ComplaintHistory
              complaints={complaints}
              currentUser={currentUser}
              onSelectComplaint={handleSelectComplaint}
              onDeleteComplaint={handleDeleteComplaint}
              onNavigateReport={() => setView("report")}
            />
          </main>
        )}

        {view === "report" && (
          <main className="dashboard-grid">
            <ReportForm onSubmitted={handleSubmitted} user={currentUser} />
          </main>
        )}


      </div>

      {profileOpen && (
        <div className="profile-modal-backdrop" onClick={() => setProfileOpen(false)}>
          <div className="profile-modal" onClick={(event) => event.stopPropagation()}>
            <div className="profile-header">
              <h3>Profile settings</h3>
              <button type="button" className="icon-close" onClick={() => setProfileOpen(false)}>×</button>
            </div>

            <label className="field">
              <span>Full name</span>
              <input
                value={profileDraft.fullName}
                onChange={(event) => setProfileDraft((current) => ({ ...current, fullName: event.target.value }))}
              />
            </label>

            <label className="field">
              <span>Email</span>
              <input
                value={profileDraft.email}
                onChange={(event) => setProfileDraft((current) => ({ ...current, email: event.target.value }))}
              />
            </label>

            <div className="profile-actions">
              <button type="button" className="btn-ghost" onClick={() => setProfileOpen(false)}>Cancel</button>
              <button type="button" className="btn-primary" onClick={saveProfile}>Save changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
