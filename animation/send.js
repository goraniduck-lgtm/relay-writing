/* 애니메이션 공방 — GIF 만들기 · 선생님께 보내기 · 기기에 저장 */
'use strict';
(function () {
  const GW = 640, GH = 360;           // GIF 크기 (16:9)
  const $ = id => document.getElementById(id);
  const S = { classes: null, cid: '', roster: [], busy: false, loaded: false, loading: false, gif: null, gifVer: -1, gifUrl: null };
  const tick = () => new Promise(r => setTimeout(r, 0));

  /* 장면 그림을 원하는 크기로 풀기. 다 쓰면 done()으로 메모리 돌려주기 */
  async function grab(f, w, h) {
    if (!f || !f.blob) return null;
    try {
      const bm = await createImageBitmap(f.blob, { resizeWidth: w, resizeHeight: h, resizeQuality: 'high' });
      return { bm, done: () => { try { bm.close(); } catch (e) {} } };
    } catch (e) {
      const bm = await Anim.decode(f);            // 앱이 기억해 둔 그림이라 닫지 않음
      return bm ? { bm, done: () => {} } : null;
    }
  }

  /* ---------- GIF 만들기 ---------- */
  async function buildGif(onProg) {
    const { GIFEncoder, quantize, applyPalette } = window.gifenc;
    await Anim.commitAll();
    const frames = Anim.frames().slice(), fps = Anim.fps();
    const delay = Math.round(1000 / fps);
    const bmOf = f => grab(f, GW, GH);
    /* 색 256개 고르기: 장면 몇 장을 작게 모아서 */
    const k = Math.min(frames.length, 16), sw = 160, sh = 90;
    const sc = document.createElement('canvas'); sc.width = sw; sc.height = sh * k;
    const sx = sc.getContext('2d', { willReadFrequently: true });
    sx.fillStyle = '#fff'; sx.fillRect(0, 0, sw, sh * k);
    for (let j = 0; j < k; j++) {
      const f = frames[Math.floor(j * frames.length / k)];
      const g = await bmOf(f); if (g) { sx.drawImage(g.bm, 0, j * sh, sw, sh); g.done(); }
    }
    const palette = quantize(sx.getImageData(0, 0, sw, sh * k).data, 256);
    if (!palette.some(c => c[0] > 250 && c[1] > 250 && c[2] > 250)) palette[palette.length - 1] = [255, 255, 255];
    /* 장면마다 색 맞추고 쓰기 (같은 그림이 이어지면 한 장으로 합쳐 길게) */
    const enc = GIFEncoder();
    const cv = document.createElement('canvas'); cv.width = GW; cv.height = GH;
    const cx = cv.getContext('2d', { willReadFrequently: true });
    let pend = null, pendDelay = 0, first = true;
    const write = () => {
      enc.writeFrame(pend, GW, GH, first ? { palette, delay: pendDelay, repeat: 0 } : { delay: pendDelay });
      first = false;
    };
    for (let i = 0; i < frames.length; i++) {
      cx.fillStyle = '#fff'; cx.fillRect(0, 0, GW, GH);
      const g = await bmOf(frames[i]);
      if (g) { cx.drawImage(g.bm, 0, 0, GW, GH); g.done(); }
      const idx = applyPalette(cx.getImageData(0, 0, GW, GH).data, palette);
      let same = !!pend;
      if (same) for (let j = 0; j < idx.length; j++) if (idx[j] !== pend[j]) { same = false; break; }
      if (same) pendDelay += delay;
      else { if (pend) write(); pend = idx; pendDelay = delay; }
      if (onProg) onProg((i + 1) / frames.length);
      await tick();
    }
    write();
    enc.finish();
    return enc.bytes();
  }
  async function gifReady(onProg) {
    if (S.gif && S.gifVer === Anim.version()) return S.gif;
    const ver = Anim.version();
    const bytes = await buildGif(onProg);
    S.gif = bytes; S.gifVer = ver;
    if (S.gifUrl) URL.revokeObjectURL(S.gifUrl);
    S.gifUrl = URL.createObjectURL(new Blob([bytes], { type: 'image/gif' }));
    $('gifBox').innerHTML = `<img src="${S.gifUrl}" alt="만든 GIF 미리 보기">`;
    return bytes;
  }

  /* 선생님 화면 카드용 장면 미리보기 (최대 12장) */
  async function thumbs() {
    const frames = Anim.frames(), n = Math.min(12, frames.length), out = [];
    const c = document.createElement('canvas'); c.width = 192; c.height = 108; const x = c.getContext('2d');
    for (let j = 0; j < n; j++) {
      const f = frames[Math.floor(j * frames.length / n)];
      x.fillStyle = '#fff'; x.fillRect(0, 0, 192, 108);
      const g = await grab(f, 192, 108); if (g) { x.drawImage(g.bm, 0, 0, 192, 108); g.done(); }
      let u = c.toDataURL('image/jpeg', 0.6);
      if (u.length > 30000) u = c.toDataURL('image/jpeg', 0.35);
      out.push(u);
    }
    return out;
  }

  /* ---------- 반·번호 ---------- */
  function msg(t, cls) { const el = $('sendMsg'); el.textContent = t || ''; el.className = 'msg' + (cls ? ' ' + cls : ''); }
  function prog(r) { const el = $('sendProgress'); el.hidden = r == null; if (r != null) el.firstElementChild.style.width = Math.round(r * 100) + '%'; }
  function lock(b) { S.busy = b; ['sendBtn', 'saveGif', 'sendClass', 'sendNo', 'sendTitle'].forEach(id => { $(id).disabled = b; }); if (!b) $('sendNo').disabled = !S.cid; }

  async function loadClasses() {
    try {
      await DB.ready(true);
      const list = await DB.get('classList');
      S.classes = Object.entries(list || {}).map(([id, c]) => ({ id, ...c })).sort(byName);
      const sel = $('sendClass');
      sel.innerHTML = '<option value="">반을 골라요</option>' + S.classes.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
      const want = new URLSearchParams(location.search).get('c') || store.get('anim.cid', '');
      if (want && S.classes.some(c => c.id === want)) { sel.value = want; await pickClass(want); }
      S.loaded = true;
      if (!S.classes.length) msg('아직 선생님이 반을 만들지 않았어요.', 'err');
    } catch (e) {
      console.warn(e);
      $('sendClass').innerHTML = '<option value="">연결 안 됨</option>';
      msg('인터넷에 연결되지 않았어요. 연결을 확인하고 이 탭을 다시 눌러 주세요. (그림은 그대로 있어요)', 'err');
    }
  }
  async function pickClass(cid) {
    S.cid = cid; S.roster = [];
    const sel = $('sendNo');
    sel.innerHTML = '<option value="">불러오는 중…</option>'; sel.disabled = true;
    if (!cid) { sel.innerHTML = '<option value="">반을 먼저 골라요</option>'; return; }
    try {
      S.roster = rosterOf(await DB.get('classes/' + cid));
      sel.innerHTML = '<option value="">번호를 골라요</option>' + S.roster.map(r => `<option value="${r.no}">${r.no}번 ${esc(r.name || '')}</option>`).join('');
      sel.disabled = false;
      const me = store.get('anim.me', null);
      if (me && me.cid === cid && S.roster.some(r => r.no === me.no)) sel.value = String(me.no);
    } catch (e) { console.warn(e); sel.innerHTML = '<option value="">명단을 못 불러왔어요</option>'; }
  }
  function current() {
    const c = (S.classes || []).find(x => x.id === S.cid);
    const no = Number($('sendNo').value);
    const r = S.roster.find(x => x.no === no);
    if (!c || !r) return null;
    return { cid: c.id, className: c.name, no, name: String(r.name || '').slice(0, 20), title: $('sendTitle').value.trim().slice(0, 20) };
  }
  const fileName = m => (`애니메이션_${m.no ? m.no + '번_' : ''}${m.name || ''}${m.title ? '_' + m.title : ''}.gif`).replace(/[\\/:*?"<>|]/g, '');
  function b64(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }

  /* ---------- 보내기 ---------- */
  async function send() {
    if (S.busy) return;
    const m = current();
    if (!m) { msg(!S.cid ? '우리 반을 골라 주세요.' : '내 번호를 골라 주세요.', 'err'); return; }
    const frames = Anim.frames();
    const blanks = frames.map((f, i) => (f.blob ? 0 : i + 1)).filter(Boolean);
    if (frames.length < 2) { msg('장면이 2장 이상이어야 움직여요.', 'err'); return; }
    if (blanks.length === frames.length) { msg('그린 장면이 없어요.', 'err'); return; }
    if (blanks.length && !confirm(`빈 장면이 ${blanks.length}장 있어요 (${blanks.slice(0, 8).join(', ')}${blanks.length > 8 ? ' …' : ''}). 그래도 보낼까요?`)) return;
    if (!confirm(`${m.no}번 ${m.name}(으)로 보낼까요?`)) return;
    lock(true); prog(0.01); msg('GIF를 만드는 중…');
    try {
      const bytes = await gifReady(r => prog(r * 0.5));
      const s64 = b64(bytes);
      const parts = [];
      for (let i = 0; i < s64.length; i += CHUNK) parts.push(s64.slice(i, i + CHUNK));
      if (parts.length > MAX_PARTS) throw new Error('too big');
      msg('선생님께 보내는 중…');
      await DB.ready(true);
      const uid = DB.uid(), sid = DB.key(), th = await thumbs();
      await DB.set(`animation/subs/${m.cid}/${sid}`, {
        uid, no: m.no, name: m.name, title: m.title, frames: frames.length, fps: Anim.fps(), w: GW, h: GH,
        bytes: bytes.length, parts: parts.length, ts: DB.TS(), done: false, th
      });
      await DB.set(`animation/files/${sid}`, { uid, cid: m.cid, p: { 0: parts[0] } });
      prog(0.5 + 0.45 / parts.length);
      for (let i = 1; i < parts.length; i++) { await DB.set(`animation/files/${sid}/p/${i}`, parts[i]); prog(0.5 + 0.45 * (i + 1) / parts.length); }
      await DB.set(`animation/subs/${m.cid}/${sid}/done`, true);
      prog(1);
      store.set('anim.cid', m.cid); store.set('anim.me', { cid: m.cid, no: m.no });
      const t = new Date(), hm = `${t.getHours()}시 ${String(t.getMinutes()).padStart(2, '0')}분`;
      msg('');
      $('sendDone').innerHTML = `<div class="sentCard"><img src="${S.gifUrl}" alt=""><div><b>보냈어요! 🎉</b><br>${esc(m.no)}번 ${esc(m.name)}${m.title ? ` · 「${esc(m.title)}」` : ''}<br><span class="muted">${frames.length}장면 · ${hm} · 고쳐서 다시 보내도 돼요</span></div></div>`;
      setTimeout(() => prog(null), 800);
    } catch (e) {
      console.warn(e); prog(null);
      const t = String(e && e.message);
      msg(t === 'too big' ? '작품이 너무 커요. 장면 수를 조금 줄여서 다시 보내 주세요.'
        : isPerm(e) ? '보낼 수 없어요. 반과 번호를 다시 골라 보세요.'
          : t === 'offline' ? '인터넷에 연결되지 않았어요. 연결을 확인하고 다시 보내 주세요.'
            : '보내지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.', 'err');
    } finally { lock(false); }
  }
  async function saveGif() {
    if (S.busy) return;
    lock(true); prog(0.01); msg('GIF를 만드는 중…');
    try {
      const bytes = await gifReady(r => prog(r));
      const m = current() || { title: $('sendTitle').value.trim() };
      const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([bytes], { type: 'image/gif' })); a.download = fileName(m);
      document.body.append(a); a.click(); a.remove();
      msg(`GIF를 저장했어요 (${Math.max(1, Math.round(bytes.length / 1024))}KB)`, 'ok');
    } catch (e) { console.warn(e); msg('GIF를 만들지 못했어요.', 'err'); } finally { prog(null); lock(false); }
  }

  $('sendClass').onchange = e => { pickClass(e.target.value); };
  $('sendBtn').onclick = send;
  $('saveGif').onclick = saveGif;
  window.SendUI = {
    show() {
      if (S.gif && S.gifVer !== Anim.version()) $('gifBox').innerHTML = '<span class="muted">그림이 바뀌었어요. 보내기를 누르면 GIF를 새로 만들어요.</span>';
      if (!S.loaded && !S.loading && !S.busy) { S.loading = true; loadClasses().finally(() => { S.loading = false; }); }
    },
    buildGif
  };
})();
