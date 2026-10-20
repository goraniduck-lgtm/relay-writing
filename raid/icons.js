/* 그림자 용 레이드 — 화면에 쓰는 아이콘과 그림 (SVG)
   img/ 폴더에 같은 자리의 PNG를 넣으면 그 그림이 먼저 보이고, 없으면 이 SVG가 보입니다. */

const ICON_STROKE = 'fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"';

/* ---------- 직업 아이콘 ---------- */
const JOB_ICON = {
  bard: `<svg viewBox="0 0 48 48" ${ICON_STROKE}><path d="M5 35V14c6.5-3 12.5-3 19 1.5C30.5 11 36.5 11 43 14v21c-6.5-3-12.5-3-19 1.5C17.5 32 11.5 32 5 35z"/><path d="M24 15.5v21"/><path d="M10 20.5c3.5-1 6.5-.7 9 .8M10 26.5c3.5-1 6.5-.7 9 .8"/><path d="M38 3.5c2 2.5 2.5 6 .5 9.5-2 3.4-5.5 5-8.5 4.5" stroke-width="2.6"/><path d="M30 17.5l-2 4" stroke-width="2.6"/></svg>`,
  mage: `<svg viewBox="0 0 48 48" ${ICON_STROKE}><path d="M8 42l17-17"/><path d="M27 7l11 19H16z"/><path d="M27 15v6M24 18h6" stroke-width="2.6"/><path d="M40 33v6M37 36h6M9 10v5M6.5 12.5h5" stroke-width="2.6"/></svg>`,
  explorer: `<svg viewBox="0 0 48 48" ${ICON_STROKE}><circle cx="24" cy="24" r="18"/><path d="M24 9l5.5 15L24 39l-5.5-15z" fill="currentColor" fill-opacity=".35"/><path d="M24 9l5.5 15h-11z" fill="currentColor"/><path d="M24 3v3M24 42v3M3 24h3M42 24h3" stroke-width="2.6"/></svg>`,
  alchemist: `<svg viewBox="0 0 48 48" ${ICON_STROKE}><path d="M18 5h12M20.5 5v12L9.5 37.5A3.5 3.5 0 0 0 12.6 43h22.8a3.5 3.5 0 0 0 3.1-5.5L27.5 17V5"/><path d="M14 31.5c4-2 8 2 12 0s6-1 8 .5" stroke-width="2.6"/><circle cx="21" cy="37" r="1.8" fill="currentColor"/><circle cx="28" cy="35" r="1.3" fill="currentColor"/><path d="M36 9l2-2M39 14h3M33 6V3" stroke-width="2.4"/></svg>`
};

