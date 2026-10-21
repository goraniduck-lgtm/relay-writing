/* 교실 마피아 — 교사·사회자 진행 화면
   교사: Firebase 교사 계정으로 로그인 (모든 방, 모든 권한)
   학생 사회자: 교사가 준 사회자 링크(?r=코드&k=키)로 들어옴 (진행만, 종료·연장·역할 설정은 불가) */
const A = {
  code: (qp.get('r') || '').toUpperCase(), key: qp.get('k') || '',
  view: 'loading', who: null,           // who: 'teacher' | 'host'
  index: null, meta: null, cfg: null, pub: undefined, roles: null, team: null, sec: null,
  dv: null, nv: null, presence: null, rejoin: null, names: null, pred: null, log: null,
  showRoles: false, tab: 'play', nextMission: 'random', customMission: '', busy: false, err: '',
  lib: undefined, newTags: { common: {}, secret: {} }, newLv: 1
};
const AL = {};
function listen(key, path, cb) {
  if (AL[key] && AL[key].path === path) return;
  if (AL[key]) AL[key].off();
  AL[key] = { path, off: DB.on(path, cb, e => console.warn(path, e)) };
}
function unlisten(key) { if (AL[key]) { AL[key].off(); delete AL[key]; } }
const R = () => ROOM_PATH(A.code);
const st = () => (A.pub && A.pub.state) || {};
const cfg = () => A.cfg || DEFAULT_CFG();
const players = () => (A.pub && A.pub.players) || {};
const isT = () => A.who === 'teacher';
const iAmConfirmer = () => isT() ? (cfg().run.confirm === 'joint' || cfg().run.host !== 'student') : true;
const myWho = () => isT() ? 'teacher' : 'host';

/* ---------- 시작 ---------- */
(async function boot() {
  startTicker(() => st());
  let u = null;
  try { u = await DB.ready(false); } catch (e) {}
  if (u && DB.isTeacher()) { A.who = 'teacher'; return A.code ? openRoom() : openHome(); }
  if (A.code && A.key) {
    try {
      u = u || await DB.ready(true);
      await DB.set(R() + '/hosts/' + DB.uid(), { key: A.key, at: DB.now() });
      A.who = 'host'; return openRoom();
    } catch (e) { A.view = 'badHost'; render(); return; }
  }
  A.view = 'login'; render();
})();

async function login() {
  const pw = $('#pw') ? $('#pw').value : '';
  if (!pw) return toast('비밀번호를 넣어 주세요.');
  A.busy = true; render();
  try { await DB.teacherLogin(pw); A.who = 'teacher'; A.busy = false; A.code ? openRoom() : openHome(); }
  catch (e) { A.busy = false; render(); toast('로그인하지 못했어요. 비밀번호를 확인해 주세요.'); }
}

function openHome() {
  A.view = 'home'; render();
  listen('index', 'mafia/index', v => { A.index = v || {}; render(); });
  listenLib();
}
async function createRoom() {
  const title = ($('#roomTitle') && $('#roomTitle').value.trim()) || '';
  let code = null;
  for (let i = 0; i < 6 && !code; i++) { const c = randCode(); if (!(await DB.get('mafia/index/' + c))) code = c; }
  if (!code) return toast('방 코드를 만들지 못했어요. 다시 눌러 주세요.');
  const t = DB.now();
  const c = DEFAULT_CFG();
  c.missions = A.lib || defaultLib();
  try {
    await DB.update('mafia', {
      ['index/' + code]: { at: t, title },
      ['rooms/' + code + '/meta']: { at: t, title, hostKey: randKey(12) },
      ['rooms/' + code + '/cfg']: c,
      ['rooms/' + code + '/pub/state']: { phase: 'lobby', round: 0, seq: 0, title }
    });
    location.href = 'admin.html?r=' + code;
  } catch (e) { fail()(e); }
}
async function deleteRoom(code) {
  if (!confirm(`${code} 방을 지울까요? 기록도 함께 지워져요.`)) return;
  try { await DB.update('mafia', { ['index/' + code]: null, ['rooms/' + code]: null }); } catch (e) { fail()(e); }
}

function openRoom() {
  A.view = 'room'; render();
  listen('pub', R() + '/pub', v => { const first = A.pub === undefined; A.pub = v; syncRound(); afterPub(); if (first) syncRoomMissions(); render(); });
  listen('cfg', R() + '/cfg', v => { A.cfgLoaded = true; A.cfg = v || DEFAULT_CFG(); A.cfg.run = Object.assign(DEFAULT_CFG().run, A.cfg.run || {}); A.cfg.roles = Object.assign(DEFAULT_CFG().roles, A.cfg.roles || {}); syncRoomMissions(); render(); });
  listen('roles', R() + '/roles', v => { A.roles = v; render(); });
  listen('team', R() + '/team', v => { A.team = v; });
  listen('sec', R() + '/sec', v => { A.sec = v; render(); });
  listen('presence', R() + '/presence', v => { A.presence = v || {}; render(); });
  listen('rejoin', R() + '/rejoin', v => { A.rejoin = v; render(); });
  listen('names', R() + '/names', v => { A.names = v || {}; });
  listen('log', R() + '/log', v => { A.log = v || {}; });
  if (isT()) { listen('meta', R() + '/meta', v => { A.meta = v; render(); }); listenLib(); }
}
function syncRound() {
  const s = st();
  if (s.round) {
    listen('dv', `${R()}/dv/${s.round}`, v => { A.dv = v || {}; afterPub(); render(); });
    listen('nv', `${R()}/nv/${s.round}`, v => { A.nv = v || {}; render(); });
  } else { unlisten('dv'); unlisten('nv'); A.dv = {}; A.nv = {}; }
  if (A.tab === 'log' || s.phase === 'end') listen('pred', R() + '/pred', v => { A.pred = v || {}; render(); });
}
/* TV의 '제출 인원' 표시용 (누가 누구에게 냈는지는 공개하지 않음) */
function afterPub() {
  const s = st();
  if (s.phase !== 'vote' || !s.open) return;
  const n = Object.keys((A.dv && A.dv[s.stage]) || {}).length;
  if (s.vc !== n) DB.set(R() + '/pub/state/vc', n).catch(() => {});
}

/* ---------- 상태 전환 (동시에 눌러도 한 번만 반영) ---------- */
const clone = o => JSON.parse(JSON.stringify(o));
const toMap = a => { const m = {}; for (const x of a || []) m[x] = true; return m; };   // DB에는 배열 대신 {id: true}
async function tx(expect, mutate) {
  const tok = randKey(8);
  try {
    const res = await DB.tx(R() + '/pub', cur => {
      if (!cur || !cur.state || !expect(cur)) return undefined;
      const next = clone(cur);
      mutate(next);
      next.state.rk = String(next.state.round || 0);           // 보안 규칙에서 경로 키와 비교하는 문자열
      next.state.sk = next.state.stage ? String(next.state.stage) : null;
      next.state.seq = (cur.state.seq || 0) + 1;
      next.state.tok = tok;
      return next;
    });
    if (res.committed && res.val && res.val.state && res.val.state.tok === tok) return res.val;
  } catch (e) { fail()(e); return null; }
  toast('이미 다른 화면에서 처리했어요.');
  return null;
}
const same = (phase, seq) => p => p.state.phase === phase && p.state.seq === seq;
const timerFor = k => { const d = (cfg().run.times[k] || DEFAULT_TIMES[k]) * 1000; return { dur: d, end: DB.now() + d, rem: d }; };

function aliveCounts(pl) { return Logic.countSides(pl, A.roles || {}, true); }
function initCounts() { const g = (A.log && A.log.game) || {}; return g.init || Logic.countSides(players(), A.roles || {}, false); }
function endPayload(pl, round, judge) {
  return Object.assign({ winner: judge.winner, method: judge.method, round, roles: clone(A.roles || {}),
    alive: aliveCounts(pl), init: initCounts(), at: DB.now() }, judge.rate ? { rate: judge.rate } : {});
}
function goEnd(next, judge) {
  next.state.phase = 'end'; next.state.open = false; next.state.timer = null; next.state.paused = false;
  next.end = endPayload(next.players, next.state.round, judge);
}

/* 게임 시작: 역할 배정 */
async function startGame() {
  const s = st(); const pl = players(); const pids = Object.keys(pl);
  const c = cfg(); const m = c.roles.mafia || Logic.recommendMafia(pids.length);
  const manual = c.roles.manual || {};
  for (const k of Object.keys(manual)) if (!pl[k]) delete manual[k];
  const err = Logic.checkRoleSetup(pids.length, m, c.roles.doctor, manual);
  if (err) return toast(err);
  const off = pids.filter(p => !(A.presence || {})[p]);
  if (off.length && !confirm(`접속이 끊긴 학생이 ${off.length}명 있어요 (${off.map(p => pl[p].name).join(', ')}). 그래도 시작할까요?`)) return;
  const roles = Logic.assignRoles(pids, m, c.roles.doctor, manual);
  const won = await tx(same('lobby', s.seq), n => {
    n.state = Object.assign(n.state, { phase: 'reveal', round: 0, stage: null, open: false, timer: null, paused: false, msg: null, cands: null, vc: 0, maxR: c.run.maxR });
    for (const p of Object.values(n.players)) { p.alive = true; p.ready = false; delete p.out; }
    n.rounds = null; n.end = null;
  });
  if (!won) return;
  const up = { roles, team: {}, 'log/game': { at: DB.now(), n: pids.length, roles, init: Logic.countSides(pl, roles, false), doctor: !!c.roles.doctor, mafia: m, cfg: c.run } };
  for (const p of pids) if (roles[p] === 'mafia') up.team[p] = pl[p].name;
  A.roles = roles;
  await DB.update(R(), up).catch(fail('역할을 저장하지 못했어요. "역할 다시 보내기"를 눌러 주세요.'));
}

