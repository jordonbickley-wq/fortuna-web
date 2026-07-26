/* ================= i18n ================= */
const STRINGS = {
  en: {
    nav_dream: 'Dream', nav_modules: 'Modules', nav_shop: 'Shop', nav_temples: 'Temples',
    hero_eyebrow: 'Dream reading · Lucky numbers · Fortune',
    hero_h1: 'What did you dream<br>about <em>last night?</em>',
    hero_p: "Type your dream and get an instant reading, plus your personal lucky numbers before the next Government Lottery draw.",
    dream_input_placeholder: 'e.g. I dreamed about a big snake...',
    reveal_btn: 'Reveal ✦',
    symbol_grid_label: 'Or pick a category',
    stat_dreams: 'dreams read today', stat_unlocks: 'draw passes unlocked', stat_days: 'days to next draw',
    today_heading: "Today's Fortune", today_sub: 'A quick daily read before you go about your day',
    color_desc: 'Traditional Thai day-color — worn for good fortune',
    moon_label: 'Moon Phase', moon_desc: 'Approximate — for the fun of it 🌙',
    countdown_label: 'Government Lottery Countdown',
    modules_heading: 'Everything luck, in one place', modules_sub: 'Tap "Try it" on any card',
    plate_title: 'Lucky License Plate', plate_desc: "Check what your car's plate number means for love, money, and work.",
    phone_title: 'Lucky Phone Number', phone_desc: "Analyze your phone number's digit pattern for fortune.",
    zodiac_title: 'Daily Zodiac Reading', zodiac_desc: 'Pick your Chinese zodiac year for a quick daily read.',
    name_title: 'Name Numerology', name_desc: 'Your name reduces to a power number with its own meaning.',
    amulet_title: 'Amulet Match', amulet_desc: "Get a suggested amulet type based on what you're seeking luck for.",
    try_it_btn: 'Try it',
    plate_go_btn: 'Check plate', phone_go_btn: 'Check number', zodiac_go_btn: "Get today's reading",
    name_go_btn: 'Reveal number', amulet_go_btn: 'Find my match',
    amulet_select_default: 'What are you seeking?',
    amulet_opt_wealth: 'Wealth & money', amulet_opt_love: 'Love & relationships',
    amulet_opt_protection: 'Protection & safety', amulet_opt_career: 'Career success',
    shop_heading: 'Shop Lucky Items', shop_sub: 'Traditional amulets and charms',
    trends_heading: 'Most-read dream symbols', trends_sub: 'Real counts from actual readings on this site',
    trends_empty: 'Not enough readings yet — check back once more people have tried it!',
    temples_heading: 'Where Thais Go for Lucky Numbers',
    temples_sub: 'Five real, well-known pilgrimage sites — not a guarantee of anything, just cultural context',
    footer_tagline: 'Fortuna — your everyday luck companion',
    footer_disclaimer: "This app references Thailand's official Government Lottery (สลากกินแบ่งรัฐบาล) only.",
    sign_in: 'Sign in with LINE', sign_in_soon: 'Sign in with LINE (soon)', sign_out: 'Sign out',
    line_coming_soon_hint: "LINE sign-in is launching soon — for now you're browsing as a guest, and your personal number and Draw Pass still work normally.",
    reading_tag: 'Your reading', reading_tag_solo: 'Reading',
    no_match_headline: 'No specific match yet',
    no_match_body: "We don't have that symbol in the dictionary yet — try describing another part of the dream, or pick from the categories below.",
    reading_label: '🐍 Reading',
    personal_note: 'Green number = your personal number today',
    unlocked_note: 'This Government Lottery draw is unlocked ✨',
    draw_today: 'Government Lottery draw is today!',
    draw_days_to: (n) => `${n} days to Government Lottery draw`,
    unlock_btn: (thb) => `Unlock — ${thb} THB`,
    premium_soon: 'Premium numbers unlock is launching soon — check back shortly!',
    payment_submitted_note: "✓ Payment submitted — we'll confirm it shortly and your numbers will unlock automatically.",
    step1_pay: (thb) => `Step 1 — Scan to pay ${thb} THB via PromptPay`,
    step2_contact: (info) => `Step 2 — ${info}`,
    payer_note_placeholder: 'Your name (optional, helps us find your payment)',
    ive_paid_btn: "I've paid",
    claim_submitted: "✓ Submitted! We'll confirm it shortly and unlock your numbers automatically.",
    claim_already: 'Already unlocked ✨',
    claim_error: 'Something went wrong — please try again.',
    waiting_payment: 'Waiting for payment...',
    payment_confirmed_refresh: 'Payment confirmed! Refreshing your reading...',
    qr_unavailable: 'QR code unavailable — check Omise configuration.',
    scan_promptpay: (thb) => `Scan with your banking app to pay ${thb} THB via PromptPay`,
    footer_draw_today: 'Government Lottery draw day is today!',
    footer_draw_next: (date, days) => `Next Government Lottery draw: ${date} (${days} days)`,
    countdown_sub_today: 'Government Lottery draw is today!',
    countdown_sub_days: (date, days) => `${date} · ${days} days away`,
    color_of_day: (name) => `Color of the Day: ${name}`,
    plate_result: (val, score) => `Plate <strong>${val}</strong> — overall fortune score ${score}/100`,
    phone_result: (val, score) => `Number <strong>${val}</strong> — overall fortune score ${score}/100`,
    ring_love: 'Love', ring_money: 'Money', ring_work: 'Work',
    name_result: (name, power, meaning) => `"<strong>${name}</strong>" reduces to power number <strong>${power}</strong> — ${meaning}.`,
    shop_this_type: 'Shop this type →',
    buy_btn: 'Buy', loading: 'Loading...', error_generic: 'Something went wrong — please try again.',
    order_note_placeholder: 'Your name or preferences (optional)',
    order_confirmed: "✓ Got it! We'll find the right one for you personally and message you on LINE to confirm details.",
    open_in_maps: 'Open in Google Maps →',
    temples_disclaimer: 'These are real, documented pilgrimage sites — included here as cultural context, not as a claim that visiting predicts Government Lottery outcomes.',
    choose_zodiac_default: 'Choose your year animal...',
  },
  th: {
    nav_dream: 'ทำนายฝัน', nav_modules: 'ฟีเจอร์', nav_shop: 'ร้านค้า', nav_temples: 'วัดเลขเด็ด',
    hero_eyebrow: 'ทำนายฝัน · เลขมงคล · เสริมดวง',
    hero_h1: 'คืนนี้คุณฝันเห็น<br><em>อะไร?</em>',
    hero_p: 'พิมพ์ความฝันของคุณ แล้วรับคำทำนายพร้อมเลขนำโชคประจำตัว ก่อนหวยรัฐบาลออกงวดหน้า',
    dream_input_placeholder: 'เช่น เมื่อคืนฝันเห็นงูใหญ่มาก...',
    reveal_btn: 'ทำนาย ✦',
    symbol_grid_label: 'หรือเลือกจากหมวดหมู่ความฝัน',
    stat_dreams: 'ฝันที่ถูกทำนายวันนี้', stat_unlocks: 'คนที่ปลดล็อกงวดนี้', stat_days: 'วันก่อนหวยออก',
    today_heading: 'ดวงประจำวันนี้', today_sub: 'เช็กดวงสั้นๆ ก่อนเริ่มวันของคุณ',
    color_desc: 'ตามความเชื่อไทยดั้งเดิม ใส่เสริมดวงได้',
    moon_label: 'ข้างขึ้นข้างแรม', moon_desc: 'ค่าโดยประมาณ เพื่อความสนุก 🌙',
    countdown_label: 'นับถอยหลังหวยรัฐบาลออก',
    modules_heading: 'ครบเรื่องเลขมงคลในที่เดียว', modules_sub: 'กด "ลองเลย" ที่การ์ดไหนก็ได้',
    plate_title: 'เลขทะเบียนรถมงคล', plate_desc: 'เช็กเลขทะเบียนรถของคุณ ว่าเสริมดวงด้านความรัก การเงิน และการงานแค่ไหน',
    phone_title: 'เลขมงคลเบอร์โทร', phone_desc: 'วิเคราะห์รูปแบบตัวเลขในเบอร์โทรศัพท์ของคุณ',
    zodiac_title: 'ดวงรายวันตามปีนักษัตร', zodiac_desc: 'เลือกปีนักษัตรของคุณ เพื่อดูดวงประจำวันนี้',
    name_title: 'เลขศาสตร์ชื่อ', name_desc: 'ชื่อของคุณลดทอนเป็นเลขพลังประจำตัว พร้อมความหมาย',
    amulet_title: 'เลือกวัตถุมงคลที่เหมาะกับคุณ', amulet_desc: 'รับคำแนะนำวัตถุมงคลตามสิ่งที่คุณอยากเสริมดวง',
    try_it_btn: 'ลองเลย',
    plate_go_btn: 'เช็กเลขทะเบียน', phone_go_btn: 'เช็กเบอร์โทร', zodiac_go_btn: 'ดูดวงวันนี้',
    name_go_btn: 'ดูเลขประจำชื่อ', amulet_go_btn: 'ดูวัตถุมงคลที่เหมาะกับฉัน',
    amulet_select_default: 'คุณอยากเสริมดวงด้านไหน?',
    amulet_opt_wealth: 'เงินทองและความมั่งคั่ง', amulet_opt_love: 'ความรักและความสัมพันธ์',
    amulet_opt_protection: 'ความปลอดภัยและการปกป้อง', amulet_opt_career: 'ความสำเร็จในหน้าที่การงาน',
    shop_heading: 'ร้านค้าของมงคล', shop_sub: 'วัตถุมงคลและเครื่องรางแบบดั้งเดิม',
    trends_heading: 'ความฝันยอดฮิต', trends_sub: 'ตัวเลขจริงจากการทำนายบนเว็บไซต์นี้',
    trends_empty: 'ยังมีข้อมูลไม่มากพอ — กลับมาดูใหม่เมื่อมีคนลองใช้มากขึ้น!',
    temples_heading: 'สถานที่คนไทยไปขอเลขเด็ด',
    temples_sub: '5 สถานที่จริงที่มีชื่อเสียงเรื่องเลขเด็ด — ไม่ได้การันตีผลลัพธ์ใดๆ เป็นเพียงข้อมูลวัฒนธรรม',
    footer_tagline: 'โชคดี — เพื่อนคู่ใจสายมูทุกวัน',
    footer_disclaimer: 'แอปนี้อ้างอิงเฉพาะสลากกินแบ่งรัฐบาลไทยเท่านั้น',
    sign_in: 'เข้าสู่ระบบด้วย LINE', sign_in_soon: 'เข้าสู่ระบบด้วย LINE (เร็วๆ นี้)', sign_out: 'ออกจากระบบ',
    line_coming_soon_hint: 'การเข้าสู่ระบบด้วย LINE กำลังจะเปิดให้ใช้เร็วๆ นี้ — ตอนนี้คุณกำลังใช้งานแบบผู้เยี่ยมชม เลขส่วนตัวและ Draw Pass ยังใช้งานได้ตามปกติ',
    reading_tag: 'ผลการทำนาย', reading_tag_solo: 'ผลการทำนาย',
    no_match_headline: 'ยังไม่มีข้อมูลสำหรับความฝันนี้',
    no_match_body: 'เรายังไม่มีสัญลักษณ์นี้ในคลังข้อมูล ลองอธิบายส่วนอื่นของความฝัน หรือเลือกจากหมวดหมู่ด้านล่าง',
    reading_label: '🐍 ผลทำนาย',
    personal_note: 'เลขสีเขียว = เลขส่วนตัวของคุณวันนี้',
    unlocked_note: 'งวดนี้ปลดล็อกแล้ว ✨',
    draw_today: 'วันนี้หวยรัฐบาลออก!',
    draw_days_to: (n) => `อีก ${n} วันหวยรัฐบาลออก`,
    unlock_btn: (thb) => `ปลดล็อก — ${thb} บาท`,
    premium_soon: 'ปลดล็อกเลขเด็ดหวยรัฐบาลกำลังจะเปิดให้ใช้เร็วๆ นี้',
    payment_submitted_note: '✓ ส่งคำขอแล้ว เราจะยืนยันเร็วๆ นี้ และเลขของคุณจะปลดล็อกอัตโนมัติ',
    step1_pay: (thb) => `ขั้นตอนที่ 1 — สแกนจ่าย ${thb} บาท ผ่านพร้อมเพย์`,
    step2_contact: (info) => `ขั้นตอนที่ 2 — ${info}`,
    payer_note_placeholder: 'ชื่อของคุณ (ไม่บังคับ ช่วยให้เราหาการชำระเงินของคุณเจอ)',
    ive_paid_btn: 'จ่ายแล้ว',
    claim_submitted: '✓ ส่งแล้ว! เราจะยืนยันเร็วๆ นี้ และปลดล็อกเลขของคุณอัตโนมัติ',
    claim_already: 'ปลดล็อกแล้ว ✨',
    claim_error: 'เกิดข้อผิดพลาด กรุณาลองใหม่',
    waiting_payment: 'กำลังรอการชำระเงิน...',
    payment_confirmed_refresh: 'ชำระเงินสำเร็จแล้ว! กำลังรีเฟรชผลทำนาย...',
    qr_unavailable: 'ไม่พบ QR โค้ด กรุณาตรวจสอบการตั้งค่า Omise',
    scan_promptpay: (thb) => `สแกนด้วยแอปธนาคารเพื่อจ่าย ${thb} บาท ผ่านพร้อมเพย์`,
    footer_draw_today: 'วันนี้หวยรัฐบาลออก!',
    footer_draw_next: (date, days) => `หวยรัฐบาลงวดหน้า: ${date} (อีก ${days} วัน)`,
    countdown_sub_today: 'วันนี้หวยรัฐบาลออก!',
    countdown_sub_days: (date, days) => `${date} · อีก ${days} วัน`,
    color_of_day: (name) => `สีประจำวันนี้: ${name}`,
    plate_result: (val, score) => `ทะเบียน <strong>${val}</strong> — คะแนนดวงรวม ${score}/100`,
    phone_result: (val, score) => `เบอร์ <strong>${val}</strong> — คะแนนดวงรวม ${score}/100`,
    ring_love: 'ความรัก', ring_money: 'การเงิน', ring_work: 'การงาน',
    name_result: (name, power, meaning) => `"<strong>${name}</strong>" ลดทอนเป็นเลขพลัง <strong>${power}</strong> — ${meaning}`,
    shop_this_type: 'ไปดูในร้านค้า →',
    buy_btn: 'ซื้อ', loading: 'กำลังโหลด...', error_generic: 'เกิดข้อผิดพลาด กรุณาลองใหม่',
    order_note_placeholder: 'ชื่อหรือความต้องการของคุณ (ไม่บังคับ)',
    order_confirmed: '✓ รับทราบแล้ว! เราจะเลือกชิ้นที่เหมาะกับคุณเป็นการส่วนตัว แล้วทักไปทาง LINE เพื่อยืนยันรายละเอียด',
    open_in_maps: 'เปิดใน Google Maps →',
    temples_disclaimer: 'สถานที่เหล่านี้มีอยู่จริงและมีชื่อเสียงตามที่กล่าวถึง — นำมาให้ข้อมูลเชิงวัฒนธรรมเท่านั้น ไม่ได้การันตีว่าจะทำนายผลหวยรัฐบาลได้',
    choose_zodiac_default: 'เลือกปีนักษัตรของคุณ...',
  },
};

