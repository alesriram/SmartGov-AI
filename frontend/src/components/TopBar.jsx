import { useEffect, useState } from "react";

export default function TopBar({ view, setView, user, onOpenProfile, onLogout, sidebarOpen, onToggleSidebar }) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const getGreetingPrefix = () => {
    const hour = now.getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <>
      {/* Compact top header */}
      <header className="topbar">
        <div className="topbar-left">
          <button type="button" className="menu-toggle" onClick={onToggleSidebar} aria-label="Toggle menu">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              {sidebarOpen ? (
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              ) : (
                <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              )}
            </svg>
          </button>
          <div className="brand-mark">
            <span className="brand-dot" />
            <span className="brand-name">SmartGov&nbsp;AI</span>
          </div>
          <span className="brand-sub">Civic Operations Intelligence</span>
        </div>
        <div className="topbar-right">
          <div
            className="elite-officer-pill"
            onClick={onOpenProfile}
            title="Civic Command Officer Profile · Click to manage settings"
          >
            <div className="officer-status-dot-wrap">
              <span className="officer-radar-ping" />
              <span className="officer-status-dot" />
            </div>

            <div className="officer-text-col">
              <div className="officer-rank-row">
                <span className="officer-rank-label">{getGreetingPrefix()},</span>
                <span className="officer-star">✦</span>
              </div>
              <strong className="officer-name-title">{user?.fullName || "Demo Operator"}</strong>
            </div>

            <div className="officer-avatar-gem">
              {(user?.fullName || "O").charAt(0).toUpperCase()}
            </div>
          </div>

          <button
            type="button"
            className="topbar-signout-btn"
            onClick={onLogout}
            title="Sign Out (Logout immediately)"
            aria-label="Sign Out"
          >
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
              <path d="M13 15l4-5-4-5M17 10H7M7 3H4a2 2 0 00-2 2v10a2 2 0 002 2h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Overlay for mobile */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={onToggleSidebar} />}

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-top">
          <div className="sidebar-section-label">Navigation</div>
          <nav className="sidebar-nav">
            <button
              className={view === "overview" ? "nav-btn active" : "nav-btn"}
              onClick={() => setView("overview")}
            >
              <svg className="nav-icon" viewBox="0 0 20 20" fill="none">
                <rect x="2" y="2" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <rect x="11" y="2" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <rect x="2" y="11" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
                <rect x="11" y="11" width="7" height="7" rx="2" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              Command Center
            </button>
            <button
              className={view === "report" ? "nav-btn active" : "nav-btn"}
              onClick={() => setView("report")}
            >
              <svg className="nav-icon" viewBox="0 0 20 20" fill="none">
                <path d="M10 2v16M2 10h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              Report an Issue
            </button>
            <button
              className={view === "copilot" ? "nav-btn active" : "nav-btn"}
              onClick={() => setView("copilot")}
            >
              <svg className="nav-icon" viewBox="0 0 20 20" fill="none">
                <path d="M10 2L3 7v6l7 5 7-5V7l-7-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              AI Copilot
            </button>
            <button
              className={view === "history" ? "nav-btn active" : "nav-btn"}
              onClick={() => setView("history")}
            >
              <svg className="nav-icon" viewBox="0 0 20 20" fill="none">
                <path d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" stroke="currentColor" strokeWidth="1.5" />
                <path d="M7 6h6M7 10h6M7 14h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Complaint History
            </button>
          </nav>
        </div>

        <div className="sidebar-bottom">
          <div className="sidebar-profile">
            <div className="sidebar-profile-avatar">
              {(user?.fullName || "A").charAt(0).toUpperCase()}
            </div>
            <div className="sidebar-profile-info">
              <span className="sidebar-profile-name">{user?.fullName || "Admin"}</span>
              <span className="sidebar-profile-email">{user?.email || "admin@city.gov"}</span>
            </div>
            <div className="sidebar-profile-actions">
              <button type="button" className="sp-btn sp-btn-edit" onClick={onOpenProfile} title="Edit profile">
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                  <path d="M11.5 1.5l3 3L5 14H2v-3L11.5 1.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                </svg>
              </button>
              <button type="button" className="sp-btn sp-btn-logout" onClick={onLogout} title="Sign out">
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                  <path d="M6 2H4a2 2 0 00-2 2v8a2 2 0 002 2h2M10 12l4-4-4-4M14 8H6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