/* 낮 시작 (공통 미션 + 비밀 미션) */
function chosenMission() {
  if (A.nextMission === 'custom') { const t = (A.customMission || '').trim(); return t ? { text: t, tags: [] } : null; }
  const list = commonList();
  if (!list.length) return null;
  if (A.nextMission === 'random') {
    const used = new Set(Object.values((A.pub && A.pub.rounds) || {}).map(r => r && r.mission));
    const pool = list.filter(x => !used.has(x.text));
    const from = pool.length ? pool : list;
    return Object.assign({}, from[Math.floor(Math.random() * from.length)]);
  }
  return list.find(x => x.id === A.nextMission) || null;
}
async function startDay(extend) {
  const s = st();
  const ms = chosenMission();
  if (!ms) return toast(A.nextMission === 'custom' ? '공통 미션을 적어 주세요.' : '쓸 수 있는 공통 미션이 없어요. 미션 탭에서 하나 이상 체크해 주세요.');
  if (s.phase === 'reveal') {
    const notReady = Object.values(players()).filter(p => !p.ready).length;
    if (notReady && !confirm(`아직 역할 확인을 안 누른 학생이 ${notReady}명 있어요. 시작할까요?`)) return;
  }
  const r = (s.round || 0) + 1;
  const won = await tx(p => p.state.seq === s.seq && ['reveal', 'morning', 'limit'].includes(p.state.phase), n => {
    if (extend) n.state.maxR = Math.max(n.state.maxR || 0, r);
    Object.assign(n.state, { phase: 'mission', round: r, stage: null, open: false, cands: null, vc: 0, paused: false, msg: null, mission: ms.text, timer: timerFor('mission') });
    n.rounds = n.rounds || {}; n.rounds[r] = { mission: ms.text };
  });
  if (!won) return;
  A.nextMission = 'random';
  const pl = won.players || {};
  const mafiaAlive = Object.keys(pl).filter(p => pl[p].alive && (A.roles || {})[p] === 'mafia');
  const prev = {};
  for (const p of mafiaAlive) { const x = A.sec && A.sec[p] && A.sec[p][r - 1]; if (x) prev[p] = x.id; }
  const picks = Logic.pickSecrets(ms.tags, mafiaAlive, prev, cfg().run.diff, null, secretList());
  const up = { ['log/r' + r + '/mission']: ms.text };
  for (const [p, x] of Object.entries(picks)) { up[`sec/${p}/${r}/id`] = x.id; up[`sec/${p}/${r}/m`] = x.m; up[`sec/${p}/${r}/lv`] = x.lv; }
  await DB.update(R(), up).catch(fail('비밀 미션을 보내지 못했어요. 새로고침 후 "비밀 미션 다시 보내기"를 눌러 주세요.'));
}
async function resendSecrets() {
  const s = st(); const r = s.round; const pl = players();
  const mafiaAlive = Object.keys(pl).filter(p => pl[p].alive && (A.roles || {})[p] === 'mafia' && !(A.sec && A.sec[p] && A.sec[p][r] && A.sec[p][r].m));
  if (!mafiaAlive.length) return toast('모든 마피아에게 비밀 미션이 있어요.');
  const ms = commonList().find(x => x.text === s.mission) || { tags: [] };
  const picks = Logic.pickSecrets(ms.tags, mafiaAlive, {}, cfg().run.diff, null, secretList());
  const up = {};
  for (const [p, x] of Object.entries(picks)) { up[`sec/${p}/${r}/id`] = x.id; up[`sec/${p}/${r}/m`] = x.m; up[`sec/${p}/${r}/lv`] = x.lv; }
  await DB.update(R(), up).then(() => toast('비밀 미션을 보냈어요.')).catch(fail());
}
async function resendRoles() {
  const g = A.log && A.log.game; if (!g || !g.roles) return toast('배정 기록이 없어요.');
  const pl = players(); const team = {};
  for (const [p, r] of Object.entries(g.roles)) if (r === 'mafia' && pl[p]) team[p] = pl[p].name;
  await DB.update(R(), { roles: g.roles, team }).then(() => toast('역할을 다시 보냈어요.')).catch(fail());
}

async function simpleNext(from, to, extra) {
  const s = st();
  await tx(same(from, s.seq), n => { Object.assign(n.state, { phase: to, paused: false, msg: null }, extra ? extra() : {}); });
}
const toThink = () => simpleNext('mission', 'think', () => ({ timer: timerFor('think') }));
const toMeeting = () => simpleNext('think', 'meeting', () => ({ timer: timerFor('meeting') }));
const toVote = () => simpleNext('meeting', 'vote', () => ({ stage: 1, open: true, vc: 0, cands: null, timer: timerFor('vote') }));

/* 낮 투표 마감 → 집계 */
async function closeVote(force) {
  const s = st();
  if (s.open) {
    const missing = unvoted();
    if (missing.length && !force) {
      modal(`<h3>아직 투표하지 않은 학생 ${missing.length}명</h3><p>${missing.map(p => esc(p.name)).join(', ')}</p>
        <p class="muted">지금 마감하면 이 학생들은 기권으로 처리돼요.</p>
        <div class="row" style="margin-top:12px"><button class="btn soft grow" data-act="extend">⏱ 30초 연장</button><button class="btn bad grow" data-act="closeVoteForce">지금 마감</button></div>`);
      return;
    }
    closeModal();
    const ok = await tx(p => p.state.phase === 'vote' && p.state.open && p.state.seq === s.seq, n => { n.state.open = false; n.state.timer = null; n.state.paused = false; });
    if (!ok) return;
  }
  await tallyVote();
}
async function tallyVote() {
  const s = st(); const r = s.round, stage = s.stage;
  const votes = (await DB.get(`${R()}/dv/${r}/${stage}`)) || {};
  const pl = players();
  const res = Logic.tally(votes, (v, t) => pl[v] && pl[v].alive && pl[t] && pl[t].alive && v !== t && (stage == 1 || (s.cands && s.cands[t])));
  const out = Logic.dayOutcome(Number(stage), res);
  let judge = null;
  const won = await tx(p => p.state.phase === 'vote' && !p.state.open && p.state.round === r && p.state.stage === stage, n => {
    n.rounds = n.rounds || {}; n.rounds[r] = n.rounds[r] || {}; n.rounds[r].day = n.rounds[r].day || {};
    n.rounds[r].day['s' + stage] = { tally: res.tally, top: toMap(res.top), reason: out.reason, out: out.out || null, cands: out.cands ? toMap(out.cands) : null, n: Object.keys(votes).length };
    if (out.out) { n.players[out.out].alive = false; n.players[out.out].out = { r, t: 'day' }; n.rounds[r].dayOut = out.out; }
    n.state.phase = 'dayResult'; n.state.open = false; n.state.timer = null;
    const w = Logic.normalWinner(aliveCounts(n.players));
    if (w) { judge = { winner: w, method: 'normal' }; goEnd(n, judge); }
  });
  if (!won) return;
  const up = { [`log/r${r}/day/s${stage}`]: { tally: res.tally, reason: out.reason, out: out.out || null, votes: Object.keys(votes).length, alive: aliveList(A.pub).length } };
  if (out.out) up[`log/r${r}/dayOut`] = out.out;
  Object.assign(up, snapshot(r, won.players));
  if (judge) up['log/end'] = won.end;
  await DB.update(R(), up).catch(() => {});
}
function unvoted() {
  const s = st(); const got = (A.dv && A.dv[s.stage]) || {};
  return aliveList(A.pub).filter(p => !got[p.id]);
}
async function startRevote() {
  const s = st(); const d = (((A.pub.rounds || {})[s.round] || {}).day || {}).s1;
  if (!d || d.reason !== 'tie') return;
  const cands = {}; for (const c of Object.keys(d.cands || d.top || {})) cands[c] = true;
  await tx(p => same('dayResult', s.seq)(p) && p.state.stage === 1, n => Object.assign(n.state, { phase: 'vote', stage: 2, open: true, vc: 0, cands, timer: timerFor('vote'), msg: null }));
}
async function startNight() {
  const s = st();
  await tx(same('dayResult', s.seq), n => Object.assign(n.state, { phase: 'night', open: true, timer: timerFor('night'), paused: false, msg: null, cands: null }));
}

/* 밤 마감 → 판정 */
function attackersOf(r, pl) {
  return Object.keys(pl).filter(p => pl[p].alive && (A.roles || {})[p] === 'mafia' && A.sec && A.sec[p] && A.sec[p][r] && A.sec[p][r].ok && Object.keys(A.sec[p][r].ok).length);
}
function doctorOf(pl) { return Object.keys(pl).find(p => (A.roles || {})[p] === 'doctor' && pl[p].alive) || null; }
async function closeNight(force) {
  const s = st();
  if (s.open) {
    const pl = players(); const atk = attackersOf(s.round, pl); const doc = doctorOf(pl);
    const nv = A.nv || {};
    const missA = atk.filter(p => !(nv.m && nv.m[p])); const missD = doc && !(nv.d && nv.d[doc]);
    if ((missA.length || missD) && !force) {
      modal(`<h3>아직 밤 행동을 안 한 학생이 있어요</h3>
        ${missA.length ? `<p>🕶️ 공격권 있는 마피아: ${missA.map(p => esc(pl[p].name)).join(', ')}</p>` : ''}${missD ? `<p>🩺 의사: ${esc(pl[doc].name)}</p>` : ''}
        <p class="muted">지금 마감하면 낸 것만으로 판정해요. (마피아 표가 없으면 공격 없음, 의사가 안 고르면 보호 없음)</p>
        <div class="row" style="margin-top:12px"><button class="btn soft grow" data-act="extend">⏱ 30초 연장</button><button class="btn bad grow" data-act="closeNightForce">지금 마감</button></div>`);
      return;
    }
    closeModal();
    const ok = await tx(p => p.state.phase === 'night' && p.state.open && p.state.seq === s.seq, n => { n.state.open = false; n.state.timer = null; n.state.paused = false; });
    if (!ok) return;
  }
  await resolveNight();
}
async function resolveNight() {
  const s = st(); const r = s.round;
  const nv = (await DB.get(`${R()}/nv/${r}`)) || {};
  const pl = players();
  const atk = attackersOf(r, pl); const doc = doctorOf(pl);
  const docT = doc && nv.d ? nv.d[doc] || null : null;
  const res = Logic.nightOutcome(nv.m || {}, atk, pl, A.roles || {}, docT);
  let judge = null;
  const won = await tx(p => p.state.phase === 'night' && !p.state.open && p.state.round === r, n => {
    n.rounds = n.rounds || {}; n.rounds[r] = n.rounds[r] || {};
    n.rounds[r].night = { out: res.out || null };
    if (res.out) { n.players[res.out].alive = false; n.players[res.out].out = { r, t: 'night' }; }
    n.state.phase = 'morning'; n.state.timer = null;
    const w = Logic.normalWinner(aliveCounts(n.players));
    if (w) { judge = { winner: w, method: 'normal' }; goEnd(n, judge); }
  });
  if (!won) return;
  const up = { [`log/r${r}/night`]: { target: res.target, protect: res.protect, saved: res.saved, out: res.out, attackers: toMap(atk), votes: nv.m || {}, tieBreak: res.tieBreak } };
  Object.assign(up, snapshot(r, won.players));
  if (judge) up['log/end'] = won.end;
  await DB.update(R(), up).catch(() => {});
}
/* 라운드 기록: 비밀 미션 결과 + 진영별 생존 */
function snapshot(r, pl) {
  const up = {}; const sec = {};
  for (const [p, role] of Object.entries(A.roles || {})) {
    if (role !== 'mafia') continue;
    const x = A.sec && A.sec[p] && A.sec[p][r]; if (!x) continue;
    sec[p] = { m: x.m, lv: x.lv, ok: x.ok || null, success: !!(x.ok && Object.keys(x.ok).length) };
  }
  up[`log/r${r}/secret`] = sec;
  up[`log/r${r}/alive`] = aliveCounts(pl);
  return up;
}

