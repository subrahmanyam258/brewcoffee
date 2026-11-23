/* 3BB Demo Lite: local scenario launcher (demo tooling, not product code).
 * Opens a live Web SDK session on the 3BB Demo Lite project and decorates the agents' real replies
 * with cards, agent badges and FAQ topic tags. Nothing here changes what the agents say. */
(() => {
  'use strict';
  const cfg = window.DEMO_CONFIG || {};
  const PROFILES = window.LITE_PROFILES, SCEN = window.LITE_SCENARIOS, FAQS = window.LITE_FAQS || [];
  const $ = (id) => document.getElementById(id);
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  // One icon and colour per agent; the journey panel follows the same order.
  const AGENTS = {
    Lite_Welcome_Agent: { ic: '👋', c: 'var(--a-welcome)', en: 'Welcome', th: 'ต้อนรับ', role: 'Greets, verifies, routes' , pen: "Greets you and confirms it's really you", pth: 'ทักทายและยืนยันตัวตนของคุณ' },
    Lite_Inbound_Agent: { ic: '📞', c: 'var(--a-inbound)', en: 'Inbound care', th: 'บริการลูกค้า', role: 'Registered caller' , pen: 'Helps a registered caller with any request', pth: 'ดูแลลูกค้าที่โทรเข้าในทุกเรื่อง' },
    Lite_Bill_Agent: { ic: '🧾', c: 'var(--a-bill)', en: 'Billing', th: 'ค่าบริการ', role: 'Amount, FAQs, payment date' , pen: 'Overdue amount, bill questions and your payment date', pth: 'ยอดค้างชำระ คำถามเรื่องบิล และวันที่ชำระ' },
    Lite_Supervisor: { ic: '🧭', c: 'var(--a-super)', en: 'Supervisor', th: 'ผู้ประสานงาน', role: 'Routes up to two requests' , pen: 'Routes each request to the right specialist', pth: 'ส่งต่อคำขอไปยังผู้เชี่ยวชาญที่ถูกต้อง' },
    Lite_Points_Agent: { ic: '⭐', c: 'var(--a-points)', en: 'AIS Points', th: 'คะแนน AIS', role: 'Balance, expiry, register' , pen: 'AIS Points balance, expiry and registration', pth: 'คะแนนคงเหลือ วันหมดอายุ และการลงทะเบียน' },
    Lite_Rewards_Agent: { ic: '🎁', c: 'var(--a-rewards)', en: 'Privileges', th: 'สิทธิพิเศษ', role: 'List and redeem' , pen: 'Shows privileges and redeems them with points', pth: 'แสดงสิทธิพิเศษและแลกด้วยคะแนน' },
    Lite_Roaming_Agent: { ic: '✈️', c: 'var(--a-roaming)', en: 'Roaming', th: 'โรมมิ่ง', role: 'Status, packs, activate' , pen: 'Roaming status and packages for your trip', pth: 'สถานะโรมมิ่งและแพ็กเกจสำหรับการเดินทาง' },
    Collection_Survey_Agent: { ic: '📝', c: 'var(--a-survey)', en: 'Survey', th: 'แบบสอบถาม', role: '1 to 5 rating' , pen: 'Asks for your 1 to 5 rating', pth: 'ขอคะแนนความพึงพอใจ 1 ถึง 5' },
  };
  const TOPIC = { billing: { ic: '💳', en: 'Billing FAQ', th: 'FAQ ค่าบริการ' }, points: { ic: '⭐', en: 'Points FAQ', th: 'FAQ คะแนน' }, roaming: { ic: '✈️', en: 'Roaming FAQ', th: 'FAQ โรมมิ่ง' } };
  const T = {
    en: { endT: 'Conversation closed', endS: 'Thanks for chatting with AIS. Need anything else? Start a new chat any time.', endBtn: 'Start a new chat', closed: 'This chat is closed', ph: 'Type a message…', handoff: (n) => `Handing over to ${n}`, back: (n) => `Back with ${n}`, langTo: 'Switched to English', online: 'Online · replies in your language' },
    th: { endT: 'จบการสนทนาแล้ว', endS: 'ขอบคุณที่ใช้บริการแชท AIS ต้องการความช่วยเหลือเพิ่มเติม เริ่มแชทใหม่ได้ทุกเมื่อค่ะ', endBtn: 'เริ่มแชทใหม่', closed: 'แชทนี้ปิดแล้ว', ph: 'พิมพ์ข้อความ…', handoff: (n) => `กำลังส่งต่อไปยัง ${n}`, back: (n) => `กลับมาที่ ${n}`, langTo: 'เปลี่ยนเป็นภาษาไทย', online: 'ออนไลน์ · ตอบตามภาษาของคุณ' },
  };

  const st = { scenario: SCEN[0], lang: SCEN[0].lang, profile: 'daniel', entryOverride: null };
  let turnEl = null, turnAgents = new Set(), lastDateSaid = '';
  let endTimer = null, pickedDate = null;
  let sdk = null, chat = null, runToken = 0, queue = Promise.resolve(), seen = new Set();
  let curLang = 'th', curAgent = null, used = new Set(), turns = 0, faqs = 0, sentAt = 0, lastBotAt = 0, ended = false, sdkReady = null, autoOn = false;

  // ── controls ─────────────────────────────────────────────────────────────
  SCEN.forEach((s, i) => { const o = document.createElement('option'); o.value = i; o.textContent = i === 0 ? s.title.en : `${i}. ${s.title.en}`; $('ctlScenario').appendChild(o); });
  $('ctlScenario').onchange = (e) => { st.scenario = SCEN[+e.target.value]; st.lang = st.scenario.lang; st.profile = st.scenario.profile; $('ctlProfile').value = st.profile; st.entryOverride = null; syncSeg(); renderPanel(); };
  Object.entries(PROFILES).forEach(([k, p]) => { const o = document.createElement('option'); o.value = k; o.textContent = p.label; $('ctlProfile').appendChild(o); });
  $('ctlProfile').value = st.profile;
  $('ctlProfile').onchange = (e) => { st.profile = e.target.value; };
  document.querySelectorAll('#ctlLang button').forEach((b) => (b.onclick = () => { st.lang = b.dataset.v; syncSeg(); }));
  function syncSeg() { document.querySelectorAll('#ctlLang button').forEach((b) => b.classList.toggle('on', b.dataset.v === st.lang)); }
  $('btnStart').onclick = () => { autoOn = false; run(); };
  $('btnScript').onclick = () => { $('drawer').hidden = !$('drawer').hidden; };
  $('drawerClose').onclick = () => { $('drawer').hidden = true; };
  $('btnAuto').onclick = async () => { autoOn = true; await run(); autoPlay(runToken); };

  // ── Ari mascot: idle, think, talk, walk, wave ──────────────────────────
  let ariTimer = null, sayTimer = null;
  function ari(state, caption, ms = 2600) {
    const m = $('mascot'); if (!m) return;
    m.className = 'mascot ' + state;
    clearTimeout(ariTimer);
    if (state !== 'idle' && state !== 'think') ariTimer = setTimeout(() => { m.className = 'mascot idle'; }, ms);
    if (caption) {
      const s = $('say'); s.textContent = caption; s.classList.add('on');
      clearTimeout(sayTimer); sayTimer = setTimeout(() => s.classList.remove('on'), Math.max(ms, 2200));
    }
  }
  const SAY = {
    hi: { en: 'Hi! I\'m Ari 👋', th: 'สวัสดีค่ะ อารีย์เองค่ะ 👋' },
    think: { en: 'Let me check… 🤔', th: 'ขอตรวจสอบสักครู่นะคะ 🤔' },
    kb: { en: 'Found it in the knowledge base 📚', th: 'เจอคำตอบในฐานความรู้แล้วค่ะ 📚' },
    hand: { en: (n) => `Bringing in ${n}…`, th: (n) => `ส่งต่อให้ ${n} นะคะ…` },
    done: { en: 'All done! 🎉', th: 'เรียบร้อยค่ะ! 🎉' },
    lang: { en: 'Switching to English 🌐', th: 'เปลี่ยนเป็นภาษาไทยค่ะ 🌐' },
    sms: { en: 'Link sent to your phone 📲', th: 'ส่งลิงก์ไปที่มือถือแล้วค่ะ 📲' },
    bye: { en: 'Thank you, goodbye! 👋', th: 'ขอบคุณค่ะ สวัสดีค่ะ 👋' },
  };
  // Ari's eyes follow the pointer while idle or talking.
  window.addEventListener('pointermove', (e) => {
    const m = $('mascot'); if (!m || m.classList.contains('think') || m.classList.contains('walk')) return;
    const r = m.getBoundingClientRect(); const cx = r.left + r.width / 2, cy = r.top + r.height * 0.35;
    const dx = e.clientX - cx, dy = e.clientY - cy, d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / 300);
    m.style.setProperty('--px', (dx / d * 5 * k).toFixed(1) + 'px'); m.style.setProperty('--py', (dy / d * 4 * k).toFixed(1) + 'px');
  });
  const sayL = (k, x) => { const v = SAY[k][curLang] || SAY[k].en; return typeof v === 'function' ? v(x) : v; };

  function setConn(kind, text) { $('conn').className = 'conn ' + kind; $('conn').lastElementChild.textContent = text; }

  // ── presenter panel ──────────────────────────────────────────────────────
  function renderPanel() {
    const s = st.scenario;
    $('pitch').textContent = s.pitch;
    $('shows').innerHTML = s.shows.map((x) => `<span>${esc(x)}</span>`).join('');
    $('lines').innerHTML = '';
    s.lines.forEach((l) => {
      const line = typeof l === 'string' ? { text: l } : l;
      const b = document.createElement('button'); b.dataset.text = line.text;
      b.innerHTML = `<span class="tx">${esc(line.text)}</span>${line.note ? `<span class="nt">${esc(line.note)}</span>` : ''}`;
      b.onclick = () => { b.classList.add('done'); send(line.text); markNext(); };
      $('lines').appendChild(b);
    });
    markNext();
    if ($('journey')) $('journey').innerHTML = Object.entries(AGENTS).map(([k, a]) => `<li data-a="${k}" style="--ac:${a.c}" title="${a.pen}"><span class="ic">${a.ic}</span><span><b>${a.en} <em>${a.th}</em></b><small>${a.pen}</small></span></li>`).join('');
    $('intel').innerHTML = '<li class="empty">Each customer message appears here with what Ari understood, which agents handled it and how fast it answered.</li>';
  }
  function markNext() {
    const btns = [...$('lines').children]; btns.forEach((x) => x.classList.remove('next'));
    const n = btns.find((x) => !x.classList.contains('done')); if (n) n.classList.add('next');
  }
  function markAgent(name) {
    if ($('journey')) document.querySelectorAll('#journey li').forEach((li) => { li.classList.toggle('now', li.dataset.a === name); if (used.has(li.dataset.a)) li.classList.add('used'); });

  }
  function signal(text) {
    if (!turnEl) return;
    const tags = turnEl.querySelector('.tags');
    if ([...tags.children].some((x) => x.textContent === text)) return;
    const s = document.createElement('span'); s.textContent = text; tags.appendChild(s);
  }
  function newTurn(text) {
    const box = $('intel'); box.querySelector('.empty')?.remove();
    const li = document.createElement('li'); li.className = 'turn';
    li.innerHTML = `<span class="n">${turns}</span><div><div class="q">“${esc(text.length > 90 ? text.slice(0, 88) + '…' : text)}”</div><div class="tags"></div></div><span class="t">…</span>`;
    box.appendChild(li); box.scrollTop = box.scrollHeight; turnEl = li; turnAgents = new Set();
  }
  // Live account tiles on the left react to what happens in the chat.
  function tile(id, b, em, cls) {
    const el = $(id); if (!el) return;
    if (b != null) el.querySelector('b').textContent = b;
    if (em != null) el.querySelector('em').textContent = em;
    el.classList.remove('good', 'bad'); if (cls) el.classList.add(cls);
    el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 1600);
  }

  // ── chat rendering ───────────────────────────────────────────────────────
  const scrollDown = () => { const m = $('messages'); m.scrollTop = m.scrollHeight; };
  function addRow(kind, text, agent) {
    const row = document.createElement('div'); row.className = 'row ' + kind;
    if (kind === 'bot' && AGENTS[agent]) {
      const a = AGENTS[agent]; row.style.setProperty('--ac', a.c);
      row.innerHTML = `<span class="badge"><span class="ic">${a.ic}</span><span class="bt"><b>${esc(a[curLang] || a.en)}</b><small>${esc(curLang === 'th' ? a.pth : a.pen)}</small></span></span>`;
    }
    const b = document.createElement('div'); b.className = 'bubble'; b.textContent = text; row.appendChild(b);
    $('messages').appendChild(row); scrollDown(); return row;
  }
  function addEvent(html, cls = '') { const e = document.createElement('div'); e.className = 'event ' + cls; e.innerHTML = html; $('messages').appendChild(e); scrollDown(); return e; }
  function addCard(html) { const c = document.createElement('div'); c.className = 'card'; c.innerHTML = html; $('messages').appendChild(c); scrollDown(); return c; }
  async function typeOut(el, text, token) {
    const step = Math.max(2, Math.round(text.length / 60));
    for (let i = 0; i <= text.length; i += step) { if (token !== runToken) return; el.textContent = text.slice(0, i); scrollDown(); await sleep(14); }
    el.textContent = text;
  }
  function chips(list) {
    $('chips').innerHTML = '';
    list.forEach((t) => { const c = document.createElement('button'); c.className = 'chip'; c.textContent = t; c.onclick = () => send(t); $('chips').appendChild(c); });
  }
  function confetti() {
    const box = $('confetti'); const colors = ['#7ab800', '#00444d', '#f59e0b', '#ec4899', '#6366f1', '#14b8a6'];
    for (let i = 0; i < 70; i++) { const p = document.createElement('i'); p.style.left = Math.random() * 100 + 'vw'; p.style.background = colors[i % colors.length]; p.style.animationDelay = Math.random() * 0.6 + 's'; box.appendChild(p); setTimeout(() => p.remove(), 2600); }
  }
  // Themed celebrations (no confetti): plane for roaming, receipt for payment, gift for privileges, buzz for SMS.
  // Destination airport for the flight scene and the boarding pass.
  const AIRPORTS = [
    [/japan|ญี่ปุ่น/i, 'NRT', 'Tokyo', 'โตเกียว', '🇯🇵'], [/korea|เกาหลี/i, 'ICN', 'Seoul', 'โซล', '🇰🇷'], [/singapore|สิงคโปร์/i, 'SIN', 'Singapore', 'สิงคโปร์', '🇸🇬'],
    [/china|จีน/i, 'PEK', 'Beijing', 'ปักกิ่ง', '🇨🇳'], [/hong kong|ฮ่องกง/i, 'HKG', 'Hong Kong', 'ฮ่องกง', '🇭🇰'], [/usa|america|อเมริกา/i, 'LAX', 'Los Angeles', 'ลอสแอนเจลิส', '🇺🇸'],
    [/europe|ยุโรป/i, 'CDG', 'Paris', 'ปารีส', '🇪🇺'],
  ];
  const PACKS = { 3: ['2 GB', '399'], 7: ['5 GB', '799'], 15: ['12 GB', '1,299'] };
  function airport(dest) { const a = AIRPORTS.find(([rx]) => rx.test(dest || '')); return a ? { code: a[1], city: curLang === 'th' ? a[3] : a[2], flag: a[4] } : { code: 'INT', city: dest || '', flag: '🌏' }; }
  // Flight scene as a chat card: sky, clouds, the route drawn from Bangkok, an airliner with a contrail, then "roaming active".
  function flyPlane(dest, days) {
    const th = curLang === 'th', to = airport(dest), pk = PACKS[+days] || ['', ''];
    const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    const D = 'M 120 468 C 330 140, 690 140, 880 372';
    const c = addCard(`<div class="flt-panel">
        <div class="flt-sun"></div><i class="cl c1"></i><i class="cl c2"></i><i class="cl c3"></i><i class="cl c4"></i>
        <svg class="flt-svg" viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
          <defs><linearGradient id="trailG" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity=".2"/><stop offset="1" stop-color="#fff" stop-opacity=".95"/></linearGradient>
            <filter id="pShadow" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="0" dy="8" stdDeviation="5" flood-color="#00444d" flood-opacity=".35"/></filter></defs>
          <path id="fltRoute" d="${D}" fill="none" stroke="rgba(255,255,255,.6)" stroke-width="5" stroke-dasharray="3 18" stroke-linecap="round"/>
          <path class="flt-trail" d="${D}" fill="none" stroke="url(#trailG)" stroke-width="9" stroke-linecap="round"/>
          <g><circle cx="120" cy="468" r="34" class="pulse"/><circle cx="120" cy="468" r="14" fill="#fff" stroke="#00444d" stroke-width="6"/></g>
          <g class="flt-b"><circle cx="880" cy="372" r="34" class="pulse"/><circle cx="880" cy="372" r="14" fill="#7ab800" stroke="#fff" stroke-width="6"/></g>
          <g class="flt-plane" filter="url(#pShadow)">
            <g transform="scale(2.1)">
              <path d="M-30 0 C-30 -3 -26 -4.5 -18 -4.5 L 20 -4.5 C 30 -4.5 36 -2 36 0 C 36 2 30 4.5 20 4.5 L -18 4.5 C -26 4.5 -30 3 -30 0 Z" fill="#fff"/>
              <path d="M 4 -4 L -10 -30 L -2 -30 L 18 -4 Z M 4 4 L -10 30 L -2 30 L 18 4 Z" fill="#e8f3ef"/>
              <path d="M -22 -4 L -30 -16 L -25 -16 L -14 -4 Z M -22 4 L -30 16 L -25 16 L -14 4 Z" fill="#e8f3ef"/>
              <path d="M 24 -2.6 C 30 -2.4 33 -1.2 33.5 0 L 24 0 Z" fill="#00444d" opacity=".75"/>
              <rect x="-14" y="-1.2" width="30" height="2.4" rx="1.2" fill="#7ab800"/>
            </g>
            ${reduce ? '' : '<animateMotion dur="2.7s" begin="indefinite" fill="freeze" rotate="auto" calcMode="spline" keyPoints="0;1" keyTimes="0;1" keySplines=".45 .05 .35 1"><mpath href="#fltRoute"/></animateMotion>'}
          </g>
        </svg>
        <div class="flt-cap">✈️ ${th ? 'กำลังเปิดโรมมิ่ง' : 'Turning on roaming'} · <b>${esc(dest)}</b>${days ? ` · ${days} ${th ? 'วัน' : 'days'}` : ''}</div>
        <div class="flt-pin a" style="left:12%;top:78%"><b>BKK</b><small>${th ? 'กรุงเทพฯ' : 'Bangkok'} 🇹🇭</small></div>
        <div class="flt-pin b" style="left:88%;top:62%"><b>${to.code}</b><small>${esc(to.city)} ${to.flag}</small></div>
        <div class="flt-done"><span class="ok">✓</span><div><b>${th ? 'โรมมิ่งพร้อมใช้งาน' : 'Roaming active'}</b><small>${days ? `${days} ${th ? 'วัน' : 'days'} · ${pk[0]} · ฿${pk[1]} · ` : ''}${th ? 'เริ่มเมื่อถึงปลายทาง' : 'starts on arrival'}</small></div></div>
      </div>`);
    c.classList.add('fltcard'); c.style.cssText = 'padding:0;border:0;background:transparent;box-shadow:none';
    const root = c.querySelector('.flt-panel'), trail = c.querySelector('.flt-trail'), anim = c.querySelector('animateMotion'), plane = c.querySelector('.flt-plane');
    // Unique ids per card so several flights in one chat do not share a route.
    const uid = 'f' + Date.now(); c.querySelector('#fltRoute').id = uid + 'r'; c.querySelector('#trailG').id = uid + 'g'; c.querySelector('#pShadow').id = uid + 's';
    c.querySelector('mpath') && c.querySelector('mpath').setAttribute('href', '#' + uid + 'r');
    trail.setAttribute('stroke', `url(#${uid}g)`); plane.setAttribute('filter', `url(#${uid}s)`);
    const len = trail.getTotalLength(); trail.style.strokeDasharray = len; trail.style.strokeDashoffset = len;
    plane.setAttribute('transform', reduce ? 'translate(880 372) rotate(30)' : 'translate(120 468)');
    requestAnimationFrame(() => root.classList.add('on'));
    setTimeout(() => {
      if (anim) { plane.removeAttribute('transform'); anim.beginElement(); }
      trail.style.transition = reduce ? 'none' : 'stroke-dashoffset 2.7s cubic-bezier(.45,.05,.35,1)'; trail.style.strokeDashoffset = '0';
    }, reduce ? 0 : 500);
    setTimeout(() => {
      root.classList.add('landed');
      const cap = root.querySelector('.flt-cap'); if (cap) cap.innerHTML = `🛬 ${th ? 'ยินดีต้อนรับสู่' : 'Welcome to'} <b>${esc(to.city)}</b> ${to.flag}`;
      scrollDown();
    }, reduce ? 200 : 3200);
  }
  function buzzPhone(text) {
    const ph = $('phone'); ph.classList.remove('buzz'); void ph.offsetWidth; ph.classList.add('buzz');
    const n = document.createElement('div'); n.className = 'notif'; n.textContent = '📲 ' + text; ph.querySelector('.phone-screen').appendChild(n);
    setTimeout(() => n.remove(), 4000);
  }

  function setLang(l, announce) {
    if (l === curLang) return;
    curLang = l; $('langPill').textContent = l.toUpperCase(); $('langPill').classList.remove('flip'); void $('langPill').offsetWidth; $('langPill').classList.add('flip');
    $('chatSub').textContent = T[l].online; $('input').placeholder = ended ? T[l].closed : T[l].ph;
    relabel();
    if (announce) { addEvent(`🌐 ${T[l].langTo}`, 'lang'); signal('🌐 Language switch'); ari('wave', sayL('lang'), 2000); }
  }
  const isThai = (t) => /[ก-๙]/.test(t);
  function relabel() {
    const th = curLang === 'th', p = profile();
    $('heroTitle').textContent = th ? `สวัสดี ${p.display.th}` : `Hi ${p.display.en.split(' ')[0]}`;
    $('heroSub').textContent = th ? 'บัญชี 3BB Fibre ของคุณมียอดค้างชำระ' : 'Your 3BB Fibre account has a pending payment.';
    $('tBillL').textContent = th ? 'ค่าอินเทอร์เน็ต 3BB Fibre' : '3BB Fibre bill';
    $('tPtsL').textContent = th ? 'คะแนน AIS Points' : 'AIS Points';
    $('tRoamL').textContent = th ? 'โรมมิ่ง' : 'Roaming';
    $('tSmsL').textContent = th ? 'ลิงก์แชทผ่าน SMS' : 'Web-chat link';
    $('intelT').textContent = th ? 'ความเข้าใจในบทสนทนา' : 'Conversation intelligence';
  }

  // ── cards drawn around the agents' replies ───────────────────────────────
  function profile() { return PROFILES[st.profile] || PROFILES[st.scenario.profile]; }
  function afterBot(text, agent) {
    const p = profile(), th = curLang === 'th', low = text.toLowerCase();
    const faq = FAQS.find((f) => text.startsWith(f.en.slice(0, 40)) || text.startsWith(f.th.slice(0, 30)));
    if (faq) { faqs++; const tp = TOPIC[faq.topic]; signal(`${tp.ic} ${tp.en} · ${faq.id}`); return `<span class="faqtag">${tp.ic} ${th ? tp.th : tp.en} · ${esc(th ? faq.title[1] : faq.title[0])} · KB ${faq.id}</span>`; }
    if (agent === 'Lite_Bill_Agent' && /(ending in|ลงท้ายด้วย)/.test(text)) {
      addCard(`<h4>${th ? 'ยอดค้างชำระ' : 'Amount overdue'}</h4><div class="bill-amt">฿${p.amount}</div><div class="bill-row"><span>${th ? 'เบอร์' : 'Line'} •••• ${p.line}</span><span>${th ? 'ครบกำหนด' : 'Due'} ${p.due}</span></div><div class="bill-row"><span>3BB Fibre</span><span class="status">${th ? 'เลยกำหนด' : 'Overdue'}</span></div>`);
      signal('🛡️ Amount protected from barge-in');
      chips(th ? ['ชำระผ่านช่องทางไหนได้บ้าง', 'เช็คคะแนน AIS Points', 'อยากชำระตอนนี้เลย', 'ไม่ว่างค่ะ'] : ['How can I pay?', 'How many AIS Points do I have?', 'I want to pay now', "I'm busy right now"]);
    } else if (/(your number has .* ais points|คะแนน ais points คงเหลือ)/i.test(text) && !/(three privileges|แลกสิทธิพิเศษได้สามรายการ)/i.test(text)) {
      tile('tPts', null, th ? 'เพิ่งตรวจสอบ' : 'Balance just checked', 'good');
      const c = addCard(`<h4>${th ? 'AIS Points คงเหลือ' : 'AIS Points balance'}</h4><div class="flexr"><div class="ring"><b>${p.points.toLocaleString()}</b></div><div><b>${esc(p.display[curLang])}</b><br><small>${p.tier} · ${th ? '300 คะแนนหมดอายุ 31 ธ.ค.' : '300 expire 31 Dec'}</small></div></div>`);
      requestAnimationFrame(() => c.querySelector('.ring').style.setProperty('--p', 78));
    } else if (/(three packages|สามแพ็กเกจ)/i.test(text)) {
      const c = addCard(`<h4>✈️ ${th ? 'แพ็กเกจโรมมิ่ง' : 'Roaming packages'}</h4><div class="packs">${[[3, '399', '2 GB'], [7, '799', '5 GB'], [15, '1,299', '12 GB']].map(([d, pr, g]) => `<div class="pack" data-d="${d}"><b>${d} ${th ? 'วัน' : 'days'}</b>฿${pr}<br><small>${g}</small></div>`).join('')}</div>`);
      c.querySelectorAll('.pack').forEach((el) => (el.onclick = () => { el.classList.add('sel'); send(th ? `${el.dataset.d} วัน` : `the ${el.dataset.d} day one`); }));
    } else if (/(activate the|ยืนยันสมัครแพ็กเกจ|redeem .* points\?|ยืนยันแลก)/i.test(text)) {
      chips(th ? ['ใช่ ยืนยันค่ะ', 'ไม่เป็นไรค่ะ'] : ['Yes please', 'No thanks']);
    } else if (/(roaming package for .* is active|สมัครแพ็กเกจโรมมิ่ง.*แล้ว|is redeemed|แลก.*แล้ว)/i.test(text)) {
      signal('🎉 Transaction done'); ari('happy', sayL('done'), 2600);
      if (/roaming|โรมมิ่ง/i.test(text)) {
        const mm = text.match(/(\d+)-day roaming package for ([^.]+?) is|แพ็กเกจโรมมิ่ง (\d+) วันสำหรับ(\S+?)แล้ว/);
        const dest = mm ? (mm[2] || mm[4]) : (th ? 'ปลายทาง' : 'Destination'), days = mm ? (mm[1] || mm[3]) : '';
        flyPlane(dest, days);
      } else {
        addCard(`<div class="gift"><div class="box">🎁</div><div class="coupon">${th ? 'คูปองพร้อมใช้ในแอป myAIS' : 'Coupon ready in myAIS'} ✓</div></div>`);
      }
      if (/roaming|โรมมิ่ง/i.test(text)) { const m = text.match(/(\d+)-day roaming package for ([^.]+?) is|แพ็กเกจโรมมิ่ง (\d+) วันสำหรับ(\S+?)แล้ว/); tile('tRoam', m ? `${m[2] || m[4]} · ${m[1] || m[3]} ${th ? 'วัน' : 'days'}` : (th ? 'เปิดใช้แล้ว' : 'Active'), th ? 'เริ่มเมื่อถึงปลายทาง' : 'Starts on arrival', 'good'); }
      else { const m = text.match(/(\d[\d,]*) points left|คงเหลือ (\d[\d,]*) คะแนน/); if (m) tile('tPts', m[1] || m[2], th ? 'แลกสิทธิ์แล้ว' : 'Privilege redeemed', 'good'); }
    } else if (/(three privileges|แลกสิทธิพิเศษได้สามรายการ)/i.test(text)) {
      const items = th ? [['คูปองกาแฟ', 200], ['สติกเกอร์ไลน์', 100], ['ส่วนลด AIS Playbox', 500]] : [['Coffee voucher', 200], ['LINE sticker set', 100], ['Playbox ฿300 off', 500]];
      const c = addCard(`<h4>🎁 ${th ? 'สิทธิพิเศษ' : 'Privileges'}</h4><div class="priv">${items.map(([n, pt], i) => `<button data-i="${i + 1}"><span>${n}</span><b>${pt} pts</b></button>`).join('')}</div>`);
      c.querySelectorAll('button').forEach((b) => (b.onclick = () => send(String(b.dataset.i))));
    } else if (/(text message|ข้อความ sms|เอสเอ็มเอส)/i.test(low)) {
      showSms(); signal('💬 Web-chat link sent by SMS'); ari('wave', sayL('sms'), 2600);
      setTimeout(() => buzzPhone(th ? 'AIS: ข้อความใหม่ 1 ข้อความ' : 'AIS: 1 new message'), 300);
      tile('tSms', th ? 'ส่งแล้ว ✓' : 'Sent ✓', th ? 'SMS ภาษาไทย' : 'SMS in English', 'good');
      tile('tBill', null, th ? 'ส่งลิงก์ชำระทาง SMS แล้ว' : 'Pay link sent by SMS', 'good');
    } else if (/(rate .*service|ประเมินการให้บริการ|score from 1 to 5|คะแนน 1 ถึง 5)/i.test(text)) {
      const c = addCard(`<h4>📝 ${th ? 'ให้คะแนนบริการ' : 'Rate the service'}</h4><div class="stars">${[1, 2, 3, 4, 5].map((n) => `<button data-n="${n}" aria-label="${n}">⭐</button>`).join('')}</div>`);
      c.querySelectorAll('button').forEach((b) => (b.onclick = () => { c.querySelectorAll('button').forEach((x) => x.classList.toggle('on', +x.dataset.n <= +b.dataset.n)); send(b.dataset.n); }));
    } else if (/(will pay|ขอบคุณค่ะ อารีย์ขอแนะนำ|thank you\. i would like to recommend)/i.test(text)) {
      signal('📅 Promise to pay captured');
      ari('happy', th ? 'บันทึกวันชำระแล้วค่ะ ✓' : 'Promise saved ✓', 2600);
      tile('tBill', th ? 'สัญญาว่าจะชำระ' : 'Promise to pay', pickedDate ? pickedDate.label : (th ? 'บันทึกแล้ว' : 'Date saved'), 'good');
      const pr = profile();
      const rc = addCard(`<div class="receipt"><h4>🧾 ${th ? 'ใบนัดชำระ' : 'Payment promise'}</h4><div class="r"><span>${th ? 'ลูกค้า' : 'Customer'}</span><b>${esc(pr.display[curLang])}</b></div><div class="r"><span>${th ? 'ยอด' : 'Amount'}</span><b>฿${pr.amount}</b></div><div class="r"><span>${th ? 'วันที่จะชำระ' : 'Pay on'}</span><b>${pickedDate ? pickedDate.label : esc(lastDateSaid || (th ? 'ตามที่แจ้ง' : 'as agreed'))}</b></div><div class="r"><span>${th ? 'ช่องทาง' : 'Channel'}</span><b>myAIS · Banking app</b></div><span class="stamp">${th ? 'บันทึกแล้ว ✓' : 'PROMISE SAVED ✓'}</span></div>`);
      rc.style.padding = '0'; rc.style.border = '0'; rc.style.background = 'transparent'; rc.style.boxShadow = 'none';
    }
    if (agent === 'Lite_Bill_Agent' && /(right here in the chat|ในแชทนี้ได้เลย)/i.test(text)) payCard();
    if (agent === 'Lite_Bill_Agent' && /(to brighten your day|ให้คุณลูกค้าได้ผ่อนคลาย)/i.test(text)) treatCard('comfort');
    if (agent === 'Lite_Bill_Agent' && /(as a thank-you, please enjoy|เพื่อเป็นการขอบคุณ)/i.test(text)) treatCard('thanks');
    if (agent === 'Lite_Bill_Agent' && /(paid by card and|ด้วยบัตรเรียบร้อย)/i.test(text)) {
      signal(th ? '💳 ชำระด้วยบัตรแล้ว' : '💳 Paid by card');
      ari('happy', th ? 'ชำระเรียบร้อยค่ะ ✓' : 'Paid in full ✓', 2600);
      tile('tBill', th ? 'ชำระแล้ว' : 'Paid', th ? 'ชำระด้วยบัตร' : 'Paid by card', 'good');
    }
    if (agent === 'Lite_Bill_Agent' && /(convenient to pay by|สะดวกมั้ยคะ|back to your bill|กลับมาเรื่องค่าบริการ|which day works|สะดวกชำระวันไหน|earliest day you could pay|สะดวกชำระเร็วที่สุดวันไหน)/i.test(text)) dateCard();
    return '';
  }
  // Date picker under the payment-date question. Each choice is sent as the customer's own words.
  function dateCard() {
    const th = curLang === 'th', now = new Date();
    const dEn = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], dTh = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัส', 'ศุกร์', 'เสาร์'];
    const mEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], mTh = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const days = [];
    for (let i = 0; i < 8; i++) { const d = new Date(now); d.setDate(now.getDate() + i); days.push(d); }
    const say = (d, i) => {
      const dn = th ? dTh[d.getDay()] : dEn[d.getDay()], mn = th ? mTh[d.getMonth()] : mEn[d.getMonth()];
      if (i === 0) return th ? 'จะชำระวันนี้ค่ะ' : "I'll pay today";
      if (i === 1) return th ? 'จะชำระพรุ่งนี้ค่ะ' : "I'll pay tomorrow";
      return th ? `จะชำระวัน${dn}ที่ ${d.getDate()} ${mn} ค่ะ` : `I'll pay on ${dn} ${d.getDate()} ${mn}`;
    };
    const cell = (d, i) => { const lab = i === 0 ? (th ? 'วันนี้' : 'Today') : i === 1 ? (th ? 'พรุ่งนี้' : 'Tomorrow') : (th ? dTh[d.getDay()] : dEn[d.getDay()].slice(0, 3)); return `<button class="day${i === 1 ? ' rec' : ''}" data-i="${i}"><small>${lab}</small><b>${d.getDate()}</b><small>${th ? mTh[d.getMonth()] : mEn[d.getMonth()]}</small></button>`; };
    document.querySelectorAll('.card.datecard').forEach((x) => x.remove());
    const c = addCard(`<h4>📅 ${th ? 'เลือกวันที่สะดวกชำระ' : 'When can you pay?'}</h4><button class="paynow-opt"><span class="pn-ic">💳</span><span class="pn-tx"><b>${th ? 'ชำระตอนนี้เลย' : 'Pay now'}</b><small>${th ? 'บัตรเครดิต/เดบิต · ปลอดภัย ไม่มีค่าธรรมเนียม' : 'Credit or debit card · secure, no fee'}</small></span><span class="pn-go">›</span></button><div class="or"><span>${th ? 'หรือเลือกวันที่จะชำระ' : 'or pick a day to pay'}</span></div><div class="dates">${days.map(cell).join('')}</div><div class="pick"><input type="date" min="${now.toISOString().slice(0, 10)}"><button>${th ? 'เลือก' : 'Choose'}</button></div>`);
    const choose = (d, i, btn) => {
      c.querySelectorAll('.day').forEach((x) => x.classList.remove('sel')); if (btn) btn.classList.add('sel');
      pickedDate = { d: d.getDate(), mon: th ? mTh[d.getMonth()] : mEn[d.getMonth()], label: `${th ? dTh[d.getDay()] : dEn[d.getDay()]} ${d.getDate()} ${th ? mTh[d.getMonth()] : mEn[d.getMonth()]} ${d.getFullYear()}` };
      send(say(d, i));
    };
    c.classList.add('datecard');
    c.querySelector('.paynow-opt').onclick = () => { c.querySelectorAll('button').forEach((x) => (x.disabled = true)); send(th ? 'ขอชำระตอนนี้เลยค่ะ' : 'I want to pay now'); };
    c.querySelectorAll('.day').forEach((b) => (b.onclick = () => choose(days[+b.dataset.i], +b.dataset.i, b)));
    c.querySelector('.pick button').onclick = () => { const v = c.querySelector('input').value; if (!v) return; const d = new Date(v + 'T12:00:00'); const diff = Math.round((d - new Date(now.toDateString())) / 864e5); choose(d, diff <= 1 ? Math.max(diff, 0) : 9, null); };
  }

  // Free airport food/drink privilege as an e-coupon (web only). 'comfort' after "I can't pay", 'thanks' after a card payment.
  function treatCard(kind) {
    const th = curLang === 'th', pr = profile(), v = pr.privilege;
    if (!v) return;
    const code = (v.brand.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase()) + '-' + String(Date.now()).slice(-6);
    const head = kind === 'thanks' ? (th ? '🎉 ขอบคุณที่ชำระค่าบริการ' : '🎉 Thanks for paying') : (th ? '💚 ของขวัญเล็กๆ จากอารีย์' : '💚 A little treat, on us');
    const qr = Array.from({ length: 81 }, (_, i) => `<i class="${(i * 5 + (i % 9) * 7 + code.length) % 4 < 2 ? 'on' : ''}"></i>`).join('');
    const c = addCard(`<div class="treat" style="--brand:${v.color};--brand-2:${v.accent}">
        <div class="tr-top"><span class="tr-kicker">${head}</span><span class="tr-tier">AIS Serenade · ${esc(v.tier)}</span></div>
        <div class="tr-body">
          <div class="tr-logo">${v.icon}</div>
          <div class="tr-main"><b class="tr-brand">${esc(v.brand)}</b><div class="tr-benefit">${esc(th ? v.benefit.th : v.benefit.en)}</div>
            <div class="tr-where">✈️ ${(th ? v.where.th : v.where.en).map((x) => `<span>${esc(x)}</span>`).join('')}</div></div>
        </div>
        <div class="tr-cut"><i></i></div>
        <div class="tr-foot"><div class="tr-qr">${qr}</div><div class="tr-meta"><small>${th ? 'รหัสคูปอง' : 'Coupon code'}</small><b>${code}</b><small>${th ? 'ใช้ได้ถึง 31 ม.ค. 2570 · แสดงที่เคาน์เตอร์' : 'Valid until 31 Jan 2027 · show at the counter'}</small></div>
          <span class="tr-free">${th ? 'ฟรี' : 'FREE'}</span></div>
      </div>`);
    c.classList.add('treatcard'); c.style.cssText = 'padding:0;border:0;background:transparent;box-shadow:none';
    signal(kind === 'thanks' ? (th ? '🎁 คูปองขอบคุณ ' : '🎁 Thank-you treat · ') + v.brand : (th ? '💚 มอบของขวัญปลอบใจ · ' : '💚 Comfort treat · ') + v.brand);
    ari('happy', kind === 'thanks' ? (th ? 'ของขวัญขอบคุณค่ะ 🎁' : 'A thank-you treat 🎁') : (th ? 'อารีย์เป็นกำลังใจให้นะคะ 💚' : 'A little treat for you 💚'), 2800);
  }

  // Card payment template (web only): shown when Ari offers to take the payment in the chat.
  function payCard() {
    const th = curLang === 'th', pr = profile();
    const cd = pr.card || { holder: pr.display.en.toUpperCase(), number: '4242 4242 4242 4242', exp: '12/28' };
    document.querySelectorAll('.card.datecard, .card.paycard').forEach((x) => x.remove());
    const c = addCard(`<div class="pay-head"><span class="pay-brand">3BB <b>Fibre</b></span><span class="pay-lock">🔒 ${th ? 'ชำระอย่างปลอดภัย' : 'Secure payment'}</span></div>
      <div class="pay-amt"><small>${th ? 'ยอดที่ต้องชำระ' : 'Amount due'}</small><b>฿${pr.amount}</b><small>${th ? 'อินเทอร์เน็ตบ้าน ลงท้าย' : 'Home internet ending'} ${pr.line}</small></div>
      <div class="pay-tabs"><button class="on" data-m="card">💳 ${th ? 'บัตร' : 'Card'}</button><button data-m="qr">▦ PromptPay</button></div>
      <div class="pay-body" data-m="card">
        <div class="cc"><div class="cc-chip"></div><div class="cc-num"></div><div class="cc-row"><span class="cc-name"></span><span class="cc-exp"></span></div><div class="cc-logo"></div></div>
        <div class="pay-fields"><label>${th ? 'ชื่อบนบัตร' : 'Name on card'}<input class="f-name" value="${esc(cd.holder)}" autocomplete="cc-name" maxlength="26"></label><label>${th ? 'หมายเลขบัตร' : 'Card number'}<input class="f-num" value="${esc(cd.number)}" inputmode="numeric" autocomplete="cc-number" maxlength="19"></label><div class="pf2"><label>${th ? 'หมดอายุ' : 'Expiry'}<input class="f-exp" value="${esc(cd.exp)}" inputmode="numeric" maxlength="5" placeholder="MM/YY"></label><label>CVV<input class="f-cvv" type="password" value="123" inputmode="numeric" maxlength="4"></label></div></div>
      </div>
      <div class="pay-body" data-m="qr" hidden><div class="qr"></div><small>${th ? 'สแกนด้วยแอปธนาคาร (เดโม)' : 'Scan with your banking app (demo)'}</small></div>
      <button class="pay-btn">${th ? 'ชำระ' : 'Pay'} ฿${pr.amount}</button>
      <button class="pay-alt">${th ? 'ขอเลือกวันชำระแทน' : 'Choose a day to pay instead'}</button>`);
    c.classList.add('paycard');
    const qr = c.querySelector('.qr'); qr.innerHTML = Array.from({ length: 121 }, (_, i) => `<i class="${(i * 7 + (i % 11) * 3) % 5 < 2 ? 'on' : ''}"></i>`).join('');
    c.querySelectorAll('.pay-tabs button').forEach((b) => (b.onclick = () => {
      c.querySelectorAll('.pay-tabs button').forEach((x) => x.classList.toggle('on', x === b));
      c.querySelectorAll('.pay-body').forEach((x) => (x.hidden = x.dataset.m !== b.dataset.m));
    }));
    c.querySelector('.pay-alt').onclick = () => { c.remove(); dateCard(); };
    // The card face follows what the customer types: name, number (masked), expiry and brand.
    const fName = c.querySelector('.f-name'), fNum = c.querySelector('.f-num'), fExp = c.querySelector('.f-exp');
    const brand = (d) => (/^4/.test(d) ? 'VISA' : /^(5[1-5]|2[2-7])/.test(d) ? 'Mastercard' : /^35/.test(d) ? 'JCB' : /^3[47]/.test(d) ? 'AMEX' : '');
    const digits = () => fNum.value.replace(/\D/g, '').slice(0, 16);
    const paint = () => {
      const d = digits(), groups = (d.padEnd(16, '•').match(/.{1,4}/g) || []);
      c.querySelector('.cc-num').textContent = groups.map((g, i) => (i === 0 || i === 3 ? g : (g.replace(/\d/g, '•')))).join(' ');
      c.querySelector('.cc-name').textContent = (fName.value.trim() || (th ? 'ชื่อบนบัตร' : 'NAME ON CARD')).toUpperCase();
      c.querySelector('.cc-exp').textContent = fExp.value.trim() || 'MM/YY';
      const b = brand(d); c.querySelector('.cc-logo').textContent = b; c.querySelector('.cc').dataset.brand = b.toLowerCase();
    };
    fNum.oninput = () => { const d = digits(); fNum.value = (d.match(/.{1,4}/g) || []).join(' '); paint(); };
    fExp.oninput = () => { const d = fExp.value.replace(/\D/g, '').slice(0, 4); fExp.value = d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d; paint(); };
    fName.oninput = paint;
    paint();
    const btn = c.querySelector('.pay-btn');
    btn.onclick = async () => {
      if (btn.disabled) return;
      c.querySelectorAll('button, input').forEach((x) => (x.disabled = true));
      btn.classList.add('busy'); btn.innerHTML = `<span class="spin"></span> ${th ? 'กำลังดำเนินการ…' : 'Processing…'}`;
      await sleep(1400);
      btn.classList.remove('busy'); btn.classList.add('ok'); btn.innerHTML = `✓ ${th ? 'ชำระเรียบร้อย' : 'Payment successful'}`;
      c.querySelector('.pay-alt').remove();
      const ref = 'TXN' + String(Date.now()).slice(-8);
      c.insertAdjacentHTML('beforeend', `<div class="pay-done"><div class="pd-check">✓</div><div><b>฿${pr.amount} ${th ? 'ชำระแล้ว' : 'paid'}</b><small>${th ? 'เลขอ้างอิง' : 'Ref'} ${ref} · ${brand(digits()) || (th ? 'บัตร' : 'Card')} •••• ${digits().slice(-4)} · ${esc(fName.value.trim().toUpperCase())}</small></div></div>`);
      scrollDown();
      await sleep(700);
      send.fromCard = true; try { await send(th ? 'ชำระด้วยบัตรเรียบร้อยแล้วค่ะ' : "I've paid by card"); } finally { send.fromCard = false; }
    };
  }

  function showSms() {
    const l = curLang, link = `${location.origin}/?entry=reminder_link&lang=${l}`;
    $('phone').hidden = false; $('callView').hidden = true; $('smsView').hidden = false; $('stage').classList.add('with-phone');
    $('smsText').textContent = l === 'th' ? 'AIS: ดำเนินการเรื่องค่าบริการ 3BB Fibre ต่อในแชทได้ที่ลิงก์นี้' : 'AIS: continue with your 3BB Fibre bill in our chat:';
    $('smsLinkText').textContent = link.replace(/^https?:\/\//, '');
    $('smsNote').textContent = l === 'th' ? 'แตะลิงก์เพื่อเปิดแชท AIS' : 'Tap the link to open the AIS chat';
    $('smsLink').onclick = () => { st.scenario = SCEN.find((x) => x.id === 's2'); st.lang = l; st.entryOverride = 'reminder_link'; $('ctlScenario').value = SCEN.indexOf(st.scenario); syncSeg(); renderPanel(); run(true); };
  }

  // ── conversation closed ──────────────────────────────────────────────────
  function endCard(token) {
    if (token !== runToken || ended) return;
    ended = true;
    const t = T[curLang];
    $('typing').hidden = true; $('chips').innerHTML = '';
    $('input').disabled = true; $('input').value = ''; $('input').placeholder = t.closed;
    const el = document.createElement('div'); el.className = 'end-card';
    el.innerHTML = `<div class="lock">🔒</div><b>${t.endT}</b><p>${t.endS}</p><button class="btn-primary">${t.endBtn}</button>`;
    el.querySelector('button').onclick = () => run();
    $('messages').appendChild(el); scrollDown();
    setConn('idle', 'Chat closed'); markAgent(null); ari('wave', sayL('bye'), 3200);
  }

  // ── platform messages ────────────────────────────────────────────────────
  function onMessage(m, token) {
    if (token !== runToken || !m || m.role === 'user') return;
    const meta = m.metadata || {};
    const text = (m.content || '').trim();
    if (meta.activityKind === 'handoff' || m.role === 'system') return;
    if (!text || /^[\s.…,]*$/.test(text)) return;
    if (/this conversation has been completed/i.test(text)) { queue = queue.then(() => endCard(token)); return; }
    if (seen.has(m.id)) return; seen.add(m.id);
    const agent = meta.agentName || curAgent;
    queue = queue.then(async () => {
      if (token !== runToken || ended) return;
      if (!lastBotAt && sentAt && turnEl) {
        const sec = (Date.now() - sentAt) / 1000, fast = sec < 1.6;
        turnEl.classList.add(fast ? 'fast' : 'ai');
        turnEl.querySelector('.t').textContent = `${fast ? '⚡' : '🧠'} ${sec.toFixed(1)}s`;
      }
      if (turnEl && AGENTS[agent] && !turnAgents.has(agent)) { turnAgents.add(agent); signal(`${AGENTS[agent].ic} ${AGENTS[agent].en}`); }
      lastBotAt = Date.now();
      if (agent && agent !== curAgent) {
        const a = AGENTS[agent];
        if (curAgent && a) ari('walk', sayL('hand', a.ic + ' ' + (a[curLang] || a.en)), 2000);
        if (curAgent && a) addEvent(`<span class="baton">↪</span> ${T[curLang].handoff(a.ic + ' ' + (a[curLang] || a.en))} · <small>${esc(curLang === 'th' ? a.pth : a.pen)}</small>`);
        curAgent = agent; used.add(agent); markAgent(agent);
      }
      setLang(isThai(text) ? 'th' : 'en', true);
      $('typingWho').textContent = AGENTS[agent] ? AGENTS[agent].ic : '';
      $('typing').hidden = false; scrollDown(); await sleep(320); $('typing').hidden = true;
      const row = addRow('bot', '', agent);
      await typeOut(row.querySelector('.bubble'), text, token);
      const m = $('mascot');
      if (m && !m.classList.contains('walk')) ari('talk', null, 1400);
      const tag = afterBot(text, agent);
      if (tag) ari('talk', sayL('kb'), 2000);
      if (tag) row.insertAdjacentHTML('beforeend', tag);
      scrollDown();
      endTimer = null;
      const bye = /(goodbye|สวัสดีค่ะ\s*$|สวัสดีครับ\s*$)/i.test(text);
      // The survey's goodbye (or the "chat has ended" reply) is final: lock the chat now so the
      // presenter cannot keep sending cue cards into a finished session.
      if (/this chat has ended|การสนทนานี้จบแล้ว/i.test(text)) { endCard(token); }
      else if (bye && agent === 'Collection_Survey_Agent') { $('input').disabled = true; sleep(2500).then(() => endCard(token)); }
      else if (bye) { const mark = (endTimer = Symbol('end')); sleep(6000).then(() => { if (endTimer === mark) endCard(token); }); }
    });
  }

  // ── session ──────────────────────────────────────────────────────────────
  function loadSdk() {
    if (sdkReady) return sdkReady;
    sdkReady = new Promise((resolve, reject) => {
      const s = document.createElement('script'); s.src = `${cfg.endpoint}/api/sdk/embed/script`;
      s.onload = () => { const g = window.AgentSDK; const C = g && (g.AgentSDK || (typeof g === 'function' ? g : null)); C ? resolve(C) : reject(new Error('AgentSDK global missing')); };
      s.onerror = () => reject(new Error(`Could not load the SDK from ${cfg.endpoint}`));
      document.head.appendChild(s);
    });
    return sdkReady;
  }
  async function teardown() { const old = sdk; sdk = null; chat = null; if (!old) return; try { await old.endSession?.(); } catch { /* ignore */ } try { old.disconnect?.(); } catch { /* ignore */ } }

  async function run(fromSms) {
    const token = ++runToken;
    ended = false; endTimer = null; pickedDate = null; seen = new Set(); used = new Set(); curAgent = null; turns = 0; faqs = 0; sentAt = 0; lastBotAt = 0; queue = Promise.resolve();
    await teardown();
    const s = st.scenario, p = profile(), entry = st.entryOverride || s.entry;
    curLang = st.lang; renderPanel();
    $('messages').innerHTML = ''; $('chips').innerHTML = ''; $('input').disabled = false; $('input').placeholder = T[curLang].ph;
    $('langPill').textContent = curLang.toUpperCase(); $('chatSub').textContent = T[curLang].online;
    $('siteMe').textContent = '👤 ' + p.display[curLang];
    relabel();
    $('heroAmount').textContent = '฿' + p.amount; $('heroPoints').textContent = p.points.toLocaleString();
    const th0 = curLang === 'th';
    [['tBill', null, th0 ? `เลยกำหนด · ครบกำหนด ${p.due}` : `Overdue · due ${p.due}`, 'bad'], ['tPts', null, p.tier, ''], ['tRoam', th0 ? 'ยังไม่มีแพ็กเกจ' : 'No package', th0 ? 'พร้อมเดินทาง' : 'Ready to travel', ''], ['tSms', th0 ? 'ยังไม่ส่ง' : 'Not sent', th0 ? 'SMS ตามภาษาของการสนทนา' : 'SMS in the chat language', '']].forEach(([id, b, em, cls]) => { const el = $(id); if (b != null) el.querySelector('b').textContent = b; el.querySelector('em').textContent = em; el.classList.remove('good', 'bad', 'flash'); if (cls) el.classList.add(cls); });
    turnEl = null;
    $('chat').hidden = true; $('phone').hidden = true; $('callView').hidden = true; $('smsView').hidden = true; $('stage').classList.remove('with-phone');
    if (entry === 'reminder_link' && !fromSms) {
      $('phone').hidden = false; $('smsView').hidden = false; $('stage').classList.add('with-phone');
      $('smsText').textContent = curLang === 'th' ? `AIS: ค่าอินเทอร์เน็ตบ้าน 3BB Fibre เบอร์ •••• ${p.line} ยอด ฿${p.amount} เลยกำหนดชำระ แตะลิงก์เพื่อคุยกับผู้ช่วย AIS` : `AIS: Your 3BB Fibre bill for •••• ${p.line} (฿${p.amount}) is overdue. Tap the secure link to sort it out with the AIS assistant.`;
      $('smsLinkText').textContent = 'ais.th/pay/secure-link';
      $('smsNote').textContent = curLang === 'th' ? 'แตะลิงก์เพื่อเปิดแชท AIS' : 'Tap the link to open the AIS chat';
      setConn('idle', 'Waiting for the customer to tap the link');
      await new Promise((r) => { $('smsLink').onclick = r; if (autoOn) setTimeout(r, 1800); });
      if (token !== runToken) return;
      $('phone').hidden = true; $('stage').classList.remove('with-phone');
    } else if (entry === 'inbound') {
      $('phone').hidden = false; $('callView').hidden = false; $('stage').classList.add('with-phone');
      $('callWho').textContent = 'AIS Contact Centre'; $('callSub').textContent = (curLang === 'th' ? 'หมายเลขที่ลงทะเบียน · เชื่อมต่อแล้ว' : 'Registered number · connected');
    }
    $('chat').hidden = false;
    ari('wave', sayL('hi'), 2600);
    start(token, entry);
  }

  async function start(token, entry) {
    const p = profile();
    setConn('idle', 'Connecting…'); $('typing').hidden = false; $('typingWho').textContent = '';
    let AgentSDK; try { AgentSDK = await loadSdk(); } catch (e) { return fail(e, token); }
    if (token !== runToken) return;
    const attrs = { web_language: curLang, web_entry: entry === 'inbound' ? 'visit' : entry, web_authenticated: true, call_direction: entry === 'inbound' ? 'inbound' : 'outbound', ...p.attrs };
    const opts = { endpoint: cfg.endpoint, projectId: cfg.projectId, apiKey: cfg.apiKey, userContext: { userId: `demo-lite-${st.profile}-${Date.now()}`, customAttributes: attrs } };
    if (cfg.channelId) opts.channelId = cfg.channelId;
    try {
      sdk = new AgentSDK(opts); chat = sdk.chat();
      chat.on('message', (m) => onMessage(m, token));
      chat.on('error', (e) => onError(e, token)); sdk.on('error', (e) => onError(e, token));
      sdk.on('sessionEnd', () => { if (token === runToken) queue = queue.then(() => endCard(token)); });
      sdk.on('sessionStart', (e) => { if (token === runToken) { $('sessId').textContent = e.sessionId || '—'; setConn('on', 'Live session'); } });
      const hello = curLang === 'th' ? 'สวัสดีค่ะ' : 'Hi';
      try { await sdk.connect({ initialMessage: hello }); } catch (e) { if (!/initialMessage|ticket/i.test(String(e && e.message))) throw e; await sdk.connect(); await chat.send(hello); }
      if (token === runToken) setConn('on', 'Live session');
    } catch (e) { fail(e, token); }
  }
  const errText = (e) => (!e ? 'Unknown error' : typeof e === 'string' ? e : e.message || (e.error && (e.error.message || e.error.code)) || e.code || JSON.stringify(e).slice(0, 200));
  function onError(e, token) { if (token !== runToken) return; $('typing').hidden = true; addEvent('⚠️ ' + esc(errText(e)), 'err'); }
  function fail(e, token) { if (token !== runToken) return; $('typing').hidden = true; setConn('err', 'Connection failed'); addEvent('⚠️ Could not start the session: ' + esc(errText(e)), 'err'); console.error(e); teardown(); }

  async function send(text) {
    text = (text || '').trim();
    if (!text || !chat || ended) return;
    const payBtn = /paid by card|ชำระด้วยบัตร/i.test(text) && document.querySelector('.card.paycard .pay-btn:not(:disabled)');
    if (payBtn && !send.fromCard) { const t0 = Date.now(); payBtn.click(); while (Date.now() - t0 < 25000 && !(lastBotAt > t0 + 1500)) await sleep(250); return; }
    endTimer = null; $('chips').innerHTML = ''; turns++; newTurn(text);
    const cue = [...$('lines').children].find((x) => !x.classList.contains('done') && x.dataset.text === text); if (cue) { cue.classList.add('done'); markNext(); }
    document.querySelectorAll('.card .packs, .card .priv').forEach((x) => x.closest('.card').classList.add('old'));
    addRow('me', text); sentAt = Date.now(); lastBotAt = 0;
    if (/tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday|วันนี้|พรุ่งนี้|จันทร์|อังคาร|พุธ|พฤหัส|ศุกร์|เสาร์|อาทิตย์|สิ้นเดือน|\d{1,2}/i.test(text)) lastDateSaid = text.replace(/^(i'?ll pay|i will pay|จะชำระ|จะจ่าย)\s*(on\s*)?/i, '').replace(/(ค่ะ|ครับ)$/, '');
    if (/^(yes|yeah|sure|ok|okay|ใช่|ได้|สะดวก|โอเค)/i.test(text)) lastDateSaid = curLang === 'th' ? 'พรุ่งนี้' : 'Tomorrow';
    ari('think', sayL('think'));
    const thinkMark = sentAt; setTimeout(() => { if (sentAt === thinkMark && !lastBotAt) ari('idle'); }, 20000);
    if (/^[1-5]$/.test(text)) document.querySelectorAll('.stars').forEach((s) => s.querySelectorAll('button').forEach((x) => x.classList.toggle('on', +x.dataset.n <= +text)));
    if (isThai(text) !== (curLang === 'th') && /[ก-๙]|[a-z]{2,}/i.test(text)) setLang(isThai(text) ? 'th' : 'en', false);
    setTimeout(() => { if (!lastBotAt && !ended) { $('typing').hidden = false; scrollDown(); } }, 250);
    try { await chat.send(text); } catch (e) { $('typing').hidden = true; addEvent('⚠️ Send failed: ' + esc(errText(e)), 'err'); }
  }
  $('composer').addEventListener('submit', (ev) => { ev.preventDefault(); const v = $('input').value; $('input').value = ''; send(v); });

  // ── auto-play: sends the scenario lines, waiting for each reply to settle ──
  async function autoPlay(token) {
    const idle = async (max = 45) => { for (let i = 0; i < max * 4; i++) { await sleep(250); if (token !== runToken) return; if (lastBotAt && Date.now() - lastBotAt > 2600 && $('typing').hidden) return; } };
    for (let i = 0; i < 80 && !chat; i++) await sleep(250);
    await idle(40);
    const btns = [...$('lines').children];
    for (const b of btns) {
      if (token !== runToken || ended) break;
      if (b.classList.contains('done')) continue;
      await send(b.dataset.text); await sleep(400); await idle();
    }
    autoOn = false;
  }

  // Opened from the SMS link (…/?entry=reminder_link&lang=th): jump straight into the link journey.
  const q = new URLSearchParams(location.search);
  if (q.get('entry') === 'reminder_link') { st.scenario = SCEN.find((x) => x.id === 's2'); st.lang = q.get('lang') === 'en' ? 'en' : 'th'; $('ctlScenario').value = SCEN.indexOf(st.scenario); st.entryOverride = 'reminder_link'; }
  // The phone layout sizes the stage to the space under the presenter bar.
  function barH() { document.documentElement.style.setProperty('--barh', (document.body.classList.contains('bar-collapsed') ? 0 : document.querySelector('.demobar').offsetHeight) + 'px'); }
  barH(); window.addEventListener('resize', barH);

  // Presenter bar: collapsed by default; the choice is remembered in this browser.
  (() => {
    const t = document.createElement('button'); t.type = 'button'; t.className = 'bar-toggle'; t.id = 'barToggle';
    let collapsed = true; try { collapsed = localStorage.getItem('demoLiteBar') !== 'open'; } catch (e) { /* ignore */ }
    const apply = () => { document.body.classList.toggle('bar-collapsed', collapsed); t.textContent = collapsed ? '☰ Demo controls ▾' : '▴ Hide controls'; t.setAttribute('aria-expanded', String(!collapsed)); if (typeof barH === 'function') barH(); };
    t.onclick = () => { collapsed = !collapsed; try { localStorage.setItem('demoLiteBar', collapsed ? 'closed' : 'open'); } catch (e) { /* ignore */ } apply(); };
    document.body.appendChild(t); apply();
  })();
  // On a phone the SMS phone is an overlay: tap it to dismiss once read.
  $('phone').addEventListener('click', (e) => { if (window.innerWidth <= 760 && e.target.id !== 'smsLink' && !e.target.closest('#smsLink')) $('phone').hidden = true; });
  $('ctlProfile').value = st.profile;
  syncSeg(); renderPanel();
  run();
})();
