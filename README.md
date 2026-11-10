# 릴레이 원고지

학생들이 각자 태블릿으로 접속해 모둠별로 한 문장씩 이어 쓰는 릴레이 글쓰기 웹앱.

- 주소: `https://goraniduck-lgtm.github.io/relay-writing/`
- Firebase 프로젝트: relay-writing-4415e
- `database.rules.json` 내용은 Firebase 콘솔 → Realtime Database → 규칙에 붙여넣기
- Authentication에서 익명 / 이메일·비밀번호 로그인 사용 설정 필요

## 릴레이 그리기 (`drawing/`)

- 진행자(학생 태블릿, 로그인 없음): `https://goraniduck-lgtm.github.io/relay-writing/drawing/`
- 교사(반 관리·제시어 세트·전체 현황): `https://goraniduck-lgtm.github.io/relay-writing/drawing/teacher.html`
- 데이터는 같은 Firebase 프로젝트의 `relayDrawing/` 아래에 저장 (classes, sets, games)

## 교실 마피아 (`mafia/`)

- 학생 태블릿: `https://goraniduck-lgtm.github.io/relay-writing/mafia/` (참가 코드 → 이름/번호)
- 교사·사회자 진행: `https://goraniduck-lgtm.github.io/relay-writing/mafia/admin.html` (교사 계정 로그인 → 방 만들기)
- 학생 사회자: 교사 화면 "참가 링크·QR" 탭의 사회자 QR (`admin.html?r=코드&k=키`)
- 교실 TV: `https://goraniduck-lgtm.github.io/relay-writing/mafia/tv.html?r=코드`
- 미션 목록: `mafia/missions.js` (공통 미션·비밀 미션·난이도), 판정 규칙: `mafia/logic.js`
- 데이터는 같은 Firebase 프로젝트의 `mafia/` 아래 (방마다 분리). 역할·비밀 미션·투표는 보안 규칙으로 본인·관리자만 읽힘
- 보안 규칙은 `node mafia/tools/build-rules.js`로 `database.rules.json`을 만든 뒤 콘솔에 붙여넣기
  (마피아 때문에 루트 전체 읽기를 앱 경로별 읽기로 나눔 — 기존 앱 동작은 같음)

## 그림자 용 레이드 (`raid/`)

- 학생 태블릿: `https://goraniduck-lgtm.github.io/relay-writing/raid/` (반 → 모둠 → 번호 → 직업)
- 교실 TV(레이드 화면): `https://goraniduck-lgtm.github.io/relay-writing/raid/tv.html`
- 교사(진행·반 관리·기록): `https://goraniduck-lgtm.github.io/relay-writing/raid/teacher.html`
- 인쇄물(단서 카드·봉투 겉면): `https://goraniduck-lgtm.github.io/relay-writing/raid/print.html`
- 문항: `raid/questions.js` (지금은 예시 문항)
- 삽화: `raid/img/` 에 정해진 파일 이름으로 넣으면 자동으로 보임 (없으면 기본 배경)
- 데이터는 같은 Firebase 프로젝트의 `raid/` 아래에 저장 (classes, games)

## 자리 경매 (`auction/`)

- 학생 태블릿: `https://goraniduck-lgtm.github.io/relay-writing/auction/` (참여 코드 → 내 번호)
- 교사 진행·관리: `https://goraniduck-lgtm.github.io/relay-writing/auction/admin.html` (교사 계정 로그인 → 방 만들기)
- 교실 TV: `https://goraniduck-lgtm.github.io/relay-writing/auction/tv.html?r=코드`
- 판정·차감·배정 규칙: `auction/logic.js` (시험: `node auction/tools/test-logic.js`)
- 데이터는 같은 Firebase 프로젝트의 `auction/` 아래 (방마다 분리). 보안 규칙: `auction/tools/rules.js`
  → `node mafia/tools/build-rules.js` 로 `database.rules.json`에 합쳐짐
- 입찰 마감은 서버 시각으로 보안 규칙이 막고, 판정·코인 차감은 마감 뒤 교사 화면이 한 번만(트랜잭션) 실행함
  → 입찰하는 동안 교사 화면을 켜 두어야 결과가 나옴 (꺼졌다 다시 열면 이어서 판정)

## 움직이는 그림 공방 — 스캐니메이션 (`scanimation/`)

