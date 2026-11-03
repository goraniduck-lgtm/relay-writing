/* 구석구석 — 교사 화면 (카드 관리 · 통계 · 설정) */
'use strict';
const T = { cfg: {}, cards: {}, trash: {}, tab: ls.get('gusuk.ttab', 'cards'), f: { g: 'all', c: 'all', s: 'all', st: 'all', q: '' }, okOnly: false, showTrash: false, unsub: [] };
const app = $('#app');
const LOGO_T = `<svg class="logo" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="#174F56"/><path d="M20 6l5 14-5 14-5-14z" fill="#fff"/><path d="M20 6l5 14h-10z" fill="#F2C12E"/></svg>`;

(async function init() {
  try { await DB.ready(); } catch (e) { app.innerHTML = '<div class="loading">연결하지 못했어요. 새로 고침 해 주세요.</div>'; return; }
  DB.on(`${ROOT}/cfg`, v => { T.cfg = v || {}; if (T.admin) draw(); else if (!T.checked) checkAdmin(); });
})();

/* 이 기기가 이미 관리자인지: 관리자만 쓸 수 있는 칸에 써 봄 */
async function checkAdmin() {
  T.checked = true;
  try { await DB.set(`${ROOT}/ping/${DB.uid()}`, DB.TS); enter(); }
  catch (e) { loginView(); }
}
function loginView() {
  const has = !!T.cfg.hasPin;
  app.innerHTML = `<div class="login">
    <div style="text-align:center">${LOGO_T.replace('class="logo"', 'width="56" height="56"')}</div>
    <h2>교사 화면</h2>
    ${has ? `<p class="muted" style="text-align:center;margin:0">선생님 PIN 8자리를 눌러 들어가요.</p><button class="btn primary big" id="pinbtn">PIN 누르기</button>
      <details><summary class="muted">PIN을 잊었어요</summary><p class="muted">교사 계정(${esc(TEACHER_EMAIL)}) 비밀번호로 들어가 새 PIN을 정할 수 있어요.</p>${acctForm()}</details>`
    : `<div class="tip"><b>처음 한 번만</b> 교사 계정 비밀번호로 들어가 <b>8자리 PIN</b>을 정해요. 그다음부터는 PIN만 누르면 들어갈 수 있어요.</div>${acctForm()}`}
  </div>`;
  const pb = $('#pinbtn');
  if (pb) pb.onclick = async () => {
    const pin = await pinSheet('교사 화면 들어가기');
    if (!pin) return;
    if (await pinLogin(pin)) enter(); else toast('PIN이 맞지 않아요', 'err');
  };
  const af = $('#acct');
  if (af) af.onsubmit = async e => {
    e.preventDefault();
    try { await DB.teacherLogin($('#pw').value); } catch (er) { toast('비밀번호가 맞지 않아요', 'err'); return; }
    const pin = await newPin();
    if (pin) enter();
  };
}
const acctForm = () => `<form id="acct" style="display:grid;gap:8px"><input type="password" id="pw" placeholder="교사 계정 비밀번호" autocomplete="current-password"><button class="btn primary">교사 계정으로 들어가기</button></form>`;
async function newPin() {
  const a = await pinSheet('새 PIN 정하기', '새로 쓸 <b>8자리 숫자</b>를 눌러요');
  if (!a) return null;
  const b = await pinSheet('한 번 더', '확인을 위해 한 번 더 눌러요');
  if (a !== b) { toast('두 번 누른 PIN이 달라요. 다시 해 주세요.', 'err'); return null; }
  try {
    await DB.set(`${ROOT}/secret/pin`, a);
    await DB.set(`${ROOT}/adm/${DB.uid()}`, a);
    await DB.update(`${ROOT}/cfg`, { hasPin: true });
    toast('PIN을 정했어요', 'ok');
    return a;
  } catch (e) { fail()(e); return null; }
}

