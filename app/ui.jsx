/* ============================================================
   利欧 GEO 监测 — UI 基元
   导出: Chip, Avatar, RankBadge, SentTag, DeltaPill, KpiCard,
         Card, PlatformTable, PromptTable, Leaderboard, Legend
   ============================================================ */

const G = window.GEO;

/* 平台 chip (首字符) */
function Chip({ id, size = 24, showName = false }) {
  const p = G.PMAP[id];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: size, height: size, borderRadius: size * 0.3, background: p.color, color: "#fff",
        display: "grid", placeItems: "center", fontSize: size * 0.46, fontWeight: 700, flex: "none",
        fontFamily: p.glyph.length === 1 && /[A-Za-z]/.test(p.glyph) ? "var(--mono)" : "var(--sans)" }}>{p.glyph}</span>
      {showName && <span style={{ fontSize: 13, color: "var(--ink)" }}>{p.name}</span>}
    </span>
  );
}

/* 客户头像 */
function Avatar({ client, size = 40 }) {
  return (
    <span style={{ width: size, height: size, borderRadius: size * 0.28, flex: "none",
      background: `oklch(0.95 0.04 ${client.hue})`, color: `oklch(0.45 0.13 ${client.hue})`,
      display: "grid", placeItems: "center", fontSize: size * 0.42, fontWeight: 700 }}>{client.glyph}</span>
  );
}

/* 排名徽章 */
function RankBadge({ measured = true, mentioned, rank }) {
  if (!measured) return <span className="badge badge-na">未监测</span>;
  if (!mentioned) return <span className="badge badge-out">未露出</span>;
  if (rank === 1) return <span className="badge badge-first">首位 · #1</span>;
  if (rank <= 3) return <span className="badge badge-top3">Top3 · #{rank}</span>;
  return <span className="badge badge-low">#{rank}</span>;
}

/* 情感标签 */
function SentTag({ s }) {
  if (!s) return <span style={{ color: "var(--faint)" }}>—</span>;
  const m = { pos: ["正面", "var(--pos)"], neu: ["中性", "var(--muted)"], neg: ["负面", "var(--neg)"] }[s];
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: m[1] }}>
      <span style={{ width: 6, height: 6, borderRadius: 99, background: m[1] }} />{m[0]}
    </span>
  );
}

/* 涨跌 pill */
function DeltaPill({ value, suffix = "", inverse = false }) {
  const up = value > 0, flat = value === 0;
  const good = inverse ? !up : up;
  const color = flat ? "var(--muted)" : good ? "var(--pos)" : "var(--neg)";
  const arrow = flat ? "—" : up ? "▲" : "▼";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 3, fontSize: 11.5, color,
      fontFamily: "var(--mono)", fontWeight: 600 }}>
      <span style={{ fontSize: 8 }}>{arrow}</span>{Math.abs(value)}{suffix}
    </span>
  );
}

/* 容器卡 */
function Card({ title, sub, right, children, pad = 18, className = "", style = {} }) {
  return (
    <section className={"card " + className} style={style}>
      {(title || right) && (
        <header style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between",
          gap: 12, padding: `${pad}px ${pad}px 0` }}>
          <div>
            {title && <h3 style={{ margin: 0, fontSize: 14, fontWeight: 650, color: "var(--ink)", letterSpacing: ".01em" }}>{title}</h3>}
            {sub && <p style={{ margin: "4px 0 0", fontSize: 11.5, color: "var(--muted)" }}>{sub}</p>}
          </div>
          {right}
        </header>
      )}
      <div style={{ padding: pad }}>{children}</div>
    </section>
  );
}

/* KPI 卡 */
function KpiCard({ label, value, unit, delta, deltaSuffix, spark, sparkColor, hint, inverse }) {
  return (
    <div className="kpi">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <span style={{ fontSize: 12, color: "var(--muted)" }}>{label}</span>
        {delta != null && <DeltaPill value={delta} suffix={deltaSuffix} inverse={inverse} />}
      </div>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 10, marginTop: 10 }}>
        <span className="num" style={{ fontSize: 30, fontWeight: 700, color: "var(--ink)", lineHeight: 1 }}>
          {value}<span style={{ fontSize: 15, fontWeight: 600, color: "var(--muted)", marginLeft: 2 }}>{unit}</span>
        </span>
        {spark && <div style={{ marginLeft: "auto", marginBottom: 2 }}><Sparkline data={spark} color={sparkColor || "var(--accent)"} /></div>}
      </div>
      {hint && <div style={{ fontSize: 11, color: "var(--faint)", marginTop: 8 }}>{hint}</div>}
    </div>
  );
}

