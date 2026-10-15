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
