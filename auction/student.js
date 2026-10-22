/* 자리 경매 — 학생 태블릿 화면 */
const S = {
  code: (qp.get('r') || ls.get('auction.room', '') || '').toUpperCase().trim(),
  uid: null, cfg: undefined, core: undefined, claims: {}, pres: {},
  sid: undefined, req: undefined, bid: undefined, bidRid: null,
  seq: 0, pending: null, acked: null, ackRid: null, lastErr: '',
  err: '', busy: false, kicked: false
};
const L_ = {};
function listen(key, path, cb) {
  if (L_[key] && L_[key].path === path) return;
  if (L_[key]) L_[key].off();
  L_[key] = { path, off: DB.on(path, cb, e => { console.warn(path, e); }) };
}
function unlisten(key) { if (L_[key]) { L_[key].off(); delete L_[key]; } }
const R = () => ROOM(S.code);
const st = () => (S.core && S.core.st) || {};
const coins = () => Number(S.core && S.core.coins && S.core.coins[S.sid]) || 0;
const myOwned = () => Object.entries((S.core && S.core.own) || {}).filter(([, v]) => v === S.sid).map(([k]) => k).sort((a, b) => seatNo(S.cfg, a) - seatNo(S.cfg, b));

/* ---------- 시작 ---------- */
(async function boot() {
  connBanner();
  startTicker(st, () => render());
  if (!S.code) { render(); return; }
  await enterRoom();
})();

async function enterRoom() {
  S.err = '';
  try { const u = await DB.ready(true); S.uid = u.uid; }
  catch (e) { S.err = '접속하지 못했어요. 인터넷 연결을 확인해 주세요.'; render(); return; }
  listen('cfg', R() + '/cfg', v => {
    S.cfg = v;
    if (v) ls.set('auction.room', S.code);
    else if (S.cfg === null) { S.err = '참여 코드 ' + S.code + ' 를 찾을 수 없어요.'; }
    render();
  });
  listen('core', R() + '/core', v => { S.core = v; watchBid(); render(); });
  listen('claims', R() + '/claims', v => { S.claims = v || {}; checkClaim(); render(); });
  listen('me', R() + '/me/' + S.uid, v => {
    const prev = S.sid;
    S.sid = v || null;
    if (prev && prev !== S.sid) { DB.cancelPresence && DB.cancelPresence(R() + '/pres/' + prev + '/' + S.uid); S.kicked = !S.sid; }
    if (S.sid) { S.kicked = false; DB.presence(R() + '/pres/' + S.sid + '/' + S.uid); }
    watchBid(); render();
  });
  listen('req', R() + '/req/' + S.uid, v => { S.req = v; render(); });
  render();
}
function checkClaim() {
  if (!S.sid) return;
  const c = S.claims[S.sid];
  if (c && c.uid !== S.uid) { /* 선생님이 다른 기기로 옮김 */ S.kicked = true; }
}
/* 이번 라운드 내 입찰 (서버 값) */
function watchBid() {
  const s = st();
  if (!S.sid || !s.rid || s.ph !== 'bid') { unlisten('bid'); if (s.rid !== S.bidRid) { S.bid = undefined; } return; }
  if (S.bidRid !== s.rid) { S.bidRid = s.rid; S.bid = undefined; S.pending = null; S.acked = null; S.lastErr = ''; }
  listen('bid', R() + '/bids/' + s.rid + '/' + S.sid, v => { S.bid = v; render(); });
}

