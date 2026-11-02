/* 딱! 같은 그림 — 효과 (소리 · 파편 · 콤보 불)
   파편·꼬리·불은 화면 전체를 덮는 캔버스 하나에 그림 (태블릿에서 가볍게) */
'use strict';

const FX = (function () {
  /* ---------- 소리 ---------- */
  let ac = null, nb = null;
  function audio() {
    if (!ac) { const C = window.AudioContext || window.webkitAudioContext; if (!C) return null; ac = new C(); }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  function tone(f, d, type, v, f2, delay) {
    try {
      if (!audio()) return;
      const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + (delay || 0);
      o.type = type || 'sine'; o.frequency.setValueAtTime(f, t);
      if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d);
      g.gain.setValueAtTime(v || .15, t); g.gain.exponentialRampToValueAtTime(.001, t + d);
      o.connect(g).connect(ac.destination); o.start(t); o.stop(t + d);
    } catch (e) {}
  }
  function noise(d, v, freq, ftype, f2) {
    try {
      if (!audio()) return;
      if (!nb) { nb = ac.createBuffer(1, ac.sampleRate, ac.sampleRate); const ch = nb.getChannelData(0); for (let i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1; }
      const s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain(), t = ac.currentTime;
      s.buffer = nb; f.type = ftype; f.frequency.setValueAtTime(freq, t);
      if (f2) f.frequency.exponentialRampToValueAtTime(f2, t + d);
      g.gain.setValueAtTime(.001, t); g.gain.linearRampToValueAtTime(v, t + Math.min(.05, d / 4)); g.gain.exponentialRampToValueAtTime(.001, t + d);
      s.connect(f).connect(g).connect(ac.destination); s.start(t); s.stop(t + d);
    } catch (e) {}
  }

  /* ---------- 캔버스 ---------- */
  const cv = document.getElementById('fx'), cx = cv.getContext('2d');
  const DPR = Math.min(window.devicePixelRatio || 1, QUALITY.pixelRatio);
  let W = 0, H = 0, parts = [], raf = 0, last = 0, clock = 0;
  let fireLv = 0, oppLv = 0;
  function resize() { W = innerWidth; H = innerHeight; cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); cx.setTransform(DPR, 0, 0, DPR, 0, 0); }
  addEventListener('resize', resize); resize();
  const kick = () => { if (!raf) { last = performance.now(); raf = requestAnimationFrame(loop); } };
  const add = p => { if (parts.length < QUALITY.maxParticles) { parts.push(p); kick(); } };

  function dot(x, y, size, color, ms, dx, dy) { add({ k: 'dot', x, y, dx: dx || 0, dy: dy || 0, size, color, life: 0, max: ms }); }
  function burst(x, y, n, spread) {
    const cs = ['#EF9F27', '#1D9E75', '#7F77DD', '#D4537E', '#378ADD'];
    for (let i = 0; i < n; i++) { const a = rnd(0, Math.PI * 2), d = rnd(30, spread); dot(x, y, rnd(5, 11), cs[i % cs.length], rnd(450, 750), Math.cos(a) * d, Math.sin(a) * d + 25); }
  }
  function ring(x, y, color, size, ms) { add({ k: 'ring', x, y, size, color, life: 0, max: ms }); }

  /* 불: 화면 테두리에서 생김 (아래쪽이 가장 많이) */
  function edgePoint(topOnly) {
    if (topOnly) return [Math.random() * W, 0, 0, 1];
    const wB = W * 1.6, wS = H, wT = W * .7, tot = wB + 2 * wS + wT;
    let d = Math.random() * tot;
    if (d < wB) return [d / 1.6, H, 0, -1]; d -= wB;
    if (d < wS) return [0, H - d, 1, 0]; d -= wS;
    if (d < wS) return [W, H - d, -1, 0]; d -= wS;
    return [d / .7, 0, 0, 1];
  }
  function spawnFire(n, lv, boost, topOnly) {
    const h = FIRE.baseHeight + lv * FIRE.heightPerLevel, hs = h / 30;
    for (let i = 0; i < n && parts.length < QUALITY.maxParticles; i++) {
      const [x, y, nx, ny] = edgePoint(topOnly), sp = rnd(.7, 1.3) * Math.sqrt(hs) * boost;
      parts.push({ k: 'fire', x, y, vx: nx * rnd(.4, 1) * sp + rnd(-.25, .25), vy: ny * rnd(.4, 1) * sp - rnd(.6, 1.3) * sp * (topOnly ? .3 : 1), life: 0, max: rnd(26, 46) * Math.sqrt(hs), size: rnd(6, 12) * Math.pow(hs, .6), seed: rnd(0, 6.28) });
    }
    if (!topOnly && lv >= FIRE.emberFrom && Math.random() < .15 * lv && parts.length < QUALITY.maxParticles) {
      const [x, y, nx, ny] = edgePoint();
      parts.push({ k: 'ember', x, y, vx: nx * rnd(.5, 1.5) + rnd(-.5, .5), vy: ny * rnd(.5, 1.5) - rnd(1.5, 3), life: 0, max: rnd(50, 90), size: rnd(1.5, 3), seed: rnd(0, 6.28) });
    }
  }
  const fireColor = t => t < .18 ? '250,238,180' : t < .45 ? '239,159,39' : t < .72 ? '216,90,48' : '163,45,45';
  const easeOut = t => 1 - Math.pow(1 - t, 3);

  function loop(now) {
    raf = 0;
    const dt = Math.min(50, now - last); last = now; clock += dt;
    const f = dt / 16.67;
    cx.clearRect(0, 0, W, H);
    if (fireLv > 0) {
      spawnFire(Math.round((FIRE.baseRate + fireLv * FIRE.ratePerLevel) * f), fireLv, 1);
      if (Math.random() < .03 * fireLv * f) noise(.04, .05 + .01 * fireLv, rnd(1500, 3500), 'bandpass');
    }
    if (oppLv > 0) spawnFire(Math.max(1, Math.round((FIRE.baseRate + oppLv * FIRE.ratePerLevel) * FIRE.oppScale * f)), oppLv * FIRE.oppScale, 1, true);
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      if (p.k === 'dot' || p.k === 'ring') {
        p.life += dt; const t = p.life / p.max;
        if (t >= 1) { parts.splice(i, 1); continue; }
        if (p.k === 'dot') {
          const e = easeOut(t);
          cx.globalAlpha = .9 * (1 - t); cx.fillStyle = p.color;
          cx.beginPath(); cx.arc(p.x + p.dx * e, p.y + p.dy * e, Math.max(.5, p.size / 2 * (1 - t * .9)), 0, 6.283); cx.fill();
        } else {
          cx.globalAlpha = 1 - t; cx.strokeStyle = p.color; cx.lineWidth = 3;
          cx.beginPath(); cx.arc(p.x, p.y, Math.max(1, p.size / 2 * (.2 + .8 * easeOut(t))), 0, 6.283); cx.stroke();
        }
        continue;
      }
      p.life += f; const t = p.life / p.max;
      if (t >= 1) { parts.splice(i, 1); continue; }
      p.x += (p.vx + Math.sin(clock * .015 + p.seed) * .5) * f; p.y += p.vy * f;
      if (p.k === 'fire') {
        p.vy -= .02 * f;
        cx.globalAlpha = 1; cx.fillStyle = `rgba(${fireColor(t)},${((1 - t) * .85).toFixed(2)})`;
        cx.beginPath(); cx.arc(p.x, p.y, p.size * (1 - t * .65), 0, 6.283); cx.fill();
      } else if (p.k === 'ember') {
        cx.globalAlpha = 1; cx.fillStyle = `rgba(250,199,117,${(1 - t).toFixed(2)})`;
        cx.beginPath(); cx.arc(p.x, p.y, p.size, 0, 6.283); cx.fill();
      } else {
        p.vy *= .98; p.size += .35 * f;
        cx.globalAlpha = 1; cx.fillStyle = `rgba(136,135,128,${((1 - t) * .3).toFixed(2)})`;
        cx.beginPath(); cx.arc(p.x, p.y, p.size, 0, 6.283); cx.fill();
      }
    }
    cx.globalAlpha = 1;
    if (fireLv > 0 || oppLv > 0 || parts.length) raf = requestAnimationFrame(loop);
  }

  /* 내 콤보 → 불 단계 */
  function setCombo(combo) {
    const lv = combo >= FIRE.startCombo ? Math.min(combo - FIRE.startCombo + 1, FIRE.maxLevel) : 0;
    if (lv > fireLv) {
      fireLv = lv; spawnFire(60 + lv * 35, lv, 1.8);
      noise(.6 + lv * .05, .18 + lv * .03, 300, 'lowpass', 2200); tone(70, .4, 'sine', .15 + lv * .02, 45);
    } else if (lv === 0 && fireLv > 0) {
      fireLv = 0;
      parts.forEach(p => { if (p.k === 'fire' || p.k === 'ember') { p.k = 'smoke'; p.life = 0; p.max = rnd(40, 70); p.vx *= .3; p.vy = -rnd(.4, 1); } });
      noise(.7, .16, 2500, 'highpass', 6000);
    } else fireLv = lv;
    kick();
  }
  /* 상대 콤보 → 위쪽 테두리에 비치는 불 */
  function setOpp(streak) {
    oppLv = FIRE.oppScale > 0 && streak >= FIRE.startCombo ? Math.min(streak - FIRE.startCombo + 1, FIRE.maxLevel) : 0;
    kick();
  }
  function clearAll() { fireLv = 0; oppLv = 0; parts = []; cx.clearRect(0, 0, W, H); }

  /* ---------- 화면 요소 ---------- */
  function shake(el, amp, ms) {
    const fr = [{ translate: '0 0' }];
    for (let k = 5; k > 0; k--) { const a = amp * k / 5; fr.push({ translate: `${rnd(-a, a).toFixed(1)}px ${rnd(-a, a).toFixed(1)}px` }); }
    fr.push({ translate: '0 0' });
    el.animate(fr, { duration: ms, easing: 'ease-out' });
  }
  function floatText(x, y, text, color) {
    const p = document.createElement('div');
    p.className = 'float-text'; p.textContent = text; p.style.left = x + 'px'; p.style.top = y + 'px';
    if (color) p.style.color = color;
    document.getElementById('fly').appendChild(p);
    p.animate([{ transform: 'translate(-50%,-50%) scale(.6)', opacity: 0 }, { transform: 'translate(-50%,-140%) scale(1.15)', opacity: 1, offset: .3 }, { transform: 'translate(-50%,-260%) scale(1)', opacity: 0 }], { duration: 850, easing: 'ease-out' }).onfinish = () => p.remove();
  }

  return { audio, tone, noise, dot, burst, ring, setCombo, setOpp, clearAll, shake, floatText };
})();
