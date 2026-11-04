/* 구석구석 다 함께 찾아요 — 학생·교사·TV·인쇄 화면이 함께 쓰는 코드
   데이터: Firebase 프로젝트 relay-writing-4415e 의 gusuk/ 아래 (구조는 tools/rules.js 맨 위 설명) */
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
/* 교사 계정 — 처음 PIN을 정할 때만 씀. 비밀번호는 코드에 없고 Firebase 서버가 확인함 */
const TEACHER_EMAIL = 'goraniduck@gmail.com';
const TEACHER_UID = 'VNW0t5e67CfInsF63jATWdBsaqG2';
const ROOT = 'gusuk';

/* ---------- 데이터베이스 연결 (시험 때는 window.__FAKE_DB__ 사용) ---------- */
const DB = window.__FAKE_DB__ || (function () {
  firebase.initializeApp(FB_CONFIG);
  const db = firebase.database();
  const auth = firebase.auth();
  let authWait = null;
  function waitAuth() {
    if (!authWait) authWait = new Promise(res => { const off = auth.onAuthStateChanged(u => { off(); res(u); }); });
    return authWait;
  }
  const ref = p => db.ref(p);
  return {
    async ready() {
      const u = await waitAuth();
      if (u) return u;
      return (await auth.signInAnonymously()).user;
    },
    uid: () => auth.currentUser ? auth.currentUser.uid : null,
    isTeacherAccount: () => !!auth.currentUser && auth.currentUser.uid === TEACHER_UID,
    async teacherLogin(pw) {
      await auth.signInWithEmailAndPassword(TEACHER_EMAIL, pw);
      if (auth.currentUser.uid !== TEACHER_UID) { await auth.signOut(); throw new Error('not teacher'); }
      return auth.currentUser;
    },
    on(path, cb, err) {
      const r = ref(path);
      const h = r.on('value', s => cb(s.val()), e => { if (err) err(e); else console.warn(path, e); });
      return () => r.off('value', h);
    },
    get: path => ref(path).get().then(s => s.val()),
    set: (path, v) => ref(path).set(v),
    update: (path, obj) => ref(path).update(obj),
    remove: path => ref(path).remove(),
    key: () => db.ref().push().key,
    connected(cb) { db.ref('.info/connected').on('value', s => cb(!!s.val())); },
    TS: firebase.database.ServerValue.TIMESTAMP
  };
})();

/* ---------- 공통 도구 ---------- */
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const ls = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  del(k) { try { localStorage.removeItem(k); } catch (e) {} }
};
function toast(msg, kind) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); }
  t.textContent = msg; t.hidden = false; t.dataset.kind = kind || '';
  clearTimeout(toast._t); toast._t = setTimeout(() => { t.hidden = true; }, 2800);
}
const failMsg = e => /permission/i.test(String(e && (e.code || e.message))) ? '지금은 할 수 없어요 (권한 없음)' : '저장하지 못했어요. 인터넷 연결을 확인해 주세요.';
const fail = msg => e => { console.warn(e); toast(msg || failMsg(e), 'err'); };
const studentUrl = () => new URL('./', location.href).href;

