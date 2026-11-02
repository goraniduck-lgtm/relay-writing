/* 딱! 같은 그림 — 화면 흐름과 게임 진행
   대결 판정: rooms/{번호}/claims/{판} 에 먼저 쓴 자리가 그 판을 가짐 (서버가 하나만 받음)
   점수·카드는 claims 만으로 두 태블릿이 똑같이 계산함 */
'use strict';

const G = {
  mode: null, seat: null, opp: null, code: null, room: null, cfg: null, key: null, gen: 0,
  set: null, game: null, start: 2, claims: [], shown: 0, tops: {}, scores: {},
  combo: 0, best: 0, busy: false, locked: false, playing: false, ended: false,
  pressed: null, pressId: null, jit: null, pending: null, syncing: false, roundStart: 0, unsub: null, clock: null, t0: 0,
  readyAt: 0, oppGone: false, joining: false
};
const make = { mode: 'duo', set: ls.get('dobble.set', SETS[0].id), len: ls.get('dobble.len', 25) };
const roomPath = () => `${ROOT}/rooms/${G.code}`;
const cC = $('#cC'), cM = $('#cM'), table = $('#table');

/* ================= 메뉴 ================= */
let screenEpoch = 0;
function show(id) { screenEpoch++; document.querySelectorAll('.screen').forEach(s => { s.hidden = s.id !== id; }); window.scrollTo(0, 0); trapBack(id !== 'home'); }
const screenNow = () => { const s = [...document.querySelectorAll('.screen')].find(x => !x.hidden); return s ? s.id : 'home'; };
const inGame = () => ['lobby', 'play'].includes(screenNow());

/* ---------- 뒤로 가기(가장자리 스와이프) 막기 ----------
   화면에 머무는 동안 기록을 하나 더 쌓아 두고, 뒤로 가기가 오면 다시 쌓은 뒤 '나갈까요?'를 물음 */
let trapped = false, skipPop = 0;
function trapBack(on) {
  if (on && !trapped) { history.pushState({ dobble: 1 }, ''); trapped = true; }
  else if (!on && trapped) { trapped = false; skipPop++; history.back(); }
}
addEventListener('popstate', () => {
  if (skipPop) { skipPop--; return; }
  trapped = false;
  const id = screenNow();
  if (id === 'make' || id === 'join') { show('home'); renderResume(); return; }
  if (id === 'home') return;
  trapBack(true);
  if (!$('#result').hidden && !G.oppGone) return;
  if ($('#ask').hidden) askQuit();
});
addEventListener('beforeunload', e => { if (inGame() && !G.oppGone) { e.preventDefault(); e.returnValue = ''; } });
document.addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('dblclick', e => e.preventDefault());

/* ---------- 전체화면 ---------- */
const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
function fsEnter() {
  const d = document.documentElement, f = d.requestFullscreen || d.webkitRequestFullscreen;
  if (!f || fsEl()) return;
  try { const p = f.call(d, { navigationUI: 'hide' }); if (p && p.catch) p.catch(() => {}); } catch (e) {}
}
function fsExit() { const f = document.exitFullscreen || document.webkitExitFullscreen; if (f && fsEl()) { try { const p = f.call(document); if (p && p.catch) p.catch(() => {}); } catch (e) {} } }
const fsWanted = () => GAME.autoFullscreen && ls.get('dobble.fs', true) !== false;
const fsAuto = () => { if (fsWanted()) fsEnter(); };
function fsSync() { document.body.classList.toggle('is-fs', !!fsEl()); document.querySelectorAll('[data-fs]').forEach(b => b.setAttribute('aria-label', fsEl() ? '전체화면 끄기' : '전체화면')); }
['fullscreenchange', 'webkitfullscreenchange'].forEach(ev => document.addEventListener(ev, () => { fsSync(); if (!$('#play').hidden) setTimeout(fit, 60); }));
document.addEventListener('click', e => {
  if (!e.target.closest('[data-fs]')) return;
  if (fsEl()) { ls.set('dobble.fs', false); fsExit(); } else { ls.set('dobble.fs', true); fsEnter(); }
});

/* ---------- 버튼 두 번 눌림 막기 ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b) return;
  const gap = b.closest('#pad') ? 150 : GAME.buttonGuardMs, now = performance.now();
  if (b._ep === screenEpoch && now - b._last < gap) { e.stopImmediatePropagation(); e.preventDefault(); return; }
  b._last = now; b._ep = screenEpoch;
}, true);

/* ---------- 물어보기 창 ---------- */
function ask(title, sub, btns) {
  $('#askTitle').textContent = title; $('#askSub').textContent = sub || ''; $('#askSub').hidden = !sub;
  const box = $('#askBtns'); box.innerHTML = '';
  btns.forEach(b => { const el = document.createElement('button'); el.className = b.main ? 'primary' : 'ghost'; el.textContent = b.label; el.onclick = () => { $('#ask').hidden = true; b.fn && b.fn(); }; box.appendChild(el); });
  $('#ask').hidden = false;
  cancelPress();
}
function askQuit() {
  const duo = G.mode === 'duo' && G.room && G.room.seats && G.room.seats.b;
  ask('게임을 그만할까요?', duo ? '친구 화면에는 "친구가 나갔어요"가 떠요' : '', [
    { label: '계속하기', main: true },
    { label: '나가기', fn: quitGame }
  ]);
}
$('#quitBtn').addEventListener('click', askQuit);
const nickOf = () => ($('#nick').value || '').trim().slice(0, 8);
$('#nick').value = ls.get('dobble.nick', '');
$('#nick').addEventListener('input', () => ls.set('dobble.nick', nickOf()));
document.addEventListener('pointerdown', () => FX.audio(), { once: true });

