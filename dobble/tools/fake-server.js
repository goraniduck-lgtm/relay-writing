/* 시험용 가짜 서버 — Playwright 브라우저 묶음(context)에 하나. 모든 태블릿(탭)이 이 한 곳에 읽고 씀
   (탭마다 localStorage 를 고치면 동시에 쓸 때 기록이 사라질 수 있어서)
   사용: const srv = await require('./fake-server')(ctx);  → fake-db.js 가 window.__serverOp 로 씀 */
'use strict';
module.exports = async function install(ctx) {
  let tree = {};
  const log = [];
  const parts = p => String(p || '').split('/').filter(Boolean);
  const getAt = (t, ps) => { for (const k of ps) { if (t == null || typeof t !== 'object') return null; t = t[k]; } return t === undefined ? null : t; };
  const setAt = (t, ps, v) => { if (!ps.length) return v; const o = t && typeof t === 'object' ? Object.assign({}, t) : {}; o[ps[0]] = setAt(o[ps[0]], ps.slice(1), v); return o; };
  const norm = v => { if (v === null || typeof v !== 'object') return v === undefined ? null : v; const o = {}; for (const [k, x] of Object.entries(v)) { const n = norm(x); if (n !== null) o[k] = n; } return Object.keys(o).length ? o : null; };
  const ts = v => { if (v && typeof v === 'object') { if (v['.sv'] === 'timestamp') return Date.now(); const o = {}; for (const k in v) o[k] = ts(v[k]); return o; } return v; };
  await ctx.exposeFunction('__serverOp', (op, path, v) => {
    const ps = parts(path);
    let ok = true;
    if (op !== 'get') {
      v = ts(v);
      if (op === 'set') {
        if (ps[0] === 'dobble' && ps.length === 3 && v && getAt(tree, ps)) ok = false;                     // 이미 있는 방
        else if (ps[3] === 'seats' && ps[4] && v && getAt(tree, ps)) ok = false;                            // 이미 누가 앉은 자리
        else if (ps[3] === 'claims' && ps.length === 6 && v != null &&
          (getAt(tree, ps) != null || getAt(tree, ps.slice(0, 5).concat('win')) != null)) ok = false;      // 기록은 한 번, 확정 전에만
        else tree = setAt(tree, ps, v);
      } else if (op === 'update') { for (const [k, x] of Object.entries(v)) tree = setAt(tree, parts(path + '/' + k), x); }
      else if (op === 'remove') tree = setAt(tree, ps, null);
      else if (op === 'decide') {   /* 판 확정: 서버 최신 기록 중 가장 빠른 자리 */
        const cur = getAt(tree, ps);
        if (!cur || cur.win) ok = false;
        else { let best = null; for (const k of 'abcdef') if (typeof cur[k] === 'number' && (best === null || cur[k] < cur[best])) best = k; if (best) tree = setAt(tree, ps.concat('win'), best); else ok = false; }
        log.push({ path: path + '/win', v: ok ? getAt(tree, ps.concat('win')) : null, ok, t: Date.now() });
      }
      else if (op === 'claim') { if (getAt(tree, ps) === null) tree = setAt(tree, ps, v); else ok = false; log.push({ path, v, ok, t: Date.now() }); }
      tree = norm(tree) || {};
    }
    return { tree, ok };
  });
  return { get tree() { return tree; }, log, reset() { tree = {}; log.length = 0; } };
};
