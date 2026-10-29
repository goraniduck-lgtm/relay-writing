/* 교실 마피아 — 학생 태블릿 화면 */
const S = {
  code: (qp.get('r') || ls.get('mafia.room', '') || '').toUpperCase(),
  uid: null, pub: undefined, pid: null, meLoaded: false,
  role: null, team: null, sec: null, pred: null, rejoin: null,
  myDv: undefined, myNv: undefined,
  pickVote: null, pickNight: null, predPick: {}, predRound: null,
  showList: false, busy: false, err: ''
};
const L_ = {};               // 켜 둔 리스너 {key: off}
function listen(key, path, cb) {
  if (L_[key] && L_[key].path === path) return;
  if (L_[key]) L_[key].off();
  L_[key] = { path, off: DB.on(path, cb, e => { console.warn(path, e); }) };
}
function unlisten(key) { if (L_[key]) { L_[key].off(); delete L_[key]; } }
const R = () => ROOM_PATH(S.code);
const st = () => (S.pub && S.pub.state) || {};
const me = () => (S.pub && S.pub.players && S.pid && S.pub.players[S.pid]) || null;
const amAlive = () => !!(me() && me().alive);

/* ---------- 전체 화면 고정 ----------
   입장한 뒤에는 전체 화면에서만 게임 화면이 보임. 나가면(스와이프·뒤로 가기 등) 덮개가 떠서 한 번 누르면 돌아옴.
   전체 화면을 지원하지 않는 기기(또는 거부)는 덮개 없이 진행. 교사가 끄면(pub/opt/fs=false) 덮개 없음. */
const FS = {
  can: !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen),
  failed: false
};
const inFs = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
const fsWanted = () => !window.__NO_FS__ && !qp.has('nofs') && FS.can && !FS.failed && !!S.pid && fsOnFor(S.pub) && st().phase !== 'end';
function enterFs() {
  if (!FS.can || inFs()) return;
  const el = document.documentElement;
  try {
    const p = el.requestFullscreen ? el.requestFullscreen({ navigationUI: 'hide' }) : el.webkitRequestFullscreen();
    if (p && p.catch) p.catch(() => { FS.failed = true; renderGate(); });
  } catch (e) { FS.failed = true; }
}
function renderGate() {
  const show = fsWanted() && !inFs();
  document.documentElement.classList.toggle('fs-lock', !!S.pid);
  let g = document.getElementById('fsGate');
  if (show && !g) {
    g = document.createElement('button'); g.id = 'fsGate'; g.className = 'fs-gate';
    g.innerHTML = '<div class="ic">🕶️</div><h2>교실 마피아</h2><p>게임은 전체 화면으로만 할 수 있어요.</p><div class="tap">👆 화면을 눌러 돌아가기</div>';
    g.addEventListener('click', enterFs);
    document.body.appendChild(g);
  } else if (!show && g) g.remove();
}
['fullscreenchange', 'webkitfullscreenchange'].forEach(ev => document.addEventListener(ev, renderGate));
/* 뒤로 가기(스와이프 포함) 막기 */
history.pushState({ mafia: 1 }, '');
window.addEventListener('popstate', () => {
  history.pushState({ mafia: 1 }, '');
  if (S.pid && st().phase !== 'end') toast('게임 중에는 나갈 수 없어요.');
});
window.addEventListener('beforeunload', e => { if (S.pid && st().phase && st().phase !== 'lobby' && st().phase !== 'end') { e.preventDefault(); e.returnValue = ''; } });

/* ---------- 시작 ---------- */
(async function boot() {
  startTicker(() => st());
  if (!S.code) { render(); return; }
  await enterRoom();
})();

async function enterRoom() {
  ls.set('mafia.room', S.code);
  try { const u = await DB.ready(true); S.uid = u.uid; }
  catch (e) { S.err = '접속하지 못했어요. 인터넷 연결을 확인해 주세요.'; render(); return; }
  listen('pub', R() + '/pub', v => { S.pub = v; syncListeners(); render(); });
  listen('me', R() + '/me/' + S.uid, v => {
    S.meLoaded = true;
    const changed = v !== S.pid;
    S.pid = v || null;
    if (changed) { for (const k of ['role', 'sec', 'pred', 'team', 'dv', 'nv']) unlisten(k); S.role = null; S.sec = null; S.pred = null; S.team = null; }
    if (S.pid) { if (S.presenceFor !== S.pid) { S.presenceFor = S.pid; DB.presence(R() + '/presence/' + S.pid); } if (S.rejoin) DB.remove(R() + '/rejoin/' + S.uid).catch(() => {}); }
    syncListeners(); render();
  });
  listen('rejoin', R() + '/rejoin/' + S.uid, v => { S.rejoin = v; render(); });
}

