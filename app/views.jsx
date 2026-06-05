/* ============================================================
   利欧 GEO 监测 — 总览 & 录入后台(含客户管理 + 发布)
   导出: Overview, Admin
   ============================================================ */

const GV = window.GEO;
const HUE_PRESETS = [262, 150, 188, 220, 36, 285, 340, 96];

/* ---------- 小工具 ---------- */
function copyLink(id, cb) {
  const url = location.origin + location.pathname + "?c=" + id;
  navigator.clipboard ? navigator.clipboard.writeText(url).then(() => cb(url), () => cb(url)) : cb(url);
}
function download(name, text, type) {
  const blob = new Blob([text], { type: type || "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1500);
}

/* ================= 多客户总览 ================= */
function Overview({ onOpen, onCopy }) {
  const o = GV.overview;
  const summary = [
    { label: "监测客户", value: o.clientCount },
    { label: "AI 平台", value: o.platformCount },
    { label: "监测 Prompt", value: o.promptTotal },
    { label: "累计监测记录", value: o.runTotal },
    { label: "平均可见度", value: o.avgVisibility },
  ];
  const ranked = [...GV.CLIENTS].sort((a, b) => b.kpi.visibility - a.kpi.visibility);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))" }}>
        {summary.map((s, i) => (
          <div className="kpi" key={i}>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>{s.label}</span>
            <div className="num" style={{ fontSize: 30, fontWeight: 700, color: "var(--ink)", marginTop: 10, lineHeight: 1 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <h2 className="sec-title">客户监测概览</h2>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>按综合可见度排序 · 数据更新至 {GV.lastUpdated}</span>
        </div>
        {ranked.length === 0 && <div className="empty-hint" style={{ padding: 40 }}>还没有客户。去「数据录入后台 → 客户管理」新增一个。</div>}
        <div className="client-grid">
          {ranked.map(c => (
            <div key={c.id} className="client-card">
              <button className="client-card-open" onClick={() => onOpen(c.id)}>
                <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                  <Avatar client={c} />
                  <div style={{ textAlign: "left", minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 650, color: "var(--ink)" }}>{c.name}</div>
                    <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{c.industry}{c.en ? " · " + c.en : ""}</div>
                  </div>
                  <div style={{ marginLeft: "auto", textAlign: "right" }}>
                    <div className="num" style={{ fontSize: 26, fontWeight: 700, color: "var(--ink)", lineHeight: 1 }}>{c.kpi.visibility}</div>
                    <DeltaPill value={c.kpi.deltaVis} />
                  </div>
                </div>
                <div style={{ margin: "14px 0 12px" }}>
                  <Sparkline data={c.trend} w={260} h={36} />
                </div>
                <div style={{ display: "flex", gap: 18, marginBottom: 13, flexWrap: "wrap" }}>
                  <MiniStat2 label="露出率" value={GV.fmtPct(c.kpi.exposure)} />
                  <MiniStat2 label="首位率" value={GV.fmtPct(c.kpi.firsts)} />
                  <MiniStat2 label="Top3" value={GV.fmtPct(c.kpi.top3)} />
                  <MiniStat2 label="份额" value={c.share.find(s => s.brand).value + "%"} />
                </div>
              </button>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: "1px solid var(--line)", paddingTop: 11 }}>
                <div style={{ display: "flex", gap: 5 }}>
                  {c.platformIds.slice(0, 6).map(pid => <Chip key={pid} id={pid} size={20} />)}
                </div>
                <button className="link-btn" onClick={() => onCopy(c.id)}>复制专属链接</button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniStat2({ label, value }) {
  return (
    <div>
      <div className="num" style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 10.5, color: "var(--muted)", marginTop: 3 }}>{label}</div>
    </div>
  );
}

/* ================= 通用控件 ================= */
function Toggle({ on, onChange }) {
  return (
    <button type="button" className={"toggle" + (on ? " on" : "")} onClick={() => onChange(!on)} aria-pressed={on}>
      <span className="toggle-dot"></span>
    </button>
  );
}

/* ================= 客户编辑器 ================= */
function ClientEditor({ initial, onSave, onCancel }) {
  const isNew = !initial;
  const [f, setF] = React.useState(() => initial ? {
    name: initial.name, en: initial.en || "", industry: initial.industry, glyph: initial.glyph,
    hue: initial.hue, competitors: (initial.competitors || []).join("、"),
    platformIds: [...(initial.platformIds || [])], prompts: [...(initial.prompts || [])],
  } : { name: "", en: "", industry: "", glyph: "", hue: 262, competitors: "", platformIds: GV.ALL_PLATFORMS.map(p => p.id), prompts: [""] });
  const set = (k, v) => setF(s => ({ ...s, [k]: v }));

  function togglePlat(id) {
    setF(s => ({ ...s, platformIds: s.platformIds.includes(id) ? s.platformIds.filter(x => x !== id) : [...s.platformIds, id] }));
  }
  function setPrompt(i, v) { setF(s => { const p = [...s.prompts]; p[i] = v; return { ...s, prompts: p }; }); }
  function addPrompt() { setF(s => ({ ...s, prompts: [...s.prompts, ""] })); }
  function delPrompt(i) { setF(s => ({ ...s, prompts: s.prompts.filter((_, j) => j !== i) })); }

  function save() {
    const prompts = f.prompts.map(p => p.trim()).filter(Boolean);
    const competitors = f.competitors.split(/[、,，\s]+/).map(s => s.trim()).filter(Boolean);
    const glyph = (f.glyph || f.name || "新").trim().slice(0, 1);
    onSave({ name: f.name.trim() || "未命名客户", en: f.en.trim(), industry: f.industry.trim() || "未分类",
      glyph, hue: +f.hue, competitors, platformIds: f.platformIds.length ? f.platformIds : GV.ALL_PLATFORMS.map(p => p.id), prompts });
  }

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <header className="modal-head">
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{isNew ? "新增客户" : "编辑客户"}</h3>
          <button className="icon-btn-plain" onClick={onCancel}>✕</button>
        </header>
        <div className="modal-body">
          <div className="field-row">
            <label className="field"><span className="flabel">客户名称</span>
              <input className="input" value={f.name} onChange={e => set("name", e.target.value)} placeholder="如 杜蕾斯" /></label>
            <label className="field"><span className="flabel">英文名(选填)</span>
              <input className="input" value={f.en} onChange={e => set("en", e.target.value)} placeholder="Durex" /></label>
          </div>
          <div className="field-row">
            <label className="field"><span className="flabel">所属行业</span>
              <input className="input" value={f.industry} onChange={e => set("industry", e.target.value)} placeholder="如 计生个护" /></label>
            <label className="field"><span className="flabel">Logo 首字</span>
              <input className="input" maxLength="1" value={f.glyph} onChange={e => set("glyph", e.target.value)} placeholder="杜" /></label>
          </div>
          <div className="field">
            <span className="flabel">主题色</span>
            <div style={{ display: "flex", gap: 8 }}>
              {HUE_PRESETS.map(h => (
                <button key={h} type="button" onClick={() => set("hue", h)}
                  className={"hue-dot" + (+f.hue === h ? " on" : "")}
                  style={{ background: `oklch(0.6 0.14 ${h})` }} />
              ))}
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, marginLeft: 6 }}>
                <span style={{ width: 30, height: 30, borderRadius: 8, background: `oklch(0.95 0.04 ${f.hue})`,
                  color: `oklch(0.45 0.13 ${f.hue})`, display: "grid", placeItems: "center", fontWeight: 700, fontSize: 14 }}>
                  {(f.glyph || f.name || "新").slice(0, 1)}</span>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>预览</span>
              </span>
            </div>
          </div>
          <label className="field"><span className="flabel">竞品名单(顿号或逗号分隔)</span>
            <input className="input" value={f.competitors} onChange={e => set("competitors", e.target.value)} placeholder="冈本、杰士邦、第六感" /></label>
          <div className="field">
            <span className="flabel">覆盖 AI 平台</span>
            <div className="plat-pick">
              {GV.ALL_PLATFORMS.map(p => (
                <button key={p.id} type="button" onClick={() => togglePlat(p.id)}
                  className={"plat-chip" + (f.platformIds.includes(p.id) ? " on" : "")}>
                  <Chip id={p.id} size={18} /><span>{p.name}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="field">
            <span className="flabel">该客户的 Prompt 列表</span>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {f.prompts.map((p, i) => (
                <div key={i} style={{ display: "flex", gap: 7 }}>
                  <input className="input" value={p} onChange={e => setPrompt(i, e.target.value)} placeholder={"提问 " + (i + 1)} />
                  <button className="icon-btn" onClick={() => delPrompt(i)} title="删除">✕</button>
                </div>
              ))}
              <button className="btn btn-sm" onClick={addPrompt} style={{ alignSelf: "flex-start" }}>+ 添加 Prompt</button>
            </div>
          </div>
        </div>
        <footer className="modal-foot">
          <button className="btn" onClick={onCancel}>取消</button>
          <button className="btn btn-primary" onClick={save}>{isNew ? "创建客户" : "保存修改"}</button>
        </footer>
      </div>
    </div>
  );
}

/* ================= 客户管理 ================= */
function ClientManager({ flash, onCopy }) {
  const [editing, setEditing] = React.useState(null); // {} for new, client for edit
  function handleSave(data) {
    if (editing && editing.id) { GV.updateClient(editing.id, data); flash("已更新客户「" + data.name + "」"); }
    else { GV.addClient(data); flash("已新增客户「" + data.name + "」"); }
    setEditing(null);
  }
  function del(c) {
    if (confirm(`确认删除客户「${c.name}」及其所有监测记录?此操作不可撤销。`)) {
      GV.removeClient(c.id); flash("已删除客户");
    }
  }
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <span style={{ fontSize: 13, color: "var(--muted)" }}>共 {GV.CLIENTS.length} 个在监客户</span>
        <button className="btn btn-primary" onClick={() => setEditing({})}>+ 新增客户</button>
      </div>
      <div className="cm-grid">
        {GV.CLIENTS.map(c => (
          <div key={c.id} className="cm-card">
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <Avatar client={c} size={38} />
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 650 }}>{c.name}</div>
                <div style={{ fontSize: 11.5, color: "var(--muted)" }}>{c.industry} · {c.prompts.length} prompt · {c.platformIds.length} 平台</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 5, marginBottom: 12, flexWrap: "wrap" }}>
              {c.platformIds.map(pid => <Chip key={pid} id={pid} size={18} />)}
            </div>
            <div style={{ display: "flex", gap: 7 }}>
              <button className="btn btn-sm" onClick={() => setEditing(c)}>编辑</button>
              <button className="btn btn-sm" onClick={() => onCopy(c.id)}>复制链接</button>
              <button className="btn btn-sm btn-danger" onClick={() => del(c)} style={{ marginLeft: "auto" }}>删除</button>
            </div>
          </div>
        ))}
      </div>
      {editing && <ClientEditor initial={editing.id ? editing : null} onSave={handleSave} onCancel={() => setEditing(null)} />}
    </div>
  );
}

