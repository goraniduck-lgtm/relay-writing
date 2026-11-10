/* ============================================================
   딱! 같은 그림 — 그림 세트 (과목별로 여기에 추가)
   ------------------------------------------------------------
   세트 하나 = { id, name, desc, show, symbols:[...] }
     id     : 영어·숫자로 된 이름 (다른 세트와 겹치지 않게)
     name   : 화면에 보이는 세트 이름
     show   : 'emoji' 그림만 / 'both' 그림 + 낱말 / 'word' 낱말만
     symbols: 그림 목록. 하나는 { e:'🍎', w:'사과', m:'heavy' }
       e   : 이모지 (없으면 낱말만 보임 · 태블릿이 그 이모지를 못 그리면 자동으로 낱말만 보임)
       w   : 낱말 (누를 때 아래에 '사과 · 무거움'처럼 보임)
       img : 그림 파일 주소 (예: 'img/sci-ecosystem/frog.png') — 넣으면 이모지 대신 그림이 보임
             · 정사각형 PNG, 배경 투명, 512×512 (256 이상이면 됨), 한 장 100KB 안쪽
             · 그림이 네모 칸을 거의 꽉 채우게 (여백 5% 정도), 그림 속 글자는 넣지 않기 (낱말은 w 로)
             · 파일은 dobble/img/{세트 id}/ 폴더에, 이름은 영어 소문자·숫자 (frog.png, tree2.png)
       m   : 손맛 재질 — heavy 무거움 / light 가벼움 / jelly 말랑함 / hard 단단함
             (빼면 낱말에 따라 자동으로 정해짐)

   그림 개수 → 카드 한 장의 그림 수 (도블 규칙: 어떤 두 카드든 같은 그림이 딱 하나)
     7개 → 3개씩 · 13개 → 4개씩 · 31개 → 6개씩 · 57개 → 8개씩
     개수가 이보다 많으면 남는 그림은 판마다 골고루 섞어서 씀
     (예: 20개를 넣으면 판마다 그중 13개를 골라 4개씩)
   ============================================================ */
