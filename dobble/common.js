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
    /* 판 확정: 서버의 최신 기록으로 계산해서 한 번만 씀 (기록이 늦게 와도 확정 전이면 포함) */
    decide(path, pick) {
      return new Promise(res => {
        ref(path).transaction(cur => {
          if (!cur || typeof cur !== 'object' || cur.win) return undefined;
          const w = pick(cur); if (!w) return undefined;
          return Object.assign({}, cur, { win: w });
        }, (err, committed) => res(!err && committed), false);
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

/* 이 기기가 그릴 수 있는 이모지인지 (못 그리면 네모 칸 대신 낱말만 보이게) */
const emojiOk = (function () {
  const cache = {}; let cx = null, ref = null;
  const draw = t => { cx.clearRect(0, 0, 32, 32); cx.fillText(t, 0, 26); return cx.getImageData(0, 0, 32, 32).data; };
  return e => {
    if (e in cache) return cache[e];
    try {
      if (!cx) {
        const cv = document.createElement('canvas'); cv.width = cv.height = 32;
        cx = cv.getContext('2d', { willReadFrequently: true });
        cx.font = '26px "Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif';
        ref = draw('\u{10FFFD}');
      }
      const d = draw(e); let same = true, any = false;
      for (let i = 0; i < d.length; i++) { if (d[i] !== ref[i]) same = false; if ((i & 3) === 3 && d[i]) any = true; }
      return (cache[e] = any && !same);
    } catch (err) { return (cache[e] = true); }
  };
})();
const emojiOf = s => (s.e && emojiOk(s.e) ? s.e : '');

/* 그림 정보 */
const setById = id => SETS.find(s => s.id === id) || SETS[0];
function matOf(set, i) {
  const s = set.symbols[i];
  if (s.m && MATERIALS[s.m]) return MATERIALS[s.m];
  const keys = Object.keys(MATERIALS);
  let h = 0; for (const ch of (s.w || s.e || s.img || String(i))) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return MATERIALS[keys[h % keys.length]];
}
/* 자리와 판 길이 */
const SEATS = ['a', 'b', 'c', 'd', 'e', 'f'];
/* k명이 할 때 카드 장수: 나눠 주는 k장 + 한 사람이 per장쯤 가져갈 만큼 (세트 전체를 넘지 않게) */
function deckLen(k, per, total) { return per ? Math.min(total, k + per * Math.max(k, 2)) : total; }
const setTotal = set => symbolsFor(orderFor(set.symbols.length));
const symName = (set, i) => set.symbols[i].w || set.symbols[i].e || '';
