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
  // Two groups: chat journeys, and voice calls (dial 2015009; run here as a chat dry run of the call).
  (() => {
    const gChat = document.createElement('optgroup'); gChat.label = '💬 Chat';
    const gVoice = document.createElement('optgroup'); gVoice.label = '📞 Voice calls · dial 2015009 (chat dry run here)';
    let nChat = 0, nVoice = 0;
    SCEN.forEach((s, i) => {
      const o = document.createElement('option'); o.value = i;
      o.textContent = s.voice ? `V${++nVoice}. ${s.title.en.replace(/^📞 Voice · /, '')}` : (i === 0 ? s.title.en : `${++nChat}. ${s.title.en}`);
      (s.voice ? gVoice : gChat).appendChild(o);
    });
    $('ctlScenario').appendChild(gChat); $('ctlScenario').appendChild(gVoice);
  })();
  $('ctlScenario').onchange = (e) => { st.scenario = SCEN[+e.target.value]; st.lang = st.scenario.lang; st.profile = st.scenario.profile; $('ctlProfile').value = st.profile; st.entryOverride = null; syncSeg(); renderPanel(); };
  Object.entries(PROFILES).forEach(([k, p]) => { const o = document.createElement('option'); o.value = k; o.textContent = p.label; $('ctlProfile').appendChild(o); });
  $('ctlProfile').value = st.profile;
  $('ctlProfile').onchange = (e) => { st.profile = e.target.value; };
  document.querySelectorAll('#ctlLang button').forEach((b) => (b.onclick = () => { st.lang = b.dataset.v; syncSeg(); }));
  function syncSeg() { document.querySelectorAll('#ctlLang button').forEach((b) => b.classList.toggle('on', b.dataset.v === st.lang)); }
  $('btnStart').onclick = () => { autoOn = false; run(); };
  $('btnScript').onclick = () => { $('drawer').hidden = !$('drawer').hidden; };
  // Live browser voice call (Web SDK voice). Shown only where the key and channel allow voice.
  // Two ways to call Ari: the pipeline phone line (public softphone link, opens a call window)
  // and the realtime voice call inside the page. Each shows only when it is configured.
  const callModes = [cfg.phoneShareUrl ? 'phone' : null, cfg.voiceCall ? 'realtime' : null].filter(Boolean);
  if (callModes.length) {
    $('btnCall').hidden = false;
    $('callMenu').querySelectorAll('button').forEach((b) => { b.hidden = !callModes.includes(b.dataset.mode); b.onclick = () => { $('callMenu').hidden = true; b.dataset.mode === 'phone' ? openPhoneLine() : startCall(); }; });
    $('btnCall').onclick = (e) => {
      e.stopPropagation();
      if (call) return endCall();
      if (callModes.length === 1) return callModes[0] === 'phone' ? openPhoneLine() : startCall();
      $('callMenu').hidden = !$('callMenu').hidden;
    };
    document.addEventListener('click', (e) => { if (!e.target.closest('.call-wrap')) $('callMenu').hidden = true; });
  }
  function openPhoneLine() {
    const w = window.open(cfg.phoneShareUrl, 'ari_phone_line', 'popup=yes,width=440,height=760');
    if (!w) { addEvent('⚠️ The browser blocked the call window. Allow pop-ups for this site, then press Call Ari again.', 'err'); return; }
    try { w.focus(); } catch { /* ignore */ }
    addEvent('☎️ Phone line opened in a call window (voice pipeline). Press the call button there and allow the microphone.');
  }
  $('callEnd').onclick = () => endCall();
  $('callMute').onclick = () => {
    if (!call || !call.voice) return;
    call.muted = !call.muted;
    try { call.muted ? call.voice.mute() : call.voice.unmute(); } catch { /* ignore */ }
    $('callMute').classList.toggle('muted', call.muted);
    $('callMute').lastElementChild.textContent = call.muted ? ' Unmute' : ' Mute';
  };
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
      if (line.barge) b.classList.add('barge');
      b.innerHTML = `${line.barge ? '<span class="bg">🎙 Barge in</span>' : ''}<span class="tx">${esc(line.text)}</span>${line.note ? `<span class="nt">${esc(line.note)}</span>` : ''}`;
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
    // A reply can carry two FAQ answers back to back, so tag every one found, in order.
    const hits = FAQS.map((f) => { const i = Math.max(text.indexOf(f.en.slice(0, 40)), text.indexOf(f.th.slice(0, 30))); return { f, i }; })
      .filter((h) => h.i >= 0).sort((a, b) => a.i - b.i).map((h) => h.f);
    if (hits.length) {
      return hits.map((faq) => { faqs++; const tp = TOPIC[faq.topic]; signal(`${tp.ic} ${tp.en} · ${faq.id}`); return `<span class="faqtag">${tp.ic} ${th ? tp.th : tp.en} · ${esc(th ? faq.title[1] : faq.title[0])} · KB ${faq.id}</span>`; }).join(' ');
    }
    if (agent === 'Lite_Bill_Agent' && /(ending in|ลงท้ายด้วย)/.test(text)) {
      addCard(`<h4>${th ? 'ยอดค้างชำระ' : 'Amount overdue'}</h4><div class="bill-amt">฿${p.amount}</div><div class="bill-row"><span>${th ? 'เบอร์' : 'Line'} •••• ${p.line}</span><span>${th ? 'ครบกำหนด' : 'Due'} ${p.due}</span></div><div class="bill-row"><span>3BB Fibre</span><span class="status">${th ? 'เลยกำหนด' : 'Overdue'}</span></div>`);
      signal('🛡️ Amount protected from barge-in');
      chips(th ? ['ชำระผ่านช่องทางไหนได้บ้าง', 'เช็คคะแนน AIS Points', 'อยากชำระตอนนี้เลย', 'ไม่ว่างค่ะ'] : ['How can I pay?', 'How many AIS Points do I have?', 'I want to pay now', "I'm busy right now"]);
    } else if (/(your number has .* ais points|คะแนน ais points คงเหลือ)/i.test(text) && !/(three privileges|แลกสิทธิพิเศษได้สามรายการ)/i.test(text)) {
      tile('tPts', null, th ? 'เพิ่งตรวจสอบ' : 'Balance just checked', 'good');
      const c = addCard(`<h4>${th ? 'AIS Points คงเหลือ' : 'AIS Points balance'}</h4><div class="flexr"><div class="ring"><b>${p.points.toLocaleString()}</b></div><div><b>${esc(p.display[curLang])}</b><br><small>${p.tier} · ${th ? '300 คะแนนหมดอายุ 31 ธ.ค.' : '300 expire 31 Dec'}</small></div></div>`);
      requestAnimationFrame(() => c.querySelector('.ring').style.setProperty('--p', 78));
    } else if (/(three packages|สามแพ็กเกจ|roaming packages for)/i.test(text)) {
      const rec = (text.match(/the (\d+)-day pack covers|แนะนำแพ็กเกจ (\d+) วัน/) || []).slice(1).find(Boolean);
      const trip = (text.match(/your (\d+)-day trip|ทริป (\d+) วัน/) || []).slice(1).find(Boolean);
      const det = { 3: th ? 'เหมาะกับทริปสั้น · ดาต้าความเร็วสูง 2 GB · เริ่มเมื่อถึงปลายทาง' : 'Short trips · 2 GB high-speed data · starts on arrival', 7: th ? 'ทริป 1 สัปดาห์ · ดาต้าความเร็วสูง 5 GB · โทรรับสายฟรี · เริ่มเมื่อถึงปลายทาง' : 'One-week trips · 5 GB high-speed data · free incoming calls · starts on arrival', 15: th ? 'ทริปยาว · ดาต้าความเร็วสูง 12 GB · โทรรับสายฟรี · เริ่มเมื่อถึงปลายทาง' : 'Long trips · 12 GB high-speed data · free incoming calls · starts on arrival' };
      const c = addCard(`<h4>✈️ ${th ? 'แพ็กเกจโรมมิ่ง' : 'Roaming packages'}${trip ? ` · ${th ? `ทริป ${trip} วัน` : `${trip}-day trip`}` : ''}</h4><div class="rpk">${[[3, '399', '2 GB'], [7, '799', '5 GB'], [15, '1,299', '12 GB']].map(([d, pr, g]) => `
        <div class="rpk-row${String(d) === rec ? ' rec' : ''}" data-d="${d}">${String(d) === rec ? `<span class="rpk-badge">⭐ ${th ? `เหมาะกับทริป ${trip} วัน` : `Best for your ${trip}-day trip`}</span>` : ''}
          <div class="rpk-main"><div class="rpk-days"><b>${d}</b><small>${th ? 'วัน' : 'days'}</small></div><div class="rpk-info"><b>${g}</b><small>${th ? 'ดาต้าความเร็วสูง' : 'high-speed data'}</small></div><div class="rpk-price">฿${pr}</div></div>
          <div class="rpk-det">${det[d]}</div>
          <div class="rpk-btns"><button class="rpk-more">${th ? 'รายละเอียด' : 'Details'}</button><button class="rpk-buy">${th ? 'ซื้อ' : 'Buy'}</button></div>
        </div>`).join('')}</div>`);
      c.classList.add('packcard');
      c.querySelectorAll('.rpk-row').forEach((row) => {
        row.querySelector('.rpk-more').onclick = () => row.classList.toggle('open');
        row.querySelector('.rpk-buy').onclick = () => { c.querySelectorAll('button').forEach((b) => (b.disabled = true)); row.classList.add('sel'); send(th ? `${row.dataset.d} วัน` : `the ${row.dataset.d} day one`); };
      });
    } else if (/(activate the|ยืนยันสมัครแพ็กเกจ|redeem .* points\?|ยืนยันแลก)/i.test(text)) {
      chips(th ? ['ใช่ ยืนยันค่ะ', 'ไม่เป็นไรค่ะ'] : ['Yes please', 'No thanks']);
    } else if (/(roaming package for .* is active|สมัครแพ็กเกจโรมมิ่ง.*แล้ว|is redeemed|แลก.*แล้ว)/i.test(text) && !/McDonald/i.test(text)) {
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
    if (/(you may also have an airport reward|คุณอาจมีสิทธิ์รับรางวัลที่สนามบิน)/i.test(text)) setTimeout(airportCard, 300);
    if (/(redeemed for a burger|redeemed for a pie|แลก 369 คะแนนเป็นเบอร์เกอร์|แลก 129 คะแนนเป็นพาย)/i.test(text)) mcdRedeemed(/burger|เบอร์เกอร์/i.test(text), text);
    if (agent === 'Lite_Bill_Agent' && /(average bill over the last 6 months|ค่าบริการเฉลี่ย 6 เดือน)/i.test(text)) insightCard();
    if (agent === 'Lite_Bill_Agent' && /(coupon for your airport coffee|คูปองกาแฟที่สนามบิน)/i.test(text)) setTimeout(() => treatCard('coffee'), 900);
    if (/(collect 200 more|สะสมเพิ่มอีก 200)/i.test(text)) goalCard();
    if (/(extra 1 gb is added|เพิ่มดาต้า 1 gb ในแพ็กเกจรายเดือนแล้ว)/i.test(text)) upgradeCard();
    if (agent === 'Lite_Bill_Agent' && /(as a thank-you, please enjoy|เพื่อเป็นการขอบคุณ)/i.test(text)) treatCard('thanks');
    if (agent === 'Lite_Bill_Agent' && /(paid by card and|ด้วยบัตรเรียบร้อย)/i.test(text)) {
      signal(th ? '💳 ชำระด้วยบัตรแล้ว' : '💳 Paid by card');
      ari('happy', th ? 'ชำระเรียบร้อยค่ะ ✓' : 'Paid in full ✓', 2600);
      tile('tBill', th ? 'ชำระแล้ว' : 'Paid', th ? 'ชำระด้วยบัตร' : 'Paid by card', 'good');
    }
    if (agent === 'Lite_Bill_Agent' && /(convenient to pay by|convenient for you to pay|สะดวกมั้ยคะ|สะดวกชำระค่าบริการวันไหน|back to your bill|กลับมาเรื่องค่าบริการ|which day works|สะดวกชำระวันไหน|earliest day you could pay|สะดวกชำระเร็วที่สุดวันไหน)/i.test(text)) dateCard();
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
    const c = addCard(`<h4>📅 ${th ? 'เลือกวันที่สะดวกชำระ' : 'When can you pay?'}</h4><button class="paynow-opt"><span class="pn-ic">💳</span><span class="pn-tx"><b>${th ? `ชำระ ฿${profile().amount} ตอนนี้เลย` : `Pay ฿${profile().amount} now`}</b><small>${th ? '⚡ ชำระด้วยบัตรใน 1 นาที · ไม่มีค่าธรรมเนียม' : '⚡ 1-minute card payment · no fee'}</small></span><span class="pn-go">›</span><span class="pn-shine"></span></button><button class="pickday-opt" aria-expanded="false"><span class="pn-ic">📅</span><span class="pn-tx"><b>${th ? 'เลือกวันที่จะชำระ' : 'Pick a day to pay'}</b><small>${th ? 'นัดวันชำระที่สะดวก' : 'Choose a date that suits you'}</small></span><span class="pn-go">⌄</span></button><div class="dc-more"><div class="dc-inner"><div class="dates">${days.map(cell).join('')}</div><div class="pick"><input type="date" min="${now.toISOString().slice(0, 10)}"><button>${th ? 'เลือก' : 'Choose'}</button></div></div></div>`);
    const choose = (d, i, btn) => {
      c.querySelectorAll('.day').forEach((x) => x.classList.remove('sel')); if (btn) btn.classList.add('sel');
      pickedDate = { d: d.getDate(), mon: th ? mTh[d.getMonth()] : mEn[d.getMonth()], label: `${th ? dTh[d.getDay()] : dEn[d.getDay()]} ${d.getDate()} ${th ? mTh[d.getMonth()] : mEn[d.getMonth()]} ${d.getFullYear()}` };
      send(say(d, i));
    };
    c.classList.add('datecard');
    const more = c.querySelector('.pickday-opt');
    more.onclick = () => { const open = !c.classList.contains('open'); c.classList.toggle('open', open); more.setAttribute('aria-expanded', String(open)); if (open) setTimeout(scrollDown, 320); };
    c.querySelector('.paynow-opt').onclick = () => { c.querySelectorAll('button').forEach((x) => (x.disabled = true)); send(th ? 'ขอชำระตอนนี้เลยค่ะ' : 'I want to pay now'); };
    c.querySelectorAll('.day').forEach((b) => (b.onclick = () => choose(days[+b.dataset.i], +b.dataset.i, b)));
    c.querySelector('.pick button').onclick = () => { const v = c.querySelector('input').value; if (!v) return; const d = new Date(v + 'T12:00:00'); const diff = Math.round((d - new Date(now.toDateString())) / 864e5); choose(d, diff <= 1 ? Math.max(diff, 0) : 9, null); };
  }

  // Airport reward at McDonald's, Suvarnabhumi: free e-coupon for Gold/Platinum, redeem with points for others.
  const MCD = { brand: "McDonald's", icon: '🍔', color: '#da291c', accent: '#ffc72c' };
  function mcdTicket(head, tierLabel, benefit, extra) {
    const code = 'MCD-' + String(Date.now()).slice(-6);
    const qr = Array.from({ length: 81 }, (_, i) => `<i class="${(i * 5 + (i % 9) * 7 + 3) % 4 < 2 ? 'on' : ''}"></i>`).join('');
    const th = curLang === 'th';
    return `<div class="treat" style="--brand:${MCD.color};--brand-2:#fff6d6">
      <div class="tr-top"><span class="tr-kicker">${head}</span><span class="tr-tier">${tierLabel}</span></div>
      <div class="tr-body"><div class="tr-logo">${MCD.icon}</div><div class="tr-main"><b class="tr-brand">${MCD.brand}</b><div class="tr-benefit">${benefit}</div>
        <div class="tr-where">✈️ <span>${th ? 'สุวรรณภูมิ' : 'Suvarnabhumi'}</span></div></div></div>
      ${extra || `<div class="tr-cut"><i></i></div><div class="tr-foot"><div class="tr-qr">${qr}</div><div class="tr-meta"><small>${th ? 'รหัสคูปอง' : 'Coupon code'}</small><b>${code}</b><small>${th ? 'ใช้ได้ถึง 31 ม.ค. 2570 · แสดงที่เคาน์เตอร์' : 'Valid until 31 Jan 2027 · show at the counter'}</small></div><span class="tr-free">${th ? 'ฟรี' : 'FREE'}</span></div>`}
    </div>`;
  }
  function airportCard() {
    const th = curLang === 'th', pr = profile(), a = pr.airport; if (!a) return;
    if (a.mode === 'free') {
      const c = addCard(mcdTicket(th ? '🛫 รางวัลที่สนามบินของคุณ' : '🛫 Your airport reward', `AIS Serenade · ${a.tier}`, esc(th ? a.item.th : a.item.en)));
      c.classList.add('treatcard'); c.style.cssText = 'padding:0;border:0;background:transparent;box-shadow:none';
      ari('happy', th ? 'มีของฟรีที่สนามบินด้วยค่ะ 🍔' : 'Free food at the airport 🍔', 2600);
      return;
    }
    const opts = `<div class="mcd-opts">
        <button class="mcd-opt" data-k="burger"><span class="mo-ic">🍔🥤</span><span class="mo-tx"><b>${th ? 'เบอร์เกอร์ + เครื่องดื่ม 32 ออนซ์' : 'Burger + 32 oz drink'}</b><small>${th ? 'ฟิเล-โอ-ฟิช แมคชิคเก้น หรือซามูไร' : 'Filet-O-Fish, McChicken or Samurai'}</small></span><span class="mo-pts">369 ⭐</span></button>
        <button class="mcd-opt" data-k="pie"><span class="mo-ic">🥧</span><span class="mo-tx"><b>${th ? 'พาย 1 ชิ้น' : '1 pie'}</b><small>${th ? 'สับปะรดหรือข้าวโพด' : 'Pineapple or corn'}</small></span><span class="mo-pts">129 ⭐</span></button>
        <div class="mcd-bal">${th ? 'คะแนนของคุณ' : 'Your points'}: <b>${pr.points.toLocaleString()} ⭐</b></div></div>`;
    const c = addCard(mcdTicket(th ? '🛫 รางวัลที่สนามบิน · แลกด้วยคะแนน' : '🛫 Airport reward · redeem with points', 'AIS Points', esc(th ? 'เลือกแลกได้เลยค่ะ' : 'Choose what to redeem'), opts));
    c.classList.add('treatcard'); c.style.cssText = 'padding:0;border:0;background:transparent;box-shadow:none';
    c.querySelectorAll('.mcd-opt').forEach((b) => (b.onclick = () => { c.querySelectorAll('.mcd-opt').forEach((x) => (x.disabled = true)); b.classList.add('sel'); send(b.dataset.k === 'burger' ? (th ? 'แลกเบอร์เกอร์พร้อมเครื่องดื่มค่ะ' : 'Redeem the burger and drink') : (th ? 'แลกพายค่ะ' : 'Redeem the pie')); }));
  }
  function mcdRedeemed(burger, text) {
    const th = curLang === 'th', pr = profile();
    const c = addCard(mcdTicket(th ? '✅ แลกคะแนนเรียบร้อย' : '✅ Points redeemed', burger ? '−369 ⭐' : '−129 ⭐', burger ? (th ? 'เบอร์เกอร์ + เครื่องดื่ม 32 ออนซ์' : 'Burger + 32 oz drink') : (th ? 'พาย 1 ชิ้น' : '1 pie')));
    c.classList.add('treatcard'); c.style.cssText = 'padding:0;border:0;background:transparent;box-shadow:none';
    const m = text.match(/(\d[\d,]*) points left|คงเหลือ (\d[\d,]*) คะแนน/); if (m) tile('tPts', m[1] || m[2], th ? 'แลกรางวัลที่สนามบินแล้ว' : 'Airport reward redeemed', 'good');
    ari('happy', th ? 'แลกเรียบร้อยค่ะ 🍔' : 'Enjoy your meal 🍔', 2600);
  }

  // Bill insight: last 6 months as bars, the average line, this month highlighted, why it went up, and the roaming offer.
  function insightCard() {
    const th = curLang === 'th', pr = profile(), hist = pr.history || [];
    const cur = parseFloat(String(pr.amount).replace(/,/g, '')), all = [...hist, cur], max = Math.max(...all) * 1.12;
    const avg = Math.round(hist.reduce((a, b) => a + b, 0) / (hist.length || 1));
    const mEn = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], mTh = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
    const now = new Date(), lab = (k) => { const d = new Date(now.getFullYear(), now.getMonth() - k, 1); return (th ? mTh : mEn)[d.getMonth()]; };
    const bars = all.map((v, i) => { const k = all.length - 1 - i, last = i === all.length - 1;
      return `<div class="ib-col${last ? ' now' : ''}"><span class="ib-val">${last ? '฿' + pr.amount : v.toLocaleString()}</span><i style="--h:${(v / max * 100).toFixed(1)}%;--d:${i * 70}ms"></i><small>${lab(k)}</small></div>`; }).join('');
    const diff = Math.round(cur - avg);
    const c = addCard(`<div class="ib">
        <div class="ib-head"><h4>📊 ${th ? 'ค่าบริการ 6 เดือนล่าสุด' : 'Your bill, last 6 months'}</h4><span class="ib-up">▲ ฿${diff.toLocaleString()} ${th ? 'จากค่าเฉลี่ย' : 'vs average'}</span></div>
        <div class="ib-chart" style="--avg:${(avg / max * 100).toFixed(1)}%">${bars}<div class="ib-avg"><span>${th ? 'เฉลี่ย' : 'avg'} ฿${avg.toLocaleString()}</span></div></div>
        <div class="ib-why"><span>🌐 ${th ? 'ใช้อินเทอร์เน็ตบ้านมากขึ้น' : 'More home-internet use'}</span><span>✈️ ${th ? 'ค่าโรมมิ่ง ญี่ปุ่น' : 'Roaming in Japan'}</span></div>
        <div class="ib-offer"><div class="ib-o-ic">✈️</div><div class="ib-o-tx"><b>${th ? 'โรมมิ่งญี่ปุ่น 7 วัน' : 'Japan roaming · 7 days'}</b><small>5 GB · ${th ? 'ไม่ต้องกังวลค่าใช้จ่ายเกิน' : 'no bill shock on your next trip'}</small></div><b class="ib-o-pr">฿799</b></div>
        <div class="ib-btns"><button class="ib-yes">${th ? 'เพิ่มเลย' : 'Add it'}</button><button class="ib-no">${th ? 'ไว้ก่อน' : 'Not now'}</button></div>
      </div>`);
    c.classList.add('insightcard');
    const done = () => c.querySelectorAll('.ib-btns button').forEach((b) => (b.disabled = true));
    c.querySelector('.ib-yes').onclick = () => { done(); send(th ? 'ใช่ เพิ่มเลยค่ะ' : 'Yes, add it'); };
    c.querySelector('.ib-no').onclick = () => { done(); send(th ? 'ไม่เป็นไรค่ะ' : 'Not now'); };
    requestAnimationFrame(() => c.classList.add('on'));
    signal(th ? '📊 อธิบายค่าบริการ + เสนอโรมมิ่ง' : '📊 Bill insight + roaming offer');
  }
  // Points goal: progress to the next reward (200 points away) and the extra 1 GB offer that earns them.
  function goalCard() {
    const th = curLang === 'th', pr = profile(), pts = pr.points, goal = pts + 200, g = pr.goal || { en: 'a reward', th: 'ของรางวัล' };
    const pct = Math.round(pts / goal * 100);
    const c = addCard(`<div class="pg">
        <div class="pg-head"><span class="pg-ic">⭐</span><div><small>${th ? 'คะแนน AIS Points' : 'AIS Points'}</small><b>${pts.toLocaleString()}</b></div>
          <div class="pg-goal"><small>${th ? 'รางวัลถัดไปที่' : 'Next reward at'} ${goal.toLocaleString()}</small><b>🎁 ${esc(th ? g.th : g.en)}</b></div></div>
        <div class="pg-bar"><i style="--p:${pct}%"></i><span class="pg-need">${th ? 'อีก 200 คะแนน' : '200 to go'}</span></div>
        <div class="pg-offer"><div class="pg-o-ic">📶</div><div class="pg-o-tx"><b>${th ? '+1 GB ต่อเดือน' : '+1 GB every month'}</b><small>${th ? 'รับ +200 คะแนน ทันที' : 'earns the 200 points now'}</small></div><b class="pg-o-pr">${th ? '฿59/เดือน' : '฿59/mo'}</b></div>
        <div class="ib-btns"><button class="ib-yes">${th ? 'เพิ่มเลย' : 'Add it'}</button><button class="ib-no">${th ? 'ไว้ก่อน' : 'Not now'}</button></div>
      </div>`);
    c.classList.add('goalcard');
    const done = () => c.querySelectorAll('.ib-btns button').forEach((b) => (b.disabled = true));
    c.querySelector('.ib-yes').onclick = () => { done(); send(th ? 'ใช่ เพิ่มเลยค่ะ' : 'Yes, add it'); };
    c.querySelector('.ib-no').onclick = () => { done(); send(th ? 'ไม่เป็นไรค่ะ' : 'Not now'); };
    requestAnimationFrame(() => c.classList.add('on'));
    tile('tPts', null, th ? 'อีก 200 คะแนนได้รางวัล' : '200 to the next reward', 'good');
  }
  // Extra 1 GB added: the bar fills to the goal and the reward unlocks.
  function upgradeCard() {
    const th = curLang === 'th', pr = profile(), pts = pr.points, g = pr.goal || { en: 'a reward', th: 'ของรางวัล' };
    const c = addCard(`<div class="pu">
        <div class="pu-row"><span class="pu-ic">📶</span><div><b>${th ? 'อัปเกรดแพ็กเกจแล้ว' : 'Plan upgraded'}</b><small>${th ? '+1 GB ต่อเดือน · ฿59/เดือน' : '+1 GB every month · ฿59/mo'}</small></div><span class="pu-plus">+200 ⭐</span></div>
        <div class="pg-bar full"><i style="--p:${Math.round(pts / (pts + 200) * 100)}%"></i></div>
        <div class="pu-unlock">🎁 ${th ? 'ปลดล็อกแล้ว:' : 'Unlocked:'} <b>${esc(th ? g.th : g.en)}</b></div>
      </div>`);
    c.classList.add('upgradecard');
    setTimeout(() => { const i = c.querySelector('.pg-bar i'); if (i) i.style.setProperty('--p', '100%'); }, 400);
    tile('tPts', (pts + 200).toLocaleString(), th ? 'ได้รับ +200 คะแนน' : '+200 bonus points', 'good');
    ari('happy', th ? 'ปลดล็อกรางวัลแล้วค่ะ 🎁' : 'Reward unlocked 🎁', 2600);
  }

  // Free airport food/drink privilege as an e-coupon (web only). 'comfort' after "I can't pay", 'thanks' after a card payment.
  function treatCard(kind) {
    const th = curLang === 'th', pr = profile(), v = kind === 'coffee' ? pr.coffee : pr.privilege;
    if (!v) return;
    const code = (v.brand.replace(/[^A-Za-z]/g, '').slice(0, 3).toUpperCase()) + '-' + String(Date.now()).slice(-6);
    const head = kind === 'coffee' ? (th ? '☕ กาแฟที่สนามบิน ฟรีจากอารีย์' : '☕ Your airport coffee, on us') : kind === 'thanks' ? (th ? '🎉 ขอบคุณที่ชำระค่าบริการ' : '🎉 Thanks for paying') : (th ? '💚 ของขวัญเล็กๆ จากอารีย์' : '💚 A little treat, on us');
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
      // One platform message can carry several replies separated by a blank line
      // (for example two FAQ answers, then the question again): show each as its own bubble.
      const parts = text.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
      for (const part of parts) {
        if (token !== runToken || ended) return;
        $('typing').hidden = false; scrollDown(); await sleep(320); $('typing').hidden = true;
        const row = addRow('bot', '', agent);
        await typeOut(row.querySelector('.bubble'), part, token);
        const m = $('mascot');
        if (m && !m.classList.contains('walk')) ari('talk', null, 1400);
        const tag = afterBot(part, agent);
        if (tag) ari('talk', sayL('kb'), 2000);
        if (tag) row.insertAdjacentHTML('beforeend', tag);
        scrollDown();
      }
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
    if (call) endCall(true);
    $('callLive').hidden = true; $('callView').classList.remove('live'); $('phone').classList.remove('live-call');
    $('chat').hidden = true; $('phone').hidden = true; $('callView').hidden = true; $('smsView').hidden = true; $('stage').classList.remove('with-phone');
    if ((entry === 'reminder_link' || entry === 'travel_link') && !fromSms) {
      $('phone').hidden = false; $('smsView').hidden = false; $('stage').classList.add('with-phone');
      $('smsText').textContent = curLang === 'th' ? `AIS: ค่าอินเทอร์เน็ตบ้าน 3BB Fibre เบอร์ •••• ${p.line} ยอด ฿${p.amount} เลยกำหนดชำระ แตะลิงก์เพื่อคุยกับผู้ช่วย AIS` : `AIS: Your 3BB Fibre bill for •••• ${p.line} (฿${p.amount}) is overdue. Tap the secure link to sort it out with the AIS assistant.`;
      if (entry === 'travel_link') $('smsText').textContent = curLang === 'th' ? 'AIS: กำลังจะเดินทางไปต่างประเทศใช่ไหม? แชทกับ AIS เพื่อหาแพ็กเกจโรมมิ่งสำหรับทริปของคุณ และดูสิทธิ์อาหารและเครื่องดื่มฟรีที่สนามบิน' : 'AIS: Traveling abroad? Chat with AIS to find a roaming package for your trip, and discover free airport food and drink offers:';
      $('smsLinkText').textContent = entry === 'travel_link' ? 'ais.th/travel' : 'ais.th/pay/secure-link';
      $('smsNote').textContent = curLang === 'th' ? 'แตะลิงก์เพื่อเปิดแชท AIS' : 'Tap the link to open the AIS chat';
      setConn('idle', 'Waiting for the customer to tap the link');
      await new Promise((r) => { $('smsLink').onclick = r; if (autoOn) setTimeout(r, 1800); });
      if (token !== runToken) return;
      $('phone').hidden = true; $('stage').classList.remove('with-phone');
    } else if (entry === 'inbound') {
      $('phone').hidden = false; $('callView').hidden = false; $('stage').classList.add('with-phone');
      $('callWho').textContent = 'AIS Contact Centre'; $('callSub').textContent = st.scenario.voice ? (curLang === 'th' ? 'โทรเข้า 2015009 · เชื่อมต่อแล้ว' : 'Inbound to 2015009 · connected') : (curLang === 'th' ? 'หมายเลขที่ลงทะเบียน · เชื่อมต่อแล้ว' : 'Registered number · connected');
    } else if (entry === 'outbound_call') {
      $('phone').hidden = false; $('callView').hidden = false; $('stage').classList.add('with-phone');
      $('callWho').textContent = curLang === 'th' ? 'AIS 3BB Fibre โทรหาคุณ' : 'AIS 3BB Fibre is calling';
      $('callSub').textContent = curLang === 'th' ? 'สายโทรออกจาก 2015009 · เชื่อมต่อแล้ว' : 'Outbound from 2015009 · connected';
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
    const attrs = { web_language: curLang, web_entry: (entry === 'inbound' || entry === 'outbound_call') ? 'visit' : entry, web_authenticated: entry !== 'outbound_call', call_direction: entry === 'inbound' ? 'inbound' : 'outbound', ...p.attrs };
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
  // ── live browser call ─────────────────────────────────────────────────────
  // A separate SDK session in voice mode: the microphone goes to the platform's
  // speech-to-text, the same agents answer, and the reply is spoken back. The
  // agents see the channel as voice, so the voice rules (barge-in, Thai/English
  // switching, keypad-style survey) apply exactly as on a phone call.
  let call = null;
  function callLine(cls, text) {
    const box = $('callTx'); if (!box) return null;
    const el = document.createElement('p'); el.className = cls; el.textContent = text; box.appendChild(el); box.scrollTop = box.scrollHeight; return el;
  }
  const CALL_STATE = { idle: 'Idle', connecting: 'Connecting…', listening: '🎙 Listening', processing: '… Thinking', speaking: '🔊 Ari is speaking', error: 'Error' };
  async function startCall() {
    if (call) return;
    autoOn = false; runToken++; await teardown();
    // The live call is an inbound call. It starts in the header language (Thai by default)
    // and the agents switch to English when the caller speaks English.
    const p = profile(), callLang = curLang === 'en' ? 'en' : 'th', th = callLang === 'th', entry = 'inbound';
    $('chat').hidden = true; $('smsView').hidden = true;
    $('phone').hidden = false; $('phone').classList.add('live-call'); $('callView').hidden = false; $('callView').classList.add('live'); $('stage').classList.add('with-phone');
    $('callWho').textContent = th ? 'อารี · AIS (สายจริง)' : 'Ari · AIS (live call)';
    $('callSub').textContent = th ? 'กำลังเชื่อมต่อ…' : 'Connecting…';
    $('callLive').hidden = false; $('callTx').innerHTML = '';
    $('btnCall').classList.add('on'); $('btnCall').lastElementChild.textContent = th ? ' วางสาย' : ' Hang up';
    callLine('sys', th ? 'สายโทรเข้า ภาษาไทย (พูดภาษาอังกฤษได้) พูดได้เลยเมื่ออารีทักทาย พูดแทรกระหว่างที่อารีตอบคำถามได้' : 'Inbound call in English (Thai works too). Speak after Ari greets you; you can cut in while Ari answers a question.');
    setConn('idle', 'Starting call…');
    const c = (call = { muted: false, partial: null });
    try {
      const AgentSDK = await loadSdk();
      const attrs = { web_language: callLang, web_entry: 'visit', web_authenticated: true, call_direction: 'inbound', ...p.attrs };
      const opts = { endpoint: cfg.endpoint, projectId: cfg.projectId, apiKey: cfg.apiKey, userContext: { userId: `demo-lite-call-${st.profile}-${Date.now()}`, customAttributes: attrs } };
      if (cfg.channelId) opts.channelId = cfg.channelId;
      c.sdk = new AgentSDK(opts);
      c.sdk.on('sessionStart', (e) => { $('sessId').textContent = e.sessionId || '—'; });
      c.sdk.on('error', (e) => { if (call === c) callLine('err', '⚠️ ' + errText(e)); });
      c.sdk.on('sessionEnd', () => { if (call === c) endCall(true); });
      await c.sdk.connect();
      if (call !== c) return;
      const v = (c.voice = c.sdk.voice());
      v.on('stateChange', (e) => { if (call !== c) return; $('callSub').textContent = CALL_STATE[e.state] || e.state; setConn(e.state === 'error' ? 'err' : 'on', 'Live call · ' + (CALL_STATE[e.state] || e.state)); });
      v.on('transcription', (e) => { if (call !== c || e.isFinal) return; if (!c.partial) c.partial = callLine('you live-partial', e.text); else c.partial.textContent = e.text; $('callTx').scrollTop = 1e9; });
      v.on('transcriptionFinal', (e) => { if (call !== c) return; if (c.partial) { c.partial.remove(); c.partial = null; } if (e.text) callLine('you', e.text); });
      v.on('responseEnd', (e) => { if (call !== c || !e.text) return; callLine('ari', e.text); const tag = afterBot(e.text, null); if (tag) callLine('sys', tag.replace(/<[^>]+>/g, '')); ari('talk', null, 1400); });
      v.on('bargeIn', () => { if (call === c) callLine('sys', th ? '🎙 พูดแทรก' : '🎙 Barge-in'); });
      v.on('micPermissionDenied', () => { if (call === c) { callLine('err', th ? 'ไม่ได้รับอนุญาตให้ใช้ไมโครโฟน' : 'Microphone permission was denied. Allow the mic and try again.'); endCall(true); } });
      v.on('error', (e) => { if (call === c) callLine('err', '⚠️ ' + errText(e && e.error ? e.error : e)); });
      v.on('realtimeTranscript', (e) => {
        if (call !== c || !e || !e.isFinal || !e.text) return;
        if (e.role === 'user') { if (c.partial) { c.partial.remove(); c.partial = null; } callLine('you', e.text); }
        else { callLine('ari', e.text); const tag = afterBot(e.text, null); if (tag) callLine('sys', tag.replace(/<[^>]+>/g, '')); ari('talk', null, 1400); }
      });
      await v.start();
      if (call !== c) return;
      // The SDK plays Ari's realtime audio but does not send the microphone in realtime mode,
      // so the page streams it: 24 kHz mono PCM16 in ~85 ms chunks over the same session.
      await startMic(c);
      if (call === c) { setConn('on', 'Live call'); ari('wave', sayL('hi'), 2200); callLine('sys', th ? '🎙 ไมโครโฟนเปิดแล้ว พูดได้เลย' : '🎙 Microphone on. Say hello to start.'); }
    } catch (e) {
      if (call === c) { callLine('err', '⚠️ ' + errText(e)); setConn('err', 'Call failed'); console.error(e); endCall(true); }
    }
  }
  async function startMic(c) {
    const sm = c.sdk.getSessionManager(), sid = c.sdk.getSessionId();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 } });
    if (call !== c) { stream.getTracks().forEach((t) => t.stop()); return; }
    let ctx; try { ctx = new AudioContext({ sampleRate: 24000 }); } catch { ctx = new AudioContext(); }
    const src = ctx.createMediaStreamSource(stream);
    const proc = ctx.createScriptProcessor(2048, 1, 1);
    const ratio = ctx.sampleRate / 24000;
    proc.onaudioprocess = (e) => {
      if (call !== c || c.muted || !sm.isConnected()) return;
      const inp = e.inputBuffer.getChannelData(0);
      const n = Math.floor(inp.length / ratio), out = new Int16Array(n);
      for (let i = 0; i < n; i++) { const x = inp[Math.min(inp.length - 1, Math.floor(i * ratio))]; out[i] = Math.max(-1, Math.min(1, x)) * 0x7fff; }
      const bytes = new Uint8Array(out.buffer); let bin = '';
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
      sm.send({ type: 'voice_audio', sessionId: sid, audio: btoa(bin) });
    };
    src.connect(proc); proc.connect(ctx.destination);
    c.mic = { stream, ctx, proc, src };
  }
  function stopMic(c) {
    const m = c && c.mic; if (!m) return; c.mic = null;
    try { m.proc.disconnect(); m.src.disconnect(); } catch { /* ignore */ }
    try { m.stream.getTracks().forEach((t) => t.stop()); } catch { /* ignore */ }
    try { m.ctx.close(); } catch { /* ignore */ }
  }
  async function endCall(keepTranscript) {
    const c = call; call = null; if (!c) return;
    stopMic(c);
    try { await c.voice?.stop(); } catch { /* ignore */ }
    try { await c.sdk?.endSession?.(); } catch { /* ignore */ }
    try { c.sdk?.disconnect?.(); } catch { /* ignore */ }
    $('btnCall').classList.remove('on'); $('btnCall').lastElementChild.textContent = ' Call Ari';
    $('callSub').textContent = curLang === 'th' ? 'วางสายแล้ว' : 'Call ended';
    $('callMute').classList.remove('muted'); $('callMute').lastElementChild.textContent = ' Mute';
    if (!keepTranscript) callLine('sys', curLang === 'th' ? 'วางสายแล้ว' : 'Call ended');
    setConn('idle', 'Call ended');
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