/* ================= 记录录入 ================= */
function RecordEntry({ clientId, flash }) {
  const client = GV.CMAP[clientId];
  const [draft, setDraft] = React.useState(null);
  const [editId, setEditId] = React.useState(null);

  React.useEffect(() => { setDraft(blank()); setEditId(null); }, [clientId]);
  function blank() {
    return { prompt: (client.prompts[0] || ""), platform: (client.platformIds[0] || "doubao"),
      mentioned: true, rank: 1, sentiment: "pos", cited: false, sources: 0, date: GV.lastUpdated };
  }
  if (!draft) return null;
  const set = (k, v) => setDraft(d => ({ ...d, [k]: v }));
  const records = GV.recordsFor(clientId);

  function save() {
    const payload = { ...draft, clientId, rank: draft.rank === "" ? null : draft.rank };
    if (editId) { GV.updateRecord(editId, payload); flash("已更新记录"); }
    else { GV.addRecord(payload); flash("已新增 1 条监测记录"); }
    setDraft(blank()); setEditId(null);
  }
  function editRow(r) {
    setDraft({ prompt: r.prompt, platform: r.platform, mentioned: r.mentioned, rank: r.rank || "",
      sentiment: r.sentiment || "pos", cited: r.cited, sources: r.sources || 0, date: r.date });
    setEditId(r.id); window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function delRow(id) { GV.removeRecord(id); if (id === editId) { setDraft(blank()); setEditId(null); } flash("已删除记录"); }

  return (
    <div className="admin-grid">
      <Card title={editId ? "编辑监测记录" : "新增监测记录"} sub="字段会换算为前台的可见度 / 排名指标" className="admin-form">
        <div className="form-col">
          <label className="field"><span className="flabel">Prompt 提问</span>
            <input className="input" list="prompt-list" value={draft.prompt} onChange={e => set("prompt", e.target.value)} />
            <datalist id="prompt-list">{client.prompts.map(p => <option key={p} value={p} />)}</datalist>
          </label>
          <div className="field-row">
            <label className="field"><span className="flabel">AI 平台</span>
              <select className="select" value={draft.platform} onChange={e => set("platform", e.target.value)}>
                {client.platformIds.map(pid => <option key={pid} value={pid}>{GV.PMAP[pid].name}</option>)}
              </select></label>
            <label className="field"><span className="flabel">监测日期</span>
              <input className="input" type="date" value={draft.date} onChange={e => set("date", e.target.value)} /></label>
          </div>
          <div className="field-row">
            <div className="field"><span className="flabel">是否露出</span>
              <div style={{ display: "flex", alignItems: "center", gap: 10, height: 38 }}>
                <Toggle on={draft.mentioned} onChange={v => set("mentioned", v)} />
                <span style={{ fontSize: 13, color: draft.mentioned ? "var(--pos)" : "var(--muted)" }}>{draft.mentioned ? "已露出" : "未露出"}</span>
              </div></div>
            <label className="field"><span className="flabel">推荐排名</span>
              <input className="input" type="number" min="1" max="20" disabled={!draft.mentioned}
                value={draft.rank} onChange={e => set("rank", e.target.value === "" ? "" : +e.target.value)} placeholder="如 1" /></label>
          </div>
          <div className="field"><span className="flabel">情感倾向</span>
            <div className="seg">
              {[["pos", "正面"], ["neu", "中性"], ["neg", "负面"]].map(([v, l]) => (
                <button key={v} type="button" disabled={!draft.mentioned}
                  className={"seg-btn" + (draft.sentiment === v ? " on" : "")} onClick={() => set("sentiment", v)}>{l}</button>
              ))}
            </div></div>
          <div className="field-row">
            <div className="field"><span className="flabel">是否被引用</span>
              <div style={{ display: "flex", alignItems: "center", gap: 10, height: 38 }}>
                <Toggle on={draft.cited} onChange={v => set("cited", v)} />
                <span style={{ fontSize: 13, color: "var(--muted)" }}>{draft.cited ? "含来源链接" : "无引用"}</span>
              </div></div>
            <label className="field"><span className="flabel">来源数量</span>
              <input className="input" type="number" min="0" max="10" disabled={!draft.cited}
                value={draft.sources} onChange={e => set("sources", +e.target.value || 0)} /></label>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
            <button className="btn btn-primary" onClick={save}>{editId ? "保存修改" : "+ 新增记录"}</button>
            {editId && <button className="btn" onClick={() => { setDraft(blank()); setEditId(null); }}>取消</button>}
          </div>
        </div>
      </Card>

      <Card title="已录入记录" sub={`${client.name} · 点击行可编辑`} pad={0} className="admin-table">
        <div className="tbl-wrap" style={{ maxHeight: 560, overflow: "auto" }}>
          <table className="tbl">
            <thead><tr><th style={{ textAlign: "left" }}>Prompt</th><th>平台</th><th>露出</th><th>排名</th><th>情感</th><th></th></tr></thead>
            <tbody>
              {records.length === 0 && <tr><td colSpan="6" style={{ textAlign: "center", color: "var(--muted)", padding: 30 }}>暂无记录,用左侧表单新增</td></tr>}
              {records.map(r => (
                <tr key={r.id} className={"row-click" + (r.id === editId ? " row-active" : "")}>
                  <td style={{ textAlign: "left", maxWidth: 200, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} onClick={() => editRow(r)}>{r.prompt}</td>
                  <td onClick={() => editRow(r)}><div style={{ display: "flex", justifyContent: "center" }}><Chip id={r.platform} size={20} /></div></td>
                  <td onClick={() => editRow(r)}>{r.mentioned ? <span style={{ color: "var(--pos)", fontSize: 12 }}>● 是</span> : <span style={{ color: "var(--faint)", fontSize: 12 }}>○ 否</span>}</td>
                  <td className="num" onClick={() => editRow(r)}>{r.mentioned ? ("#" + r.rank) : "—"}</td>
                  <td onClick={() => editRow(r)}><SentTag s={r.mentioned ? r.sentiment : null} /></td>
                  <td><button className="icon-btn" title="删除" onClick={() => delRow(r.id)}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ================= 后台主体 ================= */
function Admin({ flash, onCopy }) {
  const [tab, setTab] = React.useState("entry");
  const [clientId, setClientId] = React.useState(GV.CLIENTS[0] ? GV.CLIENTS[0].id : null);
  React.useEffect(() => {
    if (!GV.CMAP[clientId] && GV.CLIENTS[0]) setClientId(GV.CLIENTS[0].id);
  });
  const importRef = React.useRef();

  function doPublish() {
    download("geo-data.json", GV.exportJSON());
    flash("已导出 geo-data.json — 上传到托管覆盖旧文件即更新");
  }
  function doImport(e) {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (GV.applyData(data)) { GV.saveLocal(); GV.bump(); flash("已导入数据文件"); }
        else flash("文件格式不正确");
      } catch (err) { flash("解析失败:不是有效的 JSON"); }
    };
    reader.readAsText(file); e.target.value = "";
  }
  function doReset() {
    if (confirm("确认清空本地工作副本,恢复为内置示例数据?")) {
      try { localStorage.removeItem("geo_store_v2"); } catch (e) {}
      location.reload();
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="admin-bar">
        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
          <div className="seg">
            <button className={"seg-btn" + (tab === "entry" ? " on" : "")} onClick={() => setTab("entry")}>数据录入</button>
            <button className={"seg-btn" + (tab === "clients" ? " on" : "")} onClick={() => setTab("clients")}>客户管理</button>
          </div>
          {tab === "entry" && GV.CLIENTS.length > 0 && (
            <select className="select" style={{ width: "auto", marginLeft: 6 }} value={clientId || ""} onChange={e => setClientId(e.target.value)}>
              {GV.CLIENTS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button className="btn btn-sm" onClick={doReset}>重置示例</button>
          <button className="btn btn-sm" onClick={() => importRef.current.click()}>导入数据</button>
          <button className="btn btn-sm btn-primary" onClick={doPublish}>↑ 发布数据</button>
          <input ref={importRef} type="file" accept="application/json,.json" style={{ display: "none" }} onChange={doImport} />
        </div>
      </div>

      {tab === "entry" && (clientId && GV.CMAP[clientId]
        ? <RecordEntry clientId={clientId} flash={flash} />
        : <div className="empty-hint" style={{ padding: 40 }}>还没有客户,先到「客户管理」新增一个。</div>)}
      {tab === "clients" && <ClientManager flash={flash} onCopy={onCopy} />}
    </div>
  );
}

Object.assign(window, { Overview, Admin });