function syncListeners() {
  if (!S.pid) return;
  listen('role', R() + '/roles/' + S.pid, v => { S.role = v; syncListeners(); render(); });
  listen('sec', R() + '/sec/' + S.pid, v => { S.sec = v; renderCard(); render(); });
  listen('pred', R() + '/pred/' + S.pid, v => { S.pred = v; render(); });
  if (S.role === 'mafia') listen('team', R() + '/team', v => { S.team = v; renderCard(); });
  else { unlisten('team'); S.team = null; }
  const s = st();
  if (s.round && s.stage && (s.phase === 'vote' || s.phase === 'dayResult')) {
    listen('dv', `${R()}/dv/${s.round}/${s.stage}/${S.pid}`, v => { S.myDv = v; render(); });
  } else { unlisten('dv'); S.myDv = undefined; }
  if (s.round && s.phase === 'night' && (S.role === 'mafia' || S.role === 'doctor')) {
    listen('nv', `${R()}/nv/${s.round}/${S.role === 'mafia' ? 'm' : 'd'}/${S.pid}`, v => { S.myNv = v; render(); });
  } else { unlisten('nv'); S.myNv = undefined; }
}

/* ---------- 행동 ---------- */
async function joinRoom(name) {
  name = String(name || '').trim();
  if (name && !window.__NO_FS__ && !qp.has('nofs')) enterFs();
  if (!name) { toast('이름이나 번호를 적어 주세요.'); return; }
  if (name.length > 20) { toast('20글자 안으로 적어 주세요.'); return; }
  const k = nameKey(name);
  S.busy = true; render();
  try {
    const owner = await DB.get(R() + '/names/' + k);
    if (owner) {
      await DB.set(R() + '/rejoin/' + S.uid, { name, at: DB.now() });
      toast('이미 있는 이름이에요. 선생님(사회자)이 확인하면 다시 들어가요.');
    } else if (st().phase !== 'lobby') {
      toast('게임이 이미 시작됐어요. 선생님께 말해 주세요.');
    } else {
      const pid = DB.key();
      await DB.update(R(), {
        ['names/' + k]: pid,
        ['pub/players/' + pid]: { name, key: k, uid: S.uid, alive: true, at: DB.now() },
        ['me/' + S.uid]: pid
      });
    }
  } catch (e) { fail('들어가지 못했어요. 다른 이름으로 해 보거나 선생님께 말해 주세요.')(e); }
  S.busy = false; render();
}
function cancelRejoin() { DB.remove(R() + '/rejoin/' + S.uid).catch(() => {}); }
function confirmRole() { DB.set(`${R()}/pub/players/${S.pid}/ready`, true).catch(fail()); }

function submitVote() {
  const t = S.pickVote; if (!t) return;
  modal(`<h3>${esc(pname(S.pub, t))}에게 투표할까요?</h3><p class="muted">한 번 내면 바꿀 수 없어요.</p>
    <div class="row" style="margin-top:14px"><button class="btn ghost grow" data-act="closeModal">다시 고르기</button><button class="btn grow" data-act="voteYes">투표하기</button></div>`);
}
async function voteYes() {
  closeModal();
  const s = st();
  try { await DB.set(`${R()}/dv/${s.round}/${s.stage}/${S.pid}`, S.pickVote); S.pickVote = null; toast('투표했어요!'); }
  catch (e) { fail(s.paused ? '잠시 멈춤 중이에요.' : '투표하지 못했어요. 투표가 끝났는지 확인해 주세요.')(e); }
}
async function nightOk() {
  const s = st(); const t = S.pickNight;
  const kind = nightKind();
  if (kind === 'attack' || kind === 'protect') {
    if (!t) { toast('한 명을 골라 주세요.'); return; }
    try { await DB.set(`${R()}/nv/${s.round}/${kind === 'attack' ? 'm' : 'd'}/${S.pid}`, t); toast('확인했어요.'); }
    catch (e) { fail('제출하지 못했어요. 밤이 끝났는지 확인해 주세요.')(e); return; }
  }
  ls.set(`mafia.night.${S.code}.${s.round}`, t || true);
  render();
}
async function savePred() {
  const s = st();
  const t = {}; for (const [k, v] of Object.entries(S.predPick)) if (v) t[k] = true;
  const why = ($('#why') && $('#why').value || '').slice(0, 200);
  const r = s.round || 0;
  const prevLog = (S.pred && S.pred.log) || {};
  const logKey = 'l' + Date.now().toString(36);
  const next = Object.assign({}, S.pred || {});
  next['r' + r] = { t, why, at: DB.now() };
  next.log = Object.assign({}, prevLog, { [logKey]: { r, t, why, at: DB.now() } });
  try { await DB.set(`${R()}/pred/${S.pid}`, next); toast('예측을 저장했어요.'); }
  catch (e) { fail()(e); }
}

