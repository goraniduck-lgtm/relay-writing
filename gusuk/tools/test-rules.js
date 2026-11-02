/* 보안 규칙 시험 — node gusuk/tools/test-rules.js (먼저 node mafia/tools/build-rules.js) */
'use strict';
const path = require('path');
const { FakeDb } = require('../../scanimation/tools/fake-rules.js');
const rules = require(path.join(__dirname, '..', '..', 'database.rules.json'));
const T = { uid: 'VNW0t5e67CfInsF63jATWdBsaqG2' }, A = { uid: 'stuA' }, B = { uid: 'stuB' }, P = { uid: 'pinT' }, X = { uid: 'stranger' };
let pass = 0, failN = 0;
function check(name, fn, ok) { let r = true, err = ''; try { fn(); } catch (e) { r = false; err = e.message; } if (r === ok) pass++; else { failN++; console.log('✗', name, ok ? '(거절됨: ' + err + ')' : '(허용됨)'); } }
const allow = (n, f) => check(n, f, true), deny = (n, f) => check(n, f, false);
const db = new FakeDb(rules, { gusuk: { cfg: { home: '41590', paint: 'all' } } });
const G = 'gusuk/';
const card = (g, uid, extra) => Object.assign({ g, r: '51150', c: 'fest', n: '강릉단오제', w: '단오 풍습을 알려요', m: 'fest,web', src: 'gs', st: 'rv', ts: db.now, u: uid }, extra || {});

/* PIN */
deny('학생이 PIN 처음 만들기', () => db.set(A, G + 'secret/pin', '11112222'));
deny('교사 계정도 8자리 아닌 PIN', () => db.set(T, G + 'secret/pin', '1234'));
allow('교사 계정이 PIN 만들기', () => db.set(T, G + 'secret/pin', '12345678'));
deny('학생이 PIN 읽기', () => db.read(A, G + 'secret/pin'));
deny('틀린 PIN 으로 관리자 되기', () => db.set(P, G + 'adm/pinT', '00000000'));
deny('남의 adm 칸 쓰기', () => db.set(P, G + 'adm/stuA', '12345678'));
allow('맞는 PIN 으로 관리자 되기', () => db.set(P, G + 'adm/pinT', '12345678'));
allow('관리자 확인 ping', () => db.set(P, G + 'ping/pinT', db.now));
deny('학생 ping', () => db.set(A, G + 'ping/stuA', db.now));
allow('PIN 기기가 설정 바꾸기', () => db.set(P, G + 'cfg/paint', 'ok'));
deny('학생이 설정 바꾸기', () => db.set(A, G + 'cfg/lock', true));
deny('이상한 설정 값', () => db.set(P, G + 'cfg/paint', 'x'));
allow('설정 다시', () => db.set(P, G + 'cfg/paint', 'all'));

/* 모둠 */
deny('모둠 7', () => db.set(A, G + 'dev/stuA', 7));
allow('학생 A 2모둠 고르기', () => db.set(A, G + 'dev/stuA', 2));
allow('학생 B 3모둠 고르기', () => db.set(B, G + 'dev/stuB', 3));
deny('학생 A 모둠 바꾸기 (PIN 없이)', () => db.set(A, G + 'dev/stuA', 4));
deny('남의 기기 모둠 쓰기', () => db.set(A, G + 'dev/stuB', 2));
allow('관리자가 모둠 바꾸기', () => db.set(P, G + 'dev/stuA', 2));

