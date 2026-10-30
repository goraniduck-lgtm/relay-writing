/* 보안 규칙 시험 — node scanimation/tools/test-rules.js (먼저 node mafia/tools/build-rules.js) */
'use strict';
const path = require('path');
const { FakeDb } = require('./fake-rules.js');
const rules = require(path.join(__dirname, '..', '..', 'database.rules.json'));

const T = { uid: 'VNW0t5e67CfInsF63jATWdBsaqG2' }, A = { uid: 'stuA' }, B = { uid: 'stuB' };
const init = { classList: { c1: { name: '4-1', count: 2 } }, classes: { c1: { name: '4-1', roster: [{ no: 1, name: '가' }, { no: 2, name: '나' }] } } };
let pass = 0, failN = 0;
function check(name, fn, expectOk) {
  let ok = true, err = '';
  try { fn(); } catch (e) { ok = false; err = e.message; }
  if (ok === expectOk) pass++; else { failN++; console.log('✗', name, expectOk ? '(거절됨: ' + err + ')' : '(허용됨)'); }
}
const allow = (n, f) => check(n, f, true), deny = (n, f) => check(n, f, false);

const db = new FakeDb(rules, init);
const meta = (uid, extra) => ({ uid, no: 1, name: '가', title: '새', n: 6, gap: '0.5', dpi: 300, bytes: 1000, parts: 2, ts: db.now, done: false, th: ['data:image/jpeg;base64,AAA'], ...extra });
const S = 'scanimation/subs/c1/', F = 'scanimation/files/';

/* 학생 제출 흐름 */
deny('없는 반에 제출', () => db.set(A, 'scanimation/subs/zz/s0', meta('stuA')));
deny('남의 uid로 제출', () => db.set(A, S + 's1', meta('stuB')));
deny('done:true로 바로 제출', () => db.set(A, S + 's1', meta('stuA', { done: true })));
deny('서버 시각이 아닌 ts', () => db.set(A, S + 's1', meta('stuA', { ts: 5 })));
deny('알 수 없는 칸', () => db.set(A, S + 's1', meta('stuA', { hack: 1 })));
deny('너무 긴 이름', () => db.set(A, S + 's1', meta('stuA', { name: 'x'.repeat(21) })));
deny('조각 수 초과', () => db.set(A, S + 's1', meta('stuA', { parts: 41 })));
deny('미리보기 형식 틀림', () => db.set(A, S + 's1', meta('stuA', { th: ['javascript:x'] })));
deny('미리보기 9장', () => db.set(A, S + 's1', meta('stuA', { th: Array(9).fill('data:image/jpeg;base64,A') })));
deny('로그인 없이 제출', () => db.set(null, S + 's1', meta('stuA')));
allow('정상 제출 만들기', () => db.set(A, S + 's1', meta('stuA')));
deny('같은 제출 덮어쓰기', () => db.set(A, S + 's1', meta('stuA', { title: '바꿈' })));
deny('다른 학생이 덮어쓰기', () => db.set(B, S + 's1', meta('stuB')));
allow('자기 제출 읽기', () => db.read(A, S + 's1'));
deny('남의 제출 읽기', () => db.read(B, S + 's1'));
deny('반 전체 목록 읽기(학생)', () => db.read(A, 'scanimation/subs/c1'));

deny('남이 PDF 조각 올리기', () => db.set(B, F + 's1', { uid: 'stuB', cid: 'c1', p: { 0: 'AAAA' } }));
deny('uid를 속여 PDF 올리기', () => db.set(B, F + 's1', { uid: 'stuA', cid: 'c1', p: { 0: 'AAAA' } }));
deny('제출 없이 PDF 올리기', () => db.set(A, F + 'zz', { uid: 'stuA', cid: 'c1', p: { 0: 'AAAA' } }));
deny('조각이 너무 큼', () => db.set(A, F + 's1', { uid: 'stuA', cid: 'c1', p: { 0: 'A'.repeat(500001) } }));
allow('첫 조각 올리기', () => db.set(A, F + 's1', { uid: 'stuA', cid: 'c1', p: { 0: 'AAAA' } }));
deny('파일 통째로 다시 쓰기', () => db.set(A, F + 's1', { uid: 'stuA', cid: 'c1', p: { 0: 'BBBB' } }));
deny('남이 다음 조각 올리기', () => db.set(B, F + 's1/p/1', 'BBBB'));
deny('이미 올린 조각 고치기', () => db.set(A, F + 's1/p/0', 'CCCC'));
deny('조각 번호 이상함', () => db.set(A, F + 's1/p/x', 'BBBB'));
allow('다음 조각 올리기', () => db.set(A, F + 's1/p/1', 'BBBB'));
deny('학생이 PDF 읽기', () => db.read(A, F + 's1'));
deny('남이 done 바꾸기', () => db.set(B, S + 's1/done', true));
deny('학생이 다른 칸 고치기', () => db.set(A, S + 's1/title', '바꿈'));
allow('done 표시', () => db.set(A, S + 's1/done', true));
deny('done 뒤 조각 추가', () => db.set(A, F + 's1/p/2', 'DDDD'));
deny('done 되돌리기', () => db.set(A, S + 's1/done', false));
deny('학생이 지우기', () => db.set(A, S + 's1', null));
deny('학생이 파일 지우기', () => db.set(A, F + 's1', null));

/* 교사 */
allow('교사가 반 목록 읽기', () => db.read(T, 'scanimation/subs/c1'));
allow('교사가 PDF 읽기', () => db.read(T, F + 's1'));
allow('교사가 지우기(여러 곳 한꺼번에)', () => db.update(T, 'scanimation', { 'subs/c1/s1': null, 'files/s1': null }));
if (db.read(T, 'scanimation') !== null) { failN++; console.log('✗ 지운 뒤 남은 자료'); } else pass++;

/* 기존 앱 규칙은 그대로 */
allow('학생이 반 목록 읽기', () => db.read(A, 'classList'));
allow('학생이 명단 읽기', () => db.read(A, 'classes/c1'));
deny('학생이 명단 고치기', () => db.set(A, 'classes/c1/name', 'x'));

console.log(`보안 규칙 시험: ${pass}개 통과, ${failN}개 실패`);
process.exit(failN ? 1 : 0);
