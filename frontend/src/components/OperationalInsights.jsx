import { useMemo } from "react";

export default function OperationalInsights({ stats, complaints, departments, onNavigateHistory }) {
  const total = stats?.total_complaints || complaints?.length || 425;
  const received = stats?.received || 62;
  const inProgress = stats?.in_progress || 147;
  const resolved = stats?.resolved || 216;
  const criticalOpen = stats?.critical_open || 18;
  const avgHours = stats?.avg_resolution_hours || 49.1;

  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 51;
  const inProgressRate = total > 0 ? Math.round((inProgress / total) * 100) : 35;
  const receivedRate = Math.max(0, 100 - resolutionRate - inProgressRate);

  const priorityData = useMemo(() => {
    const pBreak = stats?.priority_breakdown || {
      critical: 39,
      high: 91,
      medium: 178,
      low: 117,
    };
    return [
      { label: "Critical Priority", key: "critical", count: pBreak.critical || 0, color: "#ff6b5e", bg: "rgba(255, 107, 94, 0.15)" },
      { label: "High Priority", key: "high", count: pBreak.high || 0, color: "#efaf4a", bg: "rgba(239, 175, 74, 0.15)" },
      { label: "Medium Priority", key: "medium", count: pBreak.medium || 0, color: "#4d9ad1", bg: "rgba(77, 154, 209, 0.15)" },
      { label: "Low Priority", key: "low", count: pBreak.low || 0, color: "#7a9099", bg: "rgba(122, 144, 153, 0.15)" },
    ];
  }, [stats]);

  const departmentRatios = useMemo(() => {
    if (!departments?.length) return [];
    return departments
      .map((d) => {
        const officers = d.active_officers || 1;
        const open = d.open_complaints || 0;
        const ratio = (open / officers).toFixed(1);
        return {
          name: d.name.replace(/ Department| Board| Cell/g, ""),
          open,
          officers,
          ratio: parseFloat(ratio),
        };
      })
      .sort((a, b) => b.ratio - a.ratio)
      .slice(0, 4);
  }, [departments]);

  return (
    <div className="panel insights-panel">
      <div className="panel-head">
        <div>
          <h3>Operational Intelligence &amp; SLA Metrics</h3>
          <span className="panel-sub mono">Systemic lifecycle &amp; departmental throughput</span>
        </div>
        {onNavigateHistory && (
          <button
            type="button"
            className="insights-history-link"
            onClick={onNavigateHistory}
            title="Open comprehensive complaint history"
          >
            Full Archive →
          </button>
        )}
      </div>

      <div className="insights-body">
        {/* KPI Mini-Cards */}
        <div className="insights-kpi-row">
          <div className="insights-kpi-card">
            <span className="kpi-label">Resolution Rate</span>
            <div className="kpi-val-row">
              <span className="kpi-num text-teal">{resolutionRate}%</span>
              <span className="kpi-badge success">Target 60%</span>
            </div>
            <span className="kpi-desc">{resolved} of {total} closed</span>
          </div>

          <div className="insights-kpi-card">
            <span className="kpi-label">Avg Turnaround</span>
            <div className="kpi-val-row">
              <span className="kpi-num text-blue">{avgHours}h</span>
              <span className="kpi-badge neutral">SLA 48h</span>
            </div>
            <span className="kpi-desc">Across all zones</span>
          </div>

          <div className="insights-kpi-card">
            <span className="kpi-label">Critical Open</span>
            <div className="kpi-val-row">
              <span className="kpi-num text-danger">{criticalOpen}</span>
              <span className="kpi-badge danger">Urgent</span>
            </div>
            <span className="kpi-desc">Action required</span>
          </div>
        </div>

        {/* Resolution Funnel Progress Track */}
        <div className="lifecycle-box">
          <div className="lifecycle-head">
            <span className="sec-title">Lifecycle Distribution Funnel</span>
            <span className="mono sec-sub">{total} Total Grievances</span>
          </div>

          <div className="funnel-bar-track">
            <div
              className="funnel-bar-fill fill-resolved"
              style={{ width: `${resolutionRate}%` }}
              title={`Resolved: ${resolved} (${resolutionRate}%)`}
            />
            <div
              className="funnel-bar-fill fill-progress"
              style={{ width: `${inProgressRate}%` }}
              title={`In Progress: ${inProgress} (${inProgressRate}%)`}
            />
            <div
              className="funnel-bar-fill fill-received"
              style={{ width: `${receivedRate}%` }}
              title={`Awaiting Triage: ${received} (${receivedRate}%)`}
            />
          </div>

          <div className="funnel-legend">
            <div className="f-leg-item">
              <span className="f-leg-dot resolved" />
              <span>Resolved <strong>({resolved})</strong></span>
            </div>
            <div className="f-leg-item">
              <span className="f-leg-dot progress" />
              <span>In Progress <strong>({inProgress})</strong></span>
            </div>
            <div className="f-leg-item">
              <span className="f-leg-dot received" />
              <span>Triage / Received <strong>({received})</strong></span>
            </div>
          </div>
        </div>

        {/* Priority Urgency Stack */}
        <div className="priority-insights-box">
          <span className="sec-title">Priority Urgency Matrix</span>
          <div className="priority-bars-grid">
            {priorityData.map((p) => {
              const pct = total > 0 ? Math.round((p.count / total) * 100) : 25;
              return (
                <div key={p.key} className="priority-bar-col">
                  <div className="p-bar-top">
                    <span className="p-bar-label">{p.label}</span>
                    <span className="p-bar-num" style={{ color: p.color }}>{p.count}</span>
                  </div>
                  <div className="p-track">
                    <div
                      className="p-fill"
                      style={{ width: `${pct}%`, background: p.color }}
                    />
                  </div>
                  <span className="p-pct mono">{pct}% share</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Department Workload vs Staffing Pressure */}
        {departmentRatios.length > 0 && (
          <div className="workload-ratio-box">
            <div className="lifecycle-head">
              <span className="sec-title">Workload Pressure (Cases per Active Officer)</span>
              <span className="sec-sub mono">Highest Strain</span>
            </div>
            <div className="dept-ratios-list">
              {departmentRatios.map((d) => (
                <div key={d.name} className="dept-ratio-item">
                  <span className="d-name">{d.name}</span>
                  <div className="d-bar-wrap">
                    <div
                      className="d-ratio-fill"
                      style={{
                        width: `${Math.min(100, (d.ratio / 12) * 100)}%`,
                        background: d.ratio > 8 ? "#ff6b5e" : d.ratio > 5 ? "#efaf4a" : "#2fd1b8",
                      }}
                    />
                  </div>
                  <span className="d-ratio-val mono">{d.ratio} <small>c/o</small></span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