let currentLang = localStorage.getItem('fortunaLang') || 'th';
function t(key, ...args) {
  const val = STRINGS[currentLang][key];
  return typeof val === 'function' ? val(...args) : val;
}

function applyStaticTranslations() {
  document.documentElement.lang = currentLang;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    if (STRINGS[currentLang][key] !== undefined) el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-html]').forEach((el) => {
    const key = el.getAttribute('data-i18n-html');
    if (STRINGS[currentLang][key] !== undefined) el.innerHTML = t(key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (STRINGS[currentLang][key] !== undefined) el.placeholder = t(key);
  });
  const enBtn = document.getElementById('lang-en-btn');
  const thBtn = document.getElementById('lang-th-btn');
  if (enBtn && thBtn) {
    enBtn.style.background = currentLang === 'en' ? 'var(--gold-bright)' : 'transparent';
    enBtn.style.color = currentLang === 'en' ? 'var(--ink)' : 'var(--parchment-dim)';
    thBtn.style.background = currentLang === 'th' ? 'var(--gold-bright)' : 'transparent';
    thBtn.style.color = currentLang === 'th' ? 'var(--ink)' : 'var(--parchment-dim)';
  }
}

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('fortunaLang', lang);
  applyStaticTranslations();
  renderAuthArea();
  renderShop();
  renderTemples();
  loadSymbolGrid();
  loadStatsDrawDays();
  loadCountdown();
  loadDraw();
  loadToday();
  populateZodiacOptions();
  // Note: a currently-displayed dream/module result stays in whatever
  // language it was fetched in until the next action - re-translating
  // live server content isn't attempted here.
}

