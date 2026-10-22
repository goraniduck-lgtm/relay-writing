/* 자리 경매 — 교사 관리 화면 (PC 가로) */
const A = {
  view: 'loading', code: (qp.get('r') || '').toUpperCase(), busy: false,
  rooms: null, cfg: undefined, core: undefined, claims: {}, pres: {}, req: {}, bids: {}, coinlog: null,
  tab: 'run', sel: null, ownerSel: null, force: false, incOwned: false, showAmt: false,
  judging: false, judgeErr: '', nextJudge: 0, msg: ''
};
const L_ = {};
function listen(key, path, cb) {
  if (L_[key] && L_[key].path === path) return;
  if (L_[key]) L_[key].off();
  L_[key] = { path, off: DB.on(path, cb, e => console.warn(path, e)) };
}
function unlisten(key) { if (L_[key]) { L_[key].off(); delete L_[key]; } }
function unlistenAll() { Object.keys(L_).forEach(unlisten); }
const R = () => ROOM(A.code);
const st = () => (A.core && A.core.st) || {};
const ph = () => st().ph || 'idle';
const roster = () => (A.cfg && A.cfg.roster) || {};
const layout = () => (A.cfg && A.cfg.layout) || { rows: 0, cols: 0, seats: {} };
const started = () => !!(A.core && A.core.hist);   // 한 번이라도 입찰을 시작했는지
const nm = sid => sname(A.cfg, sid);
const sno = seat => seatNo(A.cfg, seat);

/* ---------- 시작 ---------- */
(async function boot() {
  connBanner();
  startTicker(st, () => render());
  setInterval(judgeLoop, 150);
  const u = await DB.ready(false).catch(() => null);
  if (u && DB.isTeacher()) { A.code ? openRoom(A.code) : openHome(); }
  else { A.view = 'login'; render(); }
})();

async function login() {
  const pw = $('#pw') && $('#pw').value;
  if (!pw) return;
  A.busy = true; render();
  try { await DB.teacherLogin(pw); A.busy = false; A.code ? openRoom(A.code) : openHome(); }
  catch (e) { A.busy = false; console.warn(e); toast('비밀번호가 맞지 않아요'); render(); }
}
function openHome() {
  unlistenAll();
  A.view = 'home'; A.code = ''; A.cfg = undefined; A.core = undefined;
  history.replaceState(null, '', location.pathname);
  listen('rooms', 'auction/index', v => { A.rooms = v || {}; render(); });
  render();
}
function openRoom(code) {
  unlistenAll();
  A.code = code; A.view = 'room'; A.cfg = undefined; A.core = undefined; A.sel = null; A.ownerSel = null;
  history.replaceState(null, '', '?r=' + code);
  ls.set('auction.adminRoom', code);
  listen('cfg', R() + '/cfg', v => { A.cfg = v; if (v === null) { toast('없는 방이에요'); openHome(); return; } render(); });
  listen('core', R() + '/core', v => { A.core = v; watchBids(); render(); });
  listen('claims', R() + '/claims', v => { A.claims = v || {}; render(); });
  listen('pres', R() + '/pres', v => { A.pres = v || {}; render(); });
  listen('req', R() + '/req', v => { A.req = v || {}; render(); });
  listen('coinlog', R() + '/coinlog', v => { A.coinlog = v || {}; render(); });
  render();
}
function watchBids() {
  const s = st();
  if (s.ph === 'bid' && s.rid) listen('bids', R() + '/bids/' + s.rid, v => { A.bids = v || {}; render(); });
  else { unlisten('bids'); A.bids = {}; }
}

/* ---------- 방 만들기 ---------- */
function parseRoster(text) {
  const out = {}; const errs = [];
  let auto = 0;
  String(text || '').split(/\n/).map(l => l.trim()).filter(Boolean).forEach(line => {
    let m = line.match(/^(\d{1,3})\s*[.,\t )번]*\s*(.*)$/);
    let no, name;
    if (m) { no = +m[1]; name = m[2].trim(); } else { no = ++auto; name = line; }
    auto = Math.max(auto, no);
    if (out['p' + no]) errs.push(no + '번이 두 번 있어요');
    out['p' + no] = { no, name: name.slice(0, 20) };
  });
  return { roster: out, errs };
}
function fitLayout(n) {
  const pairs = 3;
  const rows = Math.max(1, Math.ceil(n / (pairs * 2)));
  const l = AL.defaultLayout(rows, pairs);
  const ids = Object.entries(l.seats).sort(([, a], [, b]) => b.no - a.no).map(([id]) => id);
  for (let i = 0; i < rows * pairs * 2 - n; i++) delete l.seats[ids[i]];
  return AL.renumber(l);
}
async function createRoom() {
  const name = ($('#newName').value || '').trim();
  const { roster: ros, errs } = parseRoster($('#newRoster').value);
  const coins = Math.max(0, Math.floor(+($('#newCoins').value) || 5));
  if (!name) return toast('학급 이름을 넣어 주세요');
  if (errs.length) return toast(errs[0]);
  const n = Object.keys(ros).length;
  if (n < 2) return toast('학생을 2명 이상 넣어 주세요');
  A.busy = true; render();
  try {
    let code;
    for (let i = 0; i < 5; i++) { code = randCode(); if (!(await DB.get('auction/index/' + code))) break; }
    const co = {}; Object.keys(ros).forEach(s => { co[s] = coins; });
    await DB.update('', {
      ['auction/index/' + code]: { name, at: DB.TS },
      [ROOM(code) + '/cfg']: { name, roster: ros, layout: fitLayout(n), display: 'both', dur: 5, initCoins: coins, open: false },
      [ROOM(code) + '/core']: { st: { ph: 'idle', n: 0, dur: 5 }, coins: co }
    });
    A.busy = false;
    openRoom(code);
    A.tab = 'layout';
  } catch (e) { A.busy = false; fail()(e); render(); }
}
async function importClass() {
  try {
    const list = await DB.get('classList');
    const items = Object.entries(list || {}).map(([id, c]) => ({ id, ...c })).sort((a, b) => String(a.name).localeCompare(String(b.name), 'ko', { numeric: true }));
    if (!items.length) return toast('불러올 반 명단이 없어요');
    modal(`<h3>다른 앱의 반 명단 불러오기</h3><div class="col">${items.map(c => `<button class="btn ghost" data-act="importPick" data-id="${esc(c.id)}">${esc(c.name)} <span class="muted small">(${c.count || '?'}명)</span></button>`).join('')}</div>
      <div class="row"><button class="btn ghost" data-act="close">닫기</button></div>`);
  } catch (e) { fail('명단을 불러오지 못했어요')(e); }
}
async function importPick(cid) {
  const c = await DB.get('classes/' + cid).catch(() => null);
  const r = c && c.roster ? (Array.isArray(c.roster) ? c.roster : Object.values(c.roster)).filter(Boolean) : [];
  if (!r.length) return toast('명단이 비어 있어요');
  $('#newRoster').value = r.map(x => x.no + ' ' + (x.name || '')).join('\n');
  if (!$('#newName').value) $('#newName').value = c.name || '';
  closeModal();
}
async function deleteRoom(code) {
  if (!confirm(code + ' 방을 지울까요? 모든 경매 기록이 사라져요.')) return;
  try { await DB.update('', { ['auction/index/' + code]: null, [ROOM(code)]: null }); toast('지웠어요'); }
  catch (e) { fail()(e); }
}