/* ---------- 모달 ---------- */
function modal(html) { $('#modal').innerHTML = `<div class="modal-bg" data-act="closeModal"><div class="modal">${html}</div></div>`; }
function closeModal() { $('#modal').innerHTML = ''; }

/* ---------- 그리기 ---------- */
function setMood() {
  const s = st();
  let mood = (PH[s.phase] || PH.lobby).mood;
  if (S.pid && me() && !me().alive && s.phase !== 'end') mood = s.phase === 'night' ? 'night' : 'think';
  document.body.className = 'm-' + mood;
}

function topHtml() {
  const s = st(); const ph = PH[s.phase] || PH.lobby;
  const alive = aliveList(S.pub).length, total = Object.keys((S.pub && S.pub.players) || {}).length;
  return `<div class="topbar"><div class="in-top">
    <span class="ph">${ph.icon} ${s.round ? s.round + '일째 · ' : ''}${esc(ph.name)}</span>
    ${s.paused ? '<span class="pill bad">잠시 멈춤</span>' : ''}
    <span class="grow"></span>
    ${ph.timer && s.timer ? `<span class="timer" data-timer>${fmt(remaining(s))}</span>` : ''}
    ${s.phase && s.phase !== 'lobby' ? `<button class="btn soft sm" data-act="toggleList">👥 ${alive}/${total}</button>` : ''}
  </div></div>`;
}

function listHtml() {
  const a = aliveList(S.pub), d = deadList(S.pub);
  return `<div class="card"><h3>살아 있는 친구 ${a.length}명</h3><div class="names" style="margin-top:8px">${a.map(p => `<span class="n">${esc(p.name)}</span>`).join('')}</div>
    ${d.length ? `<h3 style="margin-top:14px">탈락 ${d.length}명</h3><div class="names" style="margin-top:8px">${d.map(p => `<span class="n dead">${esc(p.name)}</span>`).join('')}</div>` : ''}</div>`;
}

function render() {
  setMood();
  const main = $('#main');
  if (S.err) { paint(main, `<div class="card hero"><div class="ic">📡</div><h2>${esc(S.err)}</h2><button class="btn" onclick="location.reload()">다시 시도</button></div>`); return; }
  if (!S.code) { paint($('#top'), ''); paint(main, codeHtml()); renderHold(); return; }
  if (S.pub === undefined || !S.meLoaded) { paint(main, `<div class="hero"><div class="ic">⏳</div><p>방에 들어가는 중…</p></div>`); return; }
  if (S.pub === null) { paint($('#top'), ''); paint(main, `<div class="card hero"><div class="ic">❓</div><h2>방을 찾을 수 없어요</h2><p>참가 코드 <b>${esc(S.code)}</b>를 다시 확인해 주세요.</p><button class="btn" data-act="changeCode">코드 다시 넣기</button></div>`); return; }
  if (!S.pid) { paint($('#top'), ''); paint(main, joinHtml()); renderHold(); return; }
  paint($('#top'), topHtml());
  const s = st();
  const stepKey = [s.phase, s.round, s.stage].join('/');
  if (S.stepKey !== stepKey) { S.stepKey = stepKey; S.pickVote = null; S.pickNight = null; closeModal(); }
  let html = '';
  if (s.msg && s.msg.text) html += `<div class="guide" style="margin-top:12px">📣 ${esc(s.msg.text)}</div>`;
  if (S.showList && s.phase !== 'lobby') html += listHtml();
  if (!amAlive() && s.phase !== 'end' && s.phase !== 'lobby') html += spectatorHtml();
  else html += (VIEWS[s.phase] || VIEWS.lobby)();
  paint(main, html);
  renderHold(); renderCard(); renderGate();
}

