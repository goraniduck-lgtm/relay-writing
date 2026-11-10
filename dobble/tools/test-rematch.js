/* 다시 하기 시험 — 한 태블릿이 아직 '상대가 카드 가져가는 장면'을 보여 주는 중에 다른 태블릿이 다시 하기를 눌러도
   다음 판이 모두에게 제대로 이어지는지 (예전에는 그 태블릿이 멈춰서 계속 '아깝다'가 떴음)
   node dobble/tools/test-rematch.js [주소] */
'use strict';
const path = require('path');
const fs = require('fs');
let pw; try { pw = require('playwright'); } catch (e) { pw = require('/opt/npm-tools/node_modules/playwright'); }
const BASE = process.argv[2] || 'http://localhost:8123/dobble/';
const fake = fs.readFileSync(path.join(__dirname, 'fake-db.js'), 'utf8');
const sleep = ms => new Promise(r => setTimeout(r, ms));
let pass = 0, fail = 0;
const ok = (n, c, x) => { if (c) pass++; else { fail++; console.log('✗', n, x || ''); } };

(async () => {
  const browser = await pw.chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await require('./fake-server')(ctx);
  await ctx.addInitScript(fake);
  await ctx.addInitScript(() => { try { localStorage.setItem('dobble.fs', 'false'); } catch (e) {} });
  await ctx.route(/fonts\.googleapis|fonts\.gstatic|gstatic\.com\/firebasejs/, r => r.abort());
  const errors = [];
  const open = async (uid, lag) => { const p = await ctx.newPage(); p.on('pageerror', e => errors.push(uid + ': ' + e.message)); await p.goto(`${BASE}?uid=${uid}&lag=${lag}`); return p; };
  const A = await open('rA', 20), B = await open('rB', 20), C = await open('rC', 900);
  await A.click('[data-go="make-duo"]'); await A.click('[data-max="3"]'); await A.click('[data-len="6"]'); await A.click('#makeGo');
  await A.waitForSelector('#lobby:not([hidden]) #codeBig span');
  const code = (await A.textContent('#codeBig')).trim();
  for (const p of [B, C]) { await p.click('[data-go="join"]'); for (const d of code) { await p.click(`#pad [data-k="${d}"]`); await sleep(180); } await p.waitForSelector('#lobby:not([hidden])'); }
  await A.waitForFunction(() => document.querySelectorAll('#players .pl:not(.empty)').length === 3);
  await A.click('#startBtn');
  for (const p of [A, B, C]) await p.waitForFunction(() => G.playing, null, { timeout: 10000 });
  /* A 만 계속 맞힘 (페이지 안 타이머) */
  const arm = (p, ms) => p.evaluate(ms => {
    clearInterval(window.__auto);
    window.__auto = setInterval(() => {
      if (!G.playing || G.ended || G.busy || G.pending || G.locked || G.pressed) return;
      if (performance.now() - G.roundStart < ms) return;
      const c = centerCard(), sid = G.tops[G.seat].find(s => c.includes(s));
      const el = document.querySelector(`#cM .sy[data-s="${sid}"]`); if (!el) return;
      const r = el.getBoundingClientRect(), o = { bubbles: true, isPrimary: true, pointerId: 3, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 };
      G.readyAt = 0; el.dispatchEvent(new PointerEvent('pointerdown', o)); window.dispatchEvent(new PointerEvent('pointerup', o));
    }, 15);
  }, ms);
  await arm(A, 300);
  /* C 에서는 마지막 판의 '상대가 가져가는 장면'이 끝나기 전에 다시 하기가 오도록: A 화면에 결과가 뜨는 순간 다시 하기 */
  await A.waitForFunction(() => !document.querySelector('#result').hidden, null, { timeout: 120000 });
  const cBusy = await C.evaluate(() => ({ syncing: G.syncing, busy: G.busy, shown: G.shown }));
  await A.evaluate(() => { clearInterval(window.__auto); document.querySelector('#again').click(); });
  for (const p of [A, B, C]) await p.waitForFunction(() => G.playing && G.shown === 0, null, { timeout: 10000 });
  /* 새 판: B 만 맞힘 → C 화면도 따라와야 함 */
  await arm(B, 300);
  await sleep(6000);
  const st = await Promise.all([A, B, C].map(p => p.evaluate(() => ({ shown: G.shown, syncing: G.syncing, claims: G.claims.join('') }))));
  console.log('다시 하기 직전 C:', JSON.stringify(cBusy), '/ 새 판:', JSON.stringify(st));
  ok('새 판에서 판이 진행됨', st[1].shown >= 3, st[1].shown);
  ok('C 화면도 같은 판까지 따라옴', Math.abs(st[2].shown - st[1].shown) <= 1, `B ${st[1].shown} / C ${st[2].shown}`);
  ok('A 화면도 따라옴', Math.abs(st[0].shown - st[1].shown) <= 1, `B ${st[1].shown} / A ${st[0].shown}`);
  /* C 가 맞혀 보기 — '아깝다' 대신 가져가야 함 */
  await B.evaluate(() => clearInterval(window.__auto));
  const bShown = await B.evaluate(() => G.shown);
  ok('B 가 멈춘 뒤 C 가 같은 판까지 따라잡음', await C.waitForFunction(n => G.shown === n && !G.busy && !G.syncing, bShown, { timeout: 10000 }).then(() => true, () => false));
  const before = await C.evaluate(() => G.scores[G.seat]);
  await arm(C, 200);
  await C.waitForFunction(b => G.scores[G.seat] > b, before, { timeout: 15000 }).catch(() => {});
  await C.evaluate(() => clearInterval(window.__auto));
  const after = await C.evaluate(() => G.scores[G.seat]);
  ok('C 가 맞히면 카드를 가져감', after > before, `${before} → ${after}`);
  ok('페이지 오류 없음', errors.length === 0, errors.slice(0, 3).join('\n'));
  console.log(`다시 하기 시험: ${pass}개 통과, ${fail}개 실패`);
  await browser.close();
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