/* ---------- 들어온 뒤 ---------- */
function enter() {
  T.admin = true;
  T.unsub.forEach(f => f()); T.unsub = [];
  T.unsub.push(DB.on(`${ROOT}/cards`, v => { T.cards = v || {}; draw(); }));
  T.unsub.push(DB.on(`${ROOT}/trash`, v => { T.trash = v || {}; if (T.showTrash) draw(); }, () => {}));
  app.innerHTML = `<header class="top"><div class="brand">${LOGO_T}<div><h1>구석구석 다 함께 찾아요</h1><small>교사 화면</small></div></div>
    <div class="sp"></div><div id="goal"></div>
    <a class="btn small" href="tv.html" target="_blank" rel="noopener">📺 TV 화면</a>
    <a class="btn small" href="print.html?m=a4x4" target="_blank" rel="noopener">🖨️ A2 인쇄</a>
    <a class="btn small" href="print.html?m=a4x8" target="_blank" rel="noopener">🖨️ A1 인쇄</a>
    <button class="btn small" id="lockq"></button>
    <button class="btn small" id="logout">나가기</button></header>
    <div id="banner"></div>
    <div class="wrap"><nav class="ttabs" style="margin-bottom:12px">${[['cards', '카드 관리'], ['stats', '통계'], ['set', '설정']].map(([k, v]) => `<button class="tab${T.tab === k ? ' on' : ''}" data-t="${k}">${v}</button>`).join('')}</nav><div id="body"></div></div>`;
  $$('[data-t]').forEach(b => b.onclick = () => { T.tab = b.dataset.t; ls.set('gusuk.ttab', T.tab); $$('[data-t]').forEach(x => x.classList.toggle('on', x === b)); T.sm = null; draw(true); });
  $('#logout').onclick = async () => { if (!(await ask('나갈까요?', '이 기기에서 교사 화면을 닫아요. 다시 들어올 때 PIN이 필요해요.', '나가기'))) return; await pinLogout(); location.reload(); };
  $('#lockq').onclick = () => DB.update(`${ROOT}/cfg`, { lock: !T.cfg.lock }).catch(fail());
  draw(true);
}
function draw(force) {
  if (!T.admin || !$('#body')) return;
  const info = paintInfo(visibleCards(T.cards, T.cfg));
  $('#goal').innerHTML = goalHtml(info);
  $('#lockq').textContent = T.cfg.lock ? '🔓 활동 다시 열기' : '🔒 활동 잠그기';
  $('#lockq').className = 'btn small ' + (T.cfg.lock ? 'okb' : 'warn');
  $('#banner').innerHTML = T.cfg.lock ? '<div class="banner">🔒 활동이 잠겨 있어요 — 학생은 카드를 올리거나 고칠 수 없어요</div>' : '';
  if (T.tab === 'cards') drawCards();
  else if (T.tab === 'stats') drawStats();
  else if (force || !document.activeElement || !$('#body').contains(document.activeElement)) drawSet();
}

