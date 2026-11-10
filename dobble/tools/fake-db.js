/* 시험용 가짜 데이터베이스 — 브라우저 시험에서 Firebase 대신 씀
   - Playwright 가 window.__serverOp (tools/fake-server.js) 를 넣어 주면: 그 한 곳이 진짜 데이터, 탭끼리는 localStorage 신호로 알림
   - 없으면: localStorage 를 데이터로 씀 (탭 하나짜리 간단한 시험용)
   ?uid=xxx&lag=ms 로 기기·인터넷 지연(보내기·받기 모두) 정함 */
(function () {
  const KEY = '__fakedb_dobble__';
  const qs = new URLSearchParams(location.search);
  const lag = +(qs.get('lag') || 0);
  const later = f => (lag ? setTimeout(f, lag * (0.7 + Math.random() * 0.6)) : f());
  const delay = () => new Promise(r => later(r));
  const parts = p => String(p || '').split('/').filter(Boolean);
  const getAt = (t, ps) => { for (const k of ps) { if (t == null || typeof t !== 'object') return null; t = t[k]; } return t === undefined ? null : t; };
  const setAt = (t, ps, v) => { if (!ps.length) return v; const o = t && typeof t === 'object' ? Object.assign({}, t) : {}; o[ps[0]] = setAt(o[ps[0]], ps.slice(1), v); return o; };
  const norm = v => { if (v === null || typeof v !== 'object') return v === undefined ? null : v; const o = {}; for (const [k, x] of Object.entries(v)) { const n = norm(x); if (n !== null) o[k] = n; } return Object.keys(o).length ? o : null; };
  const ts = v => { if (v && typeof v === 'object') { if (v['.sv'] === 'timestamp') return Date.now(); const o = {}; for (const k in v) o[k] = ts(v[k]); return o; } return v; };
  const perm = () => { const e = new Error('PERMISSION_DENIED: fake'); e.code = 'PERMISSION_DENIED'; return e; };
  const uid = qs.get('uid') || ('u' + Math.random().toString(36).slice(2, 8));
  const remote = typeof window.__serverOp === 'function';
  const loadLocal = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  let tree = remote ? {} : loadLocal();
  const subs = [];
  const fire = () => subs.forEach(s => { const v = JSON.stringify(getAt(tree, parts(s.p))); if (v !== s.last) { s.last = v; const val = JSON.parse(v); later(() => s.cb(val)); } });
  const ping = () => { try { localStorage.setItem(KEY + ':tick', Date.now() + ':' + Math.random()); } catch (e) {} };
  async function op(name, path, v) {
    if (remote) { const r = await window.__serverOp(name, path, v === undefined ? null : v); tree = r.tree || {}; if (name !== 'get') ping(); fire(); return r.ok; }
    tree = loadLocal();
    const ps = parts(path); let ok = true; v = ts(v);
    if (name === 'set') {
      if (ps[0] === 'dobble' && ps.length === 3 && v && getAt(tree, ps)) ok = false;
      else if (ps[3] === 'seats' && ps[4] && v && getAt(tree, ps)) ok = false;
      else if (ps[3] === 'claims' && ps.length === 6 && v != null && (getAt(tree, ps) != null || getAt(tree, ps.slice(0, 5).concat('win')) != null)) ok = false;
      else tree = setAt(tree, ps, v);
    } else if (name === 'update') { for (const [k, x] of Object.entries(v)) tree = setAt(tree, parts(path + '/' + k), x); }
    else if (name === 'remove') tree = setAt(tree, ps, null);
    else if (name === 'claim') { if (getAt(tree, ps) === null) tree = setAt(tree, ps, v); else ok = false; }
    tree = norm(tree) || {};
    if (name !== 'get') { localStorage.setItem(KEY, JSON.stringify(tree)); fire(); }
    return ok;
  }
  window.addEventListener('storage', async e => {
    if (remote && e.key === KEY + ':tick') { await op('get'); }
    else if (!remote && e.key === KEY) { tree = loadLocal(); fire(); }
  });
  window.__FAKE_LOG__ = [];
  window.__FAKE_DB__ = {
    async ready() { return { uid }; },
    uid: () => uid,
    now: () => Date.now(),
    on(path, cb) {
      const s = { p: path, cb, last: undefined }; subs.push(s);
      setTimeout(async () => { if (remote) await op('get'); else tree = loadLocal(); s.last = JSON.stringify(getAt(tree, parts(path))); cb(JSON.parse(s.last)); }, 0);
      return () => { const i = subs.indexOf(s); if (i >= 0) subs.splice(i, 1); };
    },
    async get(path) { await delay(); await op('get'); return JSON.parse(JSON.stringify(getAt(tree, parts(path)))); },
    async set(path, v) { await delay(); if (!(await op('set', path, v))) throw perm(); },
    async update(path, obj) { await delay(); await op('update', path, obj); },
    async remove(path) { await delay(); await op('remove', path); },
    async claim(path, v) { await delay(); const ok = await op('claim', path, v); window.__FAKE_LOG__.push({ path, v, ok, t: Date.now() }); await delay(); return ok; },
    async decide(path, pick) {   /* 탭 하나짜리 모드에서는 여기서 계산, 서버 모드에서는 서버가 계산 (참가자 확인은 앱이 미리 함) */
      await delay();
      let ok;
      if (remote) ok = await op('decide', path);
      else { tree = loadLocal(); const cur = getAt(tree, parts(path)); const w = cur && !cur.win ? pick(cur) : null; ok = !!w && (await op('claim', path + '/win', w)); }
      window.__FAKE_LOG__.push({ path: path + '/win', ok, t: Date.now() });
      await delay(); return ok;
    },
    async whileOnline(path, v) { return this.set(path, v).catch(() => {}); },
    connected(cb) { cb(true); },
    TS: { '.sv': 'timestamp' }
  };
})();
