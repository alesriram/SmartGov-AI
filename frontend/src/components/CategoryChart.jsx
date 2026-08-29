import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const CATEGORY_META = {
  roads: { label: "Roads & Bridges", color: "#2FD1B8", icon: "🛣️" },
  sanitation: { label: "Waste & Sanitation", color: "#F0A93E", icon: "🗑️" },
  water_supply: { label: "Water & Drainage", color: "#5B9BFF", icon: "🚰" },
  electricity: { label: "Lighting & Power", color: "#EAB308", icon: "⚡" },
  traffic: { label: "Traffic & Transit", color: "#9B8CFF", icon: "🚦" },
  public_health: { label: "Public Health", color: "#FF6B5E", icon: "🏥" },
  general: { label: "General Services", color: "#14B8A6", icon: "🏛️" },
};

export default function CategoryChart({ breakdown }) {
  const data = Object.entries(breakdown || {}).map(([key, value]) => {
    const meta = CATEGORY_META[key] || {
      label: key.replace(/_/g, " "),
      color: "#8CA0B3",
      icon: "📁",
    };
    return {
      key,
      name: meta.label,
      value,
      color: meta.color,
      icon: meta.icon,
    };
  });

  const total = data.reduce((acc, curr) => acc + (curr.value || 0), 0);

  return (
    <div className="panel category-panel-custom">
      <div className="panel-head category-panel-head">
        <div>
          <h3>Complaints by Category</h3>
          <span className="panel-sub mono">{total} total grievances logged</span>
        </div>
        <span className="category-total-pill mono">{total} Total</span>
      </div>

      <div className="category-chart-body">
        {/* Centered Donut with Total in Center */}
        <div className="donut-container-relative">
          <ResponsiveContainer width="100%" height={155}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={46}
                outerRadius={70}
                paddingAngle={3}
                stroke="none"
              >
                {data.map((entry) => (
                  <Cell key={entry.key} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  background: "#16263A",
                  border: "1px solid rgba(47, 209, 184, 0.3)",
                  borderRadius: 8,
                  fontSize: 12,
                  fontFamily: "JetBrains Mono",
                  boxShadow: "0 4px 14px rgba(0,0,0,0.3)",
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          <div className="donut-center-badge">
            <span className="donut-center-val mono">{total}</span>
            <span className="donut-center-sub">CASES</span>
          </div>
        </div>

        {/* 2-Column Full-Width Grid filling all gaps */}
        <div className="category-cards-grid">
          {data.map((d) => {
            const pct = total > 0 ? Math.round((d.value / total) * 100) : 0;
            return (
              <div className="category-item-card" key={d.key}>
                <div className="category-item-left">
                  <span className="cat-color-dot" style={{ background: d.color }} />
                  <span className="cat-card-name" title={d.name}>{d.name}</span>
                </div>
                <div className="category-item-right">
                  <span className="cat-card-val mono">{d.value}</span>
                  <span className="cat-card-pct" style={{ color: d.color }}>{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