document.addEventListener('DOMContentLoaded', () => {
  const enBtn = document.getElementById('lang-en-btn');
  const thBtn = document.getElementById('lang-th-btn');
  if (enBtn) enBtn.addEventListener('click', () => setLang('en'));
  if (thBtn) thBtn.addEventListener('click', () => setLang('th'));
});

/* ================= core elements ================= */
const authArea = document.getElementById('auth-area');
const loginHint = document.getElementById('login-hint');
const dreamInput = document.getElementById('dream-input');
const revealBtn = document.getElementById('reveal-btn');
const resultCard = document.getElementById('result-card');
const footerDraw = document.getElementById('footer-draw');

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = String(str);
  return div.innerHTML;
}

let currentUser = null;
let isGuestUser = true;
let lineLoginAvailable = true;

async function loadMe() {
  const res = await fetch('/api/me');
  const data = await res.json();
  currentUser = data.user;
  isGuestUser = data.isGuest;
  lineLoginAvailable = data.lineLoginAvailable;
  renderAuthArea();
  maybeShowLineComingSoonNotice();
}

function maybeShowLineComingSoonNotice() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('lineComingSoon') === '1') {
    loginHint.textContent = t('line_coming_soon_hint');
    loginHint.classList.remove('hidden');
    window.history.replaceState({}, '', window.location.pathname);
  }
}

