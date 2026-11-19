/* 3BB CEO Demo — AIS-style website with a live Web SDK chat (demo only). */
(() => {
  const cfg = window.DEMO_CONFIG;
  const PROFILES = window.DEMO_PROFILES;
  const SCENARIOS = window.DEMO_SCENARIOS;
  const $ = (id) => document.getElementById(id);

  const AGENTS = {
    Customer_Verification_Agent: { en: 'Ari · Welcome', th: 'อารีย์ · ต้อนรับ', path: 'Customer Verification', pnp: false },
    Payment_Outcome_Agent: { en: 'Ari · Billing', th: 'อารีย์ · ค่าบริการ', path: 'Payment Outcome', pnp: false },
    AIS_Demo_Supervisor: { en: 'Ari · Routing', th: 'อารีย์ · ส่งต่อ', path: 'Supervisor', pnp: true },
    AIS_PnP_Points_Account: { en: 'Points specialist', th: 'ผู้ช่วยด้านคะแนน', path: 'Points & Account', pnp: true },
    AIS_PnP_Rewards_Privileges: { en: 'Privileges specialist', th: 'ผู้ช่วยด้านสิทธิพิเศษ', path: 'Rewards & Privileges', pnp: true },
    AIS_Pnp_OTP_Agent: { en: 'Security check', th: 'ยืนยันความปลอดภัย', path: 'OTP', pnp: true },
    Collection_Survey_Agent: { en: 'Ari · Survey', th: 'อารีย์ · แบบสอบถาม', path: 'Survey', pnp: false },
  };
  const ENTRY_LABEL = { visit: 'Signed-in website visit', reminder_link: 'SMS reminder link', anonymous: 'Guest (not signed in)' };
  const STARTER = { th: 'สวัสดีค่ะ', en: 'Hello' };
  const T = {
    th: {
      title: 'อารีย์ · ผู้ช่วย AIS', sub: 'ออนไลน์ · ตอบทันที', placeholder: 'พิมพ์ข้อความ…',
      verifiedVisit: 'เข้าสู่ระบบแล้ว · ยืนยันตัวตนเรียบร้อย', verifiedLink: 'ลิงก์ปลอดภัย · ยืนยันตัวตนเรียบร้อย',
      hello: (n) => `สวัสดี ${n}`, guestHello: 'ยินดีต้อนรับสู่ AIS', kicker: 'myAIS · บัญชีของฉัน',
      heroSub: 'จัดการมือถือและอินเทอร์เน็ตบ้าน 3BB ได้ในที่เดียว', pending: 'รอชำระ', due: (d) => `เลยกำหนดชำระ · ครบกำหนด ${d}`,
      payBill: 'ชำระค่าบริการ', chatAri: 'แชทกับอารีย์',
      billTitle: 'ยอดค้างชำระ', line: 'เบอร์', dueLbl: 'ครบกำหนด', status: 'สถานะ', overdue: 'เลยกำหนด',
      aPay: 'ชำระเลย', aDate: 'นัดวันชำระ', aPoints: 'เช็คคะแนน',
      payTitle: 'ช่องทางชำระเงิน', dateTitle: 'เลือกวันที่สะดวกชำระ',
      promiseT: 'บันทึกนัดชำระแล้ว', promiseS: (d) => `เราจะส่ง SMS เตือนก่อนวันที่ ${d}`,
      endT: 'จบการสนทนาแล้ว', endS: 'ขอบคุณที่ใช้บริการ AIS ค่ะ หากต้องการความช่วยเหลือเพิ่มเติม เริ่มแชทใหม่ได้เลย', endBtn: 'เริ่มแชทใหม่',
      pointsT: 'AIS Points คงเหลือ', privT: 'สิทธิพิเศษแนะนำ',
      handoff: (n) => `กำลังเชื่อมต่อ${n}`, back: 'ไม่มีแล้วค่ะ ขอบคุณค่ะ',
      chips: { pay: 'ชำระผ่านช่องทางไหนได้บ้างคะ', points: 'ขอเช็คคะแนน AIS Points หน่อยค่ะ', why: 'ทำไมบิลเดือนนี้สูงขึ้นคะ', thanks: 'ขอบคุณค่ะ', date: 'ขอนัดวันชำระค่ะ' },
      payWith: (o) => `จะชำระผ่าน${o}วันนี้ค่ะ`, payOn: (d) => `จะชำระวันที่ ${d} ค่ะ`,
      days: ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'], today: 'วันนี้', tomorrow: 'พรุ่งนี้',
      months: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'],
      monthsLong: ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'],
    },
    en: {
      title: 'Ari · AIS Assistant', sub: 'Online · replies instantly', placeholder: 'Type a message…',
      verifiedVisit: 'Signed in · identity verified', verifiedLink: 'Secure link · identity verified',
      hello: (n) => `Hello, ${n}`, guestHello: 'Welcome to AIS', kicker: 'myAIS · My account',
      heroSub: 'Everything for your mobile and 3BB Fibre in one place.', pending: 'Payment pending', due: (d) => `Overdue · was due ${d}`,
      payBill: 'Pay bill', chatAri: 'Chat with Ari',
      billTitle: 'Amount overdue', line: 'Line', dueLbl: 'Due date', status: 'Status', overdue: 'Overdue',
      aPay: 'Pay now', aDate: 'Pick a date', aPoints: 'My points',
      payTitle: 'Ways to pay', dateTitle: 'When can you pay?',
      promiseT: 'Payment date saved', promiseS: (d) => `We'll text you a reminder before ${d}`,
      endT: 'Chat ended', endS: 'Thanks for chatting with AIS. Need anything else? Start a new chat any time.', endBtn: 'Start a new chat',
      pointsT: 'AIS Points balance', privT: 'Privileges picked for you',
      handoff: (n) => `Connecting you to the ${n}`, back: "No, that's all, thanks",
      chips: { pay: 'How can I pay?', points: 'How many AIS Points do I have?', why: 'Why is my bill higher this month?', thanks: 'Thanks!', date: 'I want to pick a payment date' },
      payWith: (o) => `I'll pay with ${o} today.`, payOn: (d) => `I'll pay on ${d}.`,
      days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], today: 'Today', tomorrow: 'Tomorrow',
      months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      monthsLong: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    },
  };
  const PAY_OPTIONS = [
    { ic: '📱', en: ['myAIS app', 'Pay Bill · no fee'], th: ['แอป myAIS', 'เมนูชำระค่าบริการ'], say: { en: 'the myAIS app', th: 'แอป myAIS ' } },
    { ic: '🏦', en: ['Mobile banking', 'Scan QR / PromptPay'], th: ['โมบายแบงกิ้ง', 'สแกน QR พร้อมเพย์'], say: { en: 'mobile banking', th: 'โมบายแบงกิ้ง' } },
    { ic: '🏪', en: ['AIS / 3BB Shop', 'Any branch'], th: ['AIS / 3BB Shop', 'ทุกสาขา'], say: { en: 'an AIS Shop', th: 'AIS Shop ' } },
    { ic: '🛒', en: ['Counter service', 'Lotus · CJ MORE'], th: ['เคาน์เตอร์เซอร์วิส', 'Lotus · CJ MORE'], say: { en: 'counter service', th: 'เคาน์เตอร์เซอร์วิส' } },
  ];
  const PRIVS = [
    { ic: '☕', en: ['Café drink', '1 free'], th: ['เครื่องดื่มคาเฟ่', 'ฟรี 1 แก้ว'], cost: '150 pts' },
    { ic: '🎬', en: ['Cinema ticket', '฿100 off'], th: ['ตั๋วหนัง', 'ลด ฿100'], cost: '200 pts' },
    { ic: '🍜', en: ['Dining', '15% off'], th: ['ร้านอาหาร', 'ลด 15%'], cost: 'Free' },
    { ic: '✈️', en: ['Lounge pass', 'Selected airports'], th: ['ห้องรับรองสนามบิน', 'สนามบินที่ร่วมรายการ'], cost: '1,500 pts' },
  ];

  // ── state ────────────────────────────────────────────────────────────────
  const st = { scenario: SCENARIOS[0], profile: SCENARIOS[0].profile, entry: SCENARIOS[0].entry, lang: SCENARIOS[0].lang };
  let sdk = null, chat = null, runToken = 0, lastAgent = null, lastErr = '', curLang = 'th';
  let queue = Promise.resolve();
  let seen = new Map();
  let shown = {};
  let pendingDate = null;
  let endTimer = null;

  // ── SDK loader (the platform serves the matching browser build) ───────────
  let sdkReady = null;
  function loadSdk() {
    if (sdkReady) return sdkReady;
    sdkReady = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = `${cfg.endpoint}/api/sdk/embed/script`;
      s.onload = () => {
        const g = window.AgentSDK;
        const C = g && (g.AgentSDK || (typeof g === 'function' ? g : null));
        C ? resolve(C) : reject(new Error('AgentSDK global missing'));
      };
      s.onerror = () => reject(new Error(`Could not load the SDK from ${cfg.endpoint}`));
      document.head.appendChild(s);
    });
    return sdkReady;
  }

  // ── demo bar ─────────────────────────────────────────────────────────────
  function initBar() {
    const ps = $('ctlProfile');
    for (const [id, p] of Object.entries(PROFILES)) ps.add(new Option(p.label, id));
    const ss = $('ctlScenario');
    let group = null, og = null;
    for (const sc of SCENARIOS) {
      if (sc.group !== group) { group = sc.group; og = document.createElement('optgroup'); og.label = group; ss.appendChild(og); }
      og.appendChild(new Option(sc.title, sc.id));
    }
    ss.onchange = () => {
      st.scenario = SCENARIOS.find((s) => s.id === ss.value);
      Object.assign(st, { profile: st.scenario.profile, entry: st.scenario.entry, lang: st.scenario.lang });
      syncBar(); run();
    };
    ps.onchange = () => { st.profile = ps.value; run(); };
    for (const segId of ['ctlEntry', 'ctlLang']) {
      $(segId).addEventListener('click', (e) => {
        const b = e.target.closest('button'); if (!b) return;
        st[segId === 'ctlEntry' ? 'entry' : 'lang'] = b.dataset.v; syncBar(); run();
      });
    }
    $('btnStart').onclick = () => run();
    $('btnPresenter').onclick = () => togglePresenter();
    $('prClose').onclick = () => togglePresenter(false);
    syncBar();
  }
  function syncBar() {
    $('ctlProfile').value = st.profile;
    $('ctlScenario').value = st.scenario.id;
    for (const b of $('ctlEntry').children) b.classList.toggle('on', b.dataset.v === st.entry);
    for (const b of $('ctlLang').children) b.classList.toggle('on', b.dataset.v === st.lang);
  }
  function togglePresenter(force) {
    const open = force ?? $('presenter').hidden;
    $('presenter').hidden = !open;
    $('btnPresenter').setAttribute('aria-expanded', String(open));
  }
  function setConn(state, text) {
    $('connDot').className = 'dot' + (state === 'on' ? ' on' : state === 'err' ? ' err' : '');
    $('connText').textContent = text;
  }

  // ── website render ───────────────────────────────────────────────────────
  function renderSite() {
    const p = PROFILES[st.profile], t = T[st.lang], guest = st.entry === 'anonymous';
    const name = p.displayName[st.lang];
    $('acctAv').textContent = guest ? '?' : p.initials;
    $('acctName').textContent = guest ? (st.lang === 'th' ? 'เข้าสู่ระบบ' : 'Sign in') : name;
    $('siteLang').textContent = st.lang === 'th' ? 'TH | en' : 'th | EN';
    $('heroKicker').textContent = t.kicker;
    $('heroTitle').textContent = guest ? t.guestHello : t.hello(name);
    $('heroSub').textContent = t.heroSub;
    $('heroPoints').textContent = guest ? '—' : p.points;
    $('heroTier').textContent = guest ? '' : `${p.tier} member`;
    $('billCard').hidden = guest;
    $('billChip').textContent = t.pending;
    $('billPlan').textContent = p.pkg;
    $('billNumber').textContent = p.numberMasked;
    $('billAmount').textContent = p.amount;
    $('billDue').textContent = t.due(p.due);
    $('billLines').innerHTML = p.lines.length > 1 ? p.lines.map((l) => `<div class="row"><span>${esc(l.plan)} · ${esc(l.number)}</span><span>฿${esc(l.amount)}</span></div>`).join('') : '';
    $('pkgName').textContent = p.pkg;
    document.querySelectorAll('[data-ask="pay"]').forEach((b) => (b.textContent = t.payBill));
    document.querySelectorAll('[data-ask="chat"]').forEach((b) => (b.textContent = t.chatAri));
  }

  function renderPresenter() {
    const sc = st.scenario;
    $('scTitle').textContent = sc.title;
    $('scPitch').textContent = sc.pitch;
    $('scShows').innerHTML = (sc.shows || []).map((s) => `<span>${esc(s)}</span>`).join('');
    const box = $('scLines'); box.innerHTML = '';
    const c = T[st.lang].chips;
    const lines = sc.lang === st.lang ? (sc.lines || []) : [c.pay, c.points, c.why, c.date, c.thanks];
    for (const text of lines) {
      const b = document.createElement('button');
      b.className = 'line-btn'; b.textContent = text;
      b.onclick = () => { b.classList.add('used'); send(text); };
      box.appendChild(b);
    }
    $('liveAgent').textContent = '—';
    $('liveEntry').textContent = ENTRY_LABEL[st.entry];
    $('liveLang').textContent = st.lang === 'th' ? 'Thai (switches per turn)' : 'English (switches per turn)';
    $('liveSession').textContent = '—';
    $('agentPath').innerHTML = '';
  }

  // ── chat chrome ──────────────────────────────────────────────────────────
  function prepareChat() {
    const t = T[st.lang];
    curLang = st.lang;
    $('messages').innerHTML = '';
    $('chips').innerHTML = '';
    $('typing').hidden = true;
    $('chatTitle').textContent = t.title;
    $('chatSub').textContent = t.sub;
    $('input').placeholder = t.placeholder;
    $('verifiedBar').hidden = st.entry === 'anonymous';
    $('verifiedText').textContent = st.entry === 'reminder_link' ? t.verifiedLink : t.verifiedVisit;
    const c = $('chat');
    if (st.entry === 'reminder_link') { $('phoneChatSlot').appendChild(c); c.className = 'chat in-phone'; }
    else { document.body.appendChild(c); c.className = 'chat'; }
  }

  function scrollDown() { const m = $('messages'); m.scrollTop = m.scrollHeight; }

  function addRow(kind, text, agentName) {
    const row = document.createElement('div');
    row.className = `row ${kind}`;
    if (kind === 'bot') {
      const meta = AGENTS[agentName];
      const av = document.createElement('span');
      av.className = 'mini-av' + (meta && meta.pnp ? ' pnp' : '');
      av.textContent = meta && meta.pnp ? 'P&P' : 'Ari';
      row.appendChild(av);
    }
    const b = document.createElement('div');
    b.className = 'bubble';
    if (kind === 'bot' && agentName && AGENTS[agentName]) {
      const w = document.createElement('span'); w.className = 'who'; w.textContent = AGENTS[agentName][curLang] || AGENTS[agentName].en; b.appendChild(w);
    }
    const body = document.createElement('span'); body.className = 'txt'; body.textContent = text; b.appendChild(body);
    if (kind === 'me') { const tk = document.createElement('span'); tk.className = 'tick'; tk.textContent = '✓✓'; b.appendChild(tk); }
    row.appendChild(b);
    $('messages').appendChild(row);
    scrollDown();
    return body;
  }
  function addEvent(text, cls) {
    const el = document.createElement('div');
    el.className = 'event' + (cls ? ' ' + cls : '');
    el.innerHTML = cls === 'err' ? '' : '<span class="spin"></span>';
    el.appendChild(document.createTextNode(text));
    $('messages').appendChild(el); scrollDown();
    return el;
  }
  function addTpl(html) {
    const el = document.createElement('div');
    el.className = 'tpl'; el.innerHTML = html;
    $('messages').appendChild(el); scrollDown();
    return el;
  }
  function setChips(list) {
    const box = $('chips'); box.innerHTML = '';
    list.forEach((text, i) => {
      const b = document.createElement('button'); b.textContent = text; b.style.animationDelay = `${i * 60}ms`;
      b.onclick = () => send(text); box.appendChild(b);
    });
  }

  // Timers run in a small worker so a presenter tab left in the background keeps
  // its pace (Chrome throttles main-thread timers in hidden tabs).
  const sleep = (() => {
    try {
      const w = new Worker(URL.createObjectURL(new Blob(['onmessage=(e)=>setTimeout(()=>postMessage(e.data.id),e.data.ms)'], { type: 'text/javascript' })));
      const pending = new Map(); let seq = 0;
      w.onmessage = (e) => { const r = pending.get(e.data); pending.delete(e.data); if (r) r(); };
      return (ms) => new Promise((r) => { const id = ++seq; pending.set(id, r); w.postMessage({ id, ms }); });
    } catch { return (ms) => new Promise((r) => setTimeout(r, ms)); }
  })();
  async function typeOut(el, text, token) {
    const words = text.split(/(\s+)/);
    const step = Math.max(8, Math.min(28, 1100 / Math.max(1, words.length)));
    let out = '';
    for (const w of words) {
      if (token !== runToken) return;
      out += w; el.textContent = out;
      if (w.trim()) { scrollDown(); await sleep(step); }
    }
    el.textContent = text;
  }

  // ── templates ────────────────────────────────────────────────────────────
  function billTemplate() {
    const p = PROFILES[st.profile], t = T[curLang];
    const lines = p.lines.map((l) => `<div class="kv"><span>${t.line} ${esc(l.number)}</span><span>฿${esc(l.amount)}</span></div>`).join('');
    const el = addTpl(`<div class="tpl-card"><div class="tpl-top"><small>${t.billTitle}</small><b>฿${esc(p.amount)}</b></div>
      <div class="tpl-body">${lines}<div class="kv"><span>${t.dueLbl}</span><span>${esc(p.due)}</span></div><div class="kv"><span>${t.status}</span><span style="color:var(--warn);font-weight:600">${t.overdue}</span></div></div>
      <div class="tpl-actions"><button data-a="pay">${t.aPay}</button><button data-a="date">${t.aDate}</button><button data-a="points">${t.aPoints}</button></div></div>`);
    el.querySelector('[data-a="pay"]').onclick = () => send(t.chips.pay);
    el.querySelector('[data-a="date"]').onclick = () => { if (!shown.dates) dateTemplate(); };
    el.querySelector('[data-a="points"]').onclick = () => send(t.chips.points);
  }
  function payTemplate() {
    const t = T[curLang];
    const el = addTpl(`<p class="who" style="margin:0 0 6px">${t.payTitle}</p><div class="carousel">${PAY_OPTIONS.map((o, i) =>
      `<button class="pay-opt" data-i="${i}"><span class="pay-ic">${o.ic}</span><b>${esc(o[curLang][0])}</b><span>${esc(o[curLang][1])}</span></button>`).join('')}</div>`);
    el.querySelectorAll('.pay-opt').forEach((b) => (b.onclick = () => send(t.payWith(PAY_OPTIONS[+b.dataset.i].say[curLang]))));
  }
  function dateTemplate() {
    shown.dates = true;
    const t = T[curLang];
    const now = new Date();
    const picks = [0, 1, 2, 3, 5].map((d) => { const x = new Date(now); x.setDate(now.getDate() + d); return x; });
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    if (end > picks[3]) picks[4] = end;
    const el = addTpl(`<p class="who" style="margin:0 0 6px">${t.dateTitle}</p><div class="dates">${picks.map((d, i) =>
      `<button class="date-pill" data-i="${i}"><small>${i === 0 ? t.today : i === 1 ? t.tomorrow : t.days[d.getDay()]}</small><b>${d.getDate()}</b><small>${t.months[d.getMonth()]}</small></button>`).join('')}</div>`);
    el.querySelectorAll('.date-pill').forEach((b) => (b.onclick = () => {
      el.querySelectorAll('.date-pill').forEach((x) => x.classList.remove('sel')); b.classList.add('sel');
      const d = picks[+b.dataset.i];
      const label = curLang === 'th' ? `${d.getDate()} ${t.monthsLong[d.getMonth()]}` : `${t.days[d.getDay()]} ${d.getDate()} ${t.monthsLong[d.getMonth()]}`;
      pendingDate = label;
      send(t.payOn(label));
    }));
  }
  function promiseTemplate(label) {
    const t = T[curLang];
    addTpl(`<div class="promise"><span class="ok">✓</span><div><b>${t.promiseT}</b><p>${t.promiseS(esc(label))}</p></div></div>`);
  }
  function pointsTemplate(n) {
    const p = PROFILES[st.profile], t = T[curLang];
    addTpl(`<div class="points-card"><small>${t.pointsT}</small><b>${esc(n)}</b><span>${esc(p.tier)} · ${esc(p.displayName[curLang])}</span></div>`);
  }
  function privTemplate() {
    const t = T[curLang];
    addTpl(`<p class="who" style="margin:0 0 6px">${t.privT}</p><div class="carousel">${PRIVS.map((v) =>
      `<div class="priv-card"><div class="pc-top">${v.ic}</div><div class="pc-b"><b>${esc(v[curLang][0])}</b><span>${esc(v[curLang][1])}</span><em>${esc(v.cost)}</em></div></div>`).join('')}</div>`);
  }

  function endCard(token) {
    if (token !== runToken || shown.end) return;
    shown.end = true;
    $('typing').hidden = true;
    $('chips').innerHTML = '';
    const t = T[st.lang];
    $('input').disabled = true; $('input').placeholder = t.endT;
    const el = addTpl(`<div class="end-card"><b>${t.endT}</b><p>${t.endS}</p><button class="btn-primary">${t.endBtn}</button></div>`);
    el.querySelector('button').onclick = () => run();
    setConn('idle', 'Chat ended');
  }

  function surveyTemplate() {
    const el = addTpl(`<div class="survey">${[1, 2, 3, 4, 5].map((n) => `<button data-n="${n}" aria-label="${n}">★</button>`).join('')}</div>`);
    const btns = [...el.querySelectorAll('button')];
    btns.forEach((b) => {
      b.onmouseenter = () => btns.forEach((x) => x.classList.toggle('lit', +x.dataset.n <= +b.dataset.n));
      b.onclick = () => { btns.forEach((x) => { x.classList.toggle('lit', +x.dataset.n <= +b.dataset.n); x.disabled = true; }); send(b.dataset.n); };
    });
  }

  // Which card follows a bot message. Presentation only: the agents decide the content.
  function afterBot(text, agent) {
    const t = T[curLang];
    if (agent === 'Customer_Verification_Agent' && st.entry !== 'anonymous' && !shown.bill) { shown.bill = true; billTemplate(); }
    if (agent === 'Payment_Outcome_Agent') {
      if (/(pay your bill in|pay through|pay at|ways to pay|banking app|ชำระค่าใช้บริการได้ที่|ชำระผ่านช่องทาง|ชำระได้ที่)/i.test(text) && !shown.pay) { shown.pay = true; payTemplate(); }
      if (/(when|which date|what date|which day|by when|convenient|pay by|วันไหน|วันที่เท่าไ|สะดวก|ชำระได้วัน|ภายในวัน)/i.test(text) && !shown.dates) dateTemplate();
      if (pendingDate && /(noted|record|confirm|thank you|got it|great|บันทึก|รับทราบ|ขอบคุณ|ยืนยัน)/i.test(text)) { promiseTemplate(pendingDate); pendingDate = null; shown.promise = true; }
    }
    if (agent === 'AIS_PnP_Points_Account') {
      const m = text.match(/(\d[\d,]{1,})\s*(?:ais\s*)?(points?|คะแนน|พอยท์|พอยต์)/i);
      if (m && !shown.points) { shown.points = true; pointsTemplate(m[1]); }
    }
    if (agent === 'AIS_PnP_Rewards_Privileges' && !shown.priv) { shown.priv = true; privTemplate(); }
    if (agent === 'Collection_Survey_Agent' && /(1|๑).{0,12}(5|๕)/.test(text) && !shown.survey) { shown.survey = true; surveyTemplate(); $('chips').innerHTML = ''; return; }

    const returning = /(back to your bill|back to the bill|กลับมา|เรื่องค่าบริการ|เรื่องบิล)/i.test(text);
    if (returning && !shown.promise) { if (!shown.dates) dateTemplate(); setChips([t.chips.pay, t.chips.why]); }
    else if (agent === 'AIS_PnP_Points_Account' || agent === 'AIS_PnP_Rewards_Privileges') setChips([t.chips.thanks, t.back]);
    else if (shown.promise) setChips([t.chips.thanks, t.chips.points]);
    else if (agent === 'Payment_Outcome_Agent') setChips([t.chips.pay, t.chips.why, t.chips.points]);
    else if (st.entry === 'anonymous') setChips(curLang === 'th' ? ['ใช่ค่ะ', 'ไม่ใช่ค่ะ'] : ['Yes, speaking', 'No, wrong person']);
  }

  function noteAgent(name) {
    if (!name || name === lastAgent) return;
    const prev = lastAgent; lastAgent = name;
    const meta = AGENTS[name];
    $('liveAgent').textContent = meta ? meta.path : name;
    const li = document.createElement('li'); li.textContent = meta ? meta.path : name; $('agentPath').appendChild(li);
    if (prev && meta && meta.pnp && name !== 'AIS_Demo_Supervisor') {
      const ev = addEvent(T[curLang].handoff(meta[curLang]));
      setTimeout(() => ev.querySelector('.spin')?.remove(), 900);
    }
  }

  function detectLang(text) {
    if (/[ก-๙]/.test(text)) return 'th';
    if (/[A-Za-z]{3,}/.test(text)) return 'en';
    return curLang;
  }

  function onMessage(m, token) {
    if (token !== runToken || !m) return;
    const meta = m.metadata || {};
    if (m.role === 'user') return; // user bubbles are drawn locally; the starter stays hidden
    if (meta.agentName) noteAgent(meta.agentName);
    if (meta.activityKind === 'handoff' || m.role === 'system') return;
    const text = (m.content || '').trim();
    if (!text || /^[\s.…,]*$/.test(text)) return;
    if (seen.has(m.id)) { const el = seen.get(m.id); if (el) el.textContent = text; return; }
    const agent = meta.agentName || lastAgent;
    seen.set(m.id, null);
    queue = queue.then(async () => {
      if (token !== runToken) return;
      curLang = st.lang;
      $('typingWho').textContent = (AGENTS[agent] && AGENTS[agent][curLang]) || '';
      $('typing').hidden = false; scrollDown();
      await sleep(380);
      $('typing').hidden = true;
      const el = addRow('bot', '', agent);
      seen.set(m.id, el);
      await typeOut(el, text, token);
      afterBot(text, agent);
      endTimer = null;
      if (/(goodbye|สวัสดีค่ะ\s*$|สวัสดีครับ\s*$)/i.test(text)) { const mark = endTimer = Symbol('end'); sleep(7000).then(() => { if (endTimer === mark) endCard(token); }); }
      await sleep(120);
    });
  }

  // ── session ──────────────────────────────────────────────────────────────
  async function teardown() {
    const old = sdk; sdk = null; chat = null;
    if (!old) return;
    try { await old.endSession?.(); } catch { /* ignore */ }
    try { old.disconnect?.(); } catch { /* ignore */ }
  }

  async function run() {
    const token = ++runToken;
    endTimer = null; $('input').disabled = false;
    seen = new Map(); shown = {}; lastAgent = null; lastErr = ''; pendingDate = null; queue = Promise.resolve();
    await teardown();
    renderSite(); renderPresenter(); prepareChat();
    const isLink = st.entry === 'reminder_link';
    $('site').hidden = isLink;
    $('phoneStage').hidden = !isLink;
    $('chat').hidden = true;
    $('launcher').hidden = true;

    if (isLink) {
      const p = PROFILES[st.profile];
      $('smsView').hidden = false;
      $('smsText').textContent = st.lang === 'th'
        ? `AIS: ค่าอินเทอร์เน็ตบ้าน 3BB Fibre เบอร์ ${p.numberMasked} ยอด ${p.amount} บาท เลยกำหนดชำระแล้ว แตะลิงก์เพื่อคุยกับผู้ช่วย AIS ได้ทันที`
        : `AIS: Your 3BB Fibre bill for ${p.numberMasked} (฿${p.amount}) is overdue. Tap the secure link to sort it out with the AIS assistant.`;
      setConn('idle', 'Waiting for the customer to tap the link');
      $('smsLink').onclick = () => { $('smsView').hidden = true; $('chat').hidden = false; start(token); };
    } else {
      setConn('idle', 'Customer is browsing…');
      $('launcher').hidden = false;
      const open = () => { if (token !== runToken || !$('chat').hidden) return; $('launcher').hidden = true; $('chat').hidden = false; start(token); };
      $('launcher').onclick = open;
      document.querySelectorAll('[data-ask]').forEach((b) => (b.onclick = open));
      setTimeout(open, st.entry === 'anonymous' ? 1600 : 1300);
    }
  }

  let started = new Set();
  // Mock-up scenarios replay a scripted conversation in the chat; no session is opened on the platform.
  async function playMock(token) {
    setConn('idle', 'Mock-up: scripted, not a live session');
    $('chatSub').textContent = 'Mock-up · scripted';
    await sleep(600);
    for (const step of st.scenario.script || []) {
      if (token !== runToken) return;
      const [kind, a, b] = step;
      if (kind === 'me') { addRow('me', a); await sleep(900); }
      else if (kind === 'event') { const ev = addEvent(T[st.lang].handoff(a)); await sleep(900); ev.querySelector('.spin')?.remove(); }
      else if (kind === 'dates') { shown.dates = false; dateTemplate(); }
      else {
        curLang = st.lang;
        $('typing').hidden = false; scrollDown(); await sleep(700); $('typing').hidden = true;
        const el = addRow('bot', '', a);
        await typeOut(el, b, token);
        await sleep(300);
      }
    }
    $('typing').hidden = true;
    window.__autoDone = true;
  }

  async function start(token) {
    if (st.scenario.mock) return playMock(token);
    if (started.has(token)) return;
    started.add(token);
    const p = PROFILES[st.profile];
    setConn('idle', 'Connecting…');
    $('typingWho').textContent = '';
    $('typing').hidden = false;
    let AgentSDK;
    try { AgentSDK = await loadSdk(); } catch (e) { return fail(e, token); }
    if (token !== runToken) return;

    const opts = {
      endpoint: cfg.endpoint,
      projectId: cfg.projectId,
      apiKey: cfg.apiKey,
      userContext: {
        userId: `ceo-demo-${st.profile}-${Date.now()}`,
        customAttributes: { web_language: st.lang, web_entry: st.entry, web_authenticated: st.entry !== 'anonymous', web_overlay: true, ...p.profile, ...(p.names ? p.names[st.lang] : {}) },
      },
    };
    if (cfg.channelId) opts.channelId = cfg.channelId;
    try {
      sdk = new AgentSDK(opts);
      chat = sdk.chat();
      chat.on('message', (m) => onMessage(m, token));
      chat.on('error', (e) => onError(e, token));
      sdk.on('error', (e) => onError(e, token));
      sdk.on('sessionEnd', () => { if (token === runToken) queue = queue.then(() => endCard(token)); });
      sdk.on('sessionStart', (e) => { if (token !== runToken) return; $('liveSession').textContent = e.sessionId || '—'; setConn('on', 'Live session'); });
      try { await sdk.connect({ initialMessage: STARTER[st.lang] }); }
      catch (e) { if (!/initialMessage|ticket/i.test(String(e && e.message))) throw e; await sdk.connect(); await chat.send(STARTER[st.lang]); }
      if (token === runToken) setConn('on', 'Live session');
    } catch (e) { fail(e, token); }
  }

  function errText(e) {
    if (!e) return 'Unknown error';
    if (typeof e === 'string') return e;
    const inner = e.error && typeof e.error === 'object' ? e.error : null;
    return e.message || (inner && (inner.message || inner.code)) || (typeof e.error === 'string' ? e.error : '') || e.code || JSON.stringify(e).slice(0, 200);
  }
  function onError(e, token) {
    if (token !== runToken) return;
    const text = errText(e);
    if (text === lastErr) return;
    lastErr = text;
    $('typing').hidden = true;
    addEvent(text, 'err');
    if (/resolve deployment|unauthori|forbidden|origin|invalid api key|expired/i.test(text)) { setConn('err', 'Stopped: ' + text); teardown(); }
  }
  function fail(e, token) {
    if (token !== runToken) return;
    $('typing').hidden = true;
    setConn('err', 'Connection failed');
    const text = errText(e);
    if (text !== lastErr) addEvent(`Could not start the session: ${text}`, 'err');
    lastErr = text;
    console.error(e);
    teardown();
  }

  async function send(text) {
    text = (text || '').trim();
    if (!text || !chat || shown.end) return;
    endTimer = null;
    $('chips').innerHTML = '';
    curLang = st.lang;
    addRow('me', text);
    const token = runToken;
    setTimeout(() => { if (token === runToken) { $('typingWho').textContent = ''; $('typing').hidden = false; scrollDown(); } }, 250);
    try { await chat.send(text); }
    catch (e) { $('typing').hidden = true; addEvent(`Send failed: ${errText(e)}`, 'err'); }
  }

  // ── wiring ───────────────────────────────────────────────────────────────
  $('composer').addEventListener('submit', (ev) => { ev.preventDefault(); const v = $('input').value; $('input').value = ''; send(v); });
  $('chatMin').onclick = () => {
    if (st.entry === 'reminder_link') return;
    $('chat').hidden = true; $('launcher').hidden = false;
    $('launcher').onclick = () => { $('launcher').hidden = true; $('chat').hidden = false; };
  };
  $('btnCopy').onclick = async () => {
    try { await navigator.clipboard.writeText($('liveSession').textContent); $('btnCopy').textContent = 'copied'; } catch { /* ignore */ }
    setTimeout(() => ($('btnCopy').textContent = 'copy'), 1200);
  };
  function esc(s) { return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }

  // Demo capture helper: the transcript as shown, for the presenter guide.
  window.__demoTranscript = () => [...$('messages').children].map((el) => {
    if (el.classList.contains('row')) {
      const who = el.querySelector('.who');
      return { k: el.classList.contains('me') ? 'you' : 'bot', who: who ? who.textContent : '', text: el.querySelector('.txt').textContent };
    }
    if (el.classList.contains('event')) return { k: 'event', text: el.textContent };
    return { k: 'card', text: el.textContent.replace(/\s+/g, ' ').trim().slice(0, 140) };
  });
  window.__demoRef = () => $('liveSession').textContent.replace(/^sdk_/, '');

  // Auto-play: sends the scenario's lines one by one, each after Ari has finished
  // replying, and taps 5 stars when the survey card appears. Optional ?capture=PORT
  // posts the finished transcript to a local recorder (used to build the guide).
  async function autoPlay(capturePort) {
    const token = runToken;
    const bots = () => document.querySelectorAll('#messages .row.bot').length;
    async function idle(max = 90) {
      let last = -1, stable = 0;
      for (let i = 0; i < max; i++) {
        await sleep(1000);
        if (token !== runToken) return false;
        const c = bots();
        if (c === last && $('typing').hidden && c > 0) { if (++stable >= 7) return true; } else stable = 0;
        last = c;
      }
      return false;
    }
    const log = [];
    if (st.entry === 'reminder_link' && !$('smsView').hidden) { await sleep(1500); $('smsLink').click(); }
    if (!(await idle())) log.push('no-greeting');
    for (const line of currentLines()) {
      if (token !== runToken) return;
      if ($('input').disabled) { log.push('ended-before: ' + line); break; }
      await send(line);
      await sleep(1500);
      if (!(await idle())) log.push('slow-reply: ' + line);
      const star = document.querySelector('.survey button[data-n="5"]');
      if (star && !star.disabled) { star.click(); await sleep(1500); await idle(); }
    }
    await sleep(3500);
    if (capturePort && token === runToken) {
      const payload = { id: st.scenario.id, lang: st.lang, ref: window.__demoRef(), log, tx: window.__demoTranscript(), at: new Date().toISOString() };
      try { await fetch(`http://127.0.0.1:${capturePort}/save`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }); } catch { /* ignore */ }
    }
    window.__autoDone = true;
    // ?queue=a,b,c plays the next scenario after this one, in the same tab, one session at a time.
    const queue = (new URLSearchParams(location.search).get('queue') || '').split(',').filter(Boolean);
    if (queue.length && token === runToken) {
      await teardown();
      await sleep(2000);
      const next = queue.shift();
      location.href = `/?autoplay=${encodeURIComponent(next)}${capturePort ? `&capture=${capturePort}` : ''}${queue.length ? `&queue=${queue.join(',')}` : ''}`;
    }
  }
  function currentLines() {
    const c = T[st.lang].chips;
    return st.scenario.lang === st.lang ? (st.scenario.lines || []) : [c.pay, c.points, c.why, c.date, c.thanks];
  }
  $('btnAuto').onclick = () => autoPlay();

  initBar();
  renderSite();
  renderPresenter();
  loadSdk().catch((e) => setConn('err', e.message));
  setConn('idle', 'Ready · press Start');
  const qp = new URLSearchParams(location.search);
  if (qp.get('autoplay')) {
    const sc = SCENARIOS.find((x) => x.id === qp.get('autoplay'));
    if (sc) {
      st.scenario = sc; Object.assign(st, { profile: sc.profile, entry: sc.entry, lang: sc.lang });
      syncBar();
      run().then(() => setTimeout(() => autoPlay(qp.get('capture')), 300));
    }
  }
})();