/* ---------- 카드 관리 ---------- */
function filtered() {
  const f = T.f, q = f.q.trim();
  return allCards(T.cards).filter(c => (f.g === 'all' || String(c.g) === f.g) && (f.c === 'all' || c.c === f.c) && (f.s === 'all' || REG[c.r].s === f.s) && (f.st === 'all' || c.st === f.st)
    && (!q || [c.n, c.w, c.h, regLabel(c.r), regFull(c.r)].join(' ').includes(q))).reverse();
}
function drawCards() {
  const body = $('#body');
  if (!body.querySelector('#cardsP')) {
    body.innerHTML = `<div class="panel" id="cardsP"><div class="sumchips" id="sum"></div>
      <div class="filters">
        <select id="fg"><option value="all">모든 모둠</option>${[0, ...GNUMS].map(g => `<option value="${g}">${GROUPS[g].name}</option>`).join('')}</select>
        <select id="fc"><option value="all">모든 분류</option>${CAT_KEYS.map(c => `<option value="${c}">${CATS[c].icon} ${CATS[c].name}</option>`).join('')}</select>
        <select id="fs"><option value="all">모든 시·도</option>${SIDO.map(s => `<option value="${s.s}">${s.sn}</option>`).join('')}</select>
        <input id="fq" type="search" placeholder="이름·내용 찾기">
        <span class="sp" style="flex:1"></span>
        <button class="btn small okb" id="bulkok">보이는 '검토 중' 모두 확인 완료</button>
        <button class="btn small" id="trashbtn"></button>
      </div><div class="list" id="list"></div></div>`;
    [['fg', 'g'], ['fc', 'c'], ['fs', 's']].forEach(([id, k]) => { const el = $('#' + id); el.value = T.f[k]; el.onchange = () => { T.f[k] = el.value; drawCards(); }; });
    const fq = $('#fq'); fq.value = T.f.q; fq.oninput = () => { T.f.q = fq.value; drawCards(); };
    $('#bulkok').onclick = bulkOk;
    $('#trashbtn').onclick = () => { T.showTrash = !T.showTrash; drawCards(); };
  }
  const all = allCards(T.cards), cnt = st => all.filter(c => c.st === st).length;
  $('#sum').innerHTML = [['all', '전체', all.length], ['rv', '검토 중', cnt('rv')], ['fix', '수정 요청', cnt('fix')], ['ok', '확인 완료', cnt('ok')]]
    .map(([k, v, n]) => `<button class="chip${T.f.st === k ? ' on' : ''}" data-st="${k}">${v}<b>${n}</b></button>`).join('');
  $$('#sum [data-st]').forEach(b => b.onclick = () => { T.f.st = b.dataset.st; drawCards(); });
  const tn = Object.keys(T.trash || {}).length;
  $('#trashbtn').textContent = T.showTrash ? '← 카드 목록' : `🗑️ 휴지통 ${tn}`;
  const list = $('#list');
  if (T.showTrash) { list.innerHTML = trashHtml(); bindTrash(); return; }
  const rows = filtered();
  list.innerHTML = rows.length ? rows.map(rowHtml).join('') : '<p class="muted">조건에 맞는 카드가 없어요.</p>';
  list.querySelectorAll('[data-a]').forEach(b => b.onclick = () => act(b.dataset.a, b.dataset.id));
}
function rowHtml(c) {
  const G = GROUPS[c.g] || GROUPS[0];
  const src = c.url ? `<a href="${esc(c.url)}" target="_blank" rel="noopener">${esc(c.url.replace(/^https?:\/\//, '').slice(0, 50))}</a> ${isOfficial(c.url) ? '<span class="badge-off">공인 주소</span>' : '<span class="badge-un">주소 확인</span>'}` : '';
  return `<div class="trow" style="--gc:${G.c}">
    <div class="who"><span>${groupDot(c.g)} <b>${esc(G.name)}</b></span><span>📍 <b>${esc(regLabel(c.r))}</b> <small class="muted">${esc(REG[c.r].sido.sh)}</small></span><span class="muted">${fmtTime(c.ts)}${c.fx ? ' <span class="badge-fx">고쳐서 다시 올림</span>' : ''}${c.tch ? ' <span class="badge-fx">선생님 수정</span>' : ''}</span></div>
    <div class="what"><div>${catTag(c.c)} <span class="nm">${esc(c.n)}</span> ${stTag(c.st)}</div><div>${esc(c.w)}</div>
      <div class="meta">방법: ${esc(labs(METHODS, c.m))}${c.h ? ' · ' + esc(c.h) : ''}${c.t ? ' · 특성: ' + esc(labs(TRAITS, c.t)) : ''}<br>출처: ${esc(lab(SOURCES, c.src))} ${src}</div>
      ${c.memo && c.st === 'fix' ? `<div class="memo">✏️ 요청: ${esc(c.memo)}</div>` : ''}</div>
    <div class="acts">${c.st !== 'ok' ? `<button class="btn small okb" data-a="ok" data-id="${c.id}">✔ 확인</button>` : `<button class="btn small" data-a="rv" data-id="${c.id}">확인 취소</button>`}
      <button class="btn small warn" data-a="fix" data-id="${c.id}">수정 요청</button>
      <button class="btn small" data-a="edit" data-id="${c.id}">수정</button>
      <button class="btn small danger" data-a="del" data-id="${c.id}">삭제</button></div></div>`;
}
async function act(a, id) {
  const c = T.cards[id]; if (!c) return;
  const P = `${ROOT}/cards/${id}`;
  if (a === 'ok') return DB.update(P, { st: 'ok' }).then(() => toast('확인 완료', 'ok')).catch(fail());
  if (a === 'rv') return DB.update(P, { st: 'rv' }).catch(fail());
  if (a === 'fix') return fixDialog(id);
  if (a === 'edit') return editDialog(id);
  if (a === 'del') {
    if (!(await ask('카드를 지울까요?', `${groupDot(c.g)} <b>${esc(c.n)}</b> (${esc(regLabel(c.r))})<br>휴지통으로 옮겨요. 휴지통에서 되살릴 수 있어요.`, '지우기', '취소', true))) return;
    const o = Object.assign({}, c, { del: DB.TS });
    DB.update(ROOT, { [`cards/${id}`]: null, [`trash/${id}`]: o }).then(() => toast('휴지통으로 옮겼어요')).catch(fail());
  }
}
async function bulkOk() {
  const rows = filtered().filter(c => c.st === 'rv');
  if (!rows.length) { toast('검토 중인 카드가 없어요'); return; }
  if (!(await ask('모두 확인 완료할까요?', `지금 보이는 '검토 중' 카드 <b>${rows.length}장</b>을 확인 완료로 바꿔요.`, '확인 완료'))) return;
  const up = {}; rows.forEach(c => { up[`cards/${c.id}/st`] = 'ok'; });
  DB.update(ROOT, up).then(() => toast(`${rows.length}장 확인 완료`, 'ok')).catch(fail());
}
function fixDialog(id) {
  const c = T.cards[id];
  const s = openSheet(`<header><h2>수정 요청 · ${esc(c.n)}</h2></header><div class="body">
    <p class="muted" style="margin:0">${groupDot(c.g)} 모둠 태블릿에 빨간 알림으로 보여요.</p>
    <div class="chips">${FIX_REASONS.map(r => `<button class="chip" data-r="${esc(r)}">${esc(r)}</button>`).join('')}</div>
    <div class="field"><label for="memo">요청 내용 <span class="cnt" id="mc"></span></label><textarea id="memo" maxlength="${LIMIT.memo}">${esc(c.st === 'fix' ? c.memo || '' : '')}</textarea></div></div>
    <footer><button class="btn" data-close>취소</button><button class="btn warn" id="send">수정 요청 보내기</button></footer>`);
  const m = s.el.querySelector('#memo'), mc = s.el.querySelector('#mc');
  const cnt = () => { mc.textContent = `${m.value.length}/${LIMIT.memo}`; }; cnt(); m.oninput = cnt;
  s.el.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { m.value = (m.value ? m.value + ' / ' : '') + b.dataset.r; m.value = m.value.slice(0, LIMIT.memo); cnt(); });
  s.el.querySelector('#send').onclick = () => {
    const memo = m.value.trim(); if (!memo) { toast('요청 내용을 골라 주세요', 'err'); return; }
    DB.update(`${ROOT}/cards/${id}`, { st: 'fix', memo, fx: null }).then(() => { toast('수정 요청을 보냈어요', 'ok'); s.close(); }).catch(fail());
  };
}
function editDialog(id) {
  const c = T.cards[id];
  const d = { g: c.g, r: c.r, c: c.c, n: c.n || '', w: c.w || '', m: codes(c.m), h: c.h || '', t: codes(c.t), src: c.src || '', url: c.url || '', st: c.st };
  const s = openSheet(`<header><h2>카드 수정</h2><button class="btn small" data-close>닫기</button></header><div class="body" id="eb"></div>
    <footer><button class="btn" data-close>취소</button><button class="btn primary" id="esave">저장</button></footer>`, { noBgClose: true });
  const eb = s.el.querySelector('#eb');
  const render = () => {
    eb.innerHTML = `<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">
      <div class="field"><label>모둠</label><select id="eg">${[0, ...GNUMS].map(g => `<option value="${g}"${g === d.g ? ' selected' : ''}>${GROUPS[g].name}</option>`).join('')}</select></div>
      <div class="field rsearch"><label>지역</label><input type="text" id="er" value="${esc(regLabel(d.r))}" autocomplete="off"><div class="rres hide" id="err"></div></div></div>
      <div class="field"><div class="lb">분류</div><div class="chips">${CAT_KEYS.map(k => `<button type="button" class="chip${d.c === k ? ' on' : ''}" data-c="${k}">${CATS[k].icon} ${CATS[k].name}</button>`).join('')}</div></div>
      <div class="field"><label>이름</label><input type="text" id="en" maxlength="${LIMIT.n}" value="${esc(d.n)}"></div>
      <div class="field"><label>무엇을 알리고 있나요?</label><textarea id="ew" maxlength="${LIMIT.w}">${esc(d.w)}</textarea></div>
      <div class="field"><div class="lb">어떤 방법으로</div><div class="chips">${METHODS.map(([k, v]) => `<button type="button" class="chip${d.m.includes(k) ? ' on' : ''}" data-m="${k}">${v}</button>`).join('')}</div><input type="text" id="eh" maxlength="${LIMIT.h}" value="${esc(d.h)}" placeholder="한 줄 더 (선택)"></div>
      <div class="field"><div class="lb">활용한 특성</div><div class="chips">${TRAITS.map(([k, v]) => `<button type="button" class="chip${d.t.includes(k) ? ' on' : ''}" data-t="${k}">${v}</button>`).join('')}</div></div>
      <div class="field"><div class="lb">출처</div><div class="chips">${SOURCES.map(([k, v]) => `<button type="button" class="chip${d.src === k ? ' on' : ''}" data-s="${k}">${v}</button>`).join('')}</div><input type="url" id="eu" maxlength="${LIMIT.url}" value="${esc(d.url)}" placeholder="https://…"></div>
      <div class="field"><label>상태</label><select id="est">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}"${d.st === k ? ' selected' : ''}>${v}</option>`).join('')}</select></div>`;
    const keep = () => { d.g = Number(eb.querySelector('#eg').value); d.n = eb.querySelector('#en').value; d.w = eb.querySelector('#ew').value; d.h = eb.querySelector('#eh').value; d.url = eb.querySelector('#eu').value; d.st = eb.querySelector('#est').value; };
    eb.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { keep(); d.c = b.dataset.c; render(); });
    eb.querySelectorAll('[data-m]').forEach(b => b.onclick = () => { keep(); tog(d.m, b.dataset.m); render(); });
    eb.querySelectorAll('[data-t]').forEach(b => b.onclick = () => { keep(); tog(d.t, b.dataset.t); render(); });
    eb.querySelectorAll('[data-s]').forEach(b => b.onclick = () => { keep(); d.src = b.dataset.s; render(); });
    const er = eb.querySelector('#er'), rr = eb.querySelector('#err');
    er.oninput = () => { const rs = searchRegions(er.value, 8); rr.innerHTML = rs.map(r => `<button type="button" data-k="${r.k}">${esc(r.label)} <small class="muted">${esc(r.sido.sn)}</small></button>`).join(''); rr.classList.toggle('hide', !rs.length); rr.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { keep(); d.r = b.dataset.k; render(); }); };
    s.save = keep;
  };
  render();
  s.el.querySelector('#esave').onclick = () => {
    s.save();
    if (!d.n.trim() || !d.w.trim()) { toast('이름과 내용을 채워 주세요', 'err'); return; }
    const o = { g: d.g, r: d.r, c: d.c, n: d.n.trim().slice(0, LIMIT.n), w: d.w.trim().slice(0, LIMIT.w), m: d.m.join(','), src: d.src || 'etc', st: d.st, ts: c.ts, u: c.u || null, tch: true,
      h: d.h.trim() || null, t: d.t.join(',') || null, url: d.url.trim() || null, memo: d.st === 'fix' ? c.memo || null : null, fx: c.fx || null, up: DB.TS };
    DB.set(`${ROOT}/cards/${id}`, o).then(() => { toast('저장했어요', 'ok'); s.close(); }).catch(fail());
  };
}
const tog = (arr, v) => { const i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else arr.push(v); };
function trashHtml() {
  const list = Object.entries(T.trash || {}).map(([id, c]) => Object.assign({ id }, c)).sort((a, b) => (b.del || 0) - (a.del || 0));
  if (!list.length) return '<p class="muted">휴지통이 비어 있어요.</p>';
  return `<div style="display:flex;justify-content:flex-end"><button class="btn small danger" id="empty">휴지통 비우기</button></div>` + list.map(c => `<div class="trow" style="--gc:${(GROUPS[c.g] || GROUPS[0]).c};opacity:.85">
    <div class="who">${groupDot(c.g)} <b>${esc((GROUPS[c.g] || GROUPS[0]).name)}</b><span>📍 ${esc(regLabel(c.r))}</span><span class="muted">지운 때 ${fmtTime(c.del)}</span></div>
    <div class="what"><div>${catTag(c.c)} <span class="nm">${esc(c.n)}</span></div><div>${esc(c.w)}</div></div>
    <div class="acts"><button class="btn small okb" data-undel="${c.id}">되살리기</button></div></div>`).join('');
}
function bindTrash() {
  $$('[data-undel]').forEach(b => b.onclick = () => {
    const id = b.dataset.undel, c = Object.assign({}, T.trash[id]); delete c.del;
    DB.update(ROOT, { [`trash/${id}`]: null, [`cards/${id}`]: c }).then(() => toast('되살렸어요', 'ok')).catch(fail());
  });
  const e = $('#empty'); if (e) e.onclick = async () => { if (await ask('휴지통을 비울까요?', '휴지통의 카드가 모두 영영 사라져요.', '비우기', '취소', true)) DB.remove(`${ROOT}/trash`).catch(fail()); };
}

/* ---------- 통계 ---------- */
function drawStats() {
  const body = $('#body');
  const list = allCards(T.cards).filter(c => !T.okOnly || c.st === 'ok');
  const info = paintInfo(list);
  const regions = Object.keys(info).filter(k => !REG[k].whole).length;
  const sidoN = filledSido(info).size;
  const groupsOn = new Set(list.map(c => c.g).filter(g => g > 0)).size;
  const byG = {}, byC = {}, byS = {}, byT = {}, byM = {};
  list.forEach(c => {
    (byG[c.g] = byG[c.g] || {})[c.c] = ((byG[c.g] || {})[c.c] || 0) + 1;
    byC[c.c] = (byC[c.c] || 0) + 1;
    byS[REG[c.r].s] = (byS[REG[c.r].s] || 0) + 1;
    codes(c.t).forEach(t => { byT[t] = (byT[t] || 0) + 1; });
    codes(c.m).forEach(m => { byM[m] = (byM[m] || 0) + 1; });
  });
  const gTot = g => Object.values(byG[g] || {}).reduce((a, b) => a + b, 0);
  const gmax = Math.max(1, ...[0, ...GNUMS].map(gTot));
  const gRows = [...GNUMS, 0].filter(g => g > 0 || gTot(0)).map(g => `<div class="hbar"><span>${groupDot(g)} ${g ? g + '모둠' : '선생님'}</span><span class="track" style="width:${Math.max(2, gTot(g) / gmax * 100)}%;gap:2px;background:none">${CAT_KEYS.filter(c => (byG[g] || {})[c]).map(c => `<i title="${GROUPS[g].name} · ${CATS[c].name} ${byG[g][c]}장" style="flex:${byG[g][c]};background:${CATS[c].c};border-radius:3px"></i>`).join('') || '<i style="flex:1;background:#E6DED0"></i>'}</span><span class="n">${gTot(g)}</span></div>`).join('');
  const bars = (pairs, obj, color) => { const mx = Math.max(1, ...pairs.map(([k]) => obj[k] || 0)); return pairs.map(([k, v]) => `<div class="hbar" style="grid-template-columns:110px 1fr 40px"><span>${v}</span><span class="track"><i title="${v} ${obj[k] || 0}" style="width:${(obj[k] || 0) / mx * 100}%;background:${color}"></i></span><span class="n">${obj[k] || 0}</span></div>`).join(''); };
  const sidoRank = SIDO.map(s => [s, byS[s.s] || 0]).sort((a, b) => b[1] - a[1]);
  body.innerHTML = `<div class="panel">
    <div class="filters"><b style="font-size:18px">우리 반이 찾은 것</b><span style="flex:1"></span><label class="chip${T.okOnly ? ' on' : ''}" style="cursor:pointer"><input type="checkbox" id="okonly" ${T.okOnly ? 'checked' : ''} style="display:none">확인 완료만 세기</label></div>
    <div class="kpis">
      <div class="kpi"><div class="l">찾은 카드</div><div class="v">${list.length}<small>장</small></div></div>
      <div class="kpi"><div class="l">찾은 지자체</div><div class="v">${regions}<small>곳</small></div></div>
      <div class="kpi"><div class="l">채운 시·도 (우리 반 목표)</div><div class="v">${sidoN}<small>/${SIDO.length}</small></div></div>
      <div class="kpi"><div class="l">참여한 모둠</div><div class="v">${groupsOn}<small>/6</small></div></div></div>
    <div class="catk">${CAT_KEYS.map(c => `<div style="--cc:${CATS[c].c}"><div class="i">${CATS[c].icon}</div><b>${byC[c] || 0}</b><span>${CATS[c].name}</span></div>`).join('')}</div>
    <div class="sgrid">
      <div class="viz"><h3>모둠별로 찾은 카드</h3><div class="sub">막대 색은 분류</div><div class="keyrow">${CAT_KEYS.map(c => `<span><i style="background:${CATS[c].c}"></i>${CATS[c].name}</span>`).join('')}</div>${gRows}</div>
      <div class="viz"><h3>시·도별 카드 수</h3><div class="sub">진할수록 많이 찾음 · 빈 곳은 아직 못 찾음</div><div class="mapbox smap" id="smap"></div>
        <div class="keyrow"><span>많이 찾은 곳: ${sidoRank.slice(0, 5).filter(x => x[1]).map(([s, n]) => `${esc(s.sh)} ${n}`).join(', ') || '아직 없음'}</span>${sidoRank.filter(x => !x[1]).length ? `<span style="color:var(--warn)">빈 곳: ${sidoRank.filter(x => !x[1]).map(([s]) => esc(s.sh)).join(', ')}</span>` : ''}</div></div>
      <div class="viz"><h3>어떤 지역 특성을 활용했나요?</h3><div class="sub">교과서 80쪽 · 카드에 고른 특성 수</div>${bars(TRAITS, byT, '#1F6F78')}</div>
      <div class="viz"><h3>어떤 방법으로 알리고 있나요?</h3><div class="sub">카드에 고른 방법 수</div>${bars(METHODS, byM, '#1F6F78')}</div>
    </div></div>`;
  $('#okonly').onchange = e => { T.okOnly = e.target.checked; drawStats(); };
  const sm = new GMap($('#smap'), { interactive: false, prefix: 'sm' });
  sm.setChoropleth(byS, '#1F6F78');
  setTimeout(() => sm.apply(), 30);
}

/* ---------- 설정 ---------- */
function drawSet() {
  const url = studentUrl(), home = T.cfg.home || '41590';
  $('#body').innerHTML = `<div class="panel">
    <div class="set"><div class="k">학생 접속 주소</div><div class="qrbox">${qrSvg(url, 4)}<div style="display:grid;gap:6px"><code style="font-size:15px;word-break:break-all">${esc(url)}</code><div class="chips"><button class="btn small" id="copy">주소 복사</button><a class="btn small" href="${esc(url)}" target="_blank" rel="noopener">학생 화면 열기</a></div><span class="muted">우리 반 바로가기 '사회' 칸에 이 주소를 넣어 주세요.</span></div></div></div>
    <div class="set"><div class="k">우리 지역 ⭐</div><div class="rsearch" style="max-width:360px"><input type="text" id="home" value="${esc(regLabel(home))}" autocomplete="off" style="border:1.5px solid var(--line);border-radius:10px;padding:9px 12px;width:100%"><div class="rres hide" id="homer"></div></div></div>
    <div class="set"><div class="k">지도 칠하기</div><div class="chips"><button class="chip${T.cfg.paint !== 'ok' ? ' on' : ''}" data-p="all">카드를 올리면 바로 칠하기</button><button class="chip${T.cfg.paint === 'ok' ? ' on' : ''}" data-p="ok">확인 완료한 카드만 칠하기</button></div></div>
    <div class="set"><div class="k">활동 잠금</div><div><button class="btn ${T.cfg.lock ? 'okb' : 'warn'}" id="lock">${T.cfg.lock ? '🔓 다시 열기' : '🔒 잠그기 (학생 카드 올리기 멈춤)'}</button></div></div>
    <div class="set"><div class="k">예시 카드</div><div style="display:grid;gap:6px"><span class="muted">교과서 81쪽 예시(청주시 · 초정 행궁)를 '선생님' 카드로 넣어 시범을 보여요.</span><div><button class="btn" id="sample">예시 카드 넣기</button></div></div></div>
    <div class="set"><div class="k">모둠 다시 고르기</div><div style="display:grid;gap:6px"><span class="muted">모든 학생 기기가 처음 화면에서 모둠을 다시 골라요 (카드는 그대로).</span><div><button class="btn warn" id="resetdev">모든 기기 모둠 초기화</button></div></div></div>
    <div class="set"><div class="k">교사 PIN</div><div><button class="btn" id="chpin">PIN 바꾸기</button></div></div>
    <div class="set"><div class="k">새로 시작</div><div style="display:grid;gap:6px"><span class="muted">모든 카드를 휴지통으로 옮겨요. 휴지통에서 되살릴 수 있어요.</span><div><button class="btn danger" id="clearall">모든 카드 지우기</button></div></div></div>
  </div>`;
  $('#copy').onclick = () => { navigator.clipboard.writeText(url).then(() => toast('복사했어요', 'ok'), () => toast(url)); };
  const hi = $('#home'), hr = $('#homer');
  hi.oninput = () => { const rs = searchRegions(hi.value, 8).filter(r => !r.whole); hr.innerHTML = rs.map(r => `<button type="button" data-k="${r.k}">${esc(r.label)} <small class="muted">${esc(r.sido.sn)}</small></button>`).join(''); hr.classList.toggle('hide', !rs.length); hr.querySelectorAll('[data-k]').forEach(b => b.onclick = () => { DB.update(`${ROOT}/cfg`, { home: b.dataset.k }).then(() => { toast('우리 지역을 바꿨어요', 'ok'); drawSet(); }).catch(fail()); }); };
  $$('[data-p]').forEach(b => b.onclick = () => DB.update(`${ROOT}/cfg`, { paint: b.dataset.p }).then(() => drawSet()).catch(fail()));
  $('#lock').onclick = () => DB.update(`${ROOT}/cfg`, { lock: !T.cfg.lock }).then(() => drawSet()).catch(fail());
  $('#sample').onclick = () => {
    const o = { g: 0, r: '43110', c: 'pride', n: '초정 행궁', w: '세종 대왕이 눈병을 고치러 머물렀던 초정 행궁을 알려요', m: 'web,sns', h: '세종 대왕의 방문을 재미있는 드라마로 소개해요', t: 'hist', src: 'web', st: 'ok', ts: DB.TS, tch: true };
    DB.set(`${ROOT}/cards/${DB.key()}`, o).then(() => toast('예시 카드를 넣었어요', 'ok')).catch(fail());
  };
  $('#resetdev').onclick = async () => { if (await ask('모둠을 초기화할까요?', '학생 기기마다 모둠을 다시 골라야 해요. 카드는 지워지지 않아요.', '초기화', '취소', true)) DB.remove(`${ROOT}/dev`).then(() => toast('초기화했어요', 'ok')).catch(fail()); };
  $('#chpin').onclick = async () => { const p = await newPin(); if (p) toast('PIN을 바꿨어요. 다른 교사 기기는 새 PIN으로 다시 들어와야 해요.', 'ok'); };
  $('#clearall').onclick = async () => {
    const all = allCards(T.cards); if (!all.length) { toast('지울 카드가 없어요'); return; }
    if (!(await ask('모든 카드를 지울까요?', `카드 <b>${all.length}장</b>을 모두 휴지통으로 옮겨요.`, '모두 지우기', '취소', true))) return;
    const up = {}; all.forEach(c => { const o = Object.assign({}, c); delete o.id; o.del = DB.TS; up[`cards/${c.id}`] = null; up[`trash/${c.id}`] = o; });
    DB.update(ROOT, up).then(() => toast('모두 휴지통으로 옮겼어요', 'ok')).catch(fail());
  };
}