- 학생 태블릿: `https://goraniduck-lgtm.github.io/relay-writing/scanimation/` (그리기 → 미리 보기 → **4. 선생님께 보내기**: 반 → 번호 → 보내기)
  - 반이 미리 골라진 주소: `.../scanimation/?c=반ID` (교사 화면에서 복사)
- 교사 받은 함: `https://goraniduck-lgtm.github.io/relay-writing/scanimation/teacher.html` (교사 계정 로그인)
  - 학생별 PDF 받기, 반 전체를 한 PDF로 모아 받기(합성+필름 / 합성만 / 필름만), 지우기
- 보내는 파일: **A5 가로 PDF 두 쪽** — ① 합성 그림(일반 종이) ② 줄무늬 필름(OHP, 벡터). 그림 자리 150×100mm가 두 쪽에서 같은 위치
  - PDF가 3MB를 넘으면(사진 등) 합성 그림을 고화질 JPEG로 넣어 크기를 줄임
- 반·명단은 릴레이 원고지의 `classList`, `classes/{반}/roster`를 읽기만 함
- 데이터: `scanimation/subs/{반}/{제출}`(정보·장면 미리보기), `scanimation/files/{제출}`(PDF base64 조각, 50만 자씩)
  - 보안 규칙: `scanimation/tools/rules.js` → `node mafia/tools/build-rules.js`로 합침. 시험: `node scanimation/tools/test-rules.js`
  - 학생은 새 제출 만들기·자기 조각 올리기·완료 표시만 가능, 읽기·지우기는 교사만
- PDF 도구는 `scanimation/vendor/`에 같이 둠(jsPDF 2.5.2, pdf-lib 1.17.1) — 학교 기기에서 외부 CDN이 막혀도 동작

## 구석구석 다 함께 찾아요 (`gusuk/`)

사회 4-2 교과서 79~81쪽(지역을 알리기 위한 노력) 활동 — 모둠이 전국 지자체의 축제·특산물·자랑거리·상징을 조사해 학급 지도에 채움

- 학생 태블릿: `https://goraniduck-lgtm.github.io/relay-writing/gusuk/` (처음 한 번 모둠 1~6 고르기, 바꾸려면 교사 PIN)
- 교사(카드 관리·통계·설정): `https://goraniduck-lgtm.github.io/relay-writing/gusuk/teacher.html`
  - 처음 한 번 교사 계정 비밀번호로 들어가 8자리 PIN을 정함 → 그다음부터 PIN만
- 교실 TV(발표 모드): `https://goraniduck-lgtm.github.io/relay-writing/gusuk/tv.html`
- 인쇄(A4 4장 이어 붙여 A2 / A4 가로 8장 이어 붙여 A1 / A2 1장 / A4 1장): `https://goraniduck-lgtm.github.io/relay-writing/gusuk/print.html`
- 지도: `gusuk/mapdata.js` — vuski/admdongkor ver20261001(통계청 행정동 경계)을 시·군·구로 합쳐 단순화 (`gusuk/tools/prep.py`, `build_map.py`)
  - 2026.7. 전남광주통합특별시, 인천 서해구·검단구·영종구·제물포구 반영. 일반구는 시로 합침, 울릉도·독도는 옮겨 그림
- 데이터: 같은 Firebase 프로젝트의 `gusuk/` 아래 (cfg, secret, adm, dev, cards, trash). 보안 규칙: `gusuk/tools/rules.js`
  → `node mafia/tools/build-rules.js`로 합침. 시험: `node gusuk/tools/test-rules.js`
- 브라우저 시험용 가짜 DB: `gusuk/tools/fake-db.js` (Playwright addInitScript, `?uid=` 로 기기 구분)

## 딱! 같은 그림 — 도블식 2인 대결 (`dobble/`)

