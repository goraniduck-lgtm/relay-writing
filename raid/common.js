/* 그림자 용 레이드 — 학생 화면·TV 화면·교사 화면이 함께 쓰는 코드 */
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
const ROOT = 'raid';

firebase.initializeApp(firebaseConfig);
const D = firebase.database();
const AUTH = firebase.auth();
const INC = n => firebase.database.ServerValue.increment(n);
const isTeacher = () => !!AUTH.currentUser && AUTH.currentUser.uid === TEACHER_UID;
const ref = p => D.ref(p ? ROOT + '/' + p : ROOT);

let serverOffset = 0;
D.ref('.info/serverTimeOffset').on('value', s => { serverOffset = s.val() || 0; });
const now = () => Date.now() + serverOffset;

function waitAuth(){ return new Promise(res => { const off = AUTH.onAuthStateChanged(u => { off(); res(u); }); }); }
async function ensureAnon(){ const u = await waitAuth(); if (u) return u; return (await AUTH.signInAnonymously()).user; }

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ls = {
  get(k, d){ try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch(e){ return d; } },
  set(k, v){ try { localStorage.setItem(k, JSON.stringify(v)); } catch(e){} },
  del(k){ try { localStorage.removeItem(k); } catch(e){} }
};
function toast(msg){
  let t = document.getElementById('toast');
  if (!t){ t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, 2600);
}
const fail = msg => () => toast(msg || '저장하지 못했어요. 인터넷 연결을 확인해 주세요.');
const newId = p => (p || '') + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = a => a[Math.floor(Math.random() * a.length)];
function fmt(ms){ const s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
const norm = s => String(s ?? '').replace(/\s+/g, '').replace(/[.。]$/, '').toLowerCase();

/* ---------- 게임 규칙 상수 ---------- */
const SUBJ = {
  kor:  { name: '국어', job: 'bard',      jobName: '음유시인', zone: '문자의 탑', color: 'var(--kor)' },
  math: { name: '수학', job: 'mage',      jobName: '마법사',   zone: '시계탑',    color: 'var(--math)' },
  soc:  { name: '사회', job: 'explorer',  jobName: '탐험가',   zone: '시장 거리', color: 'var(--soc)' },
  sci:  { name: '과학', job: 'alchemist', jobName: '연금술사', zone: '연구소',    color: 'var(--sci)' }
};
const SUBJ_KEYS = ['kor', 'math', 'soc', 'sci'];
const JOBS = { bard: 'kor', mage: 'math', explorer: 'soc', alchemist: 'sci' };
const DECKS = {
  kor_txt: { name: '국어 · 교과서', sub: 'kor', slots: ['kor_txt'] },
  kor_voc: { name: '국어 · 어휘',   sub: 'kor', slots: ['kor_voc'] },
  kor_sp:  { name: '국어 · 맞춤법', sub: 'kor', slots: ['kor_sp'] },
  math:    { name: '수학', sub: 'math', slots: ['math1', 'math2'] },
  soc:     { name: '사회', sub: 'soc',  slots: ['soc1', 'soc2'] },
  sci:     { name: '과학', sub: 'sci',  slots: ['sci1'] }
};
const DECK_KEYS = Object.keys(DECKS);
const SLOTS = [
  { k: 'kor_txt', sub: 'kor', label: '교과서' }, { k: 'kor_voc', sub: 'kor', label: '어휘' }, { k: 'kor_sp', sub: 'kor', label: '맞춤법' },
  { k: 'math1', sub: 'math', label: '수학' }, { k: 'math2', sub: 'math', label: '수학' },
  { k: 'soc1', sub: 'soc', label: '사회' }, { k: 'soc2', sub: 'soc', label: '사회' },
  { k: 'sci1', sub: 'sci', label: '과학' }
];
const EVENTS = {
  supply: { name: '보급품', text: '모둠 기력 +1' },
  trap:   { name: '함정', text: '다음 미션은 오프라인 미션으로 뽑혀요' },
  eye:    { name: '용의 눈', text: '다음 미션에 성공하면 피해 2배' },
  lamp:   { name: '이웃의 등불', text: '다른 모둠 친구 1명에게 힌트를 1번 받을 수 있어요' },
  lost:   { name: '길 잃음', text: '다음 길잡이는 봉인 칸을 가장 적게 채운 친구가 맡아요' }
};
const PATTERNS = {
  fog:  { name: '그림자 안개', text: '3분 동안 전문가 조언을 쓸 수 없어요', ms: 180000 },
  tail: { name: '꼬리 휘두르기', text: '모든 모둠의 다음 미션은 오프라인 미션!', ms: 15000 },
  wind: { name: '날개 바람', text: '모든 모둠의 말이 날아갔어요! 다음 미션 과목은 선생님이 정해요', ms: 15000 },
  roar: { name: '포효', text: '반 전체가 30초 안에 함께 막아라!', ms: 30000 }
};
const STATUS = { lobby: '준비', act1: '1막 · 봉인 탐색', act2: '2막 · 용의 분노', cross: '갈림길 회의', act3: '3막 · 최후의 결전', end: '결말' };
const STATUS_ORDER = ['lobby', 'act1', 'act2', 'cross', 'act3', 'end'];
const PLAYING = s => s === 'act1' || s === 'act2' || s === 'act3';
const MS_ON = 120000, MS_OFF = 240000, MS_TRAP = 60000, MS_FINAL = 90000, MS_ROAR = 30000;
const DMG = { fight: 15, escape: 10, roar: 5 };
const MAX_ENERGY = 7, FIGHT_TRIES = 3;

const deckCards = d => BANK.filter(c => c.deck === d);
const card = id => BANK.find(c => c.id === id);

/* Firebase는 키 순서를 보장하지 않아 정리해서 씀 */
/* 키는 숫자로 시작하지 않게 씀(g0 = 1모둠, n7 = 7번) — 숫자 키는 Firebase가 배열로 바꿔 버림 */
const GK = gi => 'g' + gi, NK = no => 'n' + no;
function membersOf(grp){
  return Object.entries((grp && grp.members) || {}).filter(([, m]) => m)
    .map(([k, m]) => ({ no: +String(k).replace(/^n/, ''), ...m })).sort((a, b) => a.no - b.no);
}
function groupsOf(g, cls){
  const n = (cls && cls.groups) || 0, out = [];
  for (let i = 0; i < n; i++) out.push({ gi: i, ...((g && g.groups && g.groups[GK(i)]) || {}) });
  return out;
}
function sealCount(grp, no){ return Object.values((grp && grp.seals) || {}).filter(v => +v === +no).length; }
function sealLimits(n){
  if (n >= 4) return { min: 1, max: 3 };
  if (n === 3) return { min: 2, max: 3 };
  if (n === 2) return { min: 3, max: 4 };
  return { min: 1, max: 8 };
}
function subjHas(grp, sub){ return SLOTS.some(s => s.sub === sub && grp.seals && grp.seals[s.k] != null); }
function sealsFull(grp){ return SLOTS.every(s => grp.seals && grp.seals[s.k] != null); }
function canFight(grp){
  const ms = membersOf(grp); if (!ms.length || !sealsFull(grp)) return false;
  const { min } = sealLimits(ms.length);
  return ms.every(m => sealCount(grp, m.no) >= min);
}
const canEscape = grp => SUBJ_KEYS.every(s => subjHas(grp, s));
function phaseOf(g){
  const p = g.bossMax ? Math.max(0, g.bossHp) / g.bossMax : 1;
  return p > 0.7 ? 1 : p > 0.3 ? 2 : 3;
}
const bossDown = g => g.bossMax > 0 && g.bossHp <= 0;
const groupName = (cls, gi) => ((cls && cls.groupNames && cls.groupNames[gi]) || `${+gi + 1}모둠`);

/* 결말표 + 탈출 모둠 수에 따른 추가 멘트 */
function endingFor(g, grp, escapedCount){
  const win = bossDown(g), done = grp.done || 'none';
  const T = {
    fight:  win ? '용을 쓰러뜨린 영웅' : '용에게 깊은 상처를 낸 용사',
    escape: win ? '주민을 구하고 승리를 함께한 안내자' : '마을 사람들과 새 마을로 떠난 개척자',
    none:   win ? '연합군의 든든한 동료' : '다시 잠든 용, 다음 모험을 약속한 모험단'
  };
  let extra = '';
  if (escapedCount >= 3) {
    extra = done === 'escape'
      ? '무사히 빠져나왔지만, 뒤에서 들려오던 친구들의 함성이 귀에 남는다. 우리가 남아서 함께 싸웠다면 어땠을까?'
      : '많은 모둠이 떠난 전장에 남는 건 쉽지 않은 선택이었다. 결과와 상관없이, 끝까지 버틴 너희의 용기를 마을은 기억할 것이다.';
  } else if (escapedCount === 2 && win && done !== 'escape') {
    extra = '두 모둠이 마을 사람들을 데리고 떠난 뒤에도 너희는 끝까지 남았다. 용을 쓰러뜨린 마지막 힘은 바로 너희에게서 나왔다!';
  }
  return { title: T[done], extra, done };
}

/* 그림: img/ 폴더에 파일이 있으면 보이고, 없으면 조용히 빠짐 */
const art = (file, cls, alt) => `<img class="art ${cls || ''}" src="img/${file}" alt="${esc(alt || '')}" onerror="this.remove()">`;

const DRAGON_SVG = `<svg viewBox="0 0 200 140" class="dragon-fallback" aria-hidden="true"><path d="M20 110c20-6 34-20 44-38-14 4-26 2-36-6 18 0 30-6 40-18-12-2-20-8-24-18 16 6 30 6 42 0 10-18 28-26 48-22-6 4-8 10-6 16 14-2 26 4 34 14-10-2-18 0-24 6 8 10 10 22 6 34 10 4 18 12 22 24-12-6-24-6-34 0-6 14-20 24-38 26 4 6 4 12 0 18-8-8-20-12-34-10-14 2-28-2-40-12z" fill="currentColor"/><circle cx="130" cy="44" r="4" fill="var(--ember)"/></svg>`;

/* 반 목록 읽기 */
function listOf(obj){ return Object.entries(obj || {}).map(([id, v]) => ({ id, ...v })).sort((a, b) => (a.order || 0) - (b.order || 0)); }

/* 포효 결과 처리 — TV 화면과 교사 화면 중 먼저 본 쪽이 한 번만 처리 */
async function resolveRoar(cid, g, cls){
  const r = g && g.roar; if (!r || r.done) return;
  const groups = groupsOf(g, cls), total = groups.reduce((n, gr) => n + membersOf(gr).length, 0);
  const ans = r.ans || {}, answered = Object.keys(ans).length;
  if (now() < r.until && answered < total) return;
  if (!(await claim(`games/${cid}/locks/roar_${r.id}`))) return;
  const right = Object.values(ans).filter(v => v === 1).length;
  const rate = total ? right / total : 0, ok = rate >= 0.6;
  await ref(`games/${cid}/roar`).update({ done: true, doneAt: now(), ok, rate });
  if (ok) {
    ref(`games/${cid}/bossHp`).set(INC(-DMG.roar));
    ref(`games/${cid}/feed`).push({ t: now(), gi: -1, dmg: DMG.roar, text: '반 전체 반격!', big: 1 });
  } else {
    groups.forEach(gr => {
      if (!membersOf(gr).length) return;
      const p = `games/${cid}/groups/${GK(gr.gi)}`;
      ref(p + '/energy').transaction(cur => Math.max(0, (cur == null ? 5 : cur) - 1))
        .then(x => { if (x.committed && x.snapshot.val() === 0) ref(p + '/trapUntil').set(now() + MS_TRAP); });
    });
  }
}

/* 한 번만 처리되도록 잠금 (여러 태블릿이 동시에 같은 일을 하지 않게) */
function claim(leafPath){
  return D.ref(ROOT + '/' + leafPath).transaction(cur => cur ? undefined : now(), null, false)
    .then(r => r.committed).catch(() => false);
}
