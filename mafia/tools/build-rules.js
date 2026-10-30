/* database.rules.json 생성기 — node mafia/tools/build-rules.js
   교실 마피아는 비밀 정보(역할·미션·투표)가 있어서, 루트 전체 읽기(".read": "auth != null")를
   기존 앱 경로별 읽기로 나누고 mafia/ 아래는 권한별로 따로 열어 둠. */
const fs = require('fs');
const path = require('path');

const T = "'VNW0t5e67CfInsF63jATWdBsaqG2'";
const R = "'mafia/rooms/' + $c";
const at = p => `root.child(${R} + '/${p}')`;
const isT = `(auth != null && auth.uid === ${T})`;
const isH = `(auth != null && ${at('meta/hostKey')}.exists() && root.child(${R} + '/hosts/' + auth.uid + '/key').val() === ${at('meta/hostKey')}.val())`;
const isA = `(${isT} || ${isH})`;
const myPid = `root.child(${R} + '/me/' + auth.uid).val()`;
const isMe = p => `(auth != null && ${myPid} === ${p})`;
const st = k => at('pub/state/' + k);
const phase = `${st('phase')}.val()`;
const roleOf = p => `root.child(${R} + '/roles/' + ${p}).val()`;
const alive = p => `root.child(${R} + '/pub/players/' + ${p} + '/alive').val() === true`;
const roundIs = r => `${st('rk')}.val() === ${r}`;
const open = `${st('open')}.val() === true && ${st('paused')}.val() !== true`;
const and = (...a) => a.join(' && ');

const mafia = {
  index: { '.read': isT, '.write': isT },
  rooms: {
    $c: {
      '.read': isT,
      '.write': isT,
      meta: {},
      hosts: {
        $u: {
          '.read': 'auth != null && auth.uid === $u',
          '.write': and('auth != null', 'auth.uid === $u', `newData.child('key').val() === ${at('meta/hostKey')}.val()`)
        }
      },
      cfg: { '.read': isA, '.write': isA },
      pub: {
        '.read': 'auth != null',
        '.write': isA,
        state: {
          maxR: { '.validate': `newData.isNumber() && (!data.exists() || newData.val() <= data.val() || ${isT})` }
        },
        end: {
          '.validate': `newData.child('method').val() === 'normal' || ${isT} || newData.child('method').val() === data.child('method').val()`
        },
        players: {
          $p: {
            '.write': and('auth != null', '!data.exists()', `${phase} === 'lobby'`,
              `newData.child('uid').val() === auth.uid`,
              `newData.child('alive').val() === true`,
              `newData.parent().parent().parent().child('me/' + auth.uid).val() === $p`,
              `newData.parent().parent().parent().child('names/' + newData.child('key').val()).val() === $p`),
            name: { '.validate': 'newData.isString() && newData.val().length >= 1 && newData.val().length <= 20' },
            ready: { '.write': `${isMe('$p')} && newData.isBoolean()` }
          }
        }
      },
      names: {
        '.read': 'auth != null',
        '.write': isA,
        $k: {
          '.write': and('auth != null', '!data.exists()', `${phase} === 'lobby'`, 'newData.isString()',
            `newData.parent().parent().child('pub/players/' + newData.val() + '/uid').val() === auth.uid`)
        }
      },
      me: {
        '.read': isA,
        '.write': isA,
        $u: {
          '.read': 'auth != null && auth.uid === $u',
          '.write': and('auth != null', 'auth.uid === $u', '!data.exists()', 'newData.isString()',
            `newData.parent().parent().child('pub/players/' + newData.val() + '/uid').val() === auth.uid`)
        }
      },
      presence: {
        '.read': isA,
        '.write': isA,
        $p: { '.write': isMe('$p') }
      },
      roles: {
        '.read': isA,
        '.write': isA,
        $p: { '.read': isMe('$p') }
      },
      team: {
        '.read': `${isA} || (auth != null && ${roleOf(myPid)} === 'mafia')`,
        '.write': isA
      },
      sec: {
        '.read': isA,
        $p: {
          '.read': isMe('$p'),
          $r: {
            id: { '.write': isA },
            m: { '.write': isA },
            lv: { '.write': isA },
            ok: {
              $w: {
                '.write': and(isA, "($w === 'host' || $w === 'teacher')", roundIs('$r'),
                  `(${phase} === 'mission' || ${phase} === 'think' || ${phase} === 'meeting' || ${phase} === 'vote' || ${phase} === 'dayResult')`)
              }
            }
          }
        }
      },
      dv: {
        '.read': isA,
        $r: {
          $s: {
            $p: {
              '.read': isMe('$p'),
              '.write': and(isMe('$p'), '!data.exists()', 'newData.isString()',
                `${phase} === 'vote'`, open, roundIs('$r'), `${st('sk')}.val() === $s`,
                alive('$p'), 'newData.val() !== $p', alive('newData.val()'),
                `($s === '1' || ${st('cands')}.child(newData.val()).exists())`)
            }
          }
        }
      },
      nv: {
        '.read': isA,
        $r: {
          m: {
            $p: {
              '.read': isMe('$p'),
              '.write': and(isMe('$p'), 'newData.isString()', `${phase} === 'night'`, open, roundIs('$r'),
                `${roleOf('$p')} === 'mafia'`, alive('$p'),
                `root.child(${R} + '/sec/' + $p + '/' + $r + '/ok').hasChildren()`,
                alive('newData.val()'), `${roleOf('newData.val()')} !== 'mafia'`)
            }
          },
          d: {
            $p: {
              '.read': isMe('$p'),
              '.write': and(isMe('$p'), 'newData.isString()', `${phase} === 'night'`, open, roundIs('$r'),
                `${roleOf('$p')} === 'doctor'`, alive('$p'), alive('newData.val()'))
            }
          }
        }
      },
      pred: {
        '.read': isA,
        $p: {
          '.read': isMe('$p'),
          '.write': and(isMe('$p'), `root.child(${R} + '/pub/players/' + $p + '/alive').val() === false`, `${phase} !== 'end'`, `${phase} !== 'lobby'`)
        }
      },
      log: { '.read': isA, '.write': isA },
      rejoin: {
        '.read': isA,
        '.write': isA,
        $u: {
          '.read': 'auth != null && auth.uid === $u',
          '.write': and('auth != null', 'auth.uid === $u', "newData.child('name').isString()", "!newData.child('pid').exists()")
        }
      }
    }
  }
};

