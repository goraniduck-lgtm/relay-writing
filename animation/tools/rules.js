/* 애니메이션 공방 보안 규칙 (animation/) — mafia/tools/build-rules.js 가 불러서 database.rules.json 에 넣음
   (움직이는 그림 공방 규칙과 같은 방식, 결과물만 GIF)
   데이터 구조
     animation/subs/{반}/{제출}   제출 정보 (교사만 전체 읽기, 학생은 자기 제출만 읽기)
     animation/files/{제출}       GIF base64 조각 {uid, cid, p:{0..}} (교사만 읽기)
   학생(익명 로그인)이 할 수 있는 일
     1) 있는 반에 새 제출 만들기 (done:false, 서버 시각)
     2) 그 제출의 PDF 조각 올리기 (아직 done:false 일 때, 조각마다 한 번만)
     3) done 을 true 로 바꾸기 (자기 제출만)
   고치기·지우기는 교사만 */
const T = "'VNW0t5e67CfInsF63jATWdBsaqG2'";
const isT = `(auth != null && auth.uid === ${T})`;
const and = (...a) => a.join(' && ');
const sub = (cid, sid) => `root.child('animation/subs/' + ${cid} + '/' + ${sid})`;
const fileCid = "root.child('animation/files/' + $sid + '/cid').val()";

module.exports = {
  '.read': isT,
  '.write': isT,
  subs: {
    $cid: {
      $sid: {
        '.read': "auth != null && data.child('uid').val() === auth.uid",
        '.write': and('auth != null', '!data.exists()',
          "root.child('classes/' + $cid + '/name').exists()",
          "newData.child('uid').val() === auth.uid",
          "newData.child('done').val() === false",
          "newData.child('ts').val() === now"),
        '.validate': "newData.hasChildren(['uid','no','name','title','frames','fps','w','h','bytes','parts','ts','done'])",
        uid: { '.validate': 'newData.isString()' },
        no: { '.validate': 'newData.isNumber() && newData.val() >= 1 && newData.val() <= 60' },
        name: { '.validate': 'newData.isString() && newData.val().length <= 20' },
        title: { '.validate': 'newData.isString() && newData.val().length <= 20' },
        frames: { '.validate': 'newData.isNumber() && newData.val() >= 1 && newData.val() <= 120' },
        fps: { '.validate': 'newData.isNumber() && newData.val() >= 1 && newData.val() <= 15' },
        w: { '.validate': 'newData.isNumber() && newData.val() >= 16 && newData.val() <= 1920' },
        h: { '.validate': 'newData.isNumber() && newData.val() >= 16 && newData.val() <= 1080' },
        bytes: { '.validate': 'newData.isNumber() && newData.val() > 0 && newData.val() <= 16000000' },
        parts: { '.validate': 'newData.isNumber() && newData.val() >= 1 && newData.val() <= 40' },
        ts: { '.validate': 'newData.isNumber()' },
        done: {
          '.write': and('auth != null', "data.parent().child('uid').val() === auth.uid", 'data.val() === false', 'newData.val() === true'),
          '.validate': 'newData.isBoolean()'
        },
        th: {
          $i: { '.validate': "$i.matches(/^([0-9]|1[01])$/) && newData.isString() && newData.val().length <= 30000 && newData.val().beginsWith('data:image/jpeg;base64,')" }
        },
        $other: { '.validate': false }
      }
    }
  },
  files: {
    $sid: {
      '.write': and('auth != null', '!data.exists()',
        "newData.child('uid').val() === auth.uid",
        `${sub("newData.child('cid').val()", '$sid')}.child('uid').val() === auth.uid`,
        `${sub("newData.child('cid').val()", '$sid')}.child('done').val() === false`),
      '.validate': "newData.hasChildren(['uid','cid','p'])",
      uid: { '.validate': 'newData.isString()' },
      cid: { '.validate': 'newData.isString()' },
      p: {
        $i: {
          '.write': and('auth != null', '!data.exists()',
            "root.child('animation/files/' + $sid + '/uid').val() === auth.uid",
            `${sub(fileCid, '$sid')}.child('done').val() === false`),
          '.validate': '$i.matches(/^[0-9]{1,2}$/) && newData.isString() && newData.val().length <= 500000'
        }
      },
      $other: { '.validate': false }
    }
  }
};
