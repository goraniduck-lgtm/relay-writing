/* 교실 마피아 — 학생·관리자·TV 화면이 함께 쓰는 코드
   데이터는 Firebase 프로젝트 relay-writing-4415e 의 mafia/ 아래에 저장
     mafia/index/{code}                 교사용 방 목록
     mafia/rooms/{code}/meta            방 정보·사회자 키 (교사만)
     .../hosts/{uid}                    학생 사회자 기기
     .../cfg                            게임 설정 (관리자만)
     .../pub                            모두에게 공개되는 진행 상태 (state, players, rounds, end)
     .../names/{이름키} = pid            이름 중복 방지
     .../me/{uid} = pid                 기기 ↔ 참가자 연결 (재접속)
     .../presence/{pid}                 접속 상태
     .../roles/{pid}                    역할 (본인·관리자만)
     .../team                           마피아 명단 (마피아·관리자만)
     .../sec/{pid}/{round}              비밀 미션·확인 기록 (본인·관리자만)
     .../dv/{round}/{stage}/{pid}       낮 투표 (본인·관리자만)
     .../nv/{round}/m|d/{pid}           밤 행동 (본인·관리자만)
     .../pred/{pid}                     관전자 예측 (본인·관리자만)
     .../log                            운영 기록 (관리자만)
     .../rejoin/{uid}                   다른 기기로 재접속 요청 */
'use strict';

const FB_CONFIG = {
  apiKey: "AIzaSyCQatrGR51jgV-QmkPr-vq1Ppj9y2NMuBo",
  authDomain: "relay-writing-4415e.firebaseapp.com",
  databaseURL: "https://relay-writing-4415e-default-rtdb.firebaseio.com",
  projectId: "relay-writing-4415e",
  storageBucket: "relay-writing-4415e.firebasestorage.app",
  messagingSenderId: "686621546795",
  appId: "1:686621546795:web:99d59869acd2264a42cd6e"
};
/* 교사 계정 — 비밀번호는 코드에 없고 Firebase 서버가 확인함 */
const TEACHER_EMAIL = 'goraniduck@gmail.com';
const TEACHER_UID = 'VNW0t5e67CfInsF63jATWdBsaqG2';

/* ---------- 데이터베이스 연결 (테스트 때는 window.__FAKE_DB__ 사용) ---------- */
const DB = window.__FAKE_DB__ || (function () {
  firebase.initializeApp(FB_CONFIG);
  const db = firebase.database();
  const auth = firebase.auth();
  let offset = 0;
  db.ref('.info/serverTimeOffset').on('value', s => { offset = s.val() || 0; });
  let authWait = null;
  function waitAuth() {
    if (!authWait) authWait = new Promise(res => { const off = auth.onAuthStateChanged(u => { off(); res(u); }); });
    return authWait;
  }
  return {
    async ready(anon) {
      const u = await waitAuth();
      if (u) return u;
      if (!anon) return null;
      return (await auth.signInAnonymously()).user;
    },
    uid: () => auth.currentUser ? auth.currentUser.uid : null,
    isTeacher: () => !!auth.currentUser && auth.currentUser.uid === TEACHER_UID,
    async teacherLogin(pw) {
      await auth.signInWithEmailAndPassword(TEACHER_EMAIL, pw);
      if (auth.currentUser.uid !== TEACHER_UID) { await auth.signOut(); throw new Error('not teacher'); }
      return auth.currentUser;
    },
    logout: () => auth.signOut(),
    now: () => Date.now() + offset,
    on(path, cb, err) {
      const r = db.ref(path);
      const h = r.on('value', s => cb(s.val()), e => { if (err) err(e); else console.warn(path, e); });
      return () => r.off('value', h);
    },
    get: path => db.ref(path).get().then(s => s.val()),
    set: (path, v) => db.ref(path).set(v),
    update: (path, obj) => db.ref(path).update(obj),
    remove: path => db.ref(path).remove(),
    /* fn(cur) → 새 값, undefined면 취소. 로컬 캐시가 비어 있으면 null로 한 번 불리므로 null은 그대로 돌려 서버 값으로 다시 계산 */
    tx(path, fn) {
      return new Promise((resolve, reject) => {
        db.ref(path).transaction(cur => (cur === null ? null : fn(cur)), (e, committed, snap) => {
          if (e) reject(e); else resolve({ committed, val: snap ? snap.val() : null });
        }, false);
      });
    },
    key: () => db.ref().push().key,
    connected(cb) { const r = db.ref('.info/connected'); r.on('value', s => cb(!!s.val())); },
    presence(path) {
      const r = db.ref(path);
      db.ref('.info/connected').on('value', s => {
        if (!s.val()) return;
        r.onDisconnect().remove().then(() => r.set(DB.now())).catch(() => {});
      });
    }
  };
})();