/* 기존 앱 규칙 (읽기만 경로별로 나눔 — 동작은 그대로) */
const TW = `auth != null && auth.uid === ${T}`;
const rules = {
  rules: {
    classList: { '.read': 'auth != null', '.write': TW },
    classes: { '.read': 'auth != null', '.write': TW },
    archives: { '.read': 'auth != null', '.write': TW },
    archiveIndex: { '.read': 'auth != null', '.write': TW },
    stories: {
      '.read': 'auth != null', '.write': TW,
      $cid: { $gid: { '.write': 'auth != null && data.exists() && newData.exists()' } }
    },
    presence: {
      '.read': 'auth != null', '.write': TW,
      $cid: { $no: { '.write': 'auth != null' } }
    },
    relayDrawing: {
      '.read': 'auth != null', '.write': TW,
      games: { $cid: { '.write': "auth != null && root.child('relayDrawing/classes/' + $cid).exists()" } }
    },
    raid: {
      '.read': 'auth != null', '.write': TW,
      games: { $cid: { '.write': "auth != null && root.child('raid/classes/' + $cid).exists()" } }
    },
    relay: { '.read': 'auth != null' },   // 예전 데이터 (읽기만 그대로)
    mafia,
    auction: require('../../auction/tools/rules.js'),   // 자리 경매
    scanimation: require('../../scanimation/tools/rules.js')   // 움직이는 그림 공방
  }
};

/* 빈 객체 정리 */
(function clean(o) { for (const k of Object.keys(o)) if (o[k] && typeof o[k] === 'object') { clean(o[k]); if (!Object.keys(o[k]).length) delete o[k]; } })(rules);

const out = path.join(__dirname, '..', '..', 'database.rules.json');
fs.writeFileSync(out, JSON.stringify(rules, null, 2) + '\n');
console.log('written', out, fs.statSync(out).size, 'bytes');
