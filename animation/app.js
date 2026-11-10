/* 애니메이션 공방 — 그리기·장면 관리·재생·자동 저장 (학생 태블릿)
   메모리 아끼기: 장면은 PNG(Blob)로만 보관하고, 지금 그리는 장면 하나만 큰 캔버스에 펼침.
   실행 취소 기록도 지금 장면만(최대 15번). 그래서 120장면이어도 태블릿 메모리를 적게 씀. */
'use strict';
(function () {
  const W = 960, H = 540, MAX = 120, TW = 160, TH = 90, HIST = 15;
  const $ = id => document.getElementById(id);
  const paint = $('paint'), ctx = paint.getContext('2d', { willReadFrequently: true });
  const ghost = $('ghost').getContext('2d');
  const COLORS = ['#222222', '#ffffff', '#e5484d', '#f76b15', '#ffc53d', '#46a758', '#12a594', '#2f7de1', '#8e4ec6', '#d6409f', '#8d6e63', '#9aa5b1'];

  let frames = [], cur = 0, nextId = 1;
  let tool = 'pen', color = '#222222', drawing = false, last = null;
  let hist = [], redoS = [], selMode = false;
  const sel = new Set();
  let version = 0;                       // 그림이 바뀔 때마다 +1 (GIF 다시 만들기 판단)

  /* ---------- 장면 ---------- */
  function mkThumb() { const c = document.createElement('canvas'); c.width = TW; c.height = TH; return c; }
  function newFrame(blob) { return { id: nextId++, blob: blob || null, thumb: mkThumb(), dirty: false, p: null }; }
  function drawThumb(f, src) {
    const x = f.thumb.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, TW, TH);
    if (src) x.drawImage(src, 0, 0, TW, TH);
  }
  function copyThumb(from, to) { const x = to.thumb.getContext('2d'); x.clearRect(0, 0, TW, TH); x.drawImage(from.thumb, 0, 0); }

  /* 그림 풀기(Blob → ImageBitmap) — 최근 것 몇 개만 기억 */
  const cache = new Map();   // id -> {blob, bm}
  async function decode(f) {
    if (!f || !f.blob) return null;
    const c = cache.get(f.id);
    if (c && c.blob === f.blob) { cache.delete(f.id); cache.set(f.id, c); return c.bm; }
    const blob = f.blob;
    let bm;
    try { bm = await createImageBitmap(blob); }
    catch (e) { bm = await new Promise((res, rej) => { const u = URL.createObjectURL(blob), im = new Image(); im.onload = () => { URL.revokeObjectURL(u); res(im); }; im.onerror = rej; im.src = u; }); }
    if (c && c.bm && c.bm.close) try { c.bm.close(); } catch (e) {}
    cache.delete(f.id);
    cache.set(f.id, { blob, bm });
    while (cache.size > 6) { const [k, v] = cache.entries().next().value; cache.delete(k); if (v.bm && v.bm.close) try { v.bm.close(); } catch (e) {} }
    return bm;
  }

  function isBlank() {
    const d = new Uint32Array(ctx.getImageData(0, 0, W, H).data.buffer);
    for (let i = 0; i < d.length; i++) if (d[i] >>> 24) return false;   // 투명하지 않은 점이 하나라도 있으면
    return true;
  }
  /* 지금 장면을 PNG로 굳히기 */
  function commit() {
    const f = frames[cur];
    if (!f || !f.dirty) return (f && f.p) || Promise.resolve();
    f.dirty = false;
    drawThumb(f, paint);
    const blank = isBlank();
    const p = new Promise(res => {
      if (blank) { f.blob = null; res(); return; }
      paint.toBlob(b => { if (f.p === p && b) f.blob = b; res(); }, 'image/png');
    });
    f.p = p;
    p.then(() => { if (f.p === p) f.p = null; autosave(); });
    return p;
  }
  let commitT = null;
  function commitSoon() { clearTimeout(commitT); commitT = setTimeout(commit, 700); }
  async function commitAll() { clearTimeout(commitT); await commit(); await Promise.all(frames.map(f => f.p).filter(Boolean)); }

  /* 차례로 실행 (빠르게 여러 번 눌러도 꼬이지 않게) */
  let q = Promise.resolve();
  const run = fn => (q = q.then(fn).catch(e => console.warn(e)));

  async function loadCurrent() {
    $('stage').classList.add('busy');
    try {
      const f = frames[cur];
      const bm = await decode(f);
      if (frames[cur] !== f) return;
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, W, H);
      if (bm) ctx.drawImage(bm, 0, 0, W, H);
      await drawGhost();
    } finally { $('stage').classList.remove('busy'); updHist(); }
  }
  const tint = document.createElement('canvas'); tint.width = W; tint.height = H;
  async function drawGhost() {
    ghost.clearRect(0, 0, W, H);
    const tx = tint.getContext('2d');
    const layers = [];
    if ($('onPrev').checked && cur > 0) layers.push([frames[cur - 1], '#e5484d']);
    if ($('onNext').checked && cur < frames.length - 1) layers.push([frames[cur + 1], '#2f7de1']);
    for (const [f, col] of layers) {
      const bm = await decode(f); if (!bm) continue;
      tx.globalCompositeOperation = 'source-over'; tx.clearRect(0, 0, W, H); tx.drawImage(bm, 0, 0, W, H);
      tx.globalCompositeOperation = 'source-in'; tx.fillStyle = col; tx.fillRect(0, 0, W, H);
      ghost.globalAlpha = 0.3; ghost.drawImage(tint, 0, 0); ghost.globalAlpha = 1;
    }
  }

  function go(i) {
    return run(async () => {
      i = Math.max(0, Math.min(frames.length - 1, i));
      if (i === cur) return;
      await commit();
      cur = i; hist = []; redoS = [];
      renderStrip(); await loadCurrent();
    });
  }

  /* ---------- 장면 줄 ---------- */
  function renderStrip() {
    const st = $('strip');
    st.innerHTML = '';
    frames.forEach((f, i) => {
      const b = document.createElement('div');
      b.className = 'fr' + (i === cur ? ' cur' : '') + (sel.has(f.id) ? ' sel' : '');
      b.setAttribute('role', 'button'); b.tabIndex = 0;
      b.setAttribute('aria-label', `장면 ${i + 1}`);
      const sp = document.createElement('span'); sp.textContent = i + 1;
      b.append(f.thumb, sp);
      b.onclick = () => {
        if (selMode) { sel.has(f.id) ? sel.delete(f.id) : sel.add(f.id); renderStrip(); }
        else go(i);
      };
      st.append(b);
    });
    $('curNo').textContent = cur + 1; $('total').textContent = frames.length;
    $('selCount').textContent = `${sel.size}장 골랐어요`;
    const full = frames.length >= MAX;
    $('addBlank').disabled = full; $('dupFrame').disabled = full; $('sCopy').disabled = full || !sel.size;
    $('mvLeft').disabled = cur === 0; $('mvRight').disabled = cur === frames.length - 1;
    ['sFirst', 'sLeft', 'sRight', 'sLast', 'sDel'].forEach(id => { $(id).disabled = !sel.size; });
    const curEl = st.children[cur];
    if (curEl && !selMode) curEl.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }

  /* 장면 바꾸기 공통: 바꾸기 전 상태를 기억해 '되돌리기' */
  let undoOps = null;
  function structural(label, fn, canUndo) {
    return run(async () => {
      await commit();
      const before = { frames: frames.slice(), cur, curId: frames[cur].id };
      const curId = frames[cur].id;
      const keepCur = fn();
      if (!frames.length) frames.push(newFrame());
      let idx = keepCur === undefined ? frames.findIndex(f => f.id === curId) : keepCur;
      if (idx < 0) idx = Math.min(before.cur, frames.length - 1);
      const changedCur = frames[idx].id !== curId;
      cur = idx;
      for (const id of [...sel]) if (!frames.some(f => f.id === id)) sel.delete(id);
      if (changedCur) { hist = []; redoS = []; }
      renderStrip();
      if (changedCur) await loadCurrent(); else await drawGhost();
      version++; autosave();
      if (canUndo) { undoOps = before; toast(label, () => undoStructural()); }
    });
  }
  function undoStructural() {
    if (!undoOps) return;
    const b = undoOps; undoOps = null;
    run(async () => {
      await commit();
      frames = b.frames; cur = Math.min(b.cur, frames.length - 1);
      const i = frames.findIndex(f => f.id === b.curId); if (i >= 0) cur = i;
      hist = []; redoS = [];
      renderStrip(); await loadCurrent(); version++; autosave();
      toast('되돌렸어요');
    });
  }
  const targets = () => (selMode ? frames.filter(f => sel.has(f.id)) : [frames[cur]]);
  const room = n => { if (frames.length + n > MAX) { toast(`장면은 ${MAX}장까지 만들 수 있어요`); return false; } return true; };

  function addBlank() {
    if (!room(1)) return;
    structural('', () => { const f = newFrame(); drawThumb(f, null); frames.splice(cur + 1, 0, f); return cur + 1; });
  }
  function duplicate() {
    if (!room(1)) return;
    structural('', () => { const s = frames[cur], f = newFrame(s.blob); copyThumb(s, f); frames.splice(cur + 1, 0, f); return cur + 1; });
  }
  function moveSel(dir) {        // -1 앞으로, +1 뒤로
    const S = new Set(targets().map(f => f.id));
    structural('', () => {
      const a = frames;
      if (dir < 0) { for (let i = 1; i < a.length; i++) if (S.has(a[i].id) && !S.has(a[i - 1].id)) [a[i - 1], a[i]] = [a[i], a[i - 1]]; }
      else { for (let i = a.length - 2; i >= 0; i--) if (S.has(a[i].id) && !S.has(a[i + 1].id)) [a[i + 1], a[i]] = [a[i], a[i + 1]]; }
    });
  }
  function moveEdge(front) {
    const S = new Set(targets().map(f => f.id));
    structural('', () => {
      const a = frames.filter(f => S.has(f.id)), b = frames.filter(f => !S.has(f.id));
      frames = front ? a.concat(b) : b.concat(a);
    });
  }
  function copySel() {
    const T = targets(); if (!T.length || !room(T.length)) return;
    structural('', () => {
      const lastIdx = Math.max(...T.map(t => frames.indexOf(t)));
      const copies = T.map(s => { const f = newFrame(s.blob); copyThumb(s, f); return f; });
      frames.splice(lastIdx + 1, 0, ...copies);
      sel.clear(); copies.forEach(c => sel.add(c.id));
    });
  }
  function delSel() {
    const T = targets(); if (!T.length) return;
    const S = new Set(T.map(f => f.id));
    const all = T.length >= frames.length;
    structural(all ? '모든 장면을 지웠어요' : `${T.length}장을 지웠어요`, () => {
      const firstIdx = frames.findIndex(f => S.has(f.id));
      frames = frames.filter(f => !S.has(f.id));
      sel.clear();
      return Math.min(Math.max(0, firstIdx - (selMode ? 0 : 1)), Math.max(0, frames.length - 1));
    }, true);
  }

  /* ---------- 그리기 ---------- */
  function at(e) { const r = paint.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; }
  function stroke(a, b) {
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = +$('brush').value;
    ctx.strokeStyle = color;
    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }
  function snapshot() {
    hist.push(ctx.getImageData(0, 0, W, H)); if (hist.length > HIST) hist.shift();
    redoS = []; updHist();
  }
  function updHist() { $('undo').disabled = !hist.length; $('redo').disabled = !redoS.length; }
  function touched() { frames[cur].dirty = true; version++; drawThumb(frames[cur], paint); commitSoon(); }
  paint.addEventListener('pointerdown', e => {
    if ($('stage').classList.contains('busy')) return;
    e.preventDefault(); paint.setPointerCapture(e.pointerId);
    snapshot(); drawing = true; last = at(e); stroke(last, [last[0] + 0.01, last[1] + 0.01]);
  });
  paint.addEventListener('pointermove', e => {
    if (!drawing) return; e.preventDefault();
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of (evs.length ? evs : [e])) { const p = at(ev); stroke(last, p); last = p; }
  });
  const end = () => { if (!drawing) return; drawing = false; touched(); };
  paint.addEventListener('pointerup', end); paint.addEventListener('pointercancel', end);

  function putData(d) { ctx.putImageData(d, 0, 0); touched(); updHist(); }
  $('undo').onclick = () => { if (!hist.length) return; redoS.push(ctx.getImageData(0, 0, W, H)); putData(hist.pop()); };
  $('redo').onclick = () => { if (!redoS.length) return; hist.push(ctx.getImageData(0, 0, W, H)); putData(redoS.pop()); };
  $('clearFrame').onclick = () => { if (!confirm('이 장면의 그림을 지울까요?')) return; snapshot(); ctx.clearRect(0, 0, W, H); touched(); };

  function setTool(t) { tool = t; $('pen').classList.toggle('on', t === 'pen'); $('eraser').classList.toggle('on', t === 'eraser'); }
  $('pen').onclick = () => setTool('pen'); $('eraser').onclick = () => setTool('eraser');
  function setColor(c) { color = c; $('color').value = c; document.querySelectorAll('.sw').forEach(s => s.classList.toggle('sel', s.dataset.c === c)); setTool('pen'); }
  COLORS.forEach(c => { const b = document.createElement('button'); b.className = 'sw'; b.style.background = c; b.dataset.c = c; b.setAttribute('aria-label', '색 ' + c); b.onclick = () => setColor(c); $('swatches').append(b); });
  $('color').oninput = e => setColor(e.target.value);
  $('brush').oninput = () => { $('brushLabel').textContent = $('brush').value; };
  $('onPrev').onchange = $('onNext').onchange = () => run(drawGhost);

  $('upload').onchange = e => {
    const file = e.target.files[0]; e.target.value = ''; if (!file) return;
    const u = URL.createObjectURL(file), im = new Image();
    im.onload = () => {
      snapshot();
      const s = Math.min(W / im.width, H / im.height);
      ctx.drawImage(im, (W - im.width * s) / 2, (H - im.height * s) / 2, im.width * s, im.height * s);
      URL.revokeObjectURL(u); touched();
    };
    im.onerror = () => { URL.revokeObjectURL(u); alert('이 그림을 불러올 수 없어요.'); };
    im.src = u;
  };

  /* ---------- 버튼 ---------- */
  $('addBlank').onclick = addBlank;
  $('dupFrame').onclick = duplicate;
  $('mvLeft').onclick = () => moveSel(-1); $('mvRight').onclick = () => moveSel(1);
  $('delFrame').onclick = delSel;
  $('selStart').onclick = () => { selMode = true; sel.clear(); sel.add(frames[cur].id); $('normalBar').hidden = true; $('selBar').hidden = false; renderStrip(); };
  $('selDone').onclick = () => { selMode = false; sel.clear(); $('normalBar').hidden = false; $('selBar').hidden = true; renderStrip(); };
  $('selAll').onclick = () => { frames.forEach(f => sel.add(f.id)); renderStrip(); };
  $('selNone').onclick = () => { sel.clear(); renderStrip(); };
  $('sFirst').onclick = () => moveEdge(true); $('sLast').onclick = () => moveEdge(false);
  $('sLeft').onclick = () => moveSel(-1); $('sRight').onclick = () => moveSel(1);
  $('sCopy').onclick = copySel; $('sDel').onclick = delSel;

  $('sample').onclick = () => {
    if (!confirm('예시(튀는 공 16장면)로 바꿀까요? 지금 그림은 사라져요.')) return;
    run(async () => {
      const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
      const list = [];
      for (let i = 0; i < 16; i++) {
        x.clearRect(0, 0, W, H);
        x.strokeStyle = '#3b2353'; x.lineWidth = 10; x.lineCap = 'round';
        x.beginPath(); x.moveTo(60, 480); x.lineTo(900, 480); x.stroke();
        const t = i / 16, hgt = Math.abs(Math.sin(Math.PI * t * 2));
        const cx = 140 + 680 * t, cy = 475 - 64 - 300 * hgt;
        const squash = hgt < 0.12 ? 1.25 : 1;
        x.fillStyle = '#f6aa24'; x.beginPath(); x.ellipse(cx, cy + (squash > 1 ? 10 : 0), 64 * squash, 64 / squash, 0, 0, Math.PI * 2); x.fill();
        x.lineWidth = 5; x.strokeStyle = '#b56e0c'; x.stroke();
        const b = await new Promise(r => c.toBlob(r, 'image/png'));
        const f = newFrame(b); drawThumb(f, c); list.push(f);
      }
      frames = list; cur = 0; hist = []; redoS = []; sel.clear();
      $('fps').value = 12; $('fps').oninput();
      renderStrip(); await loadCurrent(); version++; autosave();
    });
  };
  $('newWork').onclick = () => {
    if (!confirm('모든 장면을 지우고 처음부터 새로 만들까요?')) return;
    run(async () => {
      frames = [newFrame()]; drawThumb(frames[0], null); cur = 0; hist = []; redoS = []; sel.clear();
      renderStrip(); await loadCurrent(); version++; autosave();
    });
  };

  /* ---------- 탭 ---------- */
  function tab(name) {
    document.querySelectorAll('.section').forEach(s => s.classList.toggle('show', s.id === name));
    document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    if (name !== 'play') Player.stop();
    if (name === 'play') run(async () => { await commitAll(); Player.open(); });
    if (name === 'send' && window.SendUI) run(async () => { await commitAll(); SendUI.show(); });
    window.scrollTo({ top: 0 });
  }
  document.querySelectorAll('[data-tab]').forEach(b => { b.onclick = () => tab(b.dataset.tab); });
  $('quickPlay').onclick = () => tab('play'); $('backDraw').onclick = () => tab('draw'); $('toSend').onclick = () => tab('send');

  /* ---------- 재생 ---------- */
  const Player = (() => {
    const cv = $('player'), px = cv.getContext('2d');
    let timer = null, pos = 0, dir = 1, token = 0;
    const pre = new Map();
    function bmAt(i) {
      if (!pre.has(i)) {
        const f = frames[i];
        pre.set(i, !f || !f.blob ? Promise.resolve(null)
          : createImageBitmap(f.blob, { resizeWidth: 640, resizeHeight: 360, resizeQuality: 'medium' }).catch(() => decode(f)));
      }
      return pre.get(i);
    }
    function release(keep) {
      for (const [i, p] of pre) if (!keep.has(i)) { pre.delete(i); p.then(b => { if (b && b.close && ![...cache.values()].some(v => v.bm === b)) try { b.close(); } catch (e) {} }); }
    }
    async function show(i) {
      const bm = await bmAt(i);
      px.fillStyle = '#fff'; px.fillRect(0, 0, W, H);
      if (bm) try { px.drawImage(bm, 0, 0, W, H); } catch (e) {}
      $('pNo').textContent = i + 1; $('scrub').value = i + 1;
    }
    function nextPos(p, d) {
      const n = frames.length, mode = $('mode').value;
      if (n === 1) return [0, d, mode === 'once'];
      if (mode === 'pingpong') { if (p + d >= n || p + d < 0) d = -d; return [p + d, d, false]; }
      if (p + 1 >= n) return mode === 'once' ? [p, d, true] : [0, d, false];
      return [p + 1, d, false];
    }
    function info() {
      const n = frames.length, fps = +$('fps').value;
      $('pTotal').textContent = n; $('scrub').max = n; $('fpsLabel').textContent = fps;
      $('dur').textContent = `${n}장 · 약 ${(n / fps).toFixed(1)}초`;
    }
    async function loop(tk) {
      while (tk === token) {
        const t0 = performance.now();
        const ahead = new Set([pos]);
        let [p2, d2] = [pos, dir];
        for (let k = 0; k < 4; k++) { [p2, d2] = nextPos(p2, d2); ahead.add(p2); bmAt(p2); }
        await show(pos);
        release(ahead);
        const [np, nd, stopNow] = nextPos(pos, dir);
        const wait = 1000 / +$('fps').value - (performance.now() - t0);
        await new Promise(r => { timer = setTimeout(r, Math.max(0, wait)); });
        if (tk !== token) return;
        if (stopNow) { stop(); return; }
        pos = np; dir = nd;
      }
    }
    function play() { token++; $('playBtn').textContent = '■ 멈추기'; if ($('mode').value === 'once' && pos >= frames.length - 1) pos = 0; loop(token); }
    function stop() { token++; clearTimeout(timer); $('playBtn').textContent = '▶ 재생'; release(new Set()); }
    $('playBtn').onclick = () => ($('playBtn').textContent.includes('멈추기') ? stop() : play());
    $('fps').oninput = () => { info(); version++; autosave(); };
    $('scrub').oninput = () => { stop(); pos = +$('scrub').value - 1; show(pos); };
    return { open() { release(new Set()); pos = Math.min(pos, frames.length - 1); dir = 1; info(); show(pos).then(play); }, stop, info };
  })();

  /* ---------- 자동 저장 (이 태블릿의 IndexedDB) ---------- */
  const IDB = (() => {
    let dbp = null;
    function open() {
      if (!dbp) dbp = new Promise((res, rej) => {
        try { const r = indexedDB.open('anim-studio', 1); r.onupgradeneeded = () => r.result.createObjectStore('work'); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); }
        catch (e) { rej(e); }
      });
      return dbp;
    }
    const tx = (mode, fn) => open().then(db => new Promise((res, rej) => { const t = db.transaction('work', mode); const out = fn(t.objectStore('work')); t.oncomplete = () => res(out && out.result); t.onerror = () => rej(t.error); }));
    return { get: k => tx('readonly', s => s.get(k)), put: (k, v) => tx('readwrite', s => { s.put(v, k); }) };
  })();
  let saveT = null;
  async function saveNow() {
    clearTimeout(saveT);
    try {
      await Promise.all(frames.map(f => f.p).filter(Boolean));
      await IDB.put('current', { v: 1, fps: +$('fps').value, mode: $('mode').value, cur, frames: frames.map(f => f.blob), at: Date.now() });
    } catch (e) { console.warn('autosave', e); }
  }
  function autosave() { clearTimeout(saveT); saveT = setTimeout(saveNow, 1200); }
  /* 화면이 꺼지거나 다른 앱으로 갈 때 바로 저장 */
  const flush = () => { clearTimeout(commitT); commit(); saveNow(); };
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => { if (document.hidden) flush(); });

  async function restore() {
    try {
      const w = await IDB.get('current');
      if (!w || !Array.isArray(w.frames) || !w.frames.length) return false;
      const list = [];
      const c = document.createElement('canvas'); c.width = TW; c.height = TH;
      for (const b of w.frames.slice(0, MAX)) {
        const f = newFrame(b instanceof Blob ? b : null);
        if (f.blob) { try { const bm = await createImageBitmap(f.blob, { resizeWidth: TW, resizeHeight: TH }); drawThumb(f, bm); bm.close && bm.close(); } catch (e) { drawThumb(f, null); } }
        else drawThumb(f, null);
        list.push(f);
      }
      frames = list; cur = Math.min(w.cur || 0, frames.length - 1);
      if (w.fps) $('fps').value = w.fps; if (w.mode) $('mode').value = w.mode;
      return frames.some(f => f.blob);
    } catch (e) { console.warn('restore', e); return false; }
  }

  /* ---------- 작업 파일 저장·열기 ---------- */
  const toDataUrl = b => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(b); });
  $('saveWork').onclick = () => run(async () => {
    await commitAll();
    const data = { app: 'animation', v: 1, fps: +$('fps').value, frames: await Promise.all(frames.map(f => (f.blob ? toDataUrl(f.blob) : null))) };
    const u = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = u; a.download = '애니메이션_작업.json'; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(u), 20000);
  });
  $('openWork').onchange = e => {
    const file = e.target.files[0]; e.target.value = ''; if (!file) return;
    run(async () => {
      try {
        const d = JSON.parse(await file.text());
        if (d.app !== 'animation' || !Array.isArray(d.frames) || !d.frames.length || d.frames.length > MAX
          || d.frames.some(u => u !== null && (typeof u !== 'string' || !u.startsWith('data:image/png;base64,')))) throw new Error('bad');
        if (!confirm(`작업 파일(${d.frames.length}장면)로 바꿀까요? 지금 그림은 사라져요.`)) return;
        const list = [];
        for (const u of d.frames) {
          const b = u ? await (await fetch(u)).blob() : null;
          const f = newFrame(b);
          if (b) { const bm = await createImageBitmap(b); drawThumb(f, bm); bm.close && bm.close(); } else drawThumb(f, null);
          list.push(f);
        }
        frames = list; cur = 0; hist = []; redoS = []; sel.clear();
        if (d.fps >= 1 && d.fps <= 15) $('fps').value = d.fps;
        renderStrip(); await loadCurrent(); version++; autosave(); toast('작업 파일을 열었어요');
      } catch (x) { console.warn(x); alert('올바른 작업 파일이 아니에요. 지금 그림은 그대로예요.'); }
    });
  };

  /* ---------- 알림 ---------- */
  let toastT = null;
  function toast(t, undoFn) {
    if (!t) return;
    const el = $('toast'); el.innerHTML = '';
    const sp = document.createElement('span'); sp.textContent = t; el.append(sp);
    if (undoFn) { const b = document.createElement('button'); b.textContent = '되돌리기'; b.onclick = () => { el.hidden = true; undoFn(); }; el.append(b); }
    el.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { el.hidden = true; }, undoFn ? 7000 : 2500);
  }

  /* ---------- 시작 ---------- */
  setColor('#222222');
  run(async () => {
    const had = await restore();
    if (!frames.length) { frames = [newFrame()]; drawThumb(frames[0], null); }
    renderStrip(); await loadCurrent(); Player.info();
    if (had) toast(`지난번 그림(${frames.length}장면)을 불러왔어요`);
  });

  /* 다른 파일(send.js)에서 쓰는 것 */
  window.Anim = {
    W, H, MAX,
    frames: () => frames,
    fps: () => +$('fps').value,
    version: () => version,
    commitAll: () => run(commitAll),
    decode, tab, toast
  };
})();
