/* 딱! 같은 그림 — 카드 만들기 (도블 규칙: 어떤 두 카드든 같은 그림이 딱 하나)
   유한 사영 평면으로 만듦: 차수 p(소수)이면 그림 p²+p+1개, 카드 p²+p+1장, 카드마다 그림 p+1개
   시험: node dobble/tools/test-deck.js */
'use strict';

/* 같은 씨앗이면 두 태블릿에서 똑같이 나오는 난수 */
function rngOf(seed) {
  let a = (seed >>> 0) || 1;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffleWith(rng, a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

const ORDERS = [7, 5, 3, 2];
const symbolsFor = p => p * p + p + 1;
function orderFor(count) {
  for (const p of ORDERS) if (symbolsFor(p) <= count) return p;
  return 0;
}

/* 차수 p 의 카드 전체 (그림 번호 0 ~ p²+p) */
function buildCards(p) {
  const cards = [];
  const pt = (x, y) => x * p + y;
  for (let m = 0; m < p; m++) {
    for (let b = 0; b < p; b++) {
      const c = [];
      for (let x = 0; x < p; x++) c.push(pt(x, (m * x + b) % p));
      c.push(p * p + m);
      cards.push(c);
    }
  }
  for (let x0 = 0; x0 < p; x0++) {
    const c = [];
    for (let y = 0; y < p; y++) c.push(pt(x0, y));
    c.push(p * p + p);
    cards.push(c);
  }
  const inf = [];
  for (let i = 0; i <= p; i++) inf.push(p * p + i);
  cards.push(inf);
  return cards;
}

/* 한 판 만들기
   set: SETS 의 세트, seed: 씨앗 숫자, length: 쓸 카드 장수 (0 이면 전체)
   돌려줌 { p, per, deck: [[세트 그림 번호...], ...] } */
function makeGame(set, seed, length) {
  const p = orderFor(set.symbols.length);
  if (!p) throw new Error('그림이 7개보다 적어요');
  const rng = rngOf(seed);
  const n = symbolsFor(p);
  const pick = shuffleWith(rng, set.symbols.map((_, i) => i)).slice(0, n);
  let deck = shuffleWith(rng, buildCards(p).map(c => c.map(s => pick[s])));
  if (length > 0 && length < deck.length) deck = deck.slice(0, Math.max(3, length));
  return { p, per: p + 1, deck };
}

/* 두 카드의 같은 그림 */
function commonOf(c1, c2) {
  for (const s of c1) if (c2.includes(s)) return s;
  return -1;
}

/* 카드 위 그림 자리 (지름을 1로 본 비율): [{s, x, y, size, rot}] */
const SLOT = {
  3: { center: null, ring: .25, rs: [.31, .37] },
  4: { center: [.26, .31], ring: .29, rs: [.24, .30] },
  6: { center: [.22, .27], ring: .31, rs: [.19, .25] },
  8: { center: [.20, .25], ring: .32, rs: [.14, .21] }
};
function layoutOf(card, seed, wordy) {
  let h = seed >>> 0;
  for (const s of card) h = Math.imul(h ^ (s + 1), 2654435761) >>> 0;
  const rng = rngOf(h);
  const k = card.length;
  const L = SLOT[k] || SLOT[8];
  const order = shuffleWith(rng, card.slice());
  const out = [];
  const rotMax = wordy ? 18 : 45;
  const rot = () => Math.round((rng() * 2 - 1) * rotMax);
  let i = 0;
  if (L.center) {
    const size = L.center[0] + rng() * (L.center[1] - L.center[0]);
    out.push({ s: order[i++], x: .5 + (rng() - .5) * .03, y: .5 + (rng() - .5) * .03, size, rot: rot() });
  }
  const ringN = k - i, step = Math.PI * 2 / ringN, a0 = rng() * Math.PI * 2;
  for (let j = 0; j < ringN; j++) {
    const a = a0 + j * step + (rng() - .5) * step * .25;
    let size = L.rs[0] + rng() * (L.rs[1] - L.rs[0]);
    const r = Math.min(L.ring + (rng() - .5) * .03, .47 - size / 2);
    out.push({ s: order[i++], x: .5 + Math.cos(a) * r, y: .5 + Math.sin(a) * r, size, rot: rot() });
  }
  return out;
}

if (typeof module !== 'undefined') module.exports = { rngOf, shuffleWith, orderFor, symbolsFor, buildCards, makeGame, commonOf, layoutOf };
