/* ============================================================
   딱! 같은 그림 — 손맛 설정 (숫자만 바꿔서 조절)
   ============================================================ */

/* 재질: 누를 때 찌그러짐 · 떨림 · 날아가기 · 부딪힘 · 소리
   squash  누르는 순간 [가로, 세로] 비율 (1보다 멀수록 많이 찌그러짐)
   hold    꾹 누르고 있을 때 크기
   jitter  힘 모을 때 떨림 세기, jitterMs 떨림 빠르기(작을수록 빠름)
   spring  손 뗀 뒤 되돌아오는 [시간ms, 탄성 곡선]
   flight  날아가는 시간ms(기본), arc 위로 휘는 높이px, wave 좌우 살랑임px, spin 회전 각도
   trail   꼬리 점 크기, impact 부딪히는 세기, knock 가운데 카드가 밀리는 정도
   press / whoosh / hit  소리 [높이Hz, 파형, (크기), (끝 높이)] */
const MATERIALS = {
  heavy: { name: '무거움', squash: [1.12, .84], hold: .9, jitter: .8, jitterMs: 170, spring: [380, 'cubic-bezier(.3,1.4,.5,1)'], flight: 290, arc: 25, wave: 0, spin: 180, trail: 11, impact: 1.5, knock: 1.5, press: [220, 'sine'], whoosh: [120, 600], hit: [90, 'sine', .45, 40] },
  light: { name: '가벼움', squash: [1.38, .52], hold: .76, jitter: 2, jitterMs: 80, spring: [260, 'cubic-bezier(.3,2,.5,1)'], flight: 210, arc: 70, wave: 18, spin: 540, trail: 6, impact: .6, knock: .5, press: [900, 'sine'], whoosh: [700, 2600], hit: [1500, 'sine', .12, 1100] },
  jelly: { name: '말랑함', squash: [1.32, .6], hold: .8, jitter: 1.2, jitterMs: 120, spring: [540, 'cubic-bezier(.2,2.6,.4,1)'], flight: 250, arc: 50, wave: 0, spin: 360, trail: 9, impact: 1, knock: 1, press: [420, 'triangle'], whoosh: [250, 1400], hit: [200, 'sine', .28, 620] },
  hard: { name: '단단함', squash: [1.06, .92], hold: .93, jitter: .5, jitterMs: 90, spring: [140, 'cubic-bezier(.3,1.3,.5,1)'], flight: 230, arc: 35, wave: 0, spin: 360, trail: 8, impact: 1.2, knock: 1.1, press: [1100, 'square'], whoosh: [300, 1800], hit: [900, 'square', .1, 700] }
};

/* 게임 */
const GAME = {
  randomness: .1,        // 매번 조금씩 다르게 (±10%)
  flightMin: 190,        // 날아가는 시간 최소·최대 ms (재질·속도가 달라도 이 안에서)
  flightMax: 320,
  fastSec: .8,           // 새 카드가 나온 뒤 이 시간 안에 찾으면 가장 세게 + '빠르다!'
  wrongLockMs: 1000,     // 틀리면 내 카드가 잠기는 시간
  tapGapMs: 300,         // 한 번 날린 뒤 다음 누르기까지 최소 시간 (연속 터치 막기)
  newCardGuardMs: 250,   // 새 가운데 카드가 나온 직후 누르기를 받지 않는 시간 (앞 카드를 보고 누른 손가락 막기)
  buttonGuardMs: 600,    // 같은 버튼을 두 번 빨리 눌러도 한 번만
  autoFullscreen: true,  // 방 만들기·들어가기·시작할 때 전체화면으로
  countdown: 3,          // 시작 전 3, 2, 1
  lengths: [             // 방 만들 때 고르는 판 길이 (카드 장수, 0 = 세트 전체)
    { n: 15, name: '짧게' },
    { n: 25, name: '보통' },
    { n: 0, name: '길게' }
  ],
  colors: { a: '#E5484D', b: '#2F6FED' },   // 1번 자리·2번 자리 색
  names: { a: '빨강', b: '파랑' }            // 별명을 안 쓰면 보이는 이름
};

/* 콤보 불 (화면 테두리) */
const FIRE = {
  startCombo: 2,         // 몇 연속부터 불이 붙을지
  maxLevel: 7,           // 불이 커지는 최대 단계
  baseRate: 3,           // 한 화면마다 생기는 불꽃 수 (기본 + 단계마다)
  ratePerLevel: 4,
  baseHeight: 20,        // 불 높이 (기본 + 단계마다)
  heightPerLevel: 9,
  emberFrom: 3,          // 몇 단계부터 불티가 튀는지
  oppScale: .5           // 상대가 콤보 중일 때 위쪽 테두리에 비치는 불 크기 (0이면 끔)
};

/* 기기 성능 — 태블릿에서 끊기면 숫자를 줄이기 */
const QUALITY = {
  maxParticles: 650,     // 불꽃·파편 최대 개수
  pixelRatio: 1.5        // 효과 화면 선명도 (1이면 가장 가벼움)
};
