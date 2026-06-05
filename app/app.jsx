/* ============================================================
   利欧 GEO 监测 — 应用外壳 / 路由 / 密码门
   ============================================================ */

/* ⚙️ 配置区:把密码改成你自己的(部署前务必修改) */
const CONFIG = {
  password: "geo2026",       // 后台访问密码
  agency: "利欧 GEO",         // 机构名(显示在侧栏/客户端页脚)
};

const GA = window.GEO;
const { useState, useEffect, useReducer } = React;

const LAYOUTS = [
  { id: "classic", name: "经典看板" },
  { id: "exec", name: "执行摘要" },
  { id: "dense", name: "数据密集" },
];

const TWEAK_DEFAULTS = { accent: "#4f57d4", shadow: true };

/* ---------- 加载态 ---------- */
function Loader() {
  return (
    <div style={{ height: "100vh", display: "grid", placeItems: "center", color: "var(--muted)" }}>
      <div style={{ textAlign: "center" }}>
        <div className="spinner"></div>
        <div style={{ marginTop: 14, fontSize: 13 }}>加载监测数据…</div>
      </div>
    </div>
  );
}

/* ---------- 密码门 ---------- */
function Gate({ onPass }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  function submit(e) {
    e.preventDefault();
    if (pw === CONFIG.password) { sessionStorage.setItem("geo_auth", "1"); onPass(); }
    else { setErr(true); }
  }
  return (
    <div className="gate">
      <form className="gate-card" onSubmit={submit}>
        <div className="brand" style={{ padding: 0, marginBottom: 22 }}>
          <div className="brand-mark"><span className="brand-dot"></span></div>
          <div>
            <div className="brand-name">{CONFIG.agency}</div>
            <div className="brand-sub">生成式引擎可见度监测</div>
          </div>
        </div>
        <h1 style={{ fontSize: 18, margin: "0 0 4px" }}>后台登录</h1>
        <p style={{ fontSize: 13, color: "var(--muted)", margin: "0 0 18px" }}>请输入访问密码以进入监测后台。</p>
        <input className="input" type="password" autoFocus placeholder="访问密码"
          value={pw} onChange={e => { setPw(e.target.value); setErr(false); }}
          style={err ? { borderColor: "var(--neg)" } : null} />
        {err && <div style={{ fontSize: 12, color: "var(--neg)", marginTop: 8 }}>密码不正确,请重试</div>}
        <button className="btn btn-primary" style={{ width: "100%", marginTop: 16, justifyContent: "center" }} type="submit">进入后台</button>
      </form>
    </div>
  );
}

/* ---------- 品牌 / 侧栏 ---------- */
function Brand() {
  return (
    <div className="brand">
      <div className="brand-mark"><span className="brand-dot"></span></div>
      <div>
        <div className="brand-name">{CONFIG.agency}</div>
        <div className="brand-sub">生成式引擎可见度监测</div>
      </div>
    </div>
  );
}

function Sidebar({ view, clientId, go, open, setOpen }) {
  return (
    <aside className={"sidebar" + (open ? " open" : "")}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <Brand />
        <button className="sb-close" onClick={() => setOpen(false)}>✕</button>
      </div>
      <nav className="nav">
        <div className="nav-group">监测</div>
        <button className={"nav-item" + (view === "overview" ? " active" : "")} onClick={() => go("overview")}>
          <span className="nav-ico">▦</span><span style={{ flex: 1, textAlign: "left" }}>多客户总览</span></button>
        <div className="nav-group" style={{ marginTop: 14 }}>在监客户</div>
        {GA.CLIENTS.map(c => (
          <button key={c.id} className={"nav-item indent" + (view === "client" && clientId === c.id ? " active" : "")} onClick={() => go("client", c.id)}>
            <Avatar client={c} size={22} />
            <span style={{ flex: 1, textAlign: "left", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.name}</span>
            <span className="num" style={{ fontSize: 11, color: "var(--faint)" }}>{c.kpi.visibility}</span>
          </button>
        ))}
        <div className="nav-group" style={{ marginTop: 14 }}>管理</div>
        <button className={"nav-item" + (view === "admin" ? " active" : "")} onClick={() => go("admin")}>
          <span className="nav-ico">✎</span><span style={{ flex: 1, textAlign: "left" }}>数据录入后台</span></button>
      </nav>
      <div className="sidebar-foot">
        <div style={{ fontSize: 11, color: "var(--faint)" }}>数据更新至</div>
        <div className="num" style={{ fontSize: 12.5, color: "var(--muted)", fontWeight: 600 }}>{GA.lastUpdated}</div>
      </div>
    </aside>
  );
}

function Topbar({ view, client, layout, setLayout, pf, setPf, onMenu, onCopy }) {
  const title = view === "overview" ? "多客户总览" : view === "admin" ? "数据录入后台" : client.name;
  const platOpts = view === "client" ? client.platformIds : GA.PLATFORMS.map(p => p.id);
  return (
    <header className="topbar">
      <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
        <button className="menu-btn" onClick={onMenu}>☰</button>
        {view === "client" && <Avatar client={client} size={34} />}
        <div style={{ minWidth: 0 }}>
          <div className="crumb">{CONFIG.agency} 监测 {view === "client" && <span style={{ color: "var(--faint)" }}>/ 客户</span>}</div>
          <h1 className="page-title">{title}{view === "client" && <span className="title-tag">{client.industry}</span>}</h1>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flex: "none", flexWrap: "wrap" }}>
        {view === "client" && (
          <React.Fragment>
            <div className="seg hide-sm">
              {LAYOUTS.map(l => <button key={l.id} className={"seg-btn" + (layout === l.id ? " on" : "")} onClick={() => setLayout(l.id)}>{l.name}</button>)}
            </div>
            <select className="select hide-sm" value={pf} onChange={e => setPf(e.target.value)} style={{ width: "auto" }}>
              <option value="all">全部平台</option>
              {platOpts.map(pid => <option key={pid} value={pid}>{GA.PMAP[pid].name}</option>)}
            </select>
            <button className="btn btn-ghost" onClick={() => onCopy(client.id)}>复制客户链接</button>
          </React.Fragment>
        )}
      </div>
    </header>
  );
}

