/* 딱! 같은 그림 — 데이터베이스 연결과 공통 도구
   데이터: Firebase 프로젝트 relay-writing-4415e 의 dobble/ 아래 (구조는 tools/rules.js 맨 위 설명) */
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
const ROOT = 'dobble';

/* 시험 때는 window.__FAKE_DB__ 사용 */
const DB = window.__FAKE_DB__ || (function () {
  let db = null, auth = null, offset = 0, authWait = null;
  function init() {
    if (db) return;
    firebase.initializeApp(FB_CONFIG);
    db = firebase.database(); auth = firebase.auth();
    db.ref('.info/serverTimeOffset').on('value', s => { offset = s.val() || 0; });
  }
  const ref = p => (init(), db.ref(p));
  return {
    async ready() {
      init();
      if (!authWait) authWait = new Promise(res => { const off = auth.onAuthStateChanged(u => { off(); res(u); }); });
      const u = await authWait;
      return u || (await auth.signInAnonymously()).user;
    },
    uid: () => auth && auth.currentUser ? auth.currentUser.uid : null,
    now: () => Date.now() + offset,
    on(path, cb) { const r = ref(path); const h = r.on('value', s => cb(s.val()), e => console.warn(path, e)); return () => r.off('value', h); },
    get: path => ref(path).get().then(s => s.val()),
    set: (path, v) => ref(path).set(v),
    update: (path, o) => ref(path).update(o),
    remove: path => ref(path).remove(),
    /* 비어 있을 때만 먼저 쓴 쪽이 가짐 — 성공하면 true (화면에 먼저 반영하지 않음) */
    claim(path, v) {
      return new Promise(res => {
        ref(path).transaction(cur => (cur === null ? v : undefined), (err, committed) => res(!err && committed), false);
      });
    },
    whileOnline(path, v) { const r = ref(path); r.onDisconnect().remove(); return r.set(v); },
    connected(cb) { ref('.info/connected').on('value', s => cb(!!s.val())); },
    TS: firebase.database.ServerValue.TIMESTAMP
  };
})();

/* ---------- 공통 도구 ---------- */
const $ = s => document.querySelector(s);
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const ls = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
const wait = ms => new Promise(r => setTimeout(r, ms));
/* 애니메이션 끝 기다리기 — 화면이 가려져 멈춰도 정해진 시간 뒤엔 넘어감 */
const done = a => Promise.race([a.finished.catch(() => {}), wait((+a.effect.getTiming().duration || 0) + 150)]);
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const J = () => rnd(1 - GAME.randomness, 1 + GAME.randomness);
function toast(msg) {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, 2600);
}

/* 그림 정보 */
const setById = id => SETS.find(s => s.id === id) || SETS[0];
function matOf(set, i) {
  const s = set.symbols[i];
  if (s.m && MATERIALS[s.m]) return MATERIALS[s.m];
  const keys = Object.keys(MATERIALS);
  let h = 0; for (const ch of (s.w || s.e || s.img || String(i))) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return MATERIALS[keys[h % keys.length]];
}
const symName = (set, i) => set.symbols[i].w || set.symbols[i].e || '';
