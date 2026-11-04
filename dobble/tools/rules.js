/* 딱! 같은 그림 보안 규칙 (dobble/) — mafia/tools/build-rules.js 가 불러서 database.rules.json 에 넣음
   데이터 구조
     dobble/rooms/{네 자리 번호}
       ts            만든 시각 (서버)
       seats/a~f     자리 → 기기(uid). a 는 만든 사람. b~f 는 기다리는 동안, 방 인원(cfg.max) 안에서 비어 있을 때만 본인이 앉음
                     (b~f 는 기다리는 동안에만 스스로 비울 수 있음)
       names/a~f     별명 (그 자리 기기만)
       on/a~f        접속 중 표시 (그 자리 기기만)
       quit/a~f      게임 중에 나감 (그 자리 기기만) — 다른 화면에 '친구가 나갔어요'
       cfg           {set, n, per, max(2~6), seed, st:'wait'|'play', go, players('abc'…)} — 방 안 기기 모두 바꿀 수 있음 (시작·다시 하기)
       claims/{판}   그 판을 가진 자리 'a'~'f' — 비어 있을 때, 자기 자리로만, 참가자일 때만, 시작 시각이 지난 뒤에만
   방 지우기: 그 방의 자리 기기 누구나, 또는 12시간 지난 방은 누구나 (정리용) */
const SEATS = ['a', 'b', 'c', 'd', 'e', 'f'];
const and = (...a) => '(' + a.join(' && ') + ')';
const or = (...a) => '(' + a.join(' || ') + ')';
const roomAt = p => `root.child('dobble/rooms/' + $c + '/${p}')`;
const inRoom = or(...SEATS.map(s => `${roomAt('seats/' + s)}.val() === auth.uid`));
const ownSeat = "root.child('dobble/rooms/' + $c + '/seats/' + $s).val() === auth.uid";
const maxV = `${roomAt('cfg/max')}.val()`;
/* b~f 자리가 방 인원 안인지 (cfg.max 가 없던 예전 방은 2명) */
const seatFits = or("$s === 'b'", ...SEATS.slice(2).map((s, i) => `($s === '${s}' && ${maxV} >= ${i + 3})`));

module.exports = {
  rooms: {
    '.read': 'auth != null',
    $c: {
      '.write': and('auth != null', or(
        and('!data.exists()', "$c.matches(/^[0-9]{4}$/)", "newData.child('seats/a').val() === auth.uid",
          ...SEATS.slice(1).map(s => `!newData.child('seats/${s}').exists()`), "!newData.child('claims').exists()", "newData.child('cfg/st').val() === 'wait'"),
        and('data.exists()', '!newData.exists()', or(...SEATS.map(s => `data.child('seats/${s}').val() === auth.uid`), "data.child('ts').val() < now - 43200000"))
      )),
      '.validate': "newData.hasChildren(['ts', 'seats', 'cfg'])",
      ts: { '.validate': 'newData.isNumber() && (data.exists() ? newData.val() === data.val() : newData.val() === now)' },
      seats: {
        a: { '.validate': 'newData.isString() && (!data.exists() || newData.val() === data.val())' },
        $s: {
          '.write': and('auth != null', "$s.matches(/^[b-f]$/)", `${roomAt('cfg/st')}.val() === 'wait'`, or(
            and('!data.exists()', 'newData.val() === auth.uid', `${roomAt('seats/a')}.exists()`, seatFits),
            and('data.val() === auth.uid', '!newData.exists()'))),
          '.validate': "$s.matches(/^[a-f]$/) && newData.isString()"
        }
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
        n: { '.validate': 'newData.isNumber() && newData.val() >= 3 && newData.val() <= 57' },
        per: { '.validate': 'newData.isNumber() && newData.val() >= 0 && newData.val() <= 30' },
        max: { '.validate': 'newData.isNumber() && newData.val() >= 2 && newData.val() <= 6 && (!data.exists() || newData.val() === data.val())' },
        seed: { '.validate': 'newData.isNumber()' },
        st: { '.validate': "newData.val() === 'wait' || newData.val() === 'play'" },
        go: { '.validate': 'newData.isNumber() && newData.val() <= now + 60000' },
        players: { '.validate': "newData.isString() && newData.val().matches(/^a?b?c?d?e?f?$/) && newData.val().length >= 2" },
        $o: { '.validate': false }
      },
      claims: {
        '.write': and('auth != null', inRoom, '!newData.exists()'),
        $r: {
          '.write': and('auth != null', '!data.exists()', "$r.matches(/^[0-9]{1,2}$/)",
            "root.child('dobble/rooms/' + $c + '/seats/' + newData.val()).val() === auth.uid",
            `${roomAt('cfg/st')}.val() === 'play'`, `${roomAt('cfg/go')}.val() <= now`,
            `(!${roomAt('cfg/players')}.exists() ? (newData.val() === 'a' || newData.val() === 'b') : ${roomAt('cfg/players')}.val().contains(newData.val()))`),
          '.validate': "newData.isString() && newData.val().matches(/^[a-f]$/)"
        }
      },
      $o: { '.validate': false }
    }
  }
};
