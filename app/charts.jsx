/* ============================================================
   利欧 GEO 监测 — 图表组件 (纯 SVG, 无外部库)
   导出到 window: Sparkline, TrendChart, Donut, Radar,
                  ShareList, StackedShare, SentimentDonut, MiniBar
   ============================================================ */
const { useId: _useId } = React;

const C_BRAND = "var(--accent)";
const C_GRID = "var(--line)";
const C_MUTED = "var(--muted)";

/* ---------- 迷你折线 ---------- */
function Sparkline({ data, color = C_BRAND, w = 96, h = 28, fill = true }) {
  const min = Math.min(...data), max = Math.max(...data);
  const span = max - min || 1;
  const px = i => (i / (data.length - 1)) * w;
  const py = v => h - 3 - ((v - min) / span) * (h - 6);
  const pts = data.map((v, i) => `${px(i).toFixed(1)},${py(v).toFixed(1)}`);
  const gid = _useId();
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} style={{ display: "block", overflow: "visible" }}>
      {fill && <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>}
      {fill && <polygon points={`0,${h} ${pts.join(" ")} ${w},${h}`} fill={`url(#${gid})`} />}
      <polyline points={pts.join(" ")} fill="none" stroke={color} strokeWidth="1.8"
        strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={px(data.length - 1)} cy={py(data[data.length - 1])} r="2.4" fill={color} />
    </svg>
  );
}

/* ---------- 趋势折线 (多序列 + 网格 + 区域) ---------- */
function TrendChart({ series, labels, h = 230, max = 100, yTicks = 5 }) {
  const W = 720, H = h, padL = 34, padR = 14, padT = 14, padB = 26;
  const iw = W - padL - padR, ih = H - padT - padB;
  const n = series[0].data.length;
  const x = i => padL + (i / (n - 1)) * iw;
  const y = v => padT + ih - (v / max) * ih;
  const gid = _useId();
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C_BRAND} stopOpacity="0.16" />
          <stop offset="100%" stopColor={C_BRAND} stopOpacity="0" />
        </linearGradient>
      </defs>
      {Array.from({ length: yTicks + 1 }).map((_, i) => {
        const v = (max / yTicks) * i;
        return (
          <g key={i}>
            <line x1={padL} x2={W - padR} y1={y(v)} y2={y(v)} stroke={C_GRID} strokeWidth="1" />
            <text x={padL - 8} y={y(v) + 3.5} textAnchor="end" fontSize="10" fill={C_MUTED}
              fontFamily="var(--mono)">{Math.round(v)}</text>
          </g>
        );
      })}
      {labels && labels.map((lb, i) => (
        <text key={i} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill={C_MUTED}
          fontFamily="var(--mono)">{lb}</text>
      ))}
      {series.map((s, si) => {
        const pts = s.data.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
        const isBrand = s.brand;
        return (
          <g key={si}>
            {isBrand && <polygon points={`${x(0)},${y(0)} ${pts.join(" ")} ${x(n - 1)},${y(0)}`} fill={`url(#${gid})`} />}
            <polyline points={pts.join(" ")} fill="none" stroke={s.color}
              strokeWidth={isBrand ? 2.6 : 1.8} strokeDasharray={s.dashed ? "5 4" : "none"}
              strokeLinejoin="round" strokeLinecap="round" />
            {isBrand && s.data.map((v, i) => (
              <circle key={i} cx={x(i)} cy={y(v)} r="2.6" fill="var(--surface)" stroke={s.color} strokeWidth="1.8" />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

/* ---------- 环形计量 ---------- */
function Donut({ value, max = 100, size = 132, stroke = 12, color = C_BRAND, label, sub }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const frac = Math.max(0, Math.min(1, value / max));
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={C_GRID} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={`${c * frac} ${c}`}
          style={{ transition: "stroke-dasharray .6s cubic-bezier(.4,0,.2,1)" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
        <span className="num" style={{ fontSize: size * 0.27, fontWeight: 700, color: "var(--ink)" }}>{value}</span>
        {label && <span style={{ fontSize: 11, color: "var(--muted)", marginTop: 5 }}>{label}</span>}
        {sub && <span style={{ fontSize: 10, color: color, marginTop: 3, fontFamily: "var(--mono)" }}>{sub}</span>}
      </div>
    </div>
  );
}

/* ---------- 雷达图 ---------- */
function Radar({ data, keys, size = 280, levels = 4 }) {
  const cx = size / 2, cy = size / 2, R = size / 2 - 34;
  const n = data.length;
  const angle = i => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pt = (i, val) => {
    const rr = (val / 100) * R;
    return [cx + Math.cos(angle(i)) * rr, cy + Math.sin(angle(i)) * rr];
  };
  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ display: "block", maxWidth: size, margin: "0 auto" }}>
      {Array.from({ length: levels }).map((_, l) => {
        const rr = (R / levels) * (l + 1);
        const poly = data.map((_, i) => {
          const a = angle(i);
          return `${cx + Math.cos(a) * rr},${cy + Math.sin(a) * rr}`;
        }).join(" ");
        return <polygon key={l} points={poly} fill="none" stroke={C_GRID} strokeWidth="1" />;
      })}
      {data.map((d, i) => {
        const a = angle(i);
        const ex = cx + Math.cos(a) * R, ey = cy + Math.sin(a) * R;
        const lx = cx + Math.cos(a) * (R + 18), ly = cy + Math.sin(a) * (R + 16);
        return (
          <g key={i}>
            <line x1={cx} y1={cy} x2={ex} y2={ey} stroke={C_GRID} strokeWidth="1" />
            <text x={lx} y={ly + 3} textAnchor="middle" fontSize="10.5" fill="var(--muted)">{d.axis}</text>
          </g>
        );
      })}
      {keys.map((k, ki) => {
        const poly = data.map((d, i) => pt(i, d[k.k]).map(v => v.toFixed(1)).join(",")).join(" ");
        return (
          <g key={ki}>
            <polygon points={poly} fill={k.color} fillOpacity={k.brand ? 0.16 : 0.07}
              stroke={k.color} strokeWidth={k.brand ? 2.2 : 1.5} strokeDasharray={k.brand ? "none" : "5 4"} />
            {k.brand && data.map((d, i) => {
              const [px, py] = pt(i, d[k.k]);
              return <circle key={i} cx={px} cy={py} r="2.8" fill={k.color} />;
            })}
          </g>
        );
      })}
    </svg>
  );
}

/* ---------- 份额列表 (横条) ---------- */
function ShareList({ data, accent = C_BRAND }) {
  const max = Math.max(...data.map(d => d.value));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "78px 1fr 38px", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12.5, color: d.brand ? "var(--ink)" : "var(--muted)", fontWeight: d.brand ? 600 : 400,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.name}</span>
          <div style={{ height: 8, background: "var(--line)", borderRadius: 99, overflow: "hidden" }}>
            <div style={{ width: `${(d.value / max) * 100}%`, height: "100%", borderRadius: 99,
              background: d.brand ? accent : "color-mix(in oklch, var(--muted) 42%, transparent)" }} />
          </div>
          <span className="num" style={{ fontSize: 12, textAlign: "right", color: d.brand ? accent : "var(--muted)",
            fontWeight: d.brand ? 700 : 500 }}>{d.value}%</span>
        </div>
      ))}
    </div>
  );
}

