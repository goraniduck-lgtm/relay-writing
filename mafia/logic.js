/* 교실 마피아 — 게임 규칙 계산 (화면·서버와 무관한 순수 함수)
   명세서 v2.0의 판정 기준을 그대로 옮김. 브라우저와 Node 테스트에서 함께 사용. */
(function (root) {
  const MS = (typeof module !== 'undefined' && module.exports) ? require('./missions.js') : root.MISSIONS;

  /* ---- 역할 ---- (경찰 등은 나중에 여기에 추가) */
  const ROLES = {
    citizen: { name: '시민',   team: 'citizen', emoji: '🙂' },
    mafia:   { name: '마피아', team: 'mafia',   emoji: '🕶️' },
    doctor:  { name: '의사',   team: 'citizen', emoji: '🩺' }
  };
  const TEAM_NAME = { citizen: '시민 팀', mafia: '마피아 팀' };
  const teamOf = r => (ROLES[r] ? ROLES[r].team : 'citizen');

  /* ---- 3. 권장 인원 (의사 ON 기준 마피아 수) ---- */
  const REC = { 16: 4, 18: 4, 20: 5, 22: 5, 24: 5, 26: 6, 28: 6, 30: 7 };
  function recommendMafia(n) {
    if (REC[n]) return REC[n];
    if (n >= 15 && n <= 31) {
      let best = null;
      for (const k of Object.keys(REC).map(Number)) {
        if (best === null || Math.abs(k - n) < Math.abs(best - n)) best = k;
      }
      return REC[best];
    }
    if (n > 31) return Math.round(n * 7 / 30);
    return Math.max(1, Math.round(n / 4));
  }

  /* 역할 설정 검사 — 문제가 있으면 안내 문장, 없으면 null */
  function checkRoleSetup(n, mafia, doctorOn, manual) {
    const d = doctorOn ? 1 : 0;
    if (n < 3) return '참가자가 3명 이상이어야 시작할 수 있어요.';
    if (!(mafia >= 1)) return '마피아는 1명 이상이어야 해요.';
    if (mafia + d > n) return '역할 수가 참가자 수보다 많아요.';
    if (mafia >= n - mafia) return '마피아 수가 시민 팀 수보다 적어야 해요. (시작하자마자 마피아가 이겨요)';
    const fixed = { citizen: 0, mafia: 0, doctor: 0 };
    for (const r of Object.values(manual || {})) if (fixed[r] != null) fixed[r]++;
    if (fixed.mafia > mafia) return `직접 지정한 마피아(${fixed.mafia}명)가 설정한 마피아 수(${mafia}명)보다 많아요.`;
    if (fixed.doctor > d) return doctorOn ? '의사는 1명만 지정할 수 있어요.' : '의사가 꺼져 있어서 의사를 지정할 수 없어요.';
    if (fixed.citizen > n - mafia - d) return '직접 지정한 시민이 너무 많아요.';
    return null;
  }

  /* 5. 역할 배정 — manual: {pid: role} 직접 지정, 나머지는 무작위 */
  function assignRoles(pids, mafia, doctorOn, manual, rnd) {
    rnd = rnd || Math.random;
    const err = checkRoleSetup(pids.length, mafia, doctorOn, manual);
    if (err) throw new Error(err);
    const roles = {};
    const need = { mafia, doctor: doctorOn ? 1 : 0 };
    need.citizen = pids.length - need.mafia - need.doctor;
    const free = [];
    for (const p of pids) {
      const r = manual && manual[p];
      if (r && need[r] != null) { roles[p] = r; need[r]--; } else free.push(p);
    }
    const order = shuffle(free, rnd);
    let i = 0;
    for (const r of ['mafia', 'doctor', 'citizen']) for (let k = 0; k < need[r]; k++) roles[order[i++]] = r;
    return roles;
  }

  function shuffle(a, rnd) {
    a = a.slice(); rnd = rnd || Math.random;
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }

  /* 진영별 생존 수 */
  function countSides(players, roles, onlyAlive) {
    const c = { mafia: 0, citizen: 0 };
    for (const [p, pl] of Object.entries(players || {})) {
      if (!roles || !roles[p]) continue;
      if (onlyAlive && !(pl && pl.alive)) continue;
      c[teamOf(roles[p])]++;
    }
    return c;
  }

  /* 13.1 일반 종료 */
  function normalWinner(alive) {
    if (alive.mafia === 0) return 'citizen';
    if (alive.mafia >= alive.citizen) return 'mafia';
    return null;
  }

  /* 13.3 생존율 판정 — 실제 값으로 비교(교차 곱셈), 표시용은 소수 첫째 자리 */
  function survivalJudge(init, alive) {
    const lhs = alive.citizen * init.mafia;   // 시민 생존율 × (공통 분모)
    const rhs = alive.mafia * init.citizen;   // 마피아 생존율 × (공통 분모)
    const winner = lhs > rhs ? 'citizen' : lhs < rhs ? 'mafia' : 'draw';
    const pct = (a, b) => b ? Math.round(a / b * 1000) / 10 : 0;
    return { winner, rate: { citizen: pct(alive.citizen, init.citizen), mafia: pct(alive.mafia, init.mafia) } };
  }

  /* 13.5 종료 판정: 일반 종료 우선, 아니면 생존율 */
  function judgeEnd(init, alive, methodIfSurvival) {
    const w = normalWinner(alive);
    if (w) return { winner: w, method: 'normal' };
    const s = survivalJudge(init, alive);
    return { winner: s.winner, method: methodIfSurvival || 'limit', rate: s.rate };
  }

  /* 득표 집계 — votes {voter: target} */
  function tally(votes, isValid) {
    const t = {};
    for (const [v, target] of Object.entries(votes || {})) {
      if (isValid && !isValid(v, target)) continue;
      t[target] = (t[target] || 0) + 1;
    }
    let max = 0;
    for (const n of Object.values(t)) if (n > max) max = n;
    const top = max > 0 ? Object.keys(t).filter(k => t[k] === max).sort() : [];
    return { tally: t, top, max };
  }

  /* 10. 낮 투표 결과 — stage 1(첫 투표) / 2(재투표) */
  function dayOutcome(stage, res) {
    if (res.top.length === 0) return { out: null, revote: false, reason: 'novote' };
    if (res.top.length === 1) return { out: res.top[0], revote: false, reason: 'top' };
    if (stage === 1) return { out: null, revote: true, cands: res.top, reason: 'tie' };
    return { out: null, revote: false, reason: 'tie2' };
  }

  /* 11. 밤 판정
     mafiaVotes {pid: target}, attackers: 공격권 있는 생존 마피아 pid 배열,
     doctorTarget: 생존 의사가 고른 대상(없으면 null) */
  function nightOutcome(mafiaVotes, attackers, players, roles, doctorTarget, rnd) {
    rnd = rnd || Math.random;
    const atk = new Set(attackers || []);
    const aliveP = p => !!(players[p] && players[p].alive);
    const res = tally(mafiaVotes, (v, t) => atk.has(v) && aliveP(v) && roles[v] === 'mafia' && aliveP(t) && teamOf(roles[t]) === 'citizen');
    let target = null, tieBreak = false;
    if (res.top.length === 1) target = res.top[0];
    else if (res.top.length > 1) { target = res.top[Math.floor(rnd() * res.top.length)]; tieBreak = true; }
    const protect = doctorTarget && aliveP(doctorTarget) ? doctorTarget : null;
    const saved = !!(target && protect === target);
    return { target, protect, saved, out: target && !saved ? target : null, tally: res.tally, tieBreak, attackers: atk.size };
  }

  /* 8.4 비밀 미션 고르기 — prev {pid: 지난 미션 id} */
  function pickSecrets(commonTags, mafiaPids, prev, diff, rnd) {
    rnd = rnd || Math.random;
    const lvs = (MS.DIFF[diff] || MS.DIFF.mix).lv;
    const pool = MS.SECRET.filter(s => lvs.includes(s.lv));
    const tags = commonTags || [];
    const fits = pool.filter(s => s.fit.includes('*') || s.fit.some(t => tags.includes(t)));
    const base = fits.length >= Math.min(mafiaPids.length, 2) ? fits : pool;
    const used = new Set(), out = {};
    for (const p of shuffle(mafiaPids, rnd)) {
      const notPrev = s => !(prev && prev[p] === s.id);
      let cand = base.filter(s => notPrev(s) && !used.has(s.id));
      if (!cand.length) cand = pool.filter(s => notPrev(s) && !used.has(s.id));
      if (!cand.length) cand = pool.filter(notPrev);
      if (!cand.length) cand = pool;
      const s = cand[Math.floor(rnd() * cand.length)];
      used.add(s.id);
      out[p] = { id: s.id, m: s.text, lv: s.lv };
    }
    return out;
  }

  const api = { ROLES, TEAM_NAME, teamOf, REC, recommendMafia, checkRoleSetup, assignRoles, shuffle,
    countSides, normalWinner, survivalJudge, judgeEnd, tally, dayOutcome, nightOutcome, pickSecrets };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Logic = api;
})(typeof window !== 'undefined' ? window : globalThis);