/* ---------- 공통 도구 ---------- */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = s => document.querySelector(s);
const qp = new URLSearchParams(location.search);
const ROOM_PATH = code => 'mafia/rooms/' + code;
const ls = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} }
};
function toast(msg) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, 2800);
}
const failMsg = e => /permission/i.test(String(e && (e.code || e.message))) ? '지금은 할 수 없어요 (권한 없음)' : '저장하지 못했어요. 인터넷 연결을 확인해 주세요.';
const fail = msg => e => { console.warn(e); toast(msg || failMsg(e)); };
function fmt(ms) { if (ms == null) return '--:--'; const s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
/* 이름 → 데이터베이스 키 (띄어쓰기·대소문자 무시) */
const nameKey = s => String(s || '').trim().replace(/\s+/g, '').toLowerCase().replace(/[.#$\[\]\/]/g, '_');
const randKey = n => { const c = 'abcdefghijkmnpqrstuvwxyz23456789'; let s = ''; const a = new Uint32Array(n); crypto.getRandomValues(a); for (const x of a) s += c[x % c.length]; return s; };
const randCode = () => { const c = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; const a = new Uint32Array(5); crypto.getRandomValues(a); for (const x of a) s += c[x % c.length]; return s; };

/* 다시 그릴 때 입력 중인 칸의 내용·커서를 지킴 */
function paint(el, html) {
  if (!el) return;
  if (el._last === html) return;
  el._last = html;
  const act = document.activeElement;
  const keep = {};
  el.querySelectorAll('input[id],textarea[id],select[id]').forEach(i => {
    keep[i.id] = { v: i.type === 'checkbox' ? i.checked : i.value, focus: i === act, s: i.selectionStart, e: i.selectionEnd };
  });
  const sy = window.scrollY;
  el.innerHTML = html;
  for (const [id, k] of Object.entries(keep)) {
    const i = document.getElementById(id);
    if (!i || i.dataset.fresh != null) continue;
    if (i.type === 'checkbox') i.checked = k.v; else i.value = k.v;
    if (k.focus) { i.focus(); try { i.setSelectionRange(k.s, k.e); } catch (e) {} }
  }
  window.scrollTo(0, sy);
}

/* ---------- 단계 ---------- */
const PH = {
  lobby:     { name: '참가자 모으기', icon: '🎟️', mood: 'lobby' },
  reveal:    { name: '역할 확인', icon: '🃏', mood: 'reveal' },
  mission:   { name: '공통 미션', icon: '🤸', mood: 'day', timer: 'mission' },
  think:     { name: '개인 추리', icon: '🤔', mood: 'think', timer: 'think' },
  meeting:   { name: '시민 회의', icon: '🗣️', mood: 'meeting', timer: 'meeting' },
  vote:      { name: '낮 투표', icon: '🗳️', mood: 'vote', timer: 'vote' },
  dayResult: { name: '투표 결과', icon: '📢', mood: 'vote' },
  night:     { name: '밤', icon: '🌙', mood: 'night', timer: 'night' },
  morning:   { name: '아침 발표', icon: '🌅', mood: 'morning' },
  limit:     { name: '제한 라운드 도달', icon: '⏳', mood: 'day' },
  end:       { name: '게임 종료', icon: '🏁', mood: 'end' }
};
const isNight = st => st && st.phase === 'night';
const DEFAULT_TIMES = { mission: 120, think: 30, meeting: 90, vote: 30, night: 90 };
const TIME_NAMES = { mission: '공통·비밀 미션', think: '개인 추리', meeting: '시민 회의', vote: '낮 투표 (재투표 포함)', night: '밤 행동' };
const DEFAULT_CFG = () => ({
  roles: { mafia: null, doctor: true, manual: {} },
  run: { confirm: 'single', host: 'teacher', times: Object.assign({}, DEFAULT_TIMES), maxR: 5, diff: 'mix' }
});
const TV_MSGS = ['모두 태블릿을 확인하세요.', '회의를 마무리하세요.', '투표하지 않은 학생은 투표하세요.', '잠시 기다려 주세요.', '다음 라운드를 준비하세요.', '발표하는 친구의 말을 끝까지 들어요.'];
const END_METHOD = { normal: '일반 종료', limit: '제한 라운드 생존율 판정', manual: '선생님 종료 (생존율 판정)' };
const WINNER_TEXT = { citizen: '시민 팀 승리!', mafia: '마피아 팀 승리!', draw: '무승부!' };

/* 남은 시간(ms) — 타이머가 없으면 null */
function remaining(st) {
  if (!st || !st.timer) return null;
  const t = st.timer;
  if (st.paused) return t.rem != null ? t.rem : 0;
  return Math.max(0, (t.end || 0) - DB.now());
}
function aliveList(pub) {
  return Object.entries((pub && pub.players) || {}).filter(([, p]) => p.alive).map(([id, p]) => ({ id, ...p })).sort(byName);
}
function deadList(pub) {
  return Object.entries((pub && pub.players) || {}).filter(([, p]) => !p.alive).map(([id, p]) => ({ id, ...p })).sort(byName);
}
const byName = (a, b) => String(a.name).localeCompare(String(b.name), 'ko', { numeric: true });
const pname = (pub, id) => (pub && pub.players && pub.players[id] ? pub.players[id].name : '?');

/* 주소 */
const baseUrl = () => location.href.replace(/[?#].*$/, '').replace(/[^/]*$/, '');
const studentUrl = code => baseUrl() + '?r=' + code;
const tvUrl = code => baseUrl() + 'tv.html?r=' + code;
const hostUrl = (code, key) => baseUrl() + 'admin.html?r=' + code + '&k=' + key;
function qr(el, text, size) {
  if (!el) return;
  el.innerHTML = '';
  if (window.QRCode) new QRCode(el, { text, width: size || 160, height: size || 160, correctLevel: QRCode.CorrectLevel.M });
  else el.textContent = text;
}

/* 1초마다 [data-timer] 글자만 바꿈 (전체를 다시 그리지 않음) */
function startTicker(getState) {
  setInterval(() => {
    const st = getState();
    const ms = remaining(st);
    document.querySelectorAll('[data-timer]').forEach(el => {
      el.textContent = fmt(ms);
      el.classList.toggle('low', ms != null && ms <= 10000 && !(st && st.paused));
      el.classList.toggle('zero', ms === 0);
    });
  }, 250);
}


/* ---------- 탈락 발표 ---------- */
const OUT_CAUSE = { day: '시민 투표', night: '마피아의 공격', fix: '선생님 처리' };
const OUT_ICON = { day: '🗳️', night: '🌙', fix: '🛠' };
/* 이번 단계(낮 결과·아침)에 탈락한 사람 */
function stepDeath(pub) {
  const s = (pub && pub.state) || {}; const r = (pub && pub.rounds && pub.rounds[s.round]) || {};
  if (s.phase === 'dayResult') { const d = (r.day || {})['s' + s.stage] || {}; return d.out ? { id: d.out, t: 'day', reason: d.reason } : { id: null, t: 'day', reason: d.reason }; }
  if (s.phase === 'morning') { const out = r.night && r.night.out; return { id: out || null, t: 'night' }; }
  return null;
}
function deathSentence(pub, id, t) {
  const n = esc(pname(pub, id));
  return t === 'night' ? `${OUT_ICON.night} 마피아의 공격으로 <b>${n}</b>이(가) 탈락했어요.`
    : t === 'day' ? `${OUT_ICON.day} 시민 투표로 <b>${n}</b>이(가) 탈락했어요.` : `<b>${n}</b>이(가) 탈락했어요.`;
}
/* 탈락 순서 (게임 끝 화면에서 왜 이기고 졌는지 보기) — roles는 끝난 뒤에만 넘김 */
function deathList(pub) {
  return Object.entries((pub && pub.players) || {}).filter(([, p]) => !p.alive && p.out)
    .map(([id, p]) => ({ id, name: p.name, r: p.out.r || 0, t: p.out.t }))
    .sort((a, b) => a.r - b.r || (a.t === 'night') - (b.t === 'night'));
}
function deathTimelineHtml(pub, roles, big) {
  const list = deathList(pub);
  if (!list.length) return '';
  return `<div class="timeline ${big ? 'big' : ''}"><h3>💀 탈락 순서</h3>${list.map((d, i) => `<div class="tl ${i === list.length - 1 ? 'last' : ''}">
    <span class="when">${d.r}일째 ${d.t === 'night' ? '밤' : d.t === 'day' ? '낮' : ''}</span>
    <span class="who">${esc(d.name)}${roles && roles[d.id] ? ` <span class="pill ${roles[d.id]}">${Logic.ROLES[roles[d.id]].name}</span>` : ''}</span>
    <span class="why">${OUT_ICON[d.t] || ''} ${OUT_CAUSE[d.t] || ''}</span></div>`).join('')}</div>`;
}

/* ---------- 학생 전체 화면 (기본 ON, 교사가 끌 수 있음: pub/opt/fs) ---------- */
const fsOnFor = pub => !(pub && pub.opt && pub.opt.fs === false);

window.addEventListener('unhandledrejection', e => { console.warn(e.reason); });
