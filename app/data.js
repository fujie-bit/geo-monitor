/* ============================================================
   利欧 GEO 监测 — 数据存储 (window.GEO)
   记录(records)是唯一真实来源,所有指标实时派生。
   持久化: localStorage(后台工作副本) + geo-data.json(发布数据)。
   ============================================================ */
(function () {
  "use strict";

  /* ---------- 工具 ---------- */
  function hashStr(s) {
    let h = 2166136261 >>> 0;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const uid = (p) => (p || "id") + "-" + Math.random().toString(36).slice(2, 9);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  /* ---------- 平台主表(固定可选项) ---------- */
  const ALL_PLATFORMS = [
    { id: "doubao",   name: "豆包",      glyph: "豆", hue: 250 },
    { id: "deepseek", name: "DeepSeek", glyph: "D", hue: 272 },
    { id: "yuanbao",  name: "腾讯元宝",  glyph: "元", hue: 232 },
    { id: "qianwen",  name: "通义千问",  glyph: "千", hue: 300 },
    { id: "kimi",     name: "Kimi",     glyph: "K", hue: 205 },
    { id: "wenxin",   name: "文心一言",  glyph: "文", hue: 162 },
  ];
  ALL_PLATFORMS.forEach(p => { p.color = `oklch(0.62 0.14 ${p.hue})`; p.soft = `oklch(0.95 0.03 ${p.hue})`; });
  const PMAP = Object.fromEntries(ALL_PLATFORMS.map(p => [p.id, p]));

  /* ---------- 种子客户定义 ---------- */
  const SEED_CLIENTS = [
    { id: "durex", name: "杜蕾斯", en: "Durex", industry: "计生个护", glyph: "杜", hue: 262, strength: 0.82,
      competitors: ["冈本", "杰士邦", "第六感", "诺丝"],
      platformIds: ["doubao", "deepseek", "yuanbao", "qianwen", "kimi", "wenxin"],
      prompts: ["什么牌子避孕套最薄", "什么牌子避孕套最好用", "超薄避孕套推荐", "避孕套哪个牌子好", "情侣第一次用什么避孕套", "玻尿酸避孕套推荐"] },
    { id: "ziran", name: "自然堂", en: "CHANDO", industry: "美妆护肤", glyph: "然", hue: 150, strength: 0.64,
      competitors: ["珀莱雅", "薇诺娜", "欧莱雅", "兰蔻"],
      platformIds: ["doubao", "deepseek", "yuanbao", "qianwen", "kimi", "wenxin"],
      prompts: ["平价补水面霜推荐", "敏感肌用什么护肤品", "国货护肤品牌推荐", "抗老精华哪个好", "学生党护肤套装", "冬天保湿面霜推荐"] },
    { id: "genki", name: "元气森林", en: "Genki Forest", industry: "饮料快消", glyph: "元", hue: 188, strength: 0.71,
      competitors: ["农夫山泉", "可口可乐", "三得利", "东方树叶"],
      platformIds: ["doubao", "deepseek", "yuanbao", "qianwen", "kimi", "wenxin"],
      prompts: ["无糖气泡水推荐", "减肥喝什么饮料", "好喝的无糖饮料", "健身党喝什么", "0卡饮料有哪些", "夏天解暑饮料推荐"] },
    { id: "tineco", name: "添可", en: "Tineco", industry: "智能家电", glyph: "添", hue: 220, strength: 0.6,
      competitors: ["戴森", "石头", "美的", "追觅"],
      platformIds: ["doubao", "deepseek", "qianwen", "kimi"],
      prompts: ["洗地机哪个牌子好", "吸尘器推荐", "智能清洁家电推荐", "扫地机器人哪个好", "除螨仪推荐", "家用洗地机排行"] },
  ];

  // 锚定:用户提供的真实样本
  const ANCHORS = {
    "durex|doubao|什么牌子避孕套最薄":  { mentioned: true, rank: 3 },
    "durex|doubao|什么牌子避孕套最好用": { mentioned: true, rank: 1 },
    "durex|deepseek|什么牌子避孕套最薄": { mentioned: true, rank: 3 },
    "durex|qianwen|什么牌子避孕套最好用": { mentioned: true, rank: 1 },
  };

  function rankFromR(r, s) {
    if (r < 0.18 + s * 0.18) return 1;
    if (r < 0.40 + s * 0.18) return 2;
    if (r < 0.62 + s * 0.12) return 3;
    if (r < 0.82) return 4 + Math.floor(r * 3) % 2;
    return 6 + Math.floor(r * 7) % 4;
  }
  function visFromRank(mentioned, rank) {
    if (!mentioned || rank == null) return 0;
    return ({ 1: 100, 2: 86, 3: 72, 4: 56, 5: 48 }[rank]) || 32;
  }

  /* ---------- 生成种子记录 ---------- */
  function genSeedRecords() {
    const recs = [];
    SEED_CLIENTS.forEach(def => {
      def.prompts.forEach(prompt => {
        def.platformIds.forEach(pid => {
          const key = `${def.id}|${pid}|${prompt}`;
          const r = rng(hashStr(key));
          const r1 = r(), r2 = r(), r3 = r(), r4 = r();
          const plat = PMAP[pid];
          const platBias = 0.85 + ((plat.hue % 7) / 7) * 0.3;
          let mentioned = r1 < def.strength * platBias;
          let rank = mentioned ? rankFromR(r2, def.strength) : null;
          const anc = ANCHORS[key];
          if (anc) { mentioned = anc.mentioned; rank = anc.rank; }
          const sentiment = !mentioned ? "pos" : (r3 < 0.62 ? "pos" : r3 < 0.9 ? "neu" : "neg");
          const cited = mentioned && r4 < 0.45;
          const sources = cited ? 1 + Math.floor(r4 * 4) : 0;
          recs.push({ id: uid("r"), clientId: def.id, prompt, platform: pid,
            mentioned, rank: rank || null, sentiment, cited, sources, date: "2026-06-01" });
        });
      });
    });
    return recs;
  }

  function seedRaw() {
    return {
      meta: { lastUpdated: "2026-06-01" },
      clients: SEED_CLIENTS.map(c => ({ ...c, competitors: [...c.competitors], platformIds: [...c.platformIds], prompts: [...c.prompts] })),
      records: genSeedRecords(),
    };
  }

  /* ---------- 从记录派生单客户 ---------- */
  function buildClient(def, allRecords) {
    const platformIds = (def.platformIds && def.platformIds.length ? def.platformIds : ALL_PLATFORMS.map(p => p.id))
      .filter(id => PMAP[id]);
    const prompts = def.prompts || [];
    const recs = allRecords.filter(r => r.clientId === def.id);

    // 每个 (prompt, platform) 取最新记录
    const cells = [];
    prompts.forEach(prompt => {
      platformIds.forEach(pid => {
        const matched = recs.filter(r => r.prompt === prompt && r.platform === pid)
          .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
        const rec = matched[0];
        if (rec) {
          cells.push({ prompt, platform: pid, measured: true, mentioned: !!rec.mentioned,
            rank: rec.mentioned ? rec.rank : null, sentiment: rec.mentioned ? rec.sentiment : null,
            cited: !!rec.cited, sources: rec.sources || 0, vis: visFromRank(rec.mentioned, rec.rank) });
        } else {
          cells.push({ prompt, platform: pid, measured: false, mentioned: false, rank: null,
            sentiment: null, cited: false, sources: 0, vis: 0 });
        }
      });
    });

    const measured = cells.filter(c => c.measured);
    const mentions = measured.filter(c => c.mentioned);
    const denom = measured.length || 1;
    const exposure = mentions.length / denom;
    const firsts = measured.filter(c => c.rank === 1).length / denom;
    const top3 = measured.filter(c => c.mentioned && c.rank <= 3).length / denom;
    const visibility = measured.length ? Math.round(measured.reduce((a, c) => a + c.vis, 0) / measured.length) : 0;
    const avgRank = mentions.length ? +(mentions.reduce((a, c) => a + c.rank, 0) / mentions.length).toFixed(1) : null;
    const sent = { pos: mentions.filter(c => c.sentiment === "pos").length,
      neu: mentions.filter(c => c.sentiment === "neu").length,
      neg: mentions.filter(c => c.sentiment === "neg").length };
    const citedCount = measured.filter(c => c.cited).length;

    const byPlatform = platformIds.map(pid => {
      const cs = cells.filter(c => c.platform === pid && c.measured);
      const ms = cs.filter(c => c.mentioned);
      const d = cs.length || 1;
      return { ...PMAP[pid],
        exposure: ms.length / d,
        top3: cs.filter(c => c.mentioned && c.rank <= 3).length / d,
        visibility: cs.length ? Math.round(cs.reduce((a, c) => a + c.vis, 0) / cs.length) : 0,
        avgRank: ms.length ? +(ms.reduce((a, c) => a + c.rank, 0) / ms.length).toFixed(1) : null,
        measuredCount: cs.length };
    });

    const strength = clamp(visibility / 100, 0.15, 0.95);

    // 趋势:按周聚合可见度;数据不足则按种子合成 8 周
    const weekVis = {};
    measured.forEach(c => { /* 占位:逐周需记录日期,统一在下方按记录日期聚合 */ });
    const dated = recs.filter(r => r.date);
    const buckets = {};
    dated.forEach(r => {
      const wk = Math.floor(new Date(r.date + "T00:00:00").getTime() / (7 * 864e5));
      (buckets[wk] = buckets[wk] || []).push(visFromRank(r.mentioned, r.rank));
    });
    const weeks = Object.keys(buckets).map(Number).sort((a, b) => a - b);
    let trend;
    if (weeks.length >= 3) {
      const vals = weeks.map(w => Math.round(buckets[w].reduce((a, b) => a + b, 0) / buckets[w].length));
      trend = vals.slice(-8);
      while (trend.length < 8) trend.unshift(trend[0]);
    } else {
      const tr = rng(hashStr(def.id + "trend"));
      let base = Math.max(14, visibility - 16 - Math.round(tr() * 10));
      trend = [];
      for (let w = 0; w < 8; w++) {
        const t = w / 7;
        trend.push(Math.round(clamp(base + (visibility - base) * t + (tr() - 0.5) * 7, 5, 100)));
      }
      trend[7] = visibility;
    }

    // 声量份额 / 雷达 / 排行榜(竞品为模型估算,基于品牌强势度种子生成)
    const competitors = def.competitors || [];
    const sv = rng(hashStr(def.id + "share"));
    const brandShare = Math.round(clamp(16 + strength * 28, 8, 60));
    let rest = 100 - brandShare;
    const compRaw = competitors.map(() => 0.4 + sv());
    const sum = compRaw.reduce((a, b) => a + b, 0) || 1;
    const compShares = compRaw.map(v => Math.round((v / sum) * rest));
    if (compShares.length) compShares[0] += rest - compShares.reduce((a, b) => a + b, 0);
    const share = [{ name: def.name, value: brandShare, brand: true }]
      .concat(competitors.map((c, i) => ({ name: c, value: compShares[i], brand: false })))
      .sort((a, b) => b.value - a.value);

    const radar = byPlatform.map(bp => ({ axis: bp.name, brand: bp.visibility,
      avg: Math.max(10, Math.round(bp.visibility * (0.58 + sv() * 0.26))) }));

    const leaderboards = platformIds.map(pid => {
      const lr = rng(hashStr(def.id + pid + "lead"));
      const bp = byPlatform.find(x => x.id === pid);
      const entries = [{ name: def.name, brand: true, score: bp.visibility }]
        .concat(competitors.map(c => ({ name: c, brand: false, score: Math.round(20 + lr() * 78) })));
      entries.sort((a, b) => b.score - a.score);
      return { platform: pid, entries };
    });

    const prevVis = trend[6] != null ? trend[6] : visibility;
    return { ...def, platformIds, prompts, cells, byPlatform, trend, share, radar, leaderboards,
      kpi: { exposure, firsts, top3, visibility, avgRank, deltaVis: visibility - prevVis,
        sent, citedCount, promptCount: prompts.length, platformCount: platformIds.length,
        runs: measured.length, measuredCells: measured.length, totalCells: cells.length } };
  }

  /* ---------- 存储对象 ---------- */
  const STORE_KEY = "geo_store_v2";
  const G = {
    PLATFORMS: ALL_PLATFORMS, ALL_PLATFORMS, PMAP,
    CLIENTS: [], CMAP: {}, overview: {},
    raw: seedRaw(),
    lastUpdated: "2026-06-01",
    fmtPct: x => Math.round(x * 100) + "%",
    _subs: [],
  };

  G.recompute = function () {
    G.CLIENTS = G.raw.clients.map(def => buildClient(def, G.raw.records));
    G.CMAP = Object.fromEntries(G.CLIENTS.map(c => [c.id, c]));
    const maxDate = G.raw.records.reduce((m, r) => (r.date && r.date > m ? r.date : m), G.raw.meta.lastUpdated || "2026-06-01");
    G.lastUpdated = maxDate;
    G.raw.meta.lastUpdated = maxDate;
    G.overview = {
      clientCount: G.CLIENTS.length,
      platformCount: ALL_PLATFORMS.length,
      promptTotal: G.CLIENTS.reduce((a, c) => a + c.prompts.length, 0),
      runTotal: G.raw.records.length,
      avgVisibility: G.CLIENTS.length ? Math.round(G.CLIENTS.reduce((a, c) => a + c.kpi.visibility, 0) / G.CLIENTS.length) : 0,
    };
  };

  G.subscribe = fn => { G._subs.push(fn); return () => { G._subs = G._subs.filter(f => f !== fn); }; };
  G.bump = function () { G.recompute(); G._subs.forEach(f => f()); };

  /* ---------- 持久化 ---------- */
  G.saveLocal = function () {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(G.raw)); } catch (e) {}
  };
  G.loadLocal = function () {
    try {
      const s = localStorage.getItem(STORE_KEY);
      if (s) { G.raw = JSON.parse(s); return true; }
    } catch (e) {}
    return false;
  };
  G.applyData = function (data) {
    if (!data || !data.clients || !data.records) return false;
    G.raw = { meta: data.meta || { lastUpdated: "2026-06-01" }, clients: data.clients, records: data.records };
    return true;
  };
  G.exportJSON = function () {
    return JSON.stringify({ meta: { ...G.raw.meta, exportedAt: new Date().toISOString() },
      clients: G.raw.clients, records: G.raw.records }, null, 2);
  };
  async function fetchPublished() {
    try {
      const res = await fetch("geo-data.json", { cache: "no-store" });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) { return null; }
  }

  // mode: 'client' 优先已发布数据; 否则优先本地工作副本
  G.init = async function (mode) {
    if (mode === "client") {
      const pub = await fetchPublished();
      if (pub && G.applyData(pub)) { G.recompute(); return "published"; }
      if (G.loadLocal()) { G.recompute(); return "local"; }
    } else {
      if (G.loadLocal()) { G.recompute(); return "local"; }
      const pub = await fetchPublished();
      if (pub && G.applyData(pub)) { G.recompute(); return "published"; }
    }
    G.recompute();
    return "seed";
  };

  /* ---------- 客户增删改 ---------- */
  G.addClient = function (def) {
    const id = def.id || uid("c");
    const c = {
      id, name: def.name || "新客户", en: def.en || "", industry: def.industry || "未分类",
      glyph: def.glyph || (def.name ? def.name[0] : "新"), hue: def.hue != null ? def.hue : 250,
      competitors: def.competitors || [], platformIds: def.platformIds && def.platformIds.length ? def.platformIds : ALL_PLATFORMS.map(p => p.id),
      prompts: def.prompts || [],
    };
    G.raw.clients.push(c); G.saveLocal(); G.bump(); return id;
  };
  G.updateClient = function (id, patch) {
    const c = G.raw.clients.find(x => x.id === id);
    if (!c) return;
    Object.assign(c, patch); G.saveLocal(); G.bump();
  };
  G.removeClient = function (id) {
    G.raw.clients = G.raw.clients.filter(c => c.id !== id);
    G.raw.records = G.raw.records.filter(r => r.clientId !== id);
    G.saveLocal(); G.bump();
  };

  /* ---------- 记录增删改 ---------- */
  G.addRecord = function (rec) {
    const r = { id: uid("r"), clientId: rec.clientId, prompt: rec.prompt, platform: rec.platform,
      mentioned: !!rec.mentioned, rank: rec.mentioned ? (rec.rank || null) : null,
      sentiment: rec.sentiment || "pos", cited: !!rec.cited, sources: rec.sources || 0,
      date: rec.date || G.lastUpdated };
    G.raw.records.unshift(r); G.saveLocal(); G.bump(); return r.id;
  };
  G.updateRecord = function (id, patch) {
    const r = G.raw.records.find(x => x.id === id);
    if (!r) return;
    Object.assign(r, patch);
    if (!r.mentioned) { r.rank = null; }
    G.saveLocal(); G.bump();
  };
  G.removeRecord = function (id) {
    G.raw.records = G.raw.records.filter(r => r.id !== id);
    G.saveLocal(); G.bump();
  };
  G.recordsFor = function (clientId) {
    return G.raw.records.filter(r => r.clientId === clientId);
  };

  G.recompute();
  window.GEO = G;
})();
