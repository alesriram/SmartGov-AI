const DEPT_META = {
  roads: {
    label: "Roads & Bridges",
    icon: "🛣️",
    color: "#2fd1b8",
    gradient: "linear-gradient(90deg, #0ea7a8, #2fd1b8)",
    bg: "rgba(47, 209, 184, 0.12)",
  },
  sanitation: {
    label: "Waste & Sanitation",
    icon: "🗑️",
    color: "#f59e0b",
    gradient: "linear-gradient(90deg, #f59e0b, #ef4444)",
    bg: "rgba(245, 158, 11, 0.12)",
  },
  water_supply: {
    label: "Water & Sewerage",
    icon: "🚰",
    color: "#3b82f6",
    gradient: "linear-gradient(90deg, #3b82f6, #60a5fa)",
    bg: "rgba(59, 130, 246, 0.12)",
  },
  electricity: {
    label: "Lighting & Power",
    icon: "⚡",
    color: "#eab308",
    gradient: "linear-gradient(90deg, #eab308, #fbbf24)",
    bg: "rgba(234, 179, 8, 0.12)",
  },
  traffic: {
    label: "Traffic & Mobility",
    icon: "🚦",
    color: "#a855f7",
    gradient: "linear-gradient(90deg, #8b5cf6, #c084fc)",
    bg: "rgba(168, 85, 247, 0.12)",
  },
  public_health: {
    label: "Public Health",
    icon: "🏥",
    color: "#f43f5e",
    gradient: "linear-gradient(90deg, #f43f5e, #fda4af)",
    bg: "rgba(244, 63, 94, 0.12)",
  },
  general: {
    label: "General Grievances",
    icon: "🏛️",
    color: "#14b8a6",
    gradient: "linear-gradient(90deg, #0d9488, #2dd4bf)",
    bg: "rgba(20, 184, 166, 0.12)",
  },
};

export default function DepartmentPanel({ departments }) {
  const max = Math.max(1, ...(departments || []).map((d) => d.open_complaints || 0));

  const getLoadBadge = (open, officers) => {
    const ratio = open / (officers || 1);
    if (ratio > 4) return { label: "CRITICAL", cls: "dept-status-critical" };
    if (ratio > 2.5) return { label: "HEAVY", cls: "dept-status-heavy" };
    if (ratio > 1) return { label: "MODERATE", cls: "dept-status-mod" };
    return { label: "OPTIMAL", cls: "dept-status-opt" };
  };

  return (
    <div className="panel dept-panel-custom">
      <div className="panel-head dept-panel-head">
        <div>
          <h3>Department Operations Load</h3>
          <span className="panel-sub mono">Real-time municipal capacity &amp; SLA strain</span>
        </div>
        <span className="dept-live-tag">⚡ Live Telemetry</span>
      </div>

      <div className="dept-compact-list">
        {departments?.map((d) => {
          const meta = DEPT_META[d.name] || {
            label: d.name?.replace(/_/g, " "),
            icon: "🏢",
            color: "#2fd1b8",
            gradient: "linear-gradient(90deg, #0ea7a8, #2fd1b8)",
            bg: "rgba(47, 209, 184, 0.12)",
          };
          const status = getLoadBadge(d.open_complaints, d.active_officers);
          const percent = Math.min(100, Math.round((d.open_complaints / max) * 100));

          return (
            <div className="dept-card-compact" key={d.id}>
              <div className="dept-card-top-row">
                <div className="dept-card-identity">
                  <span className="dept-icon-bubble" style={{ background: meta.bg }}>
                    {meta.icon}
                  </span>
                  <div className="dept-name-block">
                    <span className="dept-clean-title">{meta.label}</span>
                    <span className="dept-officers-micro">
                      👥 {d.active_officers} active officers
                    </span>
                  </div>
                </div>

                <div className="dept-card-metrics">
                  <div className="dept-open-number-wrap">
                    <span className="dept-open-num mono" style={{ color: meta.color }}>
                      {d.open_complaints}
                    </span>
                    <span className="dept-open-label">cases</span>
                  </div>
                  <span className={`dept-strain-pill ${status.cls}`}>
                    {status.label}
                  </span>
                </div>
              </div>

              <div className="dept-progress-track">
                <div
                  className="dept-progress-fill"
                  style={{
                    width: `${percent}%`,
                    background: meta.gradient,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
