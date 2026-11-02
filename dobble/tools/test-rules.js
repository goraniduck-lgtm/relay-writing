/* 보안 규칙 시험 — node dobble/tools/test-rules.js (먼저 node mafia/tools/build-rules.js) */
'use strict';
const path = require('path');
const { FakeDb } = require('../../scanimation/tools/fake-rules.js');
const rules = require(path.join(__dirname, '..', '..', 'database.rules.json'));
const A = { uid: 'tabA' }, B = { uid: 'tabB' }, X = { uid: 'other' };
let pass = 0, failN = 0;
function check(name, fn, ok) { let r = true, err = ''; try { fn(); } catch (e) { r = false; err = e.message; } if (r === ok) pass++; else { failN++; console.log('✗', name, ok ? '(거절됨: ' + err + ')' : '(허용됨)'); } }
const allow = (n, f) => check(n, f, true), deny = (n, f) => check(n, f, false);
const db = new FakeDb(rules, {});
const R = 'dobble/rooms/';
const room = (uid, extra) => Object.assign({ ts: db.now, seats: { a: uid }, cfg: { set: 'basic', n: 25, seed: 123, st: 'wait' } }, extra || {});

deny('로그인 없이 방 만들기', () => db.set(null, R + '1234', room('tabA')));
deny('번호 세 자리 방', () => db.set(A, R + '123', room('tabA')));
deny('남의 이름으로 방 만들기', () => db.set(A, R + '1234', room('tabB')));
deny('처음부터 두 자리 다 채우기', () => db.set(A, R + '1234', room('tabA', { seats: { a: 'tabA', b: 'tabB' } })));
deny('처음부터 판 기록', () => db.set(A, R + '1234', room('tabA', { claims: { 0: 'a' } })));
deny('만든 시각이 서버 시각이 아님', () => db.set(A, R + '1234', room('tabA', { ts: 5 })));
deny('설정 빠진 방', () => db.set(A, R + '1234', { ts: db.now, seats: { a: 'tabA' } }));
allow('방 만들기 (별명 포함)', () => db.set(A, R + '1234', room('tabA', { names: { a: '번개손' } })));
deny('이미 있는 번호로 또 만들기', () => db.set(X, R + '1234', room('other')));
allow('누구나 방 읽기', () => db.read(X, R + '1234'));

deny('남을 2번 자리에 넣기', () => db.set(X, R + '1234/seats/b', 'tabB'));
allow('B가 2번 자리 들어가기', () => db.set(B, R + '1234/seats/b', 'tabB'));
deny('X가 2번 자리 빼앗기', () => db.set(X, R + '1234/seats/b', 'other'));
deny('X가 1번 자리 바꾸기', () => db.set(X, R + '1234/seats/a', 'other'));
deny('A가 1번 자리를 남에게', () => db.set(A, R + '1234/seats/a', 'other'));
deny('3번 자리 만들기', () => db.set(X, R + '1234/seats/c', 'other'));
allow('B 별명', () => db.set(B, R + '1234/names/b', '토끼'));
deny('B가 A 별명 바꾸기', () => db.set(B, R + '1234/names/a', '바보'));
deny('너무 긴 별명', () => db.set(B, R + '1234/names/b', '아주아주아주긴별명입니다'));
allow('B 접속 표시', () => db.set(B, R + '1234/on/b', true));
deny('B가 A 접속 표시', () => db.set(B, R + '1234/on/a', true));
allow('B 접속 표시 지우기', () => db.set(B, R + '1234/on/b', null));

deny('시작 전 판 가져가기', () => db.set(A, R + '1234/claims/0', 'a'));
deny('X가 시작', () => db.update(X, R + '1234/cfg', { st: 'play', go: db.now }));
deny('이상한 상태', () => db.update(B, R + '1234/cfg', { st: 'end' }));
deny('너무 먼 시작 시각', () => db.update(B, R + '1234/cfg', { st: 'play', go: db.now + 3600e3 }));
allow('B가 시작 (3초 뒤)', () => db.update(B, R + '1234/cfg', { st: 'play', go: db.now + 3600 }));
deny('카운트다운 중 판 가져가기', () => db.set(A, R + '1234/claims/0', 'a'));
db.now += 4000;
deny('X가 판 가져가기', () => db.set(X, R + '1234/claims/0', 'a'));
deny('A가 B 자리로 판 가져가기', () => db.set(A, R + '1234/claims/0', 'b'));
deny('이상한 자리 값', () => db.set(A, R + '1234/claims/0', 'c'));
deny('판 번호가 숫자 아님', () => db.set(A, R + '1234/claims/x', 'a'));
allow('A가 0번 판 가져가기', () => db.set(A, R + '1234/claims/0', 'a'));
deny('B가 같은 판 늦게 가져가기', () => db.set(B, R + '1234/claims/0', 'b'));
deny('A가 가진 판 바꾸기', () => db.set(A, R + '1234/claims/0', 'b'));
allow('B가 1번 판 가져가기', () => db.set(B, R + '1234/claims/1', 'b'));
deny('B가 A 판 지우기 (하나만)', () => db.set(B, R + '1234/claims/0', null));
deny('X가 판 기록 전체 지우기', () => db.set(X, R + '1234/claims', null));
allow('다시 하기: 판 기록 지우기', () => db.set(B, R + '1234/claims', null));
allow('다시 하기: 새 씨앗·시작 시각', () => db.update(A, R + '1234/cfg', { seed: 999, st: 'play', go: db.now + 3600 }));
deny('설정에 이상한 칸', () => db.update(A, R + '1234/cfg', { hack: 1 }));
deny('설정 통째로 지우기', () => db.set(A, R + '1234/cfg', null));
deny('방에 이상한 칸', () => db.set(A, R + '1234/x', 1));

deny('X가 방 지우기', () => db.set(X, R + '1234', null));
allow('B가 방 지우기', () => db.set(B, R + '1234', null));
allow('다시 방 만들기', () => db.set(A, R + '5678', room('tabA')));
deny('X가 새 방 지우기', () => db.set(X, R + '5678', null));
db.now += 13 * 3600e3;
allow('12시간 지난 방은 누구나 정리', () => db.set(X, R + '5678', null));
deny('다른 앱 데이터 쓰기 그대로 막힘', () => db.set(A, 'gusuk/cfg/lock', true));

console.log(`보안 규칙 시험: ${pass}개 통과, ${failN}개 실패`);
process.exit(failN ? 1 : 0);