function codeHtml() {
  return `<div class="card hero"><div class="ic">🕶️</div><h2>교실 마피아</h2><p>선생님이 알려 준 <b>참가 코드</b>를 넣어요.</p>
    <input class="in center" id="codeIn" maxlength="8" autocomplete="off" placeholder="예: AB3CD" style="text-transform:uppercase;letter-spacing:4px;font-size:1.6rem;margin:10px 0">
    <button class="btn big" data-act="goCode">들어가기</button></div>`;
}
function joinHtml() {
  if (S.rejoin) {
    return `<div class="card hero"><div class="ic">🔁</div><h2>다시 들어가기 요청 중</h2>
      <p><b>${esc(S.rejoin.name)}</b>(으)로 다시 들어가려고 해요.</p><p class="muted">선생님(사회자) 화면에서 확인하면 자동으로 들어가요.</p>
      <button class="btn ghost" data-act="cancelRejoin">취소</button></div>`;
  }
  const lobby = st().phase === 'lobby';
  return `<div class="card hero"><div class="ic">🎟️</div><h2>교실 마피아 입장</h2>
    <p>방 코드 <b>${esc(S.code)}</b></p>
    <p>${lobby ? '이름이나 번호(별명도 좋아요)를 적어요.' : '게임이 진행 중이에요. 원래 쓰던 이름을 적으면 다시 들어갈 수 있어요.'}</p>
    <input class="in center" id="nameIn" maxlength="20" autocomplete="off" placeholder="예: 7번 또는 이름" style="margin:10px 0">
    <button class="btn big" data-act="join" ${S.busy ? 'disabled' : ''}>${lobby ? '입장하기' : '다시 들어가기'}</button>
    <p class="small muted" style="margin-top:14px"><a href="#" data-act="changeCode">다른 방 코드 넣기</a></p></div>`;
}

/* 아래 고정 버튼 — 모든 역할에 똑같이 보임 */
function renderHold() {
  const show = S.pid && st().phase && st().phase !== 'lobby' && st().phase !== 'end' && S.role;
  paint($('#hold'), show ? `<div class="holdbar"><button class="holdbtn" data-act="openCard">🃏 내 카드 보기</button></div>` : '');
}
/* 내 카드: 한 번 누르면 열리고, 다시 누르거나 10초 지나면 닫힘 (꾹 누르기는 태블릿에서 끊기는 일이 많아 바꿈) */
const CARD_MS = 10000;
function openCard() {
  if (!S.role) return toast('역할을 받는 중이에요. 잠시만 기다려 주세요.');
  S.cardOpen = true; S.cardSeen = true;
  clearTimeout(S.cardTimer); S.cardTimer = setTimeout(closeCard, CARD_MS);
  renderCard(); render();
}
function closeCard() { clearTimeout(S.cardTimer); if (!S.cardOpen) return; S.cardOpen = false; renderCard(); }
function renderCard() {
  if (!S.role) { paint($('#card'), ''); return; }
  const s = st(); const R0 = Logic.ROLES[S.role];
  let extra = '';
  if (S.role === 'mafia') {
    const dayPhases = ['mission', 'think', 'meeting', 'vote', 'dayResult', 'night'];
    if (amAlive() && s.round && dayPhases.includes(s.phase)) {
      const sec = S.sec ? S.sec[s.round] : null;
      if (sec && sec.m) {
        const ok = sec.ok && Object.keys(sec.ok).length;
        extra += `<div class="box mission">🤫 오늘의 비밀 미션<div class="big">${esc(sec.m)}</div>
          <div>${ok ? '✅ 사회자가 확인했어요 → 오늘 밤 공격권 있음' : '⬜ 아직 확인 안 됨 (사회자가 보면 공격권!)'}</div></div>`;
      } else extra += `<div class="box mission">🤫 오늘의 비밀 미션을 받는 중이에요…</div>`;
    }
    const mates = Object.entries(S.team || {}).filter(([id]) => id !== S.pid)
      .map(([id, n]) => `${esc(n)}${S.pub && S.pub.players && S.pub.players[id] && !S.pub.players[id].alive ? ' (탈락)' : ''}`);
    extra += `<div class="box">🕶️ 우리 팀: ${mates.length ? mates.join(', ') : '나 혼자'}</div>`;
  } else if (S.role === 'doctor') extra = `<div class="box">밤마다 한 명을 지킬 수 있어요. 나 자신도 괜찮아요.</div>`;
  else extra = `<div class="box">친구들의 행동을 잘 보고 마피아를 찾아요.</div>`;
  if (me() && !me().alive) extra += `<div class="box">지금은 탈락해서 관전 중이에요.</div>`;
  paint($('#card'), `<div class="secret ${S.cardOpen ? 'show' : ''}" id="secretCard" data-act="closeCard"><div class="sc"><div class="sm">내 역할</div>
    <div class="role">${R0.emoji} ${R0.name}</div>${extra}
    <button class="btn big" data-act="closeCard" style="margin-top:16px">다 봤어요 (가리기)</button>
    <div class="sm" style="margin-top:8px">10초가 지나면 저절로 가려져요</div></div></div>`);
}