function renderAuthArea() {
  if (currentUser && !isGuestUser) {
    loginHint.classList.add('hidden');
    authArea.innerHTML = `
      <div class="nav-user">
        <img src="${currentUser.pictureUrl || ''}" alt="">
        <span>${escapeHtml(currentUser.displayName)}</span>
        <a class="logout-link" href="/auth/logout">${t('sign_out')}</a>
      </div>
    `;
  } else {
    authArea.innerHTML = `<button class="nav-cta" id="login-btn">${lineLoginAvailable ? t('sign_in') : t('sign_in_soon')}</button>`;
    document.getElementById('login-btn').addEventListener('click', () => {
      window.location.href = '/auth/line/login';
    });
  }
}

async function loadDraw() {
  const res = await fetch('/api/draw');
  const draw = await res.json();
  footerDraw.textContent = draw.isToday ? t('footer_draw_today') : t('footer_draw_next', draw.date, draw.daysAway);
}

function medallion(value, extraClass = '') {
  return `<div class="medallion ${extraClass}">${value}</div>`;
}

function renderResult(data) {
  const { matched, readings, personalNumber, hasUnlock, pendingManual, paymentsAvailable, draw, pricing } = data;

  if (!matched) {
    resultCard.innerHTML = `
      <div class="result-tag">${t('reading_tag_solo')}</div>
      <div class="result-headline">${t('no_match_headline')}</div>
      <div class="result-body">${t('no_match_body')}</div>
      <div class="medallions">${medallion(personalNumber, 'personal')}</div>
    `;
    resultCard.classList.remove('hidden');
    return;
  }

  const readingsHtml = readings
    .map((r) => {
      const text = currentLang === 'th' ? r.interpretation : (r.interpretation_en || r.interpretation);
      return `
      <div class="result-headline">${t('reading_label')}</div>
      <div class="result-body">${text}</div>
      <div class="medallions">
        ${
          r.locked
            ? `${medallion('🔒', 'locked')}${medallion('🔒', 'locked')}${medallion('🔒', 'locked')}`
            : r.luckyNumbers.map((n) => medallion(n)).join('')
        }
        ${medallion(personalNumber, 'personal')}
      </div>
    `;
    })
    .join('<hr style="border:none;border-top:1px dashed rgba(60,47,34,0.2);margin:16px 0;">');

  const needsUnlock = readings.some((r) => r.locked);

  const paywallHtml = !needsUnlock
    ? ''
    : pendingManual
    ? `<div class="paywall"><p>${t('payment_submitted_note')}</p></div>`
    : paymentsAvailable
    ? `<div class="paywall" id="paywall">
         <p>${pricing.drawPassLabel}</p>
         <button class="unlock-btn" id="unlock-btn">${t('unlock_btn', (pricing.drawPassAmountSatang / 100).toFixed(0))}</button>
       </div>
       <div class="qr-panel hidden" id="qr-panel"></div>`
    : `<div class="paywall"><p>${t('premium_soon')}</p></div>`;

  resultCard.innerHTML = `
    <div class="result-tag">${t('reading_tag')}</div>
    ${readingsHtml}
    ${paywallHtml}
    <div class="result-footer">
      <span>${hasUnlock ? t('unlocked_note') : t('personal_note')}</span>
      <span class="draw-pill">📅 ${draw.isToday ? t('draw_today') : t('draw_days_to', draw.daysAway)}</span>
    </div>
  `;
  resultCard.classList.remove('hidden');

  const unlockBtn = document.getElementById('unlock-btn');
  if (unlockBtn) {
    unlockBtn.addEventListener('click', () => startUnlock());
  }
}

