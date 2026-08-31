import { useMemo, useRef, useEffect, useState } from "react";
import { api } from "../api";

const quickActions = [
  "Summarize critical incidents",
  "What should I prioritize today?",
  "Route the next response team",
  "Which department has the heaviest workload?",
  "Find hotspots needing attention",
];

// Helper to format markdown-like text safely into styled JSX
function formatAssistantMessage(text) {
  if (!text) return null;
  const lines = text.split("\n");

  return lines.map((line, i) => {
    const trimmed = line.trim();

    // Headers
    if (trimmed.startsWith("### ")) {
      return (
        <h4 key={i} className="msg-h4">
          {formatInline(trimmed.replace(/^###\s+/, ""))}
        </h4>
      );
    }
    if (trimmed.startsWith("## ")) {
      return (
        <h3 key={i} className="msg-h3">
          {formatInline(trimmed.replace(/^##\s+/, ""))}
        </h3>
      );
    }

    // Blockquotes / tips
    if (trimmed.startsWith("> ")) {
      return (
        <div key={i} className="msg-quote">
          {formatInline(trimmed.replace(/^>\s+/, ""))}
        </div>
      );
    }

    // Bullet points
    if (trimmed.startsWith("• ") || trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      return (
        <div key={i} className="msg-bullet">
          <span className="bullet-dot">›</span>
          <span className="bullet-text">{formatInline(trimmed.replace(/^[•\-*]\s+/, ""))}</span>
        </div>
      );
    }

    // Numbered items (1. 2.)
    const numMatch = trimmed.match(/^(\d+)\.\s+(.*)/);
    if (numMatch) {
      return (
        <div key={i} className="msg-num-item">
          <span className="num-badge">{numMatch[1]}</span>
          <span className="num-text">{formatInline(numMatch[2])}</span>
        </div>
      );
    }

    // Horizontal line
    if (trimmed === "---" || trimmed === "***") {
      return <hr key={i} className="msg-hr" />;
    }

    // Empty lines
    if (!trimmed) {
      return <div key={i} className="msg-spacer" />;
    }

    // Standard paragraph
    return (
      <p key={i} className="msg-p">
        {formatInline(line)}
      </p>
    );
  });
}

// Inline formatting for **bold**, `code`, and [#123] complaint chips
function formatInline(str) {
  if (!str) return "";
  // Split on bold, code, complaint IDs
  const parts = [];
  const regex = /(\*\*.*?\*\*|`.*?`|\[#[0-9]+\])/g;
  let lastIdx = 0;
  let match;

  while ((match = regex.exec(str)) !== null) {
    if (match.index > lastIdx) {
      parts.push(str.substring(lastIdx, match.index));
    }
    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(<strong key={match.index}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(<code key={match.index} className="msg-code">{token.slice(1, -1)}</code>);
    } else if (token.startsWith("[#") && token.endsWith("]")) {
      parts.push(<span key={match.index} className="msg-id-chip">{token}</span>);
    }
    lastIdx = regex.lastIndex;
  }
  if (lastIdx < str.length) {
    parts.push(str.substring(lastIdx));
  }
  return parts.length > 0 ? parts : str;
}

export default function AIAgentConsole({ stats, complaints }) {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hello! I'm SmartGov Copilot, your intelligent civic operations assistant.\n\nI am connected to the city's real-time operations database, department routing workflows, and predictive GIS hotspot analytics. Ask me to triage incidents, evaluate department loads, or recommend emergency field response priorities.",
      source: "copilot",
    },
  ]);
  const [input, setInput] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [llmConfig, setLlmConfig] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState("groq");
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [modelInput, setModelInput] = useState("");
  const [testStatus, setTestStatus] = useState(null); // { loading, success, message }
  const threadRef = useRef(null);

  // Load backend LLM configuration on mount
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const cfg = await api.assistantConfig();
      setLlmConfig(cfg);
      if (cfg?.active_provider && cfg.active_provider !== "fallback") {
        setSelectedProvider(cfg.active_provider);
      }
      if (cfg?.active_model) {
        setModelInput(cfg.active_model);
      }
    } catch {
      // Backend offline or endpoint error
    }
  };

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [messages, isBusy]);

  const insightCards = useMemo(() => {
    const critical = stats?.critical_open ?? 0;
    const total = stats?.total_complaints ?? complaints?.length ?? 0;
    const unresolved = complaints?.filter((item) => item.status !== "resolved").length ?? 0;

    return [
      { label: "Total cases", value: total, color: "#4d9ad1" },
      { label: "Active queue", value: unresolved, color: "#efaf4a" },
      { label: "Critical open", value: critical, color: "#dd5a4d" },
    ];
  }, [stats, complaints]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    setMessages((current) => [...current, { role: "user", text: trimmed }]);
    setInput("");
    setIsBusy(true);

    try {
      const response = await api.assistantPrompt(trimmed, selectedProvider, modelInput);
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: response.answer,
          source: response.source,
          model: response.model,
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          role: "assistant",
          text: "I couldn't reach the assistant service. Please check that the backend server is running and try again.",
          source: "error",
        },
      ]);
    } finally {
      setIsBusy(false);
    }
  };

  const handleQuickProviderChange = async (e) => {
    const val = e.target.value;
    const [prov, mod] = val.split(":");
    setSelectedProvider(prov);
    setModelInput(mod);

    setLlmConfig((prev) => ({
      ...prev,
      active_provider: prov,
      active_model: mod,
    }));

    try {
      await api.saveAssistantConfig({
        provider: prov,
        model: mod,
      });
      await loadConfig();
    } catch (err) {
      console.warn("Could not activate provider in backend:", err);
    }
  };

  const handleSaveConfig = async (e) => {
    e?.preventDefault();
    setTestStatus({
      loading: true,
      message: `Activating ${selectedProvider.toUpperCase()} (${modelInput || "default model"})...`,
    });

    try {
      const res = await api.saveAssistantConfig({
        provider: selectedProvider,
        api_key: apiKeyInput.trim() || undefined,
        model: modelInput.trim() || undefined,
      });

      setTestStatus({
        loading: false,
        success: true,
        message: res.message || `Switched to ${selectedProvider.toUpperCase()} successfully!`,
      });
      setApiKeyInput("");
      await loadConfig();
      setTimeout(() => {
        setSettingsOpen(false);
        setTestStatus(null);
      }, 1200);
    } catch (err) {
      const errMsg = err.response?.data?.detail || err.message || "Validation failed";
      setTestStatus({
        loading: false,
        success: false,
        message: errMsg,
      });
    }
  };

  // Provider badge helper
  const renderProviderBadge = (source, model) => {
    if (source === "groq") {
      return <span className="provider-pill groq">⚡ Groq · {model || "llama-3.3-70b"}</span>;
    }
    if (source === "gemini") {
      return <span className="provider-pill gemini">✨ Gemini · {model || "1.5-flash"}</span>;
    }
    if (source === "openai") {
      return <span className="provider-pill openai">🤖 OpenAI · {model || "gpt-4o-mini"}</span>;
    }
    return <span className="provider-pill local">🛡️ SmartGov Engine</span>;
  };

  return (
    <div className="copilot-layout">
      {/* Chat panel */}
      <section className="copilot-chat-panel">
        <div className="copilot-chat-header">
          <div className="copilot-title-row">
            <div className="copilot-logo">
              <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
                <path d="M10 2L3 7v6l7 5 7-5V7l-7-5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            </div>
            <div>
              <div className="copilot-header-topline">
                <h3>SmartGov Copilot</h3>
                <div className="copilot-quick-model-select-wrapper">
                  <select
                    className={`copilot-quick-model-select ${selectedProvider}`}
                    value={`${selectedProvider}:${modelInput || (selectedProvider === "groq" ? "openai/gpt-oss-120b" : selectedProvider === "gemini" ? "gemini-1.5-flash" : "gpt-4o-mini")}`}
                    onChange={handleQuickProviderChange}
                    title="Switch active LLM model on the fly"
                  >
                    <optgroup label="⚡ Groq Cloud">
                      <option value="groq:openai/gpt-oss-120b">⚡ Groq · GPT-OSS 120B (Ultra-Fast)</option>
                      <option value="groq:llama-3.3-70b-versatile">⚡ Groq · Llama 3.3 70B</option>
                      <option value="groq:llama-3.1-8b-instant">⚡ Groq · Llama 3.1 8B</option>
                    </optgroup>
                    <optgroup label="✨ Google Gemini">
                      <option value="gemini:gemini-3.6-flash">✨ Gemini · 3.6 Flash (Recommended)</option>
                      <option value="gemini:gemini-2.5-flash-lite">✨ Gemini · 2.5 Flash Lite</option>
                      <option value="gemini:gemini-2.5-pro">✨ Gemini · 2.5 Pro</option>
                      <option value="gemini:gemini-flash-latest">✨ Gemini · Flash Latest</option>
                    </optgroup>
                    <optgroup label="🤖 OpenAI">
                      <option value="openai:gpt-4o-mini">🤖 OpenAI · GPT-4o Mini</option>
                      <option value="openai:gpt-4o">🤖 OpenAI · GPT-4o</option>
                    </optgroup>
                  </select>
                </div>
              </div>
              <span className="copilot-subtitle">AI-powered civic operations director & telemetry analyzer</span>
            </div>
          </div>

          <div className="copilot-header-actions">
            <button
              type="button"
              className="copilot-settings-btn"
              onClick={() => {
                setSettingsOpen(true);
                setTestStatus(null);
              }}
              title="Configure Groq, Gemini, or OpenAI API key"
            >
              <svg width="15" height="15" viewBox="0 0 20 20" fill="none">
                <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" stroke="currentColor" strokeWidth="1.6" />
                <path d="M16.2 12.2l1.3 1a1 1 0 01.3 1.3l-1.5 2.6a1 1 0 01-1.3.4l-1.5-.6a6.3 6.3 0 01-1.3.8l-.2 1.6a1 1 0 01-1 .9h-3a1 1 0 01-1-.9l-.2-1.6a6.3 6.3 0 01-1.3-.8l-1.5.6a1 1 0 01-1.3-.4L2.2 14.5a1 1 0 01.3-1.3l1.3-1a6.3 6.3 0 010-1.6l-1.3-1a1 1 0 01-.3-1.3L3.7 5.7a1 1 0 011.3-.4l1.5.6c.4-.3.9-.6 1.3-.8l.2-1.6a1 1 0 011-.9h3a1 1 0 011 .9l.2 1.6c.4.2.9.5 1.3.8l1.5-.6a1 1 0 011.3.4l1.5 2.6a1 1 0 01-.3 1.3l-1.3 1c.1.5.1 1.1 0 1.6z" stroke="currentColor" strokeWidth="1.5" />
              </svg>
              LLM API Settings
            </button>
            <span className="copilot-ready-badge">
              <span className="status-pulse" /> Live
            </span>
          </div>
        </div>

        {/* Messages thread */}
        <div className="copilot-thread" ref={threadRef}>
          {messages.map((message, index) => (
            <div key={`${message.role}-${index}`} className={`copilot-msg ${message.role}`}>
              <div className="copilot-msg-avatar">
                {message.role === "assistant" ? (
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                    <path d="M10 2L3 7v6l7 5 7-5V7l-7-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                    <circle cx="10" cy="10" r="2" fill="currentColor" />
                  </svg>
                ) : (
                  "YOU"
                )}
              </div>
              <div className="copilot-msg-content">
                <div className="copilot-msg-top">
                  <span className="copilot-msg-role">
                    {message.role === "assistant" ? "SmartGov Copilot" : "Operations Officer"}
                  </span>
                  {message.role === "assistant" && message.source && (
                    <span className="copilot-source-tag">
                      {renderProviderBadge(message.source, message.model)}
                    </span>
                  )}
                </div>
                <div className="copilot-msg-text">
                  {message.role === "assistant" ? formatAssistantMessage(message.text) : message.text}
                </div>
              </div>
            </div>
          ))}
          {isBusy && (
            <div className="copilot-msg assistant">
              <div className="copilot-msg-avatar">
                <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
                  <path d="M10 2L3 7v6l7 5 7-5V7l-7-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  <circle cx="10" cy="10" r="2" fill="currentColor" />
                </svg>
              </div>
              <div className="copilot-msg-content">
                <span className="copilot-msg-role">SmartGov Copilot</span>
                <div className="copilot-msg-text copilot-typing">
                  <span className="typing-dots"><span /><span /><span /></span>
                  Querying live municipal data & synthesizing response…
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick action chips */}
        <div className="copilot-suggestions">
          {quickActions.map((action) => (
            <button key={action} type="button" className="copilot-chip" onClick={() => setInput(action)}>
              {action}
            </button>
          ))}
        </div>

        {/* Input bar */}
        <div className="copilot-input-bar">
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleSend();
            }}
            placeholder="Ask about complaints, department workloads, emergency priorities, or specific complaint IDs..."
          />
          <button
            type="button"
            className="copilot-send-btn"
            onClick={handleSend}
            disabled={isBusy || !input.trim()}
            title="Send query"
          >
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
              <path d="M3 10h14M12 5l5 5-5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </section>

      {/* Insights sidebar */}
      <aside className="copilot-insights">
        <div className="copilot-insights-header">
          <h3>Operations Intelligence</h3>
          <span className="copilot-subtitle">Live telemetry snapshot</span>
        </div>

        <div className="copilot-metrics">
          {insightCards.map((card) => (
            <div key={card.label} className="copilot-metric-card">
              <span className="copilot-metric-label">{card.label}</span>
              <strong className="copilot-metric-value" style={{ color: card.color }}>{card.value}</strong>
            </div>
          ))}
        </div>

        <div className="copilot-recommendation">
          <div className="copilot-rec-label">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 1l2 5h5l-4 3.5 1.5 5L8 11.5 3.5 14.5 5 9.5 1 6h5l2-5z" fill="currentColor" />
            </svg>
            Active Field Directive
          </div>
          <p>
            Deploy priority crews to open critical sanitation and electrical hazards. Coordinate with
            zonal teams to resolve high-frequency clusters before citizen peak escalation hours.
          </p>
        </div>

        <div className="copilot-llm-info-box">
          <div className="llm-info-title">
            <span>LLM Intelligence Engine</span>
          </div>
          <p className="llm-info-desc">
            Equipped with <strong>Groq (Llama 3.3 70B)</strong> and <strong>Google Gemini (1.5 Flash)</strong> integration for real-time natural language municipal reasoning.
          </p>
          <button
            type="button"
            className="llm-manage-link-btn"
            onClick={() => {
              setSettingsOpen(true);
              setTestStatus(null);
            }}
          >
            ⚙️ Configure API Keys & Models →
          </button>
        </div>
      </aside>

      {/* LLM Settings Modal */}
      {settingsOpen && (
        <div className="profile-modal-backdrop" onClick={() => setSettingsOpen(false)}>
          <div className="llm-settings-modal" onClick={(e) => e.stopPropagation()}>
            <div className="profile-header">
              <div>
                <h3>Configure AI Model & API Key</h3>
                <span className="copilot-subtitle">Choose your preferred LLM provider for Copilot intelligence</span>
              </div>
              <button type="button" className="icon-close" onClick={() => setSettingsOpen(false)}>×</button>
            </div>

            {/* Provider selection tabs */}
            <div className="provider-tabs">
              <button
                type="button"
                className={`provider-tab ${selectedProvider === "groq" ? "active" : ""}`}
                onClick={() => {
                  setSelectedProvider("groq");
                  setModelInput(llmConfig?.groq_model || "llama-3.3-70b-versatile");
                  setTestStatus(null);
                }}
              >
                <div className="tab-badge-row">
                  <strong>⚡ Groq Cloud</strong>
                  <span className="pill-free">Recommended · Free</span>
                </div>
                <small>Ultra-fast Llama 3.3 70B & 3.1 8B</small>
              </button>

              <button
                type="button"
                className={`provider-tab ${selectedProvider === "gemini" ? "active" : ""}`}
                onClick={() => {
                  setSelectedProvider("gemini");
                  setModelInput(llmConfig?.gemini_model || "gemini-3.6-flash");
                  setTestStatus(null);
                }}
              >
                <div className="tab-badge-row">
                  <strong>✨ Google Gemini</strong>
                  <span className="pill-free">Google AI · Free</span>
                </div>
                <small>Gemini 3.6 Flash & 2.5 Pro</small>
              </button>

              <button
                type="button"
                className={`provider-tab ${selectedProvider === "openai" ? "active" : ""}`}
                onClick={() => {
                  setSelectedProvider("openai");
                  setModelInput(llmConfig?.openai_model || "gpt-4o-mini");
                  setTestStatus(null);
                }}
              >
                <div className="tab-badge-row">
                  <strong>🤖 OpenAI</strong>
                </div>
                <small>GPT-4o & GPT-4o-mini</small>
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveConfig} className="llm-config-form">
              <label className="field">
                <span>
                  {selectedProvider.toUpperCase()} API Key:
                  {selectedProvider === "groq" && (
                    <a
                      href="https://console.groq.com/keys"
                      target="_blank"
                      rel="noreferrer"
                      className="api-help-link"
                    >
                      Get free Groq key ↗
                    </a>
                  )}
                  {selectedProvider === "gemini" && (
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noreferrer"
                      className="api-help-link"
                    >
                      Get free Gemini key ↗
                    </a>
                  )}
                </span>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder={
                    selectedProvider === "groq"
                      ? (llmConfig?.groq_key_masked ? `Current: ${llmConfig.groq_key_masked} (Paste new to change)` : "gsk_...")
                      : selectedProvider === "gemini"
                      ? (llmConfig?.gemini_key_masked ? `Current: ${llmConfig.gemini_key_masked} (Paste new to change)` : "AIzaSy...")
                      : (llmConfig?.openai_key_masked ? `Current: ${llmConfig.openai_key_masked} (Paste new to change)` : "sk-...")
                  }
                />
              </label>

              <label className="field">
                <span>Model Name:</span>
                <select
                  value={modelInput || (selectedProvider === "groq" ? "openai/gpt-oss-120b" : selectedProvider === "gemini" ? "gemini-3.6-flash" : "gpt-4o-mini")}
                  onChange={(e) => setModelInput(e.target.value)}
                  className="model-select"
                >
                  {selectedProvider === "groq" && (
                    <>
                      <option value="openai/gpt-oss-120b">openai/gpt-oss-120b (Flagship 120B, Ultra-Fast & Detailed)</option>
                      <option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (Llama 3.3 70B Versatile)</option>
                      <option value="llama-3.1-8b-instant">llama-3.1-8b-instant (Lightweight & Instant)</option>
                    </>
                  )}
                  {selectedProvider === "gemini" && (
                    <>
                      <option value="gemini-3.6-flash">gemini-3.6-flash (Recommended, Google AI High Speed)</option>
                      <option value="gemini-2.5-flash-lite">gemini-2.5-flash-lite (Lightweight & Instant)</option>
                      <option value="gemini-2.5-pro">gemini-2.5-pro (In-depth Multimodal Reasoning)</option>
                      <option value="gemini-flash-latest">gemini-flash-latest (Auto Latest Flash)</option>
                    </>
                  )}
                  {selectedProvider === "openai" && (
                    <>
                      <option value="gpt-4o-mini">gpt-4o-mini (Fast & Cost Efficient)</option>
                      <option value="gpt-4o">gpt-4o (Flagship Omni)</option>
                    </>
                  )}
                </select>
              </label>

              {testStatus && (
                <div className={`llm-status-banner ${testStatus.loading ? "loading" : testStatus.success ? "success" : "error"}`}>
                  {testStatus.loading && <span className="status-pulse" />}
                  {testStatus.success && "✓ "}
                  {!testStatus.loading && !testStatus.success && "⚠️ "}
                  {testStatus.message}
                </div>
              )}

              <div className="profile-actions">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={() => setSettingsOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={testStatus?.loading}
                >
                  {testStatus?.loading ? "Activating…" : "Activate Model & Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
