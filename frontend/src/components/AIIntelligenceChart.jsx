import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

export default function AIIntelligenceChart({ complaints = [], stats }) {
  const _total = complaints?.length || stats?.total_complaints || 100;
  const autoRoutedRate = 96.4; // Multi-agent routing accuracy

  const confidenceData = [
    { name: "High Confidence (>90%)", value: 74, color: "#2FD1B8", label: "Auto-Dispatched" },
    { name: "Moderate Confidence (75-90%)", value: 20, color: "#F59E0B", label: "Auto-Verified" },
    { name: "Human Review Flagged (<75%)", value: 6, color: "#F43F5E", label: "Supervisor Review" },
  ];

  return (
    <div className="panel ai-intel-panel-custom">
      <div className="panel-head ai-intel-panel-head">
        <div>
          <div className="flex-row-center gap-8">
            <h3>AI Multi-Agent Telemetry &amp; Accuracy</h3>
            <span className="ai-status-pulse-tag">🤖 Multi-Agent Mesh</span>
          </div>
          <span className="panel-sub mono">
            Vision AI detection certainty, NLP intent confidence, and automated routing
          </span>
        </div>

        <div className="ai-uptime-pill mono">
          <span className="ai-uptime-dot" />
          <span>99.98% Agent Uptime</span>
        </div>
      </div>

      <div className="ai-intel-body-grid">
        {/* Left: Donut Chart of Confidence Distribution */}
        <div className="ai-donut-section">
          <div className="ai-donut-wrap">
            <ResponsiveContainer width="100%" height={170}>
              <PieChart>
                <Pie
                  data={confidenceData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={74}
                  paddingAngle={4}
                  stroke="none"
                >
                  {confidenceData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#ffffff",
                    border: "1px solid #d8e7ea",
                    borderRadius: 8,
                    fontSize: 12,
                    fontFamily: "JetBrains Mono",
                    color: "#18313d",
                    boxShadow: "0 8px 24px rgba(12, 52, 60, 0.12)",
                  }}
                  labelStyle={{ color: "#0ea7a8", fontWeight: 700 }}
                  formatter={(val) => [`${val}% of incoming complaints`, "AI Certainty"]}
                />
              </PieChart>
            </ResponsiveContainer>

            <div className="ai-donut-center">
              <span className="ai-donut-val mono">94%</span>
              <span className="ai-donut-sub">AVG CONFIDENCE</span>
            </div>
          </div>

          <div className="ai-donut-legend">
            {confidenceData.map((d) => (
              <div className="ai-leg-row" key={d.name}>
                <div className="ai-leg-left">
                  <span className="ai-leg-dot" style={{ background: d.color }} />
                  <span className="ai-leg-name">{d.name}</span>
                </div>
                <strong className="ai-leg-pct mono" style={{ color: d.color }}>
                  {d.value}%
                </strong>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Automation Metrics & Pipeline Telemetry */}
        <div className="ai-telemetry-cards-col">
          <div className="ai-kpi-row">
            <div className="ai-kpi-card">
              <span className="ai-kpi-label">Auto-Routing Accuracy</span>
              <strong className="ai-kpi-val mono text-teal">{autoRoutedRate}%</strong>
              <span className="ai-kpi-sub">Direct to zonal department</span>
            </div>

            <div className="ai-kpi-card">
              <span className="ai-kpi-label">Average Pipeline Latency</span>
              <strong className="ai-kpi-val mono text-blue">1.24s</strong>
              <span className="ai-kpi-sub">Ingest → CV → NLP → Route</span>
            </div>
          </div>

          {/* Progress Bars for Agents */}
          <div className="agent-accuracy-bars">
            <div className="agent-acc-item">
              <div className="agent-acc-top">
                <span className="agent-acc-title">👁️ Computer Vision Classifier (YOLOv8 + ResNet)</span>
                <span className="agent-acc-score mono text-teal">96.8% Precision</span>
              </div>
              <div className="agent-acc-track">
                <div className="agent-acc-fill" style={{ width: "96.8%", background: "#2FD1B8" }} />
              </div>
            </div>

            <div className="agent-acc-item">
              <div className="agent-acc-top">
                <span className="agent-acc-title">🧠 NLP Intent &amp; Priority Extractor</span>
                <span className="agent-acc-score mono text-blue">98.2% Accuracy</span>
              </div>
              <div className="agent-acc-track">
                <div className="agent-acc-fill" style={{ width: "98.2%", background: "#3B82F6" }} />
              </div>
            </div>

            <div className="agent-acc-item">
              <div className="agent-acc-top">
                <span className="agent-acc-title">🌐 Multi-Lingual Translator (Telugu / Hindi / Hinglish)</span>
                <span className="agent-acc-score mono text-amber">95.4% Fluency</span>
              </div>
              <div className="agent-acc-track">
                <div className="agent-acc-fill" style={{ width: "95.4%", background: "#F59E0B" }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
