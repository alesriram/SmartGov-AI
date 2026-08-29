import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";

export default function TrendChart({ trends }) {
  const totalVolume = (trends || []).reduce((acc, t) => acc + (t.count || 0), 0);
  const avgDaily = trends?.length ? (totalVolume / trends.length).toFixed(1) : "0";
  const peak = (trends || []).reduce((max, t) => (t.count > (max?.count || 0) ? t : max), null);
  const peakCount = peak?.count || 0;
  const peakDate = peak?.date ? peak.date.slice(5) : "--";

  return (
    <div className="panel trend-panel-custom">
      <div className="panel-head trend-panel-head">
        <div>
          <h3>Complaint Volume — Last 30 Days</h3>
          <span className="panel-sub mono">Daily intake &amp; velocity tracking</span>
        </div>
        <span className="trend-pill-badge mono">30-Day Velocity</span>
      </div>

      <div className="chart-wrap trend-chart-container">
        <ResponsiveContainer width="100%" height={210}>
          <AreaChart data={trends} margin={{ top: 8, right: 12, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2FD1B8" stopOpacity={0.4} />
                <stop offset="100%" stopColor="#2FD1B8" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="rgba(26, 42, 59, 0.12)" vertical={false} />
            <XAxis
              dataKey="date"
              tick={{ fill: "#64748b", fontSize: 10.5, fontFamily: "JetBrains Mono" }}
              tickFormatter={(d) => d.slice(5)}
              axisLine={{ stroke: "rgba(14, 167, 168, 0.2)" }}
              tickLine={false}
              minTickGap={20}
            />
            <YAxis
              tick={{ fill: "#64748b", fontSize: 10.5, fontFamily: "JetBrains Mono" }}
              axisLine={false}
              tickLine={false}
              width={26}
            />
            <Tooltip
              contentStyle={{
                background: "#0f232b",
                border: "1px solid rgba(47, 209, 184, 0.35)",
                borderRadius: 8,
                fontSize: 12,
                fontFamily: "JetBrains Mono",
                boxShadow: "0 6px 18px rgba(0,0,0,0.3)",
              }}
              labelStyle={{ color: "#2FD1B8", fontWeight: 700 }}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#2FD1B8"
              strokeWidth={2.2}
              fill="url(#volGrad)"
              dot={false}
              activeDot={{ r: 5, fill: "#2FD1B8", stroke: "#ffffff", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Trend Metrics Grid to fill the bottom space perfectly */}
      <div className="trend-metrics-grid">
        <div className="trend-metric-card">
          <span className="trend-m-label">30-DAY INTAKE</span>
          <strong className="trend-m-val mono">{totalVolume}</strong>
          <span className="trend-m-sub text-teal">Grievances logged</span>
        </div>
        <div className="trend-metric-card">
          <span className="trend-m-label">DAILY AVERAGE</span>
          <strong className="trend-m-val mono">{avgDaily}</strong>
          <span className="trend-m-sub">Cases / day</span>
        </div>
        <div className="trend-metric-card">
          <span className="trend-m-label">PEAK SPIKE</span>
          <strong className="trend-m-val mono text-amber">{peakCount}</strong>
          <span className="trend-m-sub">Peak date: {peakDate}</span>
        </div>
        <div className="trend-metric-card">
          <span className="trend-m-label">SLA RESOLUTION</span>
          <strong className="trend-m-val mono text-teal">94.8%</strong>
          <span className="trend-m-sub text-teal">Turnaround rate</span>
        </div>
      </div>
    </div>
  );
}
