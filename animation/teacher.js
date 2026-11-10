/* 애니메이션 공방 — 교사용 '작품 받은 함' (GIF 받기·크게 보기·차례로 보기·ZIP으로 모아 받기) */
'use strict';
(function () {
  const $ = id => document.getElementById(id);
  const main = $('main');
  const A = { classes: [], cid: store.get('animT.cid', ''), cls: null, subs: {}, off: null, busy: false };

  function toast(t, ms) {
    const el = $('toast'); el.textContent = t; el.hidden = false;
    clearTimeout(toast._t); if (ms !== 0) toast._t = setTimeout(() => { el.hidden = true; }, ms || 2800);
  }
  const fmtTime = ts => { if (!ts) return ''; const d = new Date(ts); return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; };
  const fmtSize = b => (b > 1e6 ? (b / 1e6).toFixed(1) + 'MB' : Math.max(1, Math.round(b / 1e3)) + 'KB');
  const secs = s => (s.frames / s.fps).toFixed(1) + '초';
  const safe = s => String(s).replace(/[\\/:*?"<>|]/g, '');
  const gifName = s => safe(`${String(s.no).padStart(2, '0')}번_${s.name}${s.title ? '_' + s.title : ''}.gif`);

  /* ---------- 로그인 ---------- */
  function loginView(err) {
    $('who').innerHTML = '';
    main.innerHTML = `<div class="panel login"><h2>선생님 로그인</h2><p class="muted">다른 수업 앱과 같은 교사 계정 비밀번호를 입력하세요.</p>
      <form id="lf" class="row" style="justify-content:center"><input type="password" id="pw" placeholder="비밀번호" autocomplete="current-password" required>
      <button class="primary">들어가기</button></form>${err ? `<p class="muted" style="color:#b42318">${esc(err)}</p>` : ''}</div>`;
    $('lf').onsubmit = async e => {
      e.preventDefault();
      try { await DB.teacherLogin($('pw').value); start(); } catch (x) { console.warn(x); loginView('비밀번호가 맞지 않아요.'); }
    };
    setTimeout(() => $('pw') && $('pw').focus(), 50);
  }
  async function boot() {
    try { await DB.ready(false); if (DB.isTeacher()) start(); else loginView(); }
    catch (e) { console.warn(e); main.innerHTML = '<div class="panel">인터넷에 연결되지 않았어요. 새로고침해 주세요.</div>'; }
  }
  async function start() {
    $('who').innerHTML = '<button id="logout" class="small">로그아웃</button>';
    $('logout').onclick = async () => { if (A.off) A.off(); await DB.logout(); loginView(); };
    try {
      const list = await DB.get('classList');
      A.classes = Object.entries(list || {}).map(([id, c]) => ({ id, ...c })).sort(byName);
    } catch (e) { console.warn(e); }
    if (!A.classes.some(c => c.id === A.cid)) A.cid = A.classes[0] ? A.classes[0].id : '';
    openClass(A.cid);
  }
  async function openClass(cid) {
    if (A.off) { A.off(); A.off = null; }
    A.cid = cid; A.subs = {}; A.cls = null;
    store.set('animT.cid', cid);
    render();
    if (!cid) return;
    try { A.cls = await DB.get('classes/' + cid); } catch (e) { console.warn(e); }
    A.off = DB.on('animation/subs/' + cid, v => { A.subs = v || {}; render(); }, e => { console.warn(e); toast('작품 목록을 불러오지 못했어요'); });
  }

  /* ---------- 자료 정리 ---------- */
  function groups() {
    const by = {};
    for (const [sid, s] of Object.entries(A.subs || {})) { if (s) (by[s.no] = by[s.no] || []).push({ sid, ...s }); }
    for (const k in by) by[k].sort((a, b) => (b.ts || 0) - (a.ts || 0));
    return by;
  }
  const latestDone = list => (list || []).find(s => s.done);
  const thumbsOf = s => { const t = s && s.th; return t ? (Array.isArray(t) ? t : Object.keys(t).sort((a, b) => a - b).map(k => t[k])).filter(Boolean) : []; };
  function latestAll() {
    const by = groups();
    return Object.keys(by).map(Number).sort((a, b) => a - b).map(n => latestDone(by[n])).filter(Boolean);
  }

  /* ---------- 화면 ---------- */
  function render() {
    const cls = A.classes.find(c => c.id === A.cid);
    const studentUrl = new URL('./', location.href).href + (A.cid ? '?c=' + encodeURIComponent(A.cid) : '');
    if (!A.classes.length) {
      main.innerHTML = '<div class="panel"><h2>반이 없어요</h2><p class="muted">반 목록은 릴레이 원고지(수업 앱) 교사 화면에서 만든 반을 그대로 써요. 그곳에서 반과 명단을 먼저 만들어 주세요.</p></div>';
      return;
    }
    const by = groups(), roster = rosterOf(A.cls), nos = new Set(roster.map(r => r.no));
    const extra = Object.keys(by).map(Number).filter(n => !nos.has(n)).sort((a, b) => a - b);
    const done = latestAll().length;
    const cards = roster.map(r => card(r.no, r.name, by[r.no])).join('') + extra.map(n => card(n, (by[n][0] || {}).name || '', by[n])).join('');
    main.innerHTML = `
      <div class="panel"><h2 style="margin:0">반 고르기</h2>
        <div class="chips" style="margin-top:10px">${A.classes.map(c => `<button class="chip${c.id === A.cid ? ' on' : ''}" data-cls="${esc(c.id)}">${esc(c.name)}</button>`).join('')}</div>
        <p class="muted" style="margin:12px 0 4px">학생 접속 주소 (이 반이 미리 골라져 있어요)</p>
        <div class="row"><code>${esc(studentUrl)}</code><button class="small" id="copyUrl">주소 복사</button></div></div>
      <div class="panel"><h2>${esc(cls ? cls.name : '')} 받은 작품</h2>
        <div class="stats"><span>받은 학생 <b>${done}</b>명</span><span>명단 <b>${roster.length}</b>명</span></div>
        <div class="row">
          <button class="primary" id="showAll" ${done ? '' : 'disabled'}>📺 크게 차례로 보기 (교실 TV)</button>
          <button id="zipAll" ${done ? '' : 'disabled'}>GIF 모두 받기 (ZIP, 번호순)</button>
          <span style="flex:1"></span>
          <button class="danger small" id="wipe" ${Object.keys(A.subs || {}).length ? '' : 'disabled'}>이 반 작품 모두 지우기</button>
        </div>
        <p class="muted" style="margin:10px 0 0">카드의 작은 그림은 미리보기예요. 그림을 누르면 실제 GIF를 크게 볼 수 있어요.</p>
      </div>
      <div class="grid">${cards || '<p class="muted">명단이 비어 있어요.</p>'}</div>`;
    main.querySelectorAll('[data-cls]').forEach(b => { b.onclick = () => openClass(b.dataset.cls); });
    main.querySelectorAll('[data-dl]').forEach(b => { b.onclick = () => downloadOne(b.dataset.dl); });
    main.querySelectorAll('[data-del]').forEach(b => { b.onclick = () => removeSubs([b.dataset.del]); });
    main.querySelectorAll('[data-view]').forEach(b => { b.onclick = () => openViewer(b.dataset.view); });
    $('showAll').onclick = () => { const l = latestAll(); if (l.length) openViewer(l[0].sid, true); };
    $('zipAll').onclick = zipAll;
    $('copyUrl').onclick = () => {
      (navigator.clipboard ? navigator.clipboard.writeText(studentUrl) : Promise.reject()).then(() => toast('주소를 복사했어요'), () => toast('주소를 직접 선택해 복사해 주세요'));
    };
    $('wipe').onclick = () => {
      const ids = Object.keys(A.subs || {});
      if (ids.length && confirm(`${cls ? cls.name : '이 반'}에서 받은 작품 ${ids.length}개를 모두 지울까요? 되돌릴 수 없어요.`)) removeSubs(ids, true);
    };
  }

  function card(no, name, list) {
    const last = latestDone(list);
    const pending = (list || []).filter(s => !s.done);
    const older = (list || []).filter(s => s.done && s !== last);
    const pendHtml = pending.map(s => {
      const stale = Date.now() - (s.ts || 0) > 10 * 60 * 1000;
      return `<div class="row"><span class="badge warn">${stale ? '보내다 끊김' : '보내는 중…'}</span><span class="meta">${fmtTime(s.ts)}</span>${stale ? `<button class="small danger" data-del="${esc(s.sid)}">지우기</button>` : ''}</div>`;
    }).join('');
    if (!last) return `<div class="card none"><div class="thumb">아직 안 냈어요</div><div class="nm">${esc(no)}번 ${esc(name)}</div>${pendHtml}</div>`;
    const th = thumbsOf(last);
    return `<div class="card"><div class="thumb" data-view="${esc(last.sid)}" title="크게 보기"><img data-anim="${esc(last.sid)}" src="${esc(th[0] || '')}" alt=""></div>
      <div class="nm">${esc(no)}번 ${esc(name || last.name)}</div>
      <div class="tt">${last.title ? '「' + esc(last.title) + '」' : ''}</div>
      <div class="meta">${fmtTime(last.ts)} · ${esc(last.frames)}장면 · ${esc(last.fps)}장/초 · ${secs(last)} · ${fmtSize(last.bytes)}</div>
      <div class="acts"><button class="small primary" data-view="${esc(last.sid)}">크게 보기</button><button class="small" data-dl="${esc(last.sid)}">GIF 받기</button><button class="small danger" data-del="${esc(last.sid)}">지우기</button></div>
      ${pendHtml}
      ${older.length ? `<details class="old"><summary>이전에 보낸 작품 ${older.length}개</summary>${older.map(s => `<div class="item"><span>${fmtTime(s.ts)}${s.title ? ' · ' + esc(s.title) : ''} · ${esc(s.frames)}장면</span><span><button class="small" data-view="${esc(s.sid)}">보기</button> <button class="small" data-dl="${esc(s.sid)}">GIF</button> <button class="small danger" data-del="${esc(s.sid)}">지우기</button></span></div>`).join('')}</details>` : ''}
    </div>`;
  }

  /* 카드 미리보기: 실제 길이에 맞춰 미리보기 장면을 넘김 */
  setInterval(() => {
    const now = performance.now();
    document.querySelectorAll('img[data-anim]').forEach(img => {
      const s = A.subs && A.subs[img.dataset.anim]; const th = thumbsOf(s);
      if (th.length < 2) return;
      const per = Math.max(60, (s.frames / s.fps) * 1000 / th.length);
      const i = Math.floor(now / per) % th.length;
      if (img.dataset.i !== String(i)) { img.dataset.i = i; img.src = th[i]; }
    });
  }, 60);

  /* ---------- GIF 받기 ---------- */
  const gifCache = new Map();    // sid -> Uint8Array (크게 보기에서 다시 받지 않게)
  async function gifBytes(sid) {
    if (gifCache.has(sid)) return gifCache.get(sid);
    const s = A.subs[sid];
    const p = await DB.get('animation/files/' + sid + '/p');
    if (!p) throw new Error('missing');
    let b64 = '';
    for (let i = 0; i < s.parts; i++) { if (typeof p[i] !== 'string') throw new Error('missing'); b64 += p[i]; }
    const bin = atob(b64), out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    gifCache.set(sid, out);
    while (gifCache.size > 30) gifCache.delete(gifCache.keys().next().value);
    return out;
  }
  function save(bytes, name, type) {
    const url = URL.createObjectURL(new Blob([bytes], { type }));
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  async function downloadOne(sid) {
    const s = A.subs[sid]; if (!s || A.busy) return;
    A.busy = true; toast('GIF를 받는 중…', 0);
    try { save(await gifBytes(sid), gifName(s), 'image/gif'); toast('GIF를 저장했어요'); }
    catch (e) { console.warn(e); toast('GIF를 받지 못했어요'); } finally { A.busy = false; }
  }
  async function zipAll() {
    if (A.busy) return;
    const items = latestAll(); if (!items.length) return;
    A.busy = true;
    try {
      const files = {}, fails = [];
      let i = 0;
      for (const s of items) {
        toast(`모으는 중… ${++i} / ${items.length}`, 0);
        try { files[gifName(s)] = [await gifBytes(s.sid), { level: 0 }]; } catch (e) { console.warn(e); fails.push(s.no + '번'); }
      }
      const cls = A.classes.find(c => c.id === A.cid);
      save(fflate.zipSync(files), safe(`${cls ? cls.name : ''}_애니메이션_모음.zip`), 'application/zip');
      toast(fails.length ? `저장했어요 (못 받은 작품: ${fails.join(', ')})` : `${items.length}명 작품을 ZIP으로 저장했어요`, 4500);
    } catch (e) { console.warn(e); toast('모아 받지 못했어요'); } finally { A.busy = false; }
  }
  async function removeSubs(ids, all) {
    if (!all && !confirm('이 작품을 지울까요? 되돌릴 수 없어요.')) return;
    const up = {};
    for (const sid of ids) { up['subs/' + A.cid + '/' + sid] = null; up['files/' + sid] = null; gifCache.delete(sid); }
    try { await DB.update('animation', up); toast('지웠어요'); } catch (e) { console.warn(e); toast('지우지 못했어요'); }
  }

  /* ---------- 크게 보기 · 차례로 보기 ---------- */
  const V = { list: [], i: 0, auto: false, timer: null, url: null, tok: 0 };
  async function openViewer(sid, auto) {
    const latest = latestAll();
    V.list = latest.some(s => s.sid === sid) ? latest : [A.subs[sid] && { sid, ...A.subs[sid] }].filter(Boolean);
    V.i = Math.max(0, V.list.findIndex(s => s.sid === sid));
    $('viewer').hidden = false;
    setAuto(!!auto);
    showCur();
  }
  function closeViewer() {
    V.tok++; clearTimeout(V.timer); $('viewer').hidden = true; $('vImg').innerHTML = '';
    if (V.url) { URL.revokeObjectURL(V.url); V.url = null; }
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  }
  async function showCur() {
    const tk = ++V.tok; clearTimeout(V.timer);
    const s = V.list[V.i]; if (!s) return;
    $('vName').textContent = `${s.no}번 ${s.name}`;
    $('vSub').textContent = `${s.title ? '「' + s.title + '」 · ' : ''}${s.frames}장면 · ${secs(s)}${V.list.length > 1 ? ` · ${V.i + 1} / ${V.list.length}` : ''}`;
    $('vPrev').disabled = $('vNext').disabled = V.list.length < 2;
    $('vImg').innerHTML = '<span class="vload">불러오는 중…</span>';
    try {
      const bytes = await gifBytes(s.sid);
      if (tk !== V.tok) return;
      if (V.url) URL.revokeObjectURL(V.url);
      V.url = URL.createObjectURL(new Blob([bytes], { type: 'image/gif' }));
      const img = new Image(); img.alt = `${s.no}번 작품`; img.src = V.url;
      $('vImg').innerHTML = ''; $('vImg').append(img);
      if (V.list[V.i + 1]) gifBytes(V.list[V.i + 1].sid).catch(() => {});   // 다음 작품 미리 받기
    } catch (e) { console.warn(e); if (tk === V.tok) $('vImg').innerHTML = '<span class="vload">이 작품을 불러오지 못했어요</span>'; }
    if (V.auto && tk === V.tok) {
      const dur = (s.frames / s.fps) * 1000;
      const show = Math.max(5000, Math.min(20000, dur * Math.max(1, Math.ceil(6000 / Math.max(dur, 1)))));   // 짧은 작품은 여러 번, 최소 5초
      V.timer = setTimeout(() => step(1), show);
    }
  }
  function step(d) { if (!V.list.length) return; V.i = (V.i + d + V.list.length) % V.list.length; showCur(); }
  function setAuto(on) { V.auto = on; $('vAuto').classList.toggle('on', on); $('vAuto').textContent = on ? '■ 차례로 보기 멈추기' : '▶ 차례로 보기'; if (!on) clearTimeout(V.timer); }
  $('vPrev').onclick = () => step(-1); $('vNext').onclick = () => step(1);
  $('vAuto').onclick = () => { setAuto(!V.auto); if (V.auto) showCur(); };
  $('vClose').onclick = closeViewer;
  $('vFull').onclick = () => { const el = $('viewer'); (document.fullscreenElement ? document.exitFullscreen() : el.requestFullscreen ? el.requestFullscreen() : Promise.reject()).catch(() => {}); };
  document.addEventListener('keydown', e => {
    if ($('viewer').hidden) return;
    if (e.key === 'Escape') closeViewer(); else if (e.key === 'ArrowRight') step(1); else if (e.key === 'ArrowLeft') step(-1);
  });

  boot();
})();