/* ---------- 경매 진행 ---------- */
async function coreTx(fn, failText) {
  let why = null;
  try {
    const r = await DB.tx(R() + '/core', c => { const n = fn(c, m => { why = m; }); return n === null ? undefined : n; });
    if (!r.committed && (why || failText)) toast(why || failText);
    return r.committed;
  } catch (e) { fail()(e); return false; }
}
function pickSeat(id) {
  const s = layout().seats[id];
  if (!s) return;
  if (['assign', 'final'].includes(ph())) { A.sel = id; render(); return; }
  if (ph() === 'bid') return toast('입찰 중에는 바꿀 수 없어요');
  if (s.x) return toast('배정 불가 자리예요');
  const d = A.core.done && A.core.done[id];
  if (d === 'won') return toast(s.no + '번은 이미 ' + nm(A.core.own[id]) + ' 학생이 낙찰받았어요');
  coreTx((c, no) => {
    if (!['idle', 'result', 'ready'].includes(c.st.ph)) return no('지금은 자리를 고를 수 없어요');
    if (c.done && c.done[id] === 'won') return no('이미 낙찰된 자리예요');
    c.st = { ph: 'ready', seat: id, n: c.st.n || 0, dur: A.cfg.dur || 5 };
    return c;
  });
}
function pickRandom(failOnly) {
  const list = AL.auctionCandidates(layout(), A.core, failOnly);
  if (!list.length) return toast(failOnly ? '유찰된 자리가 없어요' : '경매할 자리가 남지 않았어요');
  pickSeat(AL.pickRandom(list));
}
async function startBid() {
  const s = st();
  if (s.ph !== 'ready' || !s.seat) return;
  if (!rosterList(A.cfg).some(r => A.claims[r.id])) { if (!confirm('아직 접속한 학생이 없어요. 그래도 시작할까요?')) return; }
  const dur = Math.min(DUR_MAX, Math.max(DUR_MIN, +A.cfg.dur || 5));
  try {
    await DB.set(R() + '/core/st', { ph: 'bid', rid: DB.key(), seat: s.seat, n: (s.n || 0) + 1, dur, t0: DB.TS });
  } catch (e) { fail()(e); }
}
function cancelRound() {
  const s = st();
  const txt = s.ph === 'bid' ? `${s.n}번째 경매(${sno(s.seat)}번 자리)를 취소할까요?\n이번 라운드는 무효가 되고 코인은 차감하지 않아요.` : '자리 선택을 취소할까요?';
  if (!confirm(txt)) return;
  coreTx((c, no) => AL.cancelRound(c) || no('취소할 수 없어요'));
}
/* 마감 + 여유 시간이 지나면 판정 (교사 화면이 열려 있는 동안 자동) */
async function judgeLoop() {
  const s = st();
  if (A.view !== 'room' || s.ph !== 'bid' || typeof s.t0 !== 'number' || A.judging) return;
  if (DB.now() < s.t0 + s.dur * 1000 + JUDGE_DELAY || Date.now() < A.nextJudge) return;
  A.judging = true; A.judgeErr = ''; render();
  const rid = s.rid;
  try {
    const raw = await DB.get(R() + '/bids/' + rid);
    await DB.tx(R() + '/core', c => AL.applyJudge(c, rid, raw, roster()) || undefined);
  } catch (e) {
    console.warn(e);
    A.judgeErr = '판정을 저장하지 못했어요. 자동으로 다시 시도해요.';
    A.nextJudge = Date.now() + 2000;
  }
  A.judging = false; render();
}
function undoLast() {
  const h = AL.lastJudged(A.core);
  if (!h) return;
  const total = Object.values(h.ded || {}).reduce((a, b) => a + b, 0);
  if (!confirm(`${h.n}번째 경매(${sno(h.seat)}번 자리) 판정을 되돌릴까요?\n\n· ${h.win ? nm(h.win) + ' 학생의 낙찰이 취소돼요' : '유찰 표시가 없어져요'}\n· 차감한 코인을 돌려줘요 (${Object.keys(h.ded || {}).length}명, 모두 ${total}코인)\n· 이 자리는 다시 경매할 수 있어요`)) return;
  coreTx((c, no) => { const r = AL.undoLast(c); return r ? r.core : no('되돌릴 수 없어요'); }).then(ok => { if (ok) toast('되돌렸어요'); });
}
function endAuction() {
  const left = AL.auctionCandidates(layout(), A.core).length;
  if (!confirm(`경매를 끝내고 최종 자리 배정을 시작할까요?${left ? `\n아직 경매하지 않은 자리가 ${left}개 있어요.` : ''}\n(최종 확정 전에는 경매로 돌아올 수 있어요)`)) return;
  coreTx((c, no) => {
    if (!['idle', 'result', 'ready'].includes(c.st.ph)) return no('입찰 중에는 끝낼 수 없어요');
    c.sit = AL.autoSingles(c.own || {}, c.sit || {});
    c.st = { ph: 'assign', n: c.st.n || 0, dur: c.st.dur };
    return c;
  }).then(ok => { if (ok) { A.sel = null; A.tab = 'run'; } });
}
function backToAuction() {
  if (!confirm('경매로 돌아갈까요? 지금까지 배정한 자리는 그대로 남아요.')) return;
  coreTx(c => { c.st = { ph: 'idle', n: c.st.n || 0, dur: c.st.dur }; return c; });
}

/* ---------- 최종 배정 ---------- */
const actx = c => ({ layout: layout(), own: (c || A.core).own || {}, sit: (c || A.core).sit || {}, roster: roster(), sep: A.cfg.sep || {} });
function sitHere(seat, sid, force) {
  if (!sid) return toast('학생을 골라 주세요');
  coreTx((c, no) => {
    if (c.st.ph !== 'assign') return no('배정 단계가 아니에요');
    const why = AL.canSit(actx(c), seat, sid, { force });
    if (why) return no(why);
    c.sit = c.sit || {}; c.sit[seat] = sid;
    return c;
  });
}
function ownerSelf(seat) {
  const owner = A.core.own && A.core.own[seat];
  if (!owner) return;
  coreTx((c, no) => {
    if (c.st.ph !== 'assign') return no('배정 단계가 아니에요');
    c.sit = c.sit || {};
    if (c.sit[seat] && c.sit[seat] !== owner) return no('이 자리에 앉은 학생의 배정을 먼저 취소해 주세요');
    for (const [k, v] of Object.entries(c.sit)) if (v === owner) delete c.sit[k];
    c.sit[seat] = owner;
    return c;
  });
}
function unsit(seat) {
  coreTx((c, no) => { if (c.st.ph !== 'assign') return no('배정 단계가 아니에요'); if (c.sit) delete c.sit[seat]; return c; });
}
function fillRandom() {
  const st0 = AL.assignStats(actx());
  if (st0.seats !== st0.students) return toast('자리 수와 학생 수가 달라서 무작위 배정을 할 수 없어요');
  let res = null;
  coreTx((c, no) => {
    if (c.st.ph !== 'assign') return no('배정 단계가 아니에요');
    res = AL.randomFill(actx(c), { includeOwned: A.incOwned });
    c.sit = res.sit;
    return c;
  }).then(ok => {
    if (!ok || !res) return;
    if (res.left) toast(`빈자리가 모자라 ${res.left}명이 남았어요. '주인이 비워 둔 낙찰 자리도 포함'을 켜거나 직접 배정해 주세요`);
    else if (res.violations) toast(`분리 조건을 모두 지키지 못했어요 (${res.violations}건) — 빨간 ! 자리를 확인해 주세요`);
    else toast('남은 학생을 무작위로 배정했어요');
  });
}
function finalize() {
  const p = AL.finalProblems(actx());
  if (p.length) return toast(p[0]);
  const v = AL.sepViolations(layout(), A.core.sit, A.cfg.sep);
  if (!confirm(`${v.length ? `분리 조건을 어긴 자리가 ${v.length}곳 있어요.\n` : ''}자리 배정을 최종 확정하고 모두에게 공개할까요?`)) return;
  coreTx((c, no) => { if (c.st.ph !== 'assign') return no('배정 단계가 아니에요'); c.st = { ph: 'final', n: c.st.n || 0, dur: c.st.dur, at: Date.now() }; return c; });
}
function unfinalize() {
  if (!confirm('확정을 풀고 배정을 다시 고칠까요?')) return;
  coreTx(c => { c.st = { ph: 'assign', n: c.st.n || 0, dur: c.st.dur }; return c; });
}

