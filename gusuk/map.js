/* 구석구석 — 백지도 (SVG): 칠하기·확대/이동·지역 고르기 */
'use strict';
const SVGNS = 'http://www.w3.org/2000/svg';
const PAD = 14;
const FULL = { x: MAP_BOUNDS[0] - PAD, y: MAP_BOUNDS[1] - PAD, w: MAP_BOUNDS[2] - MAP_BOUNDS[0] + PAD * 2, h: MAP_BOUNDS[3] - MAP_BOUNDS[1] + PAD * 2 };

/* 모둠 무늬 (색이 비슷해 보여도 구분되게) */
function groupPatterns(prefix) {
  const marks = {
    0: '',
    1: '',
    2: '<path d="M-1,1 l2,-2 M0,8 l8,-8 M7,9 l2,-2" stroke="#fff" stroke-opacity=".45" stroke-width="1.4"/>',
    3: '<circle cx="4" cy="4" r="1.3" fill="#7a5a00" fill-opacity=".35"/>',
    4: '<path d="M0,4 h8" stroke="#fff" stroke-opacity=".45" stroke-width="1.4"/>',
    5: '<path d="M0,4 h8 M4,0 v8" stroke="#fff" stroke-opacity=".4" stroke-width="1.1"/>',
    6: '<path d="M4,0 v8" stroke="#fff" stroke-opacity=".45" stroke-width="1.4"/>'
  };
  return Object.keys(GROUPS).map(g => `<pattern id="${prefix}pg${g}" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="${GROUPS[g].c}"/>${marks[g] || ''}</pattern>`).join('');
}

