/* 시험용 간이 Realtime Database 규칙 계산기 (Firebase 의미를 단순화해 흉내 냄)
   - .read/.write: 경로 위쪽(루트→대상) 어느 하나라도 true 면 허용
   - .validate: 바뀐 위치의 조상·자신·자손 중 값이 있는 노드마다 모두 통과해야 함
   - update(여러 경로): 경로마다 .write 를 따로 보고, newData 는 전체 결과 */
'use strict';
const clone = v => (v === undefined ? null : JSON.parse(JSON.stringify(v)));
const norm = v => { // 빈 객체·null 정리
  if (v === null || typeof v !== 'object') return v === undefined ? null : v;
  const o = {};
  for (const [k, x] of Object.entries(v)) { const n = norm(x); if (n !== null) o[k] = n; }
  return Object.keys(o).length ? o : null;
};
const parts = p => String(p || '').split('/').filter(Boolean);
function getAt(tree, ps) { let t = tree; for (const k of ps) { if (t == null || typeof t !== 'object') return null; t = t[k]; } return t === undefined ? null : t; }
function setAt(tree, ps, v) {
  if (!ps.length) return clone(v);
  const out = tree && typeof tree === 'object' ? { ...tree } : {};
  out[ps[0]] = setAt(out[ps[0]], ps.slice(1), v);
  return out;
}
class Snap {
  constructor(tree, ps) { this.t = tree; this.ps = ps; }
  v() { return getAt(this.t, this.ps); }
  val() { const v = this.v(); return v; }
  exists() { return this.v() !== null; }
  child(p) { return new Snap(this.t, this.ps.concat(parts(p))); }
  parent() { return new Snap(this.t, this.ps.slice(0, -1)); }
  hasChild(p) { return this.child(p).exists(); }
  hasChildren(a) { const v = this.v(); if (!a) return !!v && typeof v === 'object'; return a.every(k => this.child(k).exists()); }
  isString() { return typeof this.v() === 'string'; }
  isNumber() { return typeof this.v() === 'number'; }
  isBoolean() { return typeof this.v() === 'boolean'; }
}
function rulesFor(rules, ps) { // 루트부터 각 단계의 [규칙노드, 변수]
  const chain = [{ node: rules, vars: {} }];
  let node = rules, vars = {};
  for (const k of ps) {
    if (!node) { chain.push({ node: null, vars }); continue; }
    if (Object.prototype.hasOwnProperty.call(node, k)) { node = node[k]; }
    else {
      const w = Object.keys(node).find(x => x[0] === '$');
      if (w) { vars = { ...vars, [w]: k }; node = node[w]; } else node = null;
    }
    chain.push({ node, vars });
  }
  return chain;
}
function evalExpr(expr, ctx) {
  if (expr === true || expr === false) return expr;
  const names = Object.keys(ctx.vars);
  const S = String.prototype;
  const had = [S.matches, S.beginsWith, S.contains];
  S.matches = function (re) { return re.test(String(this)); };
  S.beginsWith = function (x) { return String(this).startsWith(x); };
  S.contains = function (x) { return String(this).includes(x); };
  try {
    // eslint-disable-next-line no-new-func
    const f = new Function('auth', 'root', 'data', 'newData', 'now', ...names, `return (${expr});`);
    return !!f(ctx.auth, ctx.root, ctx.data, ctx.newData, ctx.now, ...names.map(n => ctx.vars[n]));
  } catch (e) { return false; } finally { [S.matches, S.beginsWith, S.contains] = had; }
}
class FakeDb {
  constructor(rules, init) { this.rules = rules.rules || rules; this.tree = norm(clone(init || {})); this.now = 1700000000000; }
  ctx(auth, ps, vars, newTree) {
    return { auth, vars, now: this.now, root: new Snap(this.tree, []), data: new Snap(this.tree, ps), newData: new Snap(newTree, ps) };
  }
  canRead(auth, path) {
    const ps = parts(path), chain = rulesFor(this.rules, ps);
    return chain.some((c, i) => c.node && c.node['.read'] !== undefined && evalExpr(c.node['.read'], this.ctx(auth, ps.slice(0, i), c.vars, this.tree)));
  }
  read(auth, path) { if (!this.canRead(auth, path)) throw new Error('PERMISSION_DENIED read ' + path); return clone(getAt(this.tree, parts(path))); }
  validateTree(auth, newTree, ps) {
    // 조상
    const chain = rulesFor(this.rules, ps);
    for (let i = 0; i <= ps.length; i++) {
      const c = chain[i], sub = ps.slice(0, i);
      if (getAt(newTree, sub) === null) continue;
      if (c.node && c.node['.validate'] !== undefined && !evalExpr(c.node['.validate'], this.ctx(auth, sub, c.vars, newTree))) return 'validate ' + sub.join('/');
    }
    // 자손
    const walk = (node, vars, sub) => {
      const v = getAt(newTree, sub);
      if (v === null || typeof v !== 'object') return null;
      for (const k of Object.keys(v)) {
        let n = null, vv = vars;
        if (node && Object.prototype.hasOwnProperty.call(node, k)) n = node[k];
        else if (node) { const w = Object.keys(node).find(x => x[0] === '$'); if (w) { n = node[w]; vv = { ...vars, [w]: k }; } }
        const cs = sub.concat(k);
        if (n && n['.validate'] !== undefined && !evalExpr(n['.validate'], this.ctx(auth, cs, vv, newTree))) return 'validate ' + cs.join('/');
        const r = walk(n, vv, cs); if (r) return r;
      }
      return null;
    };
    return walk(chain[ps.length].node, chain[ps.length].vars, ps);
  }
  update(auth, base, obj) {
    let newTree = this.tree;
    const writes = Object.entries(obj).map(([k, v]) => [parts(base).concat(parts(k)), v]);
    for (const [ps, v] of writes) newTree = setAt(newTree, ps, v === undefined ? null : v);
    newTree = norm(newTree);
    for (const [ps] of writes) {
      const chain = rulesFor(this.rules, ps);
      const ok = chain.some((c, i) => c.node && c.node['.write'] !== undefined && evalExpr(c.node['.write'], this.ctx(auth, ps.slice(0, i), c.vars, newTree)));
      if (!ok) throw new Error('PERMISSION_DENIED write ' + ps.join('/'));
      const bad = this.validateTree(auth, newTree, ps);
      if (bad) throw new Error('PERMISSION_DENIED ' + bad);
    }
    this.tree = newTree;
  }
  set(auth, path, v) { this.update(auth, '', { [path]: v }); }
}
module.exports = { FakeDb };