/* ---------- 학생·코인 ---------- */
async function setOpen(v) { try { await DB.set(R() + '/cfg/open', v); } catch (e) { fail()(e); } }
async function approveReq(uid) {
  const r = A.req[uid]; if (!r) return;
  const sid = r.s;
  const up = { ['claims/' + sid]: { uid }, ['me/' + uid]: sid, ['req/' + uid]: null };
  const old = A.claims[sid] && A.claims[sid].uid;
  if (old && old !== uid) up['me/' + old] = null;
  for (const [s, c] of Object.entries(A.claims)) if (c && c.uid === uid && s !== sid) { up['claims/' + s] = null; up['pres/' + s] = null; }
  try { await DB.update(R(), up); toast(nm(sid) + ' 학생을 새 기기로 연결했어요'); } catch (e) { fail()(e); }
}
async function rejectReq(uid) { try { await DB.remove(R() + '/req/' + uid); } catch (e) { fail()(e); } }
async function releaseClaim(sid) {
  const c = A.claims[sid]; if (!c) return;
  if (!confirm(nm(sid) + ' 학생의 기기 연결을 풀까요? 학생이 다시 번호를 고를 수 있어요. (코인·낙찰 기록은 그대로)')) return;
  try { await DB.update(R(), { ['claims/' + sid]: null, ['me/' + c.uid]: null, ['pres/' + sid]: null }); } catch (e) { fail()(e); }
}
function coinLocked() { return ph() === 'bid' || A.judging; }
async function coinChange(sid, fnNew, why) {
  if (coinLocked()) return toast('입찰 중에는 코인을 바꿀 수 없어요');
  let before = null, after = null;
  const ok = await coreTx((c, no) => {
    if (c.st.ph === 'bid') return no('입찰 중에는 코인을 바꿀 수 없어요');
    c.coins = c.coins || {};
    before = Number(c.coins[sid]) || 0;
    after = Math.max(0, Math.floor(fnNew(before)));
    if (after === before) return no('');
    c.coins[sid] = after;
    return c;
  });
  if (ok) DB.set(R() + '/coinlog/' + DB.key(), { t: DB.TS, s: sid, from: before, to: after, why }).catch(() => {});
}
async function setAllCoins() {
  const v = Math.floor(+($('#allCoins') && $('#allCoins').value));
  if (!(v >= 0)) return toast('0 이상의 숫자를 넣어 주세요');
  if (coinLocked()) return toast('입찰 중에는 코인을 바꿀 수 없어요');
  if (!confirm(`모든 학생의 코인을 ${v}개로 바꿀까요?`)) return;
  const ok = await coreTx((c, no) => {
    if (c.st.ph === 'bid') return no('입찰 중에는 코인을 바꿀 수 없어요');
    c.coins = {}; Object.keys(roster()).forEach(s => { c.coins[s] = v; });
    return c;
  });
  if (ok) DB.set(R() + '/coinlog/' + DB.key(), { t: DB.TS, s: '*', to: v, why: '전체 설정' }).catch(() => {});
}
async function saveRoster() {
  if (started()) return toast('경매가 시작된 뒤에는 명단을 바꿀 수 없어요 (이름 고치기만 가능)');
  const { roster: ros, errs } = parseRoster($('#rosterText').value);
  if (errs.length) return toast(errs[0]);
  if (Object.keys(ros).length < 2) return toast('학생을 2명 이상 넣어 주세요');
  const init = A.cfg.initCoins != null ? A.cfg.initCoins : 5;
  const up = { 'cfg/roster': ros };
  for (const sid of Object.keys(roster())) if (!ros[sid]) {
    up['core/coins/' + sid] = null;
    const c = A.claims[sid]; if (c) { up['claims/' + sid] = null; up['me/' + c.uid] = null; up['pres/' + sid] = null; }
  }
  for (const sid of Object.keys(ros)) if (!roster()[sid]) up['core/coins/' + sid] = init;
  try { await DB.update(R(), up); toast('명단을 저장했어요'); } catch (e) { fail()(e); }
}
async function renameStudent(sid) {
  const r = roster()[sid];
  const v = prompt(r.no + '번 학생 이름', r.name || '');
  if (v == null) return;
  try { await DB.set(R() + '/cfg/roster/' + sid + '/name', v.trim().slice(0, 20)); } catch (e) { fail()(e); }
}

/* ---------- 자리 배치 ---------- */
function layoutLocked() { return started() || ph() !== 'idle'; }
async function saveLayout(l) {
  if (layoutLocked()) return toast('경매가 시작된 뒤에는 배치를 바꿀 수 없어요');
  try { await DB.set(R() + '/cfg/layout', AL.renumber(l)); } catch (e) { fail()(e); }
}
function cellClick(r, c) {
  const l = JSON.parse(JSON.stringify(layout()));
  l.seats = l.seats || {};
  const id = Object.keys(l.seats).find(k => l.seats[k].r === r && l.seats[k].c === c);
  if (!id) { const n = Math.max(0, ...Object.keys(l.seats).map(k => +k.slice(1) || 0)) + 1; l.seats['s' + n] = { r, c, no: 0 }; }
  else if (!l.seats[id].x) l.seats[id].x = true;
  else delete l.seats[id];
  saveLayout(l);
}
function resizeLayout() {
  const rows = Math.min(10, Math.max(1, Math.floor(+$('#lRows').value)));
  const cols = Math.min(12, Math.max(1, Math.floor(+$('#lCols').value)));
  const l = JSON.parse(JSON.stringify(layout()));
  l.rows = rows; l.cols = cols;
  for (const [k, s] of Object.entries(l.seats || {})) if (s.r >= rows || s.c >= cols) delete l.seats[k];
  saveLayout(l);
}
function presetLayout(kind) {
  const n = rosterList(A.cfg).length;
  if (kind === 'fit') return saveLayout(fitLayout(n));
  if (kind === 'single') {
    const cols = 6, rows = Math.ceil(n / cols);
    const seats = {}; let k = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols && k < n; c++) { k++; seats['s' + k] = { r, c, no: k }; }
    return saveLayout({ rows, cols, seats });
  }
}
async function addSep() {
  const a = $('#sepA').value, b = $('#sepB').value;
  if (!a || !b || a === b) return toast('서로 다른 두 학생을 골라 주세요');
  try { await DB.set(R() + '/cfg/sep/' + DB.key(), { a, b }); } catch (e) { fail()(e); }
}
async function delSep(k) { try { await DB.remove(R() + '/cfg/sep/' + k); } catch (e) { fail()(e); } }

/* ---------- 설정 ---------- */
async function saveSetting(key, val) {
  try { await DB.set(R() + '/cfg/' + key, val); } catch (e) { fail()(e); }
}
async function resetAll() {
  const v = prompt('경매 기록·코인·낙찰·배정을 모두 처음으로 돌려요. 학생 연결은 그대로예요.\n계속하려면 "초기화"라고 입력하세요.');
  if (v !== '초기화') return;
  const init = A.cfg.initCoins != null ? A.cfg.initCoins : 5;
  const co = {}; Object.keys(roster()).forEach(s => { co[s] = init; });
  try {
    await DB.update(R(), { core: { st: { ph: 'idle', n: 0, dur: A.cfg.dur || 5 }, coins: co }, bids: null });
    DB.set(R() + '/coinlog/' + DB.key(), { t: DB.TS, s: '*', to: init, why: '전체 초기화' }).catch(() => {});
    toast('초기화했어요');
  } catch (e) { fail()(e); }
}