async function nextDayOrLimit() {
  const s = st();
  if ((s.round || 0) >= (s.maxR || cfg().run.maxR)) {
    await tx(same('morning', s.seq), n => Object.assign(n.state, { phase: 'limit', timer: null, msg: null }));
  } else await startDay(false);
}

/* 수동·제한 라운드 종료 (교사) */
function endPreview(method) {
  const pl = players();
  const judge = Logic.judgeEnd(initCounts(), aliveCounts(pl), method);
  const a = aliveCounts(pl), i = initCounts();
  modal(`<h3>${method === 'limit' ? '생존율 판정으로 끝내기' : '게임 끝내기'}</h3>
    <p>지금까지 <b>확정된</b> 결과로 판정해요. 아직 마감하지 않은 투표·밤 행동은 넣지 않아요.</p>
    <div class="card"><div class="kv"><span>시민 팀</span><b>${a.citizen} / ${i.citizen}명 (${pct(a.citizen, i.citizen)}%)</b>
    <span>마피아 팀</span><b>${a.mafia} / ${i.mafia}명 (${pct(a.mafia, i.mafia)}%)</b></div></div>
    <p style="font-size:1.3rem;text-align:center"><b>${WINNER_TEXT[judge.winner]}</b><br><span class="muted small">${END_METHOD[judge.method]}</span></p>
    <div class="row"><button class="btn ghost grow" data-act="closeModal">취소</button><button class="btn bad grow" data-act="endConfirm" data-id="${method}">이대로 끝내기</button></div>`);
}
const pct = (a, b) => b ? Math.round(a / b * 1000) / 10 : 0;
async function endConfirm(method) {
  closeModal();
  const s = st();
  let judge = null;
  const won = await tx(p => p.state.seq === s.seq && p.state.phase !== 'end' && p.state.phase !== 'lobby', n => {
    judge = Logic.judgeEnd(initCounts(), aliveCounts(n.players), method);
    goEnd(n, judge);
  });
  if (won) await DB.update(R(), { 'log/end': won.end }).catch(() => {});
}

/* 같은 참가자로 새 게임 (교사) */
async function restart() {
  if (!confirm('같은 참가자로 새 게임을 준비할까요? 지금 게임 기록은 "지난 기록"으로 옮겨져요.')) return;
  const s = st();
  const won = await tx(p => p.state.seq === s.seq, n => {
    n.state = { phase: 'lobby', round: 0, seq: n.state.seq, title: n.state.title || '' };
    for (const p of Object.values(n.players || {})) { p.alive = true; p.ready = false; delete p.out; }
    n.rounds = null; n.end = null;
  });
  if (!won) return;
  const hist = Object.assign({}, A.log || {}); delete hist.history;
  const pred = (await DB.get(R() + '/pred').catch(() => null)) || null;
  await DB.update(R(), { roles: null, team: null, sec: null, dv: null, nv: null, pred: null,
    ['log/history/g' + Date.now()]: Object.assign(hist, { pred }),
    'log/game': null, 'log/end': null, ...Object.fromEntries(Object.keys(A.log || {}).filter(k => /^r\d+$/.test(k)).map(k => ['log/' + k, null])) }).catch(fail());
}

/* 타이머 */
async function pauseToggle() {
  await DB.tx(R() + '/pub/state', s => {
    if (!s) return undefined;
    const t = s.timer;
    if (s.paused) { s.paused = false; if (t) t.end = DB.now() + (t.rem || 0); }
    else { s.paused = true; if (t) t.rem = Math.max(0, (t.end || 0) - DB.now()); }
    return s;
  }).catch(fail());
}
async function extend() {
  closeModal();
  await DB.tx(R() + '/pub/state', s => {
    if (!s || !s.timer) return undefined;
    if (s.paused) s.timer.rem = (s.timer.rem || 0) + 30000;
    else s.timer.end = Math.max(s.timer.end || 0, DB.now()) + 30000;
    return s;
  }).then(() => toast('30초 늘렸어요.')).catch(fail());
}
function setMsg(text) { DB.set(R() + '/pub/state/msg', text ? { text, at: DB.now() } : null).catch(fail()); }

/* 미션 확인 */
async function confirmMission(pid, on) {
  const r = st().round;
  const path = `${R()}/sec/${pid}/${r}/ok/${myWho()}`;
  try { if (on) await DB.set(path, { at: DB.now(), by: myWho() }); else await DB.remove(path); }
  catch (e) { fail('지금은 바꿀 수 없어요. (밤 투표가 시작되면 확인을 바꿀 수 없어요)')(e); }
}

/* 참가자 관리 */
async function removePlayer(pid) {
  const p = players()[pid]; if (!p) return;
  if (!confirm(`${p.name} 학생을 명단에서 뺄까요?`)) return;
  await DB.update(R(), { ['pub/players/' + pid]: null, ['names/' + p.key]: null, ['me/' + p.uid]: null, ['presence/' + pid]: null, ['cfg/roles/manual/' + pid]: null }).catch(fail());
}
async function approveRejoin(uid) {
  const rq = (A.rejoin || {})[uid]; if (!rq) return;
  const pid = (A.names || {})[nameKey(rq.name)];
  const p = pid && players()[pid];
  if (!p) return toast('그 이름의 참가자가 없어요.');
  await DB.update(R(), { ['pub/players/' + pid + '/uid']: uid, ['me/' + uid]: pid, ['me/' + p.uid]: null, ['rejoin/' + uid]: null })
    .then(() => toast(`${p.name} 학생을 다시 연결했어요.`)).catch(fail());
}
const rejectRejoin = uid => DB.remove(R() + '/rejoin/' + uid).catch(fail());
async function toggleAlive(pid) {
  const p = players()[pid]; if (!p) return;
  if (!confirm(`[복구] ${p.name} 학생을 ${p.alive ? '탈락' : '생존'} 상태로 바꿀까요?\n(잘못 처리된 경우에만 쓰세요)`)) return;
  const s = st();
  await tx(x => x.state.seq === s.seq, n => { n.players[pid].alive = !p.alive; if (p.alive) n.players[pid].out = { r: n.state.round, t: 'fix' }; else delete n.players[pid].out; });
}
async function newHostKey() {
  if (!confirm('사회자 링크를 새로 만들까요? 예전 링크로 들어온 사회자는 더 이상 진행할 수 없어요.')) return;
  await DB.set(R() + '/meta/hostKey', randKey(12)).catch(fail());
}

/* 설정 저장 */
function setCfg(path, v) { DB.set(R() + '/cfg/' + path, v).catch(fail()); }

/* ---------- 미션 목록 (교사가 보고·고르고·더하고·고침) ----------
   기본 목록: mafia/rooms/_library/missions (교사만) — 새 방을 만들 때 방 설정(cfg/missions)으로 복사
   방 안에서 고치면 기본 목록과 이 방 목록이 함께 바뀜. 사회자는 방 목록을 읽기만 함 */
const LIB_PATH = 'mafia/rooms/_library/missions';
const TAGS = { stretch: '스트레칭', talk: '말하기', move: '몸 움직이기', hands: '손 놀이', calm: '조용히', tidy: '정리' };
function defaultLib() {
  const common = {}, secret = {};
  MISSIONS.COMMON.forEach((m, i) => { common[m.id] = { text: m.text, tags: toMap(m.tags), on: true, o: i }; });
  MISSIONS.SECRET.forEach((m, i) => { secret[m.id] = { text: m.text, lv: m.lv, fit: toMap(m.fit), on: true, o: i }; });
  return { common, secret };
}
function libNow() {
  const l = (A.view === 'room' && A.cfg && A.cfg.missions) || A.lib || defaultLib();
  return { common: l.common || {}, secret: l.secret || {} };
}
function listOf(kind, onlyOn) {
  return Object.entries(libNow()[kind] || {}).filter(([, m]) => m && m.text).map(([id, m]) => Object.assign({ id }, m))
    .filter(m => !onlyOn || m.on !== false).sort((a, b) => (a.o || 0) - (b.o || 0));
}
const commonList = () => listOf('common', true).map(m => ({ id: m.id, text: m.text, tags: Object.keys(m.tags || {}) }));
const secretList = () => listOf('secret', true).map(m => ({ id: m.id, text: m.text, lv: m.lv || 1, fit: Object.keys(m.fit || {}) }));
function listenLib() {
  if (!isT()) return;
  listen('lib', LIB_PATH, v => {
    if (v == null) { A.lib = defaultLib(); DB.set(LIB_PATH, A.lib).catch(() => {}); }
    else A.lib = v;
    syncRoomMissions(); render();
  });
}
/* 교사가 방을 열면: 방 목록이 없거나, 아직 준비 단계면 기본 목록으로 맞춤 */
function syncRoomMissions() {
  if (!isT() || A.view !== 'room' || !A.lib || !A.cfgLoaded || A.pub === undefined) return;
  const room = A.cfg && A.cfg.missions;
  if (!room || (st().phase === 'lobby' && JSON.stringify(room) !== JSON.stringify(A.lib))) DB.set(R() + '/cfg/missions', A.lib).catch(() => {});
}
function missionUpdates(kind, id, patch) {
  const up = {};
  for (const [k, v] of Object.entries(patch)) {
    up[`rooms/_library/missions/${kind}/${id}${k ? '/' + k : ''}`] = v;
    if (A.view === 'room' && A.cfg && A.cfg.missions) up[`rooms/${A.code}/cfg/missions/${kind}/${id}${k ? '/' + k : ''}`] = v;
  }
  return up;
}
async function saveMission(kind, id, patch) {
  if (!isT()) return toast('미션은 선생님만 고칠 수 있어요.');
  await DB.update('mafia', missionUpdates(kind, id, patch)).catch(fail());
}
function toggleTag(kind, id, tag) {
  if (id === 'new') { A.newTags[kind][tag] = !A.newTags[kind][tag]; if (tag === '*' && A.newTags[kind]['*']) A.newTags[kind] = { '*': true }; else if (tag !== '*') delete A.newTags[kind]['*']; render(); return; }
  const field = kind === 'common' ? 'tags' : 'fit';
  const m = libNow()[kind][id] || {}; const cur = m[field] || {};
  const on = !cur[tag];
  const patch = { [field + '/' + tag]: on || null };
  if (kind === 'secret' && on && tag === '*') for (const t of Object.keys(cur)) if (t !== '*') patch[field + '/' + t] = null;
  if (kind === 'secret' && on && tag !== '*' && cur['*']) patch[field + '/*'] = null;
  saveMission(kind, id, patch);
}
async function addMission(kind) {
  if (!isT()) return;
  const el = $(kind === 'common' ? '#newC' : '#newS');
  const text = (el && el.value || '').trim().slice(0, 80);
  if (!text) return toast('미션 내용을 적어 주세요.');
  if (listOf(kind).some(m => m.text === text)) return toast('이미 있는 미션이에요.');
  const o = Math.max(-1, ...listOf(kind).map(m => m.o || 0)) + 1;
  const tags = Object.assign({}, A.newTags[kind]);
  const item = kind === 'common' ? { text, tags, on: true, o } : { text, lv: A.newLv || 1, fit: Object.keys(tags).length ? tags : { '*': true }, on: true, o };
  const id = (kind === 'common' ? 'c' : 's') + Date.now().toString(36);
  await DB.update('mafia', missionUpdates(kind, id, { '': item })).then(() => { el.value = ''; A.newTags[kind] = {}; toast('미션을 더했어요.'); render(); }).catch(fail());
}
async function delMission(kind, id) {
  const m = libNow()[kind][id]; if (!m) return;
  if (!confirm(`"${m.text}" 미션을 지울까요?`)) return;
  await DB.update('mafia', missionUpdates(kind, id, { '': null })).catch(fail());
}
async function moveMission(kind, id, dir) {
  const list = listOf(kind); const i = list.findIndex(m => m.id === id); const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return;
  const up = Object.assign({}, missionUpdates(kind, list[i].id, { o: list[j].o || j }), missionUpdates(kind, list[j].id, { o: list[i].o || i }));
  if ((list[i].o || i) === (list[j].o || j)) Object.assign(up, missionUpdates(kind, list[i].id, { o: j }), missionUpdates(kind, list[j].id, { o: i }));
  await DB.update('mafia', up).catch(fail());
}
async function resetLib() {
  if (!confirm('미션 목록을 처음 기본 목록으로 되돌릴까요? 더하거나 고친 미션은 사라져요.')) return;
  const d = defaultLib(); const up = { 'rooms/_library/missions': d };
  if (A.view === 'room') up[`rooms/${A.code}/cfg/missions`] = d;
  await DB.update('mafia', up).then(() => toast('기본 목록으로 되돌렸어요.')).catch(fail());
}
async function swapSecret(pid, mid) {
  if (!mid) return;
  const m = secretList().find(x => x.id === mid); const r = st().round; if (!m || !r) return;
  await DB.update(R(), { [`sec/${pid}/${r}/id`]: m.id, [`sec/${pid}/${r}/m`]: m.text, [`sec/${pid}/${r}/lv`]: m.lv })
    .then(() => toast(`${pname(A.pub, pid)}의 비밀 미션을 바꿨어요.`)).catch(fail('지금은 바꿀 수 없어요.'));
}

function missionsHtml() {
  const ed = isT(); const dis = ed ? '' : 'disabled';
  const chips = (kind, id, map, withAny) => {
    const keys = Object.keys(TAGS).concat(withAny ? ['*'] : []);
    return `<div class="row" style="gap:4px">${keys.map(t => `<button class="chip ${map && map[t] ? 'on' : ''}" data-act="mTag" data-kind="${kind}" data-id="${id}" data-tag="${t}" ${dis}>${t === '*' ? '어디에나' : TAGS[t]}</button>`).join('')}</div>`;
  };
  const tools = (kind, m, i, n) => ed ? `<div class="row" style="gap:4px;justify-content:flex-end;flex-wrap:nowrap">
      <button class="btn sm ghost" data-act="mMove" data-kind="${kind}" data-id="${m.id}" data-dir="-1" ${i === 0 ? 'disabled' : ''} title="위로">▲</button>
      <button class="btn sm ghost" data-act="mMove" data-kind="${kind}" data-id="${m.id}" data-dir="1" ${i === n - 1 ? 'disabled' : ''} title="아래로">▼</button>
      <button class="btn sm ghost" data-act="mDel" data-kind="${kind}" data-id="${m.id}" title="지우기">🗑</button></div>` : '';
  const cl = listOf('common'), sl = listOf('secret');
  const onC = cl.filter(m => m.on !== false).length, onS = sl.filter(m => m.on !== false).length;
  const lvSel = (id, v, act) => `<select class="num" style="width:auto" id="${id}" data-act-change="${act}" ${act === 'mLv' ? `data-id="${id.slice(4)}"` : ''} ${dis}>${[1, 2, 3].map(l => `<option value="${l}" ${+v === l ? 'selected' : ''}>${MISSIONS.LV_NAME[l]}</option>`).join('')}</select>`;
  return `<div class="card"><div class="row"><h3 class="grow">🗒 미션 목록</h3>${ed ? '<button class="btn sm ghost" data-act="mReset">기본 목록으로 되돌리기</button>' : ''}</div>
      <p class="small muted">✅ 체크한 미션만 게임에 나와요. ${ed ? '글을 고치면 칸을 벗어날 때 저장돼요. 여기서 고친 목록은 앞으로 만드는 방에도 그대로 쓰여요.' : '미션은 선생님만 고칠 수 있어요.'}
      ${A.view === 'room' && st().phase !== 'lobby' ? '<br>게임 중에 고치면 다음 날 미션부터 바뀐 목록이 쓰여요.' : ''}</p></div>
    <div class="card"><h3>☀️ 공통 미션 <span class="pill">${onC}/${cl.length}개 사용</span></h3>
      <p class="small muted">모두가 함께 하는 미션이에요. "종류"는 어울리는 비밀 미션을 고를 때 써요.</p>
      <div style="overflow:auto"><table class="tbl"><tr><th>사용</th><th>미션 · 종류</th><th></th></tr>${cl.map((m, i) => `<tr>
        <td><input type="checkbox" id="mon_c_${m.id}" data-act-change="mOn" data-kind="common" data-id="${m.id}" ${m.on !== false ? 'checked' : ''} ${dis} style="width:22px;height:22px"></td>
        <td style="min-width:260px"><input class="in mtext" id="mt_c_${m.id}" data-act-change="mText" data-kind="common" data-id="${m.id}" value="${esc(m.text)}" maxlength="80" ${dis}>
          <div style="margin-top:6px">${chips('common', m.id, m.tags)}</div></td><td>${tools('common', m, i, cl.length)}</td></tr>`).join('')}</table></div>
      ${ed ? `<div class="addrow"><b>＋ 새 공통 미션</b><input class="in mtext" id="newC" maxlength="80" placeholder="예: 옆 친구와 손뼉 세 번 마주치기">${chips('common', 'new', A.newTags.common)}<button class="btn sm" data-act="mAdd" data-kind="common">추가</button></div>` : ''}</div>
    <div class="card"><h3>🤫 마피아 비밀 미션 <span class="pill">${onS}/${sl.length}개 사용</span></h3>
      <p class="small muted">마피아가 몰래 하는 행동이에요. 난이도는 설정의 "비밀 미션 난이도"와 맞춰 뽑히고, "어울리는 공통 미션"이 같은 종류인 것이 먼저 뽑혀요.</p>
      <div style="overflow:auto"><table class="tbl"><tr><th>사용</th><th>미션 · 난이도 · 어울리는 공통 미션</th><th></th></tr>${sl.map((m, i) => `<tr>
        <td><input type="checkbox" id="mon_s_${m.id}" data-act-change="mOn" data-kind="secret" data-id="${m.id}" ${m.on !== false ? 'checked' : ''} ${dis} style="width:22px;height:22px"></td>
        <td style="min-width:260px"><input class="in mtext" id="mt_s_${m.id}" data-act-change="mText" data-kind="secret" data-id="${m.id}" value="${esc(m.text)}" maxlength="80" ${dis}>
          <div class="row" style="margin-top:6px;gap:8px">${lvSel('mlv_' + m.id, m.lv, 'mLv')}${chips('secret', m.id, m.fit, true)}</div></td><td>${tools('secret', m, i, sl.length)}</td></tr>`).join('')}</table></div>
      ${ed ? `<div class="addrow"><b>＋ 새 비밀 미션</b><input class="in mtext" id="newS" maxlength="80" placeholder="예: 안경 한 번 고쳐 쓰기">${lvSel('newLvSel', A.newLv, 'newLv')}${chips('secret', 'new', A.newTags.secret, true)}<button class="btn sm" data-act="mAdd" data-kind="secret">추가</button></div>` : ''}</div>`;
}

/* ---------- 모달 ---------- */
function modal(html) { $('#modal').innerHTML = `<div class="modal-bg" data-act="closeModal"><div class="modal">${html}</div></div>`; }
function closeModal() { $('#modal').innerHTML = ''; }

/* ---------- 그리기 ---------- */
function render() {
  const main = $('#main');
  if (A.view === 'login') {
    document.body.className = 'm-lobby'; paint($('#top'), '');
    paint(main, `<div class="card hero" style="max-width:460px;margin:40px auto"><div class="ic">🕶️</div><h2>교실 마피아 — 선생님</h2>
      <p class="muted">교사 계정 비밀번호로 들어가요.<br>(학생 사회자는 선생님이 준 사회자 링크로 들어와요)</p>
      <input class="in" id="pw" type="password" placeholder="비밀번호" style="margin:12px 0">
      <button class="btn big" data-act="login" ${A.busy ? 'disabled' : ''}>로그인</button></div>`);
    return;
  }
  if (A.view === 'badHost') {
    paint(main, `<div class="card hero"><div class="ic">🔒</div><h2>사회자 링크가 맞지 않아요</h2><p>선생님께 새 사회자 링크(QR)를 받아 주세요.</p></div>`); return;
  }
  if (A.view === 'home') return renderHome();
  if (A.view === 'libEdit') { document.body.className = 'm-lobby'; paint($('#top'), ''); paint(main, `<div class="row" style="margin-top:12px"><button class="btn sm ghost" data-act="home">◀ 게임 방 목록</button></div>` + missionsHtml()); return; }
  if (A.view !== 'room') return;
  if (A.pub === undefined) { paint(main, `<div class="hero"><p>방을 불러오는 중…</p></div>`); return; }
  if (A.pub === null) { paint(main, `<div class="card hero"><h2>방을 찾을 수 없어요 (${esc(A.code)})</h2>${isT() ? '<a class="btn" href="admin.html">방 목록으로</a>' : ''}</div>`); return; }
  const s = st();
  document.body.className = 'm-' + ((PH[s.phase] || PH.lobby).mood === 'night' ? 'night' : 'lobby');
  paint($('#top'), topHtml());
  const tabs = `<div class="row" style="margin-top:12px"><div class="seg">
      <button class="${A.tab === 'play' ? 'on' : ''}" data-act="tab" data-id="play">진행</button>
      <button class="${A.tab === 'people' ? 'on' : ''}" data-act="tab" data-id="people">참가자 ${Object.keys(players()).length}</button>
      <button class="${A.tab === 'links' ? 'on' : ''}" data-act="tab" data-id="links">참가 링크·QR</button>
      <button class="${A.tab === 'missions' ? 'on' : ''}" data-act="tab" data-id="missions">미션</button>
      ${isT() ? `<button class="${A.tab === 'log' ? 'on' : ''}" data-act="tab" data-id="log">기록</button>` : ''}
    </div><span class="grow"></span>${rejoinBadge()}</div>`;
  let body = '';
  if (A.tab === 'play') body = `<div class="adm-grid"><div>${guideHtml()}${phasePanel()}</div><div>${sidePanel()}</div></div>`;
  else if (A.tab === 'people') body = peopleHtml();
  else if (A.tab === 'links') body = linksHtml();
  else if (A.tab === 'log') body = logHtml();
  else if (A.tab === 'missions') body = missionsHtml();
  paint(main, tabs + rejoinHtml() + body);
  if (A.tab === 'links' || (A.tab === 'play' && s.phase === 'lobby')) document.querySelectorAll('[data-qr]').forEach(el => { if (el.dataset.done !== el.dataset.qr) { qr(el, el.dataset.qr, +el.dataset.size || 150); el.dataset.done = el.dataset.qr; } });
}

function renderHome() {
  document.body.className = 'm-lobby'; paint($('#top'), '');
  const rooms = Object.entries(A.index || {}).sort((a, b) => b[1].at - a[1].at);
  paint($('#main'), `<div class="card"><h2>🕶️ 교실 마피아 — 게임 방</h2>
      <div class="row" style="margin-top:12px"><input class="in grow" id="roomTitle" placeholder="방 이름 (예: 4학년 2반, 선택)" style="max-width:360px"><button class="btn" data-act="createRoom">＋ 새 게임 방 만들기</button>
      <button class="btn soft" data-act="libEdit">🗒 미션 목록 관리</button></div></div>
    <div class="card"><h3>내 게임 방</h3>${rooms.length ? `<table class="tbl">${rooms.map(([c, r]) => `<tr><td><b style="font-size:1.2rem;letter-spacing:2px">${c}</b></td><td>${esc(r.title || '')}</td>
      <td class="small muted">${new Date(r.at).toLocaleString('ko-KR')}</td><td style="text-align:right"><a class="btn sm" href="admin.html?r=${c}">열기</a> <button class="btn sm ghost" data-act="delRoom" data-id="${c}">지우기</button></td></tr>`).join('')}</table>` : '<p class="muted">아직 방이 없어요.</p>'}</div>
    <p class="center small muted"><a href="#" data-act="logout">로그아웃</a></p>`);
}

function topHtml() {
  const s = st(); const ph = PH[s.phase] || PH.lobby;
  const alive = aliveList(A.pub).length, total = Object.keys(players()).length;
  return `<div class="topbar"><div class="in-top" style="max-width:1280px">
    ${isT() ? '<a href="admin.html" class="btn sm ghost">◀ 방 목록</a>' : ''}
    <span class="pill">${isT() ? '👩‍🏫 교사' : '🎤 사회자'}</span>
    <span class="ph">방 ${esc(A.code)} · ${s.round ? s.round + '일째 · ' : ''}${ph.icon} ${esc(ph.name)}</span>
    ${s.paused ? '<span class="pill bad">⏸ 멈춤</span>' : ''}
    <span class="pill">생존 ${alive}/${total}</span>
    <span class="grow"></span>
    ${s.timer ? `<span class="timer" data-timer>${fmt(remaining(s))}</span>
      <button class="btn sm soft" data-act="pause">${s.paused ? '▶ 다시 시작' : '⏸ 멈춤'}</button>
      <button class="btn sm soft" data-act="extend">＋30초</button>` : (s.phase !== 'lobby' && s.phase !== 'end' ? `<button class="btn sm soft" data-act="pause">${s.paused ? '▶ 다시 시작' : '⏸ 멈춤'}</button>` : '')}
  </div></div>`;
}

const GUIDE = {
  lobby: '학생들이 들어오면 설정을 확인하고 게임을 시작하세요.',
  reveal: '학생들이 역할을 확인하는 중이에요. 다 확인하면 공통 미션을 시작하세요.',
  mission: '공통 미션을 진행하세요. 마피아의 비밀 미션 수행을 확인하세요.',
  think: '개인 추리 시간이에요. 끝나면 시민 회의를 시작하세요.',
  meeting: '시민 회의를 진행하세요. 발언 순서를 정해 주세요. 끝나면 투표를 시작하세요.',
  vote: '투표 중이에요. 다 내면 투표를 마감하세요.',
  dayResult: '투표 결과를 발표하세요.',
  night: '밤이에요. 마피아와 의사의 선택을 기다리세요.',
  morning: '다음 날 아침 결과를 발표하세요.',
  limit: '정한 라운드가 끝났어요. 선생님이 끝낼지 더 할지 정해요.',
  end: '게임이 끝났어요. 결과를 함께 보세요.'
};
function guideHtml() {
  const s = st();
  let g = GUIDE[s.phase] || '';
  if (s.phase === 'vote' && !s.open) g = '투표를 마감했어요. 결과를 정리하세요.';
  if (s.phase === 'night' && !s.open) g = '밤 행동이 끝났어요. 결과를 정리하세요.';
  if (s.phase === 'meeting' && remaining(s) === 0) g = '회의를 마무리하세요. 그리고 투표를 시작하세요.';
  if (s.phase === 'mission' && remaining(s) === 0) g = '미션 시간이 끝났어요. 개인 추리로 넘어가세요.';
  if (s.phase === 'limit' && !isT()) g = '정한 라운드가 끝났어요. 선생님의 결정을 기다리세요.';
  return `<div class="guide" style="margin-top:12px">🧭 ${esc(g)}${s.timer && remaining(s) === 0 ? ' <span class="pill bad">⏰ 시간 끝</span>' : ''}</div>`;
}

function missionChooser(label) {
  const opts = commonList().map(m => `<option value="${m.id}" ${A.nextMission === m.id ? 'selected' : ''}>${esc(m.text)}</option>`).join('');
  return `<label class="field"><span>${label || '오늘의 공통 미션'}</span>
    <select class="in" id="missionSel" data-act-change="missionSel"><option value="random" ${A.nextMission === 'random' ? 'selected' : ''}>🎲 무작위로 고르기</option>${opts}<option value="custom" ${A.nextMission === 'custom' ? 'selected' : ''}>✏️ 직접 적기</option></select></label>
    ${A.nextMission === 'custom' ? `<input class="in" id="customMission" data-act-input="customMission" placeholder="예: 옆 친구와 손뼉 맞추기" value="${esc(A.customMission)}">` : ''}
    <p class="small muted" style="margin:4px 0 10px">미션 목록은 <a href="#" data-act="tab" data-id="missions">미션 탭</a>에서 ${isT() ? '고치거나 더할' : '볼'} 수 있어요.</p>`;
}

function phasePanel() {
  const s = st(); const pl = players();
  const card = (h) => `<div class="card">${h}</div>`;
  switch (s.phase) {
    case 'lobby': return settingsHtml() + card(`<button class="btn big" data-act="startGame">🃏 게임 시작 (역할 나누기)</button>`) ;
    case 'reveal': {
      const n = Object.keys(pl).length, ready = Object.values(pl).filter(p => p.ready).length;
      return card(`<h3>역할 확인 ${ready}/${n}명</h3><p class="muted small">아직: ${Object.values(pl).filter(p => !p.ready).map(p => esc(p.name)).join(', ') || '없음'}</p>
        ${rolesSummary()}${missionChooser('1일째 공통 미션')}<button class="btn big" data-act="startDay">☀️ 1일째 낮 시작 (공통 미션)</button>
        <p class="small muted">역할이 안 보이는 학생이 있으면 <a href="#" data-act="resendRoles">역할 다시 보내기</a></p>`);
    }
    case 'mission': return card(`<h3>공통 미션</h3><div class="mission-box">${esc(s.mission)}</div>`) + secretPanel() + card(`<button class="btn big" data-act="toThink">미션 끝 → 🤔 개인 추리 (${cfg().run.times.think}초)</button>`);
    case 'think': return secretPanel() + card(`<button class="btn big" data-act="toMeeting">🗣️ 시민 회의 시작 (${cfg().run.times.meeting}초)</button>`);
    case 'meeting': return card(`<h3>회의 규칙</h3><p>생존자만 말해요 · 말 끊지 않기 · 행동을 근거로 · 사이·감정으로 몰아가지 않기 · 사회자가 발언 순서 정하기</p>`) + secretPanel()
      + card(`<button class="btn big" data-act="toVote">🗳️ 투표 시작 (${cfg().run.times.vote}초)</button>`);
    case 'vote': return votePanel() + secretPanel();
    case 'dayResult': {
      const d = (((A.pub.rounds || {})[s.round] || {}).day || {})['s' + s.stage] || {};
      return card(dayResultView(s.round, s.stage)) + card(d.reason === 'tie' && s.stage === 1
        ? `<button class="btn big" data-act="startRevote">🔁 재투표 시작 (동점자만)</button>`
        : `<button class="btn big dark" data-act="startNight">🌙 밤 시작 (${cfg().run.times.night}초)</button>`) + secretPanel();
    }
    case 'night': return nightPanel();
    case 'morning': {
      const out = (((A.pub.rounds || {})[s.round] || {}).night || {}).out;
      const last = (s.round || 0) >= (s.maxR || cfg().run.maxR);
      return card(`<h3>🌅 아침 발표</h3><p style="font-size:1.3rem">${out ? `지난밤 <b>${esc(pname(A.pub, out))}</b> 탈락` : '지난밤 아무도 탈락하지 않았어요.'}</p>${nightDetail(s.round)}`)
        + card(last ? `<p>정한 ${s.maxR}라운드가 끝났어요.</p><button class="btn big" data-act="toLimit">⏳ 라운드 종료 → 선생님 결정</button>`
          : `${missionChooser(`${s.round + 1}일째 공통 미션`)}<button class="btn big" data-act="startDay">☀️ ${s.round + 1}일째 낮 시작</button>`);
    }
    case 'limit': return card(isT() ? `<h3>⏳ ${s.round}라운드 완료 — 어떻게 할까요?</h3>${statusCounts()}
        <div class="row" style="margin-top:12px"><button class="btn bad grow" data-act="endPreview" data-id="limit">🏁 생존율 판정으로 끝내기</button></div>
        <hr style="border:0;border-top:2px dashed var(--line);margin:16px 0">${missionChooser(`${s.round + 1}일째 공통 미션`)}<button class="btn good big" data-act="extendRound">➕ 1라운드 더 하기</button>`
      : `<h3>⏳ 선생님의 결정을 기다려요</h3><p>끝내기·연장은 선생님만 정할 수 있어요.</p>`);
    case 'end': return card(endView()) + (isT() ? card(`<div class="row"><button class="btn good grow" data-act="restart">🔄 같은 참가자로 새 게임</button><button class="btn soft grow" data-act="tab" data-id="log">📒 기록 보기</button></div>`) : '');
  }
  return '';
}

function statusCounts() {
  const a = aliveCounts(players()), i = initCounts();
  return `<div class="kv"><span>시민 팀</span><b>${a.citizen}/${i.citizen}명 (${pct(a.citizen, i.citizen)}%)</b><span>마피아 팀</span><b>${a.mafia}/${i.mafia}명 (${pct(a.mafia, i.mafia)}%)</b></div>`;
}
function rolesSummary() {
  const c = { citizen: 0, mafia: 0, doctor: 0 }; for (const r of Object.values(A.roles || {})) c[r]++;
  return `<p class="small">배정: 마피아 ${c.mafia} · 의사 ${c.doctor} · 시민 ${c.citizen}</p>`;
}

function secretPanel() {
  const s = st(); const r = s.round; const pl = players();
  const mafia = Object.keys(pl).filter(p => (A.roles || {})[p] === 'mafia').sort((a, b) => byName(pl[a], pl[b]));
  const locked = !['mission', 'think', 'meeting', 'vote', 'dayResult'].includes(s.phase);
  const canConfirm = iAmConfirmer() && !locked;
  const mode = cfg().run.confirm === 'joint' ? '사회자·교사 공동 확인 (한 명만 확인해도 성공)' : '사회자 단독 확인';
  const rows = mafia.map(p => {
    const x = (A.sec && A.sec[p] && A.sec[p][r]) || {};
    const ok = x.ok || {};
    const mine = !!ok[myWho()];
    const success = Object.keys(ok).length > 0;
    const who = Object.entries(ok).map(([w, v]) => `${w === 'teacher' ? '교사' : '사회자'} ${new Date(v.at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`).join(', ');
    if (!pl[p].alive) return `<tr class="muted"><td>${esc(pl[p].name)}</td><td colspan="3">탈락</td></tr>`;
    const canSwap = !locked && !success && x.m;
    return `<tr><td><b>${esc(pl[p].name)}</b></td><td>${x.m ? esc(x.m) + ` <span class="pill">${MISSIONS.LV_NAME[x.lv] || ''}</span>` : '<span class="muted">미션 없음</span>'}
      ${canSwap ? `<div><select class="num" style="width:auto;max-width:260px;font-size:.85rem;margin-top:4px" id="swap_${p}" data-act-change="swapSecret" data-id="${p}"><option value="">↻ 다른 미션으로 바꾸기</option>${secretList().filter(m => m.id !== x.id).map(m => `<option value="${m.id}">${esc(m.text)} (${MISSIONS.LV_NAME[m.lv] || ''})</option>`).join('')}</select></div>` : ''}</td>
      <td>${success ? `<span class="pill good">공격권 획득</span><div class="small muted">${who}</div>` : '<span class="pill">미확인</span>'}</td>
      <td style="text-align:right">${canConfirm && x.m ? (mine ? `<button class="btn sm ghost" data-act="unconfirm" data-id="${p}">확인 취소</button>` : `<button class="btn sm good" data-act="confirm" data-id="${p}">✔ 확인</button>`) : ''}</td></tr>`;
  }).join('');
  const nAtk = attackersOf(r, pl).length;
  const missing = mafia.some(p => pl[p].alive && !(A.sec && A.sec[p] && A.sec[p][r] && A.sec[p][r].m));
  return `<div class="card"><div class="row"><h3 class="grow">🤫 마피아 비밀 미션 (${r}일째)</h3><span class="pill info">오늘 밤 공격권 ${nAtk}명</span></div>
    <p class="small muted">${mode}${locked ? ' · 밤이 시작되어 더 바꿀 수 없어요' : ''}${!iAmConfirmer() ? ' · 이 모드에서는 사회자가 확인해요' : ''}</p>
    <table class="tbl">${rows}</table>${missing ? `<p class="small"><a href="#" data-act="resendSecrets">비밀 미션 다시 보내기</a></p>` : ''}</div>`;
}

function votePanel() {
  const s = st(); const pl = players();
  const got = (A.dv && A.dv[s.stage]) || {};
  const alive = aliveList(A.pub);
  const miss = unvoted();
  const counts = {}; for (const t of Object.values(got)) counts[t] = (counts[t] || 0) + 1;
  return `<div class="card"><h3>${s.stage === 2 ? '🔁 재투표' : '🗳️ 낮 투표'} — 제출 ${Object.keys(got).length}/${alive.length}명</h3>
    ${s.stage === 2 ? `<p>후보: ${Object.keys(s.cands || {}).map(id => `<b>${esc(pname(A.pub, id))}</b>`).join(', ')}</p>` : ''}
    <p class="small">아직 안 낸 학생: ${miss.length ? miss.map(p => `<span class="pill bad">${esc(p.name)}</span>`).join(' ') : '<span class="pill good">모두 냈어요</span>'}</p>
    <details style="margin-top:8px"><summary>지금까지 득표 보기 (화면 공유 주의)</summary><table class="tbl">${Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([id, n]) => `<tr><td>${esc(pname(A.pub, id))}</td><td>${n}표</td></tr>`).join('') || '<tr><td class="muted">아직 없음</td></tr>'}</table></details>
    <div style="margin-top:12px">${s.open ? `<button class="btn big bad" data-act="closeVote">투표 마감하고 결과 보기</button>` : `<button class="btn big" data-act="tallyVote">결과 정리하기</button>`}</div></div>`;
}

function dayResultView(r, stage) {
  const d = (((A.pub.rounds || {})[r] || {}).day || {})['s' + stage];
  if (!d) return '<p>결과 없음</p>';
  const rows = Object.entries(d.tally || {}).sort((a, b) => b[1] - a[1]);
  const max = rows.length ? rows[0][1] : 1;
  const head = { top: `<b>${esc(pname(A.pub, d.out))}</b> 탈락`, tie: '동점 → 재투표', tie2: '재투표도 동점 → 아무도 탈락하지 않음', novote: '유효표 없음 → 아무도 탈락하지 않음' }[d.reason];
  return `<h3>📢 ${stage === 2 ? '재투표' : '투표'} 결과 (${d.n || 0}표)</h3><p style="font-size:1.3rem">${head}</p>
    <table class="tbl">${rows.map(([id, n]) => `<tr><td style="width:30%">${esc(pname(A.pub, id))}</td><td><div class="bar" style="width:${n / max * 100}%"></div></td><td>${n}표</td></tr>`).join('')}</table>`;
}

function nightPanel() {
  const s = st(); const pl = players();
  const atk = attackersOf(s.round, pl); const doc = doctorOf(pl);
  const nv = A.nv || {};
  const mafiaAlive = Object.keys(pl).filter(p => pl[p].alive && (A.roles || {})[p] === 'mafia');
  return `<div class="card"><h3>🌙 밤 행동 현황</h3>
    <p>🕶️ 공격권 있는 마피아 ${atk.length}명 ${atk.length ? '' : '→ 오늘 밤은 공격이 없어요'}</p>
    <table class="tbl">${mafiaAlive.map(p => `<tr><td>${esc(pl[p].name)}</td><td>${atk.includes(p) ? (nv.m && nv.m[p] ? `<span class="pill good">골랐어요</span> <span class="small muted">→ ${esc(pname(A.pub, nv.m[p]))}</span>` : '<span class="pill bad">아직</span>') : '<span class="pill">공격권 없음</span>'}</td></tr>`).join('')}</table>
    <p style="margin-top:10px">🩺 의사: ${!cfg().roles.doctor && !Object.values(A.roles || {}).includes('doctor') ? '없음 (꺼짐)' : doc ? (nv.d && nv.d[doc] ? `<span class="pill good">골랐어요</span> <span class="small muted">→ ${esc(pname(A.pub, nv.d[doc]))}</span>` : '<span class="pill bad">아직</span>') : '탈락 (보호 없음)'}</p>
    <div style="margin-top:12px">${s.open ? `<button class="btn big dark" data-act="closeNight">밤 마감 → 🌅 아침 발표</button>` : `<button class="btn big" data-act="resolveNight">밤 결과 정리하기</button>`}</div></div>`;
}
function nightDetail(r) {
  const n = A.log && A.log['r' + r] && A.log['r' + r].night;
  if (!n) return '';
  return `<details><summary class="small">밤 판정 자세히 (관리자만)</summary><p class="small">공격 대상: ${n.target ? esc(pname(A.pub, n.target)) : '없음'}${n.tieBreak ? ' (동점 → 무작위)' : ''} · 보호: ${n.protect ? esc(pname(A.pub, n.protect)) : '없음'} · ${n.saved ? '보호 성공!' : ''}</p></details>`;
}

function endView() {
  const e = A.pub.end; if (!e) return '';
  const pl = players();
  return `<div class="hero"><div class="ic">🏁</div><h2>${WINNER_TEXT[e.winner]}</h2><p class="muted">${END_METHOD[e.method]} · ${e.round}일째</p>
    <p>남은 인원 — 시민 팀 ${e.alive.citizen}/${e.init.citizen}명 · 마피아 팀 ${e.alive.mafia}/${e.init.mafia}명</p>
    ${e.rate ? `<p>생존율 — 시민 ${e.rate.citizen}% · 마피아 ${e.rate.mafia}%</p>` : ''}</div>
    <div class="names">${Object.entries(pl).sort((a, b) => byName(a[1], b[1])).map(([id, p]) => `<span class="n ${p.alive ? '' : 'dead'}"><span class="pill ${e.roles[id]}">${Logic.ROLES[e.roles[id]] ? Logic.ROLES[e.roles[id]].name : '?'}</span> ${esc(p.name)}</span>`).join('')}</div>`;
}

function sidePanel() {
  const s = st();
  let h = '';
  if (s.phase === 'lobby') h += linksHtml(true);
  h += `<div class="card"><h3>📺 TV 안내 문구</h3><div class="row" style="margin-top:8px">${TV_MSGS.map(m => `<button class="btn sm soft" data-act="msg" data-id="${esc(m)}">${esc(m)}</button>`).join('')}
    ${s.msg ? `<button class="btn sm bad" data-act="msgOff">문구 끄기</button>` : ''}</div>${s.msg ? `<p class="small">지금 TV: <b>${esc(s.msg.text)}</b></p>` : ''}</div>`;
  h += miniPeople();
  if (isT() && s.phase !== 'lobby' && s.phase !== 'end') {
    h += `<div class="card"><h3>👩‍🏫 선생님 도구</h3><div class="row" style="margin-top:8px">
      <button class="btn sm bad" data-act="endPreview" data-id="manual">🏁 지금 게임 끝내기</button>
      <button class="btn sm soft" data-act="tab" data-id="people">🛠 생존 상태 고치기</button></div>
      <p class="small muted">끝내기 전에 판정 결과를 먼저 보여 줘요.</p></div>`;
  }
  return h;
}

function miniPeople() {
  const s = st(); const pl = players();
  const list = Object.entries(pl).map(([id, p]) => ({ id, ...p })).sort(byName);
  const pres = A.presence || {};
  const off = list.filter(p => !pres[p.id]);
  return `<div class="card"><div class="row"><h3 class="grow">👥 참가자 ${list.length}명</h3>
    <button class="btn sm ghost" data-act="toggleRoles">${A.showRoles ? '🙈 역할 숨기기' : '👁 역할 보기'}</button></div>
    ${off.length ? `<p class="small">📴 연결 끊김: ${off.map(p => esc(p.name)).join(', ')}</p>` : ''}
    <div class="names" style="margin-top:8px">${list.map(p => `<span class="n ${p.alive ? '' : 'dead'}"><span class="dot ${pres[p.id] ? 'on' : ''}"></span>${esc(p.name)}${A.showRoles && A.roles && A.roles[p.id] ? ` <span class="pill ${A.roles[p.id]}">${Logic.ROLES[A.roles[p.id]].name}</span>` : ''}${s.phase === 'reveal' && p.ready ? ' ✔' : ''}</span>`).join('')}</div></div>`;
}

function peopleHtml() {
  const s = st(); const pl = players(); const c = cfg();
  const list = Object.entries(pl).map(([id, p]) => ({ id, ...p })).sort(byName);
  const pres = A.presence || {};
  const manual = s.phase === 'lobby' && c.roles.manual && isT();
  const voted = s.phase === 'vote' ? ((A.dv && A.dv[s.stage]) || {}) : null;
  return `<div class="card"><div class="row"><h3 class="grow">참가자 ${list.length}명</h3><button class="btn sm ghost" data-act="toggleRoles">${A.showRoles ? '🙈 역할 숨기기' : '👁 역할 보기'}</button></div>
    <table class="tbl"><tr><th>이름</th><th>접속</th><th>역할</th><th>상태</th><th></th></tr>${list.map(p => `<tr>
      <td><b>${esc(p.name)}</b></td><td><span class="dot ${pres[p.id] ? 'on' : ''}"></span>${pres[p.id] ? '접속' : '끊김'}</td>
      <td>${s.phase === 'lobby' ? (isT() ? `<select class="num" style="width:auto" data-act-change="manualRole" data-id="${p.id}">${['', 'citizen', 'mafia', 'doctor'].map(r => `<option value="${r}" ${((c.roles.manual || {})[p.id] || '') === r ? 'selected' : ''}>${r ? Logic.ROLES[r].name + ' 지정' : '자동'}</option>`).join('')}</select>` : ((c.roles.manual || {})[p.id] ? '지정됨' : '자동'))
        : (A.showRoles && A.roles && A.roles[p.id] ? `<span class="pill ${A.roles[p.id]}">${Logic.ROLES[A.roles[p.id]].name}</span>` : '<span class="muted">•••</span>')}</td>
      <td>${p.alive ? '<span class="pill good">생존</span>' : `<span class="pill bad">탈락${p.out ? ` (${p.out.r}일째 ${p.out.t === 'day' ? '낮' : p.out.t === 'night' ? '밤' : '수정'})` : ''}</span>`}
        ${s.phase === 'reveal' ? (p.ready ? ' ✔ 확인' : ' 확인 전') : ''}${voted ? (voted[p.id] ? ' 🗳️' : p.alive ? ' <span class="small muted">미투표</span>' : '') : ''}</td>
      <td style="text-align:right">${s.phase === 'lobby' ? `<button class="btn sm ghost" data-act="removePlayer" data-id="${p.id}">빼기</button>` : (isT() && s.phase !== 'end' ? `<button class="btn sm ghost" data-act="toggleAlive" data-id="${p.id}">${p.alive ? '탈락으로' : '생존으로'}</button>` : '')}</td></tr>`).join('')}</table>
    ${manual ? '' : ''}<p class="small muted">학생이 다른 기기로 다시 들어오면 위쪽에 "다시 들어가기 요청"이 떠요. 같은 기기로 다시 열면 자동으로 이어져요.</p></div>`;
}

function rejoinBadge() { const n = Object.keys(A.rejoin || {}).length; return n ? `<span class="pill bad">🔁 다시 들어가기 요청 ${n}</span>` : ''; }
function rejoinHtml() {
  const rq = Object.entries(A.rejoin || {}); if (!rq.length) return '';
  return `<div class="card" style="border-color:var(--bad)"><h3>🔁 다시 들어가기 요청</h3><table class="tbl">${rq.map(([uid, x]) => {
    const pid = (A.names || {})[nameKey(x.name)]; const p = pid && players()[pid];
    return `<tr><td><b>${esc(x.name)}</b></td><td>${p ? `기존 참가자 <b>${esc(p.name)}</b>(으)로 연결` : '<span class="muted">같은 이름이 없어요</span>'}</td>
      <td style="text-align:right">${p ? `<button class="btn sm good" data-act="approve" data-id="${uid}">연결하기</button>` : ''} <button class="btn sm ghost" data-act="reject" data-id="${uid}">거절</button></td></tr>`;
  }).join('')}</table><p class="small muted">본인이 맞는지 꼭 확인하고 연결해 주세요. 연결하면 예전 기기는 더 이상 쓸 수 없어요.</p></div>`;
}

function linksHtml(compact) {
  const c = cfg();
  const showHost = isT() && A.meta && A.meta.hostKey;
  const blocks = [
    `<div class="lk"><b>학생 참가</b><div class="q" data-qr="${esc(studentUrl(A.code))}" data-size="${compact ? 140 : 180}"></div><div style="font-size:1.8rem;letter-spacing:4px;font-family:Maplestory">${esc(A.code)}</div><code>${esc(studentUrl(A.code))}</code></div>`,
    `<div class="lk"><b>교실 TV 화면</b><div class="q" data-qr="${esc(tvUrl(A.code))}" data-size="${compact ? 110 : 160}"></div><code>${esc(tvUrl(A.code))}</code><a class="btn sm" href="${esc(tvUrl(A.code))}" target="_blank">TV 화면 열기</a></div>`
  ];
  if (showHost && (!compact || c.run.host === 'student')) blocks.push(`<div class="lk"><b>🎤 학생 사회자 링크</b><div class="q" data-qr="${esc(hostUrl(A.code, A.meta.hostKey))}" data-size="${compact ? 110 : 160}"></div>
    <p class="small">사회자 학생만 찍게 해 주세요. (역할을 모두 볼 수 있어요)</p><button class="btn sm ghost" data-act="newHostKey">링크 새로 만들기</button></div>`);
  return `<div class="card"><h3>🔗 참가 링크·QR</h3><div class="links" style="margin-top:10px">${blocks.join('')}</div>
    ${isT() ? '<p class="small muted" style="margin-top:8px">선생님은 어느 기기에서든 이 주소(admin.html)에 교사 계정으로 로그인하면 같은 방을 관리할 수 있어요.</p>' : ''}</div>`;
}