document.addEventListener('click', e => {
  const b = e.target.closest('[data-go]'); if (!b) return;
  const go = b.dataset.go;
  if (go !== 'home') fsAuto();
  if (go === 'home') { show('home'); renderResume(); }
  else if (go === 'join') { codeBuf = ''; renderCode(); show('join'); }
  else { make.mode = go === 'make-solo' ? 'solo' : 'duo'; renderMake(); show('make'); }
});

function renderMake() {
  $('#makeTitle').textContent = make.mode === 'solo' ? '혼자 연습' : '방 만들기';
  $('#makeGo').textContent = make.mode === 'solo' ? '시작!' : '방 만들기';
  if (!SETS.some(s => s.id === make.set)) make.set = SETS[0].id;
  $('#sets').innerHTML = SETS.map(s => {
    const pv = s.symbols.slice(0, 8).map(x => x.img ? `<img src="${esc(x.img)}" alt="">` : esc(s.show === 'word' ? x.w : (emojiOf(x) || x.w))).join(s.show === 'word' ? ' · ' : '');
    return `<button class="set${s.id === make.set ? ' on' : ''}" data-set="${esc(s.id)}"><b>${esc(s.name)}</b><span class="pv">${pv}</span><small>${esc(s.desc || '')}</small></button>`;
  }).join('');
  const total = symbolsFor(orderFor(setById(make.set).symbols.length));
  $('#lengths').innerHTML = GAME.lengths.map(l => {
    const n = l.n && l.n < total ? l.n : total;
    return `<button class="chip${l.n === make.len ? ' on' : ''}" data-len="${l.n}">${esc(l.name)}<small>${n}장</small></button>`;
  }).join('');
}
$('#sets').addEventListener('click', e => { const b = e.target.closest('[data-set]'); if (!b) return; make.set = b.dataset.set; ls.set('dobble.set', make.set); renderMake(); });
$('#lengths').addEventListener('click', e => { const b = e.target.closest('[data-len]'); if (!b) return; make.len = +b.dataset.len; ls.set('dobble.len', make.len); renderMake(); });
$('#makeGo').addEventListener('click', () => { fsAuto(); if (make.mode === 'solo') startSolo(); else createRoom(); });
$('#sets').addEventListener('click', () => preloadSet(setById(make.set)));
const newSeed = () => 1 + Math.floor(Math.random() * 2147483000);

