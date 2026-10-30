/* 움직이는 그림 공방(스캐니메이션) — 학생·교사 화면이 함께 쓰는 코드
   데이터: Firebase 프로젝트 relay-writing-4415e 의 scanimation/ 아래
     scanimation/subs/{반}/{제출}   제출 정보 {uid, no, name, title, n, gap, dpi, bytes, parts, ts, done, th:[장면 미리보기]}
     scanimation/files/{제출}       A5 PDF (base64 조각) {uid, cid, p:{0:'..',1:'..'}}
   반 목록·명단은 다른 앱과 같은 classList/, classes/{반}/roster 를 읽기만 함 */
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
const TEACHER_EMAIL = 'goraniduck@gmail.com';
const TEACHER_UID = 'VNW0t5e67CfInsF63jATWdBsaqG2';
const CHUNK = 500000;          // PDF 조각 크기(base64 글자 수)
const MAX_PARTS = 40;          // 한 작품 최대 약 15MB

/* Firebase 연결 — 처음 쓸 때 연결 (인터넷이 없어도 그리기는 됨). 시험 때는 window.__FAKE_DB__ */
const DB = (function () {
  if (window.__FAKE_DB__) return window.__FAKE_DB__;
  let db = null, auth = null, authWait = null;
  function init() {
    if (db) return;
    if (!window.firebase) throw new Error('offline');
    if (!firebase.apps.length) firebase.initializeApp(FB_CONFIG);
    db = firebase.database(); auth = firebase.auth();
  }
  function waitAuth() {
    init();
    if (!authWait) authWait = new Promise(res => { const off = auth.onAuthStateChanged(u => { off(); res(u); }); });
    return authWait;
  }
  const ref = p => (init(), p ? db.ref(p) : db.ref());
  return {
    async ready(anon) {
      const u = await waitAuth();
      if (u || !anon) return u;
      return (await auth.signInAnonymously()).user;
    },
    uid: () => (auth && auth.currentUser ? auth.currentUser.uid : null),
    isTeacher: () => !!(auth && auth.currentUser && auth.currentUser.uid === TEACHER_UID),
    async teacherLogin(pw) {
      init();
      await auth.signInWithEmailAndPassword(TEACHER_EMAIL, pw);
      if (auth.currentUser.uid !== TEACHER_UID) { await auth.signOut(); throw new Error('not teacher'); }
      return auth.currentUser;
    },
    logout: () => (init(), auth.signOut()),
    on(path, cb, err) {
      const r = ref(path);
      const h = r.on('value', s => cb(s.val()), e => (err ? err(e) : console.warn(path, e)));
      return () => r.off('value', h);
    },
    get: path => ref(path).get().then(s => s.val()),
    set: (path, v) => ref(path).set(v),
    update: (path, obj) => ref(path).update(obj),
    key: () => ref('scanimation').push().key,
    TS: () => firebase.database.ServerValue.TIMESTAMP
  };
})();

const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
};
const byName = (a, b) => String(a.name).localeCompare(String(b.name), 'ko', { numeric: true });
const rosterOf = c => (c && c.roster ? (Array.isArray(c.roster) ? c.roster : Object.values(c.roster)) : [])
  .filter(x => x && x.no != null).sort((a, b) => a.no - b.no);
const isPerm = e => /permission/i.test(String(e && (e.code || e.message)));
