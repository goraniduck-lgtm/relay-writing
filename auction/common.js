/* 자리 경매 — 학생·교사·TV 화면이 함께 쓰는 코드
   데이터: Firebase 프로젝트 relay-writing-4415e 의 auction/ 아래 (구조는 auction/tools/rules.js 맨 위 설명) */
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

/* ---------- 데이터베이스 연결 (시험 때는 window.__FAKE_DB__ 사용) ---------- */
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
  const pres = {};
  const ref = p => (p ? db.ref(p) : db.ref());   // 빈 경로 = 루트
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
      const r = ref(path);
      const h = r.on('value', s => cb(s.val()), e => { if (err) err(e); else console.warn(path, e); });
      return () => r.off('value', h);
    },
    get: path => ref(path).get().then(s => s.val()),
    set: (path, v) => ref(path).set(v),
    update: (path, obj) => ref(path).update(obj),
    remove: path => ref(path).remove(),
    /* fn(cur) → 새 값, undefined면 취소. 로컬 캐시가 비어 있으면 null로 한 번 불리므로 null은 그대로 돌려 서버 값으로 다시 계산 */
    tx(path, fn) {
      return new Promise((resolve, reject) => {
        ref(path).transaction(cur => (cur === null ? null : fn(cur)), (e, committed, snap) => {
          if (e) reject(e); else resolve({ committed, val: snap ? snap.val() : null });
        }, false);
      });
    },
    key: () => db.ref().push().key,
    connected(cb) { db.ref('.info/connected').on('value', s => cb(!!s.val())); },
    /* 접속 표시: 연결될 때마다 서버 시각을 쓰고, 끊기면 서버가 지움 */
    presence(path) {
      if (pres[path]) return;
      const r = db.ref(path);
      const h = s => {
        if (!s.val()) return;
        r.onDisconnect().remove().then(() => r.set(firebase.database.ServerValue.TIMESTAMP)).catch(() => {});
      };
      pres[path] = h;
      db.ref('.info/connected').on('value', h);
    },
    cancelPresence(path) {
      if (!pres[path]) return;
      db.ref('.info/connected').off('value', pres[path]);
      delete pres[path];
      db.ref(path).onDisconnect().cancel().catch(() => {});
    },
    TS: firebase.database.ServerValue.TIMESTAMP
  };
})();

/* ---------- 공통 도구 ---------- */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = s => document.querySelector(s);
const qp = new URLSearchParams(location.search);
const ROOM = code => 'auction/rooms/' + code;
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
  const scrolls = [...el.querySelectorAll('[data-keep-scroll]')].map(x => [x.dataset.keepScroll, x.scrollTop]);
  const sy = window.scrollY;
  el.innerHTML = html;
  for (const [id, k] of Object.entries(keep)) {
    const i = document.getElementById(id);
    if (!i || i.dataset.fresh != null) continue;
    if (i.type === 'checkbox') i.checked = k.v; else i.value = k.v;
    if (k.focus) { i.focus(); try { i.setSelectionRange(k.s, k.e); } catch (e) {} }
  }
  for (const [k, top] of scrolls) { const x = el.querySelector(`[data-keep-scroll="${k}"]`); if (x) x.scrollTop = top; }
  window.scrollTo(0, sy);
}

/* ---------- 단계 ---------- */
const PH_NAME = {
  idle: '경매 대기', ready: '경매 자리 공개', bid: '입찰 중', result: '경매 결과',
  assign: '최종 자리 배정', final: '자리 배정 완료'
};
const DUR_MIN = 5, DUR_MAX = 15;
const JUDGE_DELAY = 1200;   // 마감 뒤 판정까지 기다리는 시간(ms) — 마감 직전 입찰이 서버에 닿을 시간

/* 학생 표시 이름 (설정: 이름 / 번호 / 번호+이름) */
function sname(cfg, sid, mode) {
  const r = cfg && cfg.roster && cfg.roster[sid];
  if (!r) return '?';
  const m = mode || (cfg.display || 'both');
  if (m === 'name') return r.name || (r.no + '번');
  if (m === 'no') return r.no + '번';
  return r.no + '. ' + (r.name || '');
}
/* 지금 연결된 기기가 접속 중인지 (pres/{학생}/{uid}) */
const isOnline = (pres, claims, sid) => { const c = claims && claims[sid]; return !!(c && pres && pres[sid] && pres[sid][c.uid]); };
const rosterList = cfg => Object.entries((cfg && cfg.roster) || {}).map(([id, r]) => ({ id, ...r })).sort((a, b) => (+a.no || 0) - (+b.no || 0) || String(a.name).localeCompare(String(b.name), 'ko'));
const seatNo = (cfg, seat) => (cfg && cfg.layout && cfg.layout.seats && cfg.layout.seats[seat] ? cfg.layout.seats[seat].no : '?');

