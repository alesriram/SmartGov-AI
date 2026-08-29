const PRIORITY_CLASS = {
  critical: "badge-danger",
  high: "badge-amber",
  medium: "badge-blue",
  low: "badge-muted",
};

const STATUS_LABEL = {
  received: "Received",
  classified: "Classified",
  routed: "Routed",
  in_progress: "In Progress",
  resolved: "Resolved",
  rejected: "Rejected",
};

export default function ComplaintFeed({ complaints, onSelect, selectedId }) {
  return (
    <div className="panel feed-panel">
      <div className="panel-head">
        <h3>Live Complaint Feed</h3>
        <span className="panel-sub mono">{complaints?.length || 0} shown · click to inspect agent trace</span>
      </div>
      <div className="feed-list">
        {complaints?.map((c) => (
          <button
            key={c.id}
            className={`feed-row ${selectedId === c.id ? "selected" : ""}`}
            onClick={() => onSelect(c.id)}
          >
            <span className="feed-id mono">#{c.id}</span>
            <div className="feed-body">
              <div className="feed-desc">{c.description}</div>
              <div className="feed-meta">
                <span className="feed-dept">{c.department || "Unassigned"}</span>
                <span className="dot-sep" />
                <span className="mono feed-status">{STATUS_LABEL[c.status] || c.status}</span>
              </div>
            </div>
            <span className={`badge ${PRIORITY_CLASS[c.priority] || "badge-muted"}`}>
              {c.priority}
            </span>
          </button>
        ))}
        {!complaints?.length && <p className="empty-state">No complaints match this filter.</p>}
      </div>
    </div>
  );
}
