/* ============================================================
   利欧 GEO 监测 — 单客户详情 (三种布局方案)
   导出: ClientDetail
   ============================================================ */

const GD = window.GEO;

function weekLabels(n) {
  const end = new Date("2026-06-01T00:00:00");
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(end.getTime() - i * 7 * 864e5);
    out.push(`${d.getMonth() + 1}/${d.getDate()}`);
  }
  return out;
}

function trendSeries(client) {
  const avg = client.trend.map(v => Math.round(Math.max(6, v * 0.6 + 10)));
  return [
    { name: "品牌可见度", brand: true, color: "var(--accent)", data: client.trend },
    { name: "品类均值", color: "color-mix(in oklch, var(--muted) 70%, transparent)", dashed: true, data: avg },
  ];
}

/* 关键结论 (自动生成的简短洞察) */
function Takeaways({ client }) {
  const k = client.kpi;
  const best = [...client.byPlatform].sort((a, b) => b.visibility - a.visibility)[0];
  const worst = [...client.byPlatform].sort((a, b) => a.visibility - b.visibility)[0];
  const topComp = client.share.find(s => !s.brand);
  const items = [
    `综合可见度 ${k.visibility} 分,环比 ${k.deltaVis >= 0 ? "+" : ""}${k.deltaVis} 分`,
    `${best.name}表现最佳 (${best.visibility} 分),${worst.name}存在优化空间 (${worst.visibility} 分)`,
    `品牌份额 ${client.share.find(s => s.brand).value}%,主要竞品「${topComp.name}」${topComp.value}%`,
    `${GD.fmtPct(k.top3)} 的提问中进入 Top3,${GD.fmtPct(k.firsts)} 占据首位`,
  ];
  return (
    <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 11 }}>
      {items.map((t, i) => (
        <li key={i} style={{ display: "flex", gap: 10, fontSize: 13, color: "var(--ink)", lineHeight: 1.5 }}>
          <span style={{ width: 5, height: 5, borderRadius: 99, background: "var(--accent)", marginTop: 7, flex: "none" }}></span>
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

function KpiRow({ client, extended }) {
  const k = client.kpi;
  const cards = [
    { label: "综合可见度评分", value: k.visibility, unit: "", delta: k.deltaVis, deltaSuffix: "", spark: client.trend, hint: `${GD.lastUpdated} · 近 8 周` },
    { label: "品牌露出率", value: Math.round(k.exposure * 100), unit: "%", delta: +3, deltaSuffix: "%", hint: `${k.runs} 次提问中被提及` },
    { label: "首位率 (#1)", value: Math.round(k.firsts * 100), unit: "%", delta: +2, deltaSuffix: "%", hint: "答案首个推荐品牌" },
    { label: "Top3 占有率", value: Math.round(k.top3 * 100), unit: "%", delta: -1, deltaSuffix: "%", hint: "进入前三推荐" },
  ];
  if (extended) cards.push(
    { label: "平均推荐排名", value: k.avgRank ? k.avgRank.toFixed(1) : "—", unit: "", delta: -0.3, deltaSuffix: "", inverse: true, hint: "数值越低越好" },
    { label: "被引用次数", value: k.citedCount, unit: "", delta: +4, deltaSuffix: "", hint: "AI 标注来源链接" },
  );
  return (
    <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(158px, 1fr))" }}>
      {cards.map((c, i) => <KpiCard key={i} {...c} />)}
    </div>
  );
}

/* ---------- 布局 A: 经典看板 ---------- */
function LayoutClassic({ client, pf }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <KpiRow client={client} />
      <div className="grid-2-1">
        <Card title="可见度趋势" sub="品牌可见度 vs 品类均值 · 近 8 周"
          right={<Legend items={[{ label: "品牌", color: "var(--accent)" }, { label: "品类均值", color: "var(--muted)", dashed: true }]} />}>
          <TrendChart series={trendSeries(client)} labels={weekLabels(8)} />
        </Card>
        <Card title="声量份额" sub={`品牌 vs 竞品 · ${client.industry}`}>
          <div style={{ marginBottom: 16 }}><StackedShare data={client.share} /></div>
          <ShareList data={client.share} />
        </Card>
      </div>
      <div className="grid-1-1">
        <Card title="各平台表现" sub="6 个 AI 平台的露出与排名">
          <PlatformTable client={client} />
        </Card>
        <Card title="平台可见度雷达" sub="品牌覆盖均衡度"
          right={<Legend items={[{ label: "品牌", color: "var(--accent)" }, { label: "品类均值", color: "var(--muted)", dashed: true }]} />}>
          <Radar data={client.radar} keys={[{ k: "brand", color: "var(--accent)", brand: true }, { k: "avg", color: "var(--muted)" }]} />
        </Card>
      </div>
      <Card title="Prompt 级明细" sub="每个提问在各平台的露出位次与情感" right={<PfBadge pf={pf} />}>
        <PromptTable client={client} platformFilter={pf} />
      </Card>
    </div>
  );
}

/* ---------- 布局 B: 执行摘要 ---------- */
function LayoutExec({ client, pf }) {
  const k = client.kpi;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="grid-exec-top">
        <Card title="综合可见度" sub={`${GD.lastUpdated} 数据`} className="exec-score">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
            <Donut value={k.visibility} size={150} stroke={14} sub={`${k.deltaVis >= 0 ? "▲ +" : "▼ "}${k.deltaVis} 环比`} label="满分 100" />
            <div style={{ display: "flex", gap: 22 }}>
              <MiniStat label="露出率" value={GD.fmtPct(k.exposure)} />
              <MiniStat label="首位率" value={GD.fmtPct(k.firsts)} />
              <MiniStat label="Top3" value={GD.fmtPct(k.top3)} />
            </div>
          </div>
        </Card>
        <Card title="可见度趋势" sub="品牌 vs 品类均值 · 近 8 周"
          right={<Legend items={[{ label: "品牌", color: "var(--accent)" }, { label: "品类均值", color: "var(--muted)", dashed: true }]} />}>
          <TrendChart series={trendSeries(client)} labels={weekLabels(8)} h={250} />
        </Card>
      </div>
      <div className="grid-exec-mid">
        <Card title="关键结论" sub="自动生成的监测摘要">
          <Takeaways client={client} />
        </Card>
        <Card title="声量份额" sub="品牌 vs 竞品">
          <div style={{ marginBottom: 16 }}><StackedShare data={client.share} /></div>
          <ShareList data={client.share} />
        </Card>
        <Card title="情感倾向" sub="被提及时的语气">
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <SentimentDonut pos={k.sent.pos} neu={k.sent.neu} neg={k.sent.neg} />
            <div style={{ display: "flex", gap: 14, fontSize: 12 }}>
              <SentTag s="pos" /><span className="num" style={{ color: "var(--muted)" }}>{k.sent.pos}</span>
              <SentTag s="neu" /><span className="num" style={{ color: "var(--muted)" }}>{k.sent.neu}</span>
              <SentTag s="neg" /><span className="num" style={{ color: "var(--muted)" }}>{k.sent.neg}</span>
            </div>
          </div>
        </Card>
      </div>
      <Card title="各平台排行榜" sub="品牌在每个平台的竞争位次">
        <div className="lb-grid">
          {client.leaderboards.map(b => <Leaderboard key={b.platform} board={b} />)}
        </div>
      </Card>
    </div>
  );
}

