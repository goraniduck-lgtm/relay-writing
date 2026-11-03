/* 구석구석 — A2 출력물 (A4 4장 이어 붙이기 / A2 1장 / A4 1장)
   포스터는 mm 단위 SVG(420×594) 하나로 그리고, 쪽마다 <use>로 필요한 부분만 보여 줌 */
'use strict';
const P = { cfg: {}, cards: {}, mode: ls.get('gusuk.pmode', 'a4x4'), inc: ls.get('gusuk.pinc', 'all') };
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
  s += `<rect x="0" y="0" width="${PW}" height="54" fill="#F5EFE3"/><rect x="0" y="54" width="${PW}" height="1.2" fill="#1F6F78"/>`;
  s += `<g transform="translate(14,10) scale(0.85)"><circle cx="20" cy="20" r="18" fill="#1F6F78"/><path d="M20 6l5 14-5 14-5-14z" fill="#fff"/><path d="M20 6l5 14h-10z" fill="#F2C12E"/></g>`;
  s += T(52, 31, 19, '구석구석 다 함께 찾아요', ' font-weight="900" fill="#2B2A26"');
  s += T(53, 45, 6, `우리 반이 함께 찾은 지역을 알리기 위한 노력 · 사회 4-2 · ${today}`, ' fill="#6B6558" font-weight="600"');
  const kp = [[`${list.length}`, '찾은 카드'], [`${regions}`, '찾은 지자체'], [`${sidoN}/${SIDO.length}`, '채운 시·도']];
  kp.forEach(([v, l], i) => { const x = 300 + i * 39; s += `<rect x="${x}" y="11" width="35" height="33" rx="3" fill="#fff" stroke="#E1D7C3" stroke-width=".5"/>` + T(x + 17.5, 30, 11, v, ' text-anchor="middle" font-weight="900" fill="#1F6F78"') + T(x + 17.5, 39.5, 4.2, l, ' text-anchor="middle" fill="#6B6558" font-weight="700"'); });
  /* 지도 */
  const mx = 10, my = 62, mw = 262, sc = mw / FULL.w, mh = FULL.h * sc;
  const u = 1 / sc;   // 1mm 의 지도 길이
  s += `<rect x="${mx}" y="${my}" width="${mw}" height="${mh.toFixed(1)}" rx="3" fill="#E7F1F5"/>`;
  s += `<g transform="translate(${mx},${my}) scale(${sc.toFixed(5)}) translate(${-FULL.x},${-FULL.y})">`;
  REGIONS.forEach(r => { const x = info[r.k]; s += `<path d="${r.d}" fill="${x ? `url(#pppg${x.first})` : '#FFFDF7'}" stroke="#A89E88" stroke-width="${(0.13 * u).toFixed(2)}" stroke-linejoin="round"/>`; });
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
    s += `<circle cx="${lx}" cy="${ly}" r="${rr}" fill="${G.c}" stroke="#fff" stroke-width="${.35 * u}"/>` + T(lx, ly + 1.05 * u, (num[k] > 99 ? 2.2 : 2.9) * u, num[k], ` text-anchor="middle" font-weight="900" fill="${G.ink}"`);
    x.groups.slice(1).forEach((g, i) => { s += `<circle cx="${lx + rr + (1.6 + i * 2.3) * u}" cy="${ly + 1.8 * u}" r="${1.05 * u}" fill="${GROUPS[g].c}" stroke="#fff" stroke-width="${.2 * u}"/>`; });
    if (r.whole) s += `<circle cx="${lx}" cy="${ly}" r="${rr + .9 * u}" fill="none" stroke="${G.c}" stroke-width="${.35 * u}" stroke-dasharray="${.8 * u} ${.5 * u}"/>`;
  });
  s += `</g>`;
  /* 범례 (지도 왼쪽 위 바다) */
  let ly0 = my + 6;
  s += `<rect x="${mx + 4}" y="${my + 3}" width="44" height="66" rx="2.5" fill="#fff" fill-opacity=".92" stroke="#C9DCE4" stroke-width=".4"/>`;
  s += T(mx + 8, ly0 + 4, 3.6, '먼저 찾은 모둠 색', ' font-weight="800" fill="#2B2A26"');
  GNUMS.forEach((g, i) => { const y = ly0 + 8 + i * 6.2; s += `<rect x="${mx + 8}" y="${y}" width="7" height="4.6" rx="1" fill="url(#pppg${g})"/>` + T(mx + 17, y + 3.7, 3.5, `${g}모둠`, ' font-weight="700" fill="#2B2A26"'); });
  const ly1 = ly0 + 8 + 6 * 6.2 + 2;
  s += `<circle cx="${mx + 9.5}" cy="${ly1 + 1}" r="1.1" fill="#1D7FE0"/>` + T(mx + 13, ly1 + 2.2, 3, '함께 찾은 모둠', ' fill="#6B6558"');
  s += T(mx + 8, ly1 + 8, 3, '⭐ 우리 지역 · 번호 = 오른쪽 목록', ' fill="#6B6558"');
  /* 통계 띠 */
  const sy = my + mh + 8;
  s += statsBand(list, mx, sy, mw, 78);
  /* 목록 */
  s += listCols(list, order, num, info, { right: { x: 280, y0: my, y1: PH - 10, w: 130 }, bottom: { y0: sy + 84, y1: PH - 10 } });
  s += T(PW / 2, PH - 3.5, 2.8, '자료: 학생 조사(대한민국 구석구석·지역 문화 관광 누리집 등) · 지도: 통계청 행정구역 경계(2026년 10월 기준)를 단순하게 그림', ' text-anchor="middle" fill="#8b8576"');
  s += `</g>`;
  return { svg: s, n: list.length };
}
function statsBand(list, x, y, w, h) {
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="#FBF8F1" stroke="#E1D7C3" stroke-width=".4"/>`;
  s += T(x + 5, y + 8, 4.6, '모둠별로 찾은 카드', ' font-weight="800" fill="#2B2A26"');
  const byG = {}; list.forEach(c => { (byG[c.g] = byG[c.g] || {})[c.c] = ((byG[c.g] || {})[c.c] || 0) + 1; });
  const tot = g => Object.values(byG[g] || {}).reduce((a, b) => a + b, 0);
  const mxv = Math.max(1, ...GNUMS.map(tot));
  const bw = w * 0.55 - 28;
  GNUMS.forEach((g, i) => {
    const yy = y + 13 + i * 9.6;
    s += `<rect x="${x + 5}" y="${yy}" width="6" height="6" rx="1.2" fill="${GROUPS[g].c}"/>` + T(x + 8, yy + 4.6, 3.6, g, ` text-anchor="middle" font-weight="900" fill="${GROUPS[g].ink}"`);
    s += T(x + 13, yy + 4.6, 3.6, `${g}모둠`, ' font-weight="700" fill="#2B2A26"');
    let cx = x + 27;
    CAT_KEYS.forEach(c => { const n = (byG[g] || {})[c] || 0; if (!n) return; const ww = n / mxv * bw; s += `<rect x="${cx.toFixed(2)}" y="${yy}" width="${Math.max(.5, ww - .5).toFixed(2)}" height="6" rx="1" fill="${CATS[c].c}"/>`; cx += ww; });
    s += T(cx + 2, yy + 4.6, 3.6, tot(g), ' font-weight="800" fill="#2B2A26"');
  });
  /* 분류별 */
  const cx0 = x + w * 0.58, cwid = (w * 0.42 - 6) / 2;
  s += T(cx0, y + 8, 4.6, '무엇을 찾았나요?', ' font-weight="800" fill="#2B2A26"');
  CAT_KEYS.forEach((c, i) => {
    const n = list.filter(k => k.c === c).length;
    const bx = cx0 + (i % 2) * (cwid + 3), by = y + 13 + Math.floor(i / 2) * 31;
    s += `<rect x="${bx}" y="${by}" width="${cwid}" height="27" rx="2.5" fill="#fff" stroke="${CATS[c].c}" stroke-width=".5"/>`;
    s += T(bx + cwid / 2, by + 9, 5.5, CATS[c].icon, ' text-anchor="middle"') + T(bx + cwid / 2, by + 19.5, 9, n, ` text-anchor="middle" font-weight="900" fill="${CATS[c].c}"`) + T(bx + cwid / 2, by + 24.6, 3.4, CATS[c].name, ' text-anchor="middle" font-weight="700" fill="#2B2A26"');
  });
  return s;
}
/* 목록: 오른쪽 칸을 먼저 채우고 넘치면 통계 아래 두 칸으로 */
function listCols(list, order, num, info, area) {
  if (!list.length) return T(area.right.x, area.right.y0 + 10, 5, '아직 찾은 카드가 없어요.', ' fill="#6B6558"');
  const cols = [Object.assign({}, area.right), { x: 10, y0: area.bottom.y0, y1: area.bottom.y1, w: 126 }, { x: 146, y0: area.bottom.y0, y1: area.bottom.y1, w: 126 }];
  const cap = cols.reduce((a, c) => a + (c.y1 - c.y0), 0);
  const items = [];
  order.forEach(k => { items.push({ head: k }); list.filter(c => c.r === k).forEach(c => items.push({ c })); });
  const nh = order.length, nc = list.length;
  let mode = 2, f = 1;
  const need = (m, ff) => (nh * 7 + nc * (m === 2 ? 9.6 : 5.4)) * ff + cols.length * 3;
  if (need(2, 1) > cap) mode = 1;
  if (need(mode, 1) > cap) f = Math.max(0.55, cap / need(mode, 1));
  let ci = 0, y = cols[0].y0 + 4;
  let s = `<rect x="${cols[0].x - 2}" y="${cols[0].y0}" width="${cols[0].w + 4}" height="${cols[0].y1 - cols[0].y0}" rx="3" fill="#FBF8F1" stroke="#E1D7C3" stroke-width=".4"/>`;
  let overflowBox = false;
  for (const it of items) {
    const h = (it.head ? 7 : mode === 2 ? 9.6 : 5.4) * f;
    let col = cols[ci];
    if (y + h > col.y1 - 1) {
      ci++; if (ci >= cols.length) { s += T(col.x, col.y1 - 1, 3 * f, '… 카드가 많아 일부만 실었어요', ' fill="#B42318"'); break; }
      col = cols[ci]; y = col.y0 + 4;
      if (!overflowBox) { s += `<rect x="8" y="${col.y0}" width="266" height="${col.y1 - col.y0}" rx="3" fill="#FBF8F1" stroke="#E1D7C3" stroke-width=".4"/>`; overflowBox = true; }
    }
    if (it.head) {
      const k = it.head, G = GROUPS[info[k].first], fs = 3.9 * f;
      s += `<circle cx="${col.x + 2.6 * f}" cy="${y + 3.2 * f}" r="${2.5 * f}" fill="${G.c}"/>` + T(col.x + 2.6 * f, y + 4.25 * f, (num[k] > 99 ? 2.2 : 2.9) * f, num[k], ` text-anchor="middle" font-weight="900" fill="${G.ink}"`);
      s += T(col.x + 6.5 * f, y + 4.5 * f, fs, fit(REG[k].label, fs, col.w - 30), ' font-weight="900" fill="#2B2A26"') + T(col.x + 7 * f + tw(fit(REG[k].label, fs, col.w - 30), fs), y + 4.5 * f, 2.8 * f, REG[k].whole ? '' : REG[k].sido.sh, ' fill="#8b8576"');
    } else {
      const c = it.c, C = CATS[c.c], G = GROUPS[c.g] || GROUPS[0], fs = 3.4 * f, x0 = col.x + 6.5 * f;
      const tag = C.name, tagW = tw(tag, 2.8 * f) + 2.4 * f;
      s += `<rect x="${x0}" y="${y + .9 * f}" width="${tagW}" height="${3.9 * f}" rx="${.8 * f}" fill="${C.c}"/>` + T(x0 + tagW / 2, y + 3.85 * f, 2.8 * f, tag, ' text-anchor="middle" font-weight="800" fill="#fff"');
      const nx = x0 + tagW + 1.4 * f, gW = 9 * f;
      s += T(nx, y + 4 * f, fs, fit(c.n, fs, col.w - (nx - col.x) - gW - 1), ' font-weight="800" fill="#2B2A26"');
      s += `<rect x="${col.x + col.w - gW + 1}" y="${y + .9 * f}" width="${gW - 1}" height="${3.9 * f}" rx="${.8 * f}" fill="${G.c}"/>` + T(col.x + col.w - gW / 2 + .5, y + 3.85 * f, 2.6 * f, c.g ? `${c.g}모둠` : '선생님', ` text-anchor="middle" font-weight="800" fill="${G.ink}"`);
      if (mode === 2) s += T(x0, y + 8.3 * f, 2.9 * f, fit(c.w, 2.9 * f, col.w - 7 * f), ' fill="#5b564b"');
    }
    y += h;
  }
  return s;
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
  $('#pages').style.maxWidth = t ? `${(w * k) * t.cols + 60}px` : '';
  $('#pages').style.margin = '0 auto';
}