const guideLine = t => `<p class="muted center" style="margin-top:8px">${t}</p>`;

const VIEWS = {
  lobby() {
    const n = Object.keys((S.pub && S.pub.players) || {}).length;
    return `<div class="card hero"><div class="ic">✅</div><h2>${esc(me() ? me().name : '')}, 입장 완료!</h2>
      <p>지금 ${n}명이 들어왔어요.</p><p class="muted">선생님이 게임을 시작할 때까지 기다려요.</p></div>`;
  },
  reveal() {
    if (!S.role) return `<div class="hero"><div class="ic">🃏</div><p>역할을 나누는 중…</p></div>`;
    if (me() && me().ready) return `<div class="card hero"><div class="ic">👍</div><h2>역할 확인 완료</h2><p>다른 친구들을 기다려요.</p>
      <p class="muted">다시 보고 싶으면 아래 <b>🃏 내 카드 보기</b>를 누르세요.</p></div>`;
    return `<div class="card hero"><h2>내 역할 확인하기</h2><p>옆 친구가 보지 않게 화면을 가리고,<br>아래 상자를 <b>한 번 누르면</b> 역할이 보여요.</p>
      <button class="reveal-zone" data-act="openCard">👆 여기를 눌러 내 역할 보기</button>
      <button class="btn big" data-act="confirmRole" ${S.cardSeen ? '' : 'disabled'}>${S.cardSeen ? '확인했어요' : '먼저 역할을 봐 주세요'}</button></div>`;
  },
  mission() {
    const s = st();
    return `<div class="card hero"><div class="ic">🤸</div><h2>공통 미션</h2><div class="mission-box">${esc(s.mission || '')}</div>
      ${guideLine('모두 함께 미션을 해요. 친구들의 행동을 잘 살펴보세요! 👀')}
      <button class="btn soft big" data-act="openCard" style="margin-top:12px">🃏 내 카드 보기</button>
      <p class="small muted" style="margin-top:6px">미션 전에 모두 한 번씩 눌러 내 카드를 확인해요.</p></div>`;
  },
  think() {
    return `<div class="card hero"><div class="ic">🤔</div><h2>개인 추리 시간</h2><p>미션하는 동안 본 행동을 떠올려요.</p><p>누가 이상한 행동을 했나요?</p>
      ${guideLine('아직 말하지 말고 혼자 생각해요.')}</div>`;
  },
  meeting() {
    return `<div class="card hero"><div class="ic">🗣️</div><h2>시민 회의</h2>
      <div style="text-align:left;max-width:460px;margin:10px auto;font-size:1.1rem;line-height:1.8">
      ✋ 손 들고 사회자가 부르면 말해요<br>👂 친구 말을 끊지 않아요<br>👀 <b>본 행동</b>을 근거로 말해요<br>💛 평소 사이나 기분으로 몰아가지 않아요</div></div>`;
  },
  vote() {
    const s = st();
    if (!s.open) return `<div class="card hero"><div class="ic">🗳️</div><h2>투표를 세는 중…</h2></div>`;
    if (S.myDv) return `<div class="card hero"><div class="ic">✅</div><h2>투표했어요!</h2><p class="muted">결과 발표를 기다려요.</p></div>`;
    const cands = aliveList(S.pub).filter(p => p.id !== S.pid && (s.stage == 1 || (s.cands && s.cands[p.id])));
    return `<div class="card"><h2 class="center">${s.stage == 2 ? '🔁 재투표' : '🗳️ 낮 투표'}</h2>
      <p class="center">가장 마피아 같은 친구 <b>한 명</b>을 골라요.${s.stage == 2 ? '<br>(동점인 친구 중에서만 골라요)' : ''}</p>
      <div class="pick">${cands.map(p => `<button data-act="pickVote" data-id="${p.id}" class="${S.pickVote === p.id ? 'sel' : ''}" ${s.paused ? 'disabled' : ''}>${esc(p.name)}</button>`).join('')}</div>
      <button class="btn big" data-act="submitVote" ${!S.pickVote || s.paused ? 'disabled' : ''}>${S.pickVote ? esc(pname(S.pub, S.pickVote)) + '에게 투표하기' : '친구를 골라 주세요'}</button></div>`;
  },
  dayResult() { return `<div class="card">${dayResultHtml(st().round, st().stage)}</div>`; },
  night() {
    const s = st();
    if (!s.open) return `<div class="card hero"><div class="ic">🌙</div><h2>밤이 끝나가요…</h2><p class="muted">아침을 기다려요.</p></div>`;
    const kind = nightKind();
    const done = ls.get(`mafia.night.${S.code}.${s.round}`, null);
    const submitted = (kind === 'attack' || kind === 'protect') ? !!S.myNv : !!done;
    const line = { attack: '공격할 사람을 고르세요. 밤이 끝나기 전까지 바꿀 수 있어요.', protect: '지켜 줄 친구를 고르세요. 나 자신도 괜찮아요.',
      wait: '오늘은 공격권이 없어요. 아무나 고르고 확인을 누르세요.', citizen: '의심 가는 친구를 마음속으로 골라 보세요.' }[kind];
    let list = aliveList(S.pub);
    if (kind === 'attack') list = list.filter(p => p.id !== S.pid && !(S.team && S.team[p.id]));
    else if (kind !== 'protect') list = list.filter(p => p.id !== S.pid);
    const cur = S.pickNight || (kind === 'attack' || kind === 'protect' ? S.myNv : (typeof done === 'string' ? done : null));
    return `<div class="card"><div class="hero" style="padding:10px"><div class="ic">🌙</div><h2>밤이 되었어요</h2>
      <p>화면을 가리고, 한 명을 고른 뒤 <b>확인</b>을 누르세요.</p><p class="small muted">${line}</p></div>
      <div class="pick">${list.map(p => `<button data-act="pickNight" data-id="${p.id}" class="${cur === p.id ? 'sel' : ''}" ${s.paused ? 'disabled' : ''}>${esc(p.name)}</button>`).join('')}</div>
      <button class="btn big" data-act="nightOk" ${s.paused ? 'disabled' : ''}>${submitted ? '✔ 확인했어요 (다시 누르면 바꿔요)' : '확인'}</button></div>`;
  },
  morning() {
    const s = st(); const r = (S.pub.rounds || {})[s.round] || {};
    const out = r.night && r.night.out;
    return `<div class="card hero"><div class="ic">🌅</div><h2>아침이 밝았어요</h2>
      ${out ? deathBox(deathSentence(S.pub, out, 'night'), out === S.pid ? '나는 이제 관전 모드로 바뀌어요. 말이나 몸짓으로 힌트를 주면 안 돼요.' : '탈락한 친구의 역할은 게임이 끝날 때 공개돼요.')
        : deathBox('지난밤 <b>아무도 탈락하지 않았어요.</b>', '', true)}
      <p class="muted">살아 있는 친구 ${aliveList(S.pub).length}명</p></div>`;
  },
  limit() { return `<div class="card hero"><div class="ic">⏳</div><h2>약속한 라운드가 끝났어요</h2><p>선생님이 게임을 끝낼지, 더 할지 정하고 있어요.</p></div>`; },
  end() { return endHtml(); }
};

