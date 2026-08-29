import { useState, useMemo, useEffect } from "react";
import { api } from "../api";

const PRIORITY_CLASS = {
  critical: "badge-danger",
  high: "badge-amber",
  medium: "badge-blue",
  low: "badge-muted",
};

const STATUS_CLASS = {
  received: "status-pill received",
  classified: "status-pill classified",
  routed: "status-pill routed",
  in_progress: "status-pill progress",
  resolved: "status-pill resolved",
  rejected: "status-pill rejected",
};

const CATEGORIES = [
  { key: "all", label: "All Categories" },
  { key: "roads", label: "Roads & Infrastructure" },
  { key: "sanitation", label: "Sanitation & Waste" },
  { key: "water_supply", label: "Water Supply" },
  { key: "electricity", label: "Electricity & Lighting" },
  { key: "traffic", label: "Traffic & Transport" },
  { key: "public_health", label: "Public Health" },
];

export default function ComplaintHistory({
  complaints = [],
  currentUser,
  onSelectComplaint,
  onDeleteComplaint,
  onNavigateReport,
}) {
  const [activeSection, setActiveSection] = useState("all_places"); // "all_places" | "user_history"
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedPriority, setSelectedPriority] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [selectedModalItem, setSelectedModalItem] = useState(null);
  const [userFilterName, setUserFilterName] = useState(currentUser?.fullName || "Demo Operator");

  // Format date helper
  const formatDate = (dateStr) => {
    if (!dateStr) return "Recent";
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Section 1: Citywide Filtered Complaints (Across All Places)
  const filteredCitywide = useMemo(() => {
    return complaints.filter((c) => {
      // Category filter
      if (selectedCategory !== "all" && c.category !== selectedCategory) return false;
      // Status filter
      if (selectedStatus !== "all" && c.status !== selectedStatus) return false;
      // Priority filter
      if (selectedPriority !== "all" && c.priority !== selectedPriority) return false;
      // Search term
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const idMatch = c.id?.toString().includes(q);
        const descMatch = c.description?.toLowerCase().includes(q);
        const addrMatch = c.address?.toLowerCase().includes(q);
        const nameMatch = c.citizen_name?.toLowerCase().includes(q);
        const deptMatch = c.department?.toLowerCase().includes(q);
        if (!idMatch && !descMatch && !addrMatch && !nameMatch && !deptMatch) return false;
      }
      return true;
    }).sort((a, b) => {
      if (sortBy === "newest") return new Date(b.created_at || 0) - new Date(a.created_at || 0);
      if (sortBy === "oldest") return new Date(a.created_at || 0) - new Date(b.created_at || 0);
      if (sortBy === "priority") {
        const pOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return (pOrder[b.priority] || 0) - (pOrder[a.priority] || 0);
      }
      return 0;
    });
  }, [complaints, selectedCategory, selectedStatus, selectedPriority, search, sortBy]);

  // Section 2: User-Specific Complaints
  const userComplaints = useMemo(() => {
    const targetName = (userFilterName || currentUser?.fullName || "Demo Operator").toLowerCase().trim();
    const targetEmail = (currentUser?.email || "").toLowerCase().trim();

    return complaints.filter((c) => {
      const cName = (c.citizen_name || "").toLowerCase().trim();
      const cContact = (c.citizen_contact || "").toLowerCase().trim();
      return (
        cName.includes(targetName) ||
        (targetEmail && cContact.includes(targetEmail)) ||
        cName.includes("demo") ||
        cName.includes("citizen") // Sample seeded citizens for fallback
      );
    });
  }, [complaints, userFilterName, currentUser]);

  return (
    <div className="complaint-history-layout">
      {/* Top Header & Section Switcher */}
      <div className="history-header-panel">
        <div className="history-title-row">
          <div>
            <h2>Complaint History &amp; Grievance Records</h2>
            <p className="history-subtitle">
              Comprehensive operational archive across municipal zones and citizen submissions
            </p>
          </div>

          {/* Section Switcher Tabs */}
          <div className="history-section-toggle">
            <button
              type="button"
              className={`sec-toggle-btn ${activeSection === "all_places" ? "active" : ""}`}
              onClick={() => setActiveSection("all_places")}
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <path d="M10 2a6 6 0 00-6 6c0 4.5 6 10 6 10s6-5.5 6-10a6 6 0 00-6-6z" stroke="currentColor" strokeWidth="1.5" />
                <circle cx="10" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              <span>1. Citywide Archive (All Places)</span>
              <span className="count-pill">{complaints.length}</span>
            </button>

            <button
              type="button"
              className={`sec-toggle-btn ${activeSection === "user_history" ? "active" : ""}`}
              onClick={() => setActiveSection("user_history")}
            >
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" />
                <path d="M4 17c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span>2. My Filed Grievances (User History)</span>
              <span className="count-pill">{userComplaints.length}</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================
          SECTION 1: CITYWIDE COMPLAINT ARCHIVE (ACROSS ALL PLACES)
          ========================================================= */}
      {activeSection === "all_places" && (
        <div className="history-section-content">
          {/* Filter Bar */}
          <div className="history-filter-bar">
            <div className="search-input-wrap">
              <svg className="search-icon" width="16" height="16" viewBox="0 0 20 20" fill="none">
                <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
                <path d="M13.5 13.5L17.5 17.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by ID (#42), keyword, ward/address, citizen name, or department..."
              />
              {search && (
                <button type="button" className="search-clear-btn" onClick={() => setSearch("")}>×</button>
              )}
            </div>

            <div className="filter-selects-row">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="filter-select"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>{c.label}</option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Statuses</option>
                <option value="received">Received</option>
                <option value="in_progress">In Progress</option>
                <option value="routed">Routed</option>
                <option value="resolved">Resolved</option>
              </select>

              <select
                value={selectedPriority}
                onChange={(e) => setSelectedPriority(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Priorities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="filter-select"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="priority">Priority: Highest</option>
              </select>
            </div>
          </div>

          {/* Complaints Grid */}
          <div className="citywide-grid">
            {filteredCitywide.map((c) => (
              <div key={c.id} className="citywide-card">
                <div className="card-top">
                  <div className="card-id-row">
                    <span className="mono card-id">#{c.id}</span>
                    <span className="card-cat">{c.category?.replace(/_/g, " ")}</span>
                  </div>
                  <div className="card-badges">
                    <span className={`badge ${PRIORITY_CLASS[c.priority] || "badge-muted"}`}>
                      {c.priority}
                    </span>
                    <span className={STATUS_CLASS[c.status] || "status-pill"}>
                      {c.status?.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>

                <div className="card-desc">{c.description}</div>

                <div className="card-details-grid">
                  <div className="card-detail-item">
                    <span className="detail-label">Location / Ward</span>
                    <span className="detail-value text-ellipsis">📍 {c.address || "Hyderabad Civic Sector"}</span>
                  </div>

                  <div className="card-detail-item">
                    <span className="detail-label">Citizen</span>
                    <span className="detail-value text-ellipsis">👤 {c.citizen_name || "Citizen"}</span>
                  </div>

                  <div className="card-detail-item">
                    <span className="detail-label">Assigned Department</span>
                    <span className="detail-value text-ellipsis">🏛️ {c.department || "General Grievance"}</span>
                  </div>

                  <div className="card-detail-item">
                    <span className="detail-label">Reported On</span>
                    <span className="detail-value mono">{formatDate(c.created_at)}</span>
                  </div>
                </div>

                <div className="card-footer">
                  <button
                    type="button"
                    className="card-action-btn primary"
                    onClick={() => {
                      onSelectComplaint?.(c.id);
                      setSelectedModalItem(c);
                    }}
                  >
                    Inspect Agent Trace &amp; Details →
                  </button>
                </div>
              </div>
            ))}

            {filteredCitywide.length === 0 && (
              <div className="history-empty-box">
                <p>No complaints match the selected filters or search query.</p>
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => {
                    setSearch("");
                    setSelectedCategory("all");
                    setSelectedStatus("all");
                    setSelectedPriority("all");
                  }}
                >
                  Reset All Filters
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================
          SECTION 2: MY FILED GRIEVANCES (USER HISTORY)
          ========================================================= */}
      {activeSection === "user_history" && (
        <div className="history-section-content">
          {/* User Header Box */}
          <div className="user-profile-strip">
            <div className="user-strip-left">
              <div className="user-avatar-badge">
                {(currentUser?.fullName || "D").charAt(0).toUpperCase()}
              </div>
              <div className="user-strip-details">
                <div className="user-strip-name-row">
                  <h3>{currentUser?.fullName || "Demo Operator"}</h3>
                  <span className="user-verified-pill">✓ Verified Citizen Account</span>
                </div>
                <span className="user-email-text">{currentUser?.email || "demo@city.gov"} · Citizen Grievance Portal</span>
              </div>
            </div>

            <div className="user-strip-actions">
              <button
                type="button"
                className="btn-primary"
                onClick={onNavigateReport}
              >
                + File New Grievance
              </button>
            </div>
          </div>

          {/* User KPI Cards */}
          <div className="user-kpi-grid">
            <div className="user-kpi-card">
              <span className="user-kpi-label">Total Submissions</span>
              <strong className="user-kpi-val">{userComplaints.length}</strong>
              <span className="user-kpi-sub">Lifetime logged</span>
            </div>
            <div className="user-kpi-card">
              <span className="user-kpi-label">Under Active Action</span>
              <strong className="user-kpi-val text-blue">
                {userComplaints.filter((c) => c.status !== "resolved").length}
              </strong>
              <span className="user-kpi-sub">Field dispatch in progress</span>
            </div>
            <div className="user-kpi-card">
              <span className="user-kpi-label">Successfully Resolved</span>
              <strong className="user-kpi-val text-teal">
                {userComplaints.filter((c) => c.status === "resolved").length}
              </strong>
              <span className="user-kpi-sub">Closed with acknowledgement</span>
            </div>
          </div>

          {/* User Complaints List with Progress Stepper */}
          <div className="user-complaints-list">
            {userComplaints.map((c) => {
              const isResolved = c.status === "resolved";
              const isProgress = c.status === "in_progress" || isResolved;
              const isRouted = c.status === "routed" || isProgress;

              return (
                <div key={c.id} className="user-complaint-card">
                  <div className="user-card-head">
                    <div className="user-card-title-group">
                      <span className="mono card-id">#{c.id}</span>
                      <h4>{c.description}</h4>
                    </div>
                    <div className="user-card-badges">
                      <span className={`badge ${PRIORITY_CLASS[c.priority] || "badge-muted"}`}>
                        {c.priority} priority
                      </span>
                      <span className={STATUS_CLASS[c.status] || "status-pill"}>
                        {c.status?.replace(/_/g, " ")}
                      </span>
                      {c.original_language && c.original_language !== "en" && c.original_language !== "English" && (
                        <span className="badge badge-lang" title="Original input language">
                          🌐 {c.original_language}
                        </span>
                      )}
                      <button
                        type="button"
                        className="user-complaint-delete-btn"
                        title="Delete this complaint"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Are you sure you want to delete grievance #${c.id}?`)) {
                            onDeleteComplaint?.(c.id);
                          }
                        }}
                      >
                        <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
                          <path d="M3 6h14M8 6V4a1 1 0 011-1h2a1 1 0 011 1v2M16 6v10a2 2 0 01-2 2H6a2 2 0 01-2-2V6M9 10v4M11 10v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {/* Grievance Progress Stepper */}
                  <div className="grievance-stepper">
                    <div className="step-node active">
                      <div className="step-circle">1</div>
                      <span className="step-name">Submitted</span>
                      <span className="step-time">{formatDate(c.created_at)}</span>
                    </div>

                    <div className={`step-line ${isRouted ? "active" : ""}`} />

                    <div className={`step-node ${isRouted ? "active" : ""}`}>
                      <div className="step-circle">2</div>
                      <span className="step-name">AI Classified</span>
                      <span className="step-sub">{c.category}</span>
                    </div>

                    <div className={`step-line ${isProgress ? "active" : ""}`} />

                    <div className={`step-node ${isProgress ? "active" : ""}`}>
                      <div className="step-circle">3</div>
                      <span className="step-name">Field Action</span>
                      <span className="step-sub">{c.department || "Dispatched"}</span>
                    </div>

                    <div className={`step-line ${isResolved ? "active" : ""}`} />

                    <div className={`step-node ${isResolved ? "active" : ""}`}>
                      <div className="step-circle">4</div>
                      <span className="step-name">Resolved</span>
                      <span className="step-sub">{isResolved ? "Verified" : "Pending"}</span>
                    </div>
                  </div>

                  {/* AI Citizen Response Box */}
                  {c.ai_response && (
                    <div className="user-ai-response-box">
                      <div className="ai-res-header">
                        <span className="ai-res-title">SmartGov AI Automated Citizen Acknowledgement</span>
                      </div>
                      <p>{c.ai_response}</p>
                    </div>
                  )}

                  {/* Metadata Row */}
                  <div className="user-card-meta-row">
                    <span>📍 Location: <strong>{c.address || "Hyderabad Zone"}</strong></span>
                    <span>🏛️ Department: <strong>{c.department || "General Grievance"}</strong></span>
                    <button
                      type="button"
                      className="text-btn-action"
                      onClick={() => {
                        onSelectComplaint?.(c.id);
                        setSelectedModalItem(c);
                      }}
                    >
                      View AI Decision Trace &amp; Details →
                    </button>
                  </div>
                </div>
              );
            })}

            {userComplaints.length === 0 && (
              <div className="history-empty-box">
                <p>No complaints submitted yet under this user account.</p>
                <button type="button" className="btn-primary" onClick={onNavigateReport}>
                  File Your First Grievance Now
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Complaint Detail & Agent Trace Modal */}
      {selectedModalItem && (
        <div className="profile-modal-backdrop" onClick={() => setSelectedModalItem(null)}>
          <div className="complaint-detail-modal" onClick={(e) => e.stopPropagation()}>
            <div className="profile-header">
              <div>
                <h3>Complaint #{selectedModalItem.id} Details &amp; Agent Decisions</h3>
                <span className="copilot-subtitle">Logged {formatDate(selectedModalItem.created_at)}</span>
              </div>
              <button type="button" className="icon-close" onClick={() => setSelectedModalItem(null)}>×</button>
            </div>

            <div className="modal-scroll-body">
              <div className="modal-section">
                <span className="modal-sec-title">Grievance Description</span>
                <p className="modal-desc-text">{selectedModalItem.description}</p>
              </div>

              <div className="modal-meta-grid">
                <div className="modal-meta-card">
                  <span>Category</span>
                  <strong>{selectedModalItem.category?.replace(/_/g, " ").toUpperCase()}</strong>
                </div>
                <div className="modal-meta-card">
                  <span>Assigned Priority</span>
                  <strong className={selectedModalItem.priority === "critical" ? "text-danger" : ""}>
                    {selectedModalItem.priority?.toUpperCase()}
                  </strong>
                </div>
                <div className="modal-meta-card">
                  <span>Current Status</span>
                  <strong>{selectedModalItem.status?.toUpperCase()}</strong>
                </div>
                <div className="modal-meta-card">
                  <span>Routed Department</span>
                  <strong>{selectedModalItem.department || "Pending Routing"}</strong>
                </div>
              </div>

              {/* Citizen Details */}
              <div className="modal-section">
                <span className="modal-sec-title">Citizen Information &amp; Geolocation</span>
                <div className="modal-info-list">
                  <div>Name: <strong>{selectedModalItem.citizen_name || "Anonymous Citizen"}</strong></div>
                  <div>Contact: <strong>{selectedModalItem.citizen_contact || "N/A"}</strong></div>
                  <div>Address: <strong>{selectedModalItem.address || "Hyderabad"}</strong></div>
                  {selectedModalItem.latitude && (
                    <div>Coordinates: <code className="mono">{selectedModalItem.latitude?.toFixed(4)}, {selectedModalItem.longitude?.toFixed(4)}</code></div>
                  )}
                </div>
              </div>

              {/* AI Agent Automated Response */}
              {selectedModalItem.ai_response && (
                <div className="modal-section">
                  <span className="modal-sec-title">AI Citizen Acknowledgement Draft</span>
                  <div className="user-ai-response-box">
                    <p>{selectedModalItem.ai_response}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="profile-actions">
              <button type="button" className="btn-ghost" onClick={() => setSelectedModalItem(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
