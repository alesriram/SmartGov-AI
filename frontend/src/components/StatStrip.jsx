export default function StatStrip({ stats }) {
  if (!stats) return null;

  const items = [
    { label: "Total complaints", value: stats.total_complaints, accent: "text" },
    { label: "Awaiting triage", value: stats.received, accent: "amber" },
    { label: "In progress", value: stats.in_progress, accent: "blue" },
    { label: "Resolved", value: stats.resolved, accent: "teal" },
    { label: "Critical & open", value: stats.critical_open, accent: "danger" },
    {
      label: "Avg. resolution",
      value: stats.avg_resolution_hours ? `${stats.avg_resolution_hours}h` : "—",
      accent: "text",
    },
  ];

  return (
    <div className="stat-strip">
      {items.map((it) => (
        <div className="stat-card" key={it.label}>
          <div className={`stat-value stat-${it.accent}`}>{it.value}</div>
          <div className="stat-label">{it.label}</div>
        </div>
      ))}
    </div>
  );
}