class GMap {
  constructor(host, opt) {
    this.host = host; this.opt = Object.assign({ interactive: true, labels: true, onPick: null, prefix: 'm' + Math.random().toString(36).slice(2, 6) }, opt || {});
    this.vb = Object.assign({}, FULL);
    this.info = {}; this.sel = null; this.home = null; this.focusGroup = null; this.choro = null;
    this.build();
    if (this.opt.interactive) this.bind();
    this.apply();
  }
  build() {
    const p = this.opt.prefix;
    const regs = REGIONS.map(r => `<path class="rg" data-k="${r.k}" d="${r.d}"/>`).join('');
    const sidos = SIDO.map(s => `<path class="sd" d="${s.d}"/>`).join('');
    const b = ULL_BOX;
    this.host.innerHTML = `<svg class="gmap" xmlns="${SVGNS}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="대한민국 지도">
      <defs>${groupPatterns(p)}
        <filter id="${p}glow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="0" stdDeviation="2.2" flood-color="#000" flood-opacity=".35"/></filter></defs>
      <rect class="sea" x="-500" y="-500" width="2000" height="2200"/>
      <g class="ull"><rect x="${b[0]}" y="${b[1]}" width="${b[2] - b[0]}" height="${b[3] - b[1]}" rx="4"/><text x="${b[0] + 3}" y="${b[3] - 3}">울릉도·독도</text></g>
      <g class="regions">${regs}</g>
      <g class="halves"></g>
      <g class="sidos">${sidos}</g>
      <g class="dots"></g>
      <g class="selg"></g>
      <g class="labels"></g>
      <g class="homeg"></g>
    </svg>
    ${this.opt.interactive ? `<div class="zoombtns"><button type="button" data-z="in" aria-label="크게">＋</button><button type="button" data-z="out" aria-label="작게">－</button><button type="button" data-z="all" class="zall">전국</button></div>` : ''}`;
    this.svg = this.host.querySelector('svg');
    this.paths = {};
    this.svg.querySelectorAll('.rg').forEach(el => { this.paths[el.dataset.k] = el; });
    if (this.opt.interactive) this.host.querySelectorAll('[data-z]').forEach(bt => bt.addEventListener('click', () => {
      const z = bt.dataset.z;
      if (z === 'all') this.zoomTo(null);
      else this.zoomBy(z === 'in' ? 0.65 : 1 / 0.65);
    }));
  }
  /* ---- 화면 좌표 ↔ 지도 좌표 ---- */
  scale() { const r = this.svg.getBoundingClientRect(); return Math.min(r.width / this.vb.w, r.height / this.vb.h) || 1; }
  toMap(cx, cy) {
    const r = this.svg.getBoundingClientRect(), s = this.scale();
    const ox = (r.width - this.vb.w * s) / 2, oy = (r.height - this.vb.h * s) / 2;
    return [this.vb.x + (cx - r.left - ox) / s, this.vb.y + (cy - r.top - oy) / s];
  }
  clamp() {
    const v = this.vb;
    const maxW = FULL.w * 1.15, minW = 34;
    const k = v.w > maxW ? maxW / v.w : v.w < minW ? minW / v.w : 1;
    if (k !== 1) { const cx = v.x + v.w / 2, cy = v.y + v.h / 2; v.w *= k; v.h *= k; v.x = cx - v.w / 2; v.y = cy - v.h / 2; }
    const cx = Math.min(Math.max(v.x + v.w / 2, FULL.x), FULL.x + FULL.w), cy = Math.min(Math.max(v.y + v.h / 2, FULL.y), FULL.y + FULL.h);
    v.x = cx - v.w / 2; v.y = cy - v.h / 2;
  }
  apply() {
    const v = this.vb;
    this.svg.setAttribute('viewBox', `${v.x.toFixed(2)} ${v.y.toFixed(2)} ${v.w.toFixed(2)} ${v.h.toFixed(2)}`);
    const s = this.scale();
    this.svg.style.setProperty('--u', (1 / s).toFixed(4));   // 화면 1px 의 지도 길이
    this.unit = 1 / s;
    clearTimeout(this._lt); this._lt = setTimeout(() => this.drawLabels(), 60);
    this.drawDots();
    this.drawSel();
    this.drawHome();
  }
  zoomBy(f, px, py) {
    const v = this.vb;
    if (px == null) { px = v.x + v.w / 2; py = v.y + v.h / 2; }
    v.x = px - (px - v.x) * f; v.y = py - (py - v.y) * f; v.w *= f; v.h *= f;
    this.clamp(); this.apply();
  }
  zoomTo(b, now) {
    let t;
    if (!b) t = Object.assign({}, FULL);
    else {
      const pad = Math.max(b[2] - b[0], b[3] - b[1]) * 0.12 + 8;
      t = { x: b[0] - pad, y: b[1] - pad, w: b[2] - b[0] + pad * 2, h: b[3] - b[1] + pad * 2 };
      const r = this.svg.getBoundingClientRect(), ar = (r.width || 1) / (r.height || 1);
      if (t.w / t.h < ar) { const nw = t.h * ar; t.x -= (nw - t.w) / 2; t.w = nw; } else { const nh = t.w / ar; t.y -= (nh - t.h) / 2; t.h = nh; }
    }
    cancelAnimationFrame(this._raf);
    const from = Object.assign({}, this.vb), t0 = performance.now(), D = now ? 0 : 380;
    const step = tm => {
      const k = D ? Math.min(1, (tm - t0) / D) : 1, e = 1 - Math.pow(1 - k, 3);
      ['x', 'y', 'w', 'h'].forEach(q => { this.vb[q] = from[q] + (t[q] - from[q]) * e; });
      this.apply();
      if (k < 1) this._raf = requestAnimationFrame(step);
    };
    this._raf = requestAnimationFrame(step);
  }
  zoomLevel() { return FULL.w / this.vb.w; }
  /* ---- 터치·마우스 ---- */
  bind() {
    const pts = new Map(); let last = null, moved = 0, pinch = null;
    const svg = this.svg;
    svg.addEventListener('pointerdown', e => {
      svg.setPointerCapture(e.pointerId);
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 1) { last = [e.clientX, e.clientY]; moved = 0; this._downT = e.target; }
      if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a[0] - b[0], a[1] - b[1]); moved = 99; }
    });
    svg.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId)) return;
      pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 2 && pinch) {
        const [a, b] = [...pts.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]);
        const [mx, my] = this.toMap((a[0] + b[0]) / 2, (a[1] + b[1]) / 2);
        if (d > 0) this.zoomBy(pinch / d, mx, my);
        pinch = d; return;
      }
      if (pts.size === 1 && last) {
        const dx = e.clientX - last[0], dy = e.clientY - last[1];
        moved += Math.abs(dx) + Math.abs(dy);
        if (moved > 6) { const s = this.scale(); this.vb.x -= dx / s; this.vb.y -= dy / s; this.clamp(); this.apply(); svg.classList.add('dragging'); }
        last = [e.clientX, e.clientY];
      }
    });
    const up = e => {
      if (!pts.has(e.pointerId)) return;
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch = null;
      if (pts.size === 0) {
        svg.classList.remove('dragging');
        if (moved <= 6 && e.type === 'pointerup') this.tap(e);
        last = null;
      }
    };
    svg.addEventListener('pointerup', up); svg.addEventListener('pointercancel', up);
    svg.addEventListener('wheel', e => { e.preventDefault(); const [mx, my] = this.toMap(e.clientX, e.clientY); this.zoomBy(e.deltaY > 0 ? 1.18 : 1 / 1.18, mx, my); }, { passive: false });
    window.addEventListener('resize', () => this.apply());
  }
  tap(e) {
    let el = document.elementFromPoint(e.clientX, e.clientY);
    let k = el && el.closest ? (el.closest('[data-k]') || {}).dataset : null;
    k = k && k.k;
    if (!k) {   // 작은 섬·점 근처를 눌렀을 때: 가장 가까운 지역 이름표
      const [mx, my] = this.toMap(e.clientX, e.clientY); let best = null, bd = 18 * this.unit;
      REGIONS.forEach(r => { const d = Math.hypot(r.l[0] - mx, r.l[1] - my); if (d < bd) { bd = d; best = r.k; } });
      k = best;
    }
    if (k && this.opt.onPick) this.opt.onPick(k);
  }
  /* ---- 칠하기 ---- */
  setPaint(info) {
    this.info = info || {};
    const p = this.opt.prefix;
    for (const [k, el] of Object.entries(this.paths)) {
      const x = this.info[k];
      el.style.fill = x ? `url(#${p}pg${x.first})` : '';
      el.classList.toggle('painted', !!x);
    }
    /* 가장 많이 등록한 모둠이 처음 모둠과 다르면 오른쪽 절반을 그 모둠 색으로 */
    let h = '';
    for (const r of REGIONS) {
      const x = this.info[r.k]; if (!x || x.most === x.first) continue;
      const mid = ((r.b[0] + r.b[2]) / 2).toFixed(1), y0 = (r.b[1] - 2).toFixed(1), y1 = (r.b[3] + 2).toFixed(1);
      h += `<g class="half" data-k="${r.k}"><clipPath id="${p}hc${r.k}"><rect x="${mid}" y="${y0}" width="${(r.b[2] - mid + 2).toFixed(1)}" height="${(y1 - y0).toFixed(1)}"/></clipPath><clipPath id="${p}hr${r.k}"><path d="${r.d}"/></clipPath>` +
        `<path d="${r.d}" fill="url(#${p}pg${x.most})" clip-path="url(#${p}hc${r.k})"/><line x1="${mid}" y1="${y0}" x2="${mid}" y2="${y1}" clip-path="url(#${p}hr${r.k})"/></g>`;
    }
    this.svg.querySelector('.halves').innerHTML = h;
    this.drawDots(); this.drawLabels(); this.applyFocus();
  }
  setFocusGroup(g) { this.focusGroup = g; this.applyFocus(); }
  applyFocus() {
    const g = this.focusGroup;
    for (const [k, el] of Object.entries(this.paths)) {
      const x = this.info[k];
      el.classList.toggle('dim', g != null && !(x && x.groups.includes(g)));
    }
    this.svg.querySelectorAll('.half').forEach(el => { const x = this.info[el.dataset.k]; el.classList.toggle('dim', g != null && !(x && x.groups.includes(g))); });
    this.drawDots();
  }
  /* 시·도별 진하기 (통계용) */
  setChoropleth(vals, color) {
    const max = Math.max(1, ...Object.values(vals));
    for (const [k, el] of Object.entries(this.paths)) {
      const v = vals[REGIONS.find(r => r.k === k).s] || 0;
      el.style.fill = v ? color : '';
      el.style.fillOpacity = v ? (0.18 + 0.82 * v / max).toFixed(2) : '';
    }
  }
  /* 반씩 칠한 두 모둠 말고 다른 모둠은 점으로 */
  drawDots() {
    const g = this.svg.querySelector('.dots'); if (!g) return;
    const u = this.unit || 1, r = Math.max(2.2, 5.5 * u), lvl = this.zoomLevel();
    let h = '';
    for (const [k, x] of Object.entries(this.info)) {
      const reg = REG[k]; if (!reg) continue;
      if (reg.whole) {   // 시·도 전체 카드: 시·도 이름 옆 깃발
        const [lx, ly] = reg.l;
        h += `<g class="whole" data-k="${k}"><rect x="${lx + 14 * u}" y="${ly - 12 * u}" width="${(12 + 11 * x.groups.length) * u}" height="${15 * u}" rx="${4 * u}"/>${x.groups.map((gg, i) => `<circle cx="${lx + (21 + i * 11) * u}" cy="${ly - 4.5 * u}" r="${4.4 * u}" fill="${GROUPS[gg].c}"/>`).join('')}</g>`;
        continue;
      }
      const rest = restGroups(x); if (!rest.length) continue;
      if (lvl < 2.2 && reg.a < 600) continue;   // 전국 보기에서 작은 지역은 생략
      const [lx, ly] = reg.l;
      rest.forEach((gg, i) => {
        const cx = lx + (i - (rest.length - 1) / 2) * r * 2.3, cy = ly + r * 1.9;
        const dim = this.focusGroup != null && gg !== this.focusGroup ? ' opacity=".25"' : '';
        h += `<circle class="dot" data-k="${k}" cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(2)}" fill="${GROUPS[gg].c}"${dim}/>`;
      });
    }
    g.innerHTML = h;
  }
  /* 이름표: 전국 보기는 시·도, 확대하면 시·군·구 */
  drawLabels() {
    const g = this.svg.querySelector('.labels'); if (!g || !this.opt.labels) return;
    const u = this.unit || 1, lvl = this.zoomLevel(), v = this.vb;
    const inView = (x, y) => x > v.x && x < v.x + v.w && y > v.y && y < v.y + v.h;
    let h = '';
    if (lvl < 1.9) {
      const fs = 15 * u;
      SIDO.forEach(s => { h += `<text class="lb-sd" x="${s.l[0]}" y="${s.l[1]}" font-size="${fs.toFixed(2)}">${esc(s.sh)}</text>`; });
    } else {
      const fs = 12.5 * u, placed = [];
      const cand = REGIONS.filter(r => inView(r.l[0], r.l[1])).sort((a, b) => b.a - a.a);
      cand.forEach(r => {
        const name = r.s === '36' ? '세종' : r.n;
        const wpx = (r.b[2] - r.b[0]) / u, hpx = (r.b[3] - r.b[1]) / u;
        if (wpx < name.length * 9 || hpx < 14) return;
        const bw = name.length * fs * 0.95 / 2 + 2 * u, bh = fs * 0.62;
        const box = [r.l[0] - bw, r.l[1] - bh, r.l[0] + bw, r.l[1] + bh];
        if (placed.some(q => box[0] < q[2] && box[2] > q[0] && box[1] < q[3] && box[3] > q[1])) return;
        placed.push(box);
        h += `<text class="lb-rg${this.info[r.k] ? ' on' : ''}" x="${r.l[0]}" y="${r.l[1]}" font-size="${fs.toFixed(2)}">${esc(name)}</text>`;
      });
    }
    g.innerHTML = h;
  }
  select(k) { this.sel = k; this.drawSel(); }
  drawSel() {
    const g = this.svg.querySelector('.selg'); if (!g) return;
    const k = this.sel, r = REG[k];
    if (!r) { g.innerHTML = ''; return; }
    const u = this.unit || 1;
    const outline = r.whole ? SIDO_BY[r.s].d : r.d;
    const [x, y] = r.l, s = 1.25 * u;
    g.innerHTML = `<path class="sel-o" d="${outline}" stroke-width="${(3.2 * u).toFixed(2)}"/>
      <g class="pin" transform="translate(${x.toFixed(1)},${y.toFixed(1)}) scale(${s.toFixed(3)})"><path d="M0,0 C-3,-8 -11,-12 -11,-21 A11,11 0 1 1 11,-21 C11,-12 3,-8 0,0Z"/><circle cy="-21" r="4.2"/></g>`;
  }
  setHome(k) { this.home = k; this.drawHome(); }
  drawHome() {
    const g = this.svg.querySelector('.homeg'); if (!g) return;
    const r = REG[this.home]; if (!r) { g.innerHTML = ''; return; }
    const u = this.unit || 1, [x, y] = r.l, s = Math.max(5.5, 9 * u) / 10;
    g.innerHTML = `<g class="home" transform="translate(${(x + (r.whole ? 0 : 0)).toFixed(1)},${(y - 13 * u).toFixed(1)}) scale(${s.toFixed(3)})"><path d="M0,-10 L2.9,-3.1 L10,-3.1 L4.3,1.4 L6.4,8.6 L0,4.3 L-6.4,8.6 L-4.3,1.4 L-10,-3.1 L-2.9,-3.1Z"/></g>`;
  }
  /* 새 카드가 들어온 지역 반짝 */
  flash(k) {
    const el = this.paths[k]; if (!el) return;
    el.classList.remove('flash'); void el.getBBox(); el.classList.add('flash');
    setTimeout(() => el.classList.remove('flash'), 2600);
  }
}
