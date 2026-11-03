/* 카드 규칙 시험 — node dobble/tools/test-deck.js */
'use strict';
const fs = require('fs');
const path = require('path');
const D = require('../deck.js');
const rd = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');
const SETS = new Function(rd('sets.js') + ';\n' + rd('sets-region.js') + '; return SETS;')();
const MATS = ['heavy', 'light', 'jelly', 'hard'];
let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) pass++; else { fail++; console.log('✗', name); } };

for (const p of [2, 3, 5, 7]) {
  const cards = D.buildCards(p);
  const n = D.symbolsFor(p);
  ok(`차수 ${p}: 카드 ${n}장`, cards.length === n);
  ok(`차수 ${p}: 카드마다 ${p + 1}개, 겹침 없음`, cards.every(c => c.length === p + 1 && new Set(c).size === p + 1));
  let pairsOk = true;
  for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++) {
    if (cards[i].filter(s => cards[j].includes(s)).length !== 1) pairsOk = false;
  }
  ok(`차수 ${p}: 어떤 두 카드든 같은 그림 딱 하나`, pairsOk);
}
ok('개수별 차수', D.orderFor(57) === 7 && D.orderFor(56) === 5 && D.orderFor(13) === 3 && D.orderFor(20) === 3 && D.orderFor(7) === 2 && D.orderFor(6) === 0);

for (const set of SETS) {
  ok(`세트 ${set.id}: 그림 7개 이상`, set.symbols.length >= 7);
  ok(`세트 ${set.id}: 재질 이름 맞음`, set.symbols.every(s => !s.m || MATS.includes(s.m)));
  ok(`세트 ${set.id}: 그림이나 낱말 있음`, set.symbols.every(s => s.e || s.w || s.img));
  const keys = set.symbols.map(s => (s.e || '') + '|' + (s.w || '') + '|' + (s.img || ''));
  ok(`세트 ${set.id}: 같은 그림 두 번 없음`, new Set(keys).size === keys.length);
  for (const seed of [1, 42, 99999, 123456789]) {
    for (const len of [0, 15, 25]) {
      const g = D.makeGame(set, seed, len);
      const g2 = D.makeGame(set, seed, len);
      ok(`세트 ${set.id} 씨앗 ${seed}: 두 태블릿 같은 순서`, JSON.stringify(g.deck) === JSON.stringify(g2.deck));
      ok(`세트 ${set.id} 길이 ${len}`, len === 0 ? g.deck.length === D.symbolsFor(g.p) : g.deck.length === Math.min(len, D.symbolsFor(g.p)));
      let pairs = true;
      for (let i = 0; i < g.deck.length; i++) for (let j = i + 1; j < g.deck.length; j++) {
        const c = D.commonOf(g.deck[i], g.deck[j]);
        if (c < 0 || g.deck[i].filter(s => g.deck[j].includes(s)).length !== 1) pairs = false;
      }
      ok(`세트 ${set.id} 씨앗 ${seed}: 판 안에서도 공통 그림 하나`, pairs);
      for (const card of g.deck) {
        const lay = D.layoutOf(card, seed, set.show !== 'emoji');
        const inside = lay.every(o => Math.hypot(o.x - .5, o.y - .5) + o.size / 2 <= .49);
        let apart = true;
        for (let i = 0; i < lay.length; i++) for (let j = i + 1; j < lay.length; j++) {
          const d = Math.hypot(lay[i].x - lay[j].x, lay[i].y - lay[j].y);
          if (d < (lay[i].size + lay[j].size) / 2 * .78) apart = false;
        }
        if (!inside || !apart || lay.length !== card.length) { ok(`자리 배치 ${set.id} ${seed}`, false); break; }
      }
    }
  }
}
/* 그림 파일 세트: 파일이 있고 출처가 빠짐없이 있음 */
for (const set of SETS) for (const x of set.symbols) if (x.img) {
  ok(`${set.id} 그림 파일 ${x.img}`, fs.existsSync(path.join(__dirname, '..', x.img)));
  if (set.id === 'soc-region') ok(`${x.w} 출처`, x.src && x.src.org && x.src.char && x.src.page && [1, 2, 3, 4].includes(x.src.kogl) && x.note);
}
const region = SETS.find(s => s.id === 'soc-region');
ok('지역 세트 57개 → 카드 8개씩', region && region.symbols.length === 57 && D.makeGame(region, 5, 0).per === 8);
ok('지역 세트: 그림 49 + 낱말 8', region.symbols.filter(x => x.img).length === 49 && region.symbols.filter(x => !x.img && x.w && x.note && x.visit).length === 8);
ok('지역 세트: 낱말이 겹치지 않음', new Set(region.symbols.map(x => x.w)).size === 57);
/* 씨앗이 다르면 다른 판 */
const s0 = SETS[0];
ok('씨앗이 다르면 순서가 다름', JSON.stringify(D.makeGame(s0, 1, 0).deck) !== JSON.stringify(D.makeGame(s0, 2, 0).deck));
/* 20개짜리 세트: 판마다 그중 13개 */
const set20 = { symbols: s0.symbols.slice(0, 20) };
const used = new Set();
for (let s = 1; s < 30; s++) D.makeGame(set20, s, 0).deck.flat().forEach(x => used.add(x));
ok('그림이 남으면 판마다 골고루 씀', used.size === 20);

console.log(`통과 ${pass} · 실패 ${fail}`);
process.exit(fail ? 1 : 0);