async function startUnlock() {
  const res = await fetch('/api/unlock', { method: 'POST' });
  const data = await res.json();

  if (data.error) {
    alert(data.error);
    return;
  }

  if (data.comingSoon) {
    const paywall = document.getElementById('paywall');
    if (paywall) paywall.innerHTML = `<p>${data.message}</p>`;
    return;
  }

  if (data.manual) {
    const qrPanel = document.getElementById('qr-panel');
    const paywall = document.getElementById('paywall');
    if (paywall) paywall.classList.add('hidden');
    qrPanel.classList.remove('hidden');
    qrPanel.innerHTML = `
      <p><strong>${t('step1_pay', (data.amountSatang / 100).toFixed(0))}</strong></p>
      <img src="${data.qrImageUrl}" alt="PromptPay QR code">
      ${data.contactQrImageUrl ? `
        <p style="margin-top:14px;"><strong>${t('step2_contact', escapeHtml(data.contactInfo))}</strong></p>
        <img src="${data.contactQrImageUrl}" alt="LINE contact QR code">
      ` : `<p style="margin-top:8px;">${escapeHtml(data.contactInfo)}</p>`}
      <input type="text" id="payer-note" placeholder="${t('payer_note_placeholder')}" style="width:100%;max-width:300px;padding:8px;border-radius:8px;border:1px solid rgba(201,162,39,0.3);margin:10px 0;background:rgba(244,233,208,0.06);color:var(--parchment);">
      <br>
      <button class="unlock-btn" id="ive-paid-btn">${t('ive_paid_btn')}</button>
      <p id="claim-status" style="margin-top:8px;"></p>
    `;
    document.getElementById('ive-paid-btn').addEventListener('click', submitManualClaim);
    return;
  }

  const qrPanel = document.getElementById('qr-panel');
  const paywall = document.getElementById('paywall');
  if (paywall) paywall.classList.add('hidden');
  qrPanel.classList.remove('hidden');
  qrPanel.innerHTML = `
    <p>${t('scan_promptpay', (data.amountSatang / 100).toFixed(0))}</p>
    ${data.qrImageUrl ? `<img src="${data.qrImageUrl}" alt="PromptPay QR code">` : `<p>${t('qr_unavailable')}</p>`}
    <p id="unlock-status">${t('waiting_payment')}</p>
  `;

  pollUnlockStatus(data.chargeId);
}

async function submitManualClaim() {
  const btn = document.getElementById('ive-paid-btn');
  const noteInput = document.getElementById('payer-note');
  const statusEl = document.getElementById('claim-status');
  btn.disabled = true;

  const res = await fetch('/api/unlock/claim', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ payerNote: noteInput ? noteInput.value : '' }),
  });
  const data = await res.json();

  if (data.submitted || data.alreadySubmitted) {
    statusEl.textContent = t('claim_submitted');
  } else if (data.alreadyUnlocked) {
    statusEl.textContent = t('claim_already');
  } else {
    statusEl.textContent = t('claim_error');
    btn.disabled = false;
  }
}

function pollUnlockStatus(chargeId) {
  const statusEl = document.getElementById('unlock-status');
  const interval = setInterval(async () => {
    const res = await fetch(`/api/unlock/status?chargeId=${encodeURIComponent(chargeId)}`);
    const data = await res.json();
    if (data.status === 'successful') {
      clearInterval(interval);
      if (statusEl) statusEl.textContent = t('payment_confirmed_refresh');
      const text = dreamInput.value;
      setTimeout(() => revealDream(text), 800);
    }
  }, 3000);
}

async function revealDream(text) {
  if (!text || !text.trim()) return;
  revealBtn.disabled = true;
  try {
    const res = await fetch('/api/dream', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    renderResult(data);
  } finally {
    revealBtn.disabled = false;
  }
}

revealBtn.addEventListener('click', () => revealDream(dreamInput.value));
dreamInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') revealDream(dreamInput.value);
});

/* ================= today's fortune ================= */
async function loadToday() {
  const res = await fetch('/api/today');
  const data = await res.json();
  document.getElementById('color-swatch').style.background = data.color.hex;
  const colorName = currentLang === 'th' ? data.color.name_th : data.color.name;
  document.getElementById('color-name').textContent = t('color_of_day', colorName);
  const moonEl = document.getElementById('moon-phase');
  if (moonEl) moonEl.textContent = data.moonPhase;
}

async function loadCountdown() {
  const res = await fetch('/api/draw');
  const draw = await res.json();
  const sub = document.getElementById('countdown-sub');
  if (sub) sub.textContent = draw.isToday ? t('countdown_sub_today') : t('countdown_sub_days', draw.date, draw.daysAway);
}

async function loadStatsDrawDays() {
  try {
    const res = await fetch('/api/draw');
    const draw = await res.json();
    const el = document.getElementById('stat-days');
    if (el) el.textContent = draw.isToday ? '0' : draw.daysAway;
  } catch (e) {}
}

async function loadStats() {
  try {
    const res = await fetch('/api/stats');
    const data = await res.json();
    const dEl = document.getElementById('stat-dreams');
    const uEl = document.getElementById('stat-unlocks');
    if (dEl) dEl.textContent = data.dreamsToday;
    if (uEl) uEl.textContent = data.unlocksToday;
  } catch (e) {}
}

/* ================= module mini-panels ================= */
document.querySelectorAll('.try-btn[data-panel]').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.getElementById(btn.dataset.panel).classList.toggle('open');
  });
});

function ringHtml(label, pct) {
  const deg = Math.round(pct * 3.6);
  return `<div class="ring">
    <div class="ring-circle" style="background:conic-gradient(var(--gold-bright) ${deg}deg, rgba(244,233,208,0.12) 0);"><span>${pct}</span></div>
    <div class="ring-label">${label}</div>
  </div>`;
}

