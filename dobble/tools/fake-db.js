/* 시험용 가짜 데이터베이스 — 브라우저 시험에서 Firebase 대신 씀 (localStorage 공유, 탭끼리 실시간 반영)
   사용: Playwright addInitScript 로 이 파일을 먼저 넣고 ?uid=xxx&lag=ms 로 기기·지연 정함 */
(function () {
  const KEY = '__fakedb_dobble__';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  let tree = load();
  const parts = p => String(p || '').split('/').filter(Boolean);
  const getAt = (t, ps) => { for (const k of ps) { if (t == null || typeof t !== 'object') return null; t = t[k]; } return t === undefined ? null : t; };
  const norm = v => { if (v === null || typeof v !== 'object') return v === undefined ? null : v; const o = {}; for (const [k, x] of Object.entries(v)) { const n = norm(x); if (n !== null) o[k] = n; } return Object.keys(o).length ? o : null; };
  const ts = v => { if (v && typeof v === 'object') { if (v['.sv'] === 'timestamp') return Date.now(); const o = {}; for (const k in v) o[k] = ts(v[k]); return o; } return v; };
  function setAt(t, ps, v) { if (!ps.length) return v; const o = t && typeof t === 'object' ? Object.assign({}, t) : {}; o[ps[0]] = setAt(o[ps[0]], ps.slice(1), v); return o; }
  const qs = new URLSearchParams(location.search);
  const lag = +(qs.get('lag') || 0);
  const later = f => (lag ? setTimeout(f, lag * (0.7 + Math.random() * 0.6)) : f());
  const subs = [];
  const fire = () => subs.forEach(s => { const v = JSON.stringify(getAt(tree, parts(s.p))); if (v !== s.last) { s.last = v; const val = JSON.parse(v); later(() => s.cb(val)); } });
  window.addEventListener('storage', e => { if (e.key === KEY) { tree = load(); fire(); } });
  const save = () => { tree = norm(tree) || {}; localStorage.setItem(KEY, JSON.stringify(tree)); fire(); };
  const uid = qs.get('uid') || ('u' + Math.random().toString(36).slice(2, 8));
  const perm = () => { const e = new Error('PERMISSION_DENIED: fake'); e.code = 'PERMISSION_DENIED'; return e; };
  const delay = () => new Promise(r => later(r));
  window.__FAKE_LOG__ = [];
  window.__FAKE_DB__ = {
    async ready() { return { uid }; },
    uid: () => uid,
    now: () => Date.now(),
    on(path, cb) { const s = { p: path, cb, last: undefined }; subs.push(s); setTimeout(() => { tree = load(); s.last = JSON.stringify(getAt(tree, parts(path))); cb(JSON.parse(s.last)); }, 0); return () => { const i = subs.indexOf(s); if (i >= 0) subs.splice(i, 1); }; },
    async get(path) { await delay(); tree = load(); return JSON.parse(JSON.stringify(getAt(tree, parts(path)))); },
    async set(path, v) {
      await delay(); tree = load();
      const ps = parts(path);
      if (ps[0] === 'dobble' && ps.length === 3 && v && getAt(tree, ps)) throw perm();      // 이미 있는 방
      if (ps[3] === 'seats' && ps[4] === 'b' && getAt(tree, ps)) throw perm();
      tree = setAt(tree, ps, ts(v)); save();
    },
    async update(path, obj) { await delay(); tree = load(); obj = ts(obj); for (const [k, v] of Object.entries(obj)) tree = setAt(tree, parts(path + '/' + k), v); save(); },
    async remove(path) { await delay(); tree = load(); tree = setAt(tree, parts(path), null); save(); },
    async claim(path, v) {
      await delay();
      /* 서버처럼 한 곳에서 먼저 온 쪽만 받음 (Playwright 가 __serverClaim 을 넣어 줌) */
      tree = load();
      const ok = window.__serverClaim ? await window.__serverClaim(path, v) : getAt(tree, parts(path)) === null;
      if (ok) { tree = load(); tree = setAt(tree, parts(path), v); save(); }
      window.__FAKE_LOG__.push({ path, v, ok, t: Date.now() });
      await delay();
      return ok;
    },
    async whileOnline(path, v) { return this.set(path, v); },
    connected(cb) { cb(true); },
    TS: { '.sv': 'timestamp' }
  };
})();
