/* 구석구석 — A2 출력물 (A4 4장 이어 붙이기 / A2 1장 / A4 1장)
   포스터는 mm 단위 SVG(420×594) 하나로 그리고, 쪽마다 <use>로 필요한 부분만 보여 줌 */
'use strict';
const P = { cfg: {}, cards: {}, mode: ls.get('gusuk.pmode', 'a4x4'), inc: ls.get('gusuk.pinc', 'all') };
{ const m = new URLSearchParams(location.search).get('m'); if (['a4x4', 'a4x8', 'a2', 'a4'].includes(m)) P.mode = m; }   // 교사 화면의 A2·A1 버튼
const PW = 420, PH = 594;              // A2 (mm)
const M = 7, OV = 8;                   // A4 인쇄 여백, 겹쳐 붙이는 폭 (mm)
const TW = 210 - 2 * M, TH = 297 - 2 * M;
/* A4 여러 장 이어 붙이기: A2 = A4 세로 2×2장, A1 = A4 가로 2×4장 */
const TILE = { a4x4: { cols: 2, rows: 2, land: false, name: 'A2', w: 420 }, a4x8: { cols: 2, rows: 4, land: true, name: 'A1', w: 594 } };

(async function init() {
  try { await DB.ready(); } catch (e) { $('#pages').innerHTML = '<div class="loading" style="color:#fff">연결하지 못했어요.</div>'; return; }
  $$('[data-mode]').forEach(b => b.onclick = () => { P.mode = b.dataset.mode; ls.set('gusuk.pmode', P.mode); draw(); });
  $$('[data-inc]').forEach(b => b.onclick = () => { P.inc = b.dataset.inc; ls.set('gusuk.pinc', P.inc); draw(); });
  $('#print').onclick = () => window.print();
  DB.on(`${ROOT}/cfg`, v => { P.cfg = v || {}; draw(); });
  DB.on(`${ROOT}/cards`, v => { P.cards = v || {}; draw(); });
  window.addEventListener('resize', fitPreview);
})();

/* ---------- 글자 폭 어림 (mm) ---------- */
const cw = (ch, fs) => /[ㄱ-힣]/.test(ch) ? fs * 0.93 : /[A-Z0-9]/.test(ch) ? fs * 0.6 : /[\s.,·()\-]/.test(ch) ? fs * 0.32 : fs * 0.52;
const tw = (s, fs) => [...String(s)].reduce((a, ch) => a + cw(ch, fs), 0);
function fit(s, fs, w) { s = String(s || ''); if (tw(s, fs) <= w) return s; let o = ''; for (const ch of s) { if (tw(o + ch + '…', fs) > w) break; o += ch; } return o + '…'; }
const T = (x, y, fs, s, o) => `<text x="${x.toFixed(2)}" y="${y.toFixed(2)}" font-size="${fs}"${o || ''}>${esc(s)}</text>`;

