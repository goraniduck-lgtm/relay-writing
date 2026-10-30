/* 움직이는 그림 공방 — 교사용 '작품 받은 함' */
'use strict';
(function () {
  const $ = id => document.getElementById(id);
  const main = $('main');
  const A = { classes: [], cid: store.get('scanT.cid', ''), cls: null, subs: {}, off: null, tick: 0, busy: false };

  function toast(t, ms) {
    const el = $('toast'); el.textContent = t; el.hidden = false;
    clearTimeout(toast._t); if (ms !== 0) toast._t = setTimeout(() => { el.hidden = true; }, ms || 2800);
  }
  const fmtTime = ts => { if (!ts) return ''; const d = new Date(ts); return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; };
  const fmtSize = b => b > 1e6 ? (b / 1e6).toFixed(1) + 'MB' : Math.max(1, Math.round(b / 1e3)) + 'KB';
  const safe = s => String(s).replace(/[\\/:*?"<>|]/g, '');

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
    try {
      await DB.ready(false);
      if (DB.isTeacher()) start(); else loginView();
    } catch (e) { console.warn(e); main.innerHTML = '<div class="panel">인터넷에 연결되지 않았어요. 새로고침해 주세요.</div>'; }
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
    store.set('scanT.cid', cid);
    render();
    if (!cid) return;
    try { A.cls = await DB.get('classes/' + cid); } catch (e) { console.warn(e); }
    A.off = DB.on('scanimation/subs/' + cid, v => { A.subs = v || {}; render(); }, e => { console.warn(e); toast('작품 목록을 불러오지 못했어요'); });
  }

  /* ---------- 자료 정리 ---------- */
  function groups() {
    const by = {};
    for (const [sid, s] of Object.entries(A.subs || {})) {
      if (!s) continue;
      (by[s.no] = by[s.no] || []).push({ sid, ...s });
    }
    for (const k in by) by[k].sort((a, b) => (b.ts || 0) - (a.ts || 0));
    return by;
  }
  const latestDone = list => (list || []).find(s => s.done);
  function thumbsOf(s) { const t = s && s.th; return t ? (Array.isArray(t) ? t : Object.keys(t).sort((a, b) => a - b).map(k => t[k])).filter(Boolean) : []; }

  /* ---------- 화면 ---------- */
  function render() {
    const cls = A.classes.find(c => c.id === A.cid);
    const studentUrl = new URL('./', location.href).href + (A.cid ? '?c=' + encodeURIComponent(A.cid) : '');
    if (!A.classes.length) {
      main.innerHTML = `<div class="panel"><h2>반이 없어요</h2><p class="muted">반 목록은 릴레이 원고지(수업 앱) 교사 화면에서 만든 반을 그대로 써요. 그곳에서 반과 명단을 먼저 만들어 주세요.</p></div>`;
      return;
    }
    const by = groups();
    const roster = rosterOf(A.cls);
    const nos = new Set(roster.map(r => r.no));
    const extra = Object.keys(by).map(Number).filter(n => !nos.has(n)).sort((a, b) => a - b);
    const done = Object.values(by).filter(l => latestDone(l)).length;
    const cards = roster.map(r => card(r.no, r.name, by[r.no])).join('') + extra.map(n => card(n, (by[n][0] || {}).name || '', by[n])).join('');
    main.innerHTML = `
      <div class="panel"><div class="row" style="justify-content:space-between"><h2 style="margin:0">반 고르기</h2></div>
        <div class="chips" style="margin-top:10px">${A.classes.map(c => `<button class="chip${c.id === A.cid ? ' on' : ''}" data-cls="${esc(c.id)}">${esc(c.name)}</button>`).join('')}</div>
        <p class="muted" style="margin:12px 0 4px">학생 접속 주소 (이 반이 미리 골라져 있어요)</p>
        <div class="row"><code id="stuUrl">${esc(studentUrl)}</code><button class="small" id="copyUrl">주소 복사</button></div></div>
      <div class="panel"><h2>${esc(cls ? cls.name : '')} 받은 작품</h2>
        <div class="stats"><span>받은 학생 <b>${done}</b>명</span><span>명단 <b>${roster.length}</b>명</span></div>
        <div class="row"><b style="font-size:14px">모아서 한 PDF로 받기 (학생별 마지막 작품, 번호순)</b></div>
        <div class="row" style="margin-top:8px">
          <button class="primary" data-merge="all" ${done ? '' : 'disabled'}>① 합성 그림 + ② 필름</button>
          <button data-merge="art" ${done ? '' : 'disabled'}>① 합성 그림만 (일반 종이용)</button>
          <button data-merge="film" ${done ? '' : 'disabled'}>② 필름만 (OHP용)</button>
          <span style="flex:1"></span>
          <button class="danger small" id="wipe" ${Object.keys(A.subs || {}).length ? '' : 'disabled'}>이 반 작품 모두 지우기</button>
        </div>
        <p class="muted" style="margin:10px 0 0">PDF는 A5 가로 크기예요. 실제 크기(100%)로 인쇄하는 것이 가장 정확하고, A4에 맞춰 인쇄하더라도 합성 그림과 필름을 <b>같은 배율</b>로 인쇄하면 줄무늬가 맞아요.</p>
      </div>
      <div class="grid">${cards || '<p class="muted">명단이 비어 있어요.</p>'}</div>`;
    main.querySelectorAll('[data-cls]').forEach(b => { b.onclick = () => openClass(b.dataset.cls); });
    main.querySelectorAll('[data-merge]').forEach(b => { b.onclick = () => merge(b.dataset.merge); });
    main.querySelectorAll('[data-dl]').forEach(b => { b.onclick = () => downloadOne(b.dataset.dl); });
    main.querySelectorAll('[data-del]').forEach(b => { b.onclick = () => removeSubs([b.dataset.del]); });
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
    const th = thumbsOf(last);
    const pendHtml = pending.map(s => {
      const stale = Date.now() - (s.ts || 0) > 10 * 60 * 1000;
      return `<div class="row"><span class="badge warn">${stale ? '보내다 끊김' : '보내는 중…'}</span><span class="meta">${fmtTime(s.ts)}</span>${stale ? `<button class="small danger" data-del="${esc(s.sid)}">지우기</button>` : ''}</div>`;
    }).join('');
    if (!last) {
      return `<div class="card none"><div class="thumb">아직 안 냈어요</div><div class="nm">${esc(no)}번 ${esc(name)}</div>${pendHtml}</div>`;
    }
    return `<div class="card"><div class="thumb"><img data-anim="${esc(last.sid)}" src="${esc(th[0] || '')}" alt=""></div>
      <div class="nm">${esc(no)}번 ${esc(name || last.name)}</div>
      <div class="tt">${last.title ? '「' + esc(last.title) + '」' : ''}</div>
      <div class="meta">${fmtTime(last.ts)} · ${esc(last.n)}장면 · ${esc(last.gap)}mm · ${fmtSize(last.bytes)}</div>
      <div class="acts"><button class="small primary" data-dl="${esc(last.sid)}">PDF 받기</button><button class="small danger" data-del="${esc(last.sid)}">지우기</button></div>
      ${pendHtml}
      ${older.length ? `<details class="old"><summary>이전에 보낸 작품 ${older.length}개</summary>${older.map(s => `<div class="item"><span>${fmtTime(s.ts)}${s.title ? ' · ' + esc(s.title) : ''}</span><span><button class="small" data-dl="${esc(s.sid)}">PDF</button> <button class="small danger" data-del="${esc(s.sid)}">지우기</button></span></div>`).join('')}</details>` : ''}
    </div>`;
  }

  /* 장면 미리보기를 차례로 바꿔 움직이게 */
  setInterval(() => {
    A.tick++;
    document.querySelectorAll('img[data-anim]').forEach(img => {
      const s = A.subs && A.subs[img.dataset.anim]; const th = thumbsOf(s);
      if (th.length > 1) img.src = th[A.tick % th.length];
    });
  }, 260);

  /* ---------- PDF 받기 ---------- */
  async function pdfBytes(sid) {
    const s = A.subs[sid];
    const p = await DB.get('scanimation/files/' + sid + '/p');
    if (!p) throw new Error('missing');
    let b64 = '';
    for (let i = 0; i < s.parts; i++) { if (typeof p[i] !== 'string') throw new Error('missing'); b64 += p[i]; }
    const bin = atob(b64), out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function save(bytes, name) {
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const a = document.createElement('a'); a.href = url; a.download = safe(name); document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  async function downloadOne(sid) {
    const s = A.subs[sid]; if (!s || A.busy) return;
    A.busy = true; toast('PDF를 받는 중…', 0);
    try {
      save(await pdfBytes(sid), `${s.no}번_${s.name}${s.title ? '_' + s.title : ''}_스캐니메이션.pdf`);
      toast('PDF를 저장했어요');
    } catch (e) { console.warn(e); toast('PDF를 받지 못했어요'); } finally { A.busy = false; }
  }
  async function merge(mode) {
    if (A.busy) return;
    const by = groups();
    const items = Object.keys(by).map(Number).sort((a, b) => a - b).map(n => latestDone(by[n])).filter(Boolean);
    if (!items.length) return;
    A.busy = true;
    try {
      const out = await PDFLib.PDFDocument.create();
      out.setTitle('스캐니메이션 모음');
      let i = 0, fails = [];
      for (const s of items) {
        toast(`모으는 중… ${++i} / ${items.length}`, 0);
        try {
          const src = await PDFLib.PDFDocument.load(await pdfBytes(s.sid));
          const idx = mode === 'art' ? [0] : mode === 'film' ? [1] : [0, 1];
          (await out.copyPages(src, idx)).forEach(pg => out.addPage(pg));
        } catch (e) { console.warn(e); fails.push(s.no + '번'); }
      }
      const cls = A.classes.find(c => c.id === A.cid);
      const label = mode === 'art' ? '합성그림' : mode === 'film' ? '필름' : '합성그림+필름';
      save(await out.save(), `${cls ? cls.name : ''}_스캐니메이션_모음_${label}.pdf`);
      toast(fails.length ? `저장했어요 (못 받은 작품: ${fails.join(', ')})` : `${items.length}명 작품을 한 PDF로 저장했어요`, 4500);
    } catch (e) { console.warn(e); toast('PDF를 모으지 못했어요'); } finally { A.busy = false; }
  }

  async function removeSubs(ids, all) {
    if (!all && !confirm('이 작품을 지울까요? 되돌릴 수 없어요.')) return;
    const up = {};
    for (const sid of ids) { up['subs/' + A.cid + '/' + sid] = null; up['files/' + sid] = null; }
    try { await DB.update('scanimation', up); toast('지웠어요'); } catch (e) { console.warn(e); toast('지우지 못했어요'); }
  }

  boot();
})();