/* 카드 만들기 */
deny('모둠 없는 기기 카드', () => db.set(X, G + 'cards/x0', card(1, 'stranger')));
deny('다른 모둠 이름으로 카드', () => db.set(A, G + 'cards/c1', card(3, 'stuA')));
deny('처음부터 확인 완료', () => db.set(A, G + 'cards/c1', card(2, 'stuA', { st: 'ok' })));
deny('서버 시각 아님', () => db.set(A, G + 'cards/c1', card(2, 'stuA', { ts: 5 })));
deny('선생님 메모 넣기', () => db.set(A, G + 'cards/c1', card(2, 'stuA', { memo: '가짜' })));
deny('알 수 없는 칸', () => db.set(A, G + 'cards/c1', card(2, 'stuA', { hack: 1 })));
deny('이름 21자', () => db.set(A, G + 'cards/c1', card(2, 'stuA', { n: 'ㄱ'.repeat(21) })));
deny('내용 81자', () => db.set(A, G + 'cards/c1', card(2, 'stuA', { w: 'ㄱ'.repeat(81) })));
deny('없는 분류', () => db.set(A, G + 'cards/c1', card(2, 'stuA', { c: 'food' })));
deny('주소가 javascript:', () => db.set(A, G + 'cards/c1', card(2, 'stuA', { url: 'javascript:alert(1)' })));
deny('이름 빠짐', () => db.set(A, G + 'cards/c1', (() => { const o = card(2, 'stuA'); delete o.n; return o; })()));
allow('학생 A 카드 만들기', () => db.set(A, G + 'cards/c1', card(2, 'stuA', { url: 'https://www.gn.go.kr/tour', t: 'cult', h: '드라마로 소개' })));
allow('학생 B 카드 만들기', () => db.set(B, G + 'cards/c2', card(3, 'stuB')));
deny('남의 카드 덮어쓰기(새 카드인 척)', () => db.set(A, G + 'cards/c2', card(2, 'stuA')));
deny('학생이 카드 지우기', () => db.set(A, G + 'cards/c1', null));
deny('학생이 스스로 확인 완료', () => db.update(A, G + 'cards/c1', { st: 'ok' }));
deny('학생이 휴지통 읽기', () => db.read(A, G + 'trash'));
allow('학생이 카드 읽기', () => db.read(A, G + 'cards'));

/* 고치기 */
const cur = id => db.read(T, G + 'cards/' + id);
allow('관리자 수정 요청', () => db.update(P, G + 'cards/c1', { st: 'fix', memo: '출처를 적어 주세요' }));
deny('고칠 때 메모 지우기', () => { const o = cur('c1'); delete o.memo; db.set(A, G + 'cards/c1', Object.assign(o, { st: 'rv', up: db.now, n: '강릉 단오제' })); });
deny('고칠 때 시각 바꾸기', () => db.set(A, G + 'cards/c1', Object.assign(cur('c1'), { st: 'rv', up: db.now, ts: 1 })));
deny('다른 모둠이 고치기', () => db.set(B, G + 'cards/c1', Object.assign(cur('c1'), { st: 'rv', up: db.now })));
allow('학생 A 고쳐서 다시 올리기', () => db.set(A, G + 'cards/c1', Object.assign(cur('c1'), { st: 'rv', up: db.now, fx: true, n: '강릉단오제(단오)' })));
allow('관리자 확인 완료', () => db.update(P, G + 'cards/c1', { st: 'ok' }));
deny('확인 완료 카드를 학생이 고치기', () => db.set(A, G + 'cards/c1', Object.assign(cur('c1'), { st: 'rv', up: db.now, w: '바꿈' })));

/* 잠금 */
allow('관리자 잠금', () => db.set(P, G + 'cfg/lock', true));
deny('잠긴 동안 카드 만들기', () => db.set(A, G + 'cards/c3', card(2, 'stuA', { c: 'prod', n: '감자' })));
allow('잠금 풀기', () => db.set(P, G + 'cfg/lock', false));
allow('잠금 풀린 뒤 카드 만들기', () => db.set(A, G + 'cards/c3', card(2, 'stuA', { c: 'prod', n: '감자' })));

/* 휴지통·예시 */
allow('관리자 지우기(휴지통으로)', () => { const o = cur('c3'); db.update(P, 'gusuk', { 'cards/c3': null, 'trash/c3': Object.assign(o, { del: db.now }) }); });
allow('관리자 예시 카드 (선생님)', () => db.set(P, G + 'cards/c9', { g: 0, r: '43110', c: 'pride', n: '초정 행궁', w: '세종 대왕', m: 'web', src: 'web', st: 'ok', ts: db.now, tch: true }));
deny('학생이 선생님 카드 만들기', () => db.set(A, G + 'cards/c8', card(0, 'stuA')));
allow('관리자 모둠 초기화', () => db.set(P, G + 'dev', null));
allow('PIN 기기 나가기', () => db.set(P, G + 'adm/pinT', null));
deny('나간 뒤 설정 바꾸기', () => db.set(P, G + 'cfg/lock', true));
allow('교사 계정은 PIN 없이 관리자', () => db.set(T, G + 'cfg/lock', false));
/* 다른 앱에 영향 없음 */
deny('학생이 다른 앱 경로 쓰기', () => db.set(A, 'classes/c1/name', 'x'));

console.log(`${pass} 통과, ${failN} 실패`);
process.exit(failN ? 1 : 0);