/* ---------- 내보내기 ---------- */
function csv(name, rows) {
  const text = '﻿' + rows.map(r => r.map(x => { const s = String(x == null ? '' : x); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(',')).join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  a.download = name; document.body.appendChild(a); a.click(); a.remove();
}
const dateTag = () => new Date().toISOString().slice(0, 10);
function exportRounds() {
  const rows = [['라운드', '자리', '결과', '낙찰 학생', '낙찰 금액', '번호', '이름', '입찰 금액(차감)']];
  for (const h of histList()) {
    const res = h.status === 'cancel' ? '취소' : h.status === 'undone' ? '되돌림' : h.win ? '낙찰' : '유찰';
    const ded = Object.entries(h.ded || {});
    if (!ded.length) rows.push([h.n, sno(h.seat), res, h.win ? nm(h.win) : '', h.amt || '', '', '', '']);
    for (const [sid, a] of ded.sort((x, y) => (roster()[x[0]] || {}).no - (roster()[y[0]] || {}).no)) rows.push([h.n, sno(h.seat), res, h.win ? nm(h.win) : '', h.amt || '', (roster()[sid] || {}).no, (roster()[sid] || {}).name, a]);
  }
  csv(`자리경매_기록_${A.cfg.name}_${dateTag()}.csv`, rows);
}
function exportFinal() {
  const sit = A.core.sit || {}, own = A.core.own || {};
  const rows = [['자리', '앉는 학생 번호', '앉는 학생 이름', '낙찰 학생(소유)', '남은 코인']];
  for (const s of AL.usableSeats(layout())) {
    const sid = sit[s.id];
    rows.push([s.no, sid ? roster()[sid].no : '', sid ? roster()[sid].name : '', own[s.id] ? nm(own[s.id]) : '', sid ? (A.core.coins || {})[sid] : '']);
  }
  csv(`자리경매_최종배치_${A.cfg.name}_${dateTag()}.csv`, rows);
}
function exportCoins() {
  const own = AL.ownedBy(A.core.own);
  const rows = [['번호', '이름', '남은 코인', '낙찰 자리']].concat(rosterList(A.cfg).map(r => [r.no, r.name, (A.core.coins || {})[r.id] || 0, (own[r.id] || []).map(sno).join(' ')]));
  csv(`자리경매_코인_${A.cfg.name}_${dateTag()}.csv`, rows);
}
const histList = () => Object.values((A.core && A.core.hist) || {}).sort((a, b) => a.n - b.n);

/* ---------- 화면 ---------- */
function render() {
  document.body.className = 'adm';
  paint($('#top'), topBar());
  paint($('#main'), body());
}
function topBar() {
  if (A.view !== 'room' || !A.cfg) return `<div class="top"><span class="title">🪙 자리 경매 · 선생님</span><span class="grow"></span>${A.view !== 'login' && A.view !== 'loading' ? '<button class="btn sm ghost" data-act="logout">로그아웃</button>' : ''}</div>`;
  const nreq = Object.keys(A.req).length;
  const online = rosterList(A.cfg).filter(r => isOnline(A.pres, A.claims, r.id)).length;
  const tabs = [['run', ['assign', 'final'].includes(ph()) ? '🪑 자리 배정' : '🔨 경매 진행'], ['students', '👥 학생·코인'], ['layout', '🗺️ 자리 배치'], ['log', '📜 기록'], ['settings', '⚙️ 설정']];
  return `<div class="top"><button class="btn sm ghost" data-act="home">← 방 목록</button><span class="title">🪙 ${esc(A.cfg.name)}</span>
    <span class="pill">참여 코드 <b style="font-size:1.1rem;letter-spacing:.1em">${A.code}</b></span>
    <span class="pill">${esc(PH_NAME[ph()] || '')}</span><span class="pill"><span class="dot on"></span> 접속 ${online}/${rosterList(A.cfg).length}</span>
    <span class="grow"></span>
    <button class="btn sm gold" data-act="links">📱 학생 QR · 📺 TV</button></div>
    <div class="tabs">${tabs.map(([k, t]) => `<button class="tab ${A.tab === k ? 'on' : ''}" data-act="tab" data-id="${k}">${t}${k === 'students' && nreq ? ` <span class="badge">${nreq}</span>` : ''}</button>`).join('')}</div>
    ${nreq ? reqBar() : ''}`;
}
function reqBar() {
  return `<div class="reqbar">${Object.entries(A.req).map(([uid, r]) => `<div class="req">🔄 <b>${esc(nm(r.s))}</b> 학생이 새 기기로 바꿔 달라고 해요 ${A.claims[r.s] ? '(지금 다른 기기에 연결됨)' : ''}
    <button class="btn sm good" data-act="approve" data-id="${uid}">승인</button><button class="btn sm ghost" data-act="reject" data-id="${uid}">거절</button></div>`).join('')}</div>`;
}
function body() {
  if (A.view === 'loading') return `<div class="card center muted">불러오는 중…</div>`;
  if (A.view === 'login') return `<div class="card login"><h2>선생님 로그인</h2><p class="muted small">교사 계정 비밀번호를 넣어 주세요.</p>
    <input id="pw" type="password" class="in" placeholder="비밀번호" autocomplete="current-password"><button class="btn big wide" style="margin-top:12px" data-act="login" ${A.busy ? 'disabled' : ''}>로그인</button></div>`;
  if (A.view === 'home') return homeView();
  if (!A.cfg || !A.core) return `<div class="card center muted">불러오는 중…</div>`;
  switch (A.tab) {
    case 'students': return studentsView();
    case 'layout': return layoutView();
    case 'log': return logView();
    case 'settings': return settingsView();
    default: return ['assign', 'final'].includes(ph()) ? assignView() : runView();
  }
}
function homeView() {
  const rooms = Object.entries(A.rooms || {}).sort((a, b) => (b[1].at || 0) - (a[1].at || 0));
  return `<div class="adm-2"><div class="card"><h3>내 경매 방</h3>${A.rooms == null ? '<p class="muted">불러오는 중…</p>' : rooms.length ? `<div class="col">${rooms.map(([code, r]) => `<div class="room-row"><button class="btn ghost grow" data-act="open" data-id="${code}" style="justify-content:flex-start"><b>${esc(r.name)}</b><span class="muted small">&nbsp;· ${code}${r.at ? ' · ' + new Date(r.at).toLocaleDateString('ko-KR') : ''}</span></button><button class="btn sm ghost" data-act="delRoom" data-id="${code}">지우기</button></div>`).join('')}</div>` : '<p class="muted">아직 방이 없어요. 오른쪽에서 만들어 주세요.</p>'}</div>
    <div class="card"><h3>새 경매 방 만들기</h3>
      <label class="small muted">학급 이름</label><input id="newName" class="in" placeholder="예: 4학년 1반">
      <div class="row" style="margin-top:10px"><label class="small muted grow">학생 명단 (한 줄에 한 명: <b>번호 이름</b>)</label><button class="btn sm ghost" data-act="importClass">다른 앱 반 명단 불러오기</button></div>
      <textarea id="newRoster" class="in" rows="10" placeholder="1 김하늘&#10;2 이바다&#10;3 박나무"></textarea>
      <div class="row" style="margin-top:10px"><label class="small muted">처음 코인</label><input id="newCoins" class="in" type="number" min="0" value="5" style="width:90px"></div>
      <p class="small muted">자리 배치는 학생 수에 맞춰 짝 책상(한 줄 3짝)으로 만들어져요. 만든 뒤 고칠 수 있어요.</p>
      <button class="btn gold big wide" data-act="createRoom" ${A.busy ? 'disabled' : ''}>방 만들기</button></div></div>`;
}
function warnings() {
  const w = [];
  const seats = AL.usableSeats(layout()).length, n = rosterList(A.cfg).length;
  if (seats !== n) w.push(`자리 ${seats}개, 학생 ${n}명 — 수가 달라요. 최종 무작위 배정이 막혀요. <button class="link" data-act="tab" data-id="layout">자리 배치 고치기</button>`);
  if (A.cfg.open !== true && !started()) w.push(`학생 입장이 닫혀 있어요. <button class="btn sm good" data-act="open1">입장 열기</button>`);
  return w.length ? `<div class="warn-box">${w.map(x => `<div>⚠️ ${x}</div>`).join('')}</div>` : '';
}
function runView() {
  const s = st();
  const own = A.core.own || {};
  const map = seatMap({ cfg: A.cfg, hl: ['ready', 'bid'].includes(s.ph) ? s.seat : null, click: 'seat', size: 'm',
    cls: id => { const d = A.core.done && A.core.done[id]; return d === 'won' ? 'won' : d === 'fail' ? 'fail' : ''; },
    label: (id, x) => `<b class="no">${x.no}</b>${own[id] ? `<span class="nm">${esc(nm(own[id]))}</span>` : A.core.done && A.core.done[id] === 'fail' ? '<span class="tag">유찰</span>' : x.x ? '<span class="tag">배정 불가</span>' : ''}` });
  const left = AL.auctionCandidates(layout(), A.core).length, fails = AL.auctionCandidates(layout(), A.core, true).length;
  return `${warnings()}<div class="adm-run">
    <div class="card"><div class="row"><h3 class="grow">교실 배치도</h3><span class="legend"><i class="lg won"></i>낙찰 <i class="lg fail"></i>유찰 <i class="lg"></i>미경매 · 남은 자리 ${left} · 유찰 ${fails}</span></div>
      ${map}<p class="small muted center">${['idle', 'result', 'ready'].includes(s.ph) ? '자리를 누르면 다음 경매 자리로 정해져요' : ''}</p></div>
    <div class="col">${controlCard()}${studentStatus()}</div></div>`;
}
function controlCard() {
  const s = st();
  const left = AL.auctionCandidates(layout(), A.core).length, fails = AL.auctionCandidates(layout(), A.core, true).length;
  const lastJ = AL.lastJudged(A.core);
  const undoBtn = lastJ ? `<button class="btn ghost sm" data-act="undo">↩ ${lastJ.n}번째(${sno(lastJ.seat)}번 자리) 판정 되돌리기</button>` : '';
  const pickBtns = `<div class="row"><button class="btn info" data-act="random" ${left ? '' : 'disabled'}>🎲 무작위 자리 (${left})</button><button class="btn ghost" data-act="randomFail" ${fails ? '' : 'disabled'}>🎲 유찰 자리 재경매 (${fails})</button></div>`;
  const endBtn = `<button class="btn purple" data-act="endAuction">🏁 경매 종료 → 최종 자리 배정</button>`;
  if (s.ph === 'ready') {
    const dur = A.cfg.dur || 5;
    return `<div class="card ctl"><div class="muted">다음 경매 자리</div><div class="seat-big">${sno(s.seat)}번</div>
      <div class="row" style="margin:10px 0"><label class="small muted">입찰 시간</label>
      <select id="durSel" class="in" style="width:110px" data-change="dur">${Array.from({ length: DUR_MAX - DUR_MIN + 1 }, (_, i) => DUR_MIN + i).map(v => `<option value="${v}" ${v === dur ? 'selected' : ''}>${v}초</option>`).join('')}</select></div>
      <button class="btn gold big wide" data-act="start">▶ 경매 시작 (${dur}초)</button>
      <div class="row" style="margin-top:10px"><button class="btn ghost sm" data-act="cancel">선택 취소</button><span class="grow"></span><span class="small muted">다른 자리를 누르면 바뀌어요</span></div></div>`;
  }
  if (s.ph === 'bid') {
    const ms = remaining(s);
    const nResp = Object.keys(A.bids || {}).length;
    return `<div class="card ctl live"><div class="row"><div class="grow"><div class="muted">${s.n}번째 경매 · ${sno(s.seat)}번 자리</div>
        <div class="small muted">응답 ${nResp}명 / 접속 ${rosterList(A.cfg).filter(r => isOnline(A.pres, A.claims, r.id)).length}명</div></div>
        <div class="count" data-count style="font-size:3.4rem">${ms == null ? '' : Math.ceil(ms / 1000)}</div></div>
      <div class="bar"><i data-bar></i></div>
      ${ms === 0 ? `<p class="center"><b>${A.judgeErr ? '⚠️ ' + esc(A.judgeErr) : '⏳ 마감! 판정하는 중…'}</b></p>` : '<p class="small muted">입찰 금액은 마감 뒤에 공개돼요.</p>'}
      <div class="row"><button class="btn bad sm" data-act="cancel">경매 취소</button></div></div>`;
  }
  let res = '';
  if (s.ph === 'result' && A.core.last && A.core.last.rid === s.rid) {
    const L = A.core.last;
    const keys = Object.keys(L.hist || {}).map(k => +k.slice(1)).sort((a, b) => b - a);
    const byAmt = {};
    for (const [sid, a] of Object.entries(L.ded || {})) (byAmt[a] = byAmt[a] || []).push(nm(sid));
    res = `<div class="res-box ${L.win ? 'ok' : 'no'}"><div class="small muted">${L.n}번째 경매 · ${sno(L.seat)}번 자리</div>
      <div class="res-line">${L.win ? `🔨 <b>${esc(nm(L.win))}</b> 낙찰 · ${L.amt}코인` : '😮 유찰'}</div>
      ${keys.length ? `<table class="t small">${keys.map(a => `<tr><td class="num" style="width:70px"><b>${a}코인</b></td><td>${(byAmt[a] || []).map(esc).join(', ')}</td><td>${L.hist['a' + a] > 1 ? '<span class="pill bad">같은 금액 제외</span>' : a === L.amt && L.win ? '<span class="pill good">낙찰</span>' : ''}</td></tr>`).join('')}</table>` : '<p class="muted small">아무도 입찰하지 않았어요</p>'}
      <p class="small muted">참여 ${L.cnt || 0}명 · 입찰한 코인은 낙찰 여부와 관계없이 모두 차감했어요</p></div>`;
  }
  return `<div class="card ctl">${res}<h3>${s.ph === 'result' ? '다음 경매' : '경매 자리 고르기'}</h3>${pickBtns}<p class="small muted">또는 배치도에서 자리를 눌러요</p>
    <div class="row" style="margin-top:6px">${undoBtn}</div><hr class="sep">${endBtn}</div>`;
}
function studentStatus() {
  const s = st();
  const own = AL.ownedBy(A.core.own);
  const coins = A.core.coins || {};
  return `<div class="card"><div class="row"><h3 class="grow">학생 현황</h3>${s.ph === 'bid' ? '<span class="small muted">✓ = 입찰함</span>' : ''}</div>
    <div class="stu-grid" data-keep-scroll="sg">${rosterList(A.cfg).map(r => {
      const on = !!isOnline(A.pres, A.claims, r.id), linked = !!A.claims[r.id];
      const b = A.bids && A.bids[r.id];
      return `<div class="sg ${on ? '' : 'off'}"><span class="dot ${on ? 'on' : ''}" title="${on ? '접속 중' : linked ? '연결됨 (오프라인)' : '미접속'}"></span><span class="nm">${esc(nm(r.id))}</span>
        ${(own[r.id] || []).length ? `<span class="pill purple">🪑${own[r.id].map(sno).join(',')}</span>` : ''}<span class="grow"></span>
        ${s.ph === 'bid' ? `<span class="resp ${b ? 'y' : ''}">${b ? '✓' : '·'}</span>` : ''}<span class="cv"><span class="coin">¢</span>${coins[r.id] || 0}</span></div>`;
    }).join('')}</div></div>`;
}
function assignView() {
  const ctx = actx();
  const S2 = AL.assignStats(ctx);
  const sit = A.core.sit || {}, own = A.core.own || {};
  const viol = AL.sepViolations(layout(), sit, A.cfg.sep);
  const vSeats = new Set(viol.flatMap(v => [v.sa, v.sb]));
  const final = ph() === 'final';
  const map = seatMap({ cfg: A.cfg, click: final ? null : 'seat', size: 'l',
    cls: id => [sit[id] ? 'sat' : own[id] ? 'ownedfree' : '', A.sel === id ? 'sel' : '', A.ownerSel && own[id] === A.ownerSel ? 'ownerhl' : '', vSeats.has(id) ? 'warn' : ''].join(' '),
    label: (id, x) => `<b class="no">${x.no}</b>${sit[id] ? `<span class="nm">${esc(nm(sit[id]))}</span>` : x.x ? '<span class="tag">배정 불가</span>' : ''}${own[id] && own[id] !== sit[id] ? `<span class="tag">👑${esc(nm(own[id]))}</span>` : ''}` });
  const stats = `<div class="row stats"><span class="pill">전체 학생 ${S2.students}</span><span class="pill good">자리 확정 ${S2.seated}</span><span class="pill bad">미배정 ${S2.unseated.length}</span><span class="pill info">남은 자리 ${S2.freeSeats.length}</span>
    ${viol.length ? `<span class="pill bad">분리 조건 위반 ${viol.length}</span>` : ''}</div>`;
  if (final) return `${stats}<div class="card final-card"><div class="row noprint"><h3 class="grow">🎉 자리 배정 완료 (확정됨)</h3>
      <button class="btn ghost" data-act="unfinal">배정 고치기</button><button class="btn ghost" data-act="print">🖨 인쇄</button><button class="btn ghost" data-act="csvFinal">CSV</button></div>
      <h2 class="print-only center">${esc(A.cfg.name)} 자리 배치</h2>${map}</div>`;
  return `${stats}${seatCountWarn(S2)}<div class="adm-assign"><div class="card">${map}<p class="small muted center">자리를 눌러 배정해요 · 👑 = 낙찰받은 학생(소유자) · 점선 = 소유자가 아직 배정하지 않은 낙찰 자리</p></div>
    <div class="col">${seatPanel(ctx)}${ownersPanel(ctx)}${unseatedPanel(S2)}
    <div class="card"><h3>마무리</h3>
      <label class="chk small"><input type="checkbox" id="incOwned" data-change="incOwned" ${A.incOwned ? 'checked' : ''}> 주인이 비워 둔 낙찰 자리도 무작위 배정에 포함</label>
      <div class="row" style="margin-top:8px"><button class="btn info" data-act="fill" ${S2.seats !== S2.students || !S2.unseated.length ? 'disabled' : ''}>🎲 남은 학생 무작위 배정</button></div>
      ${S2.seats !== S2.students ? '<p class="small" style="color:var(--bad)">자리 수와 학생 수가 달라 무작위 배정을 쓸 수 없어요. 직접 배정해 주세요.</p>' : ''}
      <hr class="sep"><div class="row"><button class="btn ghost" data-act="back">↩ 경매로 돌아가기</button><span class="grow"></span><button class="btn good" data-act="finalize" ${S2.unseated.length ? 'disabled' : ''}>✅ 최종 확정</button></div>
      ${S2.unseated.length ? `<p class="small muted">${S2.unseated.length}명이 더 배정되어야 확정할 수 있어요</p>` : ''}</div></div></div>`;
}
function seatCountWarn(S2) {
  return S2.seats !== S2.students ? `<div class="warn-box">⚠️ 사용할 수 있는 자리 ${S2.seats}개, 학생 ${S2.students}명 — 수가 달라요.</div>` : '';
}
function seatPanel(ctx) {
  if (!A.sel || !layout().seats[A.sel]) return `<div class="card"><h3>자리 배정</h3><p class="muted">배치도에서 자리를 눌러요.</p></div>`;
  const id = A.sel, seat = layout().seats[id];
  const own = A.core.own || {}, sit = A.core.sit || {};
  const owner = own[id], sitter = sit[id];
  const S2 = AL.assignStats(ctx);
  const ownedMap = AL.ownedBy(own);
  if (seat.x) return `<div class="card"><h3>${seat.no}번 자리</h3><p class="muted">배정 불가 자리예요.</p></div>`;
  const cands = (A.force ? S2.unseated : S2.unseated.filter(s => !ownedMap[s] || (owner && owner === s)))
    .filter(s => !(owner && s === owner))
    .map(s => ({ id: s, ...roster()[s] })).sort((a, b) => a.no - b.no);
  const ownerSeated = owner ? AL.seatOf(sit, owner) : null;
  return `<div class="card seat-panel"><div class="row"><h3 class="grow">${seat.no}번 자리</h3><button class="btn sm ghost" data-act="unsel">닫기</button></div>
    <table class="t"><tr><th>낙찰(소유)</th><td>${owner ? `👑 <b>${esc(nm(owner))}</b> <span class="small muted">(낙찰 자리 ${ownedMap[owner].map(sno).join(', ')}번)</span>` : `<span class="muted">${A.core.done && A.core.done[id] === 'fail' ? '유찰된 자리' : '경매하지 않은 자리'}</span>`}</td></tr>
      <tr><th>앉는 학생</th><td>${sitter ? `<b>${esc(nm(sitter))}</b>` : '<span class="muted">비어 있음</span>'}</td></tr></table>
    <div class="col" style="margin-top:10px">
      ${owner && !sitter ? `<button class="btn purple" data-act="self">👑 ${esc(nm(owner))} 본인 자리로 지정${ownerSeated ? ` (${sno(ownerSeated)}번에서 옮김)` : ''}</button>` : ''}
      ${!sitter ? `<div class="row"><select id="candSel" class="in grow"><option value="">${owner ? '미낙찰 학생 고르기' : '학생 고르기'} (${cands.length}명)</option>${cands.map(c => `<option value="${c.id}">${esc(nm(c.id))}${ownedMap[c.id] ? ' (낙찰 학생)' : ''}</option>`).join('')}</select>
        <button class="btn" data-act="sit">${owner ? '배정' : '앉히기'}</button></div>
        <label class="chk small"><input type="checkbox" id="forceChk" data-change="force" ${A.force ? 'checked' : ''}> 선생님 조정 (낙찰 학생도 목록에 보이기)</label>` : `<button class="btn ghost" data-act="unsit">배정 취소</button>`}
      ${owner ? `<p class="small muted">${owner && sitter && sitter !== owner ? '소유자가 고른 학생이 앉아 있어요. 바꾸려면 배정을 취소한 뒤 다시 골라요.' : '소유 학생에게 이 자리에 앉을 미낙찰 학생을 물어보고 골라요.'}</p>` : ''}
    </div></div>`;
}
function ownersPanel(ctx) {
  const m = AL.ownedBy(A.core.own);
  const sit = A.core.sit || {};
  const list = Object.entries(m).sort((a, b) => b[1].length - a[1].length || (roster()[a[0]] || {}).no - (roster()[b[0]] || {}).no);
  if (!list.length) return `<div class="card"><h3>낙찰 학생</h3><p class="muted">낙찰받은 학생이 없어요.</p></div>`;
  return `<div class="card"><h3>낙찰 학생 (소유 자리)</h3><div class="col owners" data-keep-scroll="ow">${list.map(([sid, seats]) => {
    const mine = AL.seatOf(sit, sid);
    return `<button class="owner ${A.ownerSel === sid ? 'on' : ''} ${seats.length > 1 ? 'multi' : ''}" data-act="ownerSel" data-id="${sid}">
      <b>${esc(nm(sid))}</b> <span class="small muted">${seats.length}자리</span> ${mine ? `<span class="pill good">본인 ${sno(mine)}번</span>` : '<span class="pill bad">본인 자리 미정</span>'}
      <span class="small">${seats.sort((a, b) => sno(a) - sno(b)).map(x => `${sno(x)}번→${sit[x] ? esc(nm(sit[x])) : '<i>비어 있음</i>'}`).join(' · ')}</span></button>`;
  }).join('')}</div></div>`;
}
function unseatedPanel(S2) {
  const m = AL.ownedBy(A.core.own);
  const losers = S2.unseated.filter(s => !m[s]);
  const owners = S2.unseated.filter(s => m[s]);
  return `<div class="card"><h3>아직 자리 없는 학생 (${S2.unseated.length})</h3>
    ${owners.length ? `<div class="small muted">낙찰 학생</div><div class="chips">${owners.map(s => `<span class="pill purple">${esc(nm(s))}</span>`).join('')}</div>` : ''}
    <div class="small muted">미낙찰 학생</div><div class="chips">${losers.length ? losers.map(s => `<span class="pill">${esc(nm(s))}</span>`).join('') : '<span class="muted small">없음</span>'}</div></div>`;
}
function studentsView() {
  const own = AL.ownedBy(A.core.own);
  const coins = A.core.coins || {};
  const lock = coinLocked();
  return `<div class="adm-2"><div class="card"><div class="row"><h3 class="grow">학생 · 코인</h3>
      <label class="chk"><input type="checkbox" id="openChk" data-change="open" ${A.cfg.open === true ? 'checked' : ''}> 학생 입장 허용</label></div>
      ${lock ? '<p class="warn-box">입찰 중에는 코인을 바꿀 수 없어요</p>' : ''}
      <table class="t"><tr><th>번호</th><th>이름</th><th>기기 연결</th><th class="num">코인</th><th>코인 바꾸기</th><th>낙찰 자리</th><th></th></tr>
      ${rosterList(A.cfg).map(r => {
        const c = A.claims[r.id], on = !!isOnline(A.pres, A.claims, r.id);
        return `<tr><td>${esc(r.no)}</td><td><button class="link" data-act="rename" data-id="${r.id}">${esc(r.name || '(이름 없음)')}</button></td>
          <td>${c ? (on ? '<span class="dot on"></span> 접속 중' : '<span class="dot"></span> 연결됨 (오프라인)') : '<span class="muted">미접속</span>'}</td>
          <td class="num"><b class="coins-n">${coins[r.id] || 0}</b></td>
          <td><div class="row" style="gap:4px"><button class="btn sm ghost" data-act="coin" data-id="${r.id}" data-d="-1" ${lock ? 'disabled' : ''}>−1</button><button class="btn sm ghost" data-act="coin" data-id="${r.id}" data-d="1" ${lock ? 'disabled' : ''}>+1</button><button class="btn sm ghost" data-act="coinReset" data-id="${r.id}" ${lock ? 'disabled' : ''}>처음(${A.cfg.initCoins != null ? A.cfg.initCoins : 5})</button></div></td>
          <td>${(own[r.id] || []).map(x => `<span class="pill purple">${sno(x)}번</span>`).join(' ')}</td>
          <td>${c ? `<button class="btn sm ghost" data-act="release" data-id="${r.id}">연결 해제</button>` : ''}</td></tr>`;
      }).join('')}</table></div>
    <div class="col"><div class="card"><h3>전체 코인 설정</h3><div class="row"><input id="allCoins" class="in" type="number" min="0" value="${A.cfg.initCoins != null ? A.cfg.initCoins : 5}" style="width:100px"><button class="btn" data-act="allCoins" ${lock ? 'disabled' : ''}>모든 학생에게 적용</button></div></div>
      <div class="card"><h3>명단 고치기</h3>${started() ? '<p class="small muted">경매가 시작된 뒤에는 학생을 더하거나 뺄 수 없어요. 이름은 표에서 눌러 고칠 수 있어요.</p>' : `<p class="small muted">한 줄에 한 명: 번호 이름</p>
        <textarea id="rosterText" class="in" rows="10">${esc(rosterList(A.cfg).map(r => r.no + ' ' + (r.name || '')).join('\n'))}</textarea><button class="btn" style="margin-top:8px" data-act="saveRoster">명단 저장</button>`}</div>
      <div class="card"><h3>기기 연결 도움말</h3><p class="small muted">학생이 기기를 바꾸면 새 기기에서 번호를 눌러 요청해요. 위쪽에 요청이 뜨면 승인하세요. 잘못 고른 번호는 '연결 해제' 하면 다시 고를 수 있어요.</p></div></div></div>`;
}
function layoutView() {
  const l = layout();
  const lock = layoutLocked();
  const at = {};
  for (const [id, s] of Object.entries(l.seats || {})) at[s.r + ',' + s.c] = { id, ...s };
  let cells = '';
  for (let r = 0; r < l.rows; r++) for (let c = 0; c < l.cols; c++) {
    const s = at[r + ',' + c];
    cells += `<button class="ed ${s ? (s.x ? 'x' : 'on') : ''}" data-act="cell" data-r="${r}" data-c="${c}" ${lock ? 'disabled' : ''}>${s ? (s.x ? '✕' : s.no) : ''}</button>`;
  }
  const n = rosterList(A.cfg).length, seats = AL.usableSeats(l).length;
  const sep = Object.entries(A.cfg.sep || {});
  const opts = rosterList(A.cfg).map(r => `<option value="${r.id}">${esc(nm(r.id))}</option>`).join('');
  return `<div class="adm-2"><div class="card"><h3>교실 자리 배치</h3>
      ${lock ? '<p class="warn-box">경매가 시작된 뒤에는 배치를 바꿀 수 없어요 (기록이 꼬이지 않도록). 설정 탭의 전체 초기화 뒤에 바꿀 수 있어요.</p>' : '<p class="small muted">칸을 누를 때마다 <b>빈칸(통로) → 자리 → 배정 불가 자리(✕)</b> 로 바뀌어요. 번호는 왼쪽 위부터 자동으로 매겨져요.</p>'}
      <div class="row ${seats === n ? '' : 'bad-text'}" style="margin:6px 0"><b>사용할 자리 ${seats}개 · 학생 ${n}명</b>${seats === n ? ' ✅' : ' — 수를 맞춰 주세요'}</div>
      <div class="board-ed">칠판 · 교탁</div>
      <div class="ed-grid" style="grid-template-columns:repeat(${l.cols},1fr)">${cells}</div>
      <div class="row" style="margin-top:12px"><label class="small">줄</label><input id="lRows" class="in" type="number" min="1" max="10" value="${l.rows}" style="width:70px" ${lock ? 'disabled' : ''}>
        <label class="small">칸</label><input id="lCols" class="in" type="number" min="1" max="12" value="${l.cols}" style="width:70px" ${lock ? 'disabled' : ''}>
        <button class="btn sm ghost" data-act="resize" ${lock ? 'disabled' : ''}>크기 적용</button></div>
      <div class="row" style="margin-top:8px"><button class="btn sm ghost" data-act="preset" data-id="fit" ${lock ? 'disabled' : ''}>학생 수에 맞춘 짝 책상</button><button class="btn sm ghost" data-act="preset" data-id="single" ${lock ? 'disabled' : ''}>한 줄 6명 개별 책상</button></div></div>
    <div class="col"><div class="card"><h3>떨어져 앉아야 하는 학생</h3><p class="small muted">무작위 배정에서 앞뒤·옆·대각선으로 붙지 않게 해요. 직접 배정할 때는 붙으면 빨간 ! 로 알려 줘요.</p>
      <div class="row"><select id="sepA" class="in grow"><option value="">학생 1</option>${opts}</select><select id="sepB" class="in grow"><option value="">학생 2</option>${opts}</select><button class="btn" data-act="addSep">추가</button></div>
      <div class="col" style="margin-top:10px">${sep.length ? sep.map(([k, p]) => `<div class="row"><span class="grow">${esc(nm(p.a))} ↔ ${esc(nm(p.b))}</span><button class="btn sm ghost" data-act="delSep" data-id="${k}">빼기</button></div>`).join('') : '<span class="muted small">없음</span>'}</div></div>
      <div class="card"><h3>미리 보기</h3>${seatMap({ cfg: A.cfg, size: 's' })}</div></div></div>`;
}
function logView() {
  const list = histList().slice().reverse();
  const cl = Object.values(A.coinlog || {}).sort((a, b) => (b.t || 0) - (a.t || 0)).slice(0, 50);
  return `<div class="card"><div class="row"><h3 class="grow">경매 기록</h3><button class="btn sm ghost" data-act="csvRounds">경매 기록 CSV</button><button class="btn sm ghost" data-act="csvCoins">코인 현황 CSV</button><button class="btn sm ghost" data-act="csvFinal">자리 배치 CSV</button></div>
    ${list.length ? `<table class="t"><tr><th>라운드</th><th>자리</th><th>결과</th><th>낙찰</th><th>금액별 인원</th><th>학생별 입찰(차감)</th></tr>${list.map(h => {
      const res = h.status === 'cancel' ? '<span class="pill">취소 (차감 없음)</span>' : h.status === 'undone' ? '<span class="pill">되돌림</span>' : h.win ? '<span class="pill good">낙찰</span>' : '<span class="pill bad">유찰</span>';
      const hist = Object.keys(h.hist || {}).map(k => +k.slice(1)).sort((a, b) => b - a).map(a => `${a}코인 ${h.hist['a' + a]}명`).join(', ');
      return `<tr class="${h.status !== 'ok' ? 'dim' : ''}"><td>${h.n}</td><td>${sno(h.seat)}번</td><td>${res}</td><td>${h.win ? esc(nm(h.win)) + ' · ' + h.amt + '코인' : ''}</td><td class="small">${hist}</td>
        <td class="small">${Object.entries(h.ded || {}).sort((a, b) => b[1] - a[1]).map(([s, a]) => esc(nm(s)) + ' ' + a).join(', ')}</td></tr>`;
    }).join('')}</table>` : '<p class="muted">아직 기록이 없어요.</p>'}</div>
    <div class="card"><h3>코인 변경 기록 (선생님이 바꾼 것)</h3>${cl.length ? `<table class="t">${cl.map(x => `<tr><td class="small muted">${x.t ? new Date(x.t).toLocaleTimeString('ko-KR') : ''}</td><td>${x.s === '*' ? '전체' : esc(nm(x.s))}</td><td>${x.from != null ? x.from + ' → ' : ''}${x.to}</td><td class="small muted">${esc(x.why || '')}</td></tr>`).join('')}</table>` : '<p class="muted">없음</p>'}</div>`;
}
function settingsView() {
  const c = A.cfg;
  return `<div class="adm-2"><div class="card"><h3>설정</h3>
      <label class="small muted">학급 이름</label><div class="row"><input id="sName" class="in grow" value="${esc(c.name || '')}"><button class="btn sm" data-act="saveName">저장</button></div>
      <label class="small muted" style="display:block;margin-top:12px">학생 표시 방식 (TV·결과 화면)</label>
      <select id="sDisp" class="in" data-change="display">${[['both', '번호 + 이름'], ['name', '이름만'], ['no', '번호만']].map(([v, t]) => `<option value="${v}" ${(c.display || 'both') === v ? 'selected' : ''}>${t}</option>`).join('')}</select>
      <label class="small muted" style="display:block;margin-top:12px">기본 입찰 시간</label>
      <select id="sDur" class="in" data-change="dur">${Array.from({ length: DUR_MAX - DUR_MIN + 1 }, (_, i) => DUR_MIN + i).map(v => `<option value="${v}" ${(c.dur || 5) === v ? 'selected' : ''}>${v}초</option>`).join('')}</select>
      <label class="small muted" style="display:block;margin-top:12px">처음 코인 (새 학생·‘처음’ 버튼·초기화에 씀)</label>
      <div class="row"><input id="sInit" class="in" type="number" min="0" value="${c.initCoins != null ? c.initCoins : 5}" style="width:100px"><button class="btn sm" data-act="saveInit">저장</button></div>
      <label class="chk" style="margin-top:14px"><input type="checkbox" id="openChk2" data-change="open" ${c.open === true ? 'checked' : ''}> 학생 입장 허용</label></div>
    <div class="col"><div class="card"><h3>주소</h3><p class="small">학생: <code>${esc(studentUrl(A.code))}</code></p><p class="small">TV: <code>${esc(tvUrl(A.code))}</code></p><button class="btn gold" data-act="links">QR 크게 보기</button></div>
      <div class="card danger"><h3>전체 초기화</h3><p class="small muted">경매 기록·코인·낙찰·자리 배정을 모두 처음 상태로 돌려요. 학생 명단·자리 배치·기기 연결은 그대로예요.</p><button class="btn bad" data-act="resetAll" ${ph() === 'bid' ? 'disabled' : ''}>전체 초기화</button></div></div></div>`;
}
function linksModal() {
  modal(`<div class="links"><div class="center"><h3>📱 학생 참여</h3><div id="qrS" class="qr"></div><div class="code-big">${A.code}</div><p class="small">${esc(studentUrl(A.code))}</p></div>
    <div class="center"><h3>📺 TV 화면</h3><div id="qrT" class="qr"></div><p class="small">${esc(tvUrl(A.code))}</p><a class="btn" href="${esc(tvUrl(A.code))}" target="_blank" rel="noopener">TV 화면 열기</a></div></div>
    <div class="row"><button class="btn ghost" data-act="close">닫기</button></div>`, 'wide');
  qr($('#qrS'), studentUrl(A.code), 220); qr($('#qrT'), tvUrl(A.code), 160);
}

/* ---------- 모달·이벤트 ---------- */
function modal(html, cls) { $('#modal').innerHTML = `<div class="modal-bg" data-act="bg"><div class="modal ${cls || ''}">${html}</div></div>`; }
function closeModal() { $('#modal').innerHTML = ''; }
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b || b.disabled) return;
  const id = b.dataset.id;
  const acts = {
    login, logout: () => DB.logout().then(() => location.reload()), home: openHome, open: () => openRoom(id), delRoom: () => deleteRoom(id),
    createRoom, importClass, importPick: () => importPick(id),
    tab: () => { A.tab = id; render(); window.scrollTo(0, 0); }, links: linksModal, close: closeModal, bg: () => { if (e.target === b) closeModal(); },
    seat: () => pickSeat(id), random: () => pickRandom(false), randomFail: () => pickRandom(true), start: startBid, cancel: cancelRound, undo: undoLast,
    endAuction, back: backToAuction, fill: fillRandom, finalize, unfinal: unfinalize, print: () => window.print(),
    unsel: () => { A.sel = null; render(); }, ownerSel: () => { A.ownerSel = A.ownerSel === id ? null : id; render(); },
    self: () => ownerSelf(A.sel), sit: () => sitHere(A.sel, $('#candSel').value, A.force), unsit: () => unsit(A.sel),
    approve: () => approveReq(id), reject: () => rejectReq(id), release: () => releaseClaim(id), rename: () => renameStudent(id),
    coin: () => coinChange(id, v => v + (+b.dataset.d), (+b.dataset.d > 0 ? '+' : '') + b.dataset.d),
    coinReset: () => coinChange(id, () => (A.cfg.initCoins != null ? A.cfg.initCoins : 5), '처음으로'),
    allCoins: setAllCoins, saveRoster, open1: () => setOpen(true),
    cell: () => cellClick(+b.dataset.r, +b.dataset.c), resize: resizeLayout, preset: () => presetLayout(id), addSep, delSep: () => delSep(id),
    saveName: () => { const v = $('#sName').value.trim(); if (v) { saveSetting('name', v); DB.set('auction/index/' + A.code + '/name', v).catch(() => {}); } },
    saveInit: () => { const v = Math.floor(+$('#sInit').value); if (v >= 0) saveSetting('initCoins', v); },
    resetAll, csvRounds: exportRounds, csvCoins: exportCoins, csvFinal: exportFinal
  };
  if (acts[b.dataset.act]) acts[b.dataset.act]();
});
document.addEventListener('change', e => {
  const k = e.target.dataset && e.target.dataset.change;
  if (!k) return;
  if (k === 'dur') saveSetting('dur', +e.target.value);
  if (k === 'display') saveSetting('display', e.target.value);
  if (k === 'open') setOpen(e.target.checked);
  if (k === 'force') { A.force = e.target.checked; render(); }
  if (k === 'incOwned') { A.incOwned = e.target.checked; }
});
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'pw') login(); });