/* ---------- 봉인 칸 아이콘 ---------- */
const SEAL_ICON = {
  kor_txt: `<svg viewBox="0 0 48 48" ${ICON_STROKE}><path d="M11 6h24a3 3 0 0 1 3 3v31H14a3 3 0 0 1-3-3z"/><path d="M11 37a3 3 0 0 1 3-3h24"/><path d="M18 14h13M18 20h9"/></svg>`,
  kor_voc: `<svg viewBox="0 0 48 48" ${ICON_STROKE}><path d="M8 9h32a3 3 0 0 1 3 3v17a3 3 0 0 1-3 3H22l-9 8v-8H8a3 3 0 0 1-3-3V12a3 3 0 0 1 3-3z"/><path d="M15 16h7c0 5-2.5 8.5-7 10M27 14v14M27 21h4" /></svg>`,
  kor_sp: `<svg viewBox="0 0 48 48" ${ICON_STROKE}><path d="M30 7l8 8-20 20-10 2 2-10z"/><path d="M26 11l8 8"/><path d="M27 40l4 4 9-10" /></svg>`,
  math: `<svg viewBox="0 0 48 48" ${ICON_STROKE}><path d="M7 41V7l34 34z"/><path d="M15 33V25l8 8z"/><path d="M7 15h4M7 23h4M7 31h4" stroke-width="2.4"/></svg>`,
  soc: `<svg viewBox="0 0 48 48" ${ICON_STROKE}><path d="M5 12l12-5 14 5 12-5v29l-12 5-14-5-12 5z"/><path d="M17 7v29M31 12v29"/><path d="M24 17c0-3 5-3 5 0 0 2.5-2.5 4-2.5 6.5 0-2.5-2.5-4-2.5-6.5z" fill="currentColor" stroke-width="2"/></svg>`,
  sci: `<svg viewBox="0 0 48 48" ${ICON_STROKE}><circle cx="20" cy="20" r="12"/><path d="M29 29l12 12"/><path d="M14 20a6 6 0 0 1 6-6" stroke-width="2.6"/></svg>`
};
const LOCK_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>`;
const sealIconFor = slotKey => SEAL_ICON[slotKey] || SEAL_ICON[slotKey.replace(/\d$/, '')];

/* ---------- 작은 그림 도우미 ---------- */
const _stars = (n, w, h, seed) => {
  let s = seed, out = '';
  const r = () => (s = (s * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < n; i++) out += `<circle cx="${(r() * w).toFixed(1)}" cy="${(r() * h).toFixed(1)}" r="${(0.6 + r() * 1.3).toFixed(1)}" fill="#fff" opacity="${(0.4 + r() * 0.6).toFixed(2)}"/>`;
  return out;
};
const _sky = (id, a, b) => `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>`;
const _house = (x, y, w, c, lit) => `<g><path d="M${x} ${y}l${w / 2} -${w * 0.55}l${w / 2} ${w * 0.55}z" fill="${c}" opacity=".95"/><rect x="${x + w * 0.1}" y="${y}" width="${w * 0.8}" height="${w * 0.7}" fill="${c}"/><rect x="${x + w * 0.38}" y="${y + w * 0.25}" width="${w * 0.24}" height="${w * 0.24}" rx="2" fill="${lit}"/></g>`;
const _kid = (x, y, c, s) => { s = (s || 1) * 1.5; return `<g transform="translate(${x} ${y}) scale(${s})"><circle cx="0" cy="-22" r="7" fill="#ffd9b3"/><path d="M-9 0v-10a9 9 0 0 1 18 0v10z" fill="${c}"/><path d="M-7-26a8 8 0 0 1 14 0" fill="#3a2a20"/></g>`; };
const _dragon = (x, y, s, c, eye) => `<g transform="translate(${x} ${y}) scale(${s})"><path d="M-60 40c18-4 30-16 38-32-12 3-22 1-31-5 16 0 26-5 35-16-10-2-17-7-21-16 14 5 26 5 37 0 9-16 25-23 43-20-5 4-7 9-5 14 12-2 23 4 30 12-9-2-16 0-21 5 7 9 9 20 5 30 9 4 16 11 20 21-11-5-21-5-30 0-5 12-18 21-34 23 4 5 4 11 0 16-7-7-18-11-30-9-12 2-25-2-36-10z" fill="${c}"/><circle cx="34" cy="-36" r="3.5" fill="${eye}"/></g>`;

/* ---------- 구역 그림 ---------- */
const ZONE_ART = {
  kor: `<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice">${_sky('zk', '#2a1d4a', '#5a2c56')}<rect width="320" height="180" fill="url(#zk)"/>${_stars(26, 320, 90, 3)}<circle cx="262" cy="34" r="16" fill="#ffe3a8"/>
    <rect x="0" y="150" width="320" height="30" fill="#1c1430"/>
    <g transform="translate(118 0)">
      <rect x="8" y="128" width="78" height="24" rx="3" fill="#e8708a"/><rect x="8" y="128" width="78" height="5" fill="#fff" opacity=".25"/>
      <rect x="14" y="106" width="66" height="22" rx="3" fill="#b44f8a"/><rect x="14" y="106" width="66" height="4" fill="#fff" opacity=".25"/>
      <rect x="10" y="84" width="72" height="22" rx="3" fill="#f2a0b5"/><rect x="10" y="84" width="72" height="4" fill="#fff" opacity=".3"/>
      <rect x="18" y="64" width="58" height="20" rx="3" fill="#8a3f78"/><rect x="18" y="64" width="58" height="4" fill="#fff" opacity=".25"/>
      <rect x="22" y="46" width="50" height="18" rx="3" fill="#e8708a"/>
      <path d="M18 46L47 12l29 34z" fill="#5a2c56"/><path d="M47 12v-8" stroke="#ffd98a" stroke-width="2"/><path d="M47 4l12 4-12 4z" fill="#ffd98a"/>
      <rect x="40" y="134" width="14" height="18" rx="7" fill="#ffd98a"/><rect x="30" y="90" width="8" height="10" rx="2" fill="#ffd98a"/><rect x="56" y="90" width="8" height="10" rx="2" fill="#ffd98a"/><rect x="42" y="68" width="8" height="10" rx="2" fill="#ffd98a"/>
    </g>
    <path d="M70 60v70" stroke="#c9a46a" stroke-width="2"/><path d="M70 62h22l-6 10 6 10H70z" fill="#e8708a"/>
    <path d="M250 70v70" stroke="#c9a46a" stroke-width="2"/><path d="M250 72h-22l6 10-6 10h22z" fill="#e8708a"/>
    ${_house(18, 138, 30, '#2b2050', '#ffd98a')}${_house(272, 140, 28, '#2b2050', '#ffd98a')}</svg>`,
  math: `<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice">${_sky('zm', '#152349', '#2c4a7a')}<rect width="320" height="180" fill="url(#zm)"/>${_stars(26, 320, 90, 7)}<circle cx="56" cy="32" r="14" fill="#ffe3a8"/>
    <rect x="0" y="150" width="320" height="30" fill="#101a33"/>
    <g transform="translate(130 0)">
      <rect x="10" y="62" width="60" height="90" fill="#2f5b9a"/><rect x="10" y="62" width="60" height="6" fill="#fff" opacity=".2"/>
      <path d="M4 62L40 18l36 44z" fill="#203d6a"/><path d="M40 18V8" stroke="#ffd98a" stroke-width="2"/><circle cx="40" cy="7" r="3" fill="#ffd98a"/>
      <circle cx="40" cy="92" r="20" fill="#eaf3ff" stroke="#6aa8ff" stroke-width="4"/><path d="M40 92V78M40 92l10 6" stroke="#203d6a" stroke-width="3" stroke-linecap="round"/>
      ${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(i => { const a = i * Math.PI / 6; return `<circle cx="${(40 + Math.sin(a) * 15.5).toFixed(1)}" cy="${(92 - Math.cos(a) * 15.5).toFixed(1)}" r="1.2" fill="#203d6a"/>`; }).join('')}
      <rect x="32" y="128" width="16" height="24" rx="8" fill="#ffd98a"/>
    </g>
    <g transform="translate(232 112)" fill="#6aa8ff"><circle r="16"/><circle r="6" fill="#152349"/>${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<rect x="-4" y="-22" width="8" height="9" rx="2" transform="rotate(${i * 45})"/>`).join('')}</g>
    <g transform="translate(78 124)" fill="#9cc4ff"><circle r="10"/><circle r="4" fill="#152349"/>${[0, 1, 2, 3, 4, 5].map(i => `<rect x="-3" y="-15" width="6" height="7" rx="1.5" transform="rotate(${i * 60})"/>`).join('')}</g>
    <path d="M262 60l18 30h-36z" fill="none" stroke="#ffd98a" stroke-width="2.5"/><path d="M30 70h30M45 62v16" stroke="#ffd98a" stroke-width="2.5"/></svg>`,
  soc: `<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice">${_sky('zs', '#2a1b33', '#6a3a24')}<rect width="320" height="180" fill="url(#zs)"/>${_stars(22, 320, 70, 11)}
    <rect x="0" y="146" width="320" height="34" fill="#22141a"/>
    <path d="M0 40q80 26 160 0t160 0" fill="none" stroke="#5a3a28" stroke-width="1.5"/>
    ${[20, 60, 100, 140, 180, 220, 260, 300].map((x, i) => `<g><line x1="${x}" y1="${44 + Math.sin(i) * 6}" x2="${x}" y2="${50 + Math.sin(i) * 6}" stroke="#5a3a28"/><ellipse cx="${x}" cy="${58 + Math.sin(i) * 6}" rx="7" ry="9" fill="#f0a23a"/><ellipse cx="${x}" cy="${58 + Math.sin(i) * 6}" rx="12" ry="14" fill="#f0a23a" opacity=".2"/></g>`).join('')}
    ${[[14, '#f0a23a'], [116, '#e0563f'], [218, '#f0a23a']].map(([x, c]) => `<g><rect x="${x + 6}" y="104" width="76" height="44" fill="#4a2e22"/><path d="M${x} 104h88l-6-22H${x + 6}z" fill="${c}"/>${[0, 1, 2, 3].map(k => `<path d="M${x + 8 + k * 20} 82l-2 22h10l2-22z" fill="#fff" opacity=".35"/>`).join('')}<rect x="${x + 12}" y="118" width="64" height="8" fill="#6b4430"/><circle cx="${x + 24}" cy="114" r="5" fill="#e0563f"/><circle cx="${x + 36}" cy="114" r="5" fill="#ffc94a"/><circle cx="${x + 48}" cy="114" r="5" fill="#7cc46a"/><rect x="${x + 56}" y="108" width="16" height="10" rx="2" fill="#e8d6a8"/></g>`).join('')}
    <path d="M150 150h20l-4 22h-12z" fill="#e8d6a8" opacity=".8"/></svg>`,
  sci: `<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice">${_sky('zc', '#0f2a2e', '#1f5a52')}<rect width="320" height="180" fill="url(#zc)"/>${_stars(28, 320, 90, 17)}<circle cx="60" cy="30" r="12" fill="#ffe3a8"/>
    <rect x="0" y="150" width="320" height="30" fill="#0b1f22"/>
    <g transform="translate(96 0)">
      <rect x="10" y="78" width="120" height="74" fill="#2e6f66"/><rect x="10" y="78" width="120" height="6" fill="#fff" opacity=".15"/>
      <path d="M40 78a30 30 0 0 1 60 0z" fill="#3f8f84"/><path d="M70 50l28-22" stroke="#cfe" stroke-width="6" stroke-linecap="round"/><circle cx="100" cy="27" r="5" fill="#cfe"/>
      ${[24, 58, 92].map(x => `<rect x="${x}" y="96" width="24" height="22" rx="3" fill="#4fcfa4" opacity=".85"/><rect x="${x}" y="96" width="24" height="22" rx="3" fill="#fff" opacity=".15"/>`).join('')}
      <rect x="60" y="126" width="20" height="26" rx="10" fill="#ffd98a"/>
    </g>
    <g transform="translate(250 96)"><path d="M-8 0h16M-6 0v18l-14 26h40l-14-26V0" fill="#4fcfa4" fill-opacity=".35" stroke="#4fcfa4" stroke-width="3" stroke-linejoin="round"/><circle cx="-2" cy="34" r="3" fill="#bfffe8"/><circle cx="6" cy="28" r="2" fill="#bfffe8"/><circle cx="0" cy="-12" r="3" fill="#bfffe8" opacity=".7"/><circle cx="6" cy="-22" r="2" fill="#bfffe8" opacity=".5"/></g>
    <g transform="translate(46 116)"><circle r="14" fill="none" stroke="#bfffe8" stroke-width="3"/><path d="M10 10l14 14" stroke="#bfffe8" stroke-width="4" stroke-linecap="round"/></g></svg>`
};

/* ---------- 결말 장면 그림 (PNG가 없을 때) ---------- */
const BEAM = ['#e8708a', '#6aa8ff', '#f0a23a', '#4fcfa4'];
const SCENE_ART = {
  'strike': `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">${_sky('es1', '#1d1838', '#3b1f3f')}<rect width="400" height="300" fill="url(#es1)"/>${_stars(30, 400, 140, 2)}${_dragon(270, 110, 1.1, '#0b0c16', '#ff6a3d')}
    ${BEAM.map((c, i) => `<path d="M${60 + i * 34} 262L262 110" stroke="${c}" stroke-width="7" stroke-linecap="round" opacity=".85"/>`).join('')}<circle cx="262" cy="110" r="26" fill="#fff6d0"/><circle cx="262" cy="110" r="44" fill="#fff6d0" opacity=".3"/>
    ${BEAM.map((c, i) => _kid(60 + i * 34, 282, c, 1)).join('')}</svg>`,
  'dragon-fall': `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">${_sky('es2', '#2b2350', '#7a4a6a')}<rect width="400" height="300" fill="url(#es2)"/>${_stars(26, 400, 140, 5)}<g opacity=".55">${_dragon(200, 120, 1.15, '#0b0c16', '#ffd98a')}</g>
    ${Array.from({ length: 70 }, (_, i) => { const a = i * 2.39, r = 30 + (i * 37) % 120; return `<circle cx="${(200 + Math.cos(a) * r).toFixed(1)}" cy="${(130 + Math.sin(a) * r * 0.7).toFixed(1)}" r="${1 + (i % 4)}" fill="#ffd98a" opacity="${(0.4 + (i % 5) * 0.12).toFixed(2)}"/>`; }).join('')}
    <rect y="250" width="400" height="50" fill="#1a1430"/>${_house(30, 250, 40, '#251c44', '#ffd98a')}${_house(320, 252, 44, '#251c44', '#ffd98a')}</svg>`,
  'celebrate': `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">${_sky('es3', '#3a3a7a', '#f2a46a')}<rect width="400" height="300" fill="url(#es3)"/>
    ${BEAM.map((c, i) => { const x = 70 + i * 86, y = 60 + (i % 2) * 30; return `<g>${Array.from({ length: 12 }, (_, k) => `<path d="M${x} ${y}l${(Math.cos(k * 0.5236) * 30).toFixed(1)} ${(Math.sin(k * 0.5236) * 30).toFixed(1)}" stroke="${c}" stroke-width="3" stroke-linecap="round"/>`).join('')}<circle cx="${x}" cy="${y}" r="4" fill="#fff"/></g>`; }).join('')}
    <rect y="220" width="400" height="80" fill="#3a2a4a"/>${_house(20, 220, 50, '#4a3560', '#ffd98a')}${_house(330, 222, 52, '#4a3560', '#ffd98a')}
    ${[110, 145, 180, 215, 250, 285].map((x, i) => _kid(x, 282, BEAM[i % 4], 1.1)).join('')}</svg>`,
  'tunnel': `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice"><rect width="400" height="300" fill="#15121f"/><path d="M40 300V140a160 120 0 0 1 320 0v160z" fill="#2a2338"/><path d="M110 300V170a90 80 0 0 1 180 0v130z" fill="#1c1828"/>
    <ellipse cx="200" cy="190" rx="34" ry="40" fill="#ffe9b0"/><ellipse cx="200" cy="190" rx="60" ry="66" fill="#ffe9b0" opacity=".25"/>
    ${[[80, 150], [320, 150]].map(([x, y]) => `<g><line x1="${x}" y1="${y - 20}" x2="${x}" y2="${y}" stroke="#7a6a50" stroke-width="2"/><rect x="${x - 7}" y="${y}" width="14" height="18" rx="3" fill="#f2b84b"/><circle cx="${x}" cy="${y + 9}" r="20" fill="#f2b84b" opacity=".2"/></g>`).join('')}
    ${_kid(150, 286, '#4fcfa4', 1.3)}${_kid(185, 282, '#c9b89a', 1.1)}${_kid(215, 282, '#c9b89a', 1.0)}${_kid(250, 286, '#6aa8ff', 1.3)}</svg>`,
  'reunion': `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">${_sky('es5', '#6a7ac8', '#ffcf8a')}<rect width="400" height="300" fill="url(#es5)"/><circle cx="200" cy="200" r="60" fill="#fff0c0" opacity=".7"/>
    <rect y="214" width="400" height="86" fill="#5a4a6a"/>${_house(20, 214, 54, '#6a5880', '#ffe9b0')}${_house(326, 216, 56, '#6a5880', '#ffe9b0')}
    ${_kid(150, 284, '#e8708a', 1.2)}${_kid(178, 284, '#6aa8ff', 1.2)}${_kid(222, 284, '#f0a23a', 1.2)}${_kid(250, 284, '#4fcfa4', 1.2)}<path d="M186 262q14-10 28 0" stroke="#fff" stroke-width="3" fill="none"/></svg>`,
  'allies': `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">${_sky('es6', '#1d2142', '#3a2b5a')}<rect width="400" height="300" fill="url(#es6)"/>${_stars(24, 400, 120, 9)}<g opacity=".8">${_dragon(300, 90, 0.8, '#0b0c16', '#ff6a3d')}</g>
    ${[60, 130, 200, 270].map((x, i) => `<g><path d="M${x} 190l26 10v30c0 20-26 30-26 30s-26-10-26-30v-30z" fill="${BEAM[i]}" opacity=".9"/><path d="M${x} 205v38M${x - 14} 222h28" stroke="#fff" stroke-width="3" opacity=".7"/></g>`).join('')}
    ${[80, 150, 220].map(x => `<path d="M${x} 180L${x + 150} 100" stroke="#ffd98a" stroke-width="2" stroke-dasharray="4 6"/>`).join('')}</svg>`,
  'wound': `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">${_sky('es7', '#1a1a33', '#4a2a3a')}<rect width="400" height="300" fill="url(#es7)"/>${_stars(30, 400, 200, 13)}<circle cx="320" cy="60" r="22" fill="#ffe3a8"/>
    ${_dragon(200, 120, 1.0, '#0b0c16', '#ff6a3d')}<path d="M170 90l20 18-8 12 22 20M220 70l-10 22 16 10" stroke="#fff6d0" stroke-width="4" fill="none" stroke-linecap="round"/>
    <rect y="250" width="400" height="50" fill="#16121f"/>${_house(40, 252, 40, '#231c36', '#ffd98a')}</svg>`,
  'dragon-sleep': `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">${_sky('es8', '#141a33', '#2b2a50')}<rect width="400" height="300" fill="url(#es8)"/>${_stars(40, 400, 160, 19)}<circle cx="300" cy="60" r="24" fill="#ffe3a8"/><circle cx="310" cy="54" r="22" fill="#141a33"/>
    <path d="M0 260L120 120l70 60 60-90 150 170z" fill="#2a2440"/><path d="M180 230a40 34 0 0 1 80 0z" fill="#0b0c16"/><g opacity=".7">${_dragon(220, 222, 0.32, '#000', '#3a3a5a')}</g>
    <text x="270" y="190" font-size="20" fill="#fff" opacity=".7" font-family="sans-serif">z z</text><rect y="260" width="400" height="40" fill="#1a1630"/></svg>`,
  'promise': `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">${_sky('es9', '#141a33', '#3a2b5a')}<rect width="400" height="300" fill="url(#es9)"/>${_stars(60, 400, 200, 23)}<path d="M40 70q20 -10 40 0" stroke="#ffd98a" stroke-width="2" fill="none"/>
    <rect y="230" width="400" height="70" fill="#3a3550"/>${[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => `<rect x="${i * 42}" y="220" width="24" height="14" fill="#3a3550"/>`).join('')}
    ${_kid(150, 230, '#e8708a', 1.2)}${_kid(180, 230, '#6aa8ff', 1.2)}${_kid(210, 230, '#f0a23a', 1.2)}${_kid(240, 230, '#4fcfa4', 1.2)}</svg>`,
  'new-village': `<svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">${_sky('es10', '#5a6ab0', '#ffb87a')}<rect width="400" height="300" fill="url(#es10)"/><circle cx="200" cy="200" r="50" fill="#ffe0a0"/>
    <path d="M0 230q100-60 200-30t200 0v100H0z" fill="#4f6a4a"/>${_house(150, 196, 34, '#7a5a4a', '#ffe9b0')}${_house(196, 190, 40, '#7a5a4a', '#ffe9b0')}${_house(246, 200, 30, '#7a5a4a', '#ffe9b0')}
    ${_kid(80, 280, '#c9b89a', 1.1)}${_kid(104, 282, '#4fcfa4', 1.2)}${_kid(130, 280, '#c9b89a', 1)}${_kid(300, 282, '#6aa8ff', 1.2)}</svg>`
};