/* ---------- 布局 C: 数据密集 ---------- */
function LayoutDense({ client, pf }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <KpiRow client={client} extended />
      <Card title="各平台监测面板" sub="逐平台可见度 · 露出 · 排行" pad={0}>
        <div className="plat-grid">
          {client.byPlatform.map(bp => {
            const board = client.leaderboards.find(b => b.platform === bp.id);
            return (
              <div key={bp.id} className="plat-cell">
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <Chip id={bp.id} showName />
                  <Donut value={bp.visibility} size={56} stroke={7} color={bp.color} />
                </div>
                <div style={{ display: "flex", gap: 16, marginBottom: 12 }}>
                  <MiniStat label="露出" value={GD.fmtPct(bp.exposure)} sm />
                  <MiniStat label="Top3" value={GD.fmtPct(bp.top3)} sm />
                  <MiniStat label="均排" value={bp.avgRank ?? "—"} sm />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  {board.entries.slice(0, 3).map((e, i) => (
                    <div key={i} style={{ display: "grid", gridTemplateColumns: "12px 1fr 26px", alignItems: "center", gap: 7 }}>
                      <span className="num" style={{ fontSize: 10, color: "var(--faint)" }}>{i + 1}</span>
                      <span style={{ fontSize: 11.5, color: e.brand ? "var(--ink)" : "var(--muted)", fontWeight: e.brand ? 700 : 400,
                        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.name}</span>
                      <span className="num" style={{ fontSize: 10.5, textAlign: "right", color: "var(--faint)" }}>{e.score}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      <Card title="Prompt × 平台 全量矩阵" sub="每个单元 = 一次人工监测记录" right={<PfBadge pf={pf} />}>
        <PromptTable client={client} platformFilter={pf} />
      </Card>
      <div className="grid-2-1">
        <Card title="可见度趋势" sub="近 8 周">
          <TrendChart series={trendSeries(client)} labels={weekLabels(8)} h={200} />
        </Card>
        <Card title="声量份额">
          <ShareList data={client.share} />
        </Card>
      </div>
    </div>
  );
}

function MiniStat({ label, value, sm }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <span className="num" style={{ fontSize: sm ? 16 : 20, fontWeight: 700, color: "var(--ink)", lineHeight: 1 }}>{value}</span>
      <span style={{ fontSize: sm ? 10 : 11, color: "var(--muted)" }}>{label}</span>
    </div>
  );
}

function PfBadge({ pf }) {
  if (pf === "all") return <span style={{ fontSize: 11.5, color: "var(--muted)" }}>全部平台</span>;
  return <Chip id={pf} showName size={20} />;
}

function ClientDetail({ client, layout, pf }) {
  if (layout === "exec") return <LayoutExec client={client} pf={pf} />;
  if (layout === "dense") return <LayoutDense client={client} pf={pf} />;
  return <LayoutClassic client={client} pf={pf} />;
}

Object.assign(window, { ClientDetail });
