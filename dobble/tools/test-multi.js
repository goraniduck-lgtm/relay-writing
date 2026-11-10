/* 여러 명 대결 브라우저 시험 — 정적 서버를 띄운 뒤
   node dobble/tools/test-multi.js [주소=http://localhost:8123/dobble/] [인원=4] [그림저장폴더] */
'use strict';
const path = require('path');
const fs = require('fs');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/npm-tools/node_modules/playwright'); }
const BASE = process.argv[2] || 'http://localhost:8123/dobble/';
const N = +(process.argv[3] || 4);
const SHOTS = process.argv[4] || null;
const fake = fs.readFileSync(path.join(__dirname, 'fake-db.js'), 'utf8');
let pass = 0, fail = 0;
const ok = (name, cond, extra) => { if (cond) pass++; else { fail++; console.log('✗', name, extra || ''); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SEATS = 'abcdef';

(async () => {
  const browser = await pw.chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const srv = await require('./fake-server')(ctx);
  await ctx.addInitScript(fake);
  await ctx.addInitScript(() => { try { localStorage.setItem('dobble.fs', 'false'); } catch (e) {} });
  await ctx.route(/fonts\.googleapis|fonts\.gstatic|gstatic\.com\/firebasejs/, r => r.abort());
  const errors = [];
  const open = async (uid) => {
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(uid + ': ' + e.message));
    p.on('dialog', d => d.accept().catch(() => {}));
    const click = p.click.bind(p);
    p.click = async (sel, o) => { await p.bringToFront(); return click(sel, o); };
    await p.goto(`${BASE}?uid=${uid}&lag=50`);
    return p;
  };
  const shot = async (p, name) => { if (SHOTS) { await p.bringToFront(); await p.screenshot({ path: path.join(SHOTS, name + '.png') }); } };
  const P = [];
  for (let i = 0; i < N + 1; i++) P.push(await open('m' + i));   // 마지막 한 명은 꽉 찬 방에 들어가 보기

  /* 방 만들기 */
  const A = P[0];
  await A.fill('#nick', '대장');
  await A.click('[data-go="make-duo"]');
  await A.click(`[data-max="${N}"]`);
  const lenLabel = await A.textContent('[data-len="10"]');
  ok('판 길이에 인원별 장수 표시', /한 명에 \d+장쯤/.test(lenLabel), lenLabel);
  await A.click('[data-len="6"]');
  await shot(A, `m${N}-1-make`);
  await A.click('#makeGo');
  await A.waitForSelector('#lobby:not([hidden]) #codeBig span');
  const code = (await A.textContent('#codeBig')).trim();
  ok('대기실 자리 수', (await A.$$eval('#players .pl', e => e.length)) === N);
  ok('혼자일 때 시작 못 함', await A.$eval('#startBtn', b => b.disabled));

  /* 차례로 들어가기 */
  for (let i = 1; i < N; i++) {
    const p = P[i];
    await p.fill('#nick', '친구' + i);
    await p.click('[data-go="join"]');
    for (const d of code) { await p.click(`#pad [data-k="${d}"]`); await sleep(180); }
    await p.waitForSelector('#lobby:not([hidden])', { timeout: 8000 });
    ok(`${i + 1}번째 사람 자리 ${SEATS[i]}`, (await p.evaluate(() => G.seat)) === SEATS[i]);
    if (i === 1) ok('두 명이면 시작 가능', await A.waitForFunction(() => !document.querySelector('#startBtn').disabled, null, { timeout: 5000 }).then(() => true, () => false));
  }
  await A.waitForFunction(n => document.querySelectorAll('#players .pl:not(.empty)').length === n, N, { timeout: 8000 });
  await shot(A, `m${N}-2-lobby`);
  /* 꽉 찬 방 */
  const X = P[N];
  await X.click('[data-go="join"]');
  for (const d of code) { await X.click(`#pad [data-k="${d}"]`); await sleep(180); }
  await sleep(1200);
  ok('꽉 찬 방에는 못 들어감', (await X.evaluate(() => screenNow())) === 'join' && /꽉 찼어요/.test(await X.evaluate(() => (document.querySelector('#toast') || {}).textContent || '')));

  /* 시작 */
  await P[N - 1].click('#startBtn');
  const players = P.slice(0, N);
  for (const p of players) await p.waitForFunction(() => G.playing, null, { timeout: 10000 });
  const st = p => p.evaluate(() => ({ shown: G.shown, scores: G.scores, claims: G.claims.join(''), ended: G.ended, players: G.players.join(''), start: G.start, len: G.game.deck.length, opps: document.querySelectorAll('#opps .pc').length }));
  const s0 = await st(A);
  ok('참가자 목록', s0.players === SEATS.slice(0, N), s0.players);
  ok('나눠 준 카드 = 인원', s0.start === N);
  ok('짧게 = 인원 + 6장씩', s0.len === Math.min(57, N + 6 * N), s0.len);
  ok('위쪽에 상대 칸', s0.opps === N - 1, s0.opps);
  const firstCenters = await Promise.all(players.map(p => p.evaluate(() => JSON.stringify(centerCard()))));
  ok('모두 같은 가운데 카드', new Set(firstCenters).size === 1);
  await shot(P[1], `m${N}-3-play`);

  const press = async (p, hold) => {
    const pos = await p.evaluate(() => {
      if (!G.playing || G.busy || G.pending || G.locked || performance.now() < G.readyAt) return null;
      const c = centerCard(), sid = G.tops[G.seat].find(s => c.includes(s));
      const el = document.querySelector(`#cM .sy[data-s="${sid}"]`), r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
    if (!pos) return false;
    await p.bringToFront();
    await p.mouse.move(pos.x, pos.y); await p.mouse.down(); await sleep(hold || 40); await p.mouse.up();
    return true;
  };
  /* 한 사람이 중간에 나감 (4명 이상일 때) */
  const quitter = N >= 4 ? P[2] : null;
  let rounds = 0, guard = 0, quitDone = false;
  while (guard++ < 400) {
    const s = await st(A);
    if (s.ended) break;
    if (quitter && !quitDone && s.shown >= 3) {
      await quitter.click('#quitBtn'); await quitter.click('#askBtns .ghost');
      quitDone = true;
      await sleep(600);
      continue;
    }
    const active = players.filter(p => p !== quitter || !quitDone);
    const who = active[rounds % active.length];
    if (rounds % 5 === 4) await Promise.all(active.slice(0, 3).map(p => press(p, 30)));   // 셋이 동시에
    else await press(who, 40);
    rounds++;
    if (rounds === 7) { await shot(P[1], `m${N}-4-mid`); await shot(A, `m${N}-4-mid-A`); }
    await sleep(220 + Math.random() * 200);
  }
  const remain = players.filter(p => p !== quitter);
  for (const p of remain) await p.waitForFunction(() => G.ended, null, { timeout: 20000 }).catch(() => {});
  const fin = await Promise.all(remain.map(st));
  ok('남은 사람 모두 끝남', fin.every(f => f.ended), JSON.stringify(fin.map(f => [f.ended, f.shown, f.claims])));
  ok('판 기록이 모두 같음', new Set(fin.map(f => f.claims)).size === 1, fin.map(f => f.claims).join(' / '));
  ok('점수가 모두 같음', new Set(fin.map(f => JSON.stringify(f.scores))).size === 1);
  ok('판 수 = 카드 - 인원', fin[0].claims.length === s0.len - N);
  if (quitter) {
    ok('나간 사람 표시', await A.evaluate(() => document.querySelector('#opps .pc[data-seat="c"]').classList.contains('gone')));
    ok('나간 뒤로는 c 가 판을 안 가져감', !fin[0].claims.slice(5).includes('c'), fin[0].claims);
  }
  const winsPerRound = {};
  for (const p of players) for (const l of await p.evaluate(() => __FAKE_LOG__)) if (l.ok) winsPerRound[l.path] = (winsPerRound[l.path] || 0) + 1;
  ok('한 판에 승자 하나', Object.values(winsPerRound).every(v => v === 1));
  { /* 판마다: 이긴 자리 = 가장 빠른 기록 */
    const room = srv.tree.dobble.rooms[code], cl = room.claims || {}, ps = room.cfg.players || 'ab';
    const rs = Object.values(cl);
    ok('모든 판에 확정 기록', rs.length > 0 && rs.every(c => c.win), JSON.stringify(cl).slice(0, 300));
    ok('이긴 자리 = 가장 빨리 누른 자리', rs.every(c => { const t = Object.entries(c).filter(([k, v]) => k !== 'win' && ps.includes(k)); return t.every(([, v]) => v >= c[c.win]); }), JSON.stringify(cl).slice(0, 300));
    ok('두 명 이상 맞힌 판이 있었음', rs.some(c => Object.keys(c).length >= 3), JSON.stringify(cl).slice(0, 200));
  }
  for (const p of remain) await p.waitForSelector('#result:not([hidden])', { timeout: 8000 });
  const titles = await Promise.all(remain.map(p => p.textContent('#rTitle')));
  ok('결과에 순위', titles.some(t => /1등|이겼다/.test(t)), titles.join(' / '));
  ok('결과 칸 = 참가자 수', (await A.$$eval('#rScore > div', e => e.length)) === N);
  await shot(A, `m${N}-5-result`);

  /* 다시 하기: 나간 사람 빼고 */
  await P[1].click('#again');
  for (const p of remain) await p.waitForFunction(() => G.playing && G.shown === 0, null, { timeout: 10000 });
  const r2 = await st(A);
  ok('다시 하기 참가자', r2.players === (quitter ? SEATS.slice(0, N).replace('c', '') : SEATS.slice(0, N)), r2.players);
  ok('다시 하기 카드 장수도 인원에 맞춤', r2.len === Math.min(57, r2.players.length * 7), r2.len);
  /* 모두 나가면 방 지움 */
  for (const p of remain) {
    await sleep(500);
    if (await p.isVisible('#ask')) { ok('마지막 사람: 친구들이 나갔어요', /나갔어요/.test(await p.textContent('#askTitle'))); await p.click('#askBtns .primary'); }
    else { await p.click('#quitBtn'); await p.click('#askBtns .ghost'); }
  }
  await sleep(800);
  const tree = srv.tree;
  ok('모두 나가면 방이 지워짐', !(tree.dobble && tree.dobble.rooms && tree.dobble.rooms[code]));

  ok('페이지 오류 없음', errors.length === 0, errors.slice(0, 5).join('\n'));
  console.log(`${N}명 시험: ${pass}개 통과, ${fail}개 실패 (판 ${rounds}번 시도)`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
