/* 구석구석 — 학생 태블릿 화면 */
'use strict';
const S = { uid: null, g: null, cfg: {}, cards: {}, info: {}, sel: null, sido: null, map: null, started: false, lastSrc: ls.get('gusuk.lastSrc', {}) };
const app = $('#app');

(async function init() {
  try { await DB.ready(); } catch (e) { app.innerHTML = '<div class="loading">연결하지 못했어요. 인터넷을 확인하고 새로 고침 해 주세요.</div>'; return; }
  S.uid = DB.uid();
  DB.on(`${ROOT}/cfg`, v => { S.cfg = v || {}; refresh(); });
  DB.on(`${ROOT}/cards`, v => {
    const before = S.cards; S.cards = v || {};
    if (S.map) Object.entries(S.cards).forEach(([id, c]) => { if (!before[id] && S.started && c && c.g !== S.g) S.map.flash(c.r); });
    S.started = true;
    refresh();
  });
  DB.on(`${ROOT}/dev/${S.uid}`, v => {
    const g = v == null ? null : Number(v);
    if (g !== S.g) { S.g = g; if (g) ls.set('gusuk.g', g); render(); }
    else if (!app.dataset.v) render();
  }, () => { if (!app.dataset.v) render(); });
})();

/* ---------- 큰 화면 나누기 ---------- */
function render() {
  if (!S.g) return renderStart();
  if (app.dataset.v === 'main' && S.map) { refresh(); return; }
  app.dataset.v = 'main';
  const G = GROUPS[S.g];
  app.innerHTML = `<header class="top">
      <div class="brand">${LOGO}<div><h1>구석구석 다 함께 찾아요</h1><small>사회 4-2 · 지역을 알리기 위한 노력</small></div></div>
      <div class="sp"></div><div id="goal"></div>
      <button class="mygroup g${S.g}" id="mygroup" style="--gc:${G.c}" title="모둠 바꾸기">${esc(G.name)}</button>
    </header>
    <div id="banner"></div>
    <div class="smain">
      <section class="mapcol">
        <div class="finder">
          <div class="searchrow"><input id="q" type="search" placeholder="지역 이름 찾기 (예: 강릉, ㄱㄹ)" autocomplete="off" aria-label="지역 이름 찾기"><button class="btn" id="mycards">우리 모둠 카드</button></div>
          <div class="results hide" id="results" role="listbox"></div>
          <div class="sidorow" id="sidorow"></div>
        </div>
        <div class="mapbox" id="map"></div>
        <div class="legend" id="legend"></div>
      </section>
      <aside class="side" id="side"></aside>
    </div>`;
  S.map = new GMap($('#map'), { onPick: pick });
  $('#mygroup').onclick = changeGroup;
  $('#mycards').onclick = myCardsSheet;
  const q = $('#q');
  q.addEventListener('input', showResults);
  q.addEventListener('focus', showResults);
  q.addEventListener('keydown', e => { if (e.key === 'Enter') { const b = $('#results button'); if (b) b.click(); } if (e.key === 'Escape') hideResults(); });
  document.addEventListener('click', e => { if (!e.target.closest('.finder')) hideResults(); });
  refresh();
  setTimeout(() => S.map.apply(), 50);
}
const LOGO = `<svg class="logo" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="#1F6F78"/><circle cx="20" cy="20" r="14" fill="none" stroke="#fff" stroke-opacity=".35"/><path d="M20 6l5 14-5 14-5-14z" fill="#fff"/><path d="M20 6l5 14h-10z" fill="#F2C12E"/></svg>`;

function renderStart() {
  app.dataset.v = 'start'; S.map = null;
  app.innerHTML = `<header class="top"><div class="brand">${LOGO}<div><h1>구석구석 다 함께 찾아요</h1><small>사회 4-2 · 지역을 알리기 위한 노력</small></div></div></header>
  <div class="startwrap"><div class="startbox">
    <div><h2>우리 모둠을 골라요</h2><p class="muted" style="margin:6px 0 0">한 번 고르면 이 기기는 그 모둠으로 기억돼요. 잘못 골랐다면 선생님께 말해요.</p></div>
    <div class="ggrid">${GNUMS.map(g => `<button class="gbtn g${g}" data-g="${g}" style="--gc:${GROUPS[g].c}"><svg viewBox="0 0 100 60" preserveAspectRatio="none"><defs>${groupPatterns('st')}</defs><rect width="100" height="60" fill="url(#stpg${g})"/></svg><span>${g}모둠</span></button>`).join('')}</div>
  </div></div>`;
  app.querySelectorAll('[data-g]').forEach(b => b.onclick = async () => {
    const g = Number(b.dataset.g);
    if (!(await ask(`${g}모둠이 맞나요?`, `<b style="color:${GROUPS[g].c}">${g}모둠</b>으로 시작해요.`, '네, 시작해요', '다시 고를게요'))) return;
    try { await DB.set(`${ROOT}/dev/${S.uid}`, g); }
    catch (e) { fail('모둠을 정하지 못했어요. 선생님께 말해 주세요.')(e); }
  });
}

/* ---------- 바뀔 때마다 ---------- */
function refresh() {
  if (!S.map) return;
  const vis = visibleCards(S.cards, S.cfg);
  S.info = paintInfo(vis);
  S.map.setPaint(S.info);
  S.map.setHome(S.cfg.home || '41590');
  $('#goal').innerHTML = goalHtml(S.info);
  $('#banner').innerHTML = S.cfg.lock ? '<div class="banner">🔒 선생님이 잠시 멈췄어요. 지금은 카드를 올릴 수 없어요.</div>' : '';
  const filled = filledSido(S.info);
  $('#sidorow').innerHTML = SIDO.map(s => `<button class="chip${S.sido === s.s ? ' on' : ''}" data-s="${s.s}">${esc(s.sh)}${filled.has(s.s) ? '<span class="f"></span>' : ''}</button>`).join('');
  $$('#sidorow [data-s]').forEach(b => b.onclick = () => pickSido(b.dataset.s));
  const counts = {}; allCards(S.cards).forEach(c => { counts[c.g] = (counts[c.g] || 0) + 1; });
  $('#legend').innerHTML = GNUMS.map(g => `<span style="--gc:${GROUPS[g].c}"><i></i>${g}모둠 ${counts[g] || 0}</span>`).join('') + `<span class="muted" style="font-weight:600">왼쪽 절반은 먼저 찾은 모둠, 오른쪽 절반은 가장 많이 찾은 모둠 색이에요 · 다른 모둠은 점</span>`;
  renderSide();
}

/* ---------- 고르기 ---------- */
function pick(k) {
  const r = REG[k]; if (!r) return;
  S.sel = k; S.sido = r.s;
  S.map.select(k);
  if (S.map.zoomLevel() < 1.6) S.map.zoomTo(r.whole ? r.b : SIDO_BY[r.s].b);
  hideResults();
  refresh();
  const side = $('#side'); if (side) side.scrollTop = 0;
}
function pickSido(s) {
  S.sido = s; S.sel = null; S.map.select(null);
  S.map.zoomTo(SIDO_BY[s].b);
  refresh();
}
function showResults() {
  const q = $('#q').value.trim(), box = $('#results');
  if (!q) return hideResults();
  const rs = searchRegions(q, 10);
  box.innerHTML = rs.length ? rs.map(r => `<button data-k="${r.k}" role="option">${S.info[r.k] ? groupDot(S.info[r.k].first) : '<span style="width:22px"></span>'}<b>${esc(r.label)}</b><small>${esc(r.whole ? '시·도 전체' : r.sido.sn)}</small></button>`).join('')
    : '<div style="padding:12px 14px" class="muted">찾는 지역이 없어요. 이름을 다시 확인해요.</div>';
  box.classList.remove('hide');
  box.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { $('#q').value = ''; pick(b.dataset.k); });
}
const hideResults = () => { const b = $('#results'); if (b) b.classList.add('hide'); };

