/* 자리 경매 — 교실 TV 화면 (공개 정보만 읽음) */
const V = { code: (qp.get('r') || '').toUpperCase(), cfg: undefined, core: undefined, pres: {}, claims: {}, err: '', lastShown: null };
const R = () => ROOM(V.code);
const st = () => (V.core && V.core.st) || {};

(async function boot() {
  connBanner();
  startTicker(st, () => render());
  if (!V.code) { render(); return; }
  try { await DB.ready(true); } catch (e) { V.err = '접속하지 못했어요'; render(); return; }
  DB.on(R() + '/cfg', v => { V.cfg = v; if (v === null) V.err = '참여 코드 ' + V.code + ' 를 찾을 수 없어요'; render(); }, e => { V.err = '읽을 수 없어요'; render(); });
  DB.on(R() + '/core', v => { V.core = v; render(); });
  DB.on(R() + '/pres', v => { V.pres = v || {}; render(); });
  DB.on(R() + '/claims', v => { V.claims = v || {}; render(); });
})();

function render() {
  const s = st();
  document.body.className = 'tv ph-' + (s.ph || 'none');
  paint($('#main'), body());
}
function body() {
  if (!V.code) return `<div class="tv-center"><h1>🪙 자리 경매 TV 화면</h1><p>주소 끝에 <b>?r=참여코드</b> 를 붙여 열어 주세요.</p></div>`;
  if (V.err) return `<div class="tv-center"><h1>😢</h1><p>${esc(V.err)}</p></div>`;
  if (!V.cfg || !V.core) return `<div class="tv-center"><p>불러오는 중…</p></div>`;
  const s = st();
  const head = `<div class="tv-head"><span class="title">🪙 ${esc(V.cfg.name || '')} 자리 경매</span><span class="grow"></span>
    <span class="pill">접속 ${online()} / ${rosterList(V.cfg).length}명</span><span class="pill">${esc(PH_NAME[s.ph] || '대기')}</span></div>`;
  let inner;
  switch (s.ph) {
    case 'ready': inner = ready(); break;
    case 'bid': inner = bidding(); break;
    case 'result': inner = result(); break;
    case 'assign': inner = assign(); break;
    case 'final': inner = final(); break;
    default: inner = idle();
  }
  return head + inner;
}
const online = () => rosterList(V.cfg).filter(r => isOnline(V.pres, V.claims, r.id)).length;
const doneCls = id => { const d = V.core.done && V.core.done[id]; return d === 'won' ? 'won' : d === 'fail' ? 'fail' : ''; };
function auctionMap(hl, size) {
  const own = V.core.own || {};
  return seatMap({ cfg: V.cfg, hl, size: size || 'l', cls: doneCls,
    label: (id, s) => `<b class="no">${s.no}</b>${own[id] ? `<span class="nm">${esc(sname(V.cfg, own[id]))}</span>` : (V.core.done && V.core.done[id] === 'fail' ? '<span class="tag">유찰</span>' : '')}` });
}
function idle() {
  const any = V.core.hist && Object.values(V.core.hist).some(h => h.status === 'ok');
  if (!any) return `<div class="tv-split"><div class="tv-left tv-hero"><div class="big-coin">🪙</div><h1>오늘의 자리 경매</h1>
      <p class="tv-sub">태블릿으로 들어와 내 번호를 고르세요</p><div class="tv-stat">접속 <b>${online()}</b> / ${rosterList(V.cfg).length}명</div>
      <p class="tv-sub">선생님이 곧 경매를 시작해요</p></div>
    <div class="tv-right">${auctionMap(null)}</div></div>`;
  return `<div class="tv-split even"><div class="tv-left"><h2 class="tv-h">다음 경매를 준비하고 있어요</h2>${coinBoard()}</div><div class="tv-right">${auctionMap(null)}</div></div>`;
}
function ready() {
  const s = st();
  return `<div class="tv-split"><div class="tv-left tv-hero"><div class="tv-sub">다음 경매 자리</div><div class="tv-seat pop">${seatNo(V.cfg, s.seat)}번</div>
    <p class="tv-sub">곧 입찰이 시작돼요!<br>몇 코인을 낼지 정해 두세요</p></div><div class="tv-right">${auctionMap(s.seat)}</div></div>`;
}
function bidding() {
  const s = st();
  const ms = remaining(s);
  return `<div class="tv-split"><div class="tv-left tv-hero">
      <div class="tv-sub">${s.n || ''}번째 경매 · <b>${seatNo(V.cfg, s.seat)}번 자리</b></div>
      <div class="count tv-count" data-count>${ms == null ? '' : Math.ceil(ms / 1000)}</div>
      <div class="bar tv-bar"><i data-bar></i></div>
      <div class="tv-sub">${ms === 0 ? '⏰ 마감! 결과를 계산하고 있어요' : '태블릿에서 입찰하세요'}</div>
      <div class="tv-stat">참여할 수 있는 학생 <b>${online()}</b>명</div>
    </div><div class="tv-right">${auctionMap(s.seat)}</div></div>`;
}
function result() {
  const s = st();
  const L = V.core.last;
  if (!L || L.rid !== s.rid) return idle();
  const keys = Object.keys(L.hist || {}).map(k => +k.slice(1)).sort((a, b) => b - a);
  const max = Math.max(1, ...Object.values(L.hist || {}));
  const hist = keys.length ? `<div class="hist tv-hist">${keys.map(a => {
    const n = L.hist['a' + a];
    const cls = a === L.amt && L.win ? 'w' : n > 1 ? 'x' : '';
    return `<div class="h ${cls}"><div class="b" style="height:${3 + 9 * n / max}vh">${n}명</div><div class="lab">${a}코인</div><div class="small">${cls === 'w' ? '낙찰' : n > 1 ? '같은 금액 제외' : ''}</div></div>`;
  }).join('')}</div>` : '<p class="tv-sub">아무도 입찰하지 않았어요</p>';
  const head = L.win
    ? `<div class="tv-sub">${seatNo(V.cfg, L.seat)}번 자리 낙찰!</div><div class="tv-winner pop">${esc(sname(V.cfg, L.win))}</div><div class="tv-amt"><span class="coin">¢</span> ${L.amt}코인</div>`
    : `<div class="tv-sub">${seatNo(V.cfg, L.seat)}번 자리</div><div class="tv-winner pop fail">유찰!</div><div class="tv-sub">${L.cnt ? '혼자 낸 금액이 없어요' : '아무도 입찰하지 않았어요'}</div>`;
  return `<div class="tv-split even"><div class="tv-left tv-hero">${head}${hist}</div>
    <div class="tv-right">${coinBoard(L)}<div style="margin-top:1.4vh">${auctionMap(null, 's')}</div></div></div>`;
}
function coinBoard(L) {
  const list = rosterList(V.cfg);
  const coins = V.core.coins || {};
  const own = AL.ownedBy(V.core.own);
  return `<div class="board-coins">${list.map(r => {
    const d = L && L.ded && L.ded[r.id];
    const n = (own[r.id] || []).length;
    return `<div class="bc ${L && L.win === r.id ? 'w' : ''}"><span class="nm">${esc(sname(V.cfg, r.id))}</span><span class="grow"></span>${d ? `<span class="minus">−${d}</span>` : n ? `<span class="pill purple">🪑${n}</span>` : ''}<span class="cv"><span class="coin">¢</span>${coins[r.id] || 0}</span></div>`;
  }).join('')}</div>`;
}
function namedMap(size) {
  const sit = V.core.sit || {}, own = V.core.own || {};
  return seatMap({ cfg: V.cfg, size: size || 'l',
    cls: id => sit[id] ? 'sat' : own[id] ? 'ownedfree' : '',
    label: (id, s) => `<b class="no">${s.no}</b>${sit[id] ? `<span class="nm">${esc(sname(V.cfg, sit[id]))}</span>` : own[id] ? `<span class="tag">${esc(sname(V.cfg, own[id]))}의 자리</span>` : ''}` });
}
function assign() {
  const ctx = { layout: V.cfg.layout, own: V.core.own, sit: V.core.sit, roster: V.cfg.roster };
  const s = AL.assignStats(ctx);
  return `<div class="tv-full"><div class="row tv-assign-head"><h2 class="tv-h">🪑 자리를 배정하고 있어요</h2><span class="grow"></span>
    <span class="pill good">자리 확정 ${s.seated}명</span><span class="pill">남은 학생 ${s.unseated.length}명</span></div>
    ${namedMap('l')}</div>`;
}
function final() {
  return `<div class="tv-full"><h1 class="tv-h center pop" style="font-size:5vh">🎉 자리 배정 완료!</h1>${namedMap('l')}</div>`;
}