/* ---------- 内部应用(总览/详情/后台) ---------- */
function InternalApp() {
  const [view, setView] = useState("overview");
  const [clientId, setClientId] = useState(GA.CLIENTS[0] ? GA.CLIENTS[0].id : null);
  const [layout, setLayout] = useState("classic");
  const [pf, setPf] = useState("all");
  const [navOpen, setNavOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--accent", t.accent);
    root.style.setProperty("--accent-soft", `color-mix(in oklch, ${t.accent} 13%, white)`);
    document.body.classList.toggle("flat", !t.shadow);
  }, [t.accent, t.shadow]);

  const client = GA.CMAP[clientId] || GA.CLIENTS[0];

  function go(v, id) { if (id) { setClientId(id); setPf("all"); } setView(v); setNavOpen(false); window.scrollTo({ top: 0 }); }
  function flash(msg) { setToast(msg); clearTimeout(flash._t); flash._t = setTimeout(() => setToast(null), 2600); }
  function copyLink(id) { const url = location.origin + location.pathname + "?c=" + id;
    try { navigator.clipboard.writeText(url); } catch (e) {}
    flash("已复制专属链接:" + url); }

  return (
    <div className="app">
      {navOpen && <div className="nav-scrim" onClick={() => setNavOpen(false)}></div>}
      <Sidebar view={view} clientId={clientId} go={go} open={navOpen} setOpen={setNavOpen} />
      <div className="main">
        <Topbar view={view} client={client} layout={layout} setLayout={setLayout} pf={pf} setPf={setPf}
          onMenu={() => setNavOpen(true)} onCopy={copyLink} />
        <main className="content">
          {view === "overview" && <Overview onOpen={id => go("client", id)} onCopy={copyLink} />}
          {view === "client" && client && <ClientDetail client={client} layout={layout} pf={pf} />}
          {view === "admin" && <Admin flash={flash} onCopy={copyLink} />}
        </main>
      </div>
      <TweaksPanel title="Tweaks">
        <TweakSection label="主题" />
        <TweakColor label="强调色" value={t.accent}
          options={["#4f57d4", "#2f6fe0", "#1f8a5b", "#7a52d8", "#c2410c"]} onChange={v => setTweak("accent", v)} />
        <TweakToggle label="卡片阴影" value={t.shadow} onChange={v => setTweak("shadow", v)} />
      </TweaksPanel>
      {toast && <div className="toast">✓ {toast}</div>}
    </div>
  );
}

/* ---------- 根:路由 + 初始化 ---------- */
function Root() {
  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(sessionStorage.getItem("geo_auth") === "1");
  const [, force] = useReducer(x => x + 1, 0);

  const params = new URLSearchParams(location.search);
  const clientParam = params.get("c");
  const mode = clientParam ? "client" : "admin";

  useEffect(() => {
    GA.init(mode).then(() => setReady(true));
    const unsub = GA.subscribe(force);
    return unsub;
  }, []);

  if (!ready) return <Loader />;

  // 客户端专属页(无需密码)
  if (clientParam) {
    const client = GA.CMAP[clientParam];
    return client ? <ClientReport client={client} /> : <NotFound />;
  }

  // 内部后台(密码门)
  if (!authed) return <Gate onPass={() => setAuthed(true)} />;
  return <InternalApp />;
}

ReactDOM.createRoot(document.getElementById("root")).render(<Root />);
