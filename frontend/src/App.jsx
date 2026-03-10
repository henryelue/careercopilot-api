import { useState, useEffect } from "react";

const API = import.meta.env.VITE_API_URL;

const TABS = [
  { id: "cover-letter", label: "Cover Letter",  endpoint: "strategic-package" },
  { id: "match-score",  label: "Match Score",   endpoint: "match-score" },
  { id: "analyzer",     label: "Job Analyzer",   endpoint: "job-analysis" },
  { id: "prep",         label: "Interview Prep", endpoint: "interview-prep" },
];

const TONES = ["Professional & High-Impact", "Enthusiastic", "Concise & Direct"];

export default function App() {
  const [activeTab, setActiveTab]   = useState(TABS[0]);
  const [resume, setResume]         = useState("");
  const [jd, setJd]                 = useState("");
  const [tone, setTone]             = useState(TONES[0]);
  const [outputs, setOutputs]       = useState({});
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [copied, setCopied]         = useState(false);

  useEffect(() => {
    document.body.style.cssText = "margin:0;padding:0;background:#0a0a0f;";
  }, []);

  const handleGenerate = async () => {
    setError(null);
    setLoading(true);

    const body =
      activeTab.id === "analyzer"
        ? { job_description: jd }
        : { resume, job_description: jd, tone };

    try {
      const res = await fetch(`${API}/generate/${activeTab.endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Request failed");
      setOutputs((prev) => ({ ...prev, [activeTab.id]: data }));
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const copy = (text) => {
    const fallback = () => {
      try {
        const el = Object.assign(document.createElement("textarea"), {
          value: text,
          style: "position:fixed;opacity:0",
        });
        document.body.appendChild(el);
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
      } catch {}
    };
    try {
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(text).catch(fallback);
      } else fallback();
    } catch { fallback(); }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const atsColor = (n) => n >= 80 ? "#00C07A" : n >= 60 ? "#F5A623" : "#E8394D";
  const circ     = 2 * Math.PI * 36;
  const out      = outputs[activeTab.id];

  // ── Render preview panel content ────────────────────────────────────────────

  const renderPreview = () => {
    if (!out) return <div style={s.awaiting}>AWAITING GENERATION</div>;

    // Cover letter tab
    if (activeTab.id === "cover-letter") {
      return <pre style={s.docText}>{out.letter || "No letter returned."}</pre>;
    }

    // Job analyzer tab
    if (activeTab.id === "analyzer") {
      const d = out;
      if (d.error) return <pre style={s.docText}>{d.raw}</pre>;
      return (
        <div style={s.analysisWrap}>
          <p style={s.roleSummary}>{d.role_summary}</p>
          <Section title="Top Skills" items={d.top_skills} color="#0066FF" />
          <Section title="Culture Fit" items={[d.culture_fit]} color="#00C9FF" />
          <Section title="Salary Leverage" items={d.salary_leverage_points} color="#00C07A" />
        </div>
      );
    }

    // Match score tab
    if (activeTab.id === "match-score") {
      const r = out?.result || out;
      if (!r || r.error) return <pre style={s.docText}>{r?.raw || "No data returned."}</pre>;
      const { match_score = 0, matching_strengths = [], gaps = [], recommendations = [] } = r;
      const color = atsColor(match_score);
      const scoreCirc = 2 * Math.PI * 54;
      return (
        <div style={s.analysisWrap}>
          {/* Big score circle */}
          <div style={{ ...s.circleWrap, marginBottom: 28 }}>
            <svg width="130" height="130" viewBox="0 0 130 130">
              <circle cx="65" cy="65" r="54" fill="none" stroke="#1e1e2e" strokeWidth="10" />
              <circle
                cx="65" cy="65" r="54" fill="none"
                stroke={color} strokeWidth="10" strokeLinecap="round"
                strokeDasharray={scoreCirc}
                strokeDashoffset={scoreCirc - (match_score / 100) * scoreCirc}
                transform="rotate(-90 65 65)"
                style={{ transition: "stroke-dashoffset 1s ease" }}
              />
            </svg>
            <div style={s.circleInner}>
              <span style={{ fontSize: 30, fontWeight: 800, color, lineHeight: 1 }}>{match_score}%</span>
              <span style={{ ...s.circleLabel, marginTop: 4 }}>
                {match_score >= 80 ? "Strong Match" : match_score >= 60 ? "Moderate Match" : "Weak Match"}
              </span>
            </div>
          </div>
          <Section title="Matching Strengths" items={matching_strengths} color="#00C07A" />
          <Section title="Gaps"               items={gaps}               color="#E8394D" />
          <Section title="Recommendations"    items={recommendations}    color="#0066FF" />
        </div>
      );
    }

    // Interview prep tab
    if (activeTab.id === "prep") {
      const qs = Array.isArray(out.questions) ? out.questions : [];
      return (
        <div style={s.analysisWrap}>
          {qs.map((item, i) => (
            <div key={i} style={s.qaBlock}>
              <div style={s.qText}>Q{i + 1}: {item.q}</div>
              <div style={s.aText}>{item.a_strategy}</div>
            </div>
          ))}
          {qs.length === 0 && <pre style={s.docText}>{JSON.stringify(out, null, 2)}</pre>}
        </div>
      );
    }
  };

  // ── Render insights panel ────────────────────────────────────────────────────

  const renderInsights = () => {
    const coverOut = outputs["cover-letter"];
    const insights = coverOut?.insights;

    if (activeTab.id === "match-score" && out) {
      const r = out?.result || out;
      const { match_score = 0, gaps = [], recommendations = [] } = r;
      const color = atsColor(match_score);
      return (
        <div style={s.insightsInner}>
          <Label color={color}>
            {match_score >= 80 ? "Strong Match" : match_score >= 60 ? "Moderate Match" : "Weak Match"}
          </Label>
          <div style={s.divider} />
          <Label color="#E8394D">Top Gaps</Label>
          {gaps.slice(0, 3).map((g, i) => <Dot key={i} color="#E8394D" text={g} />)}
          <div style={s.divider} />
          <Label color="#0066FF">Quick Wins</Label>
          {recommendations.slice(0, 2).map((r_, i) => <Dot key={i} color="#0066FF" text={r_} />)}
        </div>
      );
    }

    if (activeTab.id === "analyzer" && out && !out.error) {
      return (
        <div style={s.insightsInner}>
          <Label>Role Summary</Label>
          <p style={s.insightBody}>{out.role_summary}</p>
          <div style={s.divider} />
          <Label>Leverage Points</Label>
          {(out.salary_leverage_points || []).map((p, i) => (
            <Dot key={i} color="#00C07A" text={p} />
          ))}
        </div>
      );
    }

    if (activeTab.id === "prep" && out) {
      const qs = Array.isArray(out.questions) ? out.questions : [];
      return (
        <div style={s.insightsInner}>
          <Label>{qs.length} Questions Generated</Label>
          <div style={s.divider} />
          {qs.map((item, i) => (
            <p key={i} style={{ ...s.insightBody, marginBottom: 12 }}>
              <span style={{ color: "#0066FF", fontWeight: 700 }}>Q{i + 1}:</span> {item.q}
            </p>
          ))}
        </div>
      );
    }

    // Default: show ATS from cover-letter output
    return (
      <div style={s.insightsInner}>
        {insights ? (
          <>
            {/* ATS Circle */}
            <div style={s.circleWrap}>
              <svg width="90" height="90" viewBox="0 0 90 90">
                <circle cx="45" cy="45" r="36" fill="none" stroke="#1e1e2e" strokeWidth="8" />
                <circle
                  cx="45" cy="45" r="36" fill="none"
                  stroke={atsColor(insights.ats_compatibility_score)}
                  strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={circ}
                  strokeDashoffset={circ - (insights.ats_compatibility_score / 100) * circ}
                  transform="rotate(-90 45 45)"
                  style={{ transition: "stroke-dashoffset 1s ease" }}
                />
              </svg>
              <div style={s.circleInner}>
                <span style={{ ...s.circleNum, color: atsColor(insights.ats_compatibility_score) }}>
                  {insights.ats_compatibility_score}%
                </span>
                <span style={s.circleLabel}>ATS</span>
              </div>
            </div>

            <p style={s.insightBody}>{insights.role_summary}</p>
            <div style={s.divider} />

            <Label color="#00C07A">Required Skills</Label>
            {(insights.required_skills || []).map((sk, i) => <Dot key={i} color="#00C07A" text={sk} />)}
            <div style={s.divider} />

            <Label color="#E8394D">Gaps Found</Label>
            {(insights.gaps_found || []).map((g, i) => <Dot key={i} color="#E8394D" text={g} />)}
            <div style={s.divider} />

            <Label color="#00C9FF">Strategic Advice</Label>
            <p style={s.insightBody}>{insights.strategic_advice}</p>
          </>
        ) : (
          <p style={{ color: "#333", fontSize: 13 }}>
            Run the Cover Letter tab first to see ATS insights here.
          </p>
        )}
      </div>
    );
  };

  return (
    <div style={s.root}>
      <div style={s.gridBg} />

      {/* Header */}
      <header style={s.header}>
        <div style={s.logoRow}>
          <span style={s.logoDot} />
          <span style={s.logoText}>CAREERCOPILOT <span style={s.logoPro}>PRO</span></span>
        </div>
        <nav style={s.nav}>
          {TABS.map((tab) => (
            <button
              key={tab.id}
              style={{ ...s.navBtn, ...(activeTab.id === tab.id ? s.navBtnActive : {}) }}
              onClick={() => { setActiveTab(tab); setError(null); }}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      {/* 3-column layout */}
      <div style={s.layout}>

        {/* Col 1 — Inputs */}
        <aside style={s.colInput}>
          {activeTab.id !== "analyzer" && (
            <Field label="Resume" value={resume} onChange={setResume} rows={10} />
          )}
          <Field label="Job Description" value={jd} onChange={setJd} rows={activeTab.id === "analyzer" ? 16 : 10} />

          {activeTab.id !== "analyzer" && (
            <div style={{ marginBottom: 16 }}>
              <div style={s.label}>Tone</div>
              <div style={s.tonePills}>
                {TONES.map((t) => (
                  <button key={t}
                    style={{ ...s.tonePill, ...(tone === t ? s.tonePillActive : {}) }}
                    onClick={() => setTone(t)}
                  >{t}</button>
                ))}
              </div>
            </div>
          )}

          <button
            style={{ ...s.runBtn, opacity: loading ? 0.6 : 1, cursor: loading ? "not-allowed" : "pointer" }}
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? "PROCESSING..." : `RUN ${activeTab.label.toUpperCase()}`}
          </button>

          {error && <div style={s.errorBox}>{error}</div>}
        </aside>

        {/* Col 2 — Preview */}
        <main style={s.colPreview}>
          <div style={s.docSheet}>
            {renderPreview()}
          </div>
          {out?.letter && (
            <button style={s.copyBtn} onClick={() => copy(out.letter)}>
              {copied ? "Copied!" : "Copy Letter"}
            </button>
          )}
        </main>

        {/* Col 3 — Insights */}
        <aside style={s.colInsights}>
          <div style={s.label}>Strategic Insights</div>
          <div style={s.divider} />
          {renderInsights()}
        </aside>
      </div>

      <footer style={s.footer}>CareerCopilot v0.4 · Powered by OpenRouter</footer>
    </div>
  );
}

// ── Small reusable components ────────────────────────────────────────────────

function Field({ label, value, onChange, rows }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={s.label}>{label}</div>
      <textarea
        style={s.textarea}
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={`Paste ${label.toLowerCase()} here...`}
      />
    </div>
  );
}

function Section({ title, items = [], color }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ ...s.sectionTitle, color }}>{title}</div>
      {items.map((item, i) => <Dot key={i} color={color} text={item} />)}
    </div>
  );
}

function Dot({ color, text }) {
  return (
    <div style={s.dotRow}>
      <span style={{ ...s.dot, background: color }} />
      <span style={s.dotText}>{text}</span>
    </div>
  );
}

function Label({ children, color = "#555" }) {
  return <div style={{ ...s.label, color, marginBottom: 8 }}>{children}</div>;
}

// ── Styles ───────────────────────────────────────────────────────────────────

const s = {
  root: {
    minHeight: "100vh",
    width: "100%",
    background: "#0a0a0f",
    color: "#e8e8f0",
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    boxSizing: "border-box",
    position: "relative",
    display: "flex",
    flexDirection: "column",
  },
  gridBg: {
    position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
    backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.025) 1px,transparent 1px)",
    backgroundSize: "40px 40px",
  },
  header: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "16px 28px", borderBottom: "1px solid #1e1e2e",
    position: "relative", zIndex: 2, background: "#0a0a0f",
  },
  logoRow: { display: "flex", alignItems: "center", gap: 10 },
  logoDot: {
    width: 8, height: 8, borderRadius: "50%",
    background: "#0066FF", boxShadow: "0 0 10px #0066FF",
  },
  logoText: { fontSize: 15, fontWeight: 900, letterSpacing: "1px", color: "#fff" },
  logoPro: { color: "#555", fontWeight: 300, marginLeft: 6 },
  nav: { display: "flex", gap: 4 },
  navBtn: {
    background: "transparent", border: "1px solid transparent",
    borderRadius: 8, padding: "7px 16px", color: "#555",
    fontSize: 12, fontWeight: 700, cursor: "pointer",
    letterSpacing: "0.5px", transition: "all 0.15s ease",
  },
  navBtnActive: {
    background: "#0066FF18", border: "1px solid #0066FF44", color: "#0066FF",
  },
  layout: {
    display: "grid", gridTemplateColumns: "280px 1fr 260px",
    flex: 1, position: "relative", zIndex: 1, overflow: "hidden",
  },
  colInput: {
    borderRight: "1px solid #1e1e2e", padding: "24px 20px",
    overflowY: "auto", background: "#0a0a0f",
  },
  colPreview: {
    padding: "24px", overflowY: "auto", display: "flex",
    flexDirection: "column", gap: 12, background: "#0d0d12",
  },
  colInsights: {
    borderLeft: "1px solid #1e1e2e", padding: "24px 20px",
    overflowY: "auto", background: "#0a0a0f",
  },
  label: {
    fontSize: 10, fontWeight: 700, textTransform: "uppercase",
    letterSpacing: "1px", color: "#444", marginBottom: 6,
  },
  textarea: {
    width: "100%", background: "#13131a", border: "1px solid #1e1e2e",
    borderRadius: 10, padding: "10px 12px", fontSize: 12,
    fontFamily: "inherit", color: "#c8c8d8", resize: "vertical",
    outline: "none", lineHeight: 1.6, boxSizing: "border-box",
  },
  tonePills: { display: "flex", flexWrap: "wrap", gap: 6 },
  tonePill: {
    padding: "5px 12px", borderRadius: 50, border: "1px solid #1e1e2e",
    background: "transparent", color: "#555", fontSize: 11,
    fontWeight: 600, cursor: "pointer",
  },
  tonePillActive: { background: "#0066FF", border: "1px solid #0066FF", color: "#fff" },
  runBtn: {
    width: "100%", padding: "12px", background: "#0066FF",
    border: "none", borderRadius: 10, color: "#fff", fontSize: 12,
    fontWeight: 800, letterSpacing: "1px", cursor: "pointer",
    boxShadow: "0 0 20px #0066FF33", marginBottom: 12,
  },
  errorBox: {
    background: "#1a0a0a", border: "1px solid #E8394D44",
    borderRadius: 8, padding: "10px 12px", color: "#E8394D",
    fontSize: 12, fontWeight: 600,
  },
  docSheet: {
    flex: 1, background: "#13131a", border: "1px solid #1e1e2e",
    borderRadius: 14, padding: "28px 32px", minHeight: 400,
  },
  awaiting: {
    opacity: 0.15, textAlign: "center", marginTop: "20%",
    fontSize: 13, fontWeight: 700, letterSpacing: "2px",
  },
  docText: {
    whiteSpace: "pre-wrap", wordBreak: "break-word",
    fontSize: 14, lineHeight: 1.8, color: "#c8c8d8",
    margin: 0, fontFamily: "Georgia, serif",
  },
  copyBtn: {
    alignSelf: "flex-start", background: "#1e1e2e",
    border: "1px solid #2a2a3a", borderRadius: 8,
    padding: "7px 16px", color: "#888", fontSize: 12,
    fontWeight: 700, cursor: "pointer",
  },
  insightsInner: { marginTop: 12 },
  circleWrap: {
    display: "flex", justifyContent: "center", alignItems: "center",
    position: "relative", marginBottom: 16,
  },
  circleInner: {
    position: "absolute", display: "flex", flexDirection: "column",
    alignItems: "center",
  },
  circleNum: { fontSize: 20, fontWeight: 800, lineHeight: 1 },
  circleLabel: {
    fontSize: 9, fontWeight: 700, textTransform: "uppercase",
    letterSpacing: "0.5px", color: "#444", marginTop: 2,
  },
  insightBody: { fontSize: 12, lineHeight: 1.7, color: "#888", margin: "0 0 12px" },
  divider: { height: 1, background: "#1e1e2e", margin: "14px 0" },
  sectionTitle: {
    fontSize: 10, fontWeight: 800, textTransform: "uppercase",
    letterSpacing: "1px", marginBottom: 8,
  },
  dotRow: { display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 },
  dot: { width: 6, height: 6, borderRadius: "50%", marginTop: 4, flexShrink: 0 },
  dotText: { fontSize: 12, color: "#c8c8d8", lineHeight: 1.5 },
  analysisWrap: { display: "flex", flexDirection: "column", gap: 4 },
  roleSummary: {
    fontSize: 15, lineHeight: 1.7, color: "#c8c8d8",
    margin: "0 0 20px", fontStyle: "italic",
  },
  qaBlock: {
    marginBottom: 20, paddingBottom: 20, borderBottom: "1px solid #1e1e2e",
  },
  qText: { fontSize: 14, fontWeight: 700, color: "#e8e8f0", marginBottom: 8, lineHeight: 1.5 },
  aText: { fontSize: 13, color: "#888", lineHeight: 1.7 },
  footer: {
    textAlign: "center", color: "#222", fontSize: 11,
    padding: "16px", borderTop: "1px solid #1e1e2e",
    position: "relative", zIndex: 2,
  },
};