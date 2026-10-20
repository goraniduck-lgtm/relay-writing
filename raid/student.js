/* 그림자 용 레이드 — 학생 태블릿 화면 */
(function(){
const $ = s => document.querySelector(s);
const app = $('#app'), overlay = $('#overlay'), topright = $('#topright');
const urlClass = new URLSearchParams(location.search).get('class');
const saved = ls.get('raid-me', null);

const S = {
  classes: [], classesLoaded: false,
  cid: urlClass || (saved && saved.cid) || null,
  gi: saved && (!urlClass || saved.cid === urlClass) ? saved.gi : null,
  no: saved && (!urlClass || saved.cid === urlClass) ? saved.no : null,
  game: null, gameLoaded: false,
  pickGi: null, pickNo: null, nameDraft: '',
  choice: null, draft: '', mid: null, viewKey: '', modal: null, endTab: 'story', endPage: 0, retry: {}, retryDraft: {}
};
let gameRef = null;

/* ---------- 읽기 도우미 ---------- */
const cls = () => S.classes.find(c => c.id === S.cid);
const G = () => S.game || {};
const status = () => G().status || 'lobby';
const grp = () => (G().groups && G().groups[GK(S.gi)]) || {};
const gpath = () => `games/${S.cid}/groups/${GK(S.gi)}`;
const gref = p => ref(gpath() + (p ? '/' + p : ''));
const meM = () => S.no != null && grp().members ? grp().members[NK(S.no)] : null;
const mySub = () => { const m = meM(); return m && m.job ? JOBS[m.job] : null; };
const jobOf = no => { const m = grp().members && grp().members[NK(no)]; return m && m.job; };
const nameOf = no => { const m = grp().members && grp().members[NK(no)]; return `${no}번${m && m.name ? ' ' + m.name : ''}`; };
const fx = () => grp().fx || {};
function turnNo(){
  const ms = membersOf(grp()); if (!ms.length) return null;
  const t = grp().turn; return ms.some(m => m.no === t) ? t : ms[0].no;
}
const isMyTurn = () => S.no != null && turnNo() === S.no;
const energy = () => grp().energy == null ? 5 : grp().energy;
const patternOn = t => { const p = G().pattern; return p && p.type === t && now() < p.until; };

/* ---------- 연결 ---------- */
function watchGame(){
  if (gameRef) gameRef.off();
  S.game = null; S.gameLoaded = false;
  if (!S.cid) return;
  gameRef = ref('games/' + S.cid);
  gameRef.on('value', s => { S.game = s.val(); S.gameLoaded = true; render(); }, () => toast('게임을 불러오지 못했어요'));
}
function saveMe(){ ls.set('raid-me', { cid: S.cid, gi: S.gi, no: S.no }); }
function leave(){
  if (S.no != null && S.gi != null && status() === 'lobby') gref('members/' + NK(S.no)).remove().catch(() => {});
  S.gi = null; S.no = null; S.pickGi = null; S.pickNo = null; ls.del('raid-me'); render();
}

/* ---------- 입장 ---------- */
async function join(){
  const gi = S.pickGi, no = S.pickNo; if (gi == null || no == null) return;
  const name = S.nameDraft.trim().slice(0, 8);
  const p = `games/${S.cid}/groups/${GK(gi)}`;
  try {
    await ref(p + '/members/' + NK(no)).set({ name, job: null, at: now() });
    await ref(p + '/energy').transaction(cur => cur == null ? 5 : undefined);
    S.gi = gi; S.no = no; S.joinedAt = Date.now(); saveMe(); render();
  } catch (e) { toast('들어가지 못했어요. 선생님께 알려 주세요.'); }
}
function chooseJob(job){
  const taken = membersOf(grp()).some(m => m.no !== S.no && m.job === job);
  if (taken) { toast('다른 친구가 고른 직업이에요'); return; }
  gref('members/' + NK(S.no) + '/job').set(job).catch(fail());
}

/* ---------- 기력 ---------- */
function energyAdd(delta){
  return gref('energy').transaction(cur => Math.max(0, Math.min(MAX_ENERGY, (cur == null ? 5 : cur) + delta)))
    .then(r => { if (delta < 0 && r.committed && r.snapshot.val() === 0) return gref('trapUntil').set(now() + MS_TRAP); })
    .catch(fail());
}
async function revive(){
  const t = grp().trapUntil; if (!t) return;
  if (!(await claim(`${gpath()}/locks/trap${t}`))) return;
  const next = nextAfter(turnNo());
  gref().update({ energy: 2, trapUntil: null, mission: null, turn: next, last: '그림자에서 빠져나왔어요' }).catch(fail());
}

/* ---------- 차례 ---------- */
function nextAfter(cur){
  const ms = membersOf(grp()); if (!ms.length) return null;
  if (fx().lost) {
    const min = Math.min(...ms.map(m => sealCount(grp(), m.no)));
    return ms.find(m => sealCount(grp(), m.no) === min).no;
  }
  const i = ms.findIndex(m => m.no === cur);
  return ms[(i + 1) % ms.length].no;
}
async function passTurn(){
  const m = grp().mission, key = m ? m.id : 'skip' + now();
  if (!(await claim(`${gpath()}/locks/next_${key}`))) return;
  gref().update({ mission: null, turn: nextAfter(turnNo()), 'fx/lost': null }).catch(fail());
}

/* ---------- 미션 뽑기 ---------- */
function candidates(deck){
  const used = grp().used || {}, sub = DECKS[deck].sub;
  let pool = deckCards(deck);
  if (fx().offline) {
    pool = pool.filter(c => c.kind === 'off');
    if (!pool.length) pool = BANK.filter(c => c.kind === 'off' && DECKS[c.deck].sub === sub);
    if (!pool.length) pool = BANK.filter(c => c.kind === 'off');
  }
  const fresh = pool.filter(c => !used[c.id]);
  return fresh.length ? fresh : pool;
}
function drawMission(deck){
  if (!isMyTurn() || grp().mission) return;
  const pool = candidates(deck); if (!pool.length) { toast('이 덱에 카드가 없어요. 선생님께 알려 주세요.'); return; }
  const c = pick(pool), t = now(), id = newId('m');
  const up = {
    mission: { id, deck: c.deck, card: c.id, by: S.no, at: t, until: t + (c.kind === 'off' ? MS_OFF : MS_ON),
      state: c.kind === 'ev' ? 'event' : 'open', eye: !!fx().eye, lamp: !!fx().lamp },
    ['used/' + c.id]: true,
    last: `${S.no}번 · ${DECKS[c.deck].name} ${c.kind === 'ev' ? '이벤트' : c.kind === 'off' ? '오프라인 미션' : '미션'}`
  };
  if (c.kind !== 'ev') { up['fx/offline'] = null; up['fx/force'] = null; }
  else {
    if (c.ev === 'trap') up['fx/offline'] = true;
    if (c.ev === 'eye') up['fx/eye'] = true;
    if (c.ev === 'lamp') up['fx/lamp'] = true;
    if (c.ev === 'lost') up['fx/lost'] = true;
  }
  gref().update(up).then(() => { if (c.kind === 'ev' && c.ev === 'supply') energyAdd(1); }).catch(fail());
}

/* ---------- 결과 처리 ---------- */
const logHist = (cardId, deck, by, ok, k) => gref('hist').push({ t: now(), card: cardId, deck, by, ok: ok ? 1 : 0, k });
async function resolve(ok){
  const m = grp().mission; if (!m || m.state !== 'open') return;
  if (!(await claim(`${gpath()}/locks/${m.id}`))) return;
  logHist(m.card, m.deck, m.by, ok, 'm');
  const by = m.by, sub = DECKS[m.deck].sub, major = JOBS[jobOf(by)] === sub;
  const st = `games/${S.cid}/stats/${NK(by)}`;
  if (ok) {
    let dmg = major ? 1 : 2; if (m.eye) dmg *= 2;
    const n = membersOf(grp()).length, { max } = sealLimits(n);
    let slot = null;
    try {
      const r = await gref('seals').transaction(cur => {
        cur = cur || {};
        if (Object.values(cur).filter(v => +v === +by).length >= max) return;
        const k = DECKS[m.deck].slots.find(s => cur[s] == null); if (!k) return;
        cur[k] = by; return cur;
      });
      if (r.committed) slot = DECKS[m.deck].slots.find(s => r.snapshot.val() && +r.snapshot.val()[s] === +by) || true;
    } catch (e) {}
    ref('games/' + S.cid + '/bossHp').set(INC(-dmg));
    gref().update({ 'mission/state': 'ok', 'mission/dmg': dmg, 'mission/slot': slot ? 1 : 0,
      'fx/eye': null, 'fx/lamp': null, dmg: INC(dmg), okCount: INC(1),
      last: `${nameOf(by)} 성공! 용에게 ${dmg} 피해` }).catch(fail());
    ref(st).update({ ['d/' + m.deck + '/o']: INC(1), off: INC(major ? 0 : 1), name: (meM() && meM().name) || '' });
    ref('games/' + S.cid + '/feed').push({ t: now(), gi: S.gi, dmg, text: `${nameOf(by)} · ${DECKS[m.deck].name}` });
  } else {
    gref().update({ 'mission/state': 'ng', 'fx/eye': null, 'fx/lamp': null, last: `${nameOf(by)} 미션 실패` }).catch(fail());
    ref(st).update({ ['d/' + m.deck + '/x']: INC(1) });
    energyAdd(-1);
  }
}
function submitAnswer(){
  const m = grp().mission, c = m && card(m.card); if (!c || !isMyTurn()) return;
  let ok = false;
  if (c.type === 'choice') { if (S.choice == null) { toast('답을 골라 주세요'); return; } ok = S.choice === c.a; }
  else if (c.type === 'short' || c.type === 'code') {
    if (!S.draft.trim()) { toast('답을 써 주세요'); return; }
    ok = [c.a, ...(c.accept || [])].some(a => norm(a) === norm(S.draft));
  } else if (c.type === 'measure') {
    const v = parseFloat(S.draft); if (isNaN(v)) { toast('숫자를 써 주세요'); return; }
    ok = v >= c.min && v <= c.max;
  }
  resolve(ok);
}
function giveAdvice(){
  const m = grp().mission; if (!m || m.advice || patternOn('fog')) return;
  gref('mission/advice').transaction(cur => cur ? undefined : S.no).then(r => {
    if (r.committed) ref(`games/${S.cid}/stats/${NK(S.no)}/adv`).set(INC(1));
  }).catch(fail());
}

/* ---------- 배움 회복 ---------- */
function startReview(){
  const m = grp().mission; if (!m || m.state !== 'ng') return;
  const sub = DECKS[m.deck].sub;
  let pool = deckCards(m.deck).filter(c => c.kind === 'on' && c.id !== m.card);
  if (!pool.length) pool = BANK.filter(c => c.kind === 'on' && DECKS[c.deck].sub === sub && c.id !== m.card);
  if (!pool.length) pool = BANK.filter(c => c.kind === 'on' && c.id !== m.card);
  const c = pick(pool);
  S.choice = null; S.draft = '';
  gref('mission').update({ state: 'review', rq: c.id, runtil: now() + MS_ON }).catch(fail());
}
async function answerReview(ok){
  const m = grp().mission; if (!m || m.state !== 'review') return;
  if (!(await claim(`${gpath()}/locks/rv_${m.id}`))) return;
  const rc = card(m.rq); if (rc) logHist(rc.id, rc.deck, m.by, ok, 'r');
  gref('mission/state').set(ok ? 'reviewOk' : 'reviewNg').catch(fail());
  ref(`games/${S.cid}/stats/${NK(m.by)}`).update({ ['d/' + m.deck + (ok ? '/o' : '/x')]: INC(1) });
  if (ok) energyAdd(1);
}
function submitReview(){
  const m = grp().mission, c = m && card(m.rq); if (!c || !isMyTurn()) return;
  let ok;
  if (c.type === 'choice') { if (S.choice == null) { toast('답을 골라 주세요'); return; } ok = S.choice === c.a; }
  else { if (!S.draft.trim()) { toast('답을 써 주세요'); return; } ok = [c.a, ...(c.accept || [])].some(a => norm(a) === norm(S.draft)); }
  answerReview(ok);
}

/* ---------- 갈림길 ---------- */
async function vote(v){
  await gref('votes/' + NK(S.no)).set(v).catch(fail());
}
/* 많이 고른 길로. 같으면 한 번 다시 투표하고, 또 같으면 주사위(홀수 토벌, 짝수 탈출) */
async function settleVotes(){
  const g = grp(), ms = membersOf(g), votes = g.votes || {}, round = g.voteRound || 1;
  if (g.path || g.dice || !ms.length || !ms.every(m => votes[NK(m.no)])) return;
  if (!(await claim(`${gpath()}/locks/cross_r${round}`))) return;
  const f = ms.filter(m => votes[NK(m.no)] === 'fight').length, e = ms.length - f;
  const pathOf = p => ({ path: p, last: p === 'fight' ? '토벌의 길을 골랐어요' : '탈출의 길을 골랐어요' });
  if (f !== e) { gref().update(pathOf(f > e ? 'fight' : 'escape')).catch(fail()); return; }
  if (round === 1) { gref().update({ votes: null, voteRound: 2, last: '동점! 다시 투표해요' }).catch(fail()); return; }
  const face = 1 + Math.floor(Math.random() * 6), p = face % 2 ? 'fight' : 'escape';
  gref().update({ dice: { face, at: now() }, ...pathOf(p), last: `주사위 ${face}! ${p === 'fight' ? '토벌' : '탈출'}의 길로` }).catch(fail());
}

/* ---------- 최종전 ---------- */
function startFight(){
  const g = grp(); if (!canFight(g) || g.done || (g.fightTries || 0) >= FIGHT_TRIES) return;
  const ms = membersOf(g), taken = new Set(), assign = {};
  ms.forEach(m => {
    const major = JOBS[m.job];
    let pool = BANK.filter(c => c.kind === 'on' && DECKS[c.deck].sub !== major && !taken.has(c.id));
    if (!pool.length) pool = BANK.filter(c => c.kind === 'on' && !taken.has(c.id));
    const c = pick(pool); taken.add(c.id); assign[NK(m.no)] = c.id;
  });
  const f = { id: newId('f'), kind: 'fight', at: now(), until: now() + MS_FINAL, assign };
  gref('final').transaction(cur => cur && !cur.closed ? undefined : f).catch(fail());
  gref('last').set('합체 공격 시작!');
}
function fightAnswer(ok){
  const f = grp().final; if (!f) return;
  gref('final/ans/' + NK(S.no)).transaction(cur => cur == null ? (ok ? 1 : 0) : undefined).then(r => {
    const c = card((f.assign || {})[NK(S.no)]); if (r.committed && c) logHist(c.id, c.deck, S.no, ok, 'f');
  }).catch(fail());
}
async function settleFight(){
  const g = grp(), f = g.final; if (!f || f.kind !== 'fight' || f.result) return;
  const keys = Object.keys(f.assign || {}), ans = f.ans || {};
  const all = keys.every(k => ans[k] != null);
  if (!all && now() < f.until + 1500) return;
  if (!(await claim(`${gpath()}/locks/fin_${f.id}`))) return;
  const win = keys.length > 0 && keys.every(k => ans[k] === 1);
  if (win) {
    ref('games/' + S.cid + '/bossHp').set(INC(-DMG.fight));
    gref().update({ 'final/result': 'win', done: 'fight', dmg: INC(DMG.fight), last: '합체 공격 성공! 결정타!' });
    ref('games/' + S.cid + '/feed').push({ t: now(), gi: S.gi, dmg: DMG.fight, text: '합체 공격!', big: 1 });
  } else {
    gref().update({ 'final/result': 'lose', fightTries: INC(1), last: '합체 공격 실패' });
    energyAdd(-2);
  }
}
function startEscape(){
  const g = grp(); if (!canEscape(g) || g.done) return;
  const ms = membersOf(g), subs = shuffle(SUBJ_KEYS);
  const pieces = subs.map((sub, i) => ({ pos: i + 1, sub, q: pick(CLUES.filter(c => c.sub === sub)).id, to: ms[i % ms.length].no }));
  const f = { id: newId('e'), kind: 'escape', at: now(), pieces, stage: 'code', env: pick(ESCAPE_FINAL) };
  gref('final').transaction(cur => cur && !cur.closed ? undefined : f).catch(fail());
  gref('last').set('비밀 통로를 찾는 중');
}
function tryCode(){
  const f = grp().final; if (!f) return;
  const code = Object.values(f.pieces || {}).sort((a, b) => a.pos - b.pos).map(p => (CLUES.find(c => c.id === p.q) || {}).a).join('');
  if (S.draft.replace(/\D/g, '') === code) { S.draft = ''; gref('final/stage').set('envelope').catch(fail()); }
  else { toast('암호가 맞지 않아요. 서로 숫자를 다시 확인해요.'); gref('final/wrong').set(INC(1)); }
}
async function escapeDone(){
  const f = grp().final; if (!f || f.result) return;
  if (!(await claim(`${gpath()}/locks/esc_${f.id}`))) return;
  ref('games/' + S.cid + '/bossHp').set(INC(-DMG.escape));
  gref().update({ 'final/result': 'win', done: 'escape', dmg: INC(DMG.escape), last: '비밀 통로로 탈출! 주민 구조' });
  ref('games/' + S.cid + '/feed').push({ t: now(), gi: S.gi, dmg: DMG.escape, text: '주민 구조!', big: 1 });
}
function closeFinal(){ gref('final/closed').set(true).catch(fail()); }
function retreat(){
  S.modal = null;
  gref().update({ path: 'escape', retreat: true, final: null, last: '용기 있는 후퇴 — 탈출의 길로' }).catch(fail());
}

/* ---------- 포효 ---------- */
function roarAnswer(i){
  const r = G().roar; if (!r) return;
  const q = ROAR.find(x => x.id === r.qid);
  ref(`games/${S.cid}/roar/ans/${NK(S.no)}`).transaction(cur => cur == null ? (i === q.a ? 1 : 0) : undefined).catch(fail());
}

/* =========================================================
   화면
   ========================================================= */
const avatar = (job, extra) => {
  const sub = JOBS[job];
  return `<div class="avatar ${extra || ''}" style="--c:${sub ? SUBJ[sub].color : 'var(--night3)'}">${sub ? JOB_ICON[job] : '?'}</div>`;
};
const hearts = n => `<span class="hearts" aria-label="기력 ${n}">${Array.from({ length: Math.max(5, n) }, (_, i) => `<span class="${i < n ? '' : 'off'}">♥</span>`).join('')}</span>`;
function bossBar(){
  const g = G(), max = g.bossMax || 1, hp = Math.max(0, g.bossHp == null ? max : g.bossHp);
  return `<div class="bossbar"><i style="width:${hp / max * 100}%"></i><span>그림자 용 ${hp} / ${max} · ${phaseOf({ bossHp: hp, bossMax: max })}페이즈</span></div>`;
}

function render(){
  const focusId = document.activeElement && document.activeElement.id;
  renderTop();
  if (!S.classesLoaded) return;
  if (!S.cid || !cls()) { app.innerHTML = viewClassPick(); overlay.innerHTML = ''; return; }
  if (!S.gameLoaded) { app.innerHTML = `<div class="panel"><h2>불러오는 중</h2></div>`; return; }
  if (S.no != null && !meM()) {
    if (Date.now() - (S.joinedAt || 0) < 4000) { app.innerHTML = `<div class="panel"><h2>입장하는 중</h2></div>`; return; }
    S.gi = null; S.no = null; ls.del('raid-me');
  }
  if (S.no == null) { app.innerHTML = S.pickGi == null ? viewGroupPick() : viewNumberPick(); overlay.innerHTML = ''; restore(focusId); return; }
  if (!meM().job) { app.innerHTML = viewJobPick(); overlay.innerHTML = ''; return; }
  const m = grp().mission;
  if ((m && m.id) !== S.mid || (m && m.state) !== S.mstate) { S.mid = m && m.id; S.mstate = m && m.state; S.choice = null; S.draft = ''; }
  app.innerHTML = viewMain();
  overlay.innerHTML = viewOverlay();
  restore(focusId);
}
function restore(id){
  if (!id) return; const el = document.getElementById(id);
  if (el && el.tagName === 'INPUT') { el.focus(); const v = el.value; try { el.setSelectionRange(v.length, v.length); } catch(e){} }
}
function renderTop(){
  const c = cls();
  topright.innerHTML = (c ? `<span class="chip">${esc(c.name)}${S.no != null && S.gi != null ? ` · ${esc(groupName(c, S.gi))} · ${S.no}번` : ''}</span>` : '')
    + (S.no != null ? `<button class="btn ghost" data-act="leave" style="min-height:40px;padding:4px 12px">${status() === 'lobby' ? '나가기' : '다른 번호로'}</button>` : '')
    + (S.cid && S.no == null && !urlClass ? `<button class="btn ghost" data-act="changeClass" style="min-height:40px;padding:4px 12px">반 바꾸기</button>` : '');
}

function viewClassPick(){
  if (!S.classes.length) return `<div class="panel"><h2>아직 열린 반이 없어요</h2><p class="note">선생님이 반을 만들면 여기에 나타나요.</p></div>`;
  return `<div class="parch"><h2>우리 반을 골라요</h2><div class="grid">${S.classes.map(c => `<button class="btn big" data-act="class" data-id="${esc(c.id)}">${esc(c.name)}</button>`).join('')}</div></div>`;
}
function viewGroupPick(){
  const c = cls();
  return `<div class="panel"><div class="title-art" style="aspect-ratio:21/9;border-radius:14px;overflow:hidden;background:linear-gradient(160deg,#3b2a62,#141a30);display:grid;place-items:center;position:relative"><span class="disp" style="font-size:40px;color:var(--gold2);position:absolute">그림자 용 레이드</span>${art('title.png')}</div>
    <h2>우리 모둠을 골라요</h2>
    <div class="grid">${groupsOf(G(), c).map(gr => {
      const ms = membersOf(gr);
      return `<button class="pickcard" data-act="group" data-gi="${gr.gi}"><span class="nm">${esc(groupName(c, gr.gi))}</span><span class="sub">${ms.length ? ms.map(m => m.no + '번').join(', ') : '아직 아무도 없어요'}</span></button>`;
    }).join('')}</div></div>`;
}
function viewNumberPick(){
  const c = cls(), max = c.maxNo || 30, taken = {};
  groupsOf(G(), c).forEach(gr => membersOf(gr).forEach(m => { taken[m.no] = groupName(c, gr.gi); }));
  return `<div class="panel"><div class="row"><button class="btn ghost" data-act="backGroup">← 모둠 다시 고르기</button><h2 class="grow">${esc(groupName(c, S.pickGi))} · 내 번호를 골라요</h2></div>
    <div class="numgrid">${Array.from({ length: max }, (_, i) => i + 1).map(n => `<button data-act="num" data-no="${n}" aria-pressed="${S.pickNo === n}" ${taken[n] ? 'disabled title="' + esc(taken[n]) + '"' : ''}>${n}</button>`).join('')}</div>
    <label class="row"><span>이름(선택)</span><input id="nameIn" maxlength="8" placeholder="안 써도 돼요" value="${esc(S.nameDraft)}" class="grow"></label>
    <button class="btn gold big" data-act="join" ${S.pickNo == null ? 'disabled' : ''}>모험단 입장!</button></div>`;
}
function viewJobPick(){
  const taken = {}; membersOf(grp()).forEach(m => { if (m.job && m.no !== S.no) taken[m.job] = m.no; });
  return `<div class="panel"><h2>나의 직업(전공)을 골라요</h2>
    <p class="note">자신 있는 과목을 골라요. 친구가 그 과목 미션을 할 때 <b>전문가 조언</b>을 해 줄 수 있어요. 전공이 아닌 과목에 성공하면 공격력이 2배예요!</p>
    <div class="jobs">${Object.entries(JOBS).map(([job, sub]) => `<button class="job" data-act="job" data-job="${job}" style="--c:${SUBJ[sub].color}" ${taken[job] ? 'disabled' : ''}>
      <div class="pic"><span class="glyph">${JOB_ICON[job]}</span>${art('job-' + job + '.png')}</div>
      <div class="body"><div class="nm">${esc(SUBJ[sub].jobName)}</div><div class="sub">${esc(SUBJ[sub].name)} 전공 · ${esc(SUBJ[sub].zone)}${taken[job] ? ` · ${taken[job]}번이 골랐어요` : ''}</div></div></button>`).join('')}</div></div>`;
}

function viewMain(){
  const me = meM(), sub = mySub();
  if (status() === 'end' || bossDown(G())) return `<div class="parch endwrap">${viewEnding()}</div>`;
  return `<div class="panel hud"><div class="who">${avatar(me.job)}<div style="min-width:0"><div class="disp" style="font-size:22px">${S.no}번${me.name ? ' ' + esc(me.name) : ''} · ${esc(SUBJ[sub].jobName)}</div><div class="note">${esc(SUBJ[sub].name)} 전공</div></div></div>${hearts(energy())}<div style="grid-column:1/-1">${bossBar()}</div></div>
    ${viewBanners()}
    <div class="layout"><div class="parch">${viewAction()}</div><div class="side">${viewSeals()}${viewMembers()}</div></div>`;
}
function viewBanners(){
  const out = [], f = fx(), p = G().pattern;
  if (p && now() < p.until) out.push(`<div class="banner warn"><b class="disp">${esc(PATTERNS[p.type].name)}</b><span>${esc(PATTERNS[p.type].text)}</span>${p.type === 'fog' ? `<span class="chip" data-until="${p.until}"></span>` : ''}</div>`);
  if (f.force) out.push(`<div class="banner">날개 바람 — 다음 미션은 <b>${esc(SUBJ[f.force].name)}</b> 구역이에요</div>`);
  if (f.offline) out.push(`<div class="banner">다음 미션은 오프라인 미션으로 뽑혀요</div>`);
  if (f.eye) out.push(`<div class="banner">용의 눈 — 다음 미션에 성공하면 피해 2배!</div>`);
  if (f.lamp) out.push(`<div class="banner">이웃의 등불 — 다음 미션에서 다른 모둠 친구 1명에게 힌트를 1번 받을 수 있어요</div>`);
  if (f.lost) out.push(`<div class="banner">길 잃음 — 다음 길잡이는 봉인 칸을 가장 적게 채운 친구예요</div>`);
  return out.join('');
}
function viewSeals(){
  const g = grp();
  return `<div class="panel"><div class="row"><h3 class="grow">봉인 판</h3><span class="note">${Object.keys(g.seals || {}).length}/8</span></div>
    <div class="seals">${SLOTS.map(s => { const v = g.seals && g.seals[s.k];
      return `<div class="seal ${v != null ? 'on' : ''}" style="--c:${SUBJ[s.sub].color}" title="${s.label}"><span class="ico">${sealIconFor(s.k)}</span>${v != null ? `<span class="who">${v}번</span>` : `<span class="lock">${LOCK_ICON}</span>`}<span class="lbl">${s.label}</span></div>`; }).join('')}</div>
    <p class="note">한 사람 ${sealLimits(membersOf(g).length).min}칸 이상, ${sealLimits(membersOf(g).length).max}칸까지</p></div>`;
}
function viewMembers(){
  const g = grp(), t = turnNo(), used = new Set(membersOf(g).map(m => m.job));
  const empty = Object.keys(JOBS).filter(j => !used.has(j));
  return `<div class="panel"><h3>모험단</h3><div class="members">${membersOf(g).map(m => `<div class="member ${m.no === t ? 'turn' : ''}">${avatar(m.job)}<div class="nm"><div>${m.no}번${m.name ? ' ' + esc(m.name) : ''}${m.no === S.no ? ' (나)' : ''}</div><div class="note">${m.job ? esc(SUBJ[JOBS[m.job]].jobName) : '직업 고르는 중'}${m.no === t ? ' · 길잡이' : ''}</div></div><span class="cnt">${sealCount(g, m.no)}</span></div>`).join('')}</div>
    ${empty.length && membersOf(g).length >= 3 ? `<p class="note">빈 전공: ${empty.map(j => SUBJ[JOBS[j]].name).join(', ')} — 누가 성공해도 공격력 2배</p>` : ''}</div>`;
}

function viewAction(){
  const g = grp(), st = status();
  if (st === 'end' || bossDown(G())) return viewEnding();
  if (g.trapUntil && now() < g.trapUntil) return `<div class="trap"><h2>그림자에 갇혔어요!</h2><p>기력이 바닥났어요. 잠시 쉬면 기력 2로 다시 시작해요.</p><div class="timer" data-until="${g.trapUntil}"></div></div>`;
  if (g.trapUntil) { revive(); return `<div class="trap"><h2>그림자에서 빠져나오는 중…</h2></div>`; }
  if (g.final && !g.final.closed) return viewFinal();
  if (st === 'lobby') return `<div><h2>모험 준비 완료!</h2><p class="note">선생님이 1막을 시작하면 첫 길잡이(${turnNo() || '-'}번)가 구역을 골라요.</p></div>`;
  if (st === 'cross') return viewCross();
  const m = g.mission;
  if (m) return viewMission(m);
  return (st === 'act3' ? viewPathBox() : '') + viewZones();
}
function viewZones(){
  const t = turnNo(), f = fx();
  if (!isMyTurn()) return `<div><h2>이번 길잡이: ${nameOf(t)}</h2><p class="note">길잡이가 갈 구역을 고르고 있어요. 함께 의논해 주세요!</p></div>`;
  if (S.subPick === 'kor') return `<div class="row"><button class="btn" data-act="subBack">← 구역 다시 고르기</button><h2 class="grow">문자의 탑 · 어느 층으로 갈까요?</h2></div>
    <div class="subdecks">${['kor_txt', 'kor_voc', 'kor_sp'].map(d => `<button class="subdeck" data-act="deck" data-deck="${d}"><span class="ico">${SEAL_ICON[d]}</span><span>${esc(DECKS[d].name.split(' · ')[1])}</span></button>`).join('')}</div>`;
  return `<div><h2>내가 길잡이! 어느 구역으로 갈까요?</h2><p class="note">전공이 아닌 과목에 성공하면 공격력 2배예요.</p></div>
    <div class="zones">${SUBJ_KEYS.map(k => `<button class="zone" style="--c:${SUBJ[k].color}" data-act="zone" data-sub="${k}" ${f.force && f.force !== k ? 'disabled' : ''}><span class="zart">${ZONE_ART[k]}</span>${art('zone-' + k + '.png')}<div class="lbl"><b>${esc(SUBJ[k].zone)}</b><span>${esc(SUBJ[k].name)}${mySub() === k ? ' · 내 전공' : ' · 공격력 2배'}</span></div></button>`).join('')}</div>
    <button class="btn ghost" data-act="pass" style="align-self:flex-start">차례 넘기기</button>`;
}
function viewQuestion(c, interactive, prefix){
  if (c.type === 'choice') return `<div class="choices">${c.choices.map((t, i) => `<button data-act="${prefix}choice" data-i="${i}" aria-pressed="${S.choice === i}" ${interactive ? '' : 'disabled'}>${i + 1}. ${esc(t)}</button>`).join('')}</div>`;
  if (c.type === 'short' || c.type === 'code' || c.type === 'measure') {
    if (!interactive) return `<p class="note">${c.type === 'measure' ? '길잡이가 잰 값을 입력해요.' : '길잡이가 답을 입력해요.'}</p>`;
    return `<div class="row"><input id="${prefix}ans" class="grow" ${c.type === 'measure' ? 'inputmode="decimal"' : ''} placeholder="${c.type === 'measure' ? '숫자만' : '답'}" value="${esc(S.draft)}" autocomplete="off">${c.unit ? `<span class="disp" style="font-size:22px">${esc(c.unit)}</span>` : ''}</div>`;
  }
  return '';
}
function viewMission(m){
  const c = card(m.card), d = DECKS[m.deck], sub = d.sub, mine = isMyTurn();
  const head = `<div class="head"><span class="tag" style="--c:${SUBJ[sub].color}">${esc(d.name)} · ${c.kind === 'off' ? '오프라인' : c.kind === 'ev' ? '이벤트' : '온라인'}</span><span class="note">길잡이 ${esc(nameOf(m.by))}</span>${m.state === 'open' ? `<span class="timer" data-until="${m.until}"></span>` : ''}</div>`;
  if (m.state === 'event') {
    const e = EVENTS[c.ev];
    return `<div class="mission">${head}<div class="result"><div class="big" style="color:#6b3fc4">${esc(e.name)}</div><p class="qtext" style="font-size:24px">${esc(e.text)}</p></div>${mine ? `<button class="btn gold big" data-act="next">다음 길잡이에게</button>` : ''}</div>`;
  }
  if (m.state === 'open') {
    let advice = '';
    const isAdvisor = mySub() === sub && S.no !== m.by;
    if (isAdvisor && JOBS[jobOf(m.by)] !== sub) {
      if (m.advice === S.no) advice = `<div class="hintbox"><b>전문가 조언</b> — ${esc(c.hint || '친구가 스스로 답을 찾도록 방법을 알려 주세요. 답은 말하면 안 돼요!')}</div>`;
      else if (m.advice) advice = `<p class="note">조언을 이미 썼어요.</p>`;
      else if (patternOn('fog')) advice = `<p class="note">그림자 안개 때문에 지금은 조언을 쓸 수 없어요.</p>`;
      else advice = `<button class="btn" data-act="advice">전문가 조언 쓰기 (1번)</button>`;
    } else if (m.advice) advice = `<p class="note">${esc(nameOf(m.advice))}이(가) 전문가 조언을 하고 있어요.</p>`;
    const extra = c.kind === 'off'
      ? (c.type === 'code' ? `<p class="note">단서 카드: ${esc(c.card)}</p>` : c.type === 'self' ? `<p class="note">확인: ${esc(c.judge || '봉투 속 정답 카드로 확인해요.')}</p>` : '')
      : '';
    const actions = mine
      ? (c.type === 'self'
        ? `<div class="row"><button class="btn good big grow" data-act="selfOk">성공!</button><button class="btn bad big" data-act="selfNg">실패</button></div>`
        : `<button class="btn gold big" data-act="submit">정답 확인</button>`)
      : `<p class="note">답은 길잡이가 직접! 친구는 힌트만 줄 수 있어요.</p>`;
    return `<div class="mission">${head}${m.eye ? '<div class="banner">용의 눈 — 성공하면 피해 2배!</div>' : ''}${m.lamp ? '<div class="banner">이웃의 등불 — 다른 모둠 친구 1명에게 힌트 1번</div>' : ''}<div class="qtext">${esc(c.q)}</div>${extra}${viewQuestion(c, mine, '')}${advice}${actions}</div>`;
  }
  if (m.state === 'ok') {
    return `<div class="mission">${head}<div class="result ok"><div class="big">성공!</div><p class="qtext" style="font-size:24px">용에게 ${m.dmg} 피해${m.slot ? ' · 봉인 1칸!' : ''}</p>${m.slot ? '' : '<p class="note">이 과목 봉인 칸이 다 찼거나, 이미 최대 칸을 채워서 칸은 늘지 않았어요.</p>'}</div>${mine ? `<button class="btn gold big" data-act="next">다음 길잡이에게</button>` : ''}</div>`;
  }
  if (m.state === 'ng') {
    const ans = c.type === 'choice' ? `${c.a + 1}. ${c.choices[c.a]}` : c.type === 'measure' ? `${c.min}~${c.max}${c.unit || ''}` : c.a || '';
    return `<div class="mission">${head}<div class="result ng"><div class="big">아쉬워요</div><p>기력 -1</p></div>
      ${c.kind === 'on' || c.type === 'code' || c.type === 'measure' ? `<div class="hintbox"><b>정답</b> ${esc(ans)}${c.explain ? `<br>${esc(c.explain)}` : ''}</div>` : ''}
      <p class="note">배움 회복: 친구에게 풀이 설명을 듣고, 같은 과목 복습 문제를 맞히면 기력 +1!</p>
      ${mine ? `<div class="row"><button class="btn gold big grow" data-act="review">설명 들었어요 · 복습 문제 풀기</button><button class="btn" data-act="next">다음 길잡이에게</button></div>` : ''}</div>`;
  }
  if (m.state === 'review') {
    const rc = card(m.rq);
    return `<div class="mission"><div class="head"><span class="tag" style="--c:var(--violet)">배움 회복 · 복습 문제</span><span class="timer" data-until="${m.runtil}"></span></div><div class="qtext">${esc(rc.q)}</div>${viewQuestion(rc, mine, 'r')}${mine ? `<button class="btn gold big" data-act="rsubmit">정답 확인</button>` : '<p class="note">길잡이가 복습 문제를 풀고 있어요.</p>'}</div>`;
  }
  if (m.state === 'reviewOk' || m.state === 'reviewNg') {
    const ok = m.state === 'reviewOk';
    return `<div class="mission"><div class="result ${ok ? 'ok' : 'ng'}"><div class="big">${ok ? '회복!' : '다음에 다시!'}</div><p>${ok ? '기력 +1' : '괜찮아요. 다음 차례에 또 도전해요.'}</p></div>${mine ? `<button class="btn gold big" data-act="next">다음 길잡이에게</button>` : ''}</div>`;
  }
  return '';
}

const PIPS = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
const pipsHtml = n => Array.from({ length: 9 }, (_, i) => `<i class="${PIPS[n].includes(i) ? 'on' : ''}"></i>`).join('');
const dieFace = (n, rolling) => `<div class="die${rolling ? ' rolling' : ''}">${pipsHtml(n)}</div>`;
function viewCross(){
  const g = grp(), ms = membersOf(g), votes = g.votes || {}, my = votes[NK(S.no)], round = g.voteRound || 1;
  if (g.dice && now() < g.dice.at + 3200) return `<div class="dicebox"><h2>동점이 두 번! 주사위로 정해요</h2>${dieFace(1, true)}<p class="note">홀수(1·3·5)면 토벌의 길, 짝수(2·4·6)면 탈출의 길</p></div>`;
  if (g.path) {
    const o = CROSS_OPTIONS[g.path];
    return `<div class="dicebox">${g.dice ? `${dieFace(g.dice.face)}<p class="note">주사위 ${g.dice.face} — ${g.dice.face % 2 ? '홀수' : '짝수'}</p>` : ''}<h2>${o.name}을 골랐어요!</h2><p class="note">3막이 시작되면 이 길로 최종전에 도전해요. ${esc(o.goal)}</p></div>`;
  }
  const opt = k => { const o = CROSS_OPTIONS[k];
    return `<button class="vote" data-act="vote" data-v="${k}" aria-pressed="${my === k}" style="--c:${o.color}"><div class="pic">${SCENE_ART[k === 'fight' ? 'strike' : 'tunnel']}${art('final-' + k + '.png')}</div>
      <div class="body"><div class="nm">${o.name}</div><div class="goal">${esc(o.goal)}</div>
      <div class="say pro"><b>찬성</b> “${esc(o.pro)}”</div><div class="say con"><b>걱정</b> “${esc(o.con)}”</div></div></button>`; };
  return `<div><h2>갈림길 회의</h2><p class="note">모둠원과 의논하고 각자 골라요. 많이 고른 길로 가요.</p></div>
    ${round > 1 ? `<div class="banner warn">동점이라 다시 투표해요! 또 같으면 주사위로 정해요.</div>` : ''}
    <div class="votes">${opt('fight')}${opt('escape')}</div>
    <p class="note">투표: ${ms.map(m => `${m.no}번 ${votes[NK(m.no)] ? '✓' : '…'}`).join(' · ')}${my ? ' — 모두 고를 때까지 바꿀 수 있어요' : ''}</p>`;
}
function viewPathBox(){
  const g = grp();
  if (!g.path) return `<div class="banner">아직 길을 정하지 않았어요. 선생님께 알려 주세요.</div>`;
  if (g.done) return `<div class="banner">${g.done === 'fight' ? '합체 공격 성공! 용에게 결정타를 날렸어요.' : '탈출 성공! 남은 시간도 미션으로 레이드를 도와요.'}</div>`;
  if (g.path === 'fight') {
    const ok = canFight(g), tries = g.fightTries || 0, left = FIGHT_TRIES - tries;
    return `<div class="banner" style="flex-direction:column;align-items:stretch"><div class="row"><b class="disp grow" style="font-size:22px">토벌의 길</b><span class="note">도전 기회 ${left}번</span></div>
      <p class="note" style="color:var(--text)">${ok ? '봉인 판 완성! 모둠원 모두 준비되면 합체 공격을 시작해요.' : `봉인 8칸 모두 + 한 사람 ${sealLimits(membersOf(g).length).min}칸 이상이 필요해요.`}</p>
      <div class="row">${left > 0 ? `<button class="btn gold" data-act="fight" ${ok && energy() > 0 ? '' : 'disabled'}>합체 공격!</button>` : '<span class="note">합체 공격 기회를 다 썼어요.</span>'}${g.retreat ? '' : `<button class="btn ghost" data-act="retreatAsk">용기 있는 후퇴 (탈출의 길로)</button>`}</div></div>`;
  }
  const ok = canEscape(g);
  return `<div class="banner" style="flex-direction:column;align-items:stretch"><b class="disp" style="font-size:22px">탈출의 길</b>
    <p class="note" style="color:var(--text)">${ok ? '과목마다 봉인이 열렸어요! 비밀 통로를 찾아 떠나요.' : '국어·수학·사회·과학 봉인을 1칸씩 이상 채워야 해요. (' + SUBJ_KEYS.filter(s => !subjHas(g, s)).map(s => SUBJ[s].name).join(', ') + ' 남음)'}</p>
    <div class="row"><button class="btn gold" data-act="escape" ${ok ? '' : 'disabled'}>비밀 통로 열기</button></div></div>`;
}
function viewFinal(){
  const g = grp(), f = g.final;
  if (f.kind === 'fight') {
    if (f.result) {
      const win = f.result === 'win';
      return `<div class="mission"><div class="endimg">${art(win ? 'final-fight.png' : 'dragon-2.png')}</div><div class="result ${win ? 'ok' : 'ng'}"><div class="big">${win ? '결정타!' : '합체 공격 실패'}</div><p>${win ? `용에게 ${DMG.fight} 피해!` : '기력 -2 · 미션으로 기력을 모아 다시 도전해요.'}</p></div><button class="btn gold big" data-act="closeFinal">확인</button></div>`;
    }
    const mine = (f.assign || {})[NK(S.no)], c = card(mine), done = !c || (f.ans || {})[NK(S.no)] != null;
    const st = Object.keys(f.assign || {}).map(k => `${k.slice(1)}번 ${(f.ans || {})[k] != null ? '✓' : '…'}`).join(' · ');
    return `<div class="mission"><div class="head"><span class="tag" style="--c:#b8273b">합체 공격 · 힌트·조언 금지, 응원만!</span><span class="timer" data-until="${f.until}"></span></div>
      ${done ? `<div class="result"><div class="big" style="color:#6b3fc4">답했어요!</div><p>친구들을 응원해요</p></div>`
        : `<div class="qtext">${esc(c.q)}</div>${viewQuestion(c, true, 'f')}<button class="btn gold big" data-act="fsubmit">결정!</button>`}
      <p class="note">${st}</p></div>`;
  }
  if (f.result === 'win') return `<div class="mission"><div class="endimg">${art('final-escape.png')}</div><div class="result ok"><div class="big">탈출 성공!</div><p>마을 사람들을 구했어요. 용에게 ${DMG.escape} 피해!</p></div><p class="note">남은 시간도 미션을 계속하며 레이드를 도와요.</p><button class="btn gold big" data-act="closeFinal">확인</button></div>`;
  if (f.stage === 'envelope') {
    const hint = (cls().passHints || {})[GK(S.gi)] || '선생님이 알려 주는 곳에 비밀 통로 봉투가 있어요.';
    return `<div class="mission"><span class="tag" style="--c:#1f7a8c">비밀 통로 · 마지막 미션</span><div class="hintbox"><b>봉투 위치</b> ${esc(hint)}</div><div class="qtext">${esc(f.env)}</div><p class="note">봉투를 찾아 모둠원 모두 함께 미션을 해요.</p><button class="btn good big" data-act="escDone">모두 함께 해냈어요!</button></div>`;
  }
  const mine = Object.values(f.pieces || {}).filter(p => p.to === S.no);
  return `<div class="mission"><span class="tag" style="--c:#1f7a8c">비밀 통로 · 암호 찾기</span>
    <p class="note">내 단서 조각을 풀고, 화면은 보여 주지 말고 <b>말로만</b>알려 줘요. 네 자리 암호를 맞히면 통로가 열려요.</p>
    ${mine.map(p => { const q = CLUES.find(c => c.id === p.q); return `<div class="piece"><span class="tag" style="--c:${SUBJ[p.sub].color}">암호 ${p.pos}번째 자리 · ${SUBJ[p.sub].name}</span><div style="margin-top:8px">${esc(q.q)}</div></div>`; }).join('')}
    <div class="row"><input id="codeIn" class="codein" inputmode="numeric" maxlength="4" placeholder="····" value="${esc(S.draft)}"><button class="btn gold big" data-act="code">통로 열기</button></div></div>`;
}
/* ---------- 결말 ---------- */
function groupHist(){ return Object.values(grp().hist || {}).sort((a, b) => a.t - b.t); }
function tally(list){ const t = { o: 0, x: 0 }; list.forEach(h => h.ok ? t.o++ : t.x++); return t; }
const rate = t => t.o + t.x ? t.o / (t.o + t.x) : null;
function viewEnding(){
  const g = G(), gr = grp(), escaped = groupsOf(g, cls()).filter(x => x.done === 'escape').length;
  const e = endingFor(g, gr, escaped), win = bossDown(g);
  const tab = S.endTab || 'story';
  const tabs = [['story', '이야기'], ['after', '후일담'], ['review', '다시 보기']].map(([k, n]) => `<button data-act="endTab" data-t="${k}" aria-pressed="${tab === k}">${n}</button>`).join('');
  return `<div class="ending"><div class="endhead"><div class="kicker">${win ? '그림자 용을 쓰러뜨렸다!' : '용은 아직 살아 있다…'}</div><h2>우리 모둠: ${esc(e.title)}</h2></div>
    <div class="tabs endtabs">${tabs}</div>
    ${tab === 'story' ? viewStory(e, win) : tab === 'after' ? viewAfter(win) : viewReview()}</div>`;
}
function viewStory(e, win){
  const panels = ENDING_PANELS[(win ? 'win-' : 'lose-') + e.done];
  const i = Math.max(0, Math.min(panels.length - 1, S.endPage || 0)), p = panels[i], last = i === panels.length - 1;
  return `<div class="story">${sceneArt(p.scene)}<p class="narr">${esc(p.text)}</p>
    ${last && e.extra ? `<div class="extra">${esc(e.extra)}</div>` : ''}
    <div class="row storynav"><button class="btn" data-act="endPage" data-d="-1" ${i === 0 ? 'disabled' : ''}>← 앞 장면</button><span class="dots">${panels.map((_, k) => `<i class="${k === i ? 'on' : ''}"></i>`).join('')}</span>
      ${last ? `<button class="btn gold" data-act="endTab" data-t="after">후일담 보기 →</button>` : `<button class="btn gold" data-act="endPage" data-d="1">다음 장면 →</button>`}</div></div>`;
}
function viewAfter(win){
  const g = grp(), hist = groupHist(), st = G().stats || {};
  return `<div class="afters">${membersOf(g).map(m => {
    const sub = JOBS[m.job], mine = hist.filter(h => h.by === m.no && h.k !== 'r');
    const ok = mine.filter(h => h.ok).length, offOk = mine.filter(h => h.ok && DECKS[h.deck] && DECKS[h.deck].sub !== sub).length;
    const adv = ((st[NK(m.no)] || {}).adv) || 0;
    return `<div class="after" style="--c:${sub ? SUBJ[sub].color : 'var(--night3)'}"><div class="portrait">${avatar(m.job, 'lg')}${m.job ? art('job-' + m.job + '.png') : ''}</div><div class="grow"><div class="nm">${sub ? esc(SUBJ[sub].jobName) : '모험가'} · ${m.no}번${m.name ? ' ' + esc(m.name) : ''}</div>
      <p>${esc(m.job ? EPILOGUE[m.job][win ? 'win' : 'lose'] : '')}</p>
      <div class="statchips"><span>미션 성공 <b>${ok}</b></span><span>봉인 <b>${sealCount(g, m.no)}</b>칸</span><span>전공 밖 성공 <b>${offOk}</b></span><span>전문가 조언 <b>${adv}</b></span></div></div></div>`;
  }).join('')}</div>`;
}
function viewReview(){
  const g = grp(), hist = groupHist(), all = tally(hist);
  const bySub = {}; SUBJ_KEYS.forEach(k => bySub[k] = tally(hist.filter(h => DECKS[h.deck] && DECKS[h.deck].sub === k)));
  const tried = SUBJ_KEYS.filter(k => bySub[k].o + bySub[k].x);
  const best = tried.slice().sort((a, b) => rate(bySub[b]) - rate(bySub[a]) || (bySub[b].o + bySub[b].x) - (bySub[a].o + bySub[a].x))[0];
  const worst = tried.slice().sort((a, b) => rate(bySub[a]) - rate(bySub[b]) || (bySub[b].o + bySub[b].x) - (bySub[a].o + bySub[a].x))[0];
  const untried = SUBJ_KEYS.filter(k => !tried.includes(k));
  const pct = r => r == null ? '-' : Math.round(r * 100) + '%';
  const r = rate(all) || 0;
  const tiles = `<div class="tiles">
    <div class="tile"><div class="donut" style="--p:${Math.round(r * 100)}"><span>${pct(rate(all))}</span></div><div class="tl">정답률</div></div>
    <div class="tile"><div class="big">${all.o + all.x}</div><div class="tl">푼 문제</div></div>
    <div class="tile"><div class="big">${g.dmg || 0}</div><div class="tl">용에게 준 피해</div></div>
    <div class="tile"><div class="big">${Object.keys(g.seals || {}).length}<small>/8</small></div><div class="tl">연 봉인</div></div></div>`;
  const bars = `<div class="panel lite"><h3>과목별 정답률</h3>${SUBJ_KEYS.map(k => { const t = bySub[k], rr = rate(t);
    return `<div class="barrow"><span class="bl"><span class="ico" style="color:${SUBJ[k].color}">${SEAL_ICON[k === 'kor' ? 'kor_txt' : k]}</span>${SUBJ[k].name}</span><span class="track"><i style="width:${rr == null ? 0 : Math.max(4, rr * 100)}%;background:${SUBJ[k].color}"></i></span><span class="bv">${rr == null ? '도전 안 함' : `${t.o}/${t.o + t.x} · ${pct(rr)}`}</span></div>`; }).join('')}</div>`;
  const sw = `<div class="swgrid">
    <div class="sw good"><div class="tl">우리의 강점</div><div class="big">${best ? SUBJ[best].name : '-'}</div><p>${best ? `${bySub[best].o + bySub[best].x}문제 중 ${bySub[best].o}개를 맞혔어요.` : '아직 기록이 없어요.'}</p></div>
    <div class="sw weak"><div class="tl">더 연습할 과목</div><div class="big">${worst && rate(bySub[worst]) < 1 ? SUBJ[worst].name : '없음!'}</div><p>${worst && rate(bySub[worst]) < 1 ? `${bySub[worst].x}문제를 틀렸어요. 아래에서 다시 풀어 봐요.` : '푼 과목은 모두 맞혔어요. 다음엔 더 어려운 구역에 도전!'}${untried.length ? ` 도전하지 않은 과목: ${untried.map(k => SUBJ[k].name).join(', ')}` : ''}</p></div></div>`;
  const ms = membersOf(g), maxOk = Math.max(1, ...ms.map(m => hist.filter(h => h.by === m.no && h.ok).length));
  const contrib = `<div class="panel lite"><h3>누가 어떤 과목을 맞혔을까?</h3>${ms.map(m => { const okh = hist.filter(h => h.by === m.no && h.ok);
    return `<div class="barrow"><span class="bl">${avatar(m.job, 'sm')}${m.no}번</span><span class="track stack">${SUBJ_KEYS.map(k => { const n = okh.filter(h => DECKS[h.deck] && DECKS[h.deck].sub === k).length; return n ? `<i style="width:${n / maxOk * 100}%;background:${SUBJ[k].color}" title="${SUBJ[k].name} ${n}"></i>` : ''; }).join('')}</span><span class="bv">${okh.length}개</span></div>`; }).join('')}
    <div class="legend">${SUBJ_KEYS.map(k => `<span><i style="background:${SUBJ[k].color}"></i>${SUBJ[k].name}</span>`).join('')}</div></div>`;
  const wrongIds = [...new Set(hist.filter(h => !h.ok).map(h => h.card))].filter(id => { const c = card(id); return c && c.type !== 'self' && c.kind !== 'ev'; });
  const wrong = `<div class="panel lite"><h3>틀린 문제 다시 풀기 <span class="note">${wrongIds.length}문제</span></h3>${wrongIds.length ? wrongIds.map(retryCard).join('') : '<p class="note">틀린 문제가 없어요. 대단해요!</p>'}</div>`;
  return `<div class="review">${tiles}${bars}${sw}${contrib}${wrong}</div>`;
}
function retryCard(id){
  const c = card(id), d = DECKS[c.deck], R = S.retry[id];
  const q = c.type === 'code' ? c.cardQ : c.q;
  let body;
  if (c.type === 'measure') body = `<p class="note">알맞은 값: ${c.min}~${c.max}${esc(c.unit || '')}. 다시 재어 확인해 봐요.</p>`;
  else if (c.type === 'choice') body = `<div class="choices sm">${c.choices.map((t, i) => `<button data-act="retry" data-id="${id}" data-i="${i}" aria-pressed="${R && R.i === i}" class="${R ? (i === c.a ? 'right' : R.i === i ? 'wrongpick' : '') : ''}" ${R && R.ok ? 'disabled' : ''}>${i + 1}. ${esc(t)}</button>`).join('')}</div>`;
  else body = `<div class="row"><input id="rt_${id}" class="grow" placeholder="답" value="${esc((S.retryDraft[id]) || '')}" autocomplete="off" ${R && R.ok ? 'disabled' : ''}><button class="btn" data-act="retryShort" data-id="${id}" ${R && R.ok ? 'disabled' : ''}>확인</button></div>`;
  const fb = R ? `<div class="hintbox ${R.ok ? 'okbox' : ''}">${R.ok ? '<b>맞았어요!</b> ' : `<b>정답</b> ${esc(c.type === 'choice' ? c.choices[c.a] : c.a)} · `}${esc(c.explain || '')}</div>` : '';
  return `<div class="retry"><span class="tag" style="--c:${SUBJ[d.sub].color}">${esc(d.name)}</span><div class="rq">${esc(q)}</div>${body}${fb}</div>`;
}

function viewOverlay(){
  if (S.modal === 'retreat') return `<div class="overlay"><div class="parch"><h2>용기 있는 후퇴</h2><p>토벌의 길에서 탈출의 길로 바꿔요. 한 번 바꾸면 다시 토벌로 돌아올 수 없어요.</p><div class="row"><button class="btn gold" data-act="retreat">탈출의 길로 바꾸기</button><button class="btn" data-act="closeModal">취소</button></div></div></div>`;
  const r = G().roar; if (!r || S.no == null) return '';
  const q = ROAR.find(x => x.id === r.qid); if (!q) return '';
  if (!r.done && now() < r.until + 3000) {
    const mine = (r.ans || {})[NK(S.no)];
    return `<div class="overlay"><div class="parch"><div class="row"><span class="tag" style="--c:var(--ember)">용의 포효 · 반 전체 방어</span><span class="grow"></span><span class="timer" data-until="${r.until}"></span></div>
      ${mine != null ? `<div class="result"><div class="big" style="color:#6b3fc4">막았다!</div><p>답을 냈어요. 친구들을 기다려요.</p></div>`
        : `<div class="qtext">${esc(q.q)}</div><div class="choices">${q.choices.map((t, i) => `<button data-act="roar" data-i="${i}">${i + 1}. ${esc(t)}</button>`).join('')}</div><p class="note">힌트 없이 혼자 풀어요!</p>`}</div></div>`;
  }
  if (r.done && now() < (r.doneAt || r.until) + 7000) {
    return `<div class="overlay"><div class="parch"><div class="result ${r.ok ? 'ok' : 'ng'}"><div class="big">${r.ok ? '막아냈다!' : '포효에 휩쓸렸다'}</div><p class="qtext" style="font-size:24px">반 전체 정답률 ${Math.round((r.rate || 0) * 100)}% · ${r.ok ? `반격! 용에게 ${DMG.roar} 피해` : '모든 모둠 기력 -1'}</p></div></div></div>`;
  }
  return '';
}

/* ---------- 이벤트 ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]'); if (!b || b.disabled) return;
  const a = b.dataset.act;
  if (a === 'class') { S.cid = b.dataset.id; watchGame(); render(); }
  else if (a === 'changeClass') { S.cid = null; ls.del('raid-me'); if (gameRef) gameRef.off(); render(); }
  else if (a === 'group') { S.pickGi = +b.dataset.gi; S.pickNo = null; render(); }
  else if (a === 'backGroup') { S.pickGi = null; render(); }
  else if (a === 'num') { S.pickNo = +b.dataset.no; render(); }
  else if (a === 'join') join();
  else if (a === 'leave') leave();
  else if (a === 'job') chooseJob(b.dataset.job);
  else if (a === 'zone') { const k = b.dataset.sub; if (k === 'kor') { S.subPick = 'kor'; render(); } else drawMission(k); }
  else if (a === 'subBack') { S.subPick = null; render(); }
  else if (a === 'deck') { S.subPick = null; drawMission(b.dataset.deck); }
  else if (a === 'pass') passTurn();
  else if (a === 'choice' || a === 'rchoice' || a === 'fchoice') { S.choice = +b.dataset.i; render(); }
  else if (a === 'submit') submitAnswer();
  else if (a === 'selfOk') resolve(true);
  else if (a === 'selfNg') resolve(false);
  else if (a === 'advice') giveAdvice();
  else if (a === 'next') passTurn();
  else if (a === 'review') startReview();
  else if (a === 'rsubmit') submitReview();
  else if (a === 'vote') vote(b.dataset.v);
  else if (a === 'fight') startFight();
  else if (a === 'escape') startEscape();
  else if (a === 'fsubmit') {
    const f = grp().final, c = f && card(f.assign[NK(S.no)]); if (!c) return;
    if (c.type === 'choice') { if (S.choice == null) { toast('답을 골라 주세요'); return; } fightAnswer(S.choice === c.a); }
    else { if (!S.draft.trim()) { toast('답을 써 주세요'); return; } fightAnswer([c.a, ...(c.accept || [])].some(x => norm(x) === norm(S.draft))); }
    S.choice = null; S.draft = '';
  }
  else if (a === 'code') tryCode();
  else if (a === 'escDone') escapeDone();
  else if (a === 'closeFinal') closeFinal();
  else if (a === 'retreatAsk') { S.modal = 'retreat'; render(); }
  else if (a === 'retreat') retreat();
  else if (a === 'closeModal') { S.modal = null; render(); }
  else if (a === 'roar') roarAnswer(+b.dataset.i);
  else if (a === 'endTab') { S.endTab = b.dataset.t; S.endPage = 0; render(); window.scrollTo(0, 0); }
  else if (a === 'endPage') { S.endPage = (S.endPage || 0) + +b.dataset.d; render(); }
  else if (a === 'retry') { const c = card(b.dataset.id), i = +b.dataset.i; S.retry[c.id] = { i, ok: i === c.a }; render(); }
  else if (a === 'retryShort') { const c = card(b.dataset.id), v = S.retryDraft[c.id] || ''; if (!v.trim()) { toast('답을 써 주세요'); return; }
    const ok = c.type === 'code' || c.type === 'short' ? [c.a, ...(c.accept || [])].some(x => norm(x) === norm(v)) : false; S.retry[c.id] = { ok }; render(); }
});
document.addEventListener('input', e => {
  if (e.target.id === 'nameIn') S.nameDraft = e.target.value;
  else if (['ans', 'rans', 'fans', 'codeIn'].includes(e.target.id)) S.draft = e.target.value;
  else if (e.target.id && e.target.id.startsWith('rt_')) S.retryDraft[e.target.id.slice(3)] = e.target.value;
});
document.addEventListener('keydown', e => {
  if (e.key !== 'Enter') return;
  const id = e.target.id;
  if (id === 'ans') submitAnswer(); else if (id === 'rans') submitReview(); else if (id === 'codeIn') tryCode();
  else if (id === 'fans') document.querySelector('[data-act="fsubmit"]')?.click();
});

/* ---------- 시계: 남은 시간 표시, 시간 초과 처리, 화면 상태 바뀌면 다시 그리기 ---------- */
setInterval(() => {
  const t = now();
  document.querySelectorAll('.die.rolling').forEach(el => { el.innerHTML = pipsHtml(1 + Math.floor(Math.random() * 6)); });
  document.querySelectorAll('[data-until]').forEach(el => {
    const left = +el.dataset.until - t; el.textContent = fmt(left);
    el.classList.toggle('low', left < 20000);
  });
  if (S.no == null || !meM()) return;
  const g = grp(), m = g.mission, r = G().roar, p = G().pattern, f = g.final;
  if (m && m.state === 'open' && t > m.until && (m.by === S.no || t > m.until + 8000)) resolve(false);
  if (m && m.state === 'review' && t > m.runtil && (m.by === S.no || t > m.runtil + 8000)) answerReview(false);
  if (f && f.kind === 'fight' && !f.result) settleFight();
  if (status() === 'cross') settleVotes();
  const key = [g.dice && t < g.dice.at + 3200, bossDown(G()), g.trapUntil && t < g.trapUntil, p && t < p.until, r && !r.done && t < r.until + 3000, r && r.done && t < (r.doneAt || r.until) + 7000].join();
  if (key !== S.viewKey) { S.viewKey = key; render(); }
}, 400);

/* ---------- 시작 ---------- */
ensureAnon().then(() => {
  ref('classes').on('value', s => {
    S.classes = listOf(s.val()); S.classesLoaded = true;
    if (S.cid && !cls()) { S.cid = null; }
    render();
  }, () => { app.innerHTML = `<div class="panel"><h2>연결하지 못했어요</h2><p class="note">선생님께 알려 주세요. (데이터베이스 규칙 확인 필요)</p></div>`; });
  watchGame();
}).catch(() => { app.innerHTML = `<div class="panel"><h2>로그인하지 못했어요</h2><p class="note">인터넷 연결을 확인하고 새로고침해 주세요.</p></div>`; });
})();
