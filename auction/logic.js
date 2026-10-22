/* 자리 경매 — 판정·코인·배정 규칙 (화면·데이터베이스와 무관한 순수 함수)
   브라우저에서는 window.AL, node 테스트에서는 module.exports 로 씀 */
(function (root) {
  'use strict';

  const MAX_BID = 5;

  /* ---------- 낙찰 판정 ----------
     bids: {학생ID: 금액} — 0·없음은 참여 안 함
     단독으로 가장 높은 금액을 낸 학생이 낙찰. 같은 금액이 2명 이상이면 그 금액은 통째로 제외.
     돌려주는 값: {win: 학생ID|null, amt: 낙찰 금액|0, hist: {'a'+금액: 인원} (숫자 키는 Firebase가 배열로 바꿔서 앞에 a를 붙임), ded: {학생ID: 차감}, n: 참여 인원, out: [제외된 금액] } */
  function judge(bids) {
    const ded = {};
    const groups = {};
    for (const [sid, v] of Object.entries(bids || {})) {
      const a = Number(v);
      if (!Number.isInteger(a) || a <= 0) continue;
      ded[sid] = a;
      (groups[a] = groups[a] || []).push(sid);
    }
    const amounts = Object.keys(groups).map(Number).sort((x, y) => y - x);
    const hist = {};
    for (const a of amounts) hist['a' + a] = groups[a].length;
    const out = [];
    for (const a of amounts) {
      if (groups[a].length === 1) return { win: groups[a][0], amt: a, hist, ded, n: Object.keys(ded).length, out };
      out.push(a);
    }
    return { win: null, amt: 0, hist, ded, n: Object.keys(ded).length, out };
  }

  /* 입찰 기록 {학생ID: {a, t}} → 유효한 금액만 {학생ID: 금액}
     보유 코인보다 큰 금액, 정수가 아닌 값, 명단에 없는 학생은 무시 (보안 규칙이 먼저 막지만 한 번 더) */
  function cleanBids(raw, coins, roster) {
    const out = {};
    for (const [sid, b] of Object.entries(raw || {})) {
      if (roster && !roster[sid]) continue;
      const a = Number(b && typeof b === 'object' ? b.a : b);
      if (!Number.isInteger(a) || a <= 0 || a > MAX_BID) continue;
      if (a > (Number(coins && coins[sid]) || 0)) continue;
      out[sid] = a;
    }
    return out;
  }

  /* ---------- 진행 상태(core) 바꾸기 ----------
     core = {st:{ph, rid, seat, t0, dur, n}, coins:{}, own:{자리:학생}, done:{자리:'won'|'fail'}, sit:{자리:학생}, hist:{rid:{...}}, last}
     모두 새 객체를 돌려줌 (원본은 그대로). 할 수 없는 상황이면 null */
  const clone = o => JSON.parse(JSON.stringify(o || {}));

  /* 마감된 라운드 판정 — 같은 라운드는 한 번만 (이미 판정됐으면 null) */
  function applyJudge(core, rid, rawBids, roster) {
    if (!core || !core.st || core.st.ph !== 'bid' || core.st.rid !== rid) return null;
    const c = clone(core);
    c.coins = c.coins || {};
    const bids = cleanBids(rawBids, c.coins, roster);
    const r = judge(bids);
    const seat = c.st.seat;
    for (const [sid, a] of Object.entries(r.ded)) c.coins[sid] = Math.max(0, (Number(c.coins[sid]) || 0) - a);
    c.own = c.own || {};
    c.done = c.done || {};
    if (r.win) { c.own[seat] = r.win; c.done[seat] = 'won'; } else c.done[seat] = 'fail';
    const n = c.st.n || 1;
    const rec = { rid, n, seat, win: r.win || null, amt: r.amt, hist: r.hist, ded: r.ded, cnt: r.n, out: r.out, status: 'ok', prev: core.done && core.done[seat] ? core.done[seat] : null };
    c.hist = c.hist || {};
    c.hist[rid] = rec;
    c.last = rec;
    c.st = { ph: 'result', rid, seat, n, dur: c.st.dur, t0: c.st.t0 };
    return c;
  }

  /* 판정된 라운드 중 가장 최근 것 */
  function lastJudged(core) {
    const list = Object.values((core && core.hist) || {}).filter(h => h.status === 'ok');
    list.sort((a, b) => b.n - a.n);
    return list[0] || null;
  }

  /* 가장 최근 판정 되돌리기 — 코인 돌려주고 낙찰·유찰 표시를 판정 전으로 */
  function undoLast(core) {
    if (!core || !core.st || ['bid', 'assign', 'final'].includes(core.st.ph)) return null;
    const h = lastJudged(core);
    if (!h) return null;
    const c = clone(core);
    for (const [sid, a] of Object.entries(h.ded || {})) c.coins[sid] = (Number(c.coins[sid]) || 0) + a;
    if (c.own && h.win && c.own[h.seat] === h.win) delete c.own[h.seat];
    if (c.sit) delete c.sit[h.seat];
    c.done = c.done || {};
    if (h.prev) c.done[h.seat] = h.prev; else delete c.done[h.seat];
    c.hist[h.rid].status = 'undone';
    const next = lastJudged(c);
    c.last = null;
    c.st = { ph: 'idle', n: c.st.n, dur: c.st.dur };
    return { core: c, undone: h, next };
  }

  /* 입찰 시작 전·진행 중 취소 — 차감 없음 */
  function cancelRound(core) {
    if (!core || !core.st || !['ready', 'bid'].includes(core.st.ph)) return null;
    const c = clone(core);
    if (core.st.ph === 'bid') {
      c.hist = c.hist || {};
      c.hist[core.st.rid] = { rid: core.st.rid, n: core.st.n, seat: core.st.seat, status: 'cancel' };
    }
    c.st = { ph: 'idle', n: core.st.n || 0, dur: core.st.dur };
    c.last = null;
    return c;
  }

  /* ---------- 자리 ---------- */
  /* 사용할 수 있는 자리 (배정 불가 자리 제외), 자리 번호 순 */
  function usableSeats(layout) {
    return Object.entries((layout && layout.seats) || {})
      .filter(([, s]) => !s.x)
      .map(([id, s]) => ({ id, ...s }))
      .sort((a, b) => (a.no || 0) - (b.no || 0));
  }
  /* 무작위 경매 후보: 아직 경매하지 않은 자리 (failOnly면 유찰 자리만) */
  function auctionCandidates(layout, core, failOnly) {
    const done = (core && core.done) || {};
    return usableSeats(layout).filter(s => failOnly ? done[s.id] === 'fail' : !done[s.id]).map(s => s.id);
  }
  function pickRandom(list, rng) {
    if (!list.length) return null;
    const r = rng || Math.random;
    return list[Math.floor(r() * list.length) % list.length];
  }
  /* 두 자리가 붙어 있는지 (앞뒤·옆·대각선, 통로 칸이 끼면 떨어진 것) */
  function adjacent(layout, a, b) {
    const s = layout.seats || {};
    if (!s[a] || !s[b] || a === b) return false;
    return Math.abs(s[a].r - s[b].r) <= 1 && Math.abs(s[a].c - s[b].c) <= 1;
  }

  /* ---------- 최종 배정 ----------
     own: 자리 → 낙찰 학생 (소유권), sit: 자리 → 실제 앉는 학생 — 서로 다른 데이터 */
  function ownedBy(own) {
    const m = {};
    for (const [seat, sid] of Object.entries(own || {})) (m[sid] = m[sid] || []).push(seat);
    return m;
  }
  const seatOf = (sit, sid) => { for (const [k, v] of Object.entries(sit || {})) if (v === sid) return k; return null; };

  /* 배정 단계 시작: 한 자리만 낙찰받은 학생은 그 자리로 자동 확정 (이미 다른 자리에 앉혀 둔 경우 제외) */
  function autoSingles(own, sit) {
    const s = clone(sit);
    const m = ownedBy(own);
    for (const [sid, seats] of Object.entries(m)) {
      if (seats.length !== 1) continue;
      if (seatOf(s, sid)) continue;
      if (s[seats[0]]) continue;
      s[seats[0]] = sid;
    }
    return s;
  }

  /* 한 자리에 한 학생을 앉혀도 되는지 — 이유 문자열(안 됨) 또는 null(됨)
     opt.force: 선생님 조정 (규칙 대신 겹침만 막음) */
  function canSit(ctx, seat, sid, opt) {
    const { layout, own, sit, roster } = ctx;
    const o = opt || {};
    const s = layout.seats && layout.seats[seat];
    if (!s) return '없는 자리예요';
    if (s.x) return '배정 불가 자리예요';
    if (!roster[sid]) return '명단에 없는 학생이에요';
    const cur = seatOf(sit, sid);
    if (cur && cur !== seat) return '이미 다른 자리에 배정된 학생이에요';
    if (sit && sit[seat] && sit[seat] !== sid) return '이미 다른 학생이 앉은 자리예요';
    if (o.force) return null;
    const m = ownedBy(own);
    const owner = own && own[seat];
    const mine = m[sid] || [];
    if (owner) {
      if (owner === sid) return null;
      if (mine.length) return '낙찰받은 자리가 있는 학생은 자기 낙찰 자리에만 앉아요';
      return null; // 소유자가 미낙찰 학생을 배정
    }
    if (mine.length) return '낙찰받은 자리가 있는 학생은 자기 낙찰 자리에만 앉아요';
    return null;
  }

  /* 분리 조건 위반 목록 [{a, b, sa, sb}] */
  function sepViolations(layout, sit, sep) {
    const pos = {};
    for (const [seat, sid] of Object.entries(sit || {})) pos[sid] = seat;
    const out = [];
    for (const p of Object.values(sep || {})) {
      if (!p || !pos[p.a] || !pos[p.b]) continue;
      if (adjacent(layout, pos[p.a], pos[p.b])) out.push({ a: p.a, b: p.b, sa: pos[p.a], sb: pos[p.b] });
    }
    return out;
  }

  /* 배정 현황 수치 */
  function assignStats(ctx) {
    const { layout, own, sit, roster } = ctx;
    const seats = usableSeats(layout);
    const students = Object.keys(roster || {});
    const seated = new Set(Object.values(sit || {}));
    const m = ownedBy(own);
    return {
      students: students.length,
      seats: seats.length,
      seated: students.filter(s => seated.has(s)).length,
      unseated: students.filter(s => !seated.has(s)),
      freeSeats: seats.filter(s => !(sit && sit[s.id])).map(s => s.id),
      freeUnowned: seats.filter(s => !(sit && sit[s.id]) && !(own && own[s.id])).map(s => s.id),
      freeOwned: seats.filter(s => !(sit && sit[s.id]) && own && own[s.id]).map(s => s.id),
      winners: Object.keys(m),
      losers: students.filter(s => !m[s]),
      multi: Object.entries(m).filter(([, v]) => v.length > 1).map(([k]) => k),
      ownersUnseated: Object.keys(m).filter(s => !seated.has(s) && roster[s])
    };
  }

  /* 남은 학생을 남은 자리에 무작위 배정
     - 낙찰받은 자리가 있는 학생은 자기 자리에만 (못 앉으면 그대로 둠)
     - 미낙찰 학생: 소유자 없는 빈자리 먼저, includeOwned면 소유자가 배정하지 않은 낙찰 자리까지
     - 분리 조건을 지키는 배치를 여러 번 시도 */
  function randomFill(ctx, opt) {
    const o = opt || {};
    const rng = o.rng || Math.random;
    const { layout, own, roster, sep } = ctx;
    const base = clone(ctx.sit);
    const m = ownedBy(own);
    // 1) 자기 낙찰 자리가 비어 있는 낙찰 학생
    for (const sid of Object.keys(m)) {
      if (!roster[sid] || seatOf(base, sid)) continue;
      const free = m[sid].filter(seat => !base[seat] && !layout.seats[seat].x);
      if (free.length) base[free.sort((a, b) => layout.seats[a].no - layout.seats[b].no)[0]] = sid;
    }
    const st = assignStats({ layout, own, sit: base, roster });
    const people = st.unseated.filter(s => !m[s]);
    let pool = st.freeUnowned.slice();
    if (o.includeOwned) pool = pool.concat(st.freeOwned);
    let best = null, bestBad = Infinity;
    const tries = Object.keys(sep || {}).length ? 400 : 1;
    for (let t = 0; t < tries; t++) {
      const seats = shuffle(pool, rng);
      const ppl = shuffle(people, rng);
      const sit = clone(base);
      ppl.forEach((sid, i) => { if (seats[i]) sit[seats[i]] = sid; });
      const bad = sepViolations(layout, sit, sep).length;
      if (bad < bestBad) { best = sit; bestBad = bad; }
      if (!bad) break;
    }
    return { sit: best || base, violations: bestBad === Infinity ? 0 : bestBad, left: Math.max(0, people.length - pool.length) };
  }
  function shuffle(a, rng) {
    const x = a.slice();
    for (let i = x.length - 1; i > 0; i--) { const j = Math.floor((rng || Math.random)() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; }
    return x;
  }

  /* 최종 확정 가능 여부 — 문제 목록(비어 있으면 확정 가능) */
  function finalProblems(ctx) {
    const st = assignStats(ctx);
    const p = [];
    if (st.unseated.length) p.push('자리가 정해지지 않은 학생이 ' + st.unseated.length + '명 있어요');
    const counts = {};
    for (const sid of Object.values(ctx.sit || {})) counts[sid] = (counts[sid] || 0) + 1;
    if (Object.values(counts).some(n => n > 1)) p.push('두 자리에 배정된 학생이 있어요');
    for (const seat of Object.keys(ctx.sit || {})) if (!ctx.layout.seats[seat] || ctx.layout.seats[seat].x) p.push('배정할 수 없는 자리에 학생이 있어요');
    return p;
  }

  /* ---------- 기본 교실 배치 ----------
     rows줄 × (짝 책상 pairs개) — 짝 사이마다 통로 한 칸 */
  function defaultLayout(rows, pairs) {
    rows = rows || 4; pairs = pairs || 3;
    const cols = pairs * 3 - 1;
    const seats = {};
    let no = 0;
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      if (c % 3 === 2) continue;
      no++;
      seats['s' + no] = { r, c, no };
    }
    return { rows, cols, seats };
  }
  /* 왼쪽 위부터 번호 다시 매기기 (자리 ID는 그대로) */
  function renumber(layout) {
    const l = clone(layout);
    const list = Object.entries(l.seats || {}).sort(([, a], [, b]) => a.r - b.r || a.c - b.c);
    list.forEach(([id], i) => { l.seats[id].no = i + 1; });
    return l;
  }

  const API = { MAX_BID, judge, cleanBids, applyJudge, undoLast, cancelRound, lastJudged, usableSeats, auctionCandidates, pickRandom, adjacent,
    ownedBy, seatOf, autoSingles, canSit, sepViolations, assignStats, randomFill, finalProblems, defaultLayout, renumber, shuffle };
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
  else root.AL = API;
})(typeof window !== 'undefined' ? window : globalThis);
