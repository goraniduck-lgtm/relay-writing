/* ============================================================
   딱! 같은 그림 — 사회 '우리 지역 알리기' 세트 (지자체 캐릭터)
   ------------------------------------------------------------
   - 그림: dobble/img/region/ (공공누리 1~4유형 · 출처 표시, 원본 그대로 크기만 줄임)
   - src 칸의 출처는 '출처 모음' 화면(sources.html)에 그대로 나옴
   - intact: 그림을 찌그러뜨리거나 색을 바꾸지 않음 (3·4유형 '변경 금지' 지키기)
   - 지금 49개 → 판마다 그중 31개를 골라 카드 한 장에 6개씩 (57개가 되면 8개씩)
   - 아래 HOLD 8개는 엑셀에 '이용허락 미확인 · 담당부서 확인 필요'로 적혀 있어 아직 넣지 않음
     (확인되면 그림을 img/region/ 에 넣고 위 목록처럼 한 줄씩 추가)
   ============================================================ */
SETS.push({
  id: 'soc-region',
  name: '사회 · 우리 지역 알리기',
  desc: '지자체 캐릭터 49개 · 카드 한 장에 6개 · 출처는 처음 화면 \'출처 모음\'',
  show: 'both',
  intact: true,
  symbols: [
   {
    "img": "img/region/region-01.webp",
    "w": "가평군",
    "m": "jelly",
    "note": "갓평이 · 가평 잣",
    "src": {
     "org": "가평군",
     "char": "갓평이",
     "feat": "가평 잣",
     "cat": "특산물·먹거리",
     "kogl": 4,
     "title": "갓평이 & 송송이",
     "kind": "공식 다운로드 파일 전체",
     "page": "https://gp.go.kr/portal/contents.do?key=2422",
     "file": "https://gp.go.kr/site/portal/download/2024/cts2422_file01.zip",
     "extra": "https://gp.go.kr/portal/contents.do?key=2421",
     "conv": "그림·배경·문구·여백 전체 보존 / 비율 유지 크기조정 460×460 / PNG 무손실 저장 / 바깥 정사각 여백 추가 / 앱용: 바깥 여백만 잘라 냄, 비율 유지 384px 이하로 크기 조정, 무손실 WebP",
     "date": "2026-11-03"
    }
   },
   {
    "img": "img/region/region-02.webp",
    "w": "강진군",
    "m": "hard",
    "note": "강도령·진낭자 · 청자·모란",
    "src": {
     "org": "강진군",
     "char": "강도령·진낭자",
     "feat": "청자·모란",
     "cat": "역사·문화·건축",
     "kogl": 1,
     "title": "",
     "kind": "기관 제공 공공누리 공개 미리보기(로그인 원본 아님)",
     "page": "https://www.kogl.or.kr/recommend/recommendDivView.do?division=img&recommendIdx=50624",
     "file": "https://www.kogl.or.kr/upload_recommend/thumb_V/키워드 저작물/전라남도 강진군/이미지/thum_1683549926613.jpg",
     "extra": "",
     "conv": "외부 단색 배경 투명화·캡션 영역 제외(해당시)·비율유지 크기맞춤·정사각 여백 / 앱용: 바깥 여백만 잘라 냄, 비율 유지 384px 이하로 크기 조정, 무손실 WebP",
     "date": "2026-11-03"
    }
   },
   {
    "img": "img/region/region-03.webp",
    "w": "거창군",
    "m": "jelly",
    "note": "사각이·거복이 · 거창 사과·거북이",
    "src": {
     "org": "거창군",
     "char": "사각이·거복이",
     "feat": "거창 사과·거북이",
     "cat": "특산물·먹거리",
     "kogl": 4,
     "title": "",
     "kind": "공식 사이트 공개 미리보기 전체(고해상도 다운로드 원본 아님)",
     "page": "https://www.kogl.or.kr/recommend/recommendDivView.do?division=img&recommendIdx=145111",
     "file": "https://www.kogl.or.kr/upload_recommend/이미지/캐릭터,로고/캐릭터,로고/거창 캐릭터(사각이, 거복이)_thumnailList_7747.png",
     "extra": "",
     "conv": "전체 사각 프레임 비율 유지 축소(460×259)·PNG lossless·512 정사각 바깥 여백 추가 / 앱용: 바깥 여백만 잘라 냄, 비율 유지 384px 이하로 크기 조정, 무손실 WebP",
     "date": "2026-11-03"
    }
   },
   {
    "img": "img/region/region-04.webp",
    "w": "경주시",
    "m": "hard",
    "note": "관이·금이와 친구들 · 신라 역사·문화",
    "src": {
     "org": "경주시",
     "char": "관이·금이와 친구들",
     "feat": "신라 역사·문화",
     "cat": "역사·문화·건축",
     "kogl": 3,
     "title": "",
     "kind": "공식 사이트 공개 미리보기 전체(고해상도 다운로드 원본 아님)",
     "page": "https://www.kogl.or.kr/recommend/recommendDivView.do?division=img&recommendIdx=142521",
     "file": "https://www.kogl.or.kr/upload_recommend/이미지/캐릭터,로고/캐릭터,로고/13_thumnailList_5280.jpg",
     "extra": "",
     "conv": "전체 사각 프레임 비율 유지 축소(215×300)·전체 이미지 추가 축소 + PNG 무손실 압축·512 정사각 바깥 여백 추가 / 앱용: 바깥 여백만 잘라 냄, 비율 유지 384px 이하로 크기 조정, 무손실 WebP",
     "date": "2026-11-03"
    }
   },
   {
    "img": "img/region/region-05.webp",
    "w": "공주시",
    "m": "hard",
    "note": "고마곰과 공주 · 곰나루 전설·백제문화",
    "src": {
     "org": "공주시",
     "char": "고마곰과 공주",
     "feat": "곰나루 전설·백제문화",
     "cat": "역사·문화·건축",
     "kogl": 3,
     "title": "공주시 마스코트_고마곰과 공주_기본형",
     "kind": "공공누리 공식 공개 표시 이미지 전체(로그인 고해상도 원본 아님)",
     "page": "https://www.kogl.or.kr/recommend/recommendDivView.do?division=img&recommendIdx=50603",
     "file": "https://www.kogl.or.kr/upload_recommend/thumb_V/키워드 저작물/충청남도 공주시/이미지/thum_1682051237295.jpg",
     "extra": "",
     "conv": "그림·배경·문구·여백 전체 보존 / 비율 유지 크기조정 380×239 / PNG 무손실 저장 / 바깥 정사각 여백 추가 / 앱용: 바깥 여백만 잘라 냄, 비율 유지 384px 이하로 크기 조정, 무손실 WebP",
     "date": "2026-11-03"
    }
   },
   {
    "img": "img/region/region-06.webp",
    "w": "금산군",
    "m": "jelly",
    "note": "삼삼이 · 금산 인삼",
    "src": {
     "org": "금산군",
     "char": "삼삼이",
     "feat": "금산 인삼",
     "cat": "특산물·먹거리",
     "kogl": 1,
     "title": "금산캐릭터_삼삼이",
     "kind": "공공누리 공식 공개 표시 이미지 전체(로그인 고해상도 원본 아님)",
     "page": "https://www.kogl.or.kr/recommend/recommendDivView.do?division=img&recommendIdx=54796",
     "file": "https://www.kogl.or.kr/upload_recommend/2023New/충청남도 금산군/썸내일목록/삼삼이_thumnailList.jpg",
     "extra": "",
     "conv": "그림·배경·문구·여백 전체 보존 / 비율 유지 크기조정 325×460 / PNG 무손실 저장 / 바깥 정사각 여백 추가 / 앱용: 바깥 여백만 잘라 냄, 비율 유지 384px 이하로 크기 조정, 무손실 WebP",
     "date": "2026-11-03"
    }
   },
   {
    "img": "img/region/region-07.webp",
    "w": "김포시",
    "m": "jelly",
    "note": "포수·포미 · 물·운하와 김포금쌀",
    "src": {
     "org": "김포시",
     "char": "포수·포미",
     "feat": "물·운하와 김포금쌀",
     "cat": "특산물·먹거리",
     "kogl": 3,
     "title": "",
     "kind": "공식 사이트 공개 미리보기 전체(고해상도 다운로드 원본 아님)",
     "page": "https://www.kogl.or.kr/recommend/recommendDivView.do?division=img&recommendIdx=50602",
     "file": "https://www.kogl.or.kr/upload_recommend/thumb_V/키워드 저작물/경기도 김포시/이미지/thum_1682051014306.jpg",
     "extra": "",
     "conv": "전체 사각 프레임 비율 유지 축소(460×272)·PNG lossless·512 정사각 바깥 여백 추가 / 앱용: 바깥 여백만 잘라 냄, 비율 유지 384px 이하로 크기 조정, 무손실 WebP",
     "date": "2026-11-03"
    }
   },
   {
    "img": "img/region/region-08.webp",
    "w": "김해시",
    "m": "hard",
    "note": "토더기 · 오리 모양 토기",
    "src": {
     "org": "김해시",
     "char": "토더기",
     "feat": "오리 모양 토기",
     "cat": "역사·문화·건축",
     "kogl": 4,
     "title": "",
     "kind": "공식 사이트 공개 미리보기 전체(고해상도 다운로드 원본 아님)",
     "page": "https://www.kogl.or.kr/recommend/recommendDivView.do?division=img&recommendIdx=84411",
     "file": "https://www.kogl.or.kr/upload_recommend/키워드 저작물/경상남도 김해시/이미지/토더기 기본자세_thumnailList_1795.png",
     "extra": "",
     "conv": "전체 사각 프레임 비율 유지 축소(460×460)·PNG lossless·512 정사각 바깥 여백 추가 / 앱용: 바깥 여백만 잘라 냄, 비율 유지 384px 이하로 크기 조정, 무손실 WebP",
     "date": "2026-11-03"
    }
   },
   {
    "img": "img/region/region-09.webp",
    "w": "대구 달성군",
    "m": "light",
    "note": "비슬이 · 비슬산 참꽃",
    "src": {
     "org": "대구광역시 달성군",
     "char": "비슬이",
     "feat": "비슬산 참꽃",
     "cat": "자연·생태·산업",
     "kogl": 4,
     "title": "달성군 캐릭터(비슬이)",
     "kind": "공공누리 공식 공개 표시 이미지 전체(로그인 고해상도 원본 아님)",
     "page": "https://www.kogl.or.kr/recommend/recommendDivView.do?division=img&recommendIdx=170924",
     "file": "https://www.kogl.or.kr/upload_recommend/이미지/캐릭터,로고/캐릭터,로고/3-1. 비슬이 기본형_thumnailList_9438.png",
     "extra": "",
     "conv": "그림·배경·문구·여백 전체 보존 / 비율 유지 크기조정 307×340 / PNG 무손실 저장 / 바깥 정사각 여백 추가 / 앱용: 바깥 여백만 잘라 냄, 비율 유지 384px 이하로 크기 조정, 무손실 WebP",
     "date": "2026-11-03"
    }
   },
   {
    "img": "img/region/region-10.webp",
    "w": "대구 서구",
    "m": "hard",
    "note": "도약이·미래 · 지역의 발전과 미래",
    "src": {
     "org": "대구광역시 서구",
     "char": "도약이·미래",
     "feat": "지역의 발전과 미래",
     "cat": "역사·문화·건축",
     "kogl": 4,
     "title": "",
     "kind": "공식 사이트 공개 미리보기 전체(고해상도 다운로드 원본 아님)",
     "page": "https://www.kogl.or.kr/recommend/recommendDivView.do?division=img&recommendIdx=53889",
     "file": "https://www.kogl.or.kr/upload_recommend/thumb_V/키워드 저작물/대구광역시 서구/이미지/thum_1684910469336.jpg",
     "extra": "",
     "conv": "전체 사각 프레임 비율 유지 축소(420×203)·전체 이미지 추가 축소 + PNG 무손실 압축·512 정사각 바깥 여백 추가 / 앱용: 바깥 여백만 잘라 냄, 비율 유지 384px 이하로 크기 조정, 무손실 WebP",
     "date": "2026-11-03"
    }
   },
   {
    "img": "img/region/region-11.webp",
    "w": "무안군",
    "m": "jelly",
    "note": "무아니 · 무안 양파",
    "src": {
     "org": "무안군",
     "char": "무아니",
     "feat": "무안 양파",
     "cat": "특산물·먹거리",
     "kogl": 4,
     "title": "무안군 캐릭터",
     "kind": "공공누리 공식 공개 표시 이미지 전체(로그인 고해상도 원본 아님)",
     "page": "https://www.kogl.or.kr/recommend/recommendDivView.do?division=img&recommendIdx=59843",
     "file": "https://www.kogl.or.kr/upload_recommend/키워드 저작물/전라남도 무안군/이미지/무아니09_thumnailList_135.png",
     "extra": "",
     "conv": "그림·배경·문구·여백 전체 보존 / 비율 유지 크기조정 238×360 / PNG 무손실 저장 / 바깥 정사각 여백 추가 / 앱용: 바깥 여백만 잘라 냄, 비율 유지 384px 이하로 크기 조정, 무손실 WebP",
     "date": "2026-11-03"
    }
   },
   {
    "img": "img/region/region-12.webp",
    "w": "보성군",
    "m": "jelly",
    "note": "녹차몬(BS삼총사) · 보성 녹차",
    "src": {
     "org": "보성군",
     "char": "녹차몬(BS삼총사)",
     "feat": "보성 녹차",
     "cat": "특산물·먹거리",
     "kogl": 4,
     "title": "SNS 캐릭터 녹차몬의 기본형, 엄지척, 피켓형의 모습을 보여주고 있고 캐릭터의 모습은 찻잎을 모티브로 하여 초록색이 주를 이루는 캐릭터이다",
     "kind": "공식 다운로드 파일 전체",
     "page": "https://www.boseong.go.kr/www/introduce/intro/represent/sns_character",
     "file": "https://www.boseong.go.kr/contents/24308/SNS_character.zip",
     "extra": "",
     "conv": "그림·배경·문구·여백 전체 보존 / 비율 유지 크기조정 371×440 / PNG 무손실 저장 / 바깥 정사각 여백 추가 / 앱용: 바깥 여백만 잘라 냄, 비율 유지 384px 이하로 크기 조정, 무손실 WebP",
     "date": "2026-11-03"
    }
   },
   {
    "img": "img/region/region-13.webp",
    "w": "보은군",
    "m": "jelly",
    "note": "대추씨 · 보은 대추",
    "src": {
     "org": "보은군",
     "char": "대추씨",
     "feat": "보은 대추",
     "cat": "특산물·먹거리",
     "kogl": 1,
     "title": "",
     "kind": "기관 제공 공공누리 공개 미리보기(로그인 원본 아님)",
     "page": "https://www.kogl.or.kr/recommend/recommendDivView.do?division=img&recommendIdx=59350",
     "file": "https://www.kogl.or.kr/upload_recommend/thumb_V/키워드 저작물/충청북도 보은군/이미지/thum_1692162246964.jpg",
     "extra": "",
     "conv": "외부 단색 배경 투명화·캡션 영역 제외(해당시)·비율유지 크기맞춤·정사각 여백 / 앱용: 바깥 여백만 잘라 냄, 비율 유지 384px 이하로 크기 조정, 무손실 WebP",
     "date": "2026-11-03"
    }
   },
   {
    "img": "img/region/region-14.webp",
    "w": "봉화군",
    "m": "jelly",
    "note": "솔봉이·솔향이 · 송이버섯·춘양목",
    "src": {
     "org": "봉화군",
     "char": "솔봉이·솔향이",
     "feat": "송이버섯·춘양목",
     "cat": "특산물·먹거리",
     "kogl": 4,
     "title": "",
     "kind": "공식 사이트 공개 미리보기 전체(고해상도 다운로드 원본 아님)",
     "page": "https://www.kogl.or.kr/recommend/recommendDivView.do?division=img&recommendIdx=170948",
     "file": "https://www.kogl.or.kr/upload_recommend/이미지/캐릭터,로고/캐릭터,로고/솔봉이와 솔향이(캐릭터)_thumnailList_9462.png",
     "extra": "",
     "conv": "전체 사각 프레임 비율 유지 축소(400×188)·전체 이미지 추가 축소 + PNG 무손실 압축·512 정사각 바깥 여백 추가 / 앱용: 바깥 여백만 잘라 냄, 비율 유지 384px 이하로 크기 조정, 무손실 WebP",
     "date": "2026-11-03"
    }
   },
   {
    "img": "img/region/region-15.webp",
    "w": "부산 기장군",
    "m": "jelly",
    "note": "기장프렌즈 · 기장 먹거리·관광",
    "src": {
     "org": "부산광역시 기장군",
     "char": "기장프렌즈",
     "feat": "기장 먹거리·관광",
     "cat": "특산물·먹거리",
     "kogl": 2,
     "title": "",
     "kind": "기관 제공 공공누리 공개 미리보기(로그인 원본 아님)",
     "page": "https://www.kogl.or.kr/recommend/recommendDivView.do?division=img&recommendIdx=176477",
     "file": "",
     "extra": "",
     "conv": "외부 단색 배경 투명화·캡션 영역 제외(해당시)·비율유지 크기맞춤·정사각 여백 / 앱용: 바깥 여백만 잘라 냄, 비율 유지 384px 이하로 크기 조정, 무손실 WebP",
     "date": "2026-11-03"
    }
   },
   {
    "img": "img/region/region-16.webp",
    "w": "부산 동래구",
    "m": "hard",
    "note": "뚜미(뚜기·뚜미 계열) · 동래의 전통문화",
    "src": {
     "org": "부산광역시 동래구",
     "char": "뚜미(뚜기·뚜미 계열)",
     "feat": "동래의 전통문화",
     "cat": "역사·문화·건축",
     "kogl": 2,
     "title": "",
     "kind": "기관 제공 공공누리 공개 미리보기(로그인 원본 아님)",
     "page": "https://www.kogl.or.kr/recommend/recommendDivView.do?division=img&recommendIdx=143552",
     "file": "",
     "extra": "",
     "conv": "외부 단색 배경 투명화·캡션 영역 제외(해당시)·비율유지 크기맞춤·정사각 여백 / 앱용: 바깥 여백만 잘라 냄, 비율 유지 384px 이하로 크기 조정, 무손실 WebP",
     "date": "2026-11-03"
    }
   },
   {
    "img": "img/region/region-17.webp",
    "w": "부산 사하구",
    "m": "light",
    "note": "고우니 · 을숙도 고니·철새 생태",
    "src": {
     "org": "부산광역시 사하구",
     "char": "고우니",
     "feat": "을숙도 고니·철새 생태",
     "cat": "자연·생태·산업",
     "kogl": 3,
     "title": "고우니 캐릭터 기본형 흑백반전",
     "kind": "공공누리 공식 공개 표시 이미지 전체(로그인 고해상도 원본 아님)",
     "page": "https://www.kogl.or.kr/recommend/recommendDivView.do?division=img&recommendIdx=60323",
     "file": "https://www.kogl.or.kr/upload_recommend/키워드 저작물/부산광역시 사하구/이미지/03.original_b2_thumnailList_7157.jpg",
     "extra": "",
     "conv": "그림·배경·문구·여백 전체 보존 / 비율 유지 크기조정 460×412 / PNG 무손실 저장 / 바깥 정사각 여백 추가 / 앱용: 바깥 여백만 잘라 냄, 비율 유지 384px 이하로 크기 조정, 무손실 WebP",
     "date": "2026-11-03"
    }
   },
   {
    "img": "img/region/region-18.webp",
    "w": "부산 수영구",
    "m": "hard",
    "note": "모리 · 광안리와 광안대교",
    "src": {
     "org": "부산광역시 수영구",
     "char": "모리",
     "feat": "광안리와 광안대교",
     "cat": "역사·문화·건축",
     "kogl": 4,
     "title": "",
     "kind": "공식 사이트 공개 미리보기 전체(고해상도 다운로드 원본 아님)",
     "page": "https://www.kogl.or.kr/recommend/recommendDivView.do?division=img&recommendIdx=59824",
     "file": "https://www.kogl.or.kr/upload_recommend/thumb_V/키워드 저작물/부산광역시 수영구/이미지/thum_1698889630139.png",
     "extra": "",
     "conv": "전체 사각 프레임 비율 유지 축소(383×460)·PNG lossless·512 정사각 바깥 여백 추가 / 앱용: 바깥 여백만 잘라 냄, 비율 유지 384px 이하로 크기 조정, 무손실 WebP",
     "date": "2026-11-03"
    }
   },
   {
    "img": "img/region/region-19.webp",
    "w": "부산 영도구",
    "m": "light",
    "note": "영독·영도롱이 · 영도의 섬 관광",
    "src": {
     "org": "부산광역시 영도구",
     "char": "영독·영도롱이",
     "feat": "영도의 섬 관광",
     "cat": "자연·생태·산업",
     "kogl": 4,
     "title": "영도구 관광캐릭터 '영독&영도롱이' 이모티콘(여행)",
     "kind": "공공누리 공식 공개 표시 이미지 전체(로그인 고해상도 원본 아님)",
     "page": "https://www.kogl.or.kr/recommend/recommendDivView.do?division=img&recommendIdx=87922",
     "file": "https://www.kogl.or.kr/upload_recommend/이미지/캐릭터,로고/캐릭터,로고/14여행_thumnailList_135.gif",
     "extra": "",
     "conv": "그림·배경·문구·여백 전체 보존 / 비율 유지 크기조정 300×300 / PNG 무손실 저장 / 바깥 정사각 여백 추가 / 앱용: 바깥 여백만 잘라 냄, 비율 유지 384px 이하로 크기 조정, 무손실 WebP",
     "date": "2026-11-03"
    }
   },
   {
    "img": "img/region/region-20.webp",
    "w": "사천시",
    "m": "light",
    "note": "또아 · 사천 우주항공 산업",
    "src": {
     "org": "사천시",
     "char": "또아",
     "feat": "사천 우주항공 산업",
     "cat": "자연·생태·산업",
     "kogl": 3,
     "title": "관광캐릭터(또아)",
     "kind": "공공누리 공식 공개 표시 이미지 전체(로그인 고해상도 원본 아님)",
     "page": "https://www.kogl.or.kr/recommend/recommendDivView.do?division=img&recommendIdx=144509",
     "file": "https://www.kogl.or.kr/upload_recommend/이미지/캐릭터,로고/캐릭터,로고/또아00_thumnailList_6823.jpg",
     "extra": "",
     "conv": "그림·배경·문구·여백 전체 보존 / 비율 유지 크기조정 460×127 / PNG 무손실 저장 / 바깥 정사각 여백 추가 / 앱용: 바깥 여백만 잘라 냄, 비율 유지 384px 이하로 크기 조정, 무손실 WebP",
     "date": "2026-11-03"
    }
   },
   {
    "img": "img/region/region-21.webp",
    "w": "상주시",
    "m": "jelly",
    "note": "감돌이·감순이 · 상주 곶감",
    "src": {
     "org": "상주시",
     "char": "감돌이·감순이",
     "feat": "상주 곶감",
     "cat": "특산물·먹거리",
     "kogl": 1,
     "title": "상주시캐릭터(감돌이와 감순이)\n\n              ",
     "kind": "지자체 공식 소개 페이지 공개 표시 이미지 전체",
     "page": "https://www.sangju.go.kr/page/10063/10422.tc",
     "file": "https://www.sangju.go.kr/resources/templates/front/assets/images/subpage/sub3_24_1.png",
     "extra": "",
     "conv": "그림·배경·문구·여백 전체 보존 / 비율 유지 크기조정 460×126 / PNG 무손실 저장 / 바깥 정사각 여백 추가 / 앱용: 바깥 여백만 잘라 냄, 비율 유지 384px 이하로 크기 조정, 무손실 WebP",
     "date": "2026-11-03"
    }
   },
   {
    "img": "img/region/region-22.webp",
    "w": "서산시",
    "m": "hard",
    "note": "가티·오슈 · 서산 관광 캐릭터",
    "src": {
     "org": "서산시",
     "char": "가티·오슈",
     "feat": "서산 관광 캐릭터",
     "cat": "역사·문화·건축",
     "kogl": 2,
     "title": "",
     "kind": "기관 제공 공공누리 공개 미리보기(로그인 원본 아님)",
     "page": "https://www.kogl.or.kr/recommend/recommendDivView.do?division=img&recommendIdx=85540",
     "file": "https://www.kogl.or.kr/upload_recommend/이미지/캐릭터,로고/캐릭터,로고/가티오슈_thumnailList_2868.gif",
     "extra": "",
     "conv": "외부 단색 배경 투명화·캡션 영역 제외(해당시)·비율유지 크기맞춤·정사각 여백 / 앱용: 바깥 여백만 잘라 냄, 비율 유지 384px 이하로 크기 조정, 무손실 WebP",
     "date": "2026-11-03"
    }
   },
   {
    "img": "img/region/region-23.webp",
    "w": "서울 관악구",
    "m": "hard",
    "note": "강감찬 · 낙성대·강감찬 장군",
    "src": {
     "org": "서울특별시 관악구",
     "char": "강감찬",
     "feat": "낙성대·강감찬 장군",
     "cat": "역사·문화·건축",
     "kogl": 4,
     "title": "",
     "kind": "공식 사이트 공개 미리보기 전체(고해상도 다운로드 원본 아님)",
     "page": "https://www.kogl.or.kr/recommend/recommendDivView.do?division=img&recommendIdx=59832",
     "file": "https://www.kogl.or.kr/upload_recommend/키워드 저작물/서울특별시 관악구/이미지/charater_1_thumnailList_4088.png",
     "extra": "",
     "conv": "전체 사각 프레임 비율 유지 축소(235×280)·전체 이미지 추가 축소 + PNG 무손실 압축·512 정사각 바깥 여백 추가 / 앱용: 바깥 여백만 잘라 냄, 비율 유지 384px 이하로 크기 조정, 무손실 WebP",
     "date": "2026-11-03"
    }
   },
   {
    "img": "img/region/region-24.webp",
    "w": "서울 동대문구",
    "m": "hard",
    "note": "디디미 · 흥인지문 처마",
    "src": {
     "org": "서울특별시 동대문구",
     "char": "디디미",
     "feat": "흥인지문 처마",
     "cat": "역사·문화·건축",
     "kogl": 4,
     "title": "동대문구 상징 캐릭터 디디미",
     "kind": "공공누리 공식 공개 표시 이미지 전체(로그인 고해상도 원본 아님)",
     "page": "https://www.kogl.or.kr/recommend/recommendDivView.do?division=img&recommendIdx=59543",
     "file": "https://www.kogl.or.kr/upload_recommend/키워드 저작물/서울특별시 동대문구/이미지/기본_thumnailList_77.png",
     "extra": "",
     "conv": "그림·배경·문구·여백 전체 보존 / 비율 유지 크기조정 270×340 / PNG 무손실 저장 / 바깥 정사각 여백 추가 / 앱용: 바깥 여백만 잘라 냄, 비율 유지 384px 이하로 크기 조정, 무손실 WebP",
     "date": "2026-11-03"
    }
   },
   {
    "img": "img/region/region-25.webp",
    "w": "순천시",
    "m": "light",
    "note": "루미·뚱이 · 흑두루미·순천만 생태",
    "src": {
     "org": "순천시",
     "char": "루미·뚱이",
     "feat": "흑두루미·순천만 생태",
     "cat": "자연·생태·산업",
     "kogl": 4,
     "title": "",
     "kind": "공식 사이트 공개 미리보기 전체(고해상도 다운로드 원본 아님)",
     "page": "https://www.kogl.or.kr/recommend/recommendDivView.do?division=img&recommendIdx=177145",
     "file": "https://www.kogl.or.kr/upload_recommend/이미지/캐릭터,로고/캐릭터,로고/루미뚱이_thumnailList_10442.jpg",
     "extra": "",
     "conv": "전체 사각 프레임 비율 유지 축소(440×351)·전체 이미지 추가 축소 + PNG 무손실 압축·512 정사각 바깥 여백 추가 / 앱용: 바깥 여백만 잘라 냄, 비율 유지 384px 이하로 크기 조정, 무손실 WebP",
     "date": "2026-11-03"
    }
   },
   {
    "img": "img/region/region-26.webp",
    "w": "아산시",
    "m": "hard",
    "note": "충온이 · 아산의 이순신 역사",
    "src": {
     "org": "아산시",
     "char": "충온이",
     "feat": "아산의 이순신 역사",
     "cat": "역사·문화·건축",
     "kogl": 4,
     "title": "아산시 이순신 관광 캐릭터(충온즈)_충온이",
     "kind": "공공누리 공식 공개 표시 이미지 전체(로그인 고해상도 원본 아님)",
     "page": "https://www.kogl.or.kr/recommend/recommendDivView.do?division=img&recommendIdx=146320",
     "file": "https://www.kogl.or.kr/upload_recommend/thumb_L/이미지/캐릭터,로고/캐릭터,로고/thum_1778545012268.png",
     "extra": "",
     "conv": "그림·배경·문구·여백 전체 보존 / 비율 유지 크기조정 263×460 / PNG 무손실 저장 / 바깥 정사각 여백 추가 / 앱용: 바깥 여백만 잘라 냄, 비율 유지 384px 이하로 크기 조정, 무손실 WebP",
     "date": "2026-11-03"
    }
   },
   {
    "img": "img/region/region-27.webp",
    "w": "여수시",
    "m": "light",
    "note": "다섬이 · 여수의 섬·세계섬박람회",
    "src": {
     "org": "여수시",
     "char": "다섬이",
     "feat": "여수의 섬·세계섬박람회",
     "cat": "자연·생태·산업",
     "kogl": 4,
     "title": "섬박람회 캐릭터(다섬이)",
     "kind": "공공누리 공식 공개 표시 이미지 전체(로그인 고해상도 원본 아님)",
     "page": "https://www.kogl.or.kr/recommend/recommendDivView.do?division=img&recommendIdx=85543",
     "file": "https://www.kogl.or.kr/upload_recommend/이미지/캐릭터,로고/캐릭터,로고/캐릭터 기본형_thumnailList_2873.png",
     "extra": "",
     "conv": "그림·배경·문구·여백 전체 보존 / 비율 유지 크기조정 420×420 / PNG 무손실 저장 / 바깥 정사각 여백 추가 / 앱용: 바깥 여백만 잘라 냄, 비율 유지 384px 이하로 크기 조정, 무손실 WebP",
     "date": "2026-11-03"
    }
   },
   {
    "img": "img/region/region-28.webp",
    "w": "영천시",
    "m": "light",
    "note": "별이·빛이 · 별의 도시 영천",
    "src": {
     "org": "영천시",
     "char": "별이·빛이",
     "feat": "별의 도시 영천",
     "cat": "자연·생태·산업",
     "kogl": 4,
     "title": "",
     "kind": "공식 사이트 공개 미리보기 전체(고해상도 다운로드 원본 아님)",
     "page": "https://www.kogl.or.kr/recommend/recommendDivView.do?division=img&recommendIdx=84535",
     "file": "https://www.kogl.or.kr/upload_recommend/키워드 저작물/경상북도 영천시/이미지/영천캐릭터(별이와 빛이)_thumnailList_1908.png",
     "extra": "",
     "conv": "전체 사각 프레임 비율 유지 축소(460×246)·PNG lossless·512 정사각 바깥 여백 추가 / 앱용: 바깥 여백만 잘라 냄, 비율 유지 384px 이하로 크기 조정, 무손실 WebP",
     "date": "2026-11-03"
    }
   },
   {
    "img": "img/region/region-29.webp",
    "w": "예산군",
    "m": "jelly",
    "note": "예돌이 · 예산 사과",
    "src": {
     "org": "예산군",
     "char": "예돌이",
     "feat": "예산 사과",
     "cat": "특산물·먹거리",
     "kogl": 4,
     "title": "",
     "kind": "공식 사이트 공개 미리보기 전체(고해상도 다운로드 원본 아님)",
     "page": "https://www.kogl.or.kr/recommend/recommendDivView.do?division=img&recommendIdx=59078",
     "file": "https://www.kogl.or.kr/upload_recommend/thumb_V/키워드 저작물/충청남도 예산군/이미지/thum_1688445420676.jpg",
     "extra": "",
     "conv": "전체 사각 프레임 비율 유지 축소(413×460)·PNG lossless·512 정사각 바깥 여백 추가 / 앱용: 바깥 여백만 잘라 냄, 비율 유지 384px 이하로 크기 조정, 무손실 WebP",
     "date": "2026-11-03"
    }
   },
   {
    "img": "img/region/region-30.webp",
    "w": "옥천군",
    "m": "jelly",
    "note": "송글이·송알이 · 옥천 포도",
    "src": {
     "org": "옥천군",
     "char": "송글이·송알이",
     "feat": "옥천 포도",
     "cat": "특산물·먹거리",
     "kogl": 4,
     "title": "옥천군 마스코트-송글이, 송알이",
     "kind": "공공누리 공식 공개 표시 이미지 전체(로그인 고해상도 원본 아님)",
     "page": "https://www.kogl.or.kr/recommend/recommendDivView.do?division=img&recommendIdx=178638",
     "file": "https://www.kogl.or.kr/upload_recommend/thumb_L/이미지/캐릭터,로고/캐릭터,로고/thum_1792474199068.jpg",
     "extra": "",
     "conv": "그림·배경·문구·여백 전체 보존 / 비율 유지 크기조정 460×219 / PNG 무손실 저장 / 바깥 정사각 여백 추가 / 앱용: 바깥 여백만 잘라 냄, 비율 유지 384px 이하로 크기 조정, 무손실 WebP",
     "date": "2026-11-03"
    }
   },
   {
    "img": "img/region/region-31.webp",
    "w": "울산 울주군",
    "m": "light",
    "note": "해뜨미 · 간절곶 해돋이",
    "src": {
     "org": "울산광역시 울주군",
     "char": "해뜨미",
     "feat": "간절곶 해돋이",
     "cat": "자연·생태·산업",
     "kogl": 4,
     "title": "울주군 캐릭터 해뜨미(기본형)",
     "kind": "공공누리 공식 공개 표시 이미지 전체(로그인 고해상도 원본 아님)",
     "page": "https://www.kogl.or.kr/recommend/recommendDivView.do?division=img&recommendIdx=84871",
     "file": "https://www.kogl.or.kr/upload_recommend/키워드 저작물/울산광역시 울주군/이미지/해뜨미 기본형_thumnailList_2249.jpg",
     "extra": "",
     "conv": "그림·배경·문구·여백 전체 보존 / 비율 유지 크기조정 292×360 / PNG 무손실 저장 / 바깥 정사각 여백 추가 / 앱용: 바깥 여백만 잘라 냄, 비율 유지 384px 이하로 크기 조정, 무손실 WebP",
     "date": "2026-11-03"
    }
   },
   {
    "img": "img/region/region-32.webp",
    "w": "의정부시",
    "m": "hard",
    "note": "의돌이 · 의정부 지명과 역사",
    "src": {
     "org": "의정부시",
     "char": "의돌이",
     "feat": "의정부 지명과 역사",
     "cat": "역사·문화·건축",
     "kogl": 4,
     "title": "",
     "kind": "공식 사이트 공개 미리보기 전체(고해상도 다운로드 원본 아님)",
     "page": "https://www.kogl.or.kr/recommend/recommendDivView.do?division=img&recommendIdx=60734",
     "file": "https://www.kogl.or.kr/upload_recommend/키워드 저작물/경기도 의정부시/이미지/rang_01_thumnailList_761.png",
     "extra": "",
     "conv": "전체 사각 프레임 비율 유지 축소(440×440)·전체 이미지 추가 축소 + PNG 무손실 압축·512 정사각 바깥 여백 추가 / 앱용: 바깥 여백만 잘라 냄, 비율 유지 384px 이하로 크기 조정, 무손실 WebP",
     "date": "2026-11-03"
    }
   },
   {
    "img": "img/region/region-33.webp",
    "w": "익산시",
    "m": "hard",
    "note": "마룡이 · 백제 무왕·서동 전설",
    "src": {
     "org": "익산시",
     "char": "마룡이",
     "feat": "백제 무왕·서동 전설",
     "cat": "역사·문화·건축",
     "kogl": 4,
     "title": "",
     "kind": "공식 사이트 공개 미리보기 전체(고해상도 다운로드 원본 아님)",
     "page": "https://www.kogl.or.kr/recommend/recommendDivView.do?division=img&recommendIdx=54881",
     "file": "https://www.kogl.or.kr/upload_recommend/thumb_V/키워드 저작물/전라북도 익산시/이미지/thum_1686619654569.png",
     "extra": "",
     "conv": "전체 사각 프레임 비율 유지 축소(460×457)·PNG lossless·512 정사각 바깥 여백 추가 / 앱용: 바깥 여백만 잘라 냄, 비율 유지 384px 이하로 크기 조정, 무손실 WebP",
     "date": "2026-11-03"
    }
   },
   {
    "img": "img/region/region-34.webp",
    "w": "인제군",
    "m": "light",
    "note": "수달이 · 청정 하천의 수달",
    "src": {
     "org": "인제군",
     "char": "수달이",
     "feat": "청정 하천의 수달",
     "cat": "자연·생태·산업",
     "kogl": 4,
     "title": "",
     "kind": "공식 사이트 공개 미리보기 전체(고해상도 다운로드 원본 아님)",
     "page": "https://www.kogl.or.kr/recommend/recommendDivView.do?division=img&recommendIdx=145499",
     "file": "https://www.kogl.or.kr/upload_recommend/이미지/캐릭터,로고/캐릭터,로고/인제군 마스코트_thumnailList_8161.gif",
     "extra": "",
     "conv": "전체 사각 프레임 비율 유지 축소(460×236)·PNG lossless·512 정사각 바깥 여백 추가 / 앱용: 바깥 여백만 잘라 냄, 비율 유지 384px 이하로 크기 조정, 무손실 WebP",
     "date": "2026-11-03"
    }
   },
   {
    "img": "img/region/region-35.webp",
    "w": "인천 강화군",
    "m": "hard",
    "note": "고인돌 캐릭터 · 강화 고인돌 유산",
    "src": {
     "org": "인천광역시 강화군",
     "char": "고인돌 캐릭터",
     "feat": "강화 고인돌 유산",
     "cat": "역사·문화·건축",
     "kogl": 4,
     "title": "강화군 캐릭터 신규 디자인(고인돌)",
     "kind": "공공누리 공식 공개 표시 이미지 전체(로그인 고해상도 원본 아님)",
     "page": "https://www.kogl.or.kr/recommend/recommendDivView.do?division=img&recommendIdx=85284",
     "file": "https://www.kogl.or.kr/upload_recommend/thumb_L/이미지/캐릭터,로고/캐릭터,로고/thum_1734502988087.png",
     "extra": "",
     "conv": "그림·배경·문구·여백 전체 보존 / 비율 유지 크기조정 450×460 / PNG 무손실 저장 / 바깥 정사각 여백 추가 / 앱용: 바깥 여백만 잘라 냄, 비율 유지 384px 이하로 크기 조정, 무손실 WebP",
     "date": "2026-11-03"
    }
   },
   {
    "img": "img/region/region-36.webp",
    "w": "장수군",
    "m": "jelly",
    "note": "사과랑 · 장수 사과",
    "src": {
     "org": "장수군",
     "char": "사과랑",
     "feat": "장수 사과",
     "cat": "특산물·먹거리",
     "kogl": 4,
     "title": "",
     "kind": "공식 사이트 공개 미리보기 전체(고해상도 다운로드 원본 아님)",
     "page": "https://www.kogl.or.kr/recommend/recommendDivView.do?division=img&recommendIdx=139466",
     "file": "https://www.kogl.or.kr/upload_recommend/이미지/캐릭터,로고/캐릭터,로고/사과랑_thumnailList_4743.gif",
     "extra": "",
     "conv": "전체 사각 프레임 비율 유지 축소(360×251)·전체 이미지 추가 축소 + PNG 무손실 압축·512 정사각 바깥 여백 추가 / 앱용: 바깥 여백만 잘라 냄, 비율 유지 384px 이하로 크기 조정, 무손실 WebP",
     "date": "2026-11-03"
    }
   },
   {
    "img": "img/region/region-37.webp",
    "w": "장흥군",
    "m": "jelly",
    "note": "표동이 · 장흥 표고버섯",
    "src": {
     "org": "장흥군",
     "char": "표동이",
     "feat": "장흥 표고버섯",
     "cat": "특산물·먹거리",
     "kogl": 4,
     "title": "",
     "kind": "공식 사이트 공개 미리보기 전체(고해상도 다운로드 원본 아님)",
     "page": "https://www.kogl.or.kr/recommend/recommendDivView.do?division=img&recommendIdx=85133",
     "file": "https://www.kogl.or.kr/upload_recommend/키워드 저작물/전라남도 장흥군/이미지/표동이 캐릭터_thumnailList_2467.jpg",
     "extra": "",
     "conv": "전체 사각 프레임 비율 유지 축소(299×300)·전체 이미지 추가 축소 + PNG 무손실 압축·512 정사각 바깥 여백 추가 / 앱용: 바깥 여백만 잘라 냄, 비율 유지 384px 이하로 크기 조정, 무손실 WebP",
     "date": "2026-11-03"
    }
   },
   {
    "img": "img/region/region-38.webp",
    "w": "전주시",
    "m": "jelly",
    "note": "배대감 · 전주 배",
    "src": {
     "org": "전주시",
     "char": "배대감",
     "feat": "전주 배",
     "cat": "특산물·먹거리",
     "kogl": 3,
     "title": "[전주시 농산물 캐릭터] 배대감",
     "kind": "공공누리 공식 공개 표시 이미지 전체(로그인 고해상도 원본 아님)",
     "page": "https://www.kogl.or.kr/recommend/recommendDivView.do?division=img&recommendIdx=60637",
     "file": "https://www.kogl.or.kr/upload_recommend/키워드 저작물/전라북도 전주시/이미지/배대감.JPG",
     "extra": "",
     "conv": "그림·배경·문구·여백 전체 보존 / 비율 유지 크기조정 420×327 / PNG 무손실 저장 / 바깥 정사각 여백 추가 / 앱용: 바깥 여백만 잘라 냄, 비율 유지 384px 이하로 크기 조정, 무손실 WebP",
     "date": "2026-11-03"
    }
   },
   {
    "img": "img/region/region-39.webp",
    "w": "증평군",
    "m": "hard",
    "note": "김득신 · 독서왕 김득신",
    "src": {
     "org": "증평군",
     "char": "김득신",
     "feat": "독서왕 김득신",
     "cat": "역사·문화·건축",
     "kogl": 4,
     "title": "",
     "kind": "공식 사이트 공개 미리보기 전체(고해상도 다운로드 원본 아님)",
     "page": "https://www.kogl.or.kr/recommend/recommendDivView.do?division=img&recommendIdx=56797",
     "file": "https://www.kogl.or.kr/upload_recommend/thumb_V/키워드 저작물/충청북도 증평군/이미지/thum_1687849236945.jpg",
     "extra": "",
     "conv": "전체 사각 프레임 비율 유지 축소(325×460)·PNG lossless·512 정사각 바깥 여백 추가 / 앱용: 바깥 여백만 잘라 냄, 비율 유지 384px 이하로 크기 조정, 무손실 WebP",
     "date": "2026-11-03"
    }
   },
   {
    "img": "img/region/region-40.webp",
    "w": "진도군",
    "m": "hard",
    "note": "진도 프렌즈 · 진도개·진도 민속문화",
    "src": {
     "org": "진도군",
     "char": "진도 프렌즈",
     "feat": "진도개·진도 민속문화",
     "cat": "역사·문화·건축",
     "kogl": 1,
     "title": "진도군 프렌즈 캐릭터",
     "kind": "공공누리 공식 공개 표시 이미지 전체(로그인 고해상도 원본 아님)",
     "page": "https://www.kogl.or.kr/recommend/recommendDivView.do?division=img&recommendIdx=59209",
     "file": "https://www.kogl.or.kr/upload_recommend/thumb_V/키워드 저작물/전라남도 진도군/이미지/thum_1689575488014.jpg",
     "extra": "",
     "conv": "그림·배경·문구·여백 전체 보존 / 비율 유지 크기조정 320×227 / PNG 무손실 저장 / 바깥 정사각 여백 추가 / 앱용: 바깥 여백만 잘라 냄, 비율 유지 384px 이하로 크기 조정, 무손실 WebP",
     "date": "2026-11-03"
    }
   },
   {
    "img": "img/region/region-41.webp",
    "w": "진안군",
    "m": "jelly",
    "note": "빠망 · 마이산·진안 홍삼",
    "src": {
     "org": "진안군",
     "char": "빠망",
     "feat": "마이산·진안 홍삼",
     "cat": "특산물·먹거리",
     "kogl": 4,
     "title": "진안군 대표 캐릭터",
     "kind": "공공누리 공식 공개 표시 이미지 전체(로그인 고해상도 원본 아님)",
     "page": "https://www.kogl.or.kr/recommend/recommendDivView.do?division=img&recommendIdx=59566",
     "file": "https://www.kogl.or.kr/upload_recommend/thumb_L/키워드 저작물/전라북도 진안군/이미지/thum_1697703133796.jpg",
     "extra": "",
     "conv": "그림·배경·문구·여백 전체 보존 / 비율 유지 크기조정 253×320 / PNG 무손실 저장 / 바깥 정사각 여백 추가 / 앱용: 바깥 여백만 잘라 냄, 비율 유지 384px 이하로 크기 조정, 무손실 WebP",
     "date": "2026-11-03"
    }
   },
   {
    "img": "img/region/region-42.webp",
    "w": "진천군",
    "m": "hard",
    "note": "원화랑·원낭자 · 진천 화랑문화",
    "src": {
     "org": "진천군",
     "char": "원화랑·원낭자",
     "feat": "진천 화랑문화",
     "cat": "역사·문화·건축",
     "kogl": 1,
     "title": "진천군 마스코트",
     "kind": "공공누리 공식 공개 표시 이미지 전체(로그인 고해상도 원본 아님)",
     "page": "https://www.kogl.or.kr/recommend/recommendDivView.do?division=img&recommendIdx=139269",
     "file": "https://www.kogl.or.kr/upload_recommend/thumb_L/이미지/캐릭터,로고/캐릭터,로고/thum_1752195838585.png",
     "extra": "",
     "conv": "그림·배경·문구·여백 전체 보존 / 비율 유지 크기조정 300×300 / PNG 무손실 저장 / 바깥 정사각 여백 추가 / 앱용: 바깥 여백만 잘라 냄, 비율 유지 384px 이하로 크기 조정, 무손실 WebP",
     "date": "2026-11-03"
    }
   },
   {
    "img": "img/region/region-43.webp",
    "w": "청도군",
    "m": "hard",
    "note": "카우·붕가 · 청도 소싸움 문화",
    "src": {
     "org": "청도군",
     "char": "카우·붕가",
     "feat": "청도 소싸움 문화",
     "cat": "역사·문화·건축",
     "kogl": 4,
     "title": "청도 카우과 붕가 캐릭터",
     "kind": "공공누리 공식 공개 표시 이미지 전체(로그인 고해상도 원본 아님)",
     "page": "https://www.kogl.or.kr/recommend/recommendDivView.do?division=img&recommendIdx=139293",
     "file": "https://www.kogl.or.kr/upload_recommend/이미지/캐릭터,로고/캐릭터,로고/카우와붕가2001_thumnailList_4567.jpg",
     "extra": "",
     "conv": "그림·배경·문구·여백 전체 보존 / 비율 유지 크기조정 325×460 / PNG 무손실 저장 / 바깥 정사각 여백 추가 / 앱용: 바깥 여백만 잘라 냄, 비율 유지 384px 이하로 크기 조정, 무손실 WebP",
     "date": "2026-11-03"
    }
   },
   {
    "img": "img/region/region-44.webp",
    "w": "태백시",
    "m": "light",
    "note": "태붐이 · 태백산 호랑이·눈·발원지",
    "src": {
     "org": "태백시",
     "char": "태붐이",
     "feat": "태백산 호랑이·눈·발원지",
     "cat": "자연·생태·산업",
     "kogl": 4,
     "title": "태백시 대표 캐릭터 태붐이 이모티콘",
     "kind": "공공누리 공식 공개 표시 이미지 전체(로그인 고해상도 원본 아님)",
     "page": "https://www.kogl.or.kr/recommend/recommendDivView.do?division=img&recommendIdx=82752",
     "file": "https://www.kogl.or.kr/upload_recommend/키워드 저작물/강원특별자치도 태백시/이미지/태붐이 (2)_thumnailList_1450.gif",
     "extra": "",
     "conv": "그림·배경·문구·여백 전체 보존 / 비율 유지 크기조정 400×399 / PNG 무손실 저장 / 바깥 정사각 여백 추가 / 앱용: 바깥 여백만 잘라 냄, 비율 유지 384px 이하로 크기 조정, 무손실 WebP",
     "date": "2026-11-03"
    }
   },
   {
    "img": "img/region/region-45.webp",
    "w": "파주시",
    "m": "jelly",
    "note": "파랑이(장단콩) · 파주 장단콩",
    "src": {
     "org": "파주시",
     "char": "파랑이(장단콩)",
     "feat": "파주 장단콩",
     "cat": "특산물·먹거리",
     "kogl": 4,
     "title": "파주시 캐릭터 파랑_장단콩",
     "kind": "공공누리 공식 공개 표시 이미지 전체(로그인 고해상도 원본 아님)",
     "page": "https://www.kogl.or.kr/recommend/recommendDivView.do?division=img&recommendIdx=60291",
     "file": "https://www.kogl.or.kr/upload_recommend/키워드 저작물/경기도 파주시/이미지/파랑이_장단콩(고마워)_thumnailList_338.gif",
     "extra": "",
     "conv": "그림·배경·문구·여백 전체 보존 / 비율 유지 크기조정 360×360 / PNG 무손실 저장 / 바깥 정사각 여백 추가 / 앱용: 바깥 여백만 잘라 냄, 비율 유지 384px 이하로 크기 조정, 무손실 WebP",
     "date": "2026-11-03"
    }
   },
   {
    "img": "img/region/region-46.webp",
    "w": "포천시",
    "m": "hard",
    "note": "오성·한음 · 포천의 역사인물 오성과 한음",
    "src": {
     "org": "포천시",
     "char": "오성·한음",
     "feat": "포천의 역사인물 오성과 한음",
     "cat": "역사·문화·건축",
     "kogl": 4,
     "title": "포천시 캐릭터(오성과 한음)(리뉴얼)",
     "kind": "공공누리 공식 공개 표시 이미지 전체(로그인 고해상도 원본 아님)",
     "page": "https://www.kogl.or.kr/recommend/recommendDivView.do?division=img&recommendIdx=88139",
     "file": "https://www.kogl.or.kr/upload_recommend/이미지/캐릭터,로고/캐릭터,로고/OhsungAndhanum_png_thumnailList_7014.png",
     "extra": "",
     "conv": "그림·배경·문구·여백 전체 보존 / 비율 유지 크기조정 237×420 / PNG 무손실 저장 / 바깥 정사각 여백 추가 / 앱용: 바깥 여백만 잘라 냄, 비율 유지 384px 이하로 크기 조정, 무손실 WebP",
     "date": "2026-11-03"
    }
   },
   {
    "img": "img/region/region-47.webp",
    "w": "해남군",
    "m": "light",
    "note": "땅끝이·희망이 · 땅끝마을·해남 자연",
    "src": {
     "org": "해남군",
     "char": "땅끝이·희망이",
     "feat": "땅끝마을·해남 자연",
     "cat": "자연·생태·산업",
     "kogl": 4,
     "title": "",
     "kind": "공식 사이트 공개 미리보기 전체(고해상도 다운로드 원본 아님)",
     "page": "https://www.kogl.or.kr/recommend/recommendDivView.do?division=img&recommendIdx=59584",
     "file": "https://www.kogl.or.kr/upload_recommend/thumb_V/키워드 저작물/전라남도 해남군/이미지/thum_1698388050417.png",
     "extra": "",
     "conv": "전체 사각 프레임 비율 유지 축소(460×460)·PNG lossless·512 정사각 바깥 여백 추가 / 앱용: 바깥 여백만 잘라 냄, 비율 유지 384px 이하로 크기 조정, 무손실 WebP",
     "date": "2026-11-03"
    }
   },
   {
    "img": "img/region/region-48.webp",
    "w": "홍성군",
    "m": "jelly",
    "note": "복돌이 · 홍성의 돼지",
    "src": {
     "org": "홍성군",
     "char": "복돌이",
     "feat": "홍성의 돼지",
     "cat": "특산물·먹거리",
     "kogl": 4,
     "title": "",
     "kind": "공식 사이트 공개 미리보기 전체(고해상도 다운로드 원본 아님)",
     "page": "https://www.kogl.or.kr/recommend/recommendDivView.do?division=img&recommendIdx=54889",
     "file": "https://www.kogl.or.kr/upload_recommend/thumb_V/키워드 저작물/충청남도 홍성군/이미지/thum_1686723026828.jpg",
     "extra": "",
     "conv": "전체 사각 프레임 비율 유지 축소(324×460)·PNG lossless·512 정사각 바깥 여백 추가 / 앱용: 바깥 여백만 잘라 냄, 비율 유지 384px 이하로 크기 조정, 무손실 WebP",
     "date": "2026-11-03"
    }
   },
   {
    "img": "img/region/region-49.webp",
    "w": "화성시",
    "m": "light",
    "note": "코리요 · 화성에서 발견된 공룡",
    "src": {
     "org": "화성시",
     "char": "코리요",
     "feat": "화성에서 발견된 공룡",
     "cat": "자연·생태·산업",
     "kogl": 4,
     "title": "",
     "kind": "공식 사이트 공개 미리보기 전체(고해상도 다운로드 원본 아님)",
     "page": "https://www.kogl.or.kr/recommend/recommendDivView.do?division=img&recommendIdx=54906",
     "file": "https://www.kogl.or.kr/upload_recommend/thumb_V/키워드 저작물/경기도 화성시/이미지/thum_1687158447911.jpg",
     "extra": "",
     "conv": "전체 사각 프레임 비율 유지 축소(365×380)·전체 이미지 추가 축소 + PNG 무손실 압축·512 정사각 바깥 여백 추가 / 앱용: 바깥 여백만 잘라 냄, 비율 유지 384px 이하로 크기 조정, 무손실 WebP",
     "date": "2026-11-03"
    }
   }
  ]
});
/* HOLD (아직 넣지 않음): 김천시 새코미·달코미, 성주군 참별이, 영양군 꼬미, 울산광역시 남구 장생이, 의성군 의동이, 임실군 피치, 청양군 고추도령·구기낭자, 횡성군 한우리 */
