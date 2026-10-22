/* 자리 경매 보안 규칙 (auction/) — mafia/tools/build-rules.js 가 불러서 database.rules.json 에 넣음
   데이터 구조
     auction/index/{code}               교사용 방 목록 (교사만)
     auction/rooms/{code}/cfg           학급 설정·명단·자리 배치·분리 조건 (로그인한 기기 모두 읽기, 교사만 쓰기)
     .../core                           진행 상태·코인·낙찰(own)·착석(sit)·라운드 결과 (모두 읽기, 교사만 쓰기)
     .../claims/{학생}                  학생 ↔ 기기 연결 {uid}
     .../me/{uid}                       기기 → 학생 (한 기기 한 학생)
     .../pres/{학생}/{uid}              접속 상태 (기기별, 끊기면 자동 삭제)
     .../req/{uid}                      다른 기기로 재접속 요청
     .../bids/{라운드}/{학생}           입찰 {a: 금액, t: 서버 접수 시각} (본인·교사만 읽기)
     .../coinlog                        코인 변경 기록 (교사만) */
const T = "'VNW0t5e67CfInsF63jATWdBsaqG2'";
const R = "'auction/rooms/' + $c";
const at = p => `root.child(${R} + '/${p}')`;
const isT = `(auth != null && auth.uid === ${T})`;
const and = (...a) => a.join(' && ');
const claimUid = s => `root.child(${R} + '/claims/' + ${s} + '/uid').val()`;
const isMe = s => `(auth != null && ${claimUid(s)} === auth.uid)`;
const st = k => at('core/st/' + k);
const GRACE = 200; // 마감 시각 뒤 허용 오차(ms) — 기기 시계 추정 오차만큼

module.exports = {
  index: { '.read': isT, '.write': isT },
  rooms: {
    $c: {
      '.read': isT,
      '.write': isT,
      cfg: { '.read': 'auth != null' },
      core: {
        '.read': 'auth != null',
        st: {
          /* 입찰 시작 시각은 반드시 서버 시각 */
          t0: { '.validate': 'newData.isNumber() && (newData.val() === now || newData.val() === data.val())' },
          dur: { '.validate': 'newData.isNumber() && newData.val() >= 5 && newData.val() <= 15' }
        }
      },
      claims: {
        '.read': 'auth != null',
        $s: {
          /* 처음 연결: 비어 있는 번호 + 참여 허용 중 + 명단에 있음 + 같은 기기의 me 도 함께 씀
             스스로 해제: 첫 경매 전에만 */
          '.write': `auth != null && ((${and('!data.exists()', "newData.child('uid').val() === auth.uid",
            `${at('cfg/open')}.val() === true`, `${at('cfg/roster')}.child($s).exists()`,
            "newData.parent().parent().child('me/' + auth.uid).val() === $s")})` +
            ` || (${and("data.child('uid').val() === auth.uid", '!newData.exists()', `!${at('core/hist')}.exists()`,
              "!newData.parent().parent().child('me/' + auth.uid).exists()")}))`,
          '.validate': "newData.hasChildren(['uid']) && newData.child('uid').isString()"
        }
      },
      me: {
        $u: {
          '.read': 'auth != null && auth.uid === $u',
          '.write': `auth != null && auth.uid === $u && ((${and('!data.exists()', 'newData.isString()',
            "newData.parent().parent().child('claims/' + newData.val() + '/uid').val() === auth.uid")})` +
            ` || (${and('data.exists()', '!newData.exists()',
              "newData.parent().parent().child('claims/' + data.val() + '/uid').val() !== auth.uid")}))`
        }
      },
      pres: {
        '.read': 'auth != null',
        $s: {
          /* 기기별로 따로 기록 — 옛 기기가 끊길 때 새 기기의 접속 표시를 지우지 않도록 */
          $u: {
            '.write': `auth != null && auth.uid === $u && (${claimUid('$s')} === auth.uid || !newData.exists())`,
            '.validate': 'newData.isNumber()'
          }
        }
      },
      req: {
        $u: {
          '.read': 'auth != null && auth.uid === $u',
          '.write': 'auth != null && auth.uid === $u',
          '.validate': `newData.hasChildren(['s', 't']) && newData.child('s').isString() && ${at('cfg/roster')}.child(newData.child('s').val()).exists() && newData.child('t').val() === now`
        }
      },
      bids: {
        $r: {
          $s: {
            '.read': isMe('$s'),
            /* 본인 번호로만, 지금 진행 중인 라운드에만, 서버 시각으로 마감 전까지만 */
            '.write': and(isMe('$s'), 'newData.exists()',
              `${st('ph')}.val() === 'bid'`, `${st('rid')}.val() === $r`,
              `now <= ${st('t0')}.val() + ${st('dur')}.val() * 1000 + ${GRACE}`),
            '.validate': "newData.hasChildren(['a', 't'])",
            a: {
              '.validate': `newData.isNumber() && newData.val() % 1 === 0 && newData.val() >= 0 && newData.val() <= 5 && newData.val() <= ${at('core/coins')}.child($s).val()`
            },
            t: { '.validate': 'newData.val() === now' },
            $other: { '.validate': false }
          }
        }
      }
    }
  }
};
