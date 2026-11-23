// Scenario catalogue for the 3BB Demo Lite launcher. All customer data is fictitious sample data.
// Profiles are sent as flat Web SDK custom attributes; the agents read them as session.*.

window.LITE_PROFILES = {
  somchai: {
    label: 'คุณสมชาย ใจดี · ฿2,179.00 · Gold',
    display: { th: 'คุณสมชาย ใจดี', en: 'Somchai Jaidee' },
    initials: 'สช', tier: 'Gold', points: 2450, amount: '2,179.00', card: { holder: 'SOMCHAI JAIDEE', number: '5412 7534 1209 4471', exp: '09/27' }, privilege: { brand: "McDonald's", tier: 'Gold', icon: '🥧', color: '#da291c', accent: '#ffc72c', benefit: { en: '1 free pie (pineapple or corn)', th: 'พายฟรี 1 ชิ้น (สับปะรดหรือข้าวโพด)' }, where: { en: ['Suvarnabhumi', 'Don Mueang', 'Chiang Mai'], th: ['สุวรรณภูมิ', 'ดอนเมือง', 'เชียงใหม่'] } }, line: '4471', due: '08 Nov 2026',
    attrs: {
      customer_name_en: 'Somchai', customer_name_th: 'สมชาย',
      bill_amount_en: '2,179 baht', bill_amount_th: '2,179 บาท',
      line_last4: '4471', line_last4_spoken: '4 4 7 1',
      deadline_en: '31 December 2026', deadline_th: '31 ธันวาคม 2569',
      privilege_brand: "McDonald's", privilege_offer_en: "a free pineapple or corn pie at McDonald's, Suvarnabhumi, Don Mueang or Chiang Mai Airport", privilege_offer_th: "พายฟรี 1 ชิ้น (สับปะรดหรือข้าวโพด) ที่ McDonald's สนามบินสุวรรณภูมิ ดอนเมือง หรือเชียงใหม่",
      points_balance: '2,450', points_expiring: '500',
    },
  },
  nawaporn: {
    label: 'คุณนวพร ทดสอบ · ฿5,197.60 · Platinum',
    display: { th: 'คุณนวพร ทดสอบ', en: 'Nawaporn Thodsob' },
    initials: 'นว', tier: 'Platinum', points: 1280, amount: '5,197.60', card: { holder: 'NAWAPORN THODSOB', number: '3530 1113 3330 0320', exp: '03/29' }, privilege: { brand: 'Starbucks', tier: 'Platinum', icon: '☕', color: '#00704a', accent: '#d4e9e2', benefit: { en: 'Free hot or iced Americano and a waffle', th: 'อเมริกาโน่ร้อนหรือเย็น พร้อมวาฟเฟิล ฟรี' }, where: { en: ['Suvarnabhumi (4th floor)', 'Phuket (landside)'], th: ['สุวรรณภูมิ (ชั้น 4)', 'ภูเก็ต'] } }, line: '0320', due: '11 Nov 2026',
    attrs: {
      customer_name_en: 'Nawaporn', customer_name_th: 'นวพร',
      bill_amount_en: '5,197.60 baht', bill_amount_th: '5,197 บาท 60 สตางค์',
      line_last4: '0320', line_last4_spoken: '0 3 2 0',
      deadline_en: '31 December 2026', deadline_th: '31 ธันวาคม 2569',
      privilege_brand: 'Starbucks', privilege_offer_en: 'a free hot or iced Americano and a waffle at Starbucks, Suvarnabhumi Airport (4th floor) or Phuket Airport', privilege_offer_th: 'อเมริกาโน่ร้อนหรือเย็นพร้อมวาฟเฟิล ที่ Starbucks สนามบินสุวรรณภูมิ (ชั้น 4) หรือสนามบินภูเก็ต',
    },
  },
  daniel: {
    label: 'Daniel Brooks · ฿799.00 · Classic',
    display: { th: 'คุณแดเนียล บรู๊คส์', en: 'Daniel Brooks' },
    initials: 'DB', tier: 'Classic', points: 1280, amount: '799.00', card: { holder: 'DANIEL BROOKS', number: '4242 4242 4242 7781', exp: '12/28' }, privilege: { brand: 'KFC', tier: 'Gold', icon: '🍗', color: '#e4002b', accent: '#fff1f2', benefit: { en: 'Free hot or iced drink', th: 'เครื่องดื่มร้อนหรือเย็นฟรี 1 แก้ว' }, where: { en: ['Suvarnabhumi'], th: ['สุวรรณภูมิ'] } }, line: '7781', due: '14 Nov 2026',
    attrs: {
      customer_name_en: 'Daniel', customer_name_th: 'แดเนียล',
      bill_amount_en: '799 baht', bill_amount_th: '799 บาท',
      line_last4: '7781', line_last4_spoken: '7 7 8 1',
      deadline_en: '31 December 2026', deadline_th: '31 ธันวาคม 2569',
      privilege_brand: 'KFC', privilege_offer_en: 'a free hot or iced drink at KFC, Suvarnabhumi Airport', privilege_offer_th: 'เครื่องดื่มร้อนหรือเย็นฟรี 1 แก้วที่ KFC สนามบินสุวรรณภูมิ',
    },
  },
};

