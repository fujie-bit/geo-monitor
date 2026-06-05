/* ============================================================
   利欧 GEO 监测 — 客户端专属页 (居中 · 自适应 · 只读)
   通过 ?c=<clientId> 访问;客户只看自己的数据。
   导出: ClientReport, NotFound
   ============================================================ */

const GC = window.GEO;

function ReportHeader({ client }) {
  const k = client.kpi;
  return (
    <header className="rpt-head">
      <div className="rpt-head-main">
        <Avatar client={client} size={52} />
        <div style={{ minWidth: 0 }}>
          <div className="rpt-kicker">GEO 生成式引擎可见度报告</div>
          <h1 className="rpt-title">{client.name}
            <span className="rpt-industry">{client.industry}</span></h1>
        </div>
      </div>
      <div className="rpt-head-score">
        <div className="num rpt-score">{k.visibility}<span className="rpt-score-max">/100</span></div>
        <div className="rpt-score-label">综合可见度 <DeltaPill value={k.deltaVis} /></div>
      </div>
    </header>
  );
}

function ReportStatStrip({ client }) {
  const k = client.kpi;
  const stats = [
    { label: "品牌露出率", value: GC.fmtPct(k.exposure) },
    { label: "首位率 #1", value: GC.fmtPct(k.firsts) },
    { label: "Top3 占有率", value: GC.fmtPct(k.top3) },
    { label: "声量份额", value: client.share.find(s => s.brand).value + "%" },
    { label: "监测平台", value: k.platformCount },
    { label: "监测 Prompt", value: k.promptCount },
  ];
  return (
    <div className="rpt-strip">
      {stats.map((s, i) => (
        <div key={i} className="rpt-strip-item">
          <div className="num rpt-strip-val">{s.value}</div>
          <div className="rpt-strip-label">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function ClientReport({ client }) {
  return (
    <div className="rpt-wrap">
      <div className="rpt-card">
        <ReportHeader client={client} />
        <ReportStatStrip client={client} />
        <div className="rpt-body">
          <ClientDetail client={client} layout="exec" pf="all" />
          <section className="rpt-section">
            <h2 className="rpt-h2">各平台表现明细</h2>
            <div className="card"><div style={{ padding: 18 }}><PlatformTable client={client} /></div></div>
          </section>
          <section className="rpt-section">
            <h2 className="rpt-h2">Prompt 级监测明细</h2>
            <div className="card"><div style={{ padding: 18 }}><PromptTable client={client} platformFilter="all" /></div></div>
          </section>
        </div>
        <footer className="rpt-foot">
          <span>数据更新至 <b className="num">{GC.lastUpdated}</b> · 数据来源:利欧 GEO 人工监测</span>
          <span className="rpt-brand">利欧 GEO 监测</span>
        </footer>
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="rpt-wrap">
      <div className="rpt-card" style={{ textAlign: "center", padding: "70px 30px" }}>
        <div style={{ fontSize: 40, marginBottom: 14 }}>🔍</div>
        <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>未找到该客户报告</h1>
        <p style={{ color: "var(--muted)", fontSize: 14, margin: 0 }}>请检查链接是否正确,或联系您的对接顾问。</p>
      </div>
    </div>
  );
}

Object.assign(window, { ClientReport, NotFound });