/* ---------- 동작 ---------- */
async function join() {
  const v = ($('#code') && $('#code').value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (v.length < 4) { toast('참여 코드를 확인해 주세요'); return; }
  S.code = v; history.replaceState(null, '', '?r=' + v);
  await enterRoom();
}
function leaveRoom() {
  ls.del('auction.room');
  location.href = location.pathname;
}
function askClaim(sid) {
  const r = S.cfg.roster[sid];
  const taken = S.claims[sid] && S.claims[sid].uid !== S.uid;
  if (taken) {
    modal(`<h3>${esc(r.no)}번 ${esc(r.name || '')}</h3>
      <p>이 번호는 <b>다른 기기에 연결되어</b> 있어요.</p>
      <p class="muted small">내 번호가 맞다면 이 기기로 바꿔 달라고 선생님께 요청할 수 있어요. 선생님이 승인하면 들어가요.</p>
      <div class="row"><button class="btn ghost" data-act="close">취소</button><button class="btn" data-act="request" data-id="${sid}">바꿔 달라고 요청</button></div>`);
    return;
  }
  modal(`<h3 class="center" style="font-size:1.6rem">${esc(r.no)}번 ${esc(r.name || '')}</h3>
    <p class="center">내 이름이 맞나요?</p>
    <div class="row" style="justify-content:center"><button class="btn ghost big" data-act="close">아니요</button><button class="btn gold big" data-act="claim" data-id="${sid}">맞아요!</button></div>`);
}
async function claim(sid) {
  closeModal();
  if (S.busy) return; S.busy = true; render();
  try {
    await DB.update(R(), { ['claims/' + sid]: { uid: S.uid }, ['me/' + S.uid]: sid });
  } catch (e) {
    console.warn(e);
    toast(S.cfg && S.cfg.open !== true ? '선생님이 아직 입장을 열지 않았어요' : '다른 기기가 먼저 연결했어요. 다시 골라 주세요');
  }
  S.busy = false; render();
}
async function request(sid) {
  closeModal();
  try { await DB.set(R() + '/req/' + S.uid, { s: sid, t: DB.TS }); toast('선생님께 요청을 보냈어요'); }
  catch (e) { fail()(e); }
}
async function cancelReq() { try { await DB.remove(R() + '/req/' + S.uid); } catch (e) { fail()(e); } }
async function release() {
  if (!confirm('번호 선택을 취소할까요?')) return;
  try { await DB.update(R(), { ['claims/' + S.sid]: null, ['me/' + S.uid]: null }); }
  catch (e) { toast('경매가 시작된 뒤에는 선생님께 말씀드려 주세요'); }
}

/* 입찰 — 누를 때마다 서버에 다시 보냄. 마지막으로 접수된 것만 유효 */
function bid(a) {
  const s = st();
  if (s.ph !== 'bid' || remaining(s) === 0) return;
  if (a > coins()) return;
  const seq = ++S.seq;
  const rid = s.rid;
  S.pending = a; S.lastErr = '';
  render();
  DB.set(R() + '/bids/' + rid + '/' + S.sid, { a, t: DB.TS }).then(() => {
    if (S.bidRid !== rid) return;
    if (seq === S.seq) { S.pending = null; }
    if (!S.acked || seq >= S.acked.seq) S.acked = { a, seq };
    render();
  }).catch(e => {
    console.warn(e);
    if (S.bidRid !== rid) return;
    if (seq === S.seq) { S.pending = null; S.lastErr = remaining(st()) === 0 ? '마감 뒤에 도착해서 접수되지 않았어요' : '접수되지 않았어요. 다시 눌러 주세요'; }
    render();
  });
}

/* ---------- 화면 ---------- */
function render() {
  document.body.className = 'stu ph-' + (st().ph || 'none');
  const top = `<div class="top"><span class="title">🪙 자리 경매</span><span class="grow"></span>${S.cfg ? `<span class="pill">${esc(S.cfg.name || '')}</span>` : ''}${S.sid && S.cfg ? `<span class="pill">${esc(sname(S.cfg, S.sid, 'both'))}</span>` : ''}</div>`;
  paint($('#top'), top);
  paint($('#main'), body());
}
function body() {
  if (!S.code) return codeScreen();
  if (S.err) return `<div class="card center"><p style="font-size:1.2rem">😢 ${esc(S.err)}</p><button class="btn" data-act="leave">다른 코드 넣기</button></div>`;
  if (S.cfg === undefined || S.core === undefined) return `<div class="card center muted">불러오는 중…</div>`;
  if (S.sid === undefined) return `<div class="card center muted">불러오는 중…</div>`;
  if (S.kicked) return `<div class="card center"><h2>🔄 다른 기기에서 접속했어요</h2><p class="muted">이 기기는 연결이 끊겼어요. 잘못된 것 같으면 선생님께 말씀드려 주세요.</p><button class="btn" data-act="reload">처음으로</button></div>`;
  if (!S.sid) return pickScreen();
  const s = st();
  switch (s.ph) {
    case 'ready': return readyScreen();
    case 'bid': return bidScreen();
    case 'result': return resultScreen();
    case 'assign': return assignScreen();
    case 'final': return finalScreen();
    default: return waitScreen();
  }
}
function codeScreen() {
  return `<div class="hero"><div class="hero-coin">🪙</div><h1>자리 경매</h1><p class="muted">선생님이 알려 준 참여 코드를 넣어요</p></div>
    <div class="card"><input id="code" class="in code-in" maxlength="8" autocomplete="off" autocapitalize="characters" placeholder="참여 코드" inputmode="text">
    <button class="btn gold big wide" style="margin-top:12px" data-act="join">들어가기</button></div>`;
}
function pickScreen() {
  if (S.req) {
    const r = S.cfg.roster[S.req.s] || {};
    return `<div class="card center"><h2>⏳ 선생님 승인을 기다려요</h2><p>${esc(r.no)}번 ${esc(r.name || '')} 을(를) 이 기기로 바꿔 달라고 요청했어요.</p>
      <button class="btn ghost" data-act="cancelReq">요청 취소</button></div>`;
  }
  if (S.cfg.open !== true) return `<div class="card center"><h2>🚪 아직 입장 전이에요</h2><p class="muted">선생님이 입장을 열면 내 번호를 고를 수 있어요.</p></div>`;
  const list = rosterList(S.cfg);
  return `<div class="card"><h3>내 번호를 눌러요</h3>
    <div class="pick">${list.map(r => {
      const c = S.claims[r.id];
      const taken = c && c.uid !== S.uid;
      return `<button class="pk ${taken ? 'taken' : ''}" data-act="ask" data-id="${r.id}" ${S.busy ? 'disabled' : ''}><b>${esc(r.no)}</b><span>${esc(r.name || '')}</span>${taken ? '<i>연결됨</i>' : ''}</button>`;
    }).join('')}</div></div>
    <p class="center"><button class="link" data-act="leave">다른 참여 코드 넣기</button></p>`;
}
function walletCard() {
  const own = myOwned();
  return `<div class="card wallet"><div class="row"><div class="grow"><div class="muted small">내 코인</div><div class="coins-big"><span class="coin">¢</span>${coins()}</div></div>
    <div><div class="muted small">내가 낙찰받은 자리</div><div class="row" style="gap:6px;margin-top:4px">${own.length ? own.map(x => `<span class="pill purple">${seatNo(S.cfg, x)}번</span>`).join('') : '<span class="muted">아직 없어요</span>'}</div></div></div></div>`;
}
function waitScreen() {
  const n = (S.core.hist ? Object.values(S.core.hist).filter(h => h.status === 'ok').length : 0);
  return `<div class="card center"><div style="font-size:3rem">⏳</div><h2>경매를 기다려요</h2><p class="muted">${n ? '선생님이 다음 경매 자리를 고르고 있어요.' : '선생님이 곧 경매를 시작해요.'}</p></div>
    ${walletCard()}
    ${noReleaseHint()}
    <div class="card">${seatMap({ cfg: S.cfg, core: S.core, mine: myOwned(), size: 's', cls: id => doneCls(id) })}</div>`;
}
function noReleaseHint() {
  if (S.core.hist) return '';
  return `<p class="center small"><button class="link" data-act="release">번호를 잘못 골랐어요</button></p>`;
}
const doneCls = id => { const d = S.core.done && S.core.done[id]; return d === 'won' ? 'won' : d === 'fail' ? 'fail' : ''; };
function readyScreen() {
  const s = st();
  return `<div class="card center target"><div class="muted">다음 경매 자리</div><div class="seat-big pop">${seatNo(S.cfg, s.seat)}번</div><p>곧 입찰이 시작돼요! 얼마를 낼지 생각해 봐요.</p></div>
    <div class="card">${seatMap({ cfg: S.cfg, hl: s.seat, mine: myOwned(), size: 's', cls: id => doneCls(id) })}</div>
    ${walletCard()}`;
}
function bidScreen() {
  const s = st();
  const ms = remaining(s);
  const over = ms === 0;
  const c = coins();
  const server = S.bid && typeof S.bid.a === 'number' ? S.bid.a : null;
  const chosen = S.pending != null ? S.pending : (S.acked ? S.acked.a : server);
  const accepted = S.pending == null && (S.acked ? S.acked.a : server);
  let status;
  if (S.pending != null) status = `<div class="bstat sending">📨 ${S.pending ? S.pending + '코인' : '참여 안 함'} 보내는 중…</div>`;
  else if (accepted != null) status = `<div class="bstat ok">✅ 입찰 완료: <b>${accepted ? accepted + '코인' : '참여 안 함'}</b>${over ? '' : ' <span class="small">(마감 전까지 바꿀 수 있어요)</span>'}</div>`;
  else status = `<div class="bstat none">아직 고르지 않았어요 · 안 고르면 <b>참여 안 함</b></div>`;
  if (S.lastErr) status += `<div class="bstat err">⚠️ ${esc(S.lastErr)}</div>`;
  const btns = c <= 0
    ? `<div class="card center"><p style="font-size:1.2rem">🪙 코인이 없어서 이번 경매는 구경만 해요</p></div>`
    : `<div class="bids">
        <button class="bb none ${chosen === 0 ? 'on' : ''}" data-act="bid" data-a="0" ${over ? 'disabled' : ''}>참여 안 함</button>
        ${[1, 2, 3, 4, 5].map(a => `<button class="bb ${chosen === a ? 'on' : ''}" data-act="bid" data-a="${a}" ${over || a > c ? 'disabled' : ''}><span class="coin">¢</span><b>${a}</b><small>${a > c ? '코인 부족' : '코인'}</small></button>`).join('')}
      </div>`;
  return `<div class="card bidtop">
      <div class="row" style="align-items:stretch"><div class="grow"><div class="muted">경매 자리</div><div class="seat-big">${seatNo(S.cfg, s.seat)}번</div><div class="muted small">${s.n || ''}번째 경매</div></div>
      <div class="center"><div class="muted">남은 시간</div><div class="count" data-count style="font-size:4.4rem">${ms == null ? '' : Math.ceil(ms / 1000)}</div></div></div>
      <div class="bar" style="margin-top:10px"><i data-bar></i></div>
      ${over ? '<div class="closed">⏰ 마감! 결과를 계산하고 있어요</div>' : ''}
    </div>
    <div class="row" style="justify-content:space-between;margin:4px 4px 0"><span class="coins-big" style="font-size:1.3rem"><span class="coin">¢</span>내 코인 ${c}</span></div>
    ${btns}
    ${c > 0 ? status : ''}
    <div class="card">${seatMap({ cfg: S.cfg, hl: s.seat, mine: myOwned(), size: 's', cls: id => doneCls(id) })}</div>`;
}
function resultScreen() {
  const s = st();
  const L = S.core.last;
  if (!L || L.rid !== s.rid) return waitScreen();
  const mine = L.ded && L.ded[S.sid] ? L.ded[S.sid] : 0;
  const iWon = L.win === S.sid;
  const head = L.win
    ? `<div class="res-title pop">${iWon ? '🎉 내가 낙찰받았어요!' : '🔨 낙찰!'}</div><div class="res-who">${esc(sname(S.cfg, L.win))} <span class="pill">${L.amt}코인</span></div>`
    : `<div class="res-title pop">😮 유찰!</div><div class="muted">혼자 낸 금액이 없어서 아무도 받지 못했어요</div>`;
  return `<div class="card center ${iWon ? 'win' : ''}"><div class="muted">${seatNo(S.cfg, L.seat)}번 자리</div>${head}</div>
    <div class="card"><table class="t">
      <tr><th>내 입찰</th><td class="num">${mine ? mine + '코인' : '참여 안 함'}</td></tr>
      <tr><th>차감된 코인</th><td class="num">${mine ? '−' + mine : '0'}</td></tr>
      <tr><th>남은 코인</th><td class="num"><b>${coins()}</b></td></tr>
      <tr><th>이 자리 낙찰</th><td class="num">${iWon ? '<span class="pill good">낙찰</span>' : mine ? '<span class="pill">못 받음</span>' : '-'}</td></tr>
    </table></div>
    ${histCard(L)}
    ${walletCard()}`;
}
function histCard(L) {
  const keys = Object.keys(L.hist || {}).map(k => +k.slice(1)).sort((a, b) => b - a);
  if (!keys.length) return `<div class="card center muted">아무도 입찰하지 않았어요</div>`;
  const max = Math.max(...Object.values(L.hist));
  return `<div class="card"><h3>금액별 입찰 인원</h3><div class="hist">${keys.map(a => {
    const n = L.hist['a' + a];
    const cls = a === L.amt && L.win ? 'w' : n > 1 ? 'x' : '';
    return `<div class="h ${cls}"><div class="b" style="height:${24 + 60 * n / max}px">${n}명</div><div class="lab">${a}코인</div><div class="small muted">${cls === 'w' ? '낙찰' : n > 1 ? '같은 금액 제외' : ''}</div></div>`;
  }).join('')}</div></div>`;
}
function assignScreen() {
  const mySeat = AL.seatOf(S.core.sit, S.sid);
  return `<div class="card center"><h2>🪑 자리를 배정하고 있어요</h2><p class="muted">선생님이 자리를 정하는 중이에요. ${mySeat ? `<br>내 자리: <b>${seatNo(S.cfg, mySeat)}번</b>` : ''}</p></div>
    ${walletCard()}
    <div class="card">${finalMap(mySeat)}</div>`;
}
function finalScreen() {
  const mySeat = AL.seatOf(S.core.sit, S.sid);
  return `<div class="card center"><div class="muted">내 자리</div><div class="seat-big pop">${mySeat ? seatNo(S.cfg, mySeat) + '번' : '?'}</div><h2>자리 배정 완료!</h2></div>
    <div class="card">${finalMap(mySeat)}</div>`;
}
function finalMap(mySeat) {
  const sit = S.core.sit || {};
  return seatMap({ cfg: S.cfg, mine: myOwned(), hl: null, size: 's',
    cls: id => (id === mySeat ? 'sel ' : '') + (sit[id] ? 'sat' : ''),
    label: (id, s) => `<b class="no">${s.no}</b>${sit[id] ? `<span class="nm">${esc(sname(S.cfg, sit[id]))}</span>` : ''}` });
}

/* ---------- 모달·이벤트 ---------- */
function modal(html) { $('#modal').innerHTML = `<div class="modal-bg" data-act="bg"><div class="modal">${html}</div></div>`; }
function closeModal() { $('#modal').innerHTML = ''; }
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b || b.disabled) return;
  const id = b.dataset.id;
  const acts = {
    join, leave: leaveRoom, reload: () => location.reload(),
    ask: () => askClaim(id), claim: () => claim(id), request: () => request(id), cancelReq, release,
    close: closeModal, bg: () => { if (e.target === b) closeModal(); },
    bid: () => bid(+b.dataset.a)
  };
  if (acts[b.dataset.act]) acts[b.dataset.act]();
});
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'code') join(); });