/* ---------- 포스터 ---------- */
function poster() {
  const list = allCards(P.cards).filter(c => P.inc !== 'ok' || c.st === 'ok');
  const info = paintInfo(list);
  const order = Object.keys(info).sort((a, b) => {
    const sa = SIDO.findIndex(s => s.s === REG[a].s), sb = SIDO.findIndex(s => s.s === REG[b].s);
    return sa - sb || (REG[a].whole ? -1 : 0) - (REG[b].whole ? -1 : 0) || a.localeCompare(b);
  });
  const num = {}; order.forEach((k, i) => { num[k] = i + 1; });
  const regions = order.filter(k => !REG[k].whole).length, sidoN = filledSido(info).size;
  const d = new Date(), today = `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`;
  let s = `<g class="poster">`;
  /* 머리 */
  s += `<rect x="0" y="0" width="${PW}" height="${PH}" fill="#fff"/>`;
  s += `<rect x="0" y="0" width="${PW}" height="50" fill="#F5EFE3"/><rect x="0" y="50" width="${PW}" height="1.2" fill="#1F6F78"/>`;
  s += `<g transform="translate(14,8) scale(0.85)"><circle cx="20" cy="20" r="18" fill="#1F6F78"/><path d="M20 6l5 14-5 14-5-14z" fill="#fff"/><path d="M20 6l5 14h-10z" fill="#F2C12E"/></g>`;
  s += T(52, 29, 19, '구석구석 다 함께 찾아요', ' font-weight="900" fill="#2B2A26"');
  s += T(53, 42, 6, `우리 반이 함께 찾은 지역을 알리기 위한 노력 · 사회 4-2 · ${today}`, ' fill="#6B6558" font-weight="600"');
  const kp = [[`${list.length}`, '찾은 카드'], [`${regions}`, '찾은 지자체'], [`${sidoN}/${SIDO.length}`, '채운 시·도']];
  kp.forEach(([v, l], i) => { const x = 300 + i * 39; s += `<rect x="${x}" y="9" width="35" height="32" rx="3" fill="#fff" stroke="#E1D7C3" stroke-width=".5"/>` + T(x + 17.5, 27.5, 11, v, ' text-anchor="middle" font-weight="900" fill="#1F6F78"') + T(x + 17.5, 37, 4.2, l, ' text-anchor="middle" fill="#6B6558" font-weight="700"'); });
  /* 배치: 목록(시·도별로 묶어 촘촘하게)이 다 들어가는 범위에서 지도를 가장 크게 */
  const groups = SIDO.map(sd => ({ sd, keys: order.filter(k => REG[k].s === sd.s) })).filter(g => g.keys.length);
  const lay = layout(groups, list, info, num);
  const mx = PL, my = PT, mw = lay.mw, sc = mw / FULL.w, mh = FULL.h * sc;
  const u = 1 / sc;   // 1mm 의 지도 길이
  s += `<rect x="${mx}" y="${my}" width="${mw}" height="${mh.toFixed(1)}" rx="3" fill="#E7F1F5"/>`;
  s += `<g transform="translate(${mx},${my}) scale(${sc.toFixed(5)}) translate(${-FULL.x},${-FULL.y})">`;
  REGIONS.forEach(r => { const x = info[r.k]; s += `<path d="${r.d}" fill="${x ? `url(#pppg${x.first})` : '#FFFDF7'}" stroke="#A89E88" stroke-width="${(0.13 * u).toFixed(2)}" stroke-linejoin="round"/>`; });
  /* 가장 많이 등록한 모둠이 다르면 오른쪽 절반 */
  REGIONS.forEach(r => {
    const x = info[r.k]; if (!x || x.most === x.first) return;
    const mid = (r.b[0] + r.b[2]) / 2;
    s += `<clipPath id="phc${r.k}"><rect x="${mid}" y="${r.b[1] - 2}" width="${r.b[2] - mid + 2}" height="${r.b[3] - r.b[1] + 4}"/></clipPath><clipPath id="phr${r.k}"><path d="${r.d}"/></clipPath>` +
      `<path d="${r.d}" fill="url(#pppg${x.most})" clip-path="url(#phc${r.k})"/><line x1="${mid}" y1="${r.b[1] - 2}" x2="${mid}" y2="${r.b[3] + 2}" stroke="#fff" stroke-width="${(0.35 * u).toFixed(2)}" clip-path="url(#phr${r.k})"/>`;
  });
  SIDO.forEach(sd => { s += `<path d="${sd.d}" fill="none" stroke="#3d382f" stroke-width="${(0.42 * u).toFixed(2)}" stroke-linejoin="round"/>`; });
  const b = ULL_BOX; s += `<rect x="${b[0]}" y="${b[1]}" width="${b[2] - b[0]}" height="${b[3] - b[1]}" fill="none" stroke="#8A9AA3" stroke-dasharray="${2 * u} ${1.5 * u}" stroke-width="${.25 * u}"/>` + T(b[0] + 2 * u, b[3] - 1.5 * u, (2.4 * u).toFixed(1), '울릉도·독도', ' fill="#5d6d75"');
  /* 시·도 이름 (작게) */
  SIDO.forEach(sd => { s += T(sd.l[0], sd.l[1] - 5 * u, (3.4 * u).toFixed(1), sd.sh, ` text-anchor="middle" font-weight="800" fill="#3d382f" fill-opacity=".55"`); });
  /* 우리 지역 별 */
  const hk = P.cfg.home || '41590';
  if (REG[hk]) { const [hx, hy] = REG[hk].l; s += `<g transform="translate(${hx - 4.5 * u},${hy - 3 * u}) scale(${(0.32 * u).toFixed(3)})"><path d="M0,-10 L2.9,-3.1 L10,-3.1 L4.3,1.4 L6.4,8.6 L0,4.3 L-6.4,8.6 L-4.3,1.4 L-10,-3.1 L-2.9,-3.1Z" fill="#FFD43B" stroke="#7a5a00" stroke-width="1.5"/></g>`; }
  /* 번호 표 */
  order.forEach(k => {
    const r = REG[k], x = info[k], [lx, ly] = r.l, rr = 2.5 * u, G = GROUPS[x.first];
    s += `<circle cx="${lx}" cy="${ly}" r="${rr}" fill="${G.c}" stroke="#fff" stroke-width="${.35 * u}"/>` + halfDisc(lx, ly, rr, x) + T(lx, ly + 1.05 * u, (num[k] > 99 ? 2.2 : 2.9) * u, num[k], ` text-anchor="middle" font-weight="900" fill="${G.ink}" stroke="${G.c}" stroke-width="${.5 * u}" paint-order="stroke"`);
    restGroups(x).forEach((g, i) => { s += `<circle cx="${lx + rr + (1.6 + i * 2.3) * u}" cy="${ly + 1.8 * u}" r="${1.05 * u}" fill="${GROUPS[g].c}" stroke="#fff" stroke-width="${.2 * u}"/>`; });
    if (r.whole) s += `<circle cx="${lx}" cy="${ly}" r="${rr + .9 * u}" fill="none" stroke="${G.c}" stroke-width="${.35 * u}" stroke-dasharray="${.8 * u} ${.5 * u}"/>`;
  });
  s += `</g>`;
  /* 범례 (지도 왼쪽 위 바다) */
  let ly0 = my + 6;
  s += `<rect x="${mx + 4}" y="${my + 3}" width="50" height="76" rx="2.5" fill="#fff" fill-opacity=".92" stroke="#C9DCE4" stroke-width=".4"/>`;
  s += T(mx + 8, ly0 + 4, 3.6, '모둠 색', ' font-weight="800" fill="#2B2A26"');
  GNUMS.forEach((g, i) => { const y = ly0 + 8 + i * 6.2; s += `<rect x="${mx + 8}" y="${y}" width="7" height="4.6" rx="1" fill="url(#pppg${g})"/>` + T(mx + 17, y + 3.7, 3.5, `${g}모둠`, ' font-weight="700" fill="#2B2A26"'); });
  const ly1 = ly0 + 8 + 6 * 6.2 + 2;
  s += `<circle cx="${mx + 9.5}" cy="${ly1 + 1}" r="1.1" fill="#1D7FE0"/>` + T(mx + 13, ly1 + 2.2, 3, '함께 찾은 모둠', ' fill="#6B6558"');
  s += T(mx + 8, ly1 + 8, 3, '⭐ 우리 지역 · 번호 = 목록 번호', ' fill="#6B6558"');
  s += T(mx + 8, ly1 + 13, 3, '왼쪽 반: 먼저 찾은 모둠', ' fill="#6B6558"') + T(mx + 8, ly1 + 17.5, 3, '오른쪽 반: 가장 많이 찾은 모둠', ' fill="#6B6558"');
  /* 통계 띠 */
  s += statsBand(list, mx, my + mh + GAP, mw, STATS_H);
  /* 목록 */
  s += lay.svg;
  s += T(PW / 2, PH - 3.5, 2.8, '자료: 학생 조사(대한민국 구석구석·지역 문화 관광 누리집 등) · 지도: 통계청 행정구역 경계(2026년 10월 기준)를 단순하게 그림', ' text-anchor="middle" fill="#8b8576"');
  s += `</g>`;
  return { svg: s, n: list.length };
}
function statsBand(list, x, y, w, h) {
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="#FBF8F1" stroke="#E1D7C3" stroke-width=".4"/>`;
  s += T(x + 4, y + 6.5, 4, '모둠별로 찾은 카드', ' font-weight="800" fill="#2B2A26"');
  const byG = {}; list.forEach(c => { (byG[c.g] = byG[c.g] || {})[c.c] = ((byG[c.g] || {})[c.c] || 0) + 1; });
  const tot = g => Object.values(byG[g] || {}).reduce((a, b) => a + b, 0);
  const mxv = Math.max(1, ...GNUMS.map(tot));
  const bw = w * 0.58 - 30, rh = (h - 11) / 6, bh = Math.min(5, rh * 0.78);
  GNUMS.forEach((g, i) => {
    const yy = y + 9.5 + i * rh;
    s += `<rect x="${x + 4}" y="${yy}" width="${bh}" height="${bh}" rx="1" fill="${GROUPS[g].c}"/>` + T(x + 4 + bh / 2, yy + bh * .78, bh * .75, g, ` text-anchor="middle" font-weight="900" fill="${GROUPS[g].ink}"`);
    s += T(x + 6 + bh, yy + bh * .78, 3.3, `${g}모둠`, ' font-weight="700" fill="#2B2A26"');
    let cx = x + 24;
    CAT_KEYS.forEach(c => { const n = (byG[g] || {})[c] || 0; if (!n) return; const ww = n / mxv * bw; s += `<rect x="${cx.toFixed(2)}" y="${yy}" width="${Math.max(.5, ww - .5).toFixed(2)}" height="${bh}" rx="1" fill="${CATS[c].c}"/>`; cx += ww; });
    s += T(cx + 1.5, yy + bh * .78, 3.3, tot(g), ' font-weight="800" fill="#2B2A26"');
  });
  const cx0 = x + w * 0.6, cwid = (w * 0.4 - 6) / 2, th = (h - 13) / 2;
  s += T(cx0, y + 6.5, 4, '무엇을 찾았나요?', ' font-weight="800" fill="#2B2A26"');
  CAT_KEYS.forEach((c, i) => {
    const n = list.filter(k => k.c === c).length;
    const bx = cx0 + (i % 2) * (cwid + 3), by = y + 9.5 + Math.floor(i / 2) * (th + 2);
    s += `<rect x="${bx}" y="${by}" width="${cwid}" height="${th}" rx="2.5" fill="#fff" stroke="${CATS[c].c}" stroke-width=".5"/>`;
    s += T(bx + 4, by + th / 2 + 1.8, 5, CATS[c].icon) + T(bx + cwid / 2 + 3, by + th / 2 + 2.6, 8, n, ` text-anchor="middle" font-weight="900" fill="${CATS[c].c}"`) + T(bx + cwid - 3, by + th / 2 + 1.2, 3.2, CATS[c].name, ' text-anchor="end" font-weight="700" fill="#2B2A26"');
  });
  return s;
}
/* ---------- 목록 (시·도별 묶음, 지역마다 카드를 한 줄에 이어 씀) ---------- */
const PL = 8, PR = PW - 8, PT = 56, PB = PH - 9, GAP = 5, STATS_H = 44, COLGAP = 6;
function layout(groups, list, info, num) {
  const asp = FULL.w / FULL.h;
  const tryIt = (mw, f) => {
    const mh = mw / asp, cols = [];
    const rx = PL + mw + COLGAP;
    if (PR - rx >= 60) cols.push({ x: rx, y0: PT, y1: PB, w: PR - rx });
    const by0 = PT + mh + GAP + STATS_H + GAP;
    if (PB - by0 >= 12) {
      const n = Math.max(1, Math.floor((mw + COLGAP) / (86 + COLGAP))), cw = (mw - (n - 1) * COLGAP) / n;
      for (let i = 0; i < n; i++) cols.push({ x: PL + i * (cw + COLGAP), y0: by0, y1: PB, w: cw, bottom: true });
    }
    if (!cols.length || by0 > PB + 1) return null;
    const r = flow(groups, list, info, num, cols, f);
    return r.ok ? Object.assign(r, { mw }) : null;
  };
  for (let mw = 334; mw >= 210; mw -= 2) { const r = tryIt(mw, 1); if (r) return r; }
  for (let f = 0.95; f >= 0.5; f -= 0.05) for (let mw = 300; mw >= 210; mw -= 6) { const r = tryIt(mw, f); if (r) return r; }
  return Object.assign(flow(groups, list, info, num, [{ x: PL + 216, y0: PT, y1: PB, w: PR - PL - 216 }], 0.5, true), { mw: 210 });
}
function flow(groups, list, info, num, cols, f, force) {
  const lh = 5 * f, hh = 6.6 * f, fsN = 3.15 * f, fsT = 2.3 * f, ind = 5.2 * f, chipW = 4 * f, gap = 2.4 * f;
  const byR = {}; list.forEach(c => { (byR[c.r] = byR[c.r] || []).push(c); });
  let ci = 0, y = cols[0].y0 + 1.5 * f, s = '', used = new Set([0]), ok = true;
  const col = () => cols[ci];
  const next = () => { ci++; if (ci >= cols.length) { ok = false; return false; } used.add(ci); y = col().y0 + 1.5 * f; return true; };
  const head = (sd, n, cont) => {
    const c = col();
    s += T(c.x + 1, y + 4.6 * f, 3.9 * f, sd.sn + (cont ? ' (이어서)' : ''), ' font-weight="900" fill="#1F4F56"') +
      T(c.x + c.w - 1, y + 4.6 * f, 2.8 * f, cont ? '' : `${n}곳`, ' text-anchor="end" fill="#8b8576" font-weight="700"') +
      `<rect x="${c.x}" y="${(y + hh - 1.1 * f).toFixed(2)}" width="${c.w}" height="${(.45 * f).toFixed(2)}" fill="#1F6F78" fill-opacity=".5"/>`;
    y += hh + .6 * f;
  };
  /* 지역 하나를 줄 단위로 배치해 보고 [줄 수, 그리기] 돌려줌 */
  const block = (k, c) => {
    const items = [], G = GROUPS[info[k].first], name = REG[k].whole ? REG[k].label : (REG[k].sido.s === '12' && REG[k].label.startsWith('광주') ? REG[k].label : REG[k].n);
    let line = 0, x = c.x;
    const nameW = tw(name, 3.35 * f);
    items.push(o => `<circle cx="${(c.x + 2.2 * f).toFixed(2)}" cy="${(o + 2.9 * f).toFixed(2)}" r="${(2.15 * f).toFixed(2)}" fill="${G.c}"/>` + halfDisc(c.x + 2.2 * f, o + 2.9 * f, 2.15 * f, info[k]) +
      T(c.x + 2.2 * f, o + 3.95 * f, (num[k] > 99 ? 1.95 : 2.55) * f, num[k], ` text-anchor="middle" font-weight="900" fill="${G.ink}" stroke="${G.c}" stroke-width="${(.45 * f).toFixed(2)}" paint-order="stroke"`) +
      T(c.x + ind, o + 4 * f, 3.35 * f, name, ' font-weight="900" fill="#2B2A26"'));
    x = c.x + ind + nameW + gap * 1.4;
    (byR[k] || []).forEach(card => {
      const C = CATS[card.c], CG = GROUPS[card.g] || GROUPS[0];
      const tagW = tw(C.name, fsT) + 1.6 * f;
      let nm = card.n, w = tagW + .9 * f + tw(nm, fsN) + .9 * f + chipW;
      const maxW = c.w - ind;
      if (w > maxW) { nm = fit(nm, fsN, maxW - tagW - chipW - 2 * f); w = tagW + .9 * f + tw(nm, fsN) + .9 * f + chipW; }
      if (x + w > c.x + c.w) { line++; x = c.x + ind; }
      const L = line, X = x;
      items.push(o => {
        const yy = o + L * lh;
        return `<rect x="${X.toFixed(2)}" y="${(yy + 1.05 * f).toFixed(2)}" width="${tagW.toFixed(2)}" height="${(3.5 * f).toFixed(2)}" rx="${(.7 * f).toFixed(2)}" fill="${C.c}"/>` +
          T(X + tagW / 2, yy + 3.6 * f, fsT, C.name, ' text-anchor="middle" font-weight="800" fill="#fff"') +
          T(X + tagW + .9 * f, yy + 4 * f, fsN, nm, ' font-weight="700" fill="#2B2A26"') +
          `<rect x="${(X + w - chipW).toFixed(2)}" y="${(yy + 1.05 * f).toFixed(2)}" width="${chipW.toFixed(2)}" height="${(3.5 * f).toFixed(2)}" rx="${(.7 * f).toFixed(2)}" fill="${CG.c}"/>` +
          T(X + w - chipW / 2, yy + 3.65 * f, 2.6 * f, card.g || '선', ` text-anchor="middle" font-weight="900" fill="${CG.ink}"`);
      });
      x += w + gap;
    });
    return { lines: line + 1, draw: o => items.map(fn => fn(o)).join('') };
  };
  for (const g of groups) {
    if (y + hh + lh > col().y1 && !next()) break;
    head(g.sd, g.keys.length, false);
    for (const k of g.keys) {
      let b = block(k, col());
      if (y + b.lines * lh > col().y1) {
        if (!next()) break;
        head(g.sd, 0, true);
        b = block(k, col());
      }
      s += b.draw(y);
      y += b.lines * lh + .5 * f;
    }
    if (!ok) break;
    y += 1.8 * f;
  }
  if (!ok && !force) return { ok: false };
  /* 칸 바탕 */
  let bg = '';
  const usedCols = cols.filter((c, i) => used.has(i));
  const side = usedCols.filter(c => !c.bottom), bottom = usedCols.filter(c => c.bottom);
  side.forEach(c => { bg += `<rect x="${c.x - 2}" y="${c.y0 - 1}" width="${c.w + 4}" height="${c.y1 - c.y0 + 2}" rx="3" fill="#FBF8F1" stroke="#E1D7C3" stroke-width=".4"/>`; });
  if (bottom.length) { const a = cols.filter(c => c.bottom); bg += `<rect x="${a[0].x - 2}" y="${a[0].y0 - 1}" width="${a[a.length - 1].x + a[a.length - 1].w - a[0].x + 4}" height="${a[0].y1 - a[0].y0 + 2}" rx="3" fill="#FBF8F1" stroke="#E1D7C3" stroke-width=".4"/>`; }
  if (!list.length) return { ok: true, svg: T(cols[0].x + 2, cols[0].y0 + 8, 5, '아직 찾은 카드가 없어요.', ' fill="#6B6558"') };
  return { ok: true, svg: bg + s + (ok ? '' : T(cols[cols.length - 1].x, PB, 3, '… 카드가 많아 일부만 실었어요', ' fill="#B42318"')) };
}

/* 오른쪽 반원: 가장 많이 등록한 모둠 */
function halfDisc(cx, cy, r, x) {
  if (!x || x.most === x.first) return '';
  return `<path d="M${cx},${cy - r}A${r},${r} 0 0 1 ${cx},${cy + r}Z" fill="${GROUPS[x.most].c}"/>`;
}

/* ---------- 쪽 나누기 ---------- */
function draw() {
  const ps = poster();
  $('#defs').innerHTML = `<svg class="hiddefs" xmlns="http://www.w3.org/2000/svg"><defs>${groupPatterns('pp')}<g id="poster">${ps.svg}</g></defs></svg>`;
  $$('[data-mode]').forEach(b => b.classList.toggle('on', b.dataset.mode === P.mode));
  $$('[data-inc]').forEach(b => b.classList.toggle('on', b.dataset.inc === P.inc));
  const pages = $('#pages');
  let css = '', h = '';
  if (P.mode === 'a2') {
    css = '@page{size:420mm 594mm;margin:0}';
    h = page(420, 594, 0, 0, PW, PH, [0, 0, PW, PH], '');
    $('#note').textContent = `A2(42×59.4cm) 한 장 — 인쇄소·대형 프린터용 PDF로 저장하세요. 카드 ${ps.n}장.`;
  } else if (P.mode === 'a4') {
    css = '@page{size:A4 portrait;margin:0}';
    const w = 196, hh = w * PH / PW;
    h = page(210, 297, (210 - w) / 2, (297 - hh) / 2, w, hh, [0, 0, PW, PH], '');
    $('#note').textContent = `A4 한 장에 줄여 담아요 (학생 나눠 주기용). 카드 ${ps.n}장.`;
  } else {
    const t = P.mode === 'a4x8' ? TILE.a4x8 : TILE.a4x4;
    css = `@page{size:A4 ${t.land ? 'landscape' : 'portrait'};margin:0}`;
    const pw = t.land ? 297 : 210, ph = t.land ? 210 : 297, tw = pw - 2 * M, th = ph - 2 * M;
    const aw = t.cols * tw - (t.cols - 1) * OV, ah = t.rows * th - (t.rows - 1) * OV;
    const sc = Math.min(aw / PW, ah / PH), ox = (aw - PW * sc) / 2;
    const N = '①②③④⑤⑥⑦⑧';
    for (let r = 0; r < t.rows; r++) for (let c = 0; c < t.cols; c++) {
      const i = r * t.cols + c, x0 = (c * (tw - OV) - ox) / sc, y0 = r * (th - OV) / sc;
      let ov = '';
      if (c > 0) ov += `<line x1="${OV}" y1="0" x2="${OV}" y2="${th}" stroke="#888" stroke-width=".3" stroke-dasharray="2 1.5"/><text x="${OV / 2}" y="${th / 2}" font-size="3" fill="#888" text-anchor="middle" transform="rotate(-90 ${OV / 2} ${th / 2})">✂ 자르고 왼쪽 장(${N[i - 1]}) 위에 겹쳐 붙여요</text>`;
      if (r > 0) ov += `<line x1="0" y1="${OV}" x2="${tw}" y2="${OV}" stroke="#888" stroke-width=".3" stroke-dasharray="2 1.5"/><text x="${tw / 2}" y="${OV / 2 + 1}" font-size="3" fill="#888" text-anchor="middle">✂ 자르고 위 장(${N[i - t.cols]}) 아래쪽에 겹쳐 붙여요</text>`;
      ov += `<text x="${c ? tw - 2 : 2}" y="${th - 2}" font-size="3.4" font-weight="800" fill="#aaa" text-anchor="${c ? 'end' : 'start'}">${N[i]} ${r + 1}째 줄 ${c ? '오른쪽' : '왼쪽'} (${t.rows * t.cols}장 중)</text>`;
      h += page(pw, ph, M, M, tw, th, [x0, y0, tw / sc, th / sc], ov);
    }
    const cm = v => Math.round(v / 10), pct = Math.round(PW * sc / t.w * 100);
    $('#note').innerHTML = `A4 ${t.rows * t.cols}장을 ${t.land ? '<b>가로</b>로 ' : ''}<b>100%(실제 크기)</b>로 인쇄한 뒤, 점선을 잘라 ${N.slice(0, t.rows * t.cols)} 순서로 겹쳐 붙이면 약 ${cm(PW * sc)}×${cm(PH * sc)}cm 포스터가 돼요 (${t.name}의 ${pct}%). ` +
      `프린터 여백(${M}mm)과 붙이는 폭(${OV}mm) 때문에 조금 작아요. 카드 ${ps.n}장.`;
  }
  $('#pagestyle').textContent = css;
  pages.innerHTML = h;
  fitPreview();
}
function page(w, hgt, x, y, sw, sh, vb, overlay) {
  return `<div class="page" style="width:${w}mm;height:${hgt}mm"><svg xmlns="http://www.w3.org/2000/svg" style="left:${x}mm;top:${y}mm;width:${sw}mm;height:${sh}mm" viewBox="${vb.map(v => v.toFixed(3)).join(' ')}"><use href="#poster"/></svg>${overlay ? `<svg style="left:${x}mm;top:${y}mm;width:${sw}mm;height:${sh}mm" viewBox="0 0 ${sw} ${sh}">${overlay}</svg>` : ''}</div>`;
}
/* 화면 미리 보기는 창 크기에 맞게 줄여 보여 줌 (인쇄에는 영향 없음) */
function fitPreview() {
  const pages = $$('.page'); if (!pages.length) return;
  const avail = Math.max(300, window.innerWidth - 60);
  pages.forEach(p => { p.style.transform = ''; p.style.margin = ''; });
  const w = pages[0].getBoundingClientRect().width, h = pages[0].getBoundingClientRect().height;
  const t = TILE[P.mode], per = t ? t.cols : 1;
  const k = Math.min(1, (avail - (per - 1) * 18) / (w * per), (window.innerHeight * (t ? 0.9 / t.rows : 0.85)) / h);
  pages.forEach(p => { p.style.transform = `scale(${k})`; p.style.transformOrigin = 'top left'; p.style.marginRight = `${-w * (1 - k)}px`; p.style.marginBottom = `${-h * (1 - k)}px`; });
  $('#pages').style.maxWidth = t ? `${(w * k) * t.cols + 18 * (t.cols - 1) + 50}px` : '';
  $('#pages').style.margin = '0 auto';
}
