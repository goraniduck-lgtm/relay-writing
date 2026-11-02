/* 구석구석 다 함께 찾아요 보안 규칙 (gusuk/) — mafia/tools/build-rules.js 가 불러서 database.rules.json 에 넣음
   데이터 구조
     gusuk/cfg                 설정 {home, paint:'all'|'ok', lock, hasPin} (모두 읽기, 관리자만 쓰기)
     gusuk/secret/pin          교사 PIN 8자리 (교사 계정만 읽기, 관리자만 쓰기)
     gusuk/adm/{uid}           이 기기가 아는 PIN — secret/pin 과 같아야만 쓸 수 있음 → 같으면 관리자
     gusuk/ping/{uid}          관리자인지 확인용 (관리자만 쓰기)
     gusuk/dev/{uid}           기기 → 모둠 1~6 (처음 한 번은 본인이, 바꾸기는 관리자만)
     gusuk/cards/{id}          카드 {g,r,c,n,w,m,h,t,src,url,st,memo,ts,up,u,fx,tch}
     gusuk/trash/{id}          지운 카드 (관리자만)
   관리자 = 교사 계정 또는 PIN 을 아는 기기
   학생이 할 수 있는 일
     1) 내 모둠으로 새 카드 만들기 (검토 중, 서버 시각, 활동이 잠기지 않았을 때)
     2) 내 모둠 카드 중 '확인 완료'가 아닌 카드 고치기 (다시 검토 중으로, 선생님 메모·등록 시각은 그대로)
   지우기·확인·수정 요청·설정은 관리자만 */
const T = "'VNW0t5e67CfInsF63jATWdBsaqG2'";
const isT = `(auth != null && auth.uid === ${T})`;
const pin = "root.child('gusuk/secret/pin')";
const isA = `(${isT} || (auth != null && ${pin}.exists() && root.child('gusuk/adm/' + auth.uid).val() === ${pin}.val()))`;
const myG = "root.child('gusuk/dev/' + auth.uid).val()";
const and = (...a) => a.join(' && ');
const or = (...a) => '(' + a.join(' || ') + ')';
const nd = k => `newData.child('${k}')`;
const same = k => `${nd(k)}.val() === data.child('${k}').val()`;
const str = (min, max) => `newData.isString() && newData.val().length >= ${min} && newData.val().length <= ${max}`;
const oneOf = list => '(' + list.map(v => `newData.val() === '${v}'`).join(' || ') + ')';

const studentCreate = and('!data.exists()', `${nd('st')}.val() === 'rv'`, `${nd('ts')}.val() === now`, `${nd('u')}.val() === auth.uid`,
  `!${nd('memo')}.exists()`, `!${nd('tch')}.exists()`, `!${nd('fx')}.exists()`, `!${nd('up')}.exists()`);
const studentFix = and('data.exists()', `data.child('g').val() === ${myG}`, "data.child('st').val() !== 'ok'", `${nd('st')}.val() === 'rv'`,
  same('ts'), same('memo'), same('tch'), same('u'), `${nd('up')}.val() === now`);

module.exports = {
  cfg: {
    '.read': 'auth != null', '.write': isA,
    home: { '.validate': str(3, 6) },
    paint: { '.validate': oneOf(['all', 'ok']) },
    lock: { '.validate': 'newData.isBoolean()' },
    hasPin: { '.validate': 'newData.isBoolean()' },
    $other: { '.validate': false }
  },
  secret: {
    '.read': isT, '.write': isA,
    pin: { '.validate': "newData.isString() && newData.val().matches(/^[0-9]{8}$/)" },
    $other: { '.validate': false }
  },
  adm: {
    $u: {
      '.read': 'auth != null && auth.uid === $u',
      '.write': and('auth != null', 'auth.uid === $u', `(!newData.exists() || newData.val() === ${pin}.val())`)
    }
  },
  ping: { $u: { '.write': and(isA, 'auth.uid === $u') } },
  dev: {
    '.read': isA, '.write': isA,
    $u: {
      '.read': 'auth != null && auth.uid === $u',
      '.write': and('auth != null', 'auth.uid === $u', '!data.exists()'),
      '.validate': 'newData.isNumber() && newData.val() >= 1 && newData.val() <= 6'
    }
  },
  cards: {
    '.read': 'auth != null', '.write': isA,
    $id: {
      '.write': and('auth != null', 'newData.exists()', "root.child('gusuk/cfg/lock').val() !== true", `${nd('g')}.val() === ${myG}`, or(studentCreate, studentFix)),
      '.validate': "newData.hasChildren(['g','r','c','n','w','m','src','st','ts'])",
      g: { '.validate': 'newData.isNumber() && newData.val() >= 0 && newData.val() <= 6' },
      r: { '.validate': str(3, 6) },
      c: { '.validate': oneOf(['fest', 'prod', 'pride', 'sym']) },
      n: { '.validate': str(1, 20) },
      w: { '.validate': str(1, 80) },
      m: { '.validate': str(1, 60) },
      h: { '.validate': str(0, 40) },
      t: { '.validate': str(0, 30) },
      src: { '.validate': oneOf(['gs', 'web', 'book', 'etc']) },
      url: { '.validate': "newData.isString() && newData.val().length <= 300 && newData.val().matches(/^https?:\\/\\//)" },
      st: { '.validate': oneOf(['rv', 'fix', 'ok']) },
      memo: { '.validate': str(1, 60) },
      ts: { '.validate': 'newData.isNumber()' },
      up: { '.validate': 'newData.isNumber()' },
      u: { '.validate': str(1, 128) },
      fx: { '.validate': 'newData.isBoolean()' },
      tch: { '.validate': 'newData.isBoolean()' },
      $other: { '.validate': false }
    }
  },
  trash: { '.read': isA, '.write': isA }
};