function nightKind() {
  if (!amAlive()) return 'citizen';
  const s = st();
  if (S.role === 'doctor') return 'protect';
  if (S.role === 'mafia') { const sec = S.sec && S.sec[s.round]; return sec && sec.ok && Object.keys(sec.ok).length ? 'attack' : 'wait'; }
  return 'citizen';
}

function dayResultHtml(round, stage) {
  const r = (S.pub.rounds || {})[round] || {};
  const d = r.day || {};
  const res = d['s' + stage] || d.s1;
  if (!res) return `<div class="hero"><p>결과를 기다려요…</p></div>`;
  const tallyRows = Object.entries(res.tally || {}).sort((a, b) => b[1] - a[1]);
  const max = tallyRows.length ? tallyRows[0][1] : 1;
  let head;
  if (res.reason === 'top') head = deathBox(deathSentence(S.pub, res.out, 'day'), res.out === S.pid ? '나는 이제 관전 모드로 바뀌어요. 말이나 몸짓으로 힌트를 주면 안 돼요.' : '탈락한 친구의 역할은 게임이 끝날 때 공개돼요.');
  else if (res.reason === 'tie') head = deathBox('동점이에요! 동점인 친구들만 두고 <b>재투표</b>를 해요.', '', true);
  else if (res.reason === 'tie2') head = deathBox('재투표도 동점이라 오늘은 <b>아무도 탈락하지 않았어요.</b>', '', true);
  else head = deathBox('투표가 없어서 오늘은 <b>아무도 탈락하지 않았어요.</b>', '', true);
  return `<div class="hero" style="padding:8px"><h2>📢 ${stage == 2 ? '재투표 결과' : '투표 결과'}</h2></div>${head}
    <table class="tbl">${tallyRows.map(([id, n]) => `<tr><td style="width:30%"><b>${esc(pname(S.pub, id))}</b></td><td><div class="bar" style="width:${n / max * 100}%"></div></td><td style="width:50px">${n}표</td></tr>`).join('')}</table>`;
}