async function populateZodiacOptions() {
  const select = document.getElementById('zodiac-select');
  if (!select) return;
  try {
    const res = await fetch('/api/zodiac', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    const data = await res.json();
    const options = data.options || [];
    const labels = data.labels || {};
    select.innerHTML =
      `<option value="">${t('choose_zodiac_default')}</option>` +
      options.map((a) => `<option value="${a}">${(labels[a] || {})[currentLang] || a}</option>`).join('');
  } catch (e) {}
}

document.querySelectorAll('.mini-go').forEach((btn) => {
  btn.addEventListener('click', async () => {
    const action = btn.dataset.action;

    if (action === 'plate') {
      const value = document.getElementById('plate-input').value || '1กข 2345';
      const res = await fetch('/api/plate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value }) });
      const data = await res.json();
      const el = document.getElementById('plate-result');
      el.innerHTML = `
        <div class="mini-result-text">${t('plate_result', escapeHtml(data.value), data.scores.overall)}</div>
        <div class="ring-row">${ringHtml(t('ring_love'), data.scores.love)}${ringHtml(t('ring_money'), data.scores.money)}${ringHtml(t('ring_work'), data.scores.work)}</div>
      `;
      el.classList.add('show');
    }

    if (action === 'phone') {
      const value = document.getElementById('phone-input').value || '081-234-5678';
      const res = await fetch('/api/phone', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value }) });
      const data = await res.json();
      const el = document.getElementById('phone-result');
      el.innerHTML = `
        <div class="mini-result-text">${t('phone_result', escapeHtml(data.value), data.scores.overall)}</div>
        <div class="ring-row">${ringHtml(t('ring_love'), data.scores.love)}${ringHtml(t('ring_money'), data.scores.money)}${ringHtml(t('ring_work'), data.scores.work)}</div>
      `;
      el.classList.add('show');
    }

    if (action === 'zodiac') {
      const animal = document.getElementById('zodiac-select').value;
      if (!animal) return;
      const res = await fetch('/api/zodiac', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ animal }) });
      const data = await res.json();
      const el = document.getElementById('zodiac-result');
      const label = currentLang === 'th' ? data.label_th : data.label_en;
      const reading = currentLang === 'th' ? data.reading_th : data.reading_en;
      el.innerHTML = `
        <div class="mini-result-text"><strong>${label}</strong> — ${reading}</div>
        <div class="medallions"><div class="medallion" style="width:44px;height:44px;font-size:14px;">${data.luckyNumber}</div></div>
      `;
      el.classList.add('show');
    }

    if (action === 'name') {
      const name = document.getElementById('name-input').value || 'Somchai';
      const res = await fetch('/api/name', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) });
      const data = await res.json();
      const el = document.getElementById('name-result');
      const meaning = currentLang === 'th' ? data.meaning_th : data.meaning_en;
      el.innerHTML = `
        <div class="mini-result-text">${t('name_result', escapeHtml(data.name), data.power, meaning)}</div>
        <div class="medallions"><div class="medallion" style="width:44px;height:44px;font-size:16px;">${data.power}</div></div>
      `;
      el.classList.add('show');
    }

    if (action === 'amulet') {
      const goal = document.getElementById('amulet-select').value;
      if (!goal) return;
      const res = await fetch('/api/amulet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ goal }) });
      const data = await res.json();
      const el = document.getElementById('amulet-result');
      const summary = currentLang === 'th' ? data.summary_th : data.summary_en;
      const tip = currentLang === 'th' ? data.tip_th : data.tip_en;
      el.innerHTML = `
        <div class="mini-result-text">${summary}<br><br><em>${tip}</em></div>
        <a href="#shop" class="try-btn" style="display:block;text-decoration:none;text-align:center;box-sizing:border-box;" onclick="highlightShopCategory('${data.goal}')">${t('shop_this_type')}</a>
      `;
      el.classList.add('show');
    }
  });
});

/* ================= shop ================= */
const PRODUCTS = [
  { id:'kumarn', icon:'🧿', category:'wealth', price:590, name_en:'Kumarn Thong', name_th:'กุมารทอง', desc_en:'Traditional wealth-drawing amulet, believed to bring prosperity to its keeper.', desc_th:'วัตถุมงคลเสริมโชคลาภแบบดั้งเดิม เชื่อกันว่านำความมั่งคั่งมาสู่ผู้ครอบครอง' },
  { id:'jatukam', icon:'🪙', category:'wealth', price:890, name_en:'Jatukam Ramathep', name_th:'จตุคามรามเทพ', desc_en:'Well-known protective and prosperity amulet, popular across Thailand.', desc_th:'วัตถุมงคลด้านการปกป้องและโชคลาภที่มีชื่อเสียง เป็นที่นิยมทั่วประเทศไทย' },
  { id:'saisin', icon:'🧵', category:'protection', price:190, name_en:'Blessed Thread Bracelet', name_th:'สร้อยข้อมือสายสิญจน์', desc_en:'Sai sin cotton thread bracelet, blessed by monks for protection.', desc_th:'สร้อยข้อมือด้ายสายสิญจน์ ผ่านการปลุกเสกโดยพระสงฆ์เพื่อความปลอดภัย' },
  { id:'buddha', icon:'☸️', category:'protection', price:450, name_en:'Buddha Pendant', name_th:'พระเครื่องจี้คอ', desc_en:'Small pendant necklace for everyday protection and peace of mind.', desc_th:'พระเครื่องขนาดเล็กสำหรับพกติดตัว เสริมความปลอดภัยและความสงบใจในชีวิตประจำวัน' },
  { id:'moneytree', icon:'🪴', category:'wealth', price:350, name_en:'Lucky Money Tree', name_th:'ต้นไม้มงคลนำโชค', desc_en:'Pachira plant, traditionally kept in homes and offices for prosperity.', desc_th:'ต้นชวนชม ปลูกไว้ในบ้านหรือที่ทำงานตามความเชื่อเรื่องความมั่งคั่ง' },
  { id:'lovecharm', icon:'💗', category:'love', price:290, name_en:'Love & Relationship Charm', name_th:'เครื่องรางด้านความรัก', desc_en:'A small charm traditionally worn close to the heart.', desc_th:'เครื่องรางขนาดเล็กที่มักพกติดตัวใกล้หัวใจ' },
  { id:'incense', icon:'🕯️', category:'protection', price:120, name_en:'Blessed Incense Set', name_th:'ชุดธูปมงคล', desc_en:'Traditional incense set for home altars and daily merit-making.', desc_th:'ชุดธูปแบบดั้งเดิมสำหรับหิ้งพระที่บ้านและการทำบุญประจำวัน' },
  { id:'careercharm', icon:'📈', category:'career', price:320, name_en:'Career Success Charm', name_th:'เครื่องรางเสริมหน้าที่การงาน', desc_en:'Worn for promotion luck, often paired with your day-color.', desc_th:'สวมใส่เพื่อเสริมดวงความก้าวหน้าในงาน มักใช้คู่กับสีมงคลประจำวัน' },
];