/* 남은 입찰 시간(ms) — 입찰 중이 아니면 null */
function remaining(st) {
  if (!st || st.ph !== 'bid' || typeof st.t0 !== 'number') return null;
  return Math.max(0, st.t0 + (st.dur || 5) * 1000 - DB.now());
}
/* 0.1초마다 [data-count] 숫자와 [data-bar] 길이만 바꿈 */
function startTicker(getSt, onZero) {
  let wasZero = false;
  setInterval(() => {
    const st = getSt();
    const ms = remaining(st);
    document.querySelectorAll('[data-count]').forEach(el => {
      const s = ms == null ? '' : String(Math.ceil(ms / 1000));
      if (el.textContent !== s) el.textContent = s;
      el.classList.toggle('low', ms != null && ms <= 3000);
    });
    document.querySelectorAll('[data-bar]').forEach(el => {
      const p = ms == null ? 0 : Math.max(0, Math.min(1, ms / ((st.dur || 5) * 1000)));
      el.style.transform = 'scaleX(' + p.toFixed(3) + ')';
    });
    const z = ms === 0;
    if (z && !wasZero && onZero) onZero();
    wasZero = z;
  }, 100);
}

/* ---------- 교실 배치도 ----------
   o: {cfg, core, hl: 강조할 자리, mine: [내 자리], label(seatId, seat) → 칸 안 HTML, cls(seatId) → 추가 class, click: data-act 이름, size: 's'|'m'|'l'} */
function seatMap(o) {
  const L = o.cfg && o.cfg.layout;
  if (!L || !L.seats) return '<p class="muted center">자리 배치가 아직 없어요</p>';
  const at = {};
  for (const [id, s] of Object.entries(L.seats)) at[s.r + ',' + s.c] = id;
  let cells = '';
  for (let r = 0; r < L.rows; r++) for (let c = 0; c < L.cols; c++) {
    const id = at[r + ',' + c];
    if (!id) { cells += '<div class="cell aisle"></div>'; continue; }
    const s = L.seats[id];
    const cls = ['cell', 'seat'];
    if (s.x) cls.push('blocked');
    if (o.hl === id) cls.push('hl');
    if (o.mine && o.mine.includes(id)) cls.push('mine');
    if (o.cls) cls.push(o.cls(id, s) || '');
    const inner = o.label ? o.label(id, s) : `<b class="no">${s.no}</b>`;
    const tag = o.click ? 'button' : 'div';
    cells += `<${tag} class="${cls.join(' ')}" ${o.click ? `data-act="${o.click}" data-id="${id}"` : ''} aria-label="${s.no}번 자리">${inner}</${tag}>`;
  }
  return `<div class="map map-${o.size || 'm'}" style="--rows:${L.rows};--cols:${L.cols}"><div class="board">칠판 · 교탁</div>
    <div class="grid" style="grid-template-columns:repeat(${L.cols},minmax(0,1fr))">${cells}</div></div>`;
}

/* 주소 */
const baseUrl = () => location.href.replace(/[?#].*$/, '').replace(/[^/]*$/, '');
const studentUrl = code => baseUrl() + '?r=' + code;
const tvUrl = code => baseUrl() + 'tv.html?r=' + code;
function qr(el, text, size) {
  if (!el) return;
  el.innerHTML = '';
  if (window.QRCode) new QRCode(el, { text, width: size || 160, height: size || 160, correctLevel: QRCode.CorrectLevel.M });
  else el.textContent = text;
}
/* 연결 상태 띠 */
function connBanner() {
  let el = document.getElementById('conn');
  if (!el) { el = document.createElement('div'); el.id = 'conn'; el.className = 'conn'; el.hidden = true; document.body.appendChild(el); }
  el.textContent = '⚠️ 인터넷 연결이 끊겼어요. 다시 연결하는 중…';
  let t = null;
  DB.connected(on => {
    clearTimeout(t);
    connBanner.on = on;
    if (on) el.hidden = true;
    else t = setTimeout(() => { el.hidden = false; }, 1500);
  });
}
window.addEventListener('unhandledrejection', e => { console.warn(e.reason); });
