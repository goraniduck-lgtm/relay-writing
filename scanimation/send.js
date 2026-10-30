/* 움직이는 그림 공방 — '선생님께 보내기' (학생 태블릿)
   A5 가로(210×148mm) PDF 두 쪽: ① 합성 그림(일반 종이) ② 줄무늬 필름(OHP)
   두 쪽 모두 그림 자리(150×100mm)가 같은 위치라, 같은 배율로 인쇄하면 정확히 겹쳐짐 */
'use strict';
(function () {
  const PAGE = { w: 210, h: 148 };
  const ART = { x: 30, y: 25, w: 150, h: 100 };
  const $ = id => document.getElementById(id);
  const S = { classes: null, cid: '', roster: [], busy: false, loaded: false };

  /* ---------- 글자를 그림으로 (PDF에 한글 글꼴을 넣지 않기 위해) ---------- */
  function textPng(wmm, hmm, items) {
    const k = 12, c = document.createElement('canvas');
    c.width = Math.round(wmm * k); c.height = Math.round(hmm * k);
    const x = c.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
    x.textBaseline = 'middle';
    for (const it of items) {
      x.font = `${it.bold ? 700 : 400} ${Math.round(it.size * k)}px system-ui,-apple-system,'Noto Sans KR','Apple SD Gothic Neo','Malgun Gothic',sans-serif`;
      x.fillStyle = it.color || '#111';
      x.textAlign = it.align || 'left';
      let t = it.text;
      const max = (it.max || wmm) * k;
      while (t.length > 1 && x.measureText(t).width > max) t = t.slice(0, -2) + '…';
      x.fillText(t, it.x * k, it.y * k);
    }
    return c;
  }
  function who(m) {
    return `${m.className} ${m.no}번 ${m.name}` + (m.title ? `  「${m.title}」` : '');
  }
  function header(kind, m) {
    const t = kind === 1 ? '① 합성 그림 — 일반 흰 종이에 인쇄' : '② 줄무늬 필름 — 투명 OHP 필름에 인쇄';
    return textPng(186, 11, [
      { text: t, x: 0, y: 4, size: 3.4, bold: true, max: 92 },
      { text: who(m), x: 186, y: 4, size: 3.4, bold: true, align: 'right', max: 92 },
      { text: '움직이는 그림 공방 · 스캐니메이션', x: 0, y: 9, size: 2.4, color: '#666' }
    ]);
  }
  function footer(m) {
    return textPng(150, 9, [
      { text: '← 이 선은 인쇄 후 50mm →', x: 0, y: 2.5, size: 2.4, color: '#444' },
      { text: `${m.n}장면 · 조각 폭 ${m.gapMm}mm · 두 쪽을 같은 배율로 인쇄해야 정확히 겹쳐져요 (실제 크기 권장)`, x: 0, y: 7, size: 2.4, color: '#444' }
    ]);
  }
  /* 모서리 맞춤 표시 — 두 쪽에 똑같이 */
  function cropMarks(doc) {
    const g = 2, L = 5, { x, y, w, h } = ART;
    doc.setLineWidth(0.2); doc.setDrawColor(0);
    for (const [cx, cy, sx, sy] of [[x, y, -1, -1], [x + w, y, 1, -1], [x, y + h, -1, 1], [x + w, y + h, 1, 1]]) {
      doc.line(cx + sx * g, cy, cx + sx * (g + L), cy);
      doc.line(cx, cy + sy * g, cx, cy + sy * (g + L));
    }
  }

  /* ---------- A5 PDF 만들기 ---------- */
  function buildPdf(m, jpeg) {
    const { jsPDF } = window.jspdf;
    const info = Scan.info(), art = Scan.output();
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a5', compress: true });
    doc.setProperties({ title: `스캐니메이션 ${who(m)}`, creator: '움직이는 그림 공방' });
    const page = kind => {
      doc.addImage(header(kind, m), 'PNG', 12, 7, 186, 11, 'h' + kind, 'FAST');
      cropMarks(doc);
      doc.setLineWidth(0.3); doc.line(ART.x, 135, ART.x + 50, 135);
      doc.addImage(footer(m), 'PNG', ART.x, 136, 150, 9, 'f' + kind, 'FAST');
    };
    page(1);
    if (jpeg) doc.addImage(art.toDataURL('image/jpeg', 0.92), 'JPEG', ART.x, ART.y, ART.w, ART.h, 'art');
    else doc.addImage(art, 'PNG', ART.x, ART.y, ART.w, ART.h, 'art', 'FAST');
    doc.addPage('a5', 'landscape');
    page(2);
    /* 필름은 그림이 아니라 선(벡터)으로 그려서 어떤 배율에도 선명함 */
    const s = ART.w / info.w;
    doc.setFillColor(0, 0, 0);
    for (let x = info.gap; x < info.w; x += info.stripe) {
      doc.rect(ART.x + x * s, ART.y, Math.min(info.stripe - info.gap, info.w - x) * s, ART.h, 'F');
    }
    return doc;
  }

  /* ---------- 화면 미리 보기 (A5 두 쪽) ---------- */
  function drawPreview() {
    const info = Scan.info(), art = Scan.output(), k = 2;
    for (const kind of [1, 2]) {
      const c = $('sendPage' + kind), x = c.getContext('2d');
      x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height);
      x.fillStyle = '#203044'; x.font = '700 9px system-ui,sans-serif';
      x.fillText(kind === 1 ? '① 합성 그림' : '② 줄무늬 필름', 12 * k, 13 * k);
      x.strokeStyle = '#000'; x.lineWidth = 0.6;
      x.strokeRect(ART.x * k - 3, ART.y * k - 3, ART.w * k + 6, ART.h * k + 6);
      if (kind === 1) x.drawImage(art, ART.x * k, ART.y * k, ART.w * k, ART.h * k);
      else {
        const s = ART.w * k / info.w;
        x.fillStyle = '#000';
        for (let p = info.gap; p < info.w; p += info.stripe) x.fillRect(ART.x * k + p * s, ART.y * k, Math.max(0.6, (info.stripe - info.gap) * s), ART.h * k);
      }
    }
  }

  /* ---------- 장면 미리보기 (선생님 화면에서 움직임) ---------- */
  function thumbs() {
    return Scan.frames().map(f => {
      const c = document.createElement('canvas'); c.width = 210; c.height = 140;
      const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, 210, 140); x.drawImage(f, 0, 0, 210, 140);
      return c.toDataURL('image/jpeg', 0.65);
    });
  }
  function blankScenes() {
    const out = [];
    Scan.frames().forEach((f, i) => {
      const c = document.createElement('canvas'); c.width = 90; c.height = 60;
      const x = c.getContext('2d'); x.drawImage(f, 0, 0, 90, 60);
      const d = x.getImageData(0, 0, 90, 60).data;
      let ink = 0; for (let j = 3; j < d.length; j += 4) if (d[j] > 20) ink++;
      if (ink < 3) out.push(i + 1);
    });
    return out;
  }

  /* ---------- 반·번호 고르기 ---------- */
  function msg(t, cls) { const el = $('sendMsg'); el.textContent = t || ''; el.className = 'sendMsg' + (cls ? ' ' + cls : ''); }
  function prog(r) { const el = $('sendProgress'); el.hidden = r == null; if (r != null) el.firstElementChild.style.width = Math.round(r * 100) + '%'; }
  function lock(b) { S.busy = b; ['sendBtn', 'savePdf', 'sendClass', 'sendNo', 'sendTitle'].forEach(id => { $(id).disabled = b; }); if (!b) $('sendNo').disabled = !S.cid; }

  async function loadClasses() {
    try {
      await DB.ready(true);
      const list = await DB.get('classList');
      S.classes = Object.entries(list || {}).map(([id, c]) => ({ id, ...c })).sort(byName);
      const sel = $('sendClass');
      sel.innerHTML = '<option value="">반을 골라요</option>' + S.classes.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('');
      const want = new URLSearchParams(location.search).get('c') || store.get('scan.cid', '');
      if (want && S.classes.some(c => c.id === want)) { sel.value = want; await pickClass(want); }
      S.loaded = true;
      if (!S.classes.length) msg('아직 선생님이 반을 만들지 않았어요.', 'err');
    } catch (e) {
      console.warn(e);
      $('sendClass').innerHTML = '<option value="">연결 안 됨</option>';
      msg('인터넷에 연결되지 않았어요. 연결을 확인하고 이 탭을 다시 눌러 주세요. (그림은 그대로 있어요)', 'err');
    }
  }
  async function pickClass(cid) {
    S.cid = cid; S.roster = [];
    const sel = $('sendNo');
    sel.innerHTML = '<option value="">불러오는 중…</option>'; sel.disabled = true;
    if (!cid) { sel.innerHTML = '<option value="">반을 먼저 골라요</option>'; return; }
    try {
      S.roster = rosterOf(await DB.get('classes/' + cid));
      sel.innerHTML = '<option value="">번호를 골라요</option>' + S.roster.map(r => `<option value="${r.no}">${r.no}번 ${esc(r.name || '')}</option>`).join('');
      sel.disabled = false;
      const me = store.get('scan.me', null);
      if (me && me.cid === cid && S.roster.some(r => r.no === me.no)) sel.value = String(me.no);
    } catch (e) { console.warn(e); sel.innerHTML = '<option value="">명단을 못 불러왔어요</option>'; }
  }
  function current() {
    const c = (S.classes || []).find(x => x.id === S.cid);
    const no = +$('sendNo').value;
    const r = S.roster.find(x => x.no === no);
    if (!c || !r) return null;
    const info = Scan.info();
    return { cid: c.id, className: c.name, no, name: String(r.name || '').slice(0, 20), title: $('sendTitle').value.trim().slice(0, 20), n: info.n, gapMm: info.gapMm, dpi: info.dpi };
  }
  function fileName(m) { return `스캐니메이션_${m.no}번_${m.name}${m.title ? '_' + m.title : ''}.pdf`.replace(/[\\/:*?"<>|]/g, ''); }

  /* ---------- 보내기 ---------- */
  async function send() {
    if (S.busy) return;
    const m = current();
    if (!m) { msg(!S.cid ? '우리 반을 골라 주세요.' : '내 번호를 골라 주세요.', 'err'); return; }
    const blank = blankScenes();
    if (blank.length && !confirm(`장면 ${blank.join(', ')}이(가) 비어 있어요. 그래도 보낼까요?`)) return;
    if (!confirm(`${m.no}번 ${m.name}(으)로 보낼까요?`)) return;
    lock(true); prog(0.02); msg('PDF를 만드는 중…');
    try {
      await new Promise(r => setTimeout(r, 30));
      /* 사진처럼 색이 많은 그림은 PNG가 매우 커져서, 3MB가 넘으면 고화질 JPEG로 다시 만듦 */
      const enc = jpeg => { const u = buildPdf(m, jpeg).output('datauristring'); return u.slice(u.indexOf(',') + 1); };
      let b64 = enc(false);
      if (b64.length > 4000000) b64 = enc(true);
      const parts = [];
      for (let i = 0; i < b64.length; i += CHUNK) parts.push(b64.slice(i, i + CHUNK));
      if (parts.length > MAX_PARTS) throw new Error('too big');
      const bytes = Math.round(b64.length * 3 / 4);
      prog(0.1); msg('선생님께 보내는 중…');
      await DB.ready(true);
      const uid = DB.uid(), sid = DB.key();
      const th = thumbs();
      await DB.set(`scanimation/subs/${m.cid}/${sid}`, {
        uid, no: m.no, name: m.name, title: m.title, n: m.n, gap: String(m.gapMm), dpi: m.dpi,
        bytes, parts: parts.length, ts: DB.TS(), done: false, th
      });
      await DB.set(`scanimation/files/${sid}`, { uid, cid: m.cid, p: { 0: parts[0] } });
      prog(0.1 + 0.85 / parts.length);
      for (let i = 1; i < parts.length; i++) {
        await DB.set(`scanimation/files/${sid}/p/${i}`, parts[i]);
        prog(0.1 + 0.85 * (i + 1) / parts.length);
      }
      await DB.set(`scanimation/subs/${m.cid}/${sid}/done`, true);
      prog(1);
      store.set('scan.cid', m.cid); store.set('scan.me', { cid: m.cid, no: m.no });
      const t = new Date(); const hm = `${t.getHours()}시 ${String(t.getMinutes()).padStart(2, '0')}분`;
      msg('');
      $('sendDone').innerHTML = `<div class="sentCard"><img src="${th[0]}" alt=""><div><b>보냈어요! 🎉</b><br>${esc(m.no)}번 ${esc(m.name)}${m.title ? ` · 「${esc(m.title)}」` : ''}<br><span class="muted">${hm} · 고쳐서 다시 보내도 돼요</span></div></div>`;
      setTimeout(() => prog(null), 800);
    } catch (e) {
      console.warn(e); prog(null);
      msg(String(e && e.message) === 'too big' ? '작품 파일이 너무 커요. 출력 해상도를 300 dpi로 바꿔서 다시 보내 주세요.'
        : isPerm(e) ? '보낼 수 없어요. 반과 번호를 다시 골라 보세요.'
          : String(e && e.message) === 'offline' ? '인터넷에 연결되지 않았어요. 연결을 확인하고 다시 보내 주세요.'
            : '보내지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.', 'err');
    } finally { lock(false); }
  }
  function savePdf() {
    const m = current() || { className: '', no: '', name: '', title: $('sendTitle').value.trim(), ...(() => { const i = Scan.info(); return { n: i.n, gapMm: i.gapMm, dpi: i.dpi }; })() };
    try { buildPdf(m).save(m.no ? fileName(m) : '스캐니메이션_A5.pdf'); } catch (e) { console.warn(e); msg('PDF를 만들지 못했어요.', 'err'); }
  }

  $('sendClass').onchange = e => { pickClass(e.target.value); };
  $('sendBtn').onclick = send;
  $('savePdf').onclick = savePdf;
  window.SendUI = {
    show() {
      drawPreview();
      if (!S.loaded && !S.loading && !S.busy) { S.loading = true; loadClasses().finally(() => { S.loading = false; }); }
    },
    buildPdf
  };
})();
