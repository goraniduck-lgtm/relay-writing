/* 릴레이 그리기 — 진행자 화면과 교사 화면이 함께 쓰는 코드 */
const firebaseConfig = {
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
const ROOT = 'relayDrawing';

firebase.initializeApp(firebaseConfig);
const D = firebase.database();
const AUTH = firebase.auth();
const isTeacher = () => !!AUTH.currentUser && AUTH.currentUser.uid === TEACHER_UID;
const ref = p => D.ref(p ? ROOT + '/' + p : ROOT);

/* 기기마다 시계가 조금씩 달라서 Firebase 서버 시각에 맞춤 */
let serverOffset = 0;
D.ref('.info/serverTimeOffset').on('value', s => { serverOffset = s.val() || 0; });
const now = () => Date.now() + serverOffset;

function waitAuth(){
  return new Promise(res => { const off = AUTH.onAuthStateChanged(u => { off(); res(u); }); });
}
async function ensureAnon(){
  const u = await waitAuth();
  if (u) return u;
  const c = await AUTH.signInAnonymously();
  return c.user;
}

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ls = {
  get(k, d){ try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch(e){ return d; } },
  set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} }
};
function toast(msg){
  let t = document.getElementById('toast');
  if (!t){ t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, 2600);
}

/* Firebase는 배열 속 빈 값을 지우므로, 읽을 때 모양을 다시 맞춤 */
function toArr(v, n, fill){
  const a = Array.isArray(v) ? v.slice() : (v && typeof v === 'object' ? Object.keys(v).reduce((acc, k) => { acc[+k] = v[k]; return acc; }, []) : []);
  for (let i = 0; i < n; i++) if (a[i] == null) a[i] = fill;
  return a.slice(0, n);
}
function normGame(g){
  if (!g) return null;
  g.groups = g.groups || 0;
  g.words = toArr(g.words, (g.words && Object.keys(g.words).length) || 0, '');
  g.progress = toArr(g.progress, g.groups, 0);
  g.finishedAt = toArr(g.finishedAt, g.groups, 0);
  g.log = g.log ? toArr(g.log, Object.keys(g.log).length, null).filter(Boolean) : [];
  return g;
}
function listOf(obj){
  return Object.entries(obj || {}).map(([id, v]) => ({ id, ...v })).sort((a, b) => (a.order || 0) - (b.order || 0));
}
function normSet(s){ s.words = s.words ? toArr(s.words, Object.keys(s.words).length, '').filter(Boolean) : []; return s; }

const total = g => g.words.length + 1;
const itemText = (g, i) => i < g.words.length ? g.words[i] : g.mission;
const isActive = g => !!g && (g.status === 'running' || g.status === 'paused');
const gcolor = i => `var(--g${i % 10})`;
function elapsed(g){
  if (!g || !g.startedAt) return 0;
  const end = g.pausedAt || (g.status === 'ended' ? g.endedAt : now());
  return Math.max(0, end - g.startedAt - (g.pausedTotal || 0));
}
function fmt(ms){ const s = Math.max(0, Math.floor(ms / 1000)); return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }
function clockInfo(g){
  const el = elapsed(g);
  if (!g.timerSec) return { text: fmt(el), cls: '', over: false };
  const rem = g.timerSec * 1000 - el;
  if (rem <= 0) return { text: '00:00', cls: 'over', over: true };
  return { text: fmt(rem + 999), cls: rem <= 60000 ? 'low' : '', over: false };
}
function rankOf(g, gi){
  const t = g.finishedAt[gi]; if (!t) return null;
  return g.finishedAt.filter(x => x && x <= t).length;
}
const STATUS = { running: '진행 중', paused: '일시정지', ended: '끝남' };

/* 화면에 떠 있는 모든 타이머를 0.25초마다 갱신. getGame(id)는 각 화면이 넘겨줌 */
function startClocks(getGame, onTick){
  setInterval(() => {
    document.querySelectorAll('[data-clock-for]').forEach(el => {
      const g = getGame(el.dataset.clockFor); if (!isActive(g)) return;
      const ci = clockInfo(g); el.textContent = ci.text; el.className = el.dataset.base + ' ' + ci.cls;
    });
    if (onTick) onTick();
  }, 250);
}
const BRAND_SVG = `<svg viewBox="0 0 32 32" aria-hidden="true"><rect x="3" y="5" width="22" height="22" rx="4" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M8 20c3-6 6 2 9-4" fill="none" stroke="var(--accent)" stroke-width="2.6" stroke-linecap="round"/><path d="M22 3l7 7-9 9-4 1 1-4z" fill="var(--g1)"/></svg>`;
