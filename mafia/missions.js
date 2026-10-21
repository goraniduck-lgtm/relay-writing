/* 교실 마피아 — 미션 목록
   ※ 시험 운영용 임시 목록입니다. 문구만 고쳐도 바로 반영됩니다.
   공통 미션 tags: 미션의 성격 (비밀 미션과 어울림을 맞출 때 사용)
   비밀 미션 lv: 1 쉬움 · 2 보통 · 3 어려움
   비밀 미션 fit: 어울리는 공통 미션 tags ('*'는 어디에나 어울림) */
(function (root) {
  const COMMON = [
    { id: 'c1',  text: '앉아서 스트레칭하기 (팔 쭉 뻗기, 옆구리 늘이기)', tags: ['stretch'] },
    { id: 'c2',  text: '친구 3명에게 칭찬 한마디씩 하기', tags: ['talk'] },
    { id: 'c3',  text: '사회자 동작 따라 하기 (박수 두 번, 어깨 두드리기, 만세)', tags: ['move'] },
    { id: 'c4',  text: '둘러앉은 친구들과 눈 맞추며 인사하기', tags: ['talk'] },
    { id: 'c5',  text: '양옆 친구와 가위바위보 3판 하기', tags: ['hands', 'talk'] },
    { id: 'c6',  text: '박수 리듬 따라 하기 (쿵 짝짝, 쿵 짝짝)', tags: ['hands', 'move'] },
    { id: 'c7',  text: '바른 자세로 앉아 천천히 깊게 숨쉬기 5번', tags: ['calm'] },
    { id: 'c8',  text: '내 의자 주변 정리하고 바르게 앉기', tags: ['tidy'] },
    { id: 'c9',  text: '어깨·목 풀기 체조 (어깨 돌리기, 목 천천히 돌리기)', tags: ['stretch'] },
    { id: 'c10', text: '좋아하는 음식을 옆 친구에게 말하기', tags: ['talk'] },
    { id: 'c11', text: '손가락 체조 (손가락 하나씩 접었다 펴기)', tags: ['hands'] },
    { id: 'c12', text: '양옆 친구와 하이파이브 하고 "반가워" 말하기', tags: ['move', 'talk'] }
  ];

  const SECRET = [
    { id: 's1',  text: '머리 두 번 만지기', lv: 1, fit: ['stretch', 'calm', 'talk', 'tidy'] },
    { id: 's2',  text: '팔짱 끼기', lv: 1, fit: ['talk', 'calm'] },
    { id: 's3',  text: '소매 걷기', lv: 1, fit: ['*'] },
    { id: 's4',  text: '손목 만지기', lv: 1, fit: ['hands', 'stretch', 'calm'] },
    { id: 's5',  text: '앉은 자세 한 번 바꾸기', lv: 1, fit: ['calm', 'talk', 'tidy'] },
    { id: 's6',  text: '다리 꼬기', lv: 1, fit: ['talk', 'calm', 'hands'] },
    { id: 's7',  text: '고개 세 번 끄덕이기', lv: 1, fit: ['talk', 'move'] },
    { id: 's8',  text: '귀 한 번 만지기', lv: 1, fit: ['stretch', 'talk'] },
    { id: 's9',  text: '코 세 번 만지기', lv: 2, fit: ['talk', 'calm', 'hands'] },
    { id: 's10', text: '양팔을 엇갈려 반대쪽 어깨 잡기', lv: 2, fit: ['stretch', 'move'] },
    { id: 's11', text: '무릎 두 번 두드리기', lv: 2, fit: ['hands', 'move', 'calm'] },
    { id: 's12', text: '어깨 두 번 으쓱하기', lv: 2, fit: ['stretch', 'talk'] },
    { id: 's13', text: '턱 괴기 두 번', lv: 2, fit: ['talk', 'calm'] },
    { id: 's14', text: '깍지 끼고 앞으로 쭉 뻗기', lv: 2, fit: ['stretch', 'hands'] },
    { id: 's15', text: '머리 만지고 → 귀 만지기를 차례로 두 번', lv: 3, fit: ['stretch', 'talk'] },
    { id: 's16', text: '하품하는 척 한 번 하고 기지개 켜기', lv: 3, fit: ['stretch', 'calm'] },
    { id: 's17', text: '손가락으로 무릎을 톡톡톡 세 번, 이걸 두 번', lv: 3, fit: ['hands', 'calm', 'talk'] },
    { id: 's18', text: '눈을 크게 세 번 깜빡이기', lv: 3, fit: ['*'] }
  ];

  const DIFF = {
    easy: { name: '쉬움', lv: [1] },
    mid:  { name: '보통', lv: [2] },
    hard: { name: '어려움', lv: [3] },
    mix:  { name: '쉬움+보통 섞기', lv: [1, 2] },
    all:  { name: '전체 섞기', lv: [1, 2, 3] }
  };
  const LV_NAME = { 1: '쉬움', 2: '보통', 3: '어려움' };

  const api = { COMMON, SECRET, DIFF, LV_NAME };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.MISSIONS = api;
})(typeof window !== 'undefined' ? window : globalThis);