function settingsHtml() {
  const c = cfg(); const n = Object.keys(players()).length;
  const rec = Logic.recommendMafia(n);
  const m = c.roles.mafia || rec;
  const d = c.roles.doctor ? 1 : 0;
  const err = n ? Logic.checkRoleSetup(n, m, c.roles.doctor, c.roles.manual || {}) : '참가자를 기다리는 중이에요.';
  const ro = !isT();
  const seg = (path, cur, opts, dis) => `<div class="seg">${opts.map(([v, l]) => `<button class="${cur === v ? 'on' : ''}" data-act="cfg" data-path="${path}" data-val='${JSON.stringify(v)}' ${dis ? 'disabled' : ''}>${l}</button>`).join('')}</div>`;
  return `<div class="card"><h3>⚙️ 게임 설정</h3>
    <div class="kv" style="margin-top:10px">
      <span>참가자</span><b>${n}명</b>
      <span>마피아 수</span><span class="row"><input class="num" type="number" min="1" max="15" id="mafiaN" value="${m}" ${ro ? 'disabled' : ''} data-act-change="mafiaN"> <span class="small muted">추천 ${rec}명${c.roles.mafia ? ` · <a href="#" data-act="mafiaAuto">추천대로</a>` : ' (자동)'}</span></span>
      <span>의사</span>${seg('roles/doctor', !!c.roles.doctor, [[true, 'ON'], [false, 'OFF']], ro)}
      <span>역할 구성</span><span>마피아 ${m} · 의사 ${d} · 시민 ${Math.max(0, n - m - d)}</span>
      <span>역할 배정</span><span class="small">자동(무작위)${isT() ? ' · 특정 학생 지정은 <a href="#" data-act="tab" data-id="people">참가자 탭</a>에서' : ''}${Object.keys(c.roles.manual || {}).length ? ` · <b>${Object.keys(c.roles.manual).length}명 지정됨</b>` : ''}</span>
      <span>미션 확인</span>${seg('run/confirm', c.run.confirm, [['single', '사회자 단독'], ['joint', '사회자·교사 공동']], ro)}
      <span>사회자</span>${seg('run/host', c.run.host, [['teacher', '교사'], ['student', '학생']], ro)}
      <span>비밀 미션 난이도</span><select class="num" style="width:auto" id="diffSel" data-act-change="diff">${Object.entries(MISSIONS.DIFF).map(([k, v]) => `<option value="${k}" ${c.run.diff === k ? 'selected' : ''}>${v.name}</option>`).join('')}</select>
      <span>최대 라운드</span><span class="row"><input class="num" type="number" min="1" max="20" id="maxR" value="${c.run.maxR}" ${ro ? 'disabled' : ''} data-act-change="maxR"> 라운드</span>
    </div>
    ${ro ? '<p class="small muted">역할·라운드 설정은 선생님만 바꿀 수 있어요.</p>' : ''}
    <details style="margin-top:10px" open><summary>⏱ 단계별 시간 (초)</summary><div class="kv" style="margin-top:8px">${Object.keys(DEFAULT_TIMES).map(k => `<span>${TIME_NAMES[k]}</span><input class="num" type="number" min="5" max="900" id="t_${k}" value="${c.run.times[k]}" data-act-change="time" data-id="${k}">`).join('')}</div></details>
    ${err ? `<p class="warn" style="margin-top:10px">${esc(err)}</p>` : ''}
    ${c.run.host === 'student' && isT() ? '<p class="small" style="margin-top:8px">🎤 학생 사회자는 오른쪽 "학생 사회자 링크" QR로 들어와요. 사회자는 참가 인원에 들어가지 않아요.</p>' : ''}</div>`;
}

function logHtml() {
  if (!isT()) return '';
  const log = A.log || {}; const pl = players();
  const nm = id => id ? esc(pname(A.pub, id)) : '-';
  const rounds = Object.keys(log).filter(k => /^r\d+$/.test(k)).sort((a, b) => +a.slice(1) - +b.slice(1));
  const g = log.game;
  const preds = A.pred || {};
  const roles = (A.pub.end && A.pub.end.roles) || A.roles || {};
  const hist = Object.entries(log.history || {}).sort((a, b) => b[0].localeCompare(a[0]));
  return `<div class="card"><div class="row"><h3 class="grow">📒 운영 기록</h3><button class="btn sm soft" data-act="exportLog">⬇️ 기록 파일 받기 (JSON)</button></div>
    ${g ? `<p>참가 ${g.n}명 · 마피아 ${g.init.mafia} · 시민 팀 ${g.init.citizen} (의사 ${g.doctor ? 'ON' : 'OFF'}) · 시작 ${new Date(g.at).toLocaleTimeString('ko-KR')}</p>` : '<p class="muted">아직 게임을 시작하지 않았어요.</p>'}
    ${log.end ? `<p><b>${WINNER_TEXT[log.end.winner]}</b> · ${END_METHOD[log.end.method]} · ${log.end.round}일째 · 남은 시민 팀 ${log.end.alive.citizen} / 마피아 ${log.end.alive.mafia}${log.end.rate ? ` · 생존율 시민 ${log.end.rate.citizen}% / 마피아 ${log.end.rate.mafia}%` : ''}</p>` : ''}
    <div style="overflow:auto"><table class="tbl"><tr><th>날</th><th>공통 미션</th><th>비밀 미션 (성공 여부·확인자)</th><th>낮 투표</th><th>밤</th><th>생존 (시민/마피아)</th></tr>
    ${rounds.map(k => { const x = log[k];
      const sec = Object.entries(x.secret || {}).map(([p, v]) => `${nm(p)}: ${esc(v.m)} ${v.success ? '✅' : '❌'}${v.ok ? ' (' + Object.keys(v.ok).map(w => w === 'teacher' ? '교사' : '사회자').join('·') + ')' : ''}`).join('<br>');
      const day = ['s1', 's2'].filter(s => x.day && x.day[s]).map(s => `${s === 's2' ? '재투표: ' : ''}${Object.entries(x.day[s].tally || {}).map(([p, n]) => `${nm(p)} ${n}`).join(', ') || '표 없음'} → ${x.day[s].out ? nm(x.day[s].out) + ' 탈락' : x.day[s].reason === 'tie' ? '동점' : '탈락 없음'}`).join('<br>');
      const ni = x.night ? `공격 ${nm(x.night.target)} · 보호 ${nm(x.night.protect)} → ${x.night.out ? nm(x.night.out) + ' 탈락' : '탈락 없음'}` : '';
      return `<tr><td>${k.slice(1)}</td><td class="small">${esc(x.mission || '')}</td><td class="small">${sec}</td><td class="small">${day}</td><td class="small">${ni}</td><td>${x.alive ? x.alive.citizen + '/' + x.alive.mafia : ''}</td></tr>`; }).join('')}</table></div></div>
    <div class="card"><h3>👻 관전자 예측</h3>${Object.keys(preds).length ? `<table class="tbl">${Object.entries(preds).map(([p, x]) => {
      const rs = Object.keys(x).filter(k => /^r\d+$/.test(k)).sort((a, b) => +a.slice(1) - +b.slice(1));
      return `<tr><td><b>${nm(p)}</b></td><td class="small">${rs.map(k => `${k.slice(1)}일째: ${Object.keys(x[k].t || {}).map(id => `${nm(id)}${A.pub.end ? (roles[id] === 'mafia' ? '✔' : '✘') : ''}`).join(', ') || '없음'}${x[k].why ? ` <span class="muted">"${esc(x[k].why)}"</span>` : ''}`).join('<br>')}</td><td class="small muted">변경 ${Object.keys(x.log || {}).length}회</td></tr>`;
    }).join('')}</table>` : '<p class="muted">아직 예측이 없어요.</p>'}${A.pub.end ? '' : '<p class="small muted">✔/✘ 정답 비교는 게임이 끝나면 보여요.</p>'}</div>
    ${hist.length ? `<div class="card"><h3>지난 게임</h3>${hist.map(([k, h]) => `<p class="small">${new Date(+k.slice(1)).toLocaleString('ko-KR')} — ${h.end ? `${WINNER_TEXT[h.end.winner]} (${END_METHOD[h.end.method]}, ${h.end.round}일째)` : '끝나기 전 새 게임'}</p>`).join('')}</div>` : ''}`;
}
function exportLog() {
  const data = { room: A.code, exportedAt: new Date().toISOString(), players: players(), log: A.log, pred: A.pred, end: A.pub.end || null };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `mafia-${A.code}-${Date.now()}.json`; a.click();
}

/* ---------- 버튼 ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b || b.tagName === 'SELECT' || b.tagName === 'INPUT') return;
  const a = b.dataset.act, id = b.dataset.id;
  if (a === 'closeModal') { if (e.target === b || b.tagName === 'BUTTON') closeModal(); return; }
  if (b.tagName === 'A') e.preventDefault();
  if (b.disabled) return;
  const act = {
    login, createRoom, logout: () => DB.logout().then(() => location.reload()), delRoom: () => deleteRoom(id),
    tab: () => { A.tab = id; syncRound(); render(); }, toggleRoles: () => { A.showRoles = !A.showRoles; render(); },
    startGame, startDay: () => startDay(false), extendRound: () => startDay(true), toThink, toMeeting, toVote,
    closeVote: () => closeVote(false), closeVoteForce: () => closeVote(true), tallyVote, startRevote, startNight,
    closeNight: () => closeNight(false), closeNightForce: () => closeNight(true), resolveNight, toLimit: nextDayOrLimit,
    endPreview: () => endPreview(id), endConfirm: () => endConfirm(id), restart,
    pause: pauseToggle, extend, msg: () => setMsg(id), msgOff: () => setMsg(null),
    confirm: () => confirmMission(id, true), unconfirm: () => confirmMission(id, false),
    removePlayer: () => removePlayer(id), approve: () => approveRejoin(id), reject: () => rejectRejoin(id), toggleAlive: () => toggleAlive(id),
    newHostKey, resendSecrets, resendRoles, exportLog,
    libEdit: () => { A.view = 'libEdit'; render(); }, home: () => { A.view = 'home'; render(); },
    mTag: () => toggleTag(b.dataset.kind, id, b.dataset.tag), mDel: () => delMission(b.dataset.kind, id),
    mAdd: () => addMission(b.dataset.kind), mReset: resetLib, mMove: () => moveMission(b.dataset.kind, id, +b.dataset.dir),
    mafiaAuto: () => setCfg('roles/mafia', null),
    cfg: () => setCfg(b.dataset.path, JSON.parse(b.dataset.val))
  }[a];
  if (act) act();
});
document.addEventListener('change', e => {
  const el = e.target; const a = el.dataset.actChange; if (!a) return;
  if (a === 'missionSel') { A.nextMission = el.value; render(); }
  else if (a === 'mafiaN') { const v = Math.max(1, parseInt(el.value, 10) || 1); setCfg('roles/mafia', v); }
  else if (a === 'maxR') { const v = Math.max(1, parseInt(el.value, 10) || 5); setCfg('run/maxR', v); }
  else if (a === 'time') { const v = Math.max(5, parseInt(el.value, 10) || DEFAULT_TIMES[el.dataset.id]); setCfg('run/times/' + el.dataset.id, v); }
  else if (a === 'diff') setCfg('run/diff', el.value);
  else if (a === 'manualRole') setCfg('roles/manual/' + el.dataset.id, el.value || null);
  else if (a === 'mText') { const v = el.value.trim(); if (v) saveMission(el.dataset.kind, el.dataset.id, { text: v.slice(0, 80) }); else { el.value = (libNow()[el.dataset.kind][el.dataset.id] || {}).text || ''; toast('미션 내용을 비울 수 없어요.'); } }
  else if (a === 'mOn') saveMission(el.dataset.kind, el.dataset.id, { on: el.checked });
  else if (a === 'mLv') saveMission('secret', el.dataset.id, { lv: +el.value });
  else if (a === 'newLv') A.newLv = +el.value;
  else if (a === 'swapSecret') swapSecret(el.dataset.id, el.value);
});
document.addEventListener('input', e => { if (e.target.dataset.actInput === 'customMission') A.customMission = e.target.value; });
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'pw') login(); });