function deathBox(text, sub, none) {
  return `<div class="death ${none ? 'none' : ''}"><div class="ic">${none ? '🕊️' : '💀'}</div><div class="txt">${text}</div>${sub ? `<div class="sub">${sub}</div>` : ''}</div>`;
}
function spectatorHtml() {
  const s = st();
  const r = s.round || 0;
  const mine = (S.pred && S.pred['r' + r]) || null;
  if (S.predRound !== r) { S.predRound = r; S.predPick = Object.assign({}, mine ? mine.t : {}); }
  const alive = aliveList(S.pub);
  const ph = PH[s.phase] || PH.lobby;
  const lastDay = (S.pub.rounds || {})[r] && S.pub.rounds[r].day;
  const logs = Object.values((S.pred && S.pred.log) || {}).sort((a, b) => b.at - a.at).slice(0, 8);
  let phaseInfo = '';
  if (s.phase === 'mission') phaseInfo = `<div class="mission-box" style="margin-top:10px">${esc(s.mission || '')}</div>`;
  if (s.phase === 'dayResult') phaseInfo = dayResultHtml(r, s.stage);
  if (s.phase === 'morning') phaseInfo = VIEWS.morning();
  const myOut = me() && me().out;
  return `<div class="card"><h2>👻 관전 모드</h2><p>${myOut ? `나는 ${myOut.r}일째 <b>${OUT_CAUSE[myOut.t] || ''}</b>(으)로 탈락했어요. ` : '탈락했어요. '}이제 말하거나 몸짓으로 힌트를 주면 안 돼요. 대신 마피아를 맞혀 보세요!</p>
      <div class="row"><span class="pill">${r}일째</span><span class="pill">${ph.icon} ${esc(ph.name)}</span><span class="pill">생존 ${alive.length}명</span></div>${phaseInfo}</div>
    <div class="card"><h3>🔍 마피아 예측 (${r}일째)</h3><p class="small muted">마피아 같은 친구를 여러 명 골라도 돼요. 게임이 끝나면 정답과 비교해요. 게임에는 영향이 없어요.</p>
      <div class="pick">${alive.map(p => `<button data-act="predPick" data-id="${p.id}" class="${S.predPick[p.id] ? 'sel' : ''}">${esc(p.name)}</button>`).join('')}</div>
      <label class="field"><span>왜 그렇게 생각했나요? (선택)</span><textarea class="in" id="why" maxlength="200" placeholder="예: 미션 때 코를 자꾸 만졌어요">${esc(mine ? mine.why : '')}</textarea></label>
      <button class="btn big" data-act="savePred">${mine ? '예측 바꾸기' : '예측 저장하기'}</button>
      ${logs.length ? `<details style="margin-top:12px"><summary>내 예측 기록</summary><table class="tbl">${logs.map(l => `<tr><td>${l.r}일째</td><td>${Object.keys(l.t || {}).map(id => esc(pname(S.pub, id))).join(', ') || '없음'}</td><td class="small muted">${esc(l.why || '')}</td></tr>`).join('')}</table></details>` : ''}</div>
    <div class="card"><h3>명단</h3>${listHtml().replace(/^<div class="card">|<\/div>$/g, '')}</div>`;
}

