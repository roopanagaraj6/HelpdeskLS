import { useState, useEffect, useRef } from "react";

// ─── SHARED PIE PALETTE ────────────────────────────────────────────────────────
const PIE_COLORS = [
  "#3b82f6", "#f97316", "#22c55e", "#ef4444", "#a855f7",
  "#14b8a6", "#eab308", "#ec4899", "#6366f1", "#84cc16",
  "#0ea5e9", "#f43f5e",
];
const pieCo = (i, override) => override || PIE_COLORS[i % PIE_COLORS.length];

const CHART_TYPES = [
  { id: "bar", icon: "▐▌", label: "Vert. Bar" },
  { id: "hbar", icon: "▬", label: "Horiz. Bar" },
  { id: "line", icon: "╱", label: "Line" },
  { id: "pie", icon: "◔", label: "Pie" },
  { id: "treemap", icon: "▦", label: "Treemap" },
];

// ─── SIMPLE BAR CHART (dashboard mini-chart) ──────────────────────────────────
export const BarChart = ({ data, color = "#3b82f6" }) => {
  const [hov, setHov] = useState(null);
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 90, padding: "0 2px", position: "relative" }}>
      {hov !== null && (
        <div style={{ position: "absolute", top: -34, left: "50%", transform: "translateX(-50%)", background: "#0f172a", color: "#fff", borderRadius: 7, padding: "5px 10px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", zIndex: 10, pointerEvents: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.2)" }}>
          {data[hov]?.label}: <span style={{ color: "#93c5fd" }}>{data[hov]?.value}</span>
        </div>
      )}
      {data.map((d, i) => {
        const h = Math.max((d.value / max) * 72, 2);
        const isHov = hov === i;
        return (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, cursor: "pointer" }} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}>
            <div style={{ width: "100%", position: "relative", display: "flex", flexDirection: "column", justifyContent: "flex-end", height: 72 }}>
              <div style={{ width: "100%", height: h, background: isHov ? `${color}cc` : color, borderRadius: "4px 4px 0 0", transition: "all 0.15s ease", boxShadow: isHov ? `0 -4px 12px ${color}66` : "none" }} />
            </div>
            <span style={{ fontSize: 9, color: isHov ? "#374151" : "#94a3b8", fontWeight: isHov ? 700 : 400, whiteSpace: "nowrap" }}>{d.label}</span>
          </div>
        );
      })}
    </div>
  );
};

