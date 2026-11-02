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
  await ctx.addInitScript(() => { try { if (localStorage.getItem('dobble.fs') == null) localStorage.setItem('dobble.fs', 'false'); } catch (e) {} });
  await ctx.route(/fonts\.googleapis|fonts\.gstatic|gstatic\.com\/firebasejs/, r => r.abort());
  const errors = [];
  const open = async (uid) => {
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(uid + ': ' + e.message));
    p.on('dialog', d => { if (d.type() === 'beforeunload') { p._askedLeave = true; d.accept().catch(() => {}); } else { errors.push(uid + ': dialog ' + d.type()); d.dismiss().catch(() => {}); } });
    p.on('console', m => { if (m.type() === 'error' && !/ERR_FAILED|Failed to load/.test(m.text())) errors.push(uid + ': ' + m.text()); });
    const click = p.click.bind(p);
    p.click = async (sel, o) => { await p.bringToFront(); return click(sel, o); };
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
  const typeCode = async (p, c) => { for (const d of c) { await p.click(`#pad [data-k="${d}"]`); await sleep(200); } };
  await typeCode(B, code);
  await B.waitForSelector('#lobby:not([hidden])');
  await A.waitForFunction(() => !document.querySelector('#startBtn').disabled);
  ok('A 화면에 B 이름', await A.waitForFunction(() => document.querySelector('#players').textContent.includes('토끼'), null, { timeout: 5000 }).then(() => true, () => false));
  await shot(A, '2-lobby');

  /* 기다리는 방에서 B가 나갔다가 다시 들어오기 */
  await B.click('#leave');
  await B.waitForSelector('#home:not([hidden])');
  await A.waitForFunction(() => document.querySelector('#startBtn').disabled, null, { timeout: 5000 });
  ok('B가 나가면 A 화면에 빈자리', (await A.textContent('#players')).includes('기다리는'));
  await B.click('[data-go="join"]');
  await typeCode(B, code);
  await B.waitForSelector('#lobby:not([hidden])');
  await A.waitForFunction(() => !document.querySelector('#startBtn').disabled, null, { timeout: 5000 });
  ok('B 다시 들어옴', true);

  /* 시작 */
  await B.click('#startBtn');
  await Promise.all([A, B].map(p => p.waitForSelector('#play:not([hidden])')));
  await sleep(1500);
  await shot(A, '3-countdown');
  await Promise.all([A, B].map(p => p.waitForFunction(() => G.playing, null, { timeout: 8000 })));

  const state = p => p.evaluate(() => ({ shown: G.shown, scores: G.scores, claims: G.claims.join(''), ended: G.ended, busy: G.busy, pending: !!G.pending, locked: G.locked, combo: G.combo, playing: G.playing }));
  const idle = p => p.waitForFunction(() => G.playing && !G.busy && !G.pending && !G.locked && performance.now() >= G.readyAt, null, { timeout: 8000 });
  /* 내 카드에서 맞는(또는 틀린) 그림을 눌렀다 뗌 */
  const press = async (p, right, holdMs) => {
    const pos = await p.evaluate(right => {
      if (!G.playing || G.busy || G.pending || G.locked || performance.now() < G.readyAt) return null;
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
  await idle(A);
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
  for (let i = 0; i < 3; i++) { await idle(A); await press(A, true, 40); await sleep(200); }
  await idle(A);
  const ca = await state(A);
  ok('연속 3번 → 콤보 3', ca.combo === 3 && ca.scores.a === 3, JSON.stringify(ca));
  await shot(A, '7-combo-fire');
  await sleep(400);
  await shot(B, '7-opp-view');
  const cb = await state(B);
  ok('B 화면에서도 A 3장', cb.scores.a === 3);

  /* 연속 터치 막기 */
  await idle(A);
  await press(A, true, 40);
  const guard1 = await A.evaluate(() => new Promise(res => {
    const t0 = performance.now();
    (function tick() {
      if (!G.busy && !G.pending) {
        const inGuard = performance.now() < G.readyAt;
        const c = centerCard(), sid = G.tops[G.seat].find(s => c.includes(s));
        const el = document.querySelector(`#cM .sy[data-s="${sid}"]`), r = el.getBoundingClientRect();
        el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, isPrimary: true, pointerId: 7, clientX: r.left + 5, clientY: r.top + 5 }));
        const took = !!G.pressed;
        if (took) cancelPress();
        return res({ inGuard, took });
      }
      if (performance.now() - t0 > 5000) return res({ timeout: true });
      requestAnimationFrame(tick);
    })();
  }));
  ok('새 카드 직후 바로 누르면 무시', guard1.inGuard && !guard1.took, JSON.stringify(guard1));
  await idle(A);
  const multi = await A.evaluate(() => {
    const c = centerCard(), sid = G.tops[G.seat].find(s => c.includes(s));
    const el = document.querySelector(`#cM .sy[data-s="${sid}"]`);
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, isPrimary: false, pointerId: 9 }));
    const took = !!G.pressed; if (took) cancelPress(); return took;
  });
  ok('두 번째 손가락은 무시', multi === false);
  const before = (await state(A)).shown;
  const pos = await A.evaluate(() => { const c = centerCard(), sid = G.tops[G.seat].find(s => c.includes(s)); const r = document.querySelector(`#cM .sy[data-s="${sid}"]`).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  for (let i = 0; i < 4; i++) { await A.mouse.click(pos.x, pos.y, { delay: 15 }); }
  await idle(A);
  ok('네 번 연타해도 한 판만', (await state(A)).shown === before + 1, JSON.stringify(await state(A)));

  /* 뒤로 가기(스와이프) */
  await A.evaluate(() => history.back());
  await A.waitForSelector('#ask:not([hidden])', { timeout: 3000 });
  ok('뒤로 가기 → 나갈까요? 물어봄', !(await A.isHidden('#play')));
  await shot(A, '7b-ask-quit');
  await A.click('#askBtns .primary');
  ok('계속하기 → 게임 그대로', await A.isHidden('#ask') && (await A.evaluate(() => G.playing)));

  /* 나갔다가 다시 들어오기 (새로고침) */
  const aNow = (await state(A)).scores.a;
  await B.reload();
  await B.click('#resume button');
  await B.waitForFunction(n => G.playing && G.scores.a === n, aNow, { timeout: 8000 });
  ok('새로고침 후 이어서 하기', true);
  ok('게임 중 새로고침하면 브라우저가 한 번 물어봄', B._askedLeave === true);

  /* 게임 중 나가기 */
  await A.click('#quitBtn');
  await A.waitForSelector('#ask:not([hidden])');
  await A.click('#askBtns .ghost');
  await A.waitForSelector('#home:not([hidden])');
  ok('A 나가기 → 처음 화면', true);
  await B.waitForSelector('#ask:not([hidden])', { timeout: 5000 });
  ok('B 화면: 친구가 나갔어요', /나갔어요/.test(await B.textContent('#askTitle')));
  ok('B 게임 멈춤', !(await B.evaluate(() => G.playing)));
  await shot(B, '7c-opp-left');
  await B.click('#askBtns .primary');
  await B.waitForSelector('#home:not([hidden])');
  await sleep(400);
  ok('둘 다 나가면 방 지워짐', await A.evaluate(c => !(JSON.parse(localStorage.getItem('__fakedb_dobble__') || '{}').dobble || { rooms: {} }).rooms?.[c], code));
  ok('이어서 하기 안 보임', await A.isHidden('#resume') && await B.isHidden('#resume'));

  /* 혼자 연습 */
  const S = await open('tabS');
  /* 그림 파일 세트 (시험용 그림 13개) */
  await S.evaluate(() => {
    const cs = ['#E5484D', '#F2994A', '#F2C94C', '#27AE60', '#2D9CDB', '#9B51E0', '#EB5757', '#6FCF97', '#56CCF2', '#BB6BD9', '#219653', '#F2994A', '#333'];
    const svg = (c, i) => 'data:image/svg+xml,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><circle cx="256" cy="256" r="240" fill="${c}"/><text x="256" y="330" font-size="220" text-anchor="middle" fill="#fff" font-family="sans-serif">${i + 1}</text></svg>`);
    SETS.push({ id: 'img-test', name: '그림 파일 시험', show: 'both', symbols: cs.map((c, i) => ({ img: svg(c, i), w: '그림' + (i + 1) })) });
  });
  await S.click('[data-go="make-solo"]');
  await S.click('[data-set="img-test"]');
  await S.click('#makeGo');
  await S.waitForFunction(() => G.playing, null, { timeout: 8000 });
  ok('그림 파일이 카드에 보임', await S.evaluate(() => [...document.querySelectorAll('#cM .sy img')].length === 4 && [...document.querySelectorAll('#cM .sy img')].every(i => i.complete && i.naturalWidth > 0)));
  await shot(S, '8a-image-set');
  await idle(S); await press(S, true, 40); await idle(S);
  ok('그림 파일 세트로 한 판', (await S.evaluate(() => G.shown)) === 1);
  await S.click('#quitBtn'); await S.click('#askBtns .ghost');
  await S.waitForSelector('#home:not([hidden])');
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
  await A.click('[data-go="make-solo"]'); await A.click('[data-set="basic"]'); await A.click('#makeGo');
  await A.waitForFunction(() => G.playing, null, { timeout: 8000 });
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
