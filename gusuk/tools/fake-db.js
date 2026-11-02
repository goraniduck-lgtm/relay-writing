/* 시험용 가짜 데이터베이스 — 브라우저 시험에서 Firebase 대신 씀 (localStorage 공유, 탭끼리 실시간 반영)
   사용: Playwright addInitScript 로 이 파일을 먼저 넣고 ?uid=xxx 로 기기 구분 */
(function () {
  const KEY = '__fakedb__';
  const T_UID = 'VNW0t5e67CfInsF63jATWdBsaqG2';
  const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } };
  let tree = load();
  const parts = p => String(p || '').split('/').filter(Boolean);
  const getAt = (t, ps) => { for (const k of ps) { if (t == null || typeof t !== 'object') return null; t = t[k]; } return t === undefined ? null : t; };
  const norm = v => { if (v === null || typeof v !== 'object') return v === undefined ? null : v; const o = {}; for (const [k, x] of Object.entries(v)) { const n = norm(x); if (n !== null) o[k] = n; } return Object.keys(o).length ? o : null; };
  const ts = v => { if (v && typeof v === 'object') { if (v['.sv'] === 'timestamp') return Date.now(); const o = Array.isArray(v) ? [] : {}; for (const k in v) o[k] = ts(v[k]); return o; } return v; };
  function setAt(t, ps, v) { if (!ps.length) return v; const o = t && typeof t === 'object' ? Object.assign({}, t) : {}; o[ps[0]] = setAt(o[ps[0]], ps.slice(1), v); return o; }
  const subs = [];
  const fire = () => subs.forEach(s => { const v = JSON.stringify(getAt(tree, parts(s.p))); if (v !== s.last) { s.last = v; s.cb(JSON.parse(v)); } });
  window.addEventListener('storage', e => { if (e.key === KEY) { tree = load(); fire(); } });
  const save = () => { tree = norm(tree) || {}; localStorage.setItem(KEY, JSON.stringify(tree)); fire(); };
  const qs = new URLSearchParams(location.search);
  let uid = qs.get('uid') || sessionStorage.getItem('__fakeuid') || ('u' + Math.random().toString(36).slice(2, 8));
  sessionStorage.setItem('__fakeuid', uid);
  const perm = () => { const e = new Error('PERMISSION_DENIED: fake'); e.code = 'PERMISSION_DENIED'; return e; };
  const isAdm = () => uid === T_UID || (getAt(tree, ['gusuk', 'secret', 'pin']) != null && getAt(tree, ['gusuk', 'adm', uid]) === getAt(tree, ['gusuk', 'secret', 'pin']));
  function guard(path, v) {   // 규칙 일부만 흉내 (PIN·관리자 쓰기)
    const ps = parts(path);
    if (ps[0] !== 'gusuk') return;
    if (ps[1] === 'adm') { if (ps[2] !== uid) throw perm(); if (v != null && v !== getAt(tree, ['gusuk', 'secret', 'pin'])) throw perm(); return; }
    if (ps[1] === 'secret') { if (!(uid === T_UID || isAdm())) throw perm(); return; }
    if (ps[1] === 'dev' && ps[2] === uid && getAt(tree, ps) == null) return;
    if (ps[1] === 'cards') {
      if (isAdm()) return;
      const cur = getAt(tree, ps.slice(0, 3));
      const myg = getAt(tree, ['gusuk', 'dev', uid]);
      if (getAt(tree, ['gusuk', 'cfg', 'lock'])) throw perm();
      if (v && v.g === myg && (!cur || (cur.g === myg && cur.st !== 'ok'))) return;
      throw perm();
    }
    if (!isAdm()) throw perm();
  }
  window.__FAKE_DB__ = {
    async ready() { return { uid }; },
    uid: () => uid,
    isTeacherAccount: () => uid === T_UID,
    async teacherLogin(pw) { if (pw !== 'teacher-pw') throw new Error('auth/wrong-password'); uid = T_UID; sessionStorage.setItem('__fakeuid', uid); return { uid }; },
    on(path, cb) { const s = { p: path, cb, last: undefined }; subs.push(s); setTimeout(() => { s.last = JSON.stringify(getAt(tree, parts(path))); cb(JSON.parse(s.last)); }, 0); return () => subs.splice(subs.indexOf(s), 1); },
    async get(path) { return JSON.parse(JSON.stringify(getAt(tree, parts(path)))); },
    async set(path, v) { tree = load(); v = ts(v); guard(path, v); tree = setAt(tree, parts(path), v); save(); },
    async update(path, obj) { tree = load(); obj = ts(obj); for (const [k, v] of Object.entries(obj)) guard(path + '/' + k, v); for (const [k, v] of Object.entries(obj)) tree = setAt(tree, parts(path + '/' + k), v); save(); },
    async remove(path) { tree = load(); guard(path, null); tree = setAt(tree, parts(path), null); save(); },
    key: () => 'k' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    connected(cb) { cb(true); },
    TS: { '.sv': 'timestamp' }
  };
})();