// entry: visit (signed in on ais.th), reminder_link (opened the SMS link), inbound (registered caller)
window.LITE_SCENARIOS = [
  {
    id: 's0',
    title: { en: '★ Showcase · everything in one conversation', th: '★ โชว์เคส · ครบทุกความสามารถ' },
    profile: 'daniel', entry: 'visit', lang: 'en',
    shows: ['FAQ + FAQ', 'FAQ + specialist', 'Interrupt and come back', 'Language switch ×2', 'Roaming activated', 'Privilege redeemed', "Can't pay → free treat", 'Pay by card', 'Thank-you treat', 'Survey'],
    pitch: 'One customer, one conversation: two questions at once, an FAQ that becomes a points check, a switch to Thai, a roaming pack for Japan in the middle of the bill, back to English for a privilege. Then the customer says they cannot pay: Ari asks for the earliest payment and gifts a free airport treat. They change their mind, pay by card in the chat, get a thank-you treat, and rate the service. Every detour comes back to the bill.',
    lines: [
      { text: 'How can I pay, and what happens if I pay late?', note: 'Two FAQs in one message, answered one after the other from the knowledge base' },
      { text: 'Why is my bill higher this month, and how many AIS Points do I have?', note: 'FAQ + specialist: the bill FAQ, then the AIS Points agent, then back to the bill' },
      { text: 'ขอคุยเป็นภาษาไทยได้ไหมครับ', note: 'Language switch: Ari continues in Thai from this turn' },
      { text: 'อาทิตย์หน้าจะไปญี่ปุ่น ขอแพ็กเกจโรมมิ่งหน่อยครับ', note: 'Interrupt the bill in Thai: the roaming specialist takes over' },
      { text: '7 วัน', note: 'Pick the 7-day pack (or tap a pack card)' },
      { text: 'ใช่ครับ', note: 'Confirm: plane animation and boarding pass, then back to the bill in Thai' },
      { text: 'What privileges can I get with my points?', note: 'Back in English automatically: the privileges specialist' },
      { text: '2', note: 'Choose the LINE sticker set (or tap it)' },
      { text: 'yes', note: 'Redeem: gift animation, points tile drops, back to the bill' },
      { text: "Honestly, I can't pay right now", note: 'Ari asks for payment at the earliest, then gifts a free airport treat: the e-coupon card appears' },
      { text: 'Actually, I want to pay now', note: 'Pay now (or tap Pay now on the date card): the card form opens with this customer\'s card' },
      { text: "I've paid by card", note: 'Taps Pay on the card: payment succeeds and Ari says thank you with a free treat' },
      { text: '5', note: 'Survey rating (or tap the stars)' },
      { text: 'Amazing service, thank you!', note: 'Survey comment, then the chat closes in the conversation language' },
    ],
  },
  {
    id: 's1',
    title: { en: 'Signed in · two FAQs at once · English → Thai', th: 'เข้าสู่ระบบ · ถามสองคำถาม · อังกฤษ → ไทย' },
    profile: 'daniel', entry: 'visit', lang: 'en',
    shows: ['Proactive greeting', 'Protected amount', 'FAQ + FAQ', 'Language switch', 'Points FAQ', 'Date picker', 'Survey'],
    pitch: 'A signed-in customer is greeted with the overdue bill. One message holds two questions; both come from the knowledge base. He switches to Thai and the agent follows on the next turn.',
    lines: [
      'How can I pay, and what happens if I pay late?',
      'ขอคุยเป็นภาษาไทยได้ไหมครับ',
      'ใช้คะแนน AIS Points จ่ายบิลได้ไหมครับ',
      'จะชำระวันศุกร์นี้ครับ',
      '5',
      'บริการดีมากครับ',
    ],
  },
  {
    id: 's2',
    title: { en: 'SMS link · FAQ + points · roaming for Japan · back to the bill', th: 'ลิงก์ SMS · FAQ + คะแนน · โรมมิ่งญี่ปุ่น · กลับมาเรื่องบิล' },
    profile: 'daniel', entry: 'reminder_link', lang: 'en',
    shows: ['Verified by link', 'FAQ + intent', 'Supervisor routing', 'Points specialist', 'Roaming flow', 'Return to the bill', 'Thai switch', 'Survey'],
    pitch: 'Outbound without a call: the customer opens the SMS reminder. One message mixes an FAQ and a points request; then a roaming pack for Japan is activated and the agent returns to the bill, in Thai.',
    lines: [
      'Why is my bill higher this month, and how many AIS Points do I have?',
      "I'm travelling to Japan next week, can I get a roaming package?",
      'the 7 day one',
      'yes please',
      'ขอคุยเป็นภาษาไทยได้ไหมคะ',
      'จะชำระวันศุกร์นี้ค่ะ',
      '5',
      'บริการดีมากค่ะ',
    ],
  },
  {
    id: 's3',
    title: { en: 'Inbound caller · privileges · "pay now" → SMS link', th: 'ลูกค้าโทรเข้า · สิทธิพิเศษ · "ขอจ่ายเลย" → ลิงก์ SMS' },
    profile: 'daniel', entry: 'inbound', lang: 'en',
    shows: ['Registered caller', 'Greeted by name', 'Privileges flow', 'Redeem with points', 'Language switch', 'Pay-now SMS link', 'Chat closed'],
    pitch: 'The registered customer calls in. Ari greets him by name, redeems a privilege with points, he switches to Thai and asks to pay now: Ari sends the web-chat link by SMS in Thai.',
    lines: [
      'What privileges can I get with my points?',
      '2',
      'yes',
      'ขอคุยเป็นภาษาไทยได้ไหมคะ',
      'อยากชำระค่าบริการตอนนี้เลยค่ะ',
    ],
  },
];
