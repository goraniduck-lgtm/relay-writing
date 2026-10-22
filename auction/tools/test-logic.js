/* node auction/tools/test-logic.js — 판정·차감·되돌리기·배정 규칙 확인 */
const A = require('../logic.js');
let pass = 0, failN = 0;
function eq(name, got, want) {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) pass++; else { failN++; console.log('✗', name, '\n   got ', g, '\n   want', w); }
}
const J = arr => { const b = {}; arr.forEach((a, i) => { b['p' + (i + 1)] = a; }); const r = A.judge(b); return r.win ? [r.win, r.amt] : ['유찰', 0]; };

// 기획서 2.4 예시
eq('5,4,3', J([5, 4, 3]), ['p1', 5]);
eq('5,5,4', J([5, 5, 4]), ['p3', 4]);
eq('5,5,4,4,2', J([5, 5, 4, 4, 2]), ['p5', 2]);
eq('5,5,3,3', J([5, 5, 3, 3]), ['유찰', 0]);
eq('3,3,3', J([3, 3, 3]), ['유찰', 0]);
eq('2', J([2]), ['p1', 2]);
eq('모두 미참여', J([0, 0, 0]), ['유찰', 0]);
eq('아무도 없음', J([]), ['유찰', 0]);
eq('최고가 동점 후 더 낮은 단독', J([4, 4, 1, 3, 3]), ['p3', 1]);
eq('순서 무관', J([1, 5, 5, 0, 2]), ['p5', 2]);
eq('미참여 섞임', J([0, 3, 0]), ['p2', 3]);
const r1 = A.judge({ p1: 5, p2: 5, p3: 4, p4: 0 });
eq('hist', r1.hist, { a5: 2, a4: 1 });
eq('ded (미참여 제외)', r1.ded, { p1: 5, p2: 5, p3: 4 });
eq('참여 인원', r1.n, 3);
eq('제외 금액', r1.out, [5]);

// cleanBids: 코인 초과·정수 아님·명단 밖 무시
eq('cleanBids', A.cleanBids({ p1: { a: 3 }, p2: { a: 5 }, p3: { a: 2.5 }, p4: { a: 9 }, zz: { a: 1 }, p5: { a: 0 } }, { p1: 3, p2: 4, p3: 5, p4: 9, zz: 5, p5: 5 }, { p1: 1, p2: 1, p3: 1, p4: 1, p5: 1 }), { p1: 3 });

// applyJudge: 차감은 참여자 모두, 낙찰·유찰 무관, 한 번만
const core0 = { st: { ph: 'bid', rid: 'r1', seat: 's3', n: 1, dur: 5, t0: 1 }, coins: { p1: 5, p2: 5, p3: 5, p4: 5 }, own: {}, done: {} };
const roster = { p1: {}, p2: {}, p3: {}, p4: {} };
const c1 = A.applyJudge(core0, 'r1', { p1: { a: 5 }, p2: { a: 5 }, p3: { a: 2 } }, roster);
eq('낙찰자', c1.own, { s3: 'p3' });
eq('코인 차감', c1.coins, { p1: 0, p2: 0, p3: 3, p4: 5 });
eq('단계', c1.st.ph, 'result');
eq('두 번 판정 안 됨', A.applyJudge(c1, 'r1', { p1: { a: 5 } }, roster), null);
eq('다른 라운드 판정 안 됨', A.applyJudge(core0, 'r0', {}, roster), null);
const cFail = A.applyJudge(core0, 'r1', { p1: { a: 3 }, p2: { a: 3 } }, roster);
eq('유찰도 차감', cFail.coins, { p1: 2, p2: 2, p3: 5, p4: 5 });
eq('유찰 표시', cFail.done, { s3: 'fail' });
eq('유찰은 소유자 없음', cFail.own, {});
eq('원본 그대로', core0.coins.p1, 5);

// 되돌리기
const c2 = A.applyJudge(Object.assign({}, c1, { st: { ph: 'bid', rid: 'r2', seat: 's5', n: 2, dur: 5, t0: 2 } }), 'r2', { p3: { a: 3 }, p4: { a: 1 } }, roster);
eq('두 번째 낙찰', c2.own, { s3: 'p3', s5: 'p3' });
eq('중복 낙찰 허용 코인', c2.coins.p3, 0);
const u1 = A.undoLast(c2);
eq('역순 되돌리기: 최근 라운드부터', u1.undone.rid, 'r2');
eq('되돌린 코인', u1.core.coins, { p1: 0, p2: 0, p3: 3, p4: 5 });
eq('되돌린 낙찰', u1.core.own, { s3: 'p3' });
eq('되돌린 자리는 다시 미경매', u1.core.done, { s3: 'won' });
const u2 = A.undoLast(u1.core);
eq('두 번째 되돌리기', [u2.undone.rid, u2.core.coins, u2.core.own, u2.core.done], ['r1', { p1: 5, p2: 5, p3: 5, p4: 5 }, {}, {}]);
eq('더 되돌릴 것 없음', A.undoLast(u2.core), null);
// 유찰 자리 재경매 후 되돌리면 유찰로 돌아감
const re = A.applyJudge(Object.assign({}, cFail, { st: { ph: 'bid', rid: 'r9', seat: 's3', n: 2, dur: 5, t0: 3 } }), 'r9', { p3: { a: 1 } }, roster);
eq('재경매 낙찰', [re.done.s3, re.own.s3], ['won', 'p3']);
eq('재경매 되돌리면 유찰로', A.undoLast(re).core.done.s3, 'fail');

