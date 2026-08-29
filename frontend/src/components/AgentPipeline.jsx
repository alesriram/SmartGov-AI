import { useEffect, useState } from "react";

const AGENT_META = [
  { key: "Classification Agent", short: "Classify", idle: "Reads CV + NLP signals, resolves final category" },
  { key: "Routing Agent", short: "Route", idle: "Maps category to the responsible department" },
  { key: "Priority Assessment Agent", short: "Prioritize", idle: "Scores urgency from text, category risk & CV confidence" },
  { key: "Citizen Response Agent", short: "Respond", idle: "Drafts the citizen acknowledgement & ETA" },
];

export default function AgentPipeline({ trace, complaintLabel }) {
  const [activeIdx, setActiveIdx] = useState(trace ? -1 : null);

  useEffect(() => {
    if (!trace) {
      setActiveIdx(null);
      return;
    }
    setActiveIdx(-1);
    let i = 0;
    const step = () => {
      setActiveIdx(i);
      i += 1;
      if (i < AGENT_META.length) {
        setTimeout(step, 550);
      }
    };
    const start = setTimeout(step, 150);
    return () => clearTimeout(start);
  }, [trace]);

  return (
    <div className="panel agent-pipeline">
      <div className="panel-head">
        <h3>Multi-Agent Workflow</h3>
        <span className="panel-sub mono">
          {complaintLabel ? `tracing #${complaintLabel}` : "LangGraph-style pipeline · idle"}
        </span>
      </div>

      <div className="pipeline-track">
        {AGENT_META.map((agent, idx) => {
          const isActive = trace && idx <= activeIdx;
          const isCurrent = trace && idx === activeIdx;
          const data = trace ? trace[idx] : null;
          return (
            <div className="pipeline-node-wrap" key={agent.key}>
              <div className={`pipeline-node ${isActive ? "on" : ""} ${isCurrent ? "pulse" : ""}`}>
                <span className="pipeline-node-index mono">{String(idx + 1).padStart(2, "0")}</span>
                <span className="pipeline-node-label">{agent.short}</span>
              </div>
              <p className="pipeline-node-detail mono">
                {isActive && data ? data.decision : agent.idle}
              </p>
              {idx < AGENT_META.length - 1 && (
                <div className={`pipeline-edge ${trace && idx < activeIdx ? "on" : ""}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
