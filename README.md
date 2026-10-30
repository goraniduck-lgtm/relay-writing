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