/* ---------- 모둠·분류 ---------- */
const GROUPS = {
  0: { name: '선생님', c: '#6B7280', ink: '#fff' },
  1: { name: '1모둠', c: '#E5484D', ink: '#fff' },
  2: { name: '2모둠', c: '#F07A1F', ink: '#fff' },
  3: { name: '3모둠', c: '#F2C12E', ink: '#3a2c00' },
  4: { name: '4모둠', c: '#2F9E5B', ink: '#fff' },
  5: { name: '5모둠', c: '#1D7FE0', ink: '#fff' },
  6: { name: '6모둠', c: '#8B4FC8', ink: '#fff' }
};
const GNUMS = [1, 2, 3, 4, 5, 6];
const CATS = {
  fest: { name: '축제', icon: '🎉', c: '#C2410C', ex: ['예: 강릉단오제', '예: 단오 풍습과 전통 놀이를 알려요'] },
  prod: { name: '특산물', icon: '🍎', c: '#15803D', ex: ['예: 이천 쌀', '예: 기름진 땅에서 나는 맛있는 쌀을 알려요'] },
  pride: { name: '자랑거리', icon: '🏯', c: '#1D4ED8', ex: ['예: 수원 화성', '예: 정조 때 쌓은 성의 역사를 알려요'] },
  sym: { name: '상징', icon: '🧸', c: '#9333EA', ex: ['예: 오기동이', '예: 울릉도 특산물인 오징어를 알려요'] }
};
const CAT_KEYS = Object.keys(CATS);
const METHODS = [['fest', '축제 열기'], ['web', '누리집'], ['book', '관광 안내 책자'], ['shop', '특산물 판매장'], ['char', '캐릭터·상징'], ['sns', '영상·SNS'], ['etc', '기타']];
const TRAITS = [['nat', '자연환경'], ['prod', '생산물'], ['hist', '역사'], ['cult', '문화']];
const SOURCES = [['gs', '대한민국 구석구석'], ['web', '지역 문화 관광 누리집'], ['book', '관광 안내 책자'], ['etc', '기타']];
const STATUS = { rv: '검토 중', fix: '수정 요청', ok: '확인 완료' };
const FIX_REASONS = ['출처를 적어 주세요', '내 말로 다시 써 주세요', '카테고리를 확인해 주세요', '이름을 정확하게 써 주세요'];
const LIMIT = { n: 20, w: 80, h: 40, url: 300, memo: 60 };
const lab = (list, code) => (list.find(x => x[0] === code) || [code, code])[1];
const codes = s => String(s || '').split(',').filter(Boolean);
const labs = (list, s) => codes(s).map(c => lab(list, c)).join(', ');

/* ---------- 지자체 목록 ---------- */
const METRO = ['11', '26', '27', '28', '30', '31'];
const GJ_GU = ['12210', '12240', '12270', '12300', '12330'];   // 옛 광주광역시 자치구
const SIDO_BY = {}; SIDO.forEach(s => { SIDO_BY[s.s] = s; });
const REG = {};
const DUP_NAMES = (() => { const c = {}; REGIONS.forEach(r => { c[r.n] = (c[r.n] || 0) + 1; }); return c; })();
REGIONS.forEach(r => {
  const sd = SIDO_BY[r.s];
  let label = r.n;
  if (r.s === '36') label = '세종특별자치시';
  else if (GJ_GU.includes(r.k)) label = '광주 ' + r.n;
  else if (METRO.includes(r.s) || DUP_NAMES[r.n] > 1) label = sd.sh + ' ' + r.n;
  REG[r.k] = Object.assign({}, r, { sido: sd, label, full: r.s === '36' ? sd.sn : sd.sn + ' ' + r.n });
});
SIDO.forEach(s => {   // 시·도 전체로 등록하는 자리
  REG['S' + s.s] = { k: 'S' + s.s, n: s.sn, s: s.s, sido: s, label: s.sh + ' 전체', full: s.sn + ' 전체', l: s.l, b: s.b, whole: true };
});
const regLabel = k => (REG[k] ? REG[k].label : '알 수 없는 지역');
const regFull = k => (REG[k] ? REG[k].full : '알 수 없는 지역');
const regionsOf = s => REGIONS.filter(r => r.s === s).map(r => REG[r.k]);

/* 초성 검색 */
const CHO = 'ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ';
const cho = s => [...s].map(ch => { const c = ch.charCodeAt(0) - 0xAC00; return c >= 0 && c < 11172 ? CHO[Math.floor(c / 588)] : ch; }).join('');
const isCho = s => /^[ㄱ-ㅎ]+$/.test(s);
const SEARCH = Object.values(REG).map(r => {
  const keys = new Set([r.n, r.label, r.full, r.sido.sh + r.n, r.sido.sn + r.n].map(x => x.replace(/\s/g, '')));
  if (!r.whole) { const base = r.n.replace(/(시|군|구)$/, ''); if (base.length >= 2) keys.add(base); }
  if (r.whole) { keys.add(r.sido.sh); keys.add(r.sido.sn); keys.add(r.sido.sh + '전체'); }
  if (GJ_GU.includes(r.k)) keys.add('광주' + r.n);
  return { r, keys: [...keys], chos: [...keys].map(cho) };
});
function searchRegions(q, max) {
  q = String(q || '').replace(/\s/g, '');
  if (!q) return [];
  const ch = isCho(q);
  const out = [];
  for (const it of SEARCH) {
    const arr = ch ? it.chos : it.keys;
    let score = -1;
    for (const k of arr) {
      if (k === q) { score = Math.max(score, 3); }
      else if (k.startsWith(q)) score = Math.max(score, 2);
      else if (k.includes(q)) score = Math.max(score, 1);
    }
    if (score >= 0) out.push([score - (it.r.whole ? 0.5 : 0), it.r]);
  }
  out.sort((a, b) => b[0] - a[0] || a[1].label.length - b[1].label.length);
  return out.slice(0, max || 12).map(x => x[1]);
}