// 취소
eq('입찰 중 취소: 차감 없음', A.cancelRound(core0).coins, core0.coins);
eq('입찰 중 취소 기록', A.cancelRound(core0).hist.r1.status, 'cancel');
eq('결과 화면에서는 취소 불가', A.cancelRound(c1), null);

// 자리
const L = A.defaultLayout(4, 3);
eq('기본 배치 24자리', A.usableSeats(L).length, 24);
eq('짝 사이 통로', [A.adjacent(L, 's1', 's2'), A.adjacent(L, 's2', 's3'), A.adjacent(L, 's1', 's7'), A.adjacent(L, 's1', 's8')], [true, false, true, true]);
const L2 = JSON.parse(JSON.stringify(L)); L2.seats.s24.x = true;
eq('배정 불가 자리 제외', A.usableSeats(L2).length, 23);
eq('무작위 후보: 경매한 자리 제외', A.auctionCandidates(L, { done: { s1: 'won', s2: 'fail' } }).length, 22);
eq('유찰 자리만', A.auctionCandidates(L, { done: { s1: 'won', s2: 'fail' } }, true), ['s2']);
// 균등 추첨 확인
const cnt = {}; for (let i = 0; i < 24000; i++) { const s = A.pickRandom(A.auctionCandidates(L, {})); cnt[s] = (cnt[s] || 0) + 1; }
eq('균등 추첨', Object.values(cnt).every(v => v > 800 && v < 1200) && Object.keys(cnt).length === 24, true);

// 배정 (수정 기획서 예시: A가 3·7·12번 낙찰, B·C 미낙찰)
const ros = {}; for (let i = 1; i <= 24; i++) ros['p' + i] = { no: i, name: '학생' + i };
const own = { s3: 'p1', s7: 'p1', s12: 'p1', s5: 'p2' };
let sit = A.autoSingles(own, {});
eq('한 자리 낙찰은 자동 확정', sit, { s5: 'p2' });
const ctx = () => ({ layout: L, own, sit, roster: ros, sep: {} });
eq('A 본인 자리', A.canSit(ctx(), 's3', 'p1'), null);
sit.s3 = 'p1';
eq('미낙찰 B를 7번에', A.canSit(ctx(), 's7', 'p3'), null);
sit.s7 = 'p3';
eq('같은 학생 두 자리 금지 (메시지)', A.canSit(ctx(), 's12', 'p3'), '이미 다른 자리에 배정된 학생이에요');
eq('한 자리 두 학생 금지', A.canSit(ctx(), 's7', 'p4'), '이미 다른 학생이 앉은 자리예요');
eq('낙찰 학생은 남의 소유 자리 불가', A.canSit(ctx(), 's12', 'p2'), '이미 다른 자리에 배정된 학생이에요');
const own2 = Object.assign({}, own, { s20: 'p9' });
eq('낙찰 학생(미배정)도 남의 소유 자리 불가', A.canSit({ layout: L, own: own2, sit, roster: ros }, 's12', 'p9'), '낙찰받은 자리가 있는 학생은 자기 낙찰 자리에만 앉아요');
eq('선생님 조정은 허용', A.canSit({ layout: L, own: own2, sit, roster: ros }, 's12', 'p9', { force: true }), null);
sit.s12 = 'p4';
let stt = A.assignStats(ctx());
eq('현황', [stt.students, stt.seated, stt.unseated.length, stt.freeSeats.length, stt.multi], [24, 4, 20, 20, ['p1']]);
const filled = A.randomFill(ctx(), { rng: mulberry(7) });
sit = filled.sit;
eq('무작위 배정 후 모두 확정', A.finalProblems(ctx()), []);
eq('소유권 유지', [own.s7, sit.s7], ['p1', 'p3']);
// 분리 조건
const sep = { x: { a: 'p10', b: 'p11' }, y: { a: 'p12', b: 'p13' } };
let okAll = true;
for (let k = 0; k < 30; k++) {
  const f = A.randomFill({ layout: L, own, sit: { s3: 'p1', s5: 'p2' }, roster: ros, sep }, { rng: mulberry(k + 1) });
  if (f.violations || A.sepViolations(L, f.sit, sep).length) okAll = false;
}
eq('분리 조건 지킴', okAll, true);
eq('분리 위반 찾기', A.sepViolations(L, { s1: 'p10', s2: 'p11' }, sep).length, 1);
// 소유자가 추가 배정 안 한 낙찰 자리
const f2 = A.randomFill({ layout: L, own: { s1: 'p1', s2: 'p1' }, sit: { s1: 'p1' }, roster: ros, sep: {} }, { rng: mulberry(3) });
eq('기본은 소유 자리 비워 두고 못 앉은 인원 알려 줌', [f2.sit.s2 || null, f2.left], [null, 1]);
const L3 = A.defaultLayout(4, 3);
const f4 = A.randomFill({ layout: L3, own: { s1: 'p1', s2: 'p1' }, sit: { s1: 'p1' }, roster: ros, sep: {} }, { rng: mulberry(3), includeOwned: true });
eq('소유 자리 포함하면 모두 앉음', [f4.left, A.finalProblems({ layout: L3, own: {}, sit: f4.sit, roster: ros }).length], [0, 0]);
// 낙찰 학생이 아직 안 앉았으면 자기 자리로
const f5 = A.randomFill({ layout: L, own: { s1: 'p1', s2: 'p1' }, sit: {}, roster: ros, sep: {} }, { rng: mulberry(1) });
eq('낙찰 학생은 자기 자리로', f5.sit.s1, 'p1');

function mulberry(a) { return function () { let t = a += 0x6D2B79F5; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
console.log(failN ? `실패 ${failN}개 / 통과 ${pass}개` : `모두 통과 (${pass}개)`);
process.exit(failN ? 1 : 0);