function renderShop() {
  const grid = document.getElementById('shop-grid');
  if (!grid) return;
  grid.innerHTML = PRODUCTS.map((p) => `
    <div class="product-card" id="product-${p.id}" data-category="${p.category}">
      <div class="product-image">${p.icon}</div>
      <span class="product-tag">${p.category}</span>
      <h3>${currentLang === 'th' ? p.name_th : p.name_en}</h3>
      <p>${currentLang === 'th' ? p.desc_th : p.desc_en}</p>
      <div class="product-footer">
        <div class="product-price">${p.price} THB</div>
        <button class="buy-btn" data-product="${p.id}">${t('buy_btn')}</button>
      </div>
      <div class="checkout-panel" id="checkout-${p.id}"></div>
    </div>
  `).join('');

  grid.querySelectorAll('.buy-btn').forEach((btn) => {
    btn.addEventListener('click', () => startShopCheckout(btn.dataset.product));
  });
}

async function startShopCheckout(productId) {
  const panel = document.getElementById(`checkout-${productId}`);
  const btn = document.querySelector(`.buy-btn[data-product="${productId}"]`);
  panel.classList.add('open');
  panel.innerHTML = `<p style="font-size:12px;color:var(--parchment-dim);text-align:center;">${t('loading')}</p>`;

  const res = await fetch('/api/shop/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId }),
  });
  const data = await res.json();

  if (data.comingSoon) {
    panel.innerHTML = `<p style="font-size:12px;color:var(--parchment-dim);text-align:center;">${escapeHtml(data.message)}</p>`;
    return;
  }
  if (data.error) {
    panel.innerHTML = `<p style="font-size:12px;color:var(--parchment-dim);text-align:center;">${t('error_generic')}</p>`;
    return;
  }

  btn.disabled = true;
  panel.innerHTML = `
    <p style="font-size:12px;text-align:center;"><strong>${t('step1_pay', (data.priceSatang / 100).toFixed(0))}</strong></p>
    <img src="${data.qrImageUrl}" alt="PromptPay QR code" style="width:160px;height:160px;margin:8px auto;display:block;border-radius:12px;">
    ${data.contactQrImageUrl ? `
      <p style="font-size:12px;text-align:center;margin-top:10px;"><strong>${t('step2_contact', escapeHtml(data.contactInfo))}</strong></p>
      <img src="${data.contactQrImageUrl}" alt="LINE contact QR code" style="width:160px;height:160px;margin:8px auto;display:block;border-radius:12px;">
    ` : `<p style="font-size:12px;text-align:center;">${escapeHtml(data.contactInfo)}</p>`}
    <input type="text" id="order-note-${productId}" placeholder="${t('order_note_placeholder')}" style="width:100%;padding:8px;border-radius:8px;border:1px solid rgba(201,162,39,0.3);margin:10px 0;background:rgba(244,233,208,0.06);color:var(--parchment);box-sizing:border-box;">
    <button class="unlock-btn" id="order-paid-btn-${productId}" style="width:100%;">${t('ive_paid_btn')}</button>
    <p id="order-status-${productId}" style="font-size:12px;text-align:center;margin-top:8px;"></p>
  `;

  document.getElementById(`order-paid-btn-${productId}`).addEventListener('click', () => submitShopOrder(productId));
}

async function submitShopOrder(productId) {
  const btn = document.getElementById(`order-paid-btn-${productId}`);
  const noteInput = document.getElementById(`order-note-${productId}`);
  const statusEl = document.getElementById(`order-status-${productId}`);
  btn.disabled = true;

  const res = await fetch('/api/shop/order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, payerNote: noteInput ? noteInput.value : '' }),
  });
  const data = await res.json();

  if (data.submitted) {
    statusEl.textContent = t('order_confirmed');
  } else {
    statusEl.textContent = t('error_generic');
    btn.disabled = false;
  }
}

function highlightShopCategory(category) {
  setTimeout(() => {
    document.querySelectorAll('.product-card').forEach((card) => {
      card.style.borderColor = card.dataset.category === category ? 'rgba(201,162,39,0.8)' : '';
    });
  }, 200);
}

/* ================= trends ================= */
async function loadTrends() {
  try {
    const res = await fetch('/api/trends');
    const data = await res.json();
    const list = document.getElementById('trend-list');
    if (!list || !data.trends || data.trends.length === 0) return;

    const max = Math.max(...data.trends.map((t) => t.count));
    list.innerHTML = data.trends.map((tr, i) => {
      const label = currentLang === 'th' ? tr.label_th : tr.label_en;
      return `
      <div class="trend-row">
        <div class="trend-num">${i + 1}</div>
        <div style="width:130px;font-size:12.5px;">${tr.emoji} ${escapeHtml(label)}</div>
        <div class="trend-bar-track"><div class="trend-bar-fill" style="width:${((tr.count / max) * 100).toFixed(0)}%"></div></div>
        <div class="trend-count">${tr.count}</div>
      </div>
    `;
    }).join('');
  } catch (e) {}
}