// ─── HORIZONTAL BAR CHART ─────────────────────────────────────────────────────
export const HorizontalBarChart = ({ data, maxItems }) => {
  const [hov, setHov] = useState(null);
  const visible = maxItems ? data.slice(0, maxItems) : data;
  const max = Math.max(...visible.map(d => d.value), 1);
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 7, padding: "4px 2px" }}>
      <div style={{ fontSize: 18, fontWeight: 900, color: "#1e293b", lineHeight: 1.2, marginBottom: 4 }}>{total} <span style={{ fontSize: 10, fontWeight: 500, color: "#94a3b8" }}>total</span></div>
      {visible.map((d, i) => {
        const isHov = hov === i;
        const pct = Math.max((d.value / max) * 100, d.value > 0 ? 2 : 0);
        const color = d.color || PIE_COLORS[i % 12];
        return (
          <div key={i} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)} style={{ cursor: "pointer" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
              <span style={{ fontSize: 11, fontWeight: isHov ? 700 : 500, color: isHov ? "#1e293b" : "#374151", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "70%" }}>{d.label}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color }}>{d.value}</span>
            </div>
            <div style={{ height: 8, background: "#f1f5f9", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 99, transition: "width 0.4s ease", boxShadow: isHov ? `0 0 6px ${color}88` : "none" }} />
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── PIE / DONUT CHART ────────────────────────────────────────────────────────
export const PieChart = ({ data, donut = false }) => {
  const [hov, setHov] = useState(null);
  const VB = 140, cx = 70, cy = 70, r = 60;
  const total = data.reduce((s, d) => s + d.value, 0);

  let off = 0;
  const segs = data.map((d, i) => {
    const p = total ? d.value / total : 0;
    const a = p * Math.PI * 2;
    const seg = { ...d, color: d.color || pieCo(i), start: off, end: off + a, pct: Math.round(p * 100) };
    off += a;
    return seg;
  });
  const arcPath = (s) => {
    if (s.end - s.start >= Math.PI * 2 - 0.001)
      return `M ${cx} ${cy} m -${r} 0 a ${r} ${r} 0 1 1 ${r * 2} 0 a ${r} ${r} 0 1 1 -${r * 2} 0`;
    const large = s.end - s.start > Math.PI ? 1 : 0;
    const x1 = cx + r * Math.sin(s.start), y1 = cy - r * Math.cos(s.start);
    const x2 = cx + r * Math.sin(s.end), y2 = cy - r * Math.cos(s.end);
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
  };
  const sliceLabelPos = (s) => {
    const mid = s.start + (s.end - s.start) / 2;
    return { lx: cx + r * 0.58 * Math.sin(mid), ly: cy - r * 0.58 * Math.cos(mid) };
  };

  const circ = 2 * Math.PI * r;
  let dOff = 0;
  const dSegs = donut ? data.map((d, i) => {
    const p = total ? d.value / total : 0;
    const dash = p * circ;
    const sA = dOff * Math.PI * 2, eA = (dOff + p) * Math.PI * 2;
    const seg = { ...d, color: d.color || pieCo(i), dash, gap: circ - dash, offset: dOff * circ, pct: Math.round(p * 100), startAngle: sA, endAngle: eA };
    dOff += p;
    return seg;
  }) : [];
  const ringLabelPos = (s) => {
    const mid = s.startAngle + (s.endAngle - s.startAngle) / 2;
    return { lx: cx + r * 0.58 * Math.sin(mid), ly: cy - r * 0.58 * Math.cos(mid) };
  };

  const displaySegs = donut ? dSegs : segs;

  return (
    <div style={{ display: "flex", alignItems: "center", width: "100%", minHeight: VB + 16 }}>
      <div style={{ flex: "0 0 50%", display: "flex", alignItems: "center", justifyContent: "center", padding: 8 }}>
        <svg width={VB} height={VB} viewBox={`0 0 ${VB} ${VB}`} style={{ display: "block", overflow: "visible", pointerEvents: "none" }}>
          {donut ? (
            <>
              <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={18} />
              {dSegs.map((s, i) => {
                const isH = hov === i;
                const { lx, ly } = ringLabelPos(s);
                return (
                  <g key={i}>
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={isH ? 22 : 18} strokeDasharray={`${s.dash} ${s.gap}`} strokeDashoffset={-s.offset + circ / 4} style={{ cursor: "pointer", transition: "stroke-width 0.15s", filter: isH ? `drop-shadow(0 0 8px ${s.color}bb)` : "none" }} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)} />
                    {isH && s.dash > 12 && <g><rect x={lx - 18} y={ly - 11} width={36} height={18} rx={4} fill="#0f172a" opacity={0.92} /><text x={lx} y={ly + 5} textAnchor="middle" fontSize={11} fontWeight={700} fill="#fff" fontFamily="DM Sans,sans-serif">{s.value}</text></g>}
                  </g>
                );
              })}
              <text x={cx} y={cy - 8} textAnchor="middle" fontSize={20} fontWeight={700} fill="#1e293b" fontFamily="DM Sans,sans-serif">{total}</text>
              <text x={cx} y={cy + 13} textAnchor="middle" fontSize={10} fill="#94a3b8" fontFamily="DM Sans,sans-serif">total</text>
            </>
          ) : (
            <>
              {segs.map((s, i) => {
                const isH = hov === i;
                const { lx, ly } = sliceLabelPos(s);
                return (
                  <g key={i} style={{ cursor: "pointer" }} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}>
                    <path d={arcPath(s)} fill={s.color} stroke="#fff" strokeWidth={isH ? 3 : 1.5} style={{ filter: isH ? `drop-shadow(0 3px 10px ${s.color}99)` : "none", opacity: isH ? 1 : 0.88, transition: "all 0.15s" }} />
                    {isH && (s.end - s.start) > 0.18 && <g><rect x={lx - 18} y={ly - 11} width={36} height={18} rx={4} fill="#0f172a" opacity={0.92} /><text x={lx} y={ly + 5} textAnchor="middle" fontSize={11} fontWeight={700} fill="#fff" fontFamily="DM Sans,sans-serif">{s.value}</text></g>}
                  </g>
                );
              })}
              <text x={cx} y={cy - 8} textAnchor="middle" fontSize={16} fontWeight={700} fill="#1e293b" fontFamily="DM Sans,sans-serif">{total}</text>
              <text x={cx} y={cy + 12} textAnchor="middle" fontSize={10} fill="#94a3b8" fontFamily="DM Sans,sans-serif">total</text>
            </>
          )}
        </svg>
      </div>
      <div style={{ flex: "0 0 50%", display: "flex", flexDirection: "column", justifyContent: "center", gap: 7, padding: "8px 12px 8px 4px" }}>
        {displaySegs.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", padding: "4px 8px", borderRadius: 6, background: hov === i ? `${s.color}18` : "transparent", transition: "background 0.15s" }} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}>
            <div style={{ width: 11, height: 11, borderRadius: 3, background: s.color, flexShrink: 0, transform: hov === i ? "scale(1.35)" : "scale(1)", transition: "transform 0.15s" }} />
            <span style={{ fontSize: 11.5, color: "#374151", flex: 1, fontWeight: hov === i ? 700 : 400, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.label}</span>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: hov === i ? s.color : "#64748b", minWidth: 24, textAlign: "right", flexShrink: 0 }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export const DonutChart = ({ data }) => <PieChart data={data} donut={true} />;

// ─── SMART CHART (switchable bar/line/pie/treemap) ────────────────────────────
export const SmartChart = ({ title, data, defaultType = "bar", defaultColor = "#3b82f6", size = "normal", hideTotal }) => {
  const [type, setType] = useState(defaultType);
  const [showPicker, setShowPicker] = useState(false);
  const [hov, setHov] = useState(null);
  const pickerRef = useRef(null);

  useEffect(() => {
    if (!showPicker) return;
    const handler = (e) => { if (pickerRef.current && !pickerRef.current.contains(e.target)) setShowPicker(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPicker]);

  const baseW = 280, baseH = 158;
  const W = size === "small" ? 240 : baseW;
  const H = size === "small" ? 120 : baseH;
  const PL = 28, PR = 8, PT = 10, PB = 22;
  const IW = W - PL - PR, IH = H - PT - PB;
  const max = Math.max(...data.map(d => d.value), 1);
  const col = (i, base) => data[i]?.color || (base && base !== "#3b82f6" ? base : PIE_COLORS[i % PIE_COLORS.length]);
  const toX = i => PL + i * (IW / (data.length - 1 || 1));
  const toXb = i => PL + i * (IW / data.length) + (IW / data.length) * 0.1;
  const bw = IW / data.length * 0.8;
  const toY = v => PT + IH - (v / max) * IH;

  const total = data.reduce((s, d) => s + d.value, 0);

  if (type === "pie") {
    const pieData = data.map((d, i) => ({ ...d, color: d.color || pieCo(i, defaultColor === "#3b82f6" ? null : defaultColor) }));
    return (
      <div style={{ background: "#faf8f4", borderRadius: 12, padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
        <ChartHeader title={title} type={type} setType={setType} setHov={setHov} showPicker={showPicker} setShowPicker={setShowPicker} pickerRef={pickerRef} total={hideTotal ? undefined : total} />
        <div style={{ paddingTop: 8 }}><PieChart data={pieData} /></div>
      </div>
    );
  }

  const renderChart = () => {
    if (type === "bar" || type === "histogram") return (
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>
        {[0, 0.5, 1].map(p => <line key={p} x1={PL} y1={PT + IH * (1 - p)} x2={W - PR} y2={PT + IH * (1 - p)} stroke="#f1f5f9" strokeWidth={1} />)}
        {data.map((d, i) => { const bh = Math.max((d.value / max) * IH, 2); const isH = hov === i; return (<g key={i} style={{ cursor: "pointer" }} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}><rect x={toXb(i)} y={PT + IH - bh} width={bw} height={bh} rx={3} fill={col(i, defaultColor)} opacity={isH ? 1 : 0.85} style={{ filter: isH ? `drop-shadow(0 -3px 6px ${col(i, defaultColor)}88)` : "none", transition: "all 0.15s" }} />{d.value > 0 && <text x={toXb(i) + bw / 2} y={PT + IH - bh + (bh > 14 ? 11 : -3)} textAnchor="middle" fontSize={7} fontWeight={700} fill={bh > 14 ? "#fff" : col(i, defaultColor)}>{d.value}</text>}<text x={toXb(i) + bw / 2} y={H - 4} textAnchor="middle" fontSize={7} fill={isH ? "#374151" : "#94a3b8"} fontWeight={isH ? 700 : 400}>{d.label?.slice(0, 6)}</text></g>); })}
      </svg>
    );
    if (type === "line" || type === "area") {
      const pts = data.map((d, i) => `${toX(i)},${toY(d.value)}`).join(" ");
      const areaClose = `${toX(data.length - 1)},${PT + IH} ${PL},${PT + IH}`;
      return (<svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>{[0, 0.5, 1].map(p => <line key={p} x1={PL} y1={PT + IH * (1 - p)} x2={W - PR} y2={PT + IH * (1 - p)} stroke="#f1f5f9" strokeWidth={1} />)}{type === "area" && <polygon points={`${PL},${PT + IH} ${pts} ${areaClose}`} fill={defaultColor} opacity={0.15} />}<polyline points={pts} fill="none" stroke={defaultColor} strokeWidth={2} strokeLinejoin="round" />{data.map((d, i) => { const isH = hov === i; return (<g key={i} style={{ cursor: "pointer" }} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}><circle cx={toX(i)} cy={toY(d.value)} r={isH ? 5 : 3} fill={defaultColor} stroke="#fff" strokeWidth={1.5} style={{ filter: isH ? `drop-shadow(0 0 4px ${defaultColor})` : "none", transition: "r 0.1s" }} />{d.value > 0 && <text x={toX(i)} y={toY(d.value) - 5} textAnchor="middle" fontSize={7} fontWeight={700} fill={defaultColor}>{d.value}</text>}<text x={toX(i)} y={H - 4} textAnchor="middle" fontSize={7} fill={isH ? "#374151" : "#94a3b8"}>{d.label?.slice(0, 5)}</text></g>); })}</svg>);
    }
    if (type === "hbar") {
      const barH = Math.max(8, IH / data.length - 4);
      return (<svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>{data.map((d, i) => { const isH = hov === i; const bwh = Math.max((d.value / max) * IW, d.value > 0 ? 2 : 0); const y = PT + i * (IH / data.length) + 2; return (<g key={i} style={{ cursor: "pointer" }} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}><rect x={PL} y={y} width={IW} height={barH} rx={3} fill="#f1f5f9" /><rect x={PL} y={y} width={bwh} height={barH} rx={3} fill={col(i, defaultColor)} opacity={isH ? 1 : 0.85} style={{ filter: isH ? `drop-shadow(0 0 5px ${col(i, defaultColor)}88)` : "none", transition: "width 0.3s ease" }} /><text x={PL - 3} y={y + barH / 2 + 3} textAnchor="end" fontSize={7} fill={isH ? "#374151" : "#94a3b8"} fontWeight={isH ? 700 : 400}>{d.label?.slice(0, 8)}</text><text x={PL + bwh + 3} y={y + barH / 2 + 3} fontSize={7} fill={col(i, defaultColor)} fontWeight={700}>{d.value}</text></g>); })}</svg>);
    }
    if (type === "treemap") {
      const sorted = [...data].sort((a, b) => b.value - a.value); let cells = [];
      const layout = (items, x, y, w, h) => { if (!items.length) return; const s = items.reduce((a, b) => a + b.value, 0); items.forEach((d) => { const frac = d.value / s; const cw = Math.max(w * frac, 4); cells.push({ ...d, x, y, w: cw, h, i: cells.length }); x += cw; }); };
      layout(sorted.slice(0, Math.ceil(sorted.length / 2)), PL, PT, IW, IH * 0.55);
      layout(sorted.slice(Math.ceil(sorted.length / 2)), PL, PT + IH * 0.57, IW, IH * 0.43);
      return (<svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible" }}>{cells.map((c, i) => { const isH = hov === i; return (<g key={i} style={{ cursor: "pointer" }} onMouseEnter={() => setHov(i)} onMouseLeave={() => setHov(null)}><rect x={c.x + 1} y={c.y + 1} width={c.w - 2} height={c.h - 2} fill={col(c.i, defaultColor)} rx={3} style={{ filter: isH ? `drop-shadow(0 0 5px ${col(c.i, defaultColor)}99)` : "none", opacity: isH ? 1 : 0.8 }} />{c.w > 22 && c.h > 12 && <text x={c.x + c.w / 2} y={c.y + c.h / 2} textAnchor="middle" fontSize={Math.min(8, c.w / 5)} fill="#fff" fontWeight={600}>{c.label?.slice(0, 6)}</text>}{c.w > 22 && c.h > 18 && <text x={c.x + c.w / 2} y={c.y + c.h / 2 + 9} textAnchor="middle" fontSize={Math.min(8, c.w / 5)} fill="#ffffffcc" fontWeight={700}>{c.value}</text>}</g>); })}</svg>);
    }
    return null;
  };

  return (
    <div style={{ background: "#faf8f4", borderRadius: 12, padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
      <ChartHeader title={title} type={type} setType={setType} setHov={setHov} showPicker={showPicker} setShowPicker={setShowPicker} pickerRef={pickerRef} total={hideTotal ? undefined : total} />
      <div style={{ position: "relative", paddingTop: 8 }}>
        {hov !== null && type !== "pie" && (() => {
          const isBar = type === "bar" || type === "histogram";
          const isLine = type === "line" || type === "area";
          const isScatter = type === "scatter";
          let leftPct = isBar ? ((toXb(hov) + bw / 2) / W) * 100 : isLine ? (toX(hov) / W) * 100 : isScatter ? ((PL + 10 + (hov / (data.length - 1 || 1)) * IW * 0.85) / W) * 100 : 50;
          return <div style={{ position: "absolute", top: -2, left: `${leftPct}%`, transform: "translateX(-50%)", background: "#0f172a", color: "#fff", borderRadius: 7, padding: "4px 10px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", zIndex: 20, pointerEvents: "none" }}>{data[hov]?.label}: <span style={{ color: "#93c5fd" }}>{data[hov]?.value}</span></div>;
        })()}
        {renderChart()}
      </div>
    </div>
  );
};

// ─── INTERNAL: chart type picker header ───────────────────────────────────────
const ChartHeader = ({ title, type, setType, setHov, showPicker, setShowPicker, pickerRef, total }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
    <div>
      <span style={{ fontSize: 12, fontWeight: 700, color: "#374151" }}>{title}</span>
      {total !== undefined && <span style={{ display: "block", fontSize: 18, fontWeight: 900, color: "#1e293b", lineHeight: 1.2 }}>{total} <span style={{ fontSize: 10, fontWeight: 500, color: "#94a3b8" }}>total</span></span>}
    </div>    
    <div ref={pickerRef} style={{ position: "relative", zIndex: 10 }}>
      <button onClick={() => setShowPicker(!showPicker)} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 8px", borderRadius: 6, border: "1px solid #e2e8f0", background: "#f8fafc", cursor: "pointer", fontSize: 11, color: "#374151", fontFamily: "'DM Sans',sans-serif", fontWeight: 500 }}>
        <span>{CHART_TYPES.find(t => t.id === type)?.icon}</span>
        <span>{CHART_TYPES.find(t => t.id === type)?.label}</span>
        <span style={{ fontSize: 9, color: "#94a3b8" }}>▾</span>
      </button>
      {showPicker && (
        <div style={{ position: "absolute", right: 0, top: "calc(100% + 4px)", background: "#fff", border: "1.5px solid #e2e8f0", borderRadius: 10, zIndex: 11, boxShadow: "0 8px 24px rgba(0,0,0,0.14)", minWidth: 140, overflow: "hidden", padding: 4 }}>
          {CHART_TYPES.map(ct => (
            <button key={ct.id} onClick={() => { setType(ct.id); setShowPicker(false); setHov(null); }} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "7px 10px", border: "none", background: type === ct.id ? "#eff6ff" : "#fff", cursor: "pointer", fontSize: 12, textAlign: "left", fontFamily: "'DM Sans',sans-serif", borderRadius: 6, color: type === ct.id ? "#3b82f6" : "#374151", fontWeight: type === ct.id ? 600 : 400 }}>
              <span style={{ fontSize: 13, width: 18, textAlign: "center" }}>{ct.icon}</span>{ct.label}
              {type === ct.id && <span style={{ marginLeft: "auto", color: "#3b82f6", fontWeight: 700 }}>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  </div>
);
