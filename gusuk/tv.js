/* 구석구석 — 교실 TV 화면 (발표 모드) */
'use strict';
const V = { cfg: {}, cards: {}, info: {}, g: null, map: null, seen: null, fresh: new Set() };
const app = $('#app');

(async function init() {
  try { await DB.ready(); } catch (e) { app.innerHTML = '<div class="loading">연결하지 못했어요. 새로 고침 해 주세요.</div>'; return; }
  build();
  DB.on(`${ROOT}/cfg`, v => { V.cfg = v || {}; refresh(); });
  DB.on(`${ROOT}/cards`, v => {
    V.cards = v || {};
    if (V.seen) Object.keys(V.cards).forEach(id => { if (!V.seen.has(id)) { V.fresh.add(id); V.map.flash(V.cards[id].r); setTimeout(() => { V.fresh.delete(id); }, 8000); } });
    V.seen = new Set(Object.keys(V.cards));
    refresh();
  });
})();

function build() {
  app.innerHTML = `<header class="top"><div class="brand"><svg class="logo" viewBox="0 0 40 40" style="width:44px;height:44px"><circle cx="20" cy="20" r="18" fill="#1F6F78"/><path d="M20 6l5 14-5 14-5-14z" fill="#fff"/><path d="M20 6l5 14h-10z" fill="#F2C12E"/></svg><div><h1>구석구석 다 함께 찾아요</h1><small>우리 반이 함께 찾은 지역을 알리기 위한 노력</small></div></div>
    <div class="sp"></div><div id="goal"></div><div class="qr">${qrSvg(studentUrl(), 3)}<span>학생<br>접속</span></div></header>
    <div class="tvmain"><div class="mapbox" id="map"></div>
      <div class="col"><div class="gsel" id="gsel"></div><div class="feed" id="feed"></div><div class="legend" id="legend"></div></div></div>`;
  V.map = new GMap($('#map'), { onPick: showRegion, prefix: 'tv' });
  setTimeout(() => V.map.apply(), 50);
}
function refresh() {
  if (!V.map) return;
  const vis = visibleCards(V.cards, V.cfg);
  V.info = paintInfo(vis);
  V.map.setPaint(V.info);
  V.map.setHome(V.cfg.home || '41590');
  V.map.setFocusGroup(V.g);
  $('#goal').innerHTML = goalHtml(V.info);
  const all = vis, cnt = g => all.filter(c => c.g === g).length;
  $('#gsel').innerHTML = `<button class="${V.g == null ? 'on' : ''}" data-g="">전체<small>${all.length}장</small></button>` +
    GNUMS.map(g => `<button class="g${g}${V.g === g ? ' on' : ''}" data-g="${g}" style="--gc:${GROUPS[g].c}">${g}<small>${cnt(g)}장</small></button>`).join('');
  $$('#gsel [data-g]').forEach(b => b.onclick = () => { V.g = b.dataset.g === '' ? null : Number(b.dataset.g); refresh(); $('#feed').scrollTop = 0; });
  $('#legend').innerHTML = GNUMS.map(g => `<span style="--gc:${GROUPS[g].c}"><i></i>${g}모둠</span>`).join('') + '<span class="muted" style="font-weight:600">⭐ 우리 지역</span>';
  const feed = $('#feed');
  const keep = feed.scrollTop;
  if (V.g == null) {
    const recent = all.slice(-12).reverse();
    feed.innerHTML = `<h2>방금 찾은 것</h2>` + (recent.length ? recent.map(c => card(c, true)).join('') : '<p class="muted">아직 카드가 없어요. 학생 태블릿에서 첫 카드를 올려 봐요!</p>');
  } else {
    const mine = all.filter(c => c.g === V.g);
    const regs = [...new Set(mine.map(c => c.r))];
    feed.innerHTML = `<h2 style="color:${GROUPS[V.g].c === '#F2C12E' ? '#8a6a00' : GROUPS[V.g].c}">${V.g}모둠 발표 · ${regs.length}곳 ${mine.length}장</h2>` +
      (mine.length ? regs.map(k => `<div class="muted" style="font-weight:800;font-size:16px;margin-top:4px">📍 ${esc(regLabel(k))}</div>` + mine.filter(c => c.r === k).map(c => card(c, false)).join('')).join('') : '<p class="muted">아직 카드가 없어요.</p>');
    feed.scrollTop = keep;
  }
  feed.querySelectorAll('[data-k]').forEach(el => el.onclick = () => showRegion(el.dataset.k));
}
function card(c, withRegion) {
  const G = GROUPS[c.g] || GROUPS[0];
  return `<div class="mcard${V.fresh.has(c.id) ? ' new' : ''}" data-k="${c.r}" style="--gc:${G.c};cursor:pointer">
    ${withRegion ? `<div class="rg">📍 ${esc(regLabel(c.r))}</div>` : ''}
    <div class="h">${groupDot(c.g)}${catTag(c.c)}<span class="nm">${esc(c.n)}</span>${c.st === 'ok' ? '<span class="stag st-ok">확인 완료</span>' : ''}</div>
    <div class="w">${esc(c.w)}</div>
    <div class="meta">알리는 방법: ${esc(labs(METHODS, c.m))}${c.h ? ' · ' + esc(c.h) : ''}</div></div>`;
}
function showRegion(k) {
  const r = REG[k]; if (!r) return;
  V.map.select(k);
  const here = visibleCards(V.cards, V.cfg).filter(c => c.r === k);
  const s = openSheet(`<header><h2>📍 ${esc(r.full)}</h2><button class="btn" data-close>닫기</button></header>
    <div class="body bigsheet">${here.length ? here.map(c => `<div class="mcard" style="--gc:${(GROUPS[c.g] || GROUPS[0]).c}">
      <div class="h">${groupDot(c.g)}${catTag(c.c)}<span class="nm">${esc(c.n)}</span></div><div class="w">${esc(c.w)}</div>
      <div class="meta">어떤 방법으로: ${esc(labs(METHODS, c.m))}${c.h ? ' · ' + esc(c.h) : ''}${c.t ? `<br>활용한 지역 특성: ${esc(labs(TRAITS, c.t))}` : ''}<br>출처: ${esc(lab(SOURCES, c.src))}</div></div>`).join('') : '<p class="muted" style="font-size:20px">아직 이 지역은 아무도 찾지 않았어요.</p>'}</div>`,
    { wide: true, onClose: () => V.map.select(null) });
  return s;
}