/* ---------- 자료 찾기 링크 ---------- */
const searchWord = k => { const r = REG[k]; if (!r) return ''; return r.whole ? r.sido.sn : r.label; };
const LINKS = {
  gs: k => 'https://korean.visitkorea.or.kr/search/search_list.do?keyword=' + encodeURIComponent(searchWord(k)),
  web: k => 'https://search.naver.com/search.naver?query=' + encodeURIComponent(searchWord(k) + ' 문화관광'),
  cat: (k, c) => 'https://search.naver.com/search.naver?query=' + encodeURIComponent(searchWord(k) + ' ' + ({ fest: '축제', prod: '특산물', pride: '관광지', sym: '캐릭터' }[c] || ''))
};
const GS_HOME = 'https://korean.visitkorea.or.kr/';
const isOfficial = url => /^https?:\/\/([^/]+\.)?(go\.kr|visitkorea\.or\.kr|or\.kr)(\/|$)/i.test(String(url || ''));

/* ---------- 지도에 칠하기 ---------- */
function visibleCards(cards, cfg) {
  const okOnly = cfg && cfg.paint === 'ok';
  return Object.entries(cards || {}).map(([id, c]) => Object.assign({ id }, c))
    .filter(c => c && c.r && REG[c.r] && (!okOnly || c.st === 'ok'))
    .sort((a, b) => (a.ts || 0) - (b.ts || 0));
}
/* 지역마다 처음 등록한 모둠(first), 가장 많이 등록한 모둠(most), 참여한 모둠들(등록 순), 모둠별 장수(cnt)
   가장 많이 등록한 모둠이 여럿이면 먼저 등록한 모둠 → 처음 등록한 모둠이 그중에 있으면 first === most (한 색) */
function paintInfo(list) {
  const info = {};
  for (const c of list) {
    const p = info[c.r] || (info[c.r] = { first: c.g, groups: [], cnt: {}, n: 0 });
    if (!p.groups.includes(c.g)) p.groups.push(c.g);
    p.cnt[c.g] = (p.cnt[c.g] || 0) + 1;
    p.n++;
  }
  for (const p of Object.values(info)) p.most = p.groups.reduce((a, b) => (p.cnt[b] > p.cnt[a] ? b : a), p.groups[0]);
  return info;
}
/* 반씩 칠한 두 모둠을 뺀 나머지 모둠 (점으로 표시) */
const restGroups = x => x.groups.filter(g => g !== x.first && g !== x.most);
/* 채운 시·도 (시·도 안 어느 곳이든 카드가 있으면) */
function filledSido(info) {
  const set = new Set();
  Object.keys(info).forEach(k => { if (REG[k]) set.add(REG[k].s); });
  return set;
}
const allCards = cards => Object.entries(cards || {}).map(([id, c]) => Object.assign({ id }, c)).filter(c => c && REG[c.r]).sort((a, b) => (a.ts || 0) - (b.ts || 0));
const normName = s => String(s || '').replace(/[\s·.,~\-()]/g, '').toLowerCase();

/* 목표 막대 HTML */
function goalHtml(info) {
  const f = filledSido(info).size, total = SIDO.length;
  const pct = Math.round(f / total * 100);
  return `<div class="goal" title="우리 반 목표"><span class="goal-t">우리 반 목표 · ${total}개 시·도 모두 채우기</span><span class="goal-bar"><i style="width:${pct}%"></i></span><b>${f}/${total}</b>${f >= total ? '<span class="goal-done">달성!</span>' : ''}</div>`;
}
const groupDot = g => `<span class="gdot g${g}" style="--gc:${GROUPS[g] ? GROUPS[g].c : '#999'}">${g || '선'}</span>`;
const catTag = c => CATS[c] ? `<span class="ctag" style="--cc:${CATS[c].c}">${CATS[c].icon} ${CATS[c].name}</span>` : '';
const stTag = st => `<span class="stag st-${esc(st)}">${esc(STATUS[st] || st)}</span>`;
function fmtTime(ts) { if (!ts) return ''; const d = new Date(ts); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }

/* QR (vendor/qrcode.js) */
function qrSvg(text, cell) {
  if (typeof qrcode !== 'function') return '';
  const q = qrcode(0, 'M'); q.addData(text); q.make();
  return q.createSvgTag(cell || 4, 2);
}

/* ---------- 창(시트) ---------- */
function openSheet(html, opt) {
  const bg = document.createElement('div');
  bg.className = 'sheet-bg';
  bg.innerHTML = `<div class="sheet" role="dialog" aria-modal="true"${opt && opt.wide ? ' style="width:min(980px,100%)"' : ''}>${html}</div>`;
  document.body.appendChild(bg);
  const close = () => { bg.remove(); document.removeEventListener('keydown', key); if (opt && opt.onClose) opt.onClose(); };
  const key = e => { if (e.key === 'Escape' && !(opt && opt.noEsc)) close(); };
  document.addEventListener('keydown', key);
  if (!(opt && opt.noBgClose)) bg.addEventListener('click', e => { if (e.target === bg) close(); });
  bg.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', close));
  return { el: bg.querySelector('.sheet'), close };
}
/* 예/아니오 묻기 → Promise<boolean> */
function ask(title, msg, yes, no, danger) {
  return new Promise(res => {
    let done = false;
    const s = openSheet(`<header><h2>${esc(title)}</h2></header><div class="body"><div style="font-size:16px;line-height:1.6">${msg}</div></div>
      <footer><button class="btn" data-a="0">${esc(no || '취소')}</button><button class="btn ${danger ? 'danger' : 'primary'}" data-a="1">${esc(yes || '확인')}</button></footer>`,
      { onClose: () => { if (!done) res(false); } });
    s.el.querySelectorAll('[data-a]').forEach(b => b.addEventListener('click', () => { done = true; res(b.dataset.a === '1'); s.close(); }));
  });
}
/* 8자리 PIN 입력 → Promise<string|null> */
function pinSheet(title, sub) {
  return new Promise(res => {
    let pin = '', done = false;
    const s = openSheet(`<header><h2>${esc(title)}</h2><button class="btn small" data-close>닫기</button></header>
      <div class="body"><div class="pinpad"><p class="muted" style="margin:0;text-align:center">${sub || '선생님 PIN 8자리를 눌러 주세요'}</p>
      <div class="pinshow">${'<i></i>'.repeat(8)}</div>
      <div class="keys">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button type="button" data-n="${n}">${n}</button>`).join('')}<button type="button" data-n="c" style="font-size:16px">지우기</button><button type="button" data-n="0">0</button><button type="button" data-n="b" style="font-size:18px">⌫</button></div></div></div>`,
      { onClose: () => { if (!done) res(null); } });
    const show = () => s.el.querySelectorAll('.pinshow i').forEach((i, k) => i.classList.toggle('on', k < pin.length));
    const press = n => {
      if (n === 'c') pin = ''; else if (n === 'b') pin = pin.slice(0, -1); else if (pin.length < 8) pin += n;
      show();
      if (pin.length === 8) { done = true; setTimeout(() => { s.close(); res(pin); }, 120); }
    };
    s.el.querySelectorAll('[data-n]').forEach(b => b.addEventListener('click', () => press(b.dataset.n)));
    const kd = e => { if (/^[0-9]$/.test(e.key)) press(e.key); else if (e.key === 'Backspace') press('b'); };
    document.addEventListener('keydown', kd);
    const oldClose = s.close; s.close = () => { document.removeEventListener('keydown', kd); oldClose(); };
  });
}
/* PIN 확인: 이 기기를 잠시 관리자로 등록해 봄 (틀리면 서버가 거절) */
async function pinLogin(pin) {
  const uid = DB.uid();
  try { await DB.set(`${ROOT}/adm/${uid}`, pin); return true; } catch (e) { return false; }
}
const pinLogout = () => DB.remove(`${ROOT}/adm/${DB.uid()}`).catch(() => {});