const SETS = [
  {
    id: 'basic',
    name: '기본 그림',
    locked: true,          // 잠금: 방 만들기에서 고를 수 없음 (풀려면 이 줄을 지우기)
    desc: '그림 57개 · 카드 한 장에 8개',
    show: 'emoji',
    symbols: [
      { e: '⚓', w: '닻', m: 'heavy' }, { e: '🔔', w: '종', m: 'heavy' }, { e: '🍎', w: '사과', m: 'heavy' },
      { e: '🌙', w: '달', m: 'heavy' }, { e: '🐘', w: '코끼리', m: 'heavy' }, { e: '🚂', w: '기차', m: 'heavy' },
      { e: '🏠', w: '집', m: 'heavy' }, { e: '🎃', w: '호박', m: 'heavy' }, { e: '🍉', w: '수박', m: 'heavy' },
      { e: '🐳', w: '고래', m: 'heavy' }, { e: '🚗', w: '자동차', m: 'heavy' }, { e: '🐢', w: '거북', m: 'heavy' },
      { e: '🍔', w: '햄버거', m: 'heavy' }, { e: '🐻', w: '곰', m: 'heavy' },

      { e: '🍃', w: '나뭇잎', m: 'light' }, { e: '🎵', w: '음표', m: 'light' }, { e: '🔥', w: '불꽃', m: 'light' },
      { e: '🎈', w: '풍선', m: 'light' }, { e: '🦋', w: '나비', m: 'light' }, { e: '☁️', w: '구름', m: 'light' },
      { e: '🌸', w: '꽃', m: 'light' }, { e: '🐝', w: '벌', m: 'light' }, { e: '🐦', w: '새', m: 'light' },
      { e: '💧', w: '물방울', m: 'light' }, { e: '❄️', w: '눈송이', m: 'light' }, { e: '🎀', w: '리본', m: 'light' },
      { e: '🐞', w: '무당벌레', m: 'light' }, { e: '🌈', w: '무지개', m: 'light' },

      { e: '❤️', w: '하트', m: 'jelly' }, { e: '🐱', w: '고양이', m: 'jelly' }, { e: '🐟', w: '물고기', m: 'jelly' },
      { e: '☂️', w: '우산', m: 'jelly' }, { e: '🐶', w: '강아지', m: 'jelly' }, { e: '🐷', w: '돼지', m: 'jelly' },
      { e: '🐸', w: '개구리', m: 'jelly' }, { e: '🍦', w: '아이스크림', m: 'jelly' }, { e: '🍩', w: '도넛', m: 'jelly' },
      { e: '🐙', w: '문어', m: 'jelly' }, { e: '🐰', w: '토끼', m: 'jelly' }, { e: '🍓', w: '딸기', m: 'jelly' },
      { e: '🐧', w: '펭귄', m: 'jelly' }, { e: '🧀', w: '치즈', m: 'jelly' }, { e: '🐌', w: '달팽이', m: 'jelly' },

      { e: '⭐', w: '별', m: 'hard' }, { e: '🔑', w: '열쇠', m: 'hard' }, { e: '⚡', w: '번개', m: 'hard' },
      { e: '☀️', w: '해', m: 'hard' }, { e: '✏️', w: '연필', m: 'hard' }, { e: '⚽', w: '축구공', m: 'hard' },
      { e: '🎸', w: '기타', m: 'hard' }, { e: '💎', w: '보석', m: 'hard' }, { e: '🔨', w: '망치', m: 'hard' },
      { e: '⏰', w: '시계', m: 'hard' }, { e: '🚀', w: '로켓', m: 'hard' }, { e: '🌵', w: '선인장', m: 'hard' },
      { e: '🦖', w: '공룡', m: 'hard' }, { e: '✂️', w: '가위', m: 'hard' }
    ]
  },
  {
    id: 'sci-ecosystem',
    name: '과학 4-2 생태계',
    desc: '생산자 14 · 소비자 20 · 분해자 10 · 비생물 요소 13 · 카드 한 장에 8개',
    show: 'both',
    credit: '선생님이 ChatGPT(그림 생성)로 만든 그림',
    symbols: [
      /* 생산자 14 */
      { img: 'img/sci/sci-01.webp', w: '벼', m: 'light' }, { img: 'img/sci/sci-02.webp', w: '나무', m: 'heavy' }, { img: 'img/sci/sci-03.webp', w: '소나무', m: 'heavy' },
      { img: 'img/sci/sci-04.webp', w: '옥수수', m: 'heavy' }, { img: 'img/sci/sci-05.webp', w: '해바라기', m: 'light' }, { img: 'img/sci/sci-06.webp', w: '선인장', m: 'hard' },
      { img: 'img/sci/sci-07.webp', w: '단풍잎', m: 'light' }, { img: 'img/sci/sci-08.webp', w: '클로버', m: 'light' }, { img: 'img/sci/sci-09.webp', w: '새싹', m: 'light' },
      { img: 'img/sci/sci-10.webp', w: '풀', m: 'light' }, { img: 'img/sci/sci-11.webp', w: '이끼', m: 'jelly' }, { img: 'img/sci/sci-12.webp', w: '장미', m: 'hard' },
      { img: 'img/sci/sci-13.webp', w: '벚꽃', m: 'light' }, { img: 'img/sci/sci-14.webp', w: '수초', m: 'jelly' },
      /* 소비자 20 */
      { img: 'img/sci/sci-15.webp', w: '토끼', m: 'jelly' }, { img: 'img/sci/sci-16.webp', w: '메뚜기', m: 'light' }, { img: 'img/sci/sci-17.webp', w: '개구리', m: 'jelly' },
      { img: 'img/sci/sci-18.webp', w: '뱀', m: 'jelly' }, { img: 'img/sci/sci-19.webp', w: '매', m: 'light' }, { img: 'img/sci/sci-20.webp', w: '다람쥐', m: 'jelly' },
      { img: 'img/sci/sci-21.webp', w: '사슴', m: 'heavy' }, { img: 'img/sci/sci-22.webp', w: '여우', m: 'hard' }, { img: 'img/sci/sci-23.webp', w: '올빼미', m: 'hard' },
      { img: 'img/sci/sci-24.webp', w: '참새', m: 'light' }, { img: 'img/sci/sci-25.webp', w: '나비', m: 'light' }, { img: 'img/sci/sci-26.webp', w: '벌', m: 'light' },
      { img: 'img/sci/sci-27.webp', w: '무당벌레', m: 'light' }, { img: 'img/sci/sci-28.webp', w: '거미', m: 'hard' }, { img: 'img/sci/sci-29.webp', w: '개미', m: 'hard' },
      { img: 'img/sci/sci-30.webp', w: '물고기', m: 'jelly' }, { img: 'img/sci/sci-31.webp', w: '애벌레', m: 'jelly' }, { img: 'img/sci/sci-32.webp', w: '달팽이', m: 'jelly' },
      { img: 'img/sci/sci-33.webp', w: '거북', m: 'heavy' }, { img: 'img/sci/sci-34.webp', w: '잠자리', m: 'light' },
      /* 분해자 10 */
      { img: 'img/sci/sci-35.webp', w: '버섯', m: 'jelly' }, { img: 'img/sci/sci-36.webp', w: '표고버섯', m: 'jelly' }, { img: 'img/sci/sci-37.webp', w: '푸른곰팡이', m: 'jelly' },
      { img: 'img/sci/sci-38.webp', w: '빵곰팡이', m: 'jelly' }, { img: 'img/sci/sci-39.webp', w: '세균', m: 'light' }, { img: 'img/sci/sci-40.webp', w: '지렁이', m: 'jelly' },
      { img: 'img/sci/sci-41.webp', w: '노래기', m: 'hard' }, { img: 'img/sci/sci-42.webp', w: '쥐며느리', m: 'hard' }, { img: 'img/sci/sci-43.webp', w: '쇠똥구리', m: 'hard' },
      { img: 'img/sci/sci-44.webp', w: '송장벌레', m: 'hard' },
      /* 비생물 요소 13 */
      { img: 'img/sci/sci-45.webp', w: '햇빛', m: 'hard' }, { img: 'img/sci/sci-46.webp', w: '물', m: 'jelly' }, { img: 'img/sci/sci-47.webp', w: '공기', m: 'light' },
      { img: 'img/sci/sci-48.webp', w: '흙', m: 'heavy' }, { img: 'img/sci/sci-49.webp', w: '돌', m: 'heavy' }, { img: 'img/sci/sci-50.webp', w: '온도', m: 'hard' },
      { img: 'img/sci/sci-51.webp', w: '비', m: 'jelly' }, { img: 'img/sci/sci-52.webp', w: '눈', m: 'light' }, { img: 'img/sci/sci-53.webp', w: '구름', m: 'light' },
      { img: 'img/sci/sci-54.webp', w: '모래', m: 'light' }, { img: 'img/sci/sci-55.webp', w: '얼음', m: 'hard' }, { img: 'img/sci/sci-56.webp', w: '바닷물', m: 'jelly' },
      { img: 'img/sci/sci-57.webp', w: '바람', m: 'light' }
    ]
  }
];
