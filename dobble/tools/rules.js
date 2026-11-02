/* 딱! 같은 그림 보안 규칙 (dobble/) — mafia/tools/build-rules.js 가 불러서 database.rules.json 에 넣음
   데이터 구조
     dobble/rooms/{네 자리 번호}
       ts            만든 시각 (서버)
       seats/a, b    자리 → 기기(uid). a 는 만든 사람, b 는 처음 들어온 한 명만
       names/a, b    별명 (그 자리 기기만)
       on/a, b       접속 중 표시 (그 자리 기기만)
       quit/a, b     게임 중에 나감 (그 자리 기기만) — 상대 화면에 '친구가 나갔어요'
       (2번 자리는 기다리는 동안에만 스스로 비울 수 있음)
       cfg           {set, n, seed, st:'wait'|'play', go} — 두 자리 기기 모두 바꿀 수 있음 (시작·다시 하기)
       claims/{판}   그 판을 가진 자리 'a'|'b' — 비어 있을 때 자기 자리로만, 시작 시각이 지난 뒤에만
   방 지우기: 그 방의 두 자리 기기, 또는 12시간 지난 방은 누구나 (정리용) */
const and = (...a) => '(' + a.join(' && ') + ')';
const or = (...a) => '(' + a.join(' || ') + ')';
const roomAt = p => `root.child('dobble/rooms/' + $c + '/${p}')`;
const seatIs = s => `${roomAt('seats/' + s)}.val() === auth.uid`;
const inRoom = or(seatIs('a'), seatIs('b'));
const ownSeat = "root.child('dobble/rooms/' + $c + '/seats/' + $s).val() === auth.uid";

module.exports = {
  rooms: {
    '.read': 'auth != null',
    $c: {
      '.write': and('auth != null', or(
        and('!data.exists()', "$c.matches(/^[0-9]{4}$/)", "newData.child('seats/a').val() === auth.uid", "!newData.child('seats/b').exists()", "!newData.child('claims').exists()"),
        and('data.exists()', '!newData.exists()', or("data.child('seats/a').val() === auth.uid", "data.child('seats/b').val() === auth.uid", "data.child('ts').val() < now - 43200000"))
      )),
      '.validate': "newData.hasChildren(['ts', 'seats', 'cfg'])",
      ts: { '.validate': 'newData.isNumber() && (data.exists() ? newData.val() === data.val() : newData.val() === now)' },
      seats: {
        a: { '.validate': 'newData.isString() && (!data.exists() || newData.val() === data.val())' },
        b: {
          '.write': and('auth != null', or(
            and('!data.exists()', 'newData.val() === auth.uid', `${roomAt('seats/a')}.exists()`),
            and('data.val() === auth.uid', '!newData.exists()', `${roomAt('cfg/st')}.val() === 'wait'`))),
          '.validate': 'newData.isString()'
        },
        $o: { '.validate': false }
      },
      names: {
        $s: { '.write': and('auth != null', ownSeat), '.validate': 'newData.isString() && newData.val().length >= 1 && newData.val().length <= 8' }
      },
      on: {
        $s: { '.write': and('auth != null', ownSeat), '.validate': 'newData.val() === true' }
      },
      quit: {
        $s: { '.write': and('auth != null', ownSeat), '.validate': 'newData.val() === true' }
      },
      cfg: {
        '.write': and('auth != null', inRoom, 'newData.exists()'),
        '.validate': "newData.hasChildren(['set', 'n', 'seed', 'st'])",
        set: { '.validate': 'newData.isString() && newData.val().length <= 40' },
        n: { '.validate': 'newData.isNumber() && newData.val() >= 0 && newData.val() <= 57' },
        seed: { '.validate': 'newData.isNumber()' },
        st: { '.validate': "newData.val() === 'wait' || newData.val() === 'play'" },
        go: { '.validate': 'newData.isNumber() && newData.val() <= now + 60000' },
        $o: { '.validate': false }
      },
      claims: {
        '.write': and('auth != null', inRoom, '!newData.exists()'),
        $r: {
          '.write': and('auth != null', '!data.exists()', "$r.matches(/^[0-9]{1,2}$/)",
            "root.child('dobble/rooms/' + $c + '/seats/' + newData.val()).val() === auth.uid",
            `${roomAt('cfg/st')}.val() === 'play'`, `${roomAt('cfg/go')}.val() <= now`),
          '.validate': "newData.val() === 'a' || newData.val() === 'b'"
        }
      },
      $o: { '.validate': false }
    }
  }
};
