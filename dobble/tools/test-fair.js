/* 공정성 시험 — 인터넷이 느린 태블릿이 더 빨리 누르면 이겨야 함
   node dobble/tools/test-fair.js [주소] [느린쪽 지연ms=250] [판 수=8] */
'use strict';
const path = require('path');
const fs = require('fs');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/npm-tools/node_modules/playwright'); }
const BASE = process.argv[2] || 'http://localhost:8123/dobble/';
const SLOW = +(process.argv[3] || 250);
const ROUNDS = +(process.argv[4] || 8);
const fake = fs.readFileSync(path.join(__dirname, 'fake-db.js'), 'utf8');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) pass++; else { fail++; console.log('✗', n, x || ''); } };

(async () => {
  const browser = await pw.chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const srv = await require('./fake-server')(ctx);
  await ctx.addInitScript(fake);
  await ctx.addInitScript(() => { try { localStorage.setItem('dobble.fs', 'false'); } catch (e) {} });
  await ctx.route(/fonts\.googleapis|fonts\.gstatic|gstatic\.com\/firebasejs/, r => r.abort());
  const errors = [];
  const open = async (uid, lag) => {
    const p = await ctx.newPage();
    p.on('pageerror', e => errors.push(uid + ': ' + e.message));
    await p.goto(`${BASE}?uid=${uid}&lag=${lag}`);
    return p;
  };
  const A = await open('fastNet', 30), B = await open('slowNet', SLOW);
  await A.click('[data-go="make-duo"]'); await A.click('[data-len="10"]'); await A.click('#makeGo');
  await A.waitForSelector('#lobby:not([hidden]) #codeBig span');
  const code = (await A.textContent('#codeBig')).trim();
  await B.click('[data-go="join"]');
  for (const d of code) { await B.click(`#pad [data-k="${d}"]`); await sleep(180); }
  await A.waitForFunction(() => !document.querySelector('#startBtn').disabled, null, { timeout: 8000 });
  await A.click('#startBtn');
  for (const p of [A, B]) await p.waitForFunction(() => G.playing, null, { timeout: 10000 });

  /* 각 탭 안에서: 새 카드가 내 화면에 나온 뒤 정해진 시간에 정답을 누름 (탭이 뒤에 있어도 돌아가게 페이지 안 타이머로) */
  const arm = (p, reactMs) => p.evaluate(ms => {
    window.__auto = setInterval(() => {
      if (!G.playing || G.ended || G.busy || G.pending || G.locked || G.pressed) return;
      if (performance.now() - G.roundStart < ms) return;
      const c = centerCard(), sid = G.tops[G.seat].find(s => c.includes(s));
      const el = document.querySelector(`#cM .sy[data-s="${sid}"]`); if (!el) return;
      const r = el.getBoundingClientRect(), o = { bubbles: true, isPrimary: true, pointerId: 3, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
      G.readyAt = 0;
      el.dispatchEvent(new PointerEvent('pointerdown', o));
      window.dispatchEvent(new PointerEvent('pointerup', o));
    }, 15);
  }, reactMs);
  await arm(A, 750);    // 인터넷 빠름, 느리게 찾음
  await arm(B, 300);    // 인터넷 느림, 빨리 찾음
  const t0 = Date.now();
  while (Date.now() - t0 < 90000) {
    const n = await A.evaluate(() => G.shown);
    if (n >= ROUNDS) break;
    await sleep(300);
  }
  for (const p of [A, B]) await p.evaluate(() => clearInterval(window.__auto));
  await sleep(1500);
  const room = srv.tree.dobble.rooms[code], cl = room.claims || {};
  const rs = Object.keys(cl).map(Number).sort((x, y) => x - y).slice(0, ROUNDS).map(k => cl[k]);
  const both = rs.filter(c => typeof c.a === 'number' && typeof c.b === 'number');
  const bWins = rs.filter(c => c.win === 'b').length;
  console.log('판별 기록:', rs.map(c => `a${c.a ?? '-'} b${c.b ?? '-'} → ${c.win}`).join(' | '));
  ok(`${ROUNDS}판 진행`, rs.length >= ROUNDS, rs.length);
  ok('둘 다 맞힌 판이 있음', both.length >= 1, both.length);
  ok('인터넷이 느려도 더 빨리 누른 쪽(b)이 이김', bWins >= ROUNDS - 1, `b ${bWins}/${rs.length}`);
  const sa = await A.evaluate(() => JSON.stringify(G.scores)), sb = await B.evaluate(() => JSON.stringify(G.scores));
  ok('두 태블릿 점수 같음', sa === sb, sa + ' / ' + sb);
  const missTexts = await A.evaluate(() => [...document.querySelectorAll('.float-text')].map(x => x.textContent));
  ok('페이지 오류 없음', errors.length === 0, errors.slice(0, 3).join('\n'));
  console.log(`공정성 시험 (느린 쪽 지연 ${SLOW}ms): ${pass}개 통과, ${fail}개 실패`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