/* ================= temples ================= */
const TEMPLES = [
  { icon:'🐍', province:'Udon Thani', province_th:'อุดรธานี', rating:'4.6★ (15k+)',
    name_en:'Kham Chanod (Wang Nakhin)', name_th:'คำชะโนด (วังนาคินทร์)',
    desc_en:'A palm-covered site believed to be a gateway to the naga realm. Visitors light incense, circle the sacred trees, and watch candle wax drip into water for number signs.',
    desc_th:'สถานที่ศักดิ์สิทธิ์ที่เชื่อกันว่าเป็นทางเข้าสู่เมืองบาดาลของพญานาค ผู้มาเยือนจุดธูป เวียนรอบต้นไม้ศักดิ์สิทธิ์ และดูรอยหยดเทียนในน้ำเพื่อหาตัวเลข',
    mapsUrl:'https://maps.google.com/?cid=14783424111115046286' },
  { icon:'🐓', province:'Nakhon Si Thammarat', province_th:'นครศรีธรรมราช', rating:'4.6★ (12k+)',
    name_en:'Wat Chedi (Ai Khai)', name_th:'วัดเจดีย์ (ไอ้ไข่)',
    desc_en:"One of Thailand's most famous Government Lottery pilgrimage sites, devoted to child-spirit guardian Ai Khai.",
    desc_th:'หนึ่งในสถานที่ขอเลขเด็ดที่มีชื่อเสียงที่สุดของไทย สักการะไอ้ไข่ เทพเด็กผู้พิทักษ์',
    mapsUrl:'https://maps.google.com/?cid=13667418601365559692' },
  { icon:'🐢', province:'Sakon Nakhon', province_th:'สกลนคร', rating:'4.3★ (5k+)',
    name_en:'Phaya Tao Ngoi Shrine', name_th:'ศาลพญาเต่างอย',
    desc_en:'A giant turtle statue tied to local legends of longevity and windfall luck.',
    desc_th:'รูปปั้นเต่ายักษ์ที่เชื่อมโยงกับตำนานความอายุยืนและโชคลาภ',
    mapsUrl:'https://maps.google.com/?cid=13818307400563680921' },
  { icon:'🌳', province:'Nonthaburi (Greater Bangkok)', province_th:'นนทบุรี (ปริมณฑล กทม.)', rating:'4.7★ (2.9k+)',
    name_en:'Wat Prasat', name_th:'วัดปราสาท',
    desc_en:"A 400-year-old temple, home to the Nang Ta-khian tree-spirit shrine — a favorite among Government Lottery hopefuls close to Bangkok.",
    desc_th:'วัดเก่าแก่อายุกว่า 400 ปี เป็นที่ตั้งของศาลนางตะเคียน จุดหมายยอดนิยมของสายมูใกล้กรุงเทพฯ',
    mapsUrl:'https://maps.google.com/?cid=6446611963925743651' },
  { icon:'🏔️', province:'Bueng Kan', province_th:'บึงกาฬ', rating:'4.8★ (3k+)',
    name_en:'Naga Cave (Tham Naka)', name_th:'ถ้ำนาคา',
    desc_en:'Serpentine rock formations high in Phu Langka National Park that went viral for resembling a sleeping naga.',
    desc_th:'หินธรรมชาติรูปทรงคล้ายเกล็ดพญานาคบนเทือกเขาภูลังกา กลายเป็นกระแสไวรัล',
    mapsUrl:'https://maps.google.com/?cid=12811720373151630818' },
];

function renderTemples() {
  const grid = document.getElementById('temple-grid');
  if (!grid) return;
  grid.innerHTML = TEMPLES.map((tm) => `
    <div class="temple-card">
      <div class="temple-icon">${tm.icon}</div>
      <div class="temple-body">
        <div class="temple-header">
          <h3>${currentLang === 'th' ? tm.name_th : tm.name_en}</h3>
          <span class="temple-province">${currentLang === 'th' ? tm.province_th : tm.province}</span>
          <span class="temple-rating">${tm.rating}</span>
        </div>
        <p>${currentLang === 'th' ? tm.desc_th : tm.desc_en}</p>
        <a href="${tm.mapsUrl}" target="_blank" rel="noopener" class="temple-link">${t('open_in_maps')}</a>
      </div>
    </div>
  `).join('') + `<p class="temple-disclaimer">${t('temples_disclaimer')}</p>`;
}

/* ================= symbol browse grid ================= */
async function loadSymbolGrid() {
  const grid = document.getElementById('symbol-grid');
  if (!grid) return;
  try {
    const res = await fetch('/api/dream/symbols');
    const data = await res.json();
    grid.innerHTML = data.symbols
      .map((s) => {
        const label = currentLang === 'th' ? s.label_th : s.label_en;
        const keyword = currentLang === 'th' ? s.keyword : s.keyword_en;
        return `<button class="symbol-chip" data-keyword="${escapeHtml(keyword)}"><span class="emoji">${s.emoji}</span>${escapeHtml(label)}</button>`;
      })
      .join('');

    grid.querySelectorAll('.symbol-chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        dreamInput.value = chip.dataset.keyword;
        revealDream(chip.dataset.keyword);
        resultCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
    });
  } catch (e) {}
}

/* ================= init ================= */
applyStaticTranslations();
loadMe();
loadDraw();
loadToday();
loadCountdown();
loadStats();
loadStatsDrawDays();
renderShop();
loadTrends();
renderTemples();
loadSymbolGrid();
populateZodiacOptions();