/* ---------- 堆叠份额条 ---------- */
function StackedShare({ data, accent = C_BRAND }) {
  const shades = ["72%", "56%", "42%", "30%", "22%"];
  let ci = 0;
  return (
    <div>
      <div style={{ display: "flex", height: 30, borderRadius: 8, overflow: "hidden", border: "1px solid var(--line)" }}>
        {data.map((d, i) => (
          <div key={i} title={`${d.name} ${d.value}%`}
            style={{ width: `${d.value}%`,
              background: d.brand ? accent : `color-mix(in oklch, var(--muted) ${shades[(ci++) % shades.length]}, transparent)`,
              display: "flex", alignItems: "center", justifyContent: "center" }}>
            {d.value >= 12 && <span style={{ fontSize: 11, fontWeight: 600,
              color: d.brand ? "#fff" : "var(--ink)", fontFamily: "var(--mono)" }}>{d.value}%</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- 情感环 ---------- */
function SentimentDonut({ pos, neu, neg, size = 116, stroke = 13 }) {
  const total = pos + neu + neg || 1;
  const r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const seg = [
    { v: pos, color: "var(--pos)" },
    { v: neu, color: "color-mix(in oklch, var(--muted) 38%, transparent)" },
    { v: neg, color: "var(--neg)" },
  ];
  let acc = 0;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth={stroke} />
        {seg.map((s, i) => {
          const frac = s.v / total;
          const el = (
            <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth={stroke}
              strokeDasharray={`${c * frac} ${c}`} strokeDashoffset={-c * acc} />
          );
          acc += frac;
          return el;
        })}
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", lineHeight: 1 }}>
        <span className="num" style={{ fontSize: 22, fontWeight: 700, color: "var(--pos)" }}>{Math.round((pos / total) * 100)}%</span>
        <span style={{ fontSize: 10, color: "var(--muted)", marginTop: 4 }}>正面</span>
      </div>
    </div>
  );
}

/* ---------- 迷你竖条 ---------- */
function MiniBar({ value, max = 100, color = C_BRAND, w = 100 }) {
  return (
    <div style={{ width: w == null ? "100%" : w, height: 7, background: "var(--line)", borderRadius: 99, overflow: "hidden" }}>
      <div style={{ width: `${(value / max) * 100}%`, height: "100%", background: color, borderRadius: 99 }} />
    </div>
  );
}

Object.assign(window, { Sparkline, TrendChart, Donut, Radar, ShareList, StackedShare, SentimentDonut, MiniBar });