function endHtml() {
  const e = S.pub.end;
  if (!e) return `<div class="card hero"><div class="ic">🏁</div><h2>게임이 끝났어요</h2></div>`;
  const myTeam = S.role ? Logic.teamOf(S.role) : null;
  const win = e.winner === 'draw' ? '🤝' : (myTeam === e.winner ? '🎉' : '😢');
  const roles = e.roles || {};
  const rows = Object.entries(S.pub.players || {}).map(([id, p]) => ({ id, ...p, role: roles[id] })).sort((a, b) => (a.role === 'mafia' ? -1 : 0) - (b.role === 'mafia' ? -1 : 0) || byName(a, b));
  let predHtml = '';
  if (S.pred && S.pred.log) {
    const byR = Object.keys(S.pred).filter(k => /^r\d+$/.test(k)).sort((a, b) => +a.slice(1) - +b.slice(1));
    predHtml = `<div class="card"><h3>🔍 내 예측 결과</h3><table class="tbl">${byR.map(k => {
      const ids = Object.keys(S.pred[k].t || {});
      const hit = ids.filter(id => roles[id] === 'mafia').length;
      return `<tr><td>${k.slice(1)}일째</td><td>${ids.map(id => `<span class="pill ${roles[id] === 'mafia' ? 'good' : ''}">${esc(pname(S.pub, id))}${roles[id] === 'mafia' ? ' ✔' : ''}</span>`).join(' ') || '없음'}</td><td>${ids.length ? `${hit}/${ids.length} 맞힘` : ''}</td></tr>`;
    }).join('')}</table></div>`;
  }
  return `<div class="card hero"><div class="ic">${win}</div><h2>${WINNER_TEXT[e.winner] || ''}</h2>
      <p class="muted">${esc(END_METHOD[e.method] || '')} · ${e.round || 0}일째</p>
      ${myTeam ? `<p style="font-size:1.2rem">나는 <b>${Logic.ROLES[S.role].name}</b>였어요.</p>` : ''}
      <p>남은 인원 — 시민 팀 ${e.alive ? e.alive.citizen : '?'}명 / 마피아 팀 ${e.alive ? e.alive.mafia : '?'}명</p>
      ${e.rate ? `<p>생존율 — 시민 팀 ${e.rate.citizen}% / 마피아 팀 ${e.rate.mafia}%</p>` : ''}</div>
    <div class="card">${deathTimelineHtml(S.pub, roles)}</div>
    ${predHtml}
    <div class="card"><h3>모두의 역할</h3><div class="names" style="margin-top:8px">${rows.map(p => `<span class="n ${p.alive ? '' : 'dead'}"><span class="pill ${p.role || ''}">${p.role ? Logic.ROLES[p.role].name : '?'}</span> ${esc(p.name)}</span>`).join('')}</div></div>`;
}

/* ---------- 버튼 ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b) return;
  const a = b.dataset.act, id = b.dataset.id;
  if (a === 'closeModal') { if (e.target === b) closeModal(); return; }
  if (a === 'openCard') { openCard(); return; }
  if (a === 'closeCard') { closeCard(); return; }
  if (b.tagName === 'A') e.preventDefault();
  if (a === 'goCode') { const v = ($('#codeIn').value || '').trim().toUpperCase(); if (!v) return toast('참가 코드를 넣어 주세요.'); S.code = v; history.replaceState(null, '', '?r=' + v); render(); enterRoom(); }
  else if (a === 'changeCode') { for (const k of Object.keys(L_)) unlisten(k); ls.del('mafia.room'); location.href = location.pathname; }
  else if (a === 'join') joinRoom($('#nameIn').value);
  else if (a === 'cancelRejoin') cancelRejoin();
  else if (a === 'confirmRole') confirmRole();
  else if (a === 'toggleList') { S.showList = !S.showList; render(); }
  else if (a === 'pickVote') { S.pickVote = id; render(); }
  else if (a === 'submitVote') submitVote();
  else if (a === 'voteYes') voteYes();
  else if (a === 'pickNight') { S.pickNight = id; render(); }
  else if (a === 'nightOk') nightOk();
  else if (a === 'predPick') { S.predPick[id] = !S.predPick[id]; render(); }
  else if (a === 'savePred') savePred();
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  if (e.target.id === 'codeIn') $('[data-act=goCode]').click();
  if (e.target.id === 'nameIn') $('[data-act=join]').click();
});