/* 图例 */
function Legend({ items }) {
  return (
    <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
      {items.map((it, i) => (
        <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--muted)" }}>
          <span style={{ width: 14, height: 0, borderTop: `${it.dashed ? "2px dashed" : "3px solid"} ${it.color}` }} />
          {it.label}
        </span>
      ))}
    </div>
  );
}

/* 各平台表现表 */
function PlatformTable({ client }) {
  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead>
          <tr>
            <th style={{ textAlign: "left" }}>平台</th>
            <th>露出率</th><th>Top3 率</th><th>平均排名</th><th>可见度</th>
          </tr>
        </thead>
        <tbody>
          {client.byPlatform.map(bp => (
            <tr key={bp.id}>
              <td><Chip id={bp.id} showName /></td>
              <td className="num">{G.fmtPct(bp.exposure)}</td>
              <td className="num">{G.fmtPct(bp.top3)}</td>
              <td className="num">{bp.avgRank ?? "—"}</td>
              <td>
                <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                  <MiniBar value={bp.visibility} color={bp.color} w={64} />
                  <span className="num" style={{ width: 26, textAlign: "right", fontWeight: 600 }}>{bp.visibility}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* prompt × 平台 明细表 */
function PromptTable({ client, platformFilter = "all" }) {
  const ids = client.platformIds || G.PLATFORMS.map(p => p.id);
  const plats = (platformFilter === "all" ? ids : ids.filter(id => id === platformFilter)).map(id => G.PMAP[id]);
  if (!client.prompts.length) {
    return <div className="empty-hint">该客户还没有配置 prompt,去后台「编辑客户」添加。</div>;
  }
  return (
    <div className="tbl-wrap">
      <table className="tbl tbl-matrix">
        <thead>
          <tr>
            <th style={{ textAlign: "left", minWidth: 220 }}>Prompt 提问</th>
            {plats.map(p => <th key={p.id}><Chip id={p.id} size={22} /></th>)}
          </tr>
        </thead>
        <tbody>
          {client.prompts.map((prompt, pi) => (
            <tr key={pi}>
              <td style={{ textAlign: "left" }}>
                <span style={{ fontSize: 13, color: "var(--ink)" }}>{prompt}</span>
              </td>
              {plats.map(p => {
                const c = client.cells.find(x => x.prompt === prompt && x.platform === p.id);
                return (
                  <td key={p.id}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                      <RankBadge measured={c && c.measured} mentioned={c && c.mentioned} rank={c && c.rank} />
                      {c && c.measured && c.mentioned && <SentTag s={c.sentiment} />}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* 平台排行榜 */
function Leaderboard({ board, max = 100 }) {
  const p = G.PMAP[board.platform];
  return (
    <div className="lb">
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Chip id={board.platform} size={22} /><span style={{ fontSize: 13, fontWeight: 600 }}>{p.name}</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {board.entries.slice(0, 5).map((e, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "16px 70px 1fr 30px", alignItems: "center", gap: 8 }}>
            <span className="num" style={{ fontSize: 11, color: i === 0 ? p.color : "var(--faint)", fontWeight: 700 }}>{i + 1}</span>
            <span style={{ fontSize: 12, color: e.brand ? "var(--ink)" : "var(--muted)", fontWeight: e.brand ? 700 : 400,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {e.name}{e.brand && <span style={{ color: p.color, marginLeft: 3 }}>●</span>}</span>
            <MiniBar value={e.score} max={max} color={e.brand ? p.color : "color-mix(in oklch, var(--muted) 38%, transparent)"} w={null} />
            <span className="num" style={{ fontSize: 11.5, textAlign: "right", color: "var(--muted)" }}>{e.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

Object.assign(window, { Chip, Avatar, RankBadge, SentTag, DeltaPill, Card, KpiCard, Legend, PlatformTable, PromptTable, Leaderboard });