/* ---------- 방 번호 입력 ---------- */
let codeBuf = '';
$('#pad').innerHTML = [1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-k="${n}">${n}</button>`).join('') + '<button class="fn" data-k="c">지우기</button><button data-k="0">0</button><button class="fn" data-k="b">←</button>';
function renderCode() { $('#codeIn').querySelectorAll('span').forEach((s, i) => { s.textContent = codeBuf[i] || ''; s.classList.toggle('f', i < codeBuf.length); }); }
$('#pad').addEventListener('click', e => {
  const b = e.target.closest('[data-k]'); if (!b) return;
  const k = b.dataset.k;
  if (k === 'c') codeBuf = ''; else if (k === 'b') codeBuf = codeBuf.slice(0, -1); else if (codeBuf.length < 4) codeBuf += k;
  renderCode();
  if (codeBuf.length === 4) { fsAuto(); tryJoin(codeBuf); }
});
function codeError(msg) {
  const el = $('#codeIn'); el.classList.remove('err'); void el.offsetWidth; el.classList.add('err');
  toast(msg); codeBuf = ''; setTimeout(renderCode, 350);
}

/* ================= 방 ================= */
async function createRoom() {
  const btn = $('#makeGo'); btn.disabled = true;
  try {
    const uid = (await DB.ready()).uid;
    const nick = nickOf();
    for (let i = 0; i < 8; i++) {
      const code = String(1000 + Math.floor(Math.random() * 9000));
      const room = { ts: DB.TS, seats: { a: uid }, cfg: { set: make.set, n: make.len, seed: newSeed(), st: 'wait' } };
      if (nick) room.names = { a: nick };
      try { await DB.set(`${ROOT}/rooms/${code}`, room); } catch (e) { continue; }
      enterRoom(code, 'a');
      cleanOld();
      return;
    }
    toast('방을 만들지 못했어요. 다시 해 주세요.');
  } catch (e) { console.warn(e); toast('인터넷 연결을 확인해 주세요.'); }
  finally { btn.disabled = false; }
}
/* 12시간 지난 방 정리 */
async function cleanOld() {
  try {
    const rooms = await DB.get(`${ROOT}/rooms`) || {};
    const old = DB.now() - 12 * 3600e3;
    for (const [c, r] of Object.entries(rooms)) if (r && r.ts < old) DB.remove(`${ROOT}/rooms/${c}`).catch(() => {});
  } catch (e) {}
}
async function tryJoin(code) {
  if (G.joining) return;
  G.joining = true;
  try {
    const uid = (await DB.ready()).uid;
    const room = await DB.get(`${ROOT}/rooms/${code}`);
    if (!room || !room.seats) return codeError('그런 방이 없어요');
    if (room.seats.a === uid) return enterRoom(code, 'a');
    if (room.seats.b === uid) return enterRoom(code, 'b');
    if (room.seats.b) return codeError('이미 두 명이 들어와 있어요');
    await DB.set(`${ROOT}/rooms/${code}/seats/b`, uid);
    if (nickOf()) await DB.set(`${ROOT}/rooms/${code}/names/b`, nickOf());
    enterRoom(code, 'b');
  } catch (e) { console.warn(e); codeError('들어가지 못했어요. 다시 해 주세요.'); }
  finally { G.joining = false; }
}
function enterRoom(code, seat) {
  leaveRoom();
  Object.assign(G, { mode: 'duo', code, seat, opp: seat === 'a' ? 'b' : 'a', room: null, key: null, oppGone: false });
  ls.set('dobble.last', { code, seat });
  DB.whileOnline(`${roomPath()}/on/${seat}`, true).catch(() => {});
  DB.remove(`${roomPath()}/quit/${seat}`).catch(() => {});
  $('#codeBig').innerHTML = code.split('').map(d => `<span>${d}</span>`).join('');
  show('lobby');
  const tok = ++roomTok;
  G.unsub = DB.on(roomPath(), r => { if (tok === roomTok) onRoom(r); });
}
let roomTok = 0;
function leaveRoom() {
  roomTok++;
  if (G.unsub) { G.unsub(); G.unsub = null; }
  stopGame();
  G.code = null; G.room = null; G.mode = null; G.oppGone = false;
}
/* 나가기: 기다리는 방이면 자리를 비우고, 게임 중이면 '나갔음'을 남김. 둘 다 나가면 방을 지움 */
function quitGame() {
  if (G.mode === 'duo' && G.code) {
    const r = G.room || {}, base = roomPath(), seat = G.seat;
    const oppHere = r.seats && r.seats[G.opp] && !(r.quit && r.quit[G.opp]);
    let job;
    if (!oppHere || G.oppGone) job = DB.remove(base);
    else if (r.cfg && r.cfg.st === 'wait') job = seat === 'a' ? DB.remove(base) : DB.update(base, { 'names/b': null, 'seats/b': null, 'on/b': null });
    else job = DB.update(base, { [`quit/${seat}`]: true, [`on/${seat}`]: null });
    job.catch(e => console.warn(e));
  }
  ls.set('dobble.last', null);
  leaveRoom(); show('home'); renderResume();
}
const seatName = s => (G.room && G.room.names && G.room.names[s]) || GAME.names[s];

function onRoom(room) {
  if (!room || !room.cfg) {
    if (G.room && !G.oppGone) toast('방이 닫혔어요');
    leaveRoom(); ls.set('dobble.last', null); show('home'); renderResume(); return;
  }
  G.room = room; G.cfg = room.cfg;
  if (room.quit && room.quit[G.opp]) {
    if (!G.oppGone) {
      G.oppGone = true; stopGame(); ls.set('dobble.last', null);
      ask(`${seatName(G.opp)} 친구가 나갔어요`, '새 방을 만들어 다시 할 수 있어요', [{ label: '처음으로', main: true, fn: quitGame }]);
    }
    return;
  }
  if (room.cfg.st === 'wait') { renderLobby(room); if ($('#lobby').hidden) show('lobby'); return; }
  const key = room.cfg.seed + '/' + room.cfg.go;
  if (key !== G.key) { G.key = key; setupGame(room.cfg, normClaims(room.claims)); }
  else gotClaims(normClaims(room.claims));
  $('#oppName').textContent = seatName(G.opp);
  $('#myName').textContent = seatName(G.seat);
  $('#oppOff').hidden = !!(room.on && room.on[G.opp]);
}
function renderLobby(room) {
  const s = setById(room.cfg.set);
  const total = symbolsFor(orderFor(s.symbols.length));
  $('#lobbySet').textContent = `${s.name} · ${room.cfg.n && room.cfg.n < total ? room.cfg.n : total}장`;
  $('#players').innerHTML = ['a', 'b'].map(k => {
    const has = room.seats && room.seats[k];
    if (!has) return `<div class="pl empty">친구를 기다리는 중…</div>`;
    const on = room.on && room.on[k];
    return `<div class="pl${on ? '' : ' off'}" style="--c:${GAME.colors[k]}"><i class="dot"></i>${esc(seatName(k))}${k === G.seat ? ' <small>나</small>' : ''}</div>`;
  }).join('');
  $('#startBtn').disabled = !(room.seats && room.seats.b);
}
$('#startBtn').addEventListener('click', () => {
  fsAuto();
  DB.update(`${roomPath()}/cfg`, { st: 'play', go: Math.round(DB.now() + (GAME.countdown + .6) * 1000) }).catch(() => toast('시작하지 못했어요'));
});
$('#leave').addEventListener('click', quitGame);

function renderResume() {
  const last = ls.get('dobble.last', null), el = $('#resume');
  el.hidden = !last;
  if (last) { el.innerHTML = `<button>방 ${esc(last.code)} 이어서 하기</button>`; el.firstChild.onclick = () => { fsAuto(); tryJoin(last.code); }; }
}
renderResume();

/* ================= 게임 준비 ================= */
function normClaims(obj) {
  const a = []; if (!obj) return a;
  for (let i = 0; ; i++) { const v = obj[i]; if (v !== 'a' && v !== 'b') break; a.push(v); }
  return a;
}
const centerCard = () => G.game.deck[G.start + G.shown];
const remaining = () => G.game.deck.length - G.start - G.shown;

function startSolo() {
  leaveRoom();
  Object.assign(G, { mode: 'solo', seat: 'a', opp: null, room: null, code: null });
  setupGame({ set: make.set, n: make.len, seed: newSeed(), go: Date.now() + (GAME.countdown + .6) * 1000 }, []);
}
function stopGame() {
  G.gen++; G.playing = false; G.busy = false; G.pending = null; G.locked = false;
  cancelPress(); clearInterval(G.clock); FX.clearAll(); $('#fly').innerHTML = '';
  $('#result').hidden = true; $('#countOver').hidden = true; $('#ask').hidden = true;
}
/* 그림 파일은 미리 불러 두기 (카드가 바뀔 때 늦게 뜨지 않게) */
const preloaded = {};
function preloadSet(set) {
  return Promise.all(set.symbols.filter(x => x.img).map(x => {
    if (!preloaded[x.img]) { const im = new Image(); im.src = x.img; preloaded[x.img] = (im.decode ? im.decode() : Promise.resolve()).catch(() => {}); }
    return preloaded[x.img];
  }));
}
function setupGame(cfg, claims) {
  stopGame();
  const gen = G.gen;
  G.cfg = cfg; G.set = setById(cfg.set);
  preloadSet(G.set);
  G.game = makeGame(G.set, cfg.seed, cfg.n || 0);
  G.start = G.mode === 'solo' ? 1 : 2;
  G.claims = []; G.shown = 0; G.combo = 0; G.best = 0; G.ended = false;
  G.tops = G.mode === 'solo' ? { a: G.game.deck[0] } : { a: G.game.deck[0], b: G.game.deck[1] };
  G.scores = { a: 0, b: 0 };
  const pl = $('#play');
  pl.style.setProperty('--me', G.mode === 'solo' ? GAME.colors.a : GAME.colors[G.seat]);
  pl.style.setProperty('--opp', G.mode === 'solo' ? GAME.colors.b : GAME.colors[G.opp]);
  $('#oppBar').classList.toggle('solo', G.mode === 'solo');
  $('#oppMini').hidden = G.mode === 'solo';
  $('#myName').textContent = G.mode === 'solo' ? (nickOf() || '나') : seatName(G.seat);
  $('#oppName').textContent = G.mode === 'solo' ? '⏱ 0.0초' : seatName(G.opp);
  $('#oppOff').hidden = true;
  show('play'); fit();
  /* 이미 진행된 판(다시 들어온 경우)은 바로 반영 */
  for (const w of claims) { G.claims.push(w); applyRound(w); }
  renderAll(); comboLabel(); FX.setOpp(oppStreak());
  if (G.start + G.shown >= G.game.deck.length) { finish(); return; }
  countdown(cfg.go, gen);
}
async function countdown(go, gen) {
  const now = () => (G.mode === 'solo' ? Date.now() : DB.now());
  const until = t => wait(Math.max(0, t - now()));
  if (go - now() > -1000) {
    cC.classList.add('wait');
    const ov = $('#countOver'), num = $('#countNum');
    for (let k = GAME.countdown; k >= 1; k--) {
      await until(go - k * 1000); if (gen !== G.gen) return;
      ov.hidden = false; num.textContent = k;
      num.animate([{ transform: 'scale(.3)', opacity: 0 }, { transform: 'scale(1.15)', opacity: 1, offset: .4 }, { transform: 'scale(1)', opacity: .9 }], { duration: 450, easing: 'ease-out' });
      FX.tone(440, .12, 'triangle', .14);
    }
    await until(go); if (gen !== G.gen) return;
    ov.hidden = true; FX.tone(880, .25, 'triangle', .16); FX.tone(1320, .3, 'sine', .08, null, .05);
  }
  cC.classList.remove('wait');
  renderCenter(true);
  G.playing = true; G.roundStart = performance.now(); G.t0 = performance.now();
  if (G.mode === 'solo') G.clock = setInterval(() => { $('#oppName').textContent = '⏱ ' + ((performance.now() - G.t0) / 1000).toFixed(1) + '초'; }, 100);
  sync();
}

/* ================= 그리기 ================= */
function fit() {
  const r = table.getBoundingClientRect(), lbl = 34;
  let d = r.width >= r.height ? Math.min((r.width - 140) / 2, r.height - lbl - 30) : Math.min(r.width - 60, (r.height - 2 * lbl - 70) / 2);
  table.style.setProperty('--d', Math.max(140, Math.min(560, Math.floor(d))) + 'px');
}
addEventListener('resize', () => { if (!$('#play').hidden) fit(); });

function symHtml(i) {
  const s = G.set.symbols[i], mode = G.set.show, e = emojiOf(s);
  if (s.img) {
    const img = `<img src="${esc(s.img)}" alt="${esc(s.w || '')}" draggable="false">`;
    return mode === 'both' && s.w ? { cls: 'both', html: img + `<span class="w">${esc(s.w)}</span>` } : { cls: '', html: img };
  }
  if (!e || mode === 'word') { const len = Math.max(1, [...(s.w || '')].length); return { cls: 'word', html: `<span class="w" style="--wf:${clamp(.95 / len, .2, .48).toFixed(3)}">${esc(s.w)}</span>` }; }
  if (mode === 'both' && s.w) return { cls: 'both', html: `<span class="e">${esc(e)}</span><span class="w">${esc(s.w)}</span>` };
  return { cls: '', html: `<span class="e">${esc(e)}</span>` };
}
function renderCard(el, card) {
  if (!card) { el.innerHTML = ''; return; }
  el.innerHTML = layoutOf(card, G.cfg.seed, G.set.show !== 'emoji').map(o => {
    const h = symHtml(o.s);
    return `<div class="sy ${h.cls}" data-s="${o.s}" style="left:${(o.x * 100).toFixed(2)}%;top:${(o.y * 100).toFixed(2)}%;--sz:${o.size.toFixed(3)};--r:${o.rot}deg">${h.html}</div>`;
  }).join('');
}
function renderCenter(anim) {
  if (G.start + G.shown >= G.game.deck.length) { cC.innerHTML = ''; cC.style.visibility = 'hidden'; }
  else { cC.style.visibility = ''; renderCard(cC, centerCard()); }
  if (anim) G.readyAt = Math.max(G.readyAt, performance.now() + GAME.newCardGuardMs);
  if (anim) cC.animate([{ transform: 'scale(.5) rotate(-20deg)', opacity: 0 }, { transform: 'scale(1.08) rotate(3deg)', opacity: 1, offset: .7 }, { transform: 'scale(1) rotate(0)' }], { duration: 320, easing: 'ease-out' });
  $('#leftLbl').textContent = `가운데 카드 · 남은 ${Math.max(0, remaining())}장`;
}
function renderAll() {
  renderCenter(false);
  renderCard(cM, G.tops[G.seat]);
  if (G.mode === 'duo') renderCard($('#oppMini'), G.tops[G.opp]);
  renderScores();
}
function renderScores() {
  $('#myScore').textContent = G.scores[G.seat];
  if (G.mode === 'duo') $('#oppScore').textContent = G.scores[G.opp];
  const n = G.scores[G.seat];
  $('#pile').className = 'pile' + (n >= 3 ? ' n3' : n === 2 ? ' n2' : n === 1 ? ' n1' : '');
}
function comboLabel() {
  const el = $('#combo');
  el.textContent = G.combo >= 2 ? `🔥 ${G.combo}연속` : '';
  el.classList.toggle('hot', G.combo >= 5);
  if (G.combo >= 2) el.animate([{ transform: 'scale(.4)' }, { transform: 'scale(1.3)', offset: .5 }, { transform: 'scale(1)' }], { duration: 300, easing: 'ease-out' });
}
function setCombo(n) { G.combo = n; G.best = Math.max(G.best, n); comboLabel(); FX.setCombo(n); }
function oppStreak() { let k = 0; for (let i = G.shown - 1; i >= 0 && G.claims[i] === G.opp; i--) k++; return G.mode === 'duo' ? k : 0; }

/* ================= 판 진행 ================= */
function applyRound(w) {
  G.tops[w] = G.game.deck[G.start + G.shown];
  G.scores[w]++; G.shown++;
}
function gotClaims(arr) {
  if (arr.length < G.claims.length) return;
  G.claims = arr; sync();
}
async function sync() {
  if (G.syncing) return;
  G.syncing = true; const gen = G.gen;
  try {
    while (gen === G.gen && G.playing && !G.ended && G.shown < G.claims.length) {
      if (G.pending && G.pending.r === G.shown) break;
      const w = G.claims[G.shown];
      if (w === G.seat) { applyRound(w); renderAll(); } else await oppTake(w);
    }
  } finally { if (gen === G.gen) G.syncing = false; }
  checkEnd();
}
function checkEnd() {
  if (G.playing && !G.ended && !G.pending && G.start + G.shown >= G.game.deck.length) finish();
}

/* 상대가 가져감: 가운데 카드가 상대 쪽으로 날아감 */
async function oppTake(w) {
  G.busy = true; cancelPress();
  if (G.combo) setCombo(0);
  const gen = G.gen;
  const a = cC.getBoundingClientRect(), b = $('#oppMini').getBoundingClientRect();
  const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2), sc = b.width / a.width;
  FX.tone(500, .25, 'sine', .07, 160);
  await done(cC.animate([{ transform: 'none' }, { transform: `translate(${dx * .5}px,${dy * .5 - 30}px) rotate(-14deg) scale(${(1 + sc) / 2})`, offset: .5 }, { transform: `translate(${dx}px,${dy}px) rotate(-30deg) scale(${sc})`, opacity: .6 }], { duration: 340, easing: 'cubic-bezier(.5,0,.7,1)' }));
  if (gen !== G.gen) return;
  applyRound(w);
  renderAll(); renderCenter(true);
  $('#oppMini').animate([{ transform: 'scale(1)' }, { transform: 'scale(1.3,.8)' }, { transform: 'scale(.9,1.12)' }, { transform: 'scale(1)' }], { duration: 280 });
  FX.tone(150, .14, 'sine', .2, 70);
  FX.setOpp(oppStreak());
  G.roundStart = performance.now();
  G.busy = false;
}

/* ================= 누르기 ================= */
const setv = (el, o) => { for (const k in o) el.style.setProperty('--' + k, o[k]); };
const center = el => { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };

cM.addEventListener('pointerdown', e => {
  const s = e.target.closest('.sy');
  if (!s || !G.playing || G.ended || G.busy || G.locked || G.pending || G.pressed) return;
  if (!e.isPrimary || performance.now() < G.readyAt || !$('#ask').hidden) return;
  e.preventDefault();
  G.pressed = s; G.pressId = e.pointerId;
  const sid = +s.dataset.s, m = matOf(G.set, sid);
  $('#info').textContent = `${symName(G.set, sid)} · ${m.name}`;
  FX.tone(m.press[0] * J(), .07, m.press[1], m.press[1] === 'square' ? .07 : .22, m.press[0] * .35);
  s.style.transition = 'transform 45ms ease-out'; s.classList.add('hold');
  setv(s, { sx: (m.squash[0] * J()).toFixed(3), sy: (m.squash[1] / J()).toFixed(3) });
  setTimeout(() => { if (G.pressed === s) { s.style.transition = ''; setv(s, { sx: m.hold, sy: m.hold }); } }, 55);
  const a = m.jitter * 1.5;
  G.jit = s.animate([{ translate: '0 0' }, { translate: `${a}px ${-a * .7}px` }, { translate: `${-a}px ${a * .7}px` }, { translate: `${a * .7}px ${a}px` }, { translate: '0 0' }], { duration: m.jitterMs, iterations: Infinity, delay: 180 });
  const [bx, by] = center(s), push = 7 * m.knock;
  cM.querySelectorAll('.sy').forEach(x => { if (x === s) return; const [ax, ay] = center(x), d = Math.hypot(ax - bx, ay - by) || 1; setv(x, { px: ((ax - bx) / d * push).toFixed(1) + 'px', py: ((ay - by) / d * push).toFixed(1) + 'px' }); });
  const r = cM.getBoundingClientRect(), nx = (e.clientX - r.left) / r.width - .5, ny = (e.clientY - r.top) / r.height - .5, tilt = 16 * Math.sqrt(m.impact);
  cM.style.transition = 'transform 70ms ease-out';
  cM.style.transform = `perspective(700px) rotateX(${(-ny * tilt).toFixed(1)}deg) rotateY(${(nx * tilt).toFixed(1)}deg) scale(.97)`;
  FX.ring(e.clientX, e.clientY, '#7F77DD', 70 + 20 * m.impact, 380);
});
function relax() {
  if (G.jit) { G.jit.cancel(); G.jit = null; }
  cM.querySelectorAll('.sy').forEach(x => setv(x, { px: '0px', py: '0px' }));
  cM.style.transition = 'transform 320ms cubic-bezier(.3,1.8,.5,1)'; cM.style.transform = '';
}
function cancelPress() {
  if (!G.pressed) return;
  const s = G.pressed; G.pressed = null; relax();
  s.classList.remove('hold'); s.style.transition = ''; setv(s, { sx: 1, sy: 1 });
}
addEventListener('pointerup', e => { if (!G.pressed || e.pointerId !== G.pressId) return; const s = G.pressed; G.pressed = null; relax(); launch(s); });
addEventListener('pointercancel', e => { if (e.pointerId === G.pressId) cancelPress(); });

/* ================= 날리기 ================= */
function flightFrames(dx, dy, r0, r1, m, arc) {
  return [0, .25, .5, .75, 1].map(t => {
    const x = dx * t + (m.wave ? Math.sin(t * Math.PI * 2) * m.wave : 0), y = dy * t - arc * 4 * t * (1 - t);
    const sc = t === 0 ? m.hold : t === 1 ? 1.1 : 1 + .3 * Math.sin(t * Math.PI);
    return { transform: `translate(-50%,-50%) translate(${x.toFixed(1)}px,${y.toFixed(1)}px) rotate(${(r0 + (r1 - r0) * t).toFixed(0)}deg) scale(${sc.toFixed(2)})` };
  });
}
async function launch(s) {
  const gen = G.gen;
  G.busy = true;
  const sid = +s.dataset.s, m = matOf(G.set, sid);
  const ok = centerCard().includes(sid);
  const tgt = ok ? cC.querySelector(`.sy[data-s="${sid}"]`) : null;
  const sec = (performance.now() - G.roundStart) / 1000, power = clamp(1.35 - (sec - GAME.fastSec) * .15, .75, 1.35);

  let P = null;
  if (ok) {
    P = { r: G.shown, result: null };
    P.decided = new Promise(res => { P.res = res; });
    P.decide = v => { if (P.result == null) { P.result = v; P.res(v); } };
    G.pending = P;
    if (G.mode === 'solo') P.decide('me');
    else {
      DB.claim(`${roomPath()}/claims/${P.r}`, G.seat).then(c => P.decide(c ? 'me' : 'lost'));
      setTimeout(() => P.decide('net'), 4000);
    }
  }

  const [sx, sy] = center(s), [tx, ty] = center(tgt || cC);
  const dx = tx - sx, dy = ty - sy;
  const r0 = parseFloat(s.style.getPropertyValue('--r')) || 0;
  const r1 = (tgt ? parseFloat(tgt.style.getPropertyValue('--r')) || 0 : r0) + m.spin;
  const dur = clamp(m.flight / Math.sqrt(power) * J(), GAME.flightMin, GAME.flightMax);
  const fl = s.cloneNode(true);
  fl.classList.remove('hold'); fl.classList.add('flyer');
  fl.style.cssText += `;left:${sx}px;top:${sy}px;--d:${cM.offsetWidth}px;transition:none`;
  $('#fly').appendChild(fl);
  s.classList.remove('hold'); s.classList.add('gone'); s.style.transition = ''; setv(s, { sx: 1, sy: 1 });
  FX.tone(m.whoosh[0], dur / 1000, 'sine', .09, m.whoosh[1] * Math.sqrt(power));
  const anim = fl.animate(flightFrames(dx, dy, r0, r1, m, m.arc * J()), { duration: dur, easing: 'cubic-bezier(.45,0,.95,.55)', fill: 'forwards' });
  let flying = true;
  const color = G.combo >= FIRE.startCombo ? '#EF9F27' : '#7F77DD';
  (function trail() { if (!flying) return; const [x, y] = center(fl); FX.dot(x, y, m.trail * (power > 1.2 ? 1.3 : 1), color, 260); requestAnimationFrame(trail); })();
  await done(anim);
  flying = false;
  if (gen !== G.gen) { fl.remove(); return; }

  if (!ok) { await bounce(fl, s, dx, dy, m); G.busy = false; G.readyAt = Math.max(G.readyAt, performance.now() + GAME.tapGapMs); return; }

  /* 판정이 아직이면 부딪힌 자세로 잠깐 멈춤 (히트스톱) */
  const result = P.result || await Promise.race([P.decided, wait(1500).then(() => 'net')]);
  if (gen !== G.gen) { fl.remove(); return; }
  if (result === 'me') await hitWin(fl, s, tgt, dx, dy, m, power, P.r);
  else await missRace(fl, s, result);
  if (gen !== G.gen) return;
  G.pending = null; G.busy = false;
  G.readyAt = Math.max(G.readyAt, performance.now() + GAME.tapGapMs);
  sync(); checkEnd();
}

/* 내가 먼저! */
async function hitWin(fl, s, tgt, dx, dy, m, power, r) {
  const gen = G.gen;
  if (G.mode === 'duo' && G.claims.length === r) G.claims.push(G.seat);
  if (G.mode === 'solo') G.claims[r] = 'a';
  setCombo(G.combo + 1);
  const lvl = Math.min(G.combo, 5), k = 1 + lvl * .08, n = Math.hypot(dx, dy) || 1, imp = m.impact * power;
  fl.remove();
  tgt.style.transition = 'none'; tgt.classList.add('good');
  setv(tgt, { sx: (1 + .45 * imp).toFixed(2), sy: Math.max(.4, 1 - .35 * imp).toFixed(2) });
  FX.tone(m.hit[0], .18, m.hit[1], m.hit[2], m.hit[3]); FX.tone(660 * k, .12, 'triangle', .16);
  const [tx, ty] = center(tgt);
  FX.ring(tx, ty, '#EF9F27', (100 + lvl * 20) * Math.min(imp, 1.8), 300);
  await wait((60 + lvl * 10) * Math.min(imp, 1.6));
  if (gen !== G.gen) return;
  FX.tone(990 * k, .22, 'triangle', .15); if (lvl >= 3) FX.tone(1320 * k, .28, 'sine', .1);
  const sp = `transform ${m.spring[0]}ms ${m.spring[1]}`;
  tgt.style.transition = sp; setv(tgt, { sx: 1.35, sy: 1.35 });
  s.classList.remove('gone'); s.classList.add('good'); s.style.transition = sp; setv(s, { sx: 1.35, sy: 1.35 });
  FX.burst(tx, ty, Math.round((10 + lvl * 5) * imp), (70 + lvl * 15) * Math.min(imp, 1.5));
  const p = (6 + lvl * 3) * m.knock * power;
  cC.animate([{ translate: '0 0', rotate: '0deg' }, { translate: `${(dx / n * p).toFixed(1)}px ${(dy / n * p).toFixed(1)}px`, rotate: `${dx > 0 ? 5 : -5}deg`, offset: .2 }, { translate: `${(-dx / n * 3).toFixed(1)}px ${(-dy / n * 3).toFixed(1)}px`, rotate: `${dx > 0 ? -2 : 2}deg`, offset: .55 }, { translate: '0 0', rotate: '0deg' }], { duration: 420, easing: 'ease-out' });
  const amp = (lvl >= 2 ? 2 + lvl * 1.5 : 0) + (imp > 1.6 ? 3 : 0);
  if (amp > 0) FX.shake(table, amp, 260);
  if (power >= 1.25) FX.floatText(tx, ty - 30, '빠르다!');
  await wait(Math.max(320, m.spring[0] * .7));
  if (gen !== G.gen) return;
  /* 가운데 카드가 내 카드 위로 */
  const a = cC.getBoundingClientRect(), b = cM.getBoundingClientRect();
  const mx = b.left + b.width / 2 - (a.left + a.width / 2), my = b.top + b.height / 2 - (a.top + a.height / 2);
  FX.tone(300, .2, 'sine', .07, 900);
  await done(cC.animate([{ transform: 'none' }, { transform: `translate(${mx * .5}px,${my * .5 - 50}px) rotate(14deg) scale(1.05)`, offset: .5 }, { transform: `translate(${mx}px,${my}px) rotate(0deg) scale(1)` }], { duration: 360, easing: 'cubic-bezier(.5,0,.6,1)' }));
  if (gen !== G.gen) return;
  applyRound(G.seat);
  renderAll(); renderCenter(true);
  FX.tone(130, .18, 'sine', .35, 60);
  cM.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.08,.9)' }, { transform: 'scale(.97,1.04)' }, { transform: 'scale(1)' }], { duration: 300, easing: 'ease-out' });
  const [px, py] = center(cM);
  FX.burst(px, py + cM.offsetHeight * .45, 8, 60);
  FX.setOpp(0);
  G.roundStart = performance.now();
}

/* 맞혔지만 상대가 먼저 (또는 연결 문제) */
async function missRace(fl, s, result) {
  const [x, y] = center(fl);
  FX.floatText(x, y - 20, result === 'net' ? '연결이 느려요' : '아깝다!', result === 'net' ? '#6E665A' : '#E24B4A');
  if (G.combo) setCombo(0);
  await done(fl.animate([{ opacity: 1 }, { transform: getComputedStyle(fl).transform + ' translateY(40px) rotate(60deg) scale(.6)', opacity: 0 }], { duration: 280, easing: 'ease-in' }));
  fl.remove(); s.classList.remove('gone');
  s.animate([{ scale: '.4', opacity: 0 }, { scale: '1', opacity: 1 }], { duration: 220, easing: 'ease-out' });
  if (result === 'net') toast('인터넷 연결을 확인해 주세요');
}

/* 틀림: 튕겨 돌아오고 잠깐 잠김 */
async function bounce(fl, s, dx, dy, m) {
  if (G.combo) setCombo(0);
  fl.classList.add('bad');
  FX.tone(m.hit[0], .16, m.hit[1], m.hit[2] * .8, m.hit[3]); FX.tone(170, .3, 'sawtooth', .06, 80, .05);
  const n = Math.hypot(dx, dy) || 1, kb = 5 * m.knock;
  cC.animate([{ translate: '0 0' }, { translate: `${(dx / n * kb).toFixed(1)}px ${(dy / n * kb).toFixed(1)}px`, offset: .25 }, { translate: '0 0' }], { duration: 260, easing: 'ease-out' });
  const [cx, cy] = center(cC);
  FX.ring(cx, cy, '#E24B4A', 70, 280);
  const back = 38 * (m.arc / 50), bd = m.impact > 1.3 ? 460 : m.impact < .8 ? 340 : 400;
  await done(fl.animate([
    { transform: `translate(-50%,-50%) translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px) scale(${(1 + .3 * m.impact).toFixed(2)},${Math.max(.45, 1 - .4 * m.impact).toFixed(2)})` },
    { transform: `translate(-50%,-50%) translate(${(dx * .45).toFixed(1)}px,${(dy * .45 - back).toFixed(1)}px) rotate(${-m.spin * .6}deg) scale(1)`, offset: .5 },
    { transform: `translate(-50%,-50%) rotate(${-m.spin}deg) scale(.95)` }
  ], { duration: bd, easing: 'cubic-bezier(.2,.7,.4,1)', fill: 'forwards' }));
  fl.remove(); s.classList.remove('gone'); s.classList.add('bad');
  s.animate([{ translate: '-12px 0' }, { translate: '9px 2px' }, { translate: '-6px -1px' }, { translate: '3px 0' }, { translate: '0 0' }], { duration: 340, easing: 'ease-out' });
  cM.animate([{ translate: '0 0', rotate: '0deg' }, { translate: '0 8px', rotate: '-4deg' }, { translate: '0 0', rotate: '0deg' }], { duration: 300, easing: 'ease-out' });
  G.locked = true; cM.classList.add('locked');
  const gen = G.gen;
  setTimeout(() => { if (gen !== G.gen) return; G.locked = false; cM.classList.remove('locked'); s.classList.remove('bad'); }, GAME.wrongLockMs);
}

/* ================= 끝 ================= */
function finish() {
  if (G.ended) return;
  G.ended = true; G.playing = false; clearInterval(G.clock);
  const gen = G.gen;
  setTimeout(() => {
    if (gen !== G.gen) return;
    const me = G.scores[G.seat];
    if (G.mode === 'solo') {
      const sec = (performance.now() - G.t0) / 1000;
      const key = `dobble.best.${G.cfg.set}.${G.game.deck.length}`, prev = ls.get(key, 0);
      const rec = !prev || sec < prev; if (rec) ls.set(key, sec);
      $('#rTitle').textContent = rec ? '새 기록! 🎉' : '다 찾았다!';
      $('#rScore').innerHTML = `<div class="win" style="--c:${GAME.colors.a}">걸린 시간<b>${sec.toFixed(1)}초</b></div>`;
      $('#rSub').textContent = `최고 콤보 ${G.best}연속` + (prev && !rec ? ` · 내 최고 기록 ${prev.toFixed(1)}초` : '');
    } else {
      const op = G.scores[G.opp];
      $('#rTitle').textContent = me > op ? '이겼다! 🎉' : me < op ? '아깝다! 다시 한 번?' : '비겼다!';
      $('#rScore').innerHTML = [G.seat, G.opp].map(k => `<div class="${G.scores[k] >= Math.max(me, op) ? 'win' : ''}" style="--c:${GAME.colors[k]}">${esc(seatName(k))}${k === G.seat ? ' (나)' : ''}<b>${G.scores[k]}장</b></div>`).join('');
      $('#rSub').textContent = `내 최고 콤보 ${G.best}연속`;
    }
    $('#result').hidden = false;
    FX.setCombo(0); FX.setOpp(0);
    if (me >= (G.mode === 'solo' ? 0 : G.scores[G.opp])) { const w = innerWidth; for (let i = 0; i < 4; i++) setTimeout(() => FX.burst(rnd(w * .2, w * .8), rnd(80, 260), 22, 140), i * 160); }
  }, 600);
}
$('#again').addEventListener('click', () => {
  fsAuto();
  if (G.mode === 'solo') { make.set = G.cfg.set; make.len = G.cfg.n; startSolo(); return; }
  if (G.cfg && G.cfg.go > DB.now()) return;
  DB.remove(`${roomPath()}/claims`)
    .then(() => DB.update(`${roomPath()}/cfg`, { seed: newSeed(), st: 'play', go: Math.round(DB.now() + (GAME.countdown + .6) * 1000) }))
    .catch(() => toast('다시 시작하지 못했어요'));
});
$('#toHome').addEventListener('click', quitGame);