- 태블릿: `https://goraniduck-lgtm.github.io/relay-writing/dobble/` (방 만들기 → 인원 2~6명 → 네 자리 번호 / 방 들어가기 / 혼자 연습)
- 여러 명: 들어온 순서대로 a~f 자리(빨강·파랑·초록·노랑·보라·분홍). 2명 이상이면 시작 가능, 시작할 때 있는 사람이 참가자(`cfg.players`). 판 길이는 '한 명에 6/10장쯤/전체' → 인원에 맞춰 카드 장수 계산. 중간에 나가면 남은 사람끼리 계속, 다시 하기는 남은 사람만
- 규칙: 내 카드와 가운데 카드에 똑같이 있는 그림을 눌렀다 떼면 날아가 부딪힘. 먼저 맞힌 쪽이 가운데 카드를 가져감(내 카드가 됨). 카드를 많이 모은 쪽이 이김
- **그림 세트(과목별)**: `dobble/sets.js` — 그림 7·13·31·57개 → 카드 한 장에 3·4·6·8개. 이모지·낱말·그림 파일 가능
- **사회 · 우리 지역 알리기** 세트: `dobble/sets-region.js` + `dobble/img/region/` (지자체 캐릭터 49개, 공공누리 1~4유형). 출처는 처음 화면 '출처 모음'(`dobble/sources.html`)에 그림마다 공공누리 유형·출처·구석구석 링크로 나옴. `intact: true` 세트는 그림을 찌그러뜨리거나 색을 바꾸지 않음(변경 금지). 이용허락 미확인 8개는 아직 뺌
- **그림 파일**: 정사각형 PNG(배경 투명) 512×512, 한 장 100KB 안쪽, 그림이 칸을 거의 꽉 채우게, 그림 속 글자 없이 → `dobble/img/{세트 id}/` 에 넣고 `img:` 로 연결
- 나가기: 게임 중 '나가기' 또는 뒤로 가기(가장자리 스와이프) → 확인 창. 한쪽이 나가면 상대 화면에 '친구가 나갔어요'. 둘 다 나가면 방 지움
- 전체화면: 방 만들기·들어가기·시작할 때 자동(처음 화면·게임 화면 버튼으로 끄고 켬). 게임 중 새로고침·닫기는 브라우저가 한 번 물어봄
- 연속 터치 막기: 한 번 날린 뒤 0.3초, 새 카드가 나온 뒤 0.25초는 누르기를 받지 않음, 두 번째 손가락 무시, 버튼 연타 무시 (`feel.js` 에서 조절)
- **손맛 조절**: `dobble/feel.js` — 재질(무거움·가벼움·말랑함·단단함), 콤보 불, 틀렸을 때 잠김 시간, 기기 성능
- 판정: `dobble/rooms/{번호}/claims/{판}` 에 먼저 쓴 자리만 받음(트랜잭션 + 보안 규칙). 점수·카드는 이 기록만으로 두 태블릿이 똑같이 계산
- 보안 규칙: `dobble/tools/rules.js` → `node mafia/tools/build-rules.js` 로 합침
- 시험: `node dobble/tools/test-deck.js`(카드 규칙) · `node dobble/tools/test-rules.js`(보안 규칙) · `node dobble/tools/test-play.js`(정적 서버를 띄운 뒤, 두 태블릿 동시 대결) · `node dobble/tools/test-multi.js 주소 4`(여러 명)

## 애니메이션 공방 (`animation/`)

- 학생 태블릿: `https://goraniduck-lgtm.github.io/relay-writing/animation/` (그리기 → 움직임 보기 → 선생님께 보내기)
  - 16:9(960×540) 그리기, 장면 최대 120장, 이전(빨강)·다음(파랑) 장면 흐리게 보기
  - 장면 추가·복사·한 칸 이동, '여러 장면 고르기'로 여러 장 맨 앞/맨 뒤/한 칸 이동·복사·지우기(지우기는 '되돌리기' 가능)
  - 빠르기 1~15장/초, 반복·왕복·한 번 재생. 그림은 태블릿 IndexedDB에 자동 저장(새로고침해도 이어서)
  - 메모리 아끼기: 장면은 PNG Blob으로만 보관, 지금 장면만 큰 캔버스, 실행 취소는 지금 장면 15번
- 교사 받은 함: `.../animation/teacher.html` — 카드 미리보기(실제 빠르기), 크게 보기·차례로 보기(교실 TV), GIF 받기, ZIP 모아 받기, 지우기
- 보내는 파일: GIF 640×360 (색 256개 공통 팔레트, 같은 그림이 이어지면 한 장으로 합침). 120장면 촘촘한 그림도 약 3MB
- 데이터: `animation/subs/{반}/{제출}`, `animation/files/{제출}` (GIF base64 조각) — 규칙 `animation/tools/rules.js`, 시험 `node animation/tools/test-rules.js`
- 도구: `animation/vendor/gifenc.js`(gifenc 1.0.3, MIT), `animation/vendor/fflate.min.js`(fflate 0.8.2, MIT)
- 움직이는 그림 공방: 실행 취소 기록을 모든 장면 합쳐 20개로 제한(태블릿 메모리 보호)
