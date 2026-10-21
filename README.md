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