/* ---------- 오른쪽 칸 ---------- */
function myCards() { return allCards(S.cards).filter(c => c.g === S.g); }
function cardHtml(c, mine) {
  const G = GROUPS[c.g] || GROUPS[0];
  const showSt = mine || c.st === 'ok';
  return `<div class="mcard" style="--gc:${G.c}">
    <div class="h">${groupDot(c.g)}${catTag(c.c)}<span class="nm">${esc(c.n)}</span>${showSt ? stTag(c.st) : ''}</div>
    <div class="w">${esc(c.w)}</div>
    <div class="meta">알리는 방법: ${esc(labs(METHODS, c.m))}${c.h ? ' · ' + esc(c.h) : ''}${c.t ? `<br>활용한 특성: ${esc(labs(TRAITS, c.t))}` : ''}<br>출처: ${esc(lab(SOURCES, c.src))}${c.url ? ` · <a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.url.replace(/^https?:\/\//, '').slice(0, 40))}</a>` : ''}</div>
    ${mine && c.st === 'fix' && c.memo ? `<div class="memo">✏️ 선생님: ${esc(c.memo)}</div>` : ''}
    ${mine && c.st !== 'ok' ? `<div><button class="btn small ${c.st === 'fix' ? 'warn' : ''}" data-fix="${c.id}">${c.st === 'fix' ? '고치기' : '다시 쓰기'}</button></div>` : ''}
  </div>`;
}
function fixAlertHtml() {
  const fx = myCards().filter(c => c.st === 'fix');
  if (!fx.length) return '';
  return `<div class="fixalert">✏️ 선생님이 고쳐 달라고 한 카드가 ${fx.length}장 있어요${fx.map(c => `<button class="btn small warn" data-fix="${c.id}" style="justify-self:start">${esc(regLabel(c.r))} · ${esc(c.n)} 고치기</button>`).join('')}</div>`;
}
function renderSide() {
  const side = $('#side'); if (!side) return;
  let h = '';
  const fa = fixAlertHtml();
  if (fa) h += `<div class="sec">${fa}</div>`;
  if (S.sel) h += regionSec(S.sel);
  else if (S.sido) h += sidoSec(S.sido);
  else h += introSec();
  side.innerHTML = h;
  side.querySelectorAll('[data-fix]').forEach(b => b.onclick = () => openEditor({ id: b.dataset.fix }));
  side.querySelectorAll('[data-pick]').forEach(b => b.onclick = () => pick(b.dataset.pick));
  side.querySelectorAll('[data-src]').forEach(a => a.addEventListener('click', () => { S.lastSrc[S.sel] = a.dataset.src; ls.set('gusuk.lastSrc', S.lastSrc); }));
  const w = side.querySelector('#write'); if (w) w.onclick = () => openEditor({ r: S.sel });
  const back = side.querySelector('#back'); if (back) back.onclick = () => { if (S.sel && !REG[S.sel].whole) { S.sel = null; S.map.select(null); } else { S.sel = null; S.sido = null; S.map.select(null); S.map.zoomTo(null); } refresh(); };
}
function introSec() {
  const home = S.cfg.home || '41590';
  const recent = allCards(S.cards).slice(-4).reverse();
  return `<div class="sec"><h2>어떻게 찾을까요?</h2>
    <ol class="steps"><li>지도에서 지역을 누르거나 이름을 찾아요.</li><li><b>자료 찾기</b>로 공인된 누리집을 살펴봐요.</li><li>그 지역이 무엇을, 어떤 방법으로 알리는지 카드에 써요.</li></ol>
    <div class="tip">⭐ <b>우리 지역 ${esc(regLabel(home))}</b>부터 찾아볼까요?<br><button class="btn small primary" data-pick="${home}" style="margin-top:6px">${esc(regLabel(home))} 보기</button></div></div>
    <div class="sec"><h3>찾을 것</h3><div class="chips">${CAT_KEYS.map(catTag).join('')}</div></div>
    ${recent.length ? `<div class="sec"><h3>방금 올라온 카드</h3><div class="cards">${recent.map(c => `<button class="lnk" data-pick="${c.r}" style="text-align:left">${groupDot(c.g)}<span>${esc(c.n)}<small>${esc(regLabel(c.r))} · ${CATS[c.c] ? CATS[c.c].name : ''}</small></span></button>`).join('')}</div></div>` : ''}`;
}
function sidoSec(s) {
  const sd = SIDO_BY[s], regs = regionsOf(s);
  const wk = 'S' + s;
  return `<div class="sec"><div class="rhead"><div class="t"><h2>${esc(sd.sn)}</h2><small>지역을 골라요 · 지도에서 눌러도 돼요</small></div><button class="btn small" id="back">전국</button></div>
    <div class="reglist">${regs.map(r => { const x = S.info[r.k]; return `<button class="chip" data-pick="${r.k}" style="--gc:${x ? `linear-gradient(90deg,${GROUPS[x.first].c} 50%,${GROUPS[x.most].c} 50%)` : '#fff'}"><i></i>${esc(r.whole ? r.label : r.n)}${r.k === (S.cfg.home || '41590') ? ' ⭐' : ''}</button>`; }).join('')}</div>
    ${s === '36' ? '' : `<button class="chip" data-pick="${wk}" style="justify-self:start">🗺️ ${esc(sd.sn)} 전체로 쓰기</button><p class="muted" style="margin:0">여러 시·군이 함께 여는 축제나 ${esc(sd.sh)} 전체의 상징은 '전체'로 써요.</p>`}</div>`;
}
function regionSec(k) {
  const r = REG[k], here = allCards(S.cards).filter(c => c.r === k), x = S.info[k];
  const isHome = k === (S.cfg.home || '41590');
  const last = S.lastSrc[k];
  return `<div class="sec"><div class="rhead"><div class="t"><h2>${isHome ? '⭐ ' : ''}${esc(r.label)}</h2><small>${esc(r.full)}${isHome ? ' · 우리 지역' : ''}</small></div><button class="btn small" id="back">← ${r.whole ? '전국' : esc(r.sido.sh)}</button></div>
    ${x ? `<div class="muted">처음 찾은 모둠: ${groupDot(x.first)} · 가장 많이 찾은 모둠: ${groupDot(x.most)} ${x.cnt[x.most]}장${restGroups(x).length ? ` · 함께 찾은 모둠: ${restGroups(x).map(groupDot).join(' ')}` : ''}</div>${x.most !== x.first ? '' : x.groups.length > 1 ? `<div class="muted" style="font-size:13px">다른 모둠이 ${GROUPS[x.first].name}보다 카드를 더 많이 올리면 지도의 오른쪽 절반을 차지해요</div>` : ''}` : `<div class="muted">아직 아무도 찾지 않았어요. 우리가 처음 찾아볼까요?</div>`}
    <button class="btn primary big" id="write" ${S.cfg.lock ? 'disabled' : ''}>＋ 이 지역 카드 쓰기</button></div>
    <div class="sec"><h3>🔎 자료 찾기</h3><div class="links">
      <a class="lnk gs" data-src="gs" href="${LINKS.gs(k)}" target="_blank" rel="noopener"><span class="ic">🧭</span><span>대한민국 구석구석에서 찾기<small>한국관광공사 · '${esc(searchWord(k))}' 검색${last === 'gs' ? ' · 최근에 열어 봄' : ''}</small></span></a>
      <a class="lnk web" data-src="web" href="${LINKS.web(k)}" target="_blank" rel="noopener"><span class="ic">🏛️</span><span>${esc(searchWord(k))} 문화 관광 누리집 찾기<small>검색 결과에서 주소가 go.kr 로 끝나는 곳을 골라요${last === 'web' ? ' · 최근에 열어 봄' : ''}</small></span></a></div>
      <div class="qlinks">${CAT_KEYS.map(c => `<a data-src="web" style="--cc:${CATS[c].c}" href="${LINKS.cat(k, c)}" target="_blank" rel="noopener">${CATS[c].icon} ${esc(searchWord(k))} ${CATS[c].name === '자랑거리' ? '관광지' : CATS[c].name === '상징' ? '캐릭터' : CATS[c].name}</a>`).join('')}</div>
      <div class="tip">주소가 <b>go.kr</b>(시청·군청·구청), <b>visitkorea.or.kr</b>(대한민국 구석구석)로 끝나는 곳이 공인된 자료예요. 블로그 글은 출처로 쓰지 않아요.</div></div>
    <div class="sec"><h3>이 지역에서 찾은 것 (${here.length})</h3>${here.length ? `<div class="cards">${here.map(c => cardHtml(c, c.g === S.g)).join('')}</div>` : '<div class="muted">아직 없어요.</div>'}</div>`;
}

/* ---------- 우리 모둠 카드 ---------- */
function myCardsSheet() {
  const list = myCards().reverse();
  const s = openSheet(`<header><h2 style="color:${GROUPS[S.g].c}">${S.g}모둠이 찾은 카드 ${list.length}장</h2><button class="btn small" data-close>닫기</button></header>
    <div class="body">${list.length ? list.map(c => `<div><div class="muted" style="font-weight:700;margin-bottom:3px">📍 ${esc(regLabel(c.r))}</div>${cardHtml(c, true)}</div>`).join('') : '<p class="muted">아직 카드가 없어요. 지도에서 지역을 골라 첫 카드를 써 봐요!</p>'}</div>`);
  s.el.querySelectorAll('[data-fix]').forEach(b => b.onclick = () => { s.close(); openEditor({ id: b.dataset.fix }); });
}

/* ---------- 모둠 바꾸기 (선생님 PIN) ---------- */
async function changeGroup() {
  const pin = await pinSheet('모둠 바꾸기', '모둠을 바꾸려면 <b>선생님 PIN</b>이 필요해요');
  if (!pin) return;
  if (!(await pinLogin(pin))) { toast('PIN이 맞지 않아요', 'err'); return; }
  const s = openSheet(`<header><h2>어느 모둠으로 바꿀까요?</h2></header><div class="body"><div class="ggrid">${GNUMS.map(g => `<button class="gbtn g${g}" data-g="${g}" style="--gc:${GROUPS[g].c}"><span>${g}모둠</span></button>`).join('')}</div></div><footer><button class="btn" data-close>그대로 두기</button></footer>`,
    { onClose: () => pinLogout() });
  s.el.querySelectorAll('[data-g]').forEach(b => b.onclick = async () => {
    try { await DB.set(`${ROOT}/dev/${S.uid}`, Number(b.dataset.g)); toast(`${b.dataset.g}모둠으로 바꿨어요`, 'ok'); }
    catch (e) { fail()(e); }
    s.close();
  });
}

/* ---------- 카드 쓰기 ---------- */
let ED = null;
const blank = () => ({ n: '', w: '', m: [], h: '', t: [], src: '', url: '' });
function openEditor(o) {
  if (o.id) {
    const c = S.cards[o.id]; if (!c) return;
    ED = { mode: 'fix', id: o.id, r: c.r, cats: [c.c], cur: c.c, data: { [c.c]: { n: c.n || '', w: c.w || '', m: codes(c.m), h: c.h || '', t: codes(c.t), src: c.src || '', url: c.url || '' } }, orig: c, bad: {} };
  } else {
    ED = { mode: 'new', r: o.r, cats: [], cur: null, data: {}, bad: {} };
  }
  const r = REG[ED.r];
  ED.sheet = openSheet(`<header><h2>${ED.mode === 'fix' ? '카드 고치기' : '카드 쓰기'} · ${esc(r.label)}</h2><button class="btn small" data-close>닫기</button></header><div class="body" id="edbody"></div>
    <footer><span class="muted" style="margin-right:auto;align-self:center">✍️ 누리집 글을 그대로 베끼지 말고 <b>내 말로</b> 써요</span><button class="btn" data-close>취소</button><button class="btn primary" id="edsave"></button></footer>`, { noBgClose: true, onClose: () => { ED = null; } });
  ED.sheet.el.querySelector('#edsave').onclick = saveEditor;
  edRender();
}
function edRender() {
  if (!ED) return;
  const body = ED.sheet.el.querySelector('#edbody');
  let h = `<div class="field"><div class="lb">${ED.mode === 'fix' ? '무엇에 대한 카드인가요?' : '무엇을 찾았나요? <span class="muted" style="font-weight:600">여러 개 골라도 돼요</span>'}</div>
    <div class="catbtns" style="display:grid;grid-template-columns:repeat(4,1fr)">${CAT_KEYS.map(c => `<button type="button" class="catbtn${ED.cats.includes(c) ? ' on' : ''}" data-cat="${c}" style="--cc:${CATS[c].c}"><span class="i">${CATS[c].icon}</span>${CATS[c].name}</button>`).join('')}</div></div>`;
  if (!ED.cats.length) h += `<div class="tip">위에서 <b>축제·특산물·자랑거리·상징</b> 중 찾은 것을 골라요.</div>`;
  else {
    if (ED.cats.length > 1) h += `<div class="tabs">${ED.cats.map(c => `<button type="button" class="tab${ED.cur === c ? ' on' : ''}" data-tab="${c}" style="--cc:${CATS[c].c}">${CATS[c].icon} ${CATS[c].name}${ED.bad[c] ? '<span class="x">●</span>' : ''}</button>`).join('')}</div>`;
    h += formHtml(ED.cur);
  }
  body.innerHTML = h;
  const save = ED.sheet.el.querySelector('#edsave');
  save.textContent = ED.mode === 'fix' ? '고쳐서 다시 올리기' : ED.cats.length > 1 ? `카드 ${ED.cats.length}장 올리기` : '카드 올리기';
  save.disabled = !ED.cats.length || !!S.cfg.lock;
  body.querySelectorAll('[data-cat]').forEach(b => b.onclick = () => {
    const c = b.dataset.cat;
    if (ED.mode === 'fix') { const old = ED.data[ED.cur]; ED.cats = [c]; ED.data = { [c]: old }; ED.cur = c; }
    else if (ED.cats.includes(c)) { ED.cats = ED.cats.filter(x => x !== c); if (ED.cur === c) ED.cur = ED.cats[0] || null; }
    else { ED.cats.push(c); ED.data[c] = ED.data[c] || blank(); ED.cur = c; }
    edRender();
  });
  body.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { ED.cur = b.dataset.tab; edRender(); });
  if (!ED.cur) return;
  const d = ED.data[ED.cur];
  const bind = (id, key, max) => {
    const el = body.querySelector('#' + id); if (!el) return;
    el.addEventListener('input', () => { d[key] = el.value.slice(0, max); const cn = body.querySelector(`[data-cnt="${key}"]`); if (cn) cn.textContent = `${d[key].length}/${max}`; });
  };
  bind('f_n', 'n', LIMIT.n); bind('f_w', 'w', LIMIT.w); bind('f_h', 'h', LIMIT.h); bind('f_url', 'url', LIMIT.url);
  body.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { tog(d.m, b.dataset.m); b.classList.toggle('on'); });
  body.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { tog(d.t, b.dataset.t); b.classList.toggle('on'); });
  body.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { d.src = b.dataset.s; body.querySelectorAll('[data-s]').forEach(x => x.classList.toggle('on', x === b)); });
}
const tog = (arr, v) => { const i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else arr.push(v); };
function formHtml(c) {
  const d = ED.data[c], C = CATS[c], bad = ED.bad[c] || {};
  if (!d.src && ED.mode === 'new') d.src = S.lastSrc[ED.r] || '';
  const f = (key, inner, cls) => `<div class="field${bad[key] ? ' bad' : ''}${cls ? ' ' + cls : ''}">${inner}</div>`;
  return `<div style="display:grid;gap:14px;border:1.5px solid color-mix(in srgb,${C.c} 30%,#fff);border-radius:14px;padding:14px;background:color-mix(in srgb,${C.c} 3%,#fff)">
    ${f('n', `<label for="f_n">${C.icon} ${C.name} 이름<span class="cnt" data-cnt="n">${d.n.length}/${LIMIT.n}</span></label><input type="text" id="f_n" maxlength="${LIMIT.n}" value="${esc(d.n)}" placeholder="${esc(C.ex[0])}">`)}
    ${f('w', `<label for="f_w">무엇을 알리고 있나요?<span class="cnt" data-cnt="w">${d.w.length}/${LIMIT.w}</span></label><textarea id="f_w" maxlength="${LIMIT.w}" placeholder="${esc(C.ex[1])}">${esc(d.w)}</textarea>`)}
    ${f('m', `<div class="lb">어떤 방법으로 알리고 있나요? <span class="muted" style="font-weight:600">여러 개 골라요</span></div><div class="chips">${METHODS.map(([k, v]) => `<button type="button" class="chip${d.m.includes(k) ? ' on' : ''}" data-m="${k}">${v}</button>`).join('')}</div>
      <input type="text" id="f_h" maxlength="${LIMIT.h}" value="${esc(d.h)}" placeholder="더 쓰고 싶은 말 (선택) 예: 드라마로 재미있게 소개해요">`)}
    ${f('t', `<div class="lb">어떤 지역 특성을 활용했나요? <span class="muted" style="font-weight:600">골라요 (선택)</span></div><div class="chips">${TRAITS.map(([k, v]) => `<button type="button" class="chip${d.t.includes(k) ? ' on' : ''}" data-t="${k}">${v}</button>`).join('')}</div>`)}
    ${f('src', `<div class="lb">어디에서 찾았나요? (출처)</div><div class="chips">${SOURCES.map(([k, v]) => `<button type="button" class="chip${d.src === k ? ' on' : ''}" data-s="${k}">${v}</button>`).join('')}</div>
      <input type="url" id="f_url" maxlength="${LIMIT.url}" value="${esc(d.url)}" placeholder="누리집 주소를 붙여 넣어도 돼요 (선택) https://…">`)}
  </div>`;
}
function checkCat(d) {
  const b = {};
  if (!d.n.trim()) b.n = 1;
  if (!d.w.trim()) b.w = 1;
  if (!d.m.length) b.m = 1;
  if (!d.src) b.src = 1;
  if (d.url.trim() && !/^https?:\/\/\S+$/i.test(d.url.trim())) b.src = 1;
  return b;
}
async function saveEditor() {
  if (!ED) return;
  ED.bad = {};
  let first = null;
  for (const c of ED.cats) { const b = checkCat(ED.data[c]); if (Object.keys(b).length) { ED.bad[c] = b; if (!first) first = c; } }
  if (first) { ED.cur = first; edRender(); toast('빨간 칸을 채워 주세요', 'err'); return; }
  /* 같은 지역·같은 분류에 비슷한 이름이 이미 있나? */
  if (ED.mode === 'new') {
    const here = allCards(S.cards).filter(c => c.r === ED.r);
    const dup = [];
    ED.cats.forEach(c => {
      const nn = normName(ED.data[c].n);
      here.forEach(x => { const xn = normName(x.n); if (x.c === c && nn && xn && (nn === xn || (nn.length >= 2 && xn.includes(nn)) || (xn.length >= 2 && nn.includes(xn)))) dup.push(x); });
    });
    if (dup.length) {
      const msg = dup.map(x => `${groupDot(x.g)} <b>${esc(x.n)}</b> (${CATS[x.c].name})`).join('<br>');
      if (!(await ask('이미 찾은 것 같아요', `${msg}<br><br>다른 모둠이 먼저 찾았어요. 우리 모둠은 <b>다른 것</b>을 찾아볼까요?`, '그래도 올리기', '다른 것 찾아볼게요'))) return;
    }
  }
  const btn = ED.sheet.el.querySelector('#edsave'); btn.disabled = true;
  const mk = c => {
    const d = ED.data[c];
    const o = { g: S.g, r: ED.r, c, n: d.n.trim(), w: d.w.trim(), m: d.m.join(','), src: d.src, st: 'rv', u: S.uid };
    if (d.h.trim()) o.h = d.h.trim();
    if (d.t.length) o.t = d.t.join(',');
    if (d.url.trim()) o.url = d.url.trim();
    return o;
  };
  try {
    if (ED.mode === 'fix') {
      const o = mk(ED.cur), old = ED.orig;
      o.ts = old.ts; o.up = DB.TS; o.fx = true; o.u = old.u || S.uid;
      if (old.memo) o.memo = old.memo;
      if (old.tch) o.tch = old.tch;
      await DB.set(`${ROOT}/cards/${ED.id}`, o);
      toast('고쳐서 다시 올렸어요!', 'ok');
    } else {
      for (const c of ED.cats) { const o = mk(c); o.ts = DB.TS; await DB.set(`${ROOT}/cards/${DB.key()}`, o); }
      toast(ED.cats.length > 1 ? `카드 ${ED.cats.length}장을 올렸어요!` : '카드를 올렸어요!', 'ok');
    }
    const r = ED.r;
    ED.sheet.close();
    if (S.map) S.map.flash(r);
  } catch (e) { btn.disabled = false; fail()(e); }
}
