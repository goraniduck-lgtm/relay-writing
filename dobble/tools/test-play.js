/* 두 태블릿 대결 브라우저 시험 — 저장소 맨 위에서 정적 서버를 띄운 뒤
   node dobble/tools/test-play.js [주소=http://localhost:8123/dobble/] [지연ms=60] [그림저장폴더] */
'use strict';
const path = require('path');
const fs = require('fs');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/npm-tools/node_modules/playwright'); }
const BASE = process.argv[2] || 'http://localhost:8123/dobble/';
const LAG = +(process.argv[3] || 60);
const SHOTS = process.argv[4] || null;
const fake = fs.readFileSync(path.join(__dirname, 'fake-db.js'), 'utf8');
let pass = 0, fail = 0;
const ok = (name, cond, extra) => { if (cond) pass++; else { fail++; console.log('✗', name, extra || ''); } };
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await pw.chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, hasTouch: true });
  const server = {};
  await ctx.exposeFunction('__serverClaim', (p, v) => { if (server[p]) return false; server[p] = v; return true; });
  await ctx.addInitScript(fake);
  await ctx.route(/fonts\.googleapis|fonts\.gstatic|gstatic\.com\/firebasejs/, r => r.abort());
  const errors = [];
  const open = async (uid) => {
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(uid + ': ' + e.message));
    p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|Failed to load/.test(m.text())) errors.push(uid + ': ' + m.text()); });
    await p.goto(`${BASE}?uid=${uid}&lag=${LAG}`);
    return p;
  };
  const shot = async (p, name) => { await p.bringToFront(); if (SHOTS) await p.screenshot({ path: path.join(SHOTS, name + '.png') }); };
  const A = await open('tabA'), B = await open('tabB');

  /* 방 만들기 · 들어가기 */
  await A.fill('#nick', '번개손');
  await A.click('[data-go="make-duo"]');
  await A.click('[data-len="15"]');
  await shot(A, '1-make');
  await A.click('#makeGo');
  await A.waitForSelector('#lobby:not([hidden]) #codeBig span');
  const code = (await A.textContent('#codeBig')).trim();
  ok('방 번호 네 자리', /^\d{4}$/.test(code), code);
  await B.fill('#nick', '토끼');
  await B.click('[data-go="join"]');
  for (const d of '0000'.slice(0, 0) + code) await B.click(`#pad [data-k="${d}"]`);
  await B.waitForSelector('#lobby:not([hidden])');
  await A.waitForFunction(() => !document.querySelector('#startBtn').disabled);
  ok('A 화면에 B 이름', (await A.textContent('#players')).includes('토끼'));
  await shot(A, '2-lobby');

  /* 시작 */
  await B.click('#startBtn');
  await Promise.all([A, B].map(p => p.waitForSelector('#play:not([hidden])')));
  await sleep(1500);
  await shot(A, '3-countdown');
  await Promise.all([A, B].map(p => p.waitForFunction(() => G.playing, null, { timeout: 8000 })));

  const state = p => p.evaluate(() => ({ shown: G.shown, scores: G.scores, claims: G.claims.join(''), ended: G.ended, busy: G.busy, pending: !!G.pending, locked: G.locked, combo: G.combo, playing: G.playing }));
  /* 내 카드에서 맞는(또는 틀린) 그림을 눌렀다 뗌 */
  const press = async (p, right, holdMs) => {
    const pos = await p.evaluate(right => {
      if (!G.playing || G.busy || G.pending || G.locked) return null;
      const c = centerCard(); const mine = G.tops[G.seat];
      const sid = right ? mine.find(s => c.includes(s)) : mine.find(s => !c.includes(s));
      const el = document.querySelector(`#cM .sy[data-s="${sid}"]`);
      const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }, right);
    if (!pos) return false;
    await p.bringToFront();
    await p.mouse.move(pos.x, pos.y); await p.mouse.down(); await sleep(holdMs || 60); await p.mouse.up();
    return true;
  };

  /* 틀린 그림 → 잠김 */
  await press(A, false);
  ok('틀리면 잠김', await A.waitForFunction(() => G.locked, null, { timeout: 3000 }).then(() => true, () => false));
  await shot(A, '4-wrong');
  ok('잠깐 뒤 풀림', await A.waitForFunction(() => !G.locked, null, { timeout: 3000 }).then(() => true, () => false));

  /* 대결: 둘 다 거의 동시에 누르기, 가끔 한쪽만 */
  let rounds = 0, guard = 0, raced = 0;
  while (guard++ < 200) {
    const [a, b] = [await state(A), await state(B)];
    if (a.ended && b.ended) break;
    const mode = rounds % 4;
    if (mode === 0 || mode === 3) { const r = await Promise.all([press(A, true, 30), press(B, true, 40)]); if (r[0] && r[1]) raced++; }
    else if (mode === 1) await press(A, true, 50);
    else await press(B, true, 50);
    rounds++;
    if (rounds === 6) await shot(A, '5-midgame');
    await sleep(250 + Math.random() * 300);
  }
  await Promise.all([A, B].map(p => p.waitForFunction(() => G.ended, null, { timeout: 15000 }).catch(() => {})));
  const [fa, fb] = [await state(A), await state(B)];
  ok('두 태블릿 모두 끝남', fa.ended && fb.ended, JSON.stringify([fa, fb]));
  ok('판 기록이 두 태블릿에서 같음', fa.claims === fb.claims && fa.claims.length === 13, fa.claims + ' / ' + fb.claims);
  ok('점수 같음', JSON.stringify(fa.scores) === JSON.stringify(fb.scores), JSON.stringify([fa.scores, fb.scores]));
  ok('점수 합 = 판 수', fa.scores.a + fa.scores.b === 13);
  ok('동시에 누른 판이 있었음', raced > 0, raced);
  const log = [...await A.evaluate(() => __FAKE_LOG__), ...await B.evaluate(() => __FAKE_LOG__)];
  const winsPerRound = {};
  for (const l of log) if (l.ok) winsPerRound[l.path] = (winsPerRound[l.path] || 0) + 1;
  ok('한 판에 승자 하나', Object.values(winsPerRound).every(v => v === 1));
  ok('동시 누름에서 진 쪽이 있음 (아깝다)', log.some(l => !l.ok), log.length);
  await Promise.all([A, B].map(p => p.waitForSelector('#result:not([hidden])')));
  const ta = await A.textContent('#rTitle'), tb = await B.textContent('#rTitle');
  ok('결과 문구', (fa.scores.a > fa.scores.b ? /이겼다/.test(ta) && /아깝다/.test(tb) : fa.scores.a < fa.scores.b ? /아깝다/.test(ta) && /이겼다/.test(tb) : /비겼다/.test(ta)), ta + ' / ' + tb);
  await shot(A, '6-result-A'); await shot(B, '6-result-B');

  /* 다시 하기 */
  const seed0 = await A.evaluate(() => G.cfg.seed);
  for (const k of Object.keys(server)) delete server[k];
  await B.click('#again');
  await Promise.all([A, B].map(p => p.waitForFunction(s => G.cfg.seed !== s && !G.ended, seed0, { timeout: 8000 })));
  ok('다시 하기: 두 태블릿 결과창 닫힘', await A.isHidden('#result') && await B.isHidden('#result'));
  await Promise.all([A, B].map(p => p.waitForFunction(() => G.playing, null, { timeout: 8000 })));
  const ra = await state(A);
  ok('다시 하기: 점수 0부터', ra.scores.a === 0 && ra.scores.b === 0 && ra.claims === '');
  ok('다시 하기: 같은 가운데 카드', JSON.stringify(await A.evaluate(() => centerCard())) === JSON.stringify(await B.evaluate(() => centerCard())));
  const idle = p => p.waitForFunction(() => G.playing && !G.busy && !G.pending && !G.locked, null, { timeout: 8000 });
  for (let i = 0; i < 3; i++) { await idle(A); await press(A, true, 40); await sleep(200); }
  await idle(A);
  const ca = await state(A);
  ok('연속 3번 → 콤보 3', ca.combo === 3 && ca.scores.a === 3, JSON.stringify(ca));
  await shot(A, '7-combo-fire');
  await sleep(400);
  await shot(B, '7-opp-view');
  const cb = await state(B);
  ok('B 화면에서도 A 3장', cb.scores.a === 3);

  /* 나갔다가 다시 들어오기 (새로고침) */
  await B.reload();
  await B.click('#resume button');
  await B.waitForFunction(() => G.playing && G.scores.a === 3, null, { timeout: 8000 });
  ok('새로고침 후 이어서 하기', true);

  /* 혼자 연습 */
  const S = await open('tabS');
  await S.click('[data-go="make-solo"]');
  await S.click('[data-set="sci-ecosystem"]');
  await S.click('#makeGo');
  await S.waitForFunction(() => G.playing, null, { timeout: 8000 });
  await shot(S, '8-solo-science');
  let g2 = 0;
  while (!(await S.evaluate(() => G.ended)) && g2++ < 40) { await idle(S).catch(() => {}); await press(S, true, 40); await sleep(150); }
  await S.waitForSelector('#result:not([hidden])', { timeout: 5000 });
  ok('혼자 연습 끝까지', /기록|찾았다/.test(await S.textContent('#rTitle')));
  await shot(S, '9-solo-result');

  /* 세로 화면 */
  await A.setViewportSize({ width: 800, height: 1280 });
  await sleep(300);
  const geo = await A.evaluate(() => { const a = cC.getBoundingClientRect(), b = cM.getBoundingClientRect(); return { a: [a.top, a.bottom, a.width], b: [b.top, b.bottom], h: innerHeight }; });
  ok('세로 화면: 위아래로 겹치지 않고 들어감', geo.a[1] <= geo.b[0] && geo.b[1] <= geo.h && geo.a[2] > 250, JSON.stringify(geo));
  await shot(A, '10-portrait');

  ok('페이지 오류 없음', errors.length === 0, errors.slice(0, 5).join('\n'));
  console.log(`대결 시험: ${pass}개 통과, ${fail}개 실패 (판 ${rounds}번 시도, 동시 ${raced}번)`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
