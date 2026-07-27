require('dotenv').config();
const express = require('express');
const cookieSession = require('cookie-session');
const path = require('path');
const dayjs = require('dayjs');

const site = require('./config/site.json');
const dictionary = require('./config/dream-dictionary.json');
const { matchDream } = require('./lib/dreamMatcher');
const { getPersonalNumber } = require('./lib/personalNumber');
const { getNextDraw } = require('./lib/drawDates');
const lineAuth = require('./lib/lineAuth');
const omiseClient = require('./lib/omiseClient');
const store = require('./lib/store');
const numerology = require('./lib/numerology');
const numerologyContent = require('./config/numerology-content.json');
const products = require('./config/products.json');
const { createRateLimiter } = require('./lib/rateLimiter');
const { getMoonPhase } = require('./lib/moonPhase');
const drawResults = require('./lib/drawResults');
const tarot = require('./lib/tarot');
const birthdays = require('./config/birthday.json');
const auspicious = require('./lib/auspicious');
const prayers = require('./config/prayers.json');
const paymentRef = require('./lib/paymentRef');

// 20 requests per minute per IP on the free-text endpoints - generous for
// a real user clicking around, tight enough to blunt casual spam/scraping.
const readingLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 20 });

const MAX_INPUT_LENGTH = 200; // dream text, plate, phone, name - all capped here

// real Thai day-of-week color tradition, indexed by JS Date#getDay() (0=Sunday)
const DAY_COLORS = [
  { name: 'Red', name_th: 'สีแดง', hex: '#C4342B' },
  { name: 'Yellow', name_th: 'สีเหลือง', hex: '#E4C158' },
  { name: 'Pink', name_th: 'สีชมพู', hex: '#E38FA0' },
  { name: 'Green', name_th: 'สีเขียว', hex: '#3E6B5C' },
  { name: 'Orange', name_th: 'สีส้ม', hex: '#E8873A' },
  { name: 'Light Blue', name_th: 'สีฟ้า', hex: '#6FA8C9' },
  { name: 'Purple', name_th: 'สีม่วง', hex: '#7B5EA7' },
];

const app = express();
const PORT = process.env.PORT || 3000;

// Needed so req.ip reflects the real client IP rather than the proxy's,
// since Railway/Render (and most hosts) sit behind a reverse proxy - the
// rate limiter above depends on this being accurate per-user.
app.set('trust proxy', 1);

// Detects whether real LINE Login / Omise credentials have been set, so
// the site can run in a fully working "soft launch" mode before either is
// configured - dream reading, personal numbers, and all free modules work
// immediately; LINE sign-in and real payments switch on automatically the
// moment real credentials are added to .env and config/site.json, with no
// code changes needed.
function isLineLoginConfigured() {
  return Boolean(site.lineLogin.channelId) && !site.lineLogin.channelId.startsWith('REPLACE_');
}
function isOmiseConfigured() {
  const key = process.env.OMISE_SECRET_KEY || '';
  return Boolean(key) && !key.startsWith('REPLACE_');
}

app.use(express.json());
app.use(express.urlencoded({ extended: true })); // needed for the /admin HTML forms
app.use(
  cookieSession({
    name: 'session',
    secret: process.env.SESSION_SECRET || 'dev-only-fallback-secret-change-me',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  })
);

// Every visitor gets a stable anonymous ID (persisted via the same signed
// cookie as everything else) so personal numbers and Draw Pass purchases
// work immediately, without waiting on LINE Login. Once a visitor signs in
// with real LINE Login later, req.session.lineUserId takes over as the
// identity going forward - this is purely a bridge for the pre-LINE phase.
app.use((req, res, next) => {
  if (!req.session.lineUserId && !req.session.guestId) {
    req.session.guestId = 'guest_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }
  next();
});

function currentUserId(req) {
  return req.session.lineUserId || req.session.guestId;
}

// Count a visit only when someone actually loads the page - not on every
// background API call the page then makes, which would inflate the number
// several times per visitor. This must sit BEFORE express.static below,
// otherwise the static handler serves index.html and this never runs.
app.get('/', (req, res, next) => {
  try {
    store.recordVisit(currentUserId(req));
  } catch (e) {
    console.error('Visit counting failed:', e);
  }
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

// Returns a config value only if it's been filled in - placeholder values
// starting with REPLACE_ are treated as "not set" so the UI hides that
// element rather than showing raw placeholder text to a paying customer.
function cleanConfig(value) {
  const v = String(value || '').trim();
  if (!v || v.startsWith('REPLACE_')) return null;
  return v;
}

function currentDrawDate() {
  return getNextDraw(site.drawDaysOfMonth).date;
}

// ---------- auth ----------

app.get('/api/me', (req, res) => {
  if (req.session.lineUserId) {
    const user = store.getUser(req.session.lineUserId);
    return res.json({ user: user || null, isGuest: false, lineLoginAvailable: isLineLoginConfigured() });
  }
  // Guest identity - real for personal-number/entitlement purposes, just
  // not tied to a LINE account yet.
  res.json({
    user: { displayName: 'Guest', pictureUrl: null },
    isGuest: true,
    lineLoginAvailable: isLineLoginConfigured(),
  });
});

app.get('/auth/line/login', (req, res) => {
  if (!isLineLoginConfigured()) {
    // No real LINE Login channel set up yet - send the visitor back with a
    // flag the frontend uses to show a friendly notice, rather than
    // forwarding them to LINE with a placeholder client_id that would just
    // fail confusingly on LINE's side.
    return res.redirect('/?lineComingSoon=1');
  }
  const state = lineAuth.randomState();
  req.session.oauthState = state;
  res.redirect(lineAuth.buildAuthorizeUrl(state));
});

app.get('/auth/line/callback', async (req, res) => {
  const { code, state } = req.query;
  if (!code || !state || state !== req.session.oauthState) {
    return res.status(400).send('Invalid login state. Please try signing in again.');
  }
  try {
    const tokenData = await lineAuth.exchangeCodeForToken(code);
    const profile = await lineAuth.fetchProfile(tokenData.access_token);
    store.upsertUser({
      lineUserId: profile.userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
    });
    // NOTE: if this visitor had a guest identity with an unlocked Draw Pass
    // or personal-number history, that doesn't carry over to the new LINE
    // identity - they're treated as a fresh user going forward. Worth
    // adding a migration step here before this matters at real scale.
    req.session.lineUserId = profile.userId;
    res.redirect('/');
  } catch (err) {
    console.error('LINE login failed:', err);
    res.status(500).send('Login failed. Please try again.');
  }
});

app.get('/auth/logout', (req, res) => {
  req.session = null;
  res.redirect('/');
});

// ---------- dream reading ----------

app.post('/api/dream', readingLimiter, (req, res) => {
  const text = (req.body.text || '').trim().slice(0, MAX_INPUT_LENGTH);
  if (!text) return res.status(400).json({ error: 'Missing dream text' });

  const matches = matchDream(text, dictionary);
  const drawDate = currentDrawDate();
  const userId = currentUserId(req);

  store.logSubmission({ userId, text, matchedIds: matches.map((m) => m.id) });

  const today = dayjs().format('YYYY-MM-DD');
  const personalNumber = getPersonalNumber(userId, today);
  const hasUnlock = store.hasUnlockedDraw(userId, drawDate);
  const pendingManual = !hasUnlock && store.hasPendingManualClaim(userId, drawDate);
  const manualPaymentEnabled = Boolean(site.manualPayment && site.manualPayment.enabled);

  const readings = matches.map((m) => ({
    id: m.id,
    interpretation: m.interpretation,
    interpretation_en: m.interpretation_en,
    // Premium numbers only included if this draw cycle is unlocked.
    luckyNumbers: hasUnlock ? m.luckyNumbers : null,
    locked: !hasUnlock,
  }));

  res.json({
    matched: matches.length > 0,
    readings,
    personalNumber,
    hasUnlock,
    pendingManual,
    paymentsAvailable: isOmiseConfigured() || manualPaymentEnabled,
    draw: getNextDraw(site.drawDaysOfMonth),
    pricing: site.pricing,
  });
});

app.get('/api/draw', (req, res) => {
  res.json(getNextDraw(site.drawDaysOfMonth));
});

// ---------- purchase: Draw Pass (one-off, PromptPay) ----------

app.post('/api/unlock', readingLimiter, async (req, res) => {
  const userId = currentUserId(req);
  const drawDate = currentDrawDate();

  if (store.hasUnlockedDraw(userId, drawDate)) {
    return res.json({ alreadyUnlocked: true });
  }

  if (isOmiseConfigured()) {
    try {
      const charge = await omiseClient.createPromptPayCharge({
        amountSatang: site.pricing.drawPassAmountSatang,
        userId,
        drawDate,
      });

      store.createPendingEntitlement({
        userId,
        drawDate,
        chargeId: charge.id,
        amountSatang: site.pricing.drawPassAmountSatang,
      });

      // Field path per Omise's PromptPay source docs - verify against a live
      // test charge, since this hasn't been exercised against real API keys.
      const qrImageUrl = charge.source && charge.source.scannable_code
        ? charge.source.scannable_code.image.download_uri
        : null;

      return res.json({ chargeId: charge.id, qrImageUrl, amountSatang: site.pricing.drawPassAmountSatang });
    } catch (err) {
      console.error('Charge creation failed:', err);
      return res.status(500).json({ error: 'Could not start payment. Please try again.' });
    }
  }

  if (site.manualPayment && site.manualPayment.enabled) {
    // Your own bank/PromptPay QR - no automatic payment verification, so
    // this just shows the QR + contact info. The actual unlock happens
    // when you manually confirm the payment at /admin.
    // Give this person a unique payment amount (e.g. 29.03 rather than a
    // flat 29.00) so their transfer is identifiable in the bank statement
    // on its own - no follow-up message needed from them.
    const ref = paymentRef.allocateReference(
      site.pricing.drawPassAmountSatang,
      store.getPendingManualAmounts()
    );

    return res.json({
      manual: true,
      qrImageUrl: site.manualPayment.qrImagePath,
      contactQrImageUrl: site.manualPayment.contactQrImagePath,
      contactInfo: site.manualPayment.contactInfo,
      promptPayNumber: cleanConfig(site.manualPayment.promptPayNumber),
      promptPayName: cleanConfig(site.manualPayment.promptPayName),
      lineUrl: cleanConfig(site.manualPayment.lineUrl),
      amountSatang: ref.amountSatang,
      exactAmount: true,
    });
  }

  // Neither real payments nor manual payment are configured yet.
  return res.json({ comingSoon: true, message: 'Online payments are launching soon - check back shortly!' });
});

// Visitor confirms (self-reports) that they've paid via the manual QR -
// creates a pending claim for the site owner to review and confirm at
// /admin. Does NOT unlock anything automatically.
app.post('/api/unlock/claim', readingLimiter, (req, res) => {
  const userId = currentUserId(req);
  const drawDate = currentDrawDate();

  if (store.hasUnlockedDraw(userId, drawDate)) {
    return res.json({ alreadyUnlocked: true });
  }
  if (store.hasPendingManualClaim(userId, drawDate)) {
    return res.json({ alreadySubmitted: true });
  }

  const payerNote = (req.body.payerNote || '').trim().slice(0, 200);
  const amountSatang = parseInt(req.body.amountSatang, 10) || null;
  store.createPendingManualEntitlement({ userId, drawDate, payerNote, amountSatang });
  res.json({ submitted: true });
});

// ---------- shop: product purchase (manual QR, personal fulfillment) ----------
// Same PromptPay + LINE-contact QR flow as the Draw Pass, since there's no
// automated inventory/shipping system - the site owner personally follows
// up on LINE and picks/confirms the right item with the buyer.

app.post('/api/shop/checkout', readingLimiter, (req, res) => {
  const product = products.find((p) => p.id === req.body.productId);
  if (!product) return res.status(400).json({ error: 'Unknown product' });

  if (!(site.manualPayment && site.manualPayment.enabled)) {
    return res.json({ comingSoon: true, message: "Purchasing isn't live yet - check back soon!" });
  }

  res.json({
    manual: true,
    productId: product.id,
    productName: product.name,
    priceSatang: product.priceSatang,
    qrImageUrl: site.manualPayment.qrImagePath,
    contactQrImageUrl: site.manualPayment.contactQrImagePath,
    contactInfo: site.manualPayment.contactInfo,
    promptPayNumber: cleanConfig(site.manualPayment.promptPayNumber),
    promptPayName: cleanConfig(site.manualPayment.promptPayName),
    lineUrl: cleanConfig(site.manualPayment.lineUrl),
  });
});

app.post('/api/shop/order', readingLimiter, (req, res) => {
  const userId = currentUserId(req);
  const product = products.find((p) => p.id === req.body.productId);
  if (!product) return res.status(400).json({ error: 'Unknown product' });

  const payerNote = (req.body.payerNote || '').trim().slice(0, 200);
  store.createOrder({
    userId,
    productId: product.id,
    productName: product.name,
    priceSatang: product.priceSatang,
    payerNote,
  });
  res.json({ submitted: true });
});

app.get('/api/unlock/status', async (req, res) => {
  const { chargeId } = req.query;
  if (!chargeId) return res.status(400).json({ error: 'Missing chargeId' });

  const local = store.getEntitlementByCharge(chargeId);
  if (local && local.status === 'paid') return res.json({ status: 'successful' });

  try {
    const charge = await omiseClient.getCharge(chargeId);
    if (charge.status === 'successful') {
      store.markEntitlementPaid(chargeId);
    }
    res.json({ status: charge.status });
  } catch (err) {
    console.error('Charge status check failed:', err);
    res.status(500).json({ error: 'Could not check payment status' });
  }
});

// Omise sends events here on payment completion - configure this URL in
// the Omise dashboard under Webhooks.
app.post('/webhook/omise', (req, res) => {
  const event = req.body;
  try {
    if (event.key === 'charge.complete' && event.data && event.data.status === 'successful') {
      store.markEntitlementPaid(event.data.id);
    }
  } catch (err) {
    console.error('Webhook handling error:', err);
  }
  res.status(200).end();
});

// ---------- today's fortune (color of the day, real Thai tradition) ----------

app.get('/api/today', (req, res) => {
  const today = new Date();
  const color = DAY_COLORS[today.getDay()];
  res.json({ color, moonPhase: getMoonPhase(today), date: today.toISOString().slice(0, 10) });
});

// ---------- license plate / phone number scoring ----------
// Free modules - not gated behind the Draw Pass, since these are
// algorithmic (digit-based) rather than the curated dream-number content.

app.post('/api/plate', readingLimiter, (req, res) => {
  const value = (req.body.value || '').trim().slice(0, MAX_INPUT_LENGTH);
  if (!value) return res.status(400).json({ error: 'Missing plate value' });
  res.json({ value, scores: numerology.digitsToScores(value) });
});

app.post('/api/phone', readingLimiter, (req, res) => {
  const value = (req.body.value || '').trim().slice(0, MAX_INPUT_LENGTH);
  if (!value) return res.status(400).json({ error: 'Missing phone value' });
  res.json({ value, scores: numerology.digitsToScores(value) });
});

// ---------- name numerology ----------

app.post('/api/name', readingLimiter, (req, res) => {
  const name = (req.body.name || '').trim().slice(0, MAX_INPUT_LENGTH);
  if (!name) return res.status(400).json({ error: 'Missing name' });
  const power = numerology.nameToPowerNumber(name);
  const meaning = numerologyContent.nameNumberMeanings[String(power)];
  res.json({ name, power, meaning_en: meaning.en, meaning_th: meaning.th });
});

// ---------- zodiac daily reading ----------

app.post('/api/zodiac', readingLimiter, (req, res) => {
  const animal = (req.body.animal || '').trim();
  if (!animal || !numerologyContent.zodiacAnimals.includes(animal)) {
    return res.status(400).json({
      error: 'Unknown zodiac animal',
      options: numerologyContent.zodiacAnimals,
      labels: numerologyContent.zodiacAnimalLabels,
    });
  }
  const readings = numerologyContent.zodiacReadings[animal];
  const reading = readings[Math.floor(Math.random() * readings.length)];
  const luckyNumber = Math.floor(Math.random() * 9) + 1;
  const label = numerologyContent.zodiacAnimalLabels[animal];
  res.json({
    animal,
    label_en: label.en,
    label_th: label.th,
    reading_en: reading.en,
    reading_th: reading.th,
    luckyNumber,
  });
});

// ---------- amulet match ----------

app.post('/api/amulet', readingLimiter, (req, res) => {
  const goal = (req.body.goal || '').trim();
  const match = numerologyContent.amuletMatches[goal];
  if (!match) {
    return res.status(400).json({ error: 'Unknown goal', options: Object.keys(numerologyContent.amuletMatches) });
  }
  res.json({
    goal,
    summary_en: match.summary.en,
    summary_th: match.summary.th,
    tip_en: match.tip.en,
    tip_th: match.tip.th,
  });
});

// Display metadata (emoji + Thai label) for each dream-dictionary entry -
// used both by the real trends endpoint and the "browse by symbol" grid.
// Thai labels since this is the site's actual audience.
const SYMBOL_DISPLAY = {
  snake: { emoji: '🐍', label_en: 'Snake', label_th: 'งู' },
  teeth_falling: { emoji: '🦷', label_en: 'Teeth falling', label_th: 'ฟันหลุด' },
  water: { emoji: '💧', label_en: 'Water', label_th: 'น้ำ' },
  flying: { emoji: '🕊️', label_en: 'Flying', label_th: 'บิน' },
  finding_money: { emoji: '💰', label_en: 'Finding money', label_th: 'เก็บเงิน' },
  dead_relative: { emoji: '👻', label_en: 'Deceased relative', label_th: 'คนตาย' },
  wedding: { emoji: '💍', label_en: 'Wedding', label_th: 'แต่งงาน' },
  chased: { emoji: '🏃', label_en: 'Being chased', label_th: 'ถูกไล่' },
  elephant: { emoji: '🐘', label_en: 'Elephant', label_th: 'ช้าง' },
  fire: { emoji: '🔥', label_en: 'Fire', label_th: 'ไฟไหม้' },
  fish: { emoji: '🐟', label_en: 'Fish', label_th: 'ปลา' },
  falling: { emoji: '📉', label_en: 'Falling', label_th: 'ตกจากที่สูง' },
  house: { emoji: '🏠', label_en: 'House', label_th: 'บ้าน' },
  car: { emoji: '🚗', label_en: 'Car', label_th: 'รถ' },
  baby: { emoji: '👶', label_en: 'Baby', label_th: 'เด็กทารก' },
  monk: { emoji: '🙏', label_en: 'Monk', label_th: 'พระ' },
  hair_falling: { emoji: '💇', label_en: 'Hair falling out', label_th: 'ผมร่วง' },
  funeral: { emoji: '⚰️', label_en: 'Funeral', label_th: 'งานศพ' },
  police: { emoji: '👮', label_en: 'Police', label_th: 'ตำรวจ' },
  egg: { emoji: '🥚', label_en: 'Egg', label_th: 'ไข่' },
  bird: { emoji: '🐦', label_en: 'Bird', label_th: 'นก' },
  dog: { emoji: '🐶', label_en: 'Dog', label_th: 'หมา' },
  cat: { emoji: '🐱', label_en: 'Cat', label_th: 'แมว' },
  rain: { emoji: '🌧️', label_en: 'Rain', label_th: 'ฝนตก' },
  gold_jewelry: { emoji: '✨', label_en: 'Gold / jewelry', label_th: 'ทอง' },
  thief: { emoji: '🥷', label_en: 'Thief', label_th: 'โจร' },
  pregnant: { emoji: '🤰', label_en: 'Pregnancy', label_th: 'ท้อง' },
  airplane: { emoji: '✈️', label_en: 'Airplane', label_th: 'เครื่องบิน' },
  spider: { emoji: '🕷️', label_en: 'Spider', label_th: 'แมงมุม' },
};


// Themed groupings for the dream-symbol browser, so ~100 symbols can be
// explored rather than dumped as one undifferentiated wall.
const SYMBOL_CATEGORIES = [
  { key: 'classic', emoji: '🌙', name_en: 'Classic omens', name_th: 'ฝันคลาสสิก' },
  { key: 'animals', emoji: '🐉', name_en: 'Animals', name_th: 'สัตว์' },
  { key: 'people', emoji: '👤', name_en: 'People', name_th: 'ผู้คน' },
  { key: 'places', emoji: '🛕', name_en: 'Places', name_th: 'สถานที่' },
  { key: 'objects', emoji: '🔑', name_en: 'Objects', name_th: 'สิ่งของ' },
  { key: 'nature', emoji: '🌸', name_en: 'Nature & sky', name_th: 'ธรรมชาติ' },
  { key: 'events', emoji: '✨', name_en: 'Events & feelings', name_th: 'เหตุการณ์' },
];

app.get('/api/dream/symbols', (req, res) => {
  const symbols = dictionary.map((entry) => {
    const disp = SYMBOL_DISPLAY[entry.id] || {};
    // Newer entries carry their own emoji and use the Thai keyword as the
    // label; the original 29 have curated labels in SYMBOL_DISPLAY.
    const thaiKeyword = entry.keywords.find((k) => !/^[a-zA-Z ]+$/.test(k)) || entry.keywords[0];
    return {
      id: entry.id,
      category: entry.category || 'classic',
      keyword: thaiKeyword,
      keyword_en: entry.keywords.find((k) => /^[a-zA-Z ]+$/.test(k)) || thaiKeyword,
      emoji: disp.emoji || entry.emoji || '✨',
      label_en: disp.label_en || entry.id.replace(/_/g, ' '),
      label_th: disp.label_th || thaiKeyword,
    };
  });
  res.json({ symbols, categories: SYMBOL_CATEGORIES });
});

app.get('/api/stats', (req, res) => {
  const { dreamsToday, unlocksToday } = store.getTodayStats();
  res.json({ dreamsToday, unlocksToday });
});

app.get('/api/trends', (req, res) => {
  const top = store.getTopSymbols(5).map((t) => ({
    ...t,
    ...(SYMBOL_DISPLAY[t.id] || { emoji: '✨', label_en: t.id, label_th: t.id }),
  }));
  res.json({ trends: top });
});

// ---------- admin: confirm manual payments ----------
// Simple password-gated page - not a real auth system, just enough
// friction to keep this away from casual visitors. Set ADMIN_PASSWORD in
// your environment before this becomes usable. The password travels in
// the URL/form, which is fine for personal low-stakes use over HTTPS but
// isn't a pattern to reuse for anything more sensitive.

function checkAdminPassword(password) {
  const real = process.env.ADMIN_PASSWORD;
  return Boolean(real) && password === real;
}

app.get('/admin', (req, res) => {
  if (!process.env.ADMIN_PASSWORD) {
    return res.send('Set ADMIN_PASSWORD in your environment variables first, then reload this page.');
  }

  const password = req.query.password || '';
  if (!checkAdminPassword(password)) {
    return res.send(`
      <html><body style="font-family:sans-serif;max-width:400px;margin:60px auto;">
        <h2>Admin login</h2>
        <form method="GET" action="/admin">
          <input name="password" type="password" placeholder="Admin password" style="padding:8px;width:100%;box-sizing:border-box;margin-bottom:10px;">
          <button type="submit" style="padding:8px 16px;">View pending payments</button>
        </form>
      </body></html>
    `);
  }

  const pending = store.getPendingManualEntitlements();
  const rows = pending
    .map(
      (p) => `
      <tr>
        <td><strong style="font-size:16px;color:#a00;">${p.amountSatang ? (p.amountSatang / 100).toFixed(2) + ' ฿' : '—'}</strong></td>
        <td>${(p.payerNote || '').replace(/</g, '&lt;')}</td>
        <td>${p.drawDate}</td>
        <td>${new Date(p.createdAt).toLocaleString()}</td>
        <td>
          <form method="POST" action="/admin/confirm" style="display:inline">
            <input type="hidden" name="id" value="${p.id}">
            <input type="hidden" name="password" value="${password}">
            <button type="submit">Confirm Paid</button>
          </form>
        </td>
      </tr>
    `
    )
    .join('');

  const orders = store.getOpenOrders();
  const orderRows = orders
    .map(
      (o) => `
      <tr>
        <td>${o.userId}</td>
        <td>${o.productName} (${(o.priceSatang / 100).toFixed(0)} THB)</td>
        <td>${(o.payerNote || '').replace(/</g, '&lt;')}</td>
        <td>${new Date(o.createdAt).toLocaleString()}</td>
        <td>
          <form method="POST" action="/admin/shop/handle" style="display:inline">
            <input type="hidden" name="id" value="${o.id}">
            <input type="hidden" name="password" value="${password}">
            <button type="submit">Mark Handled</button>
          </form>
        </td>
      </tr>
    `
    )
    .join('');

  const latestDraw = store.getLatestDrawResult();
  const drawSection = `
    <h2 style="margin-top:40px;">Publish Draw Results</h2>
    <p style="color:#666;">Copy the official numbers from <a href="https://www.glo.or.th" target="_blank">glo.or.th</a> after each draw.
    Double-check before saving — people will trust these to check real tickets.</p>
    ${latestDraw ? `<p style="color:#080;">Latest published: <strong>${latestDraw.drawDate}</strong> (first prize ${latestDraw.first})</p>` : '<p style="color:#a00;">No results published yet.</p>'}
    <form method="POST" action="/admin/draw" style="background:#f6f6f6;padding:16px;border-radius:8px;">
      <input type="hidden" name="password" value="${password}">
      <label>Draw date (YYYY-MM-DD)<br><input name="drawDate" required placeholder="2026-08-01" style="padding:6px;width:200px;"></label><br><br>
      <label>1st prize (6 digits)<br><input name="first" required placeholder="123456" style="padding:6px;width:200px;"></label><br><br>
      <label>Numbers either side of 1st (comma separated)<br><input name="nearFirst" placeholder="123455,123457" style="padding:6px;width:300px;"></label><br><br>
      <label>Front 3 digits (comma separated)<br><input name="frontThree" placeholder="111,222" style="padding:6px;width:300px;"></label><br><br>
      <label>Last 3 digits (comma separated)<br><input name="lastThree" placeholder="888,999" style="padding:6px;width:300px;"></label><br><br>
      <label>Last 2 digits<br><input name="lastTwo" placeholder="56" style="padding:6px;width:100px;"></label><br><br>
      <button type="submit" style="padding:10px 20px;font-weight:bold;">Publish Results</button>
    </form>
  `;

  res.send(`
    <html><body style="font-family:sans-serif;max-width:800px;margin:40px auto;">
      <h2>Pending Manual Payments (${pending.length})</h2>
      <p style="color:#666;">Open your bank app and look for these <strong>exact amounts</strong> — the odd satang identifies each person, so you can match without messaging them. Then click Confirm.</p>
      <table border="1" cellpadding="8" style="border-collapse:collapse;width:100%;">
        <tr><th>Look for this amount</th><th>Name given</th><th>Draw</th><th>Submitted</th><th>Action</th></tr>
        ${rows || '<tr><td colspan="5">No pending payments right now.</td></tr>'}
      </table>

      <h2 style="margin-top:40px;">Shop Orders (${orders.length})</h2>
      <p style="color:#666;">Check your bank app + LINE for the payment and message, follow up to pick the right item and arrange delivery, then mark handled.</p>
      <table border="1" cellpadding="8" style="border-collapse:collapse;width:100%;">
        <tr><th>Visitor</th><th>Item</th><th>Note from buyer</th><th>Submitted</th><th>Action</th></tr>
        ${orderRows || '<tr><td colspan="5">No pending orders right now.</td></tr>'}
      </table>

      ${drawSection}
    </body></html>
  `);
});

app.post('/admin/draw', (req, res) => {
  const { password } = req.body;
  if (!checkAdminPassword(password)) return res.status(403).send('Wrong password');

  const splitList = (v) =>
    String(v || '')
      .split(',')
      .map((s) => s.trim().replace(/\D/g, ''))
      .filter(Boolean);

  store.saveDrawResult({
    drawDate: String(req.body.drawDate || '').trim(),
    first: String(req.body.first || '').replace(/\D/g, ''),
    nearFirst: splitList(req.body.nearFirst),
    frontThree: splitList(req.body.frontThree),
    lastThree: splitList(req.body.lastThree),
    lastTwo: String(req.body.lastTwo || '').replace(/\D/g, ''),
  });

  res.redirect(`/admin?password=${encodeURIComponent(password)}`);
});

app.post('/admin/shop/handle', (req, res) => {
  const { id, password } = req.body;
  if (!checkAdminPassword(password)) return res.status(403).send('Wrong password');
  store.markOrderHandled(id);
  res.redirect(`/admin?password=${encodeURIComponent(password)}`);
});

app.post('/admin/confirm', (req, res) => {
  const { id, password } = req.body;
  if (!checkAdminPassword(password)) return res.status(403).send('Wrong password');
  store.confirmManualEntitlement(id);
  res.redirect(`/admin?password=${encodeURIComponent(password)}`);
});

// ---------- official draw results & ticket checking ----------

app.get('/api/results/latest', (req, res) => {
  const latest = store.getLatestDrawResult();
  if (!latest) return res.json({ available: false });
  res.json({ available: true, result: latest });
});

app.get('/api/results/all', (req, res) => {
  const all = store.getAllDrawResults();
  const sorted = [...all].sort((a, b) => (a.drawDate < b.drawDate ? 1 : -1));
  res.json({ results: sorted });
});

// Check a full 6-digit ticket against a specific (or the latest) draw.
app.post('/api/results/check', readingLimiter, (req, res) => {
  const ticket = (req.body.ticket || '').trim().slice(0, 20);
  const drawDate = (req.body.drawDate || '').trim();

  const result = drawDate ? store.getDrawResult(drawDate) : store.getLatestDrawResult();
  if (!result) {
    return res.json({ available: false, message: 'No draw results have been published here yet.' });
  }

  const check = drawResults.checkTicket(ticket, result);
  res.json({ available: true, drawDate: result.drawDate, ...check });
});

// Real, verifiable statistics from the stored draw archive. This is
// genuine observed data (unlike the dream "lucky numbers"), so it's
// labelled as such in the UI.
app.get('/api/results/stats', (req, res) => {
  const all = store.getAllDrawResults();
  const freq = drawResults.getDigitFrequency(all);
  res.json(freq);
});

// ---------- dream journal (save a reading, check it after the draw) ----------

app.post('/api/journal/save', readingLimiter, (req, res) => {
  const userId = currentUserId(req);
  const dreamText = (req.body.dreamText || '').trim().slice(0, MAX_INPUT_LENGTH);
  const symbolIds = Array.isArray(req.body.symbolIds) ? req.body.symbolIds.slice(0, 10) : [];
  const numbers = Array.isArray(req.body.numbers)
    ? req.body.numbers.map((n) => String(n).replace(/\D/g, '').slice(0, 6)).filter(Boolean).slice(0, 10)
    : [];

  if (!dreamText && numbers.length === 0) {
    return res.status(400).json({ error: 'Nothing to save' });
  }

  const entry = store.saveJournalEntry({
    userId,
    dreamText,
    symbolIds,
    numbers,
    drawDate: currentDrawDate(),
  });
  res.json({ saved: true, entry });
});

// Returns the user's saved dreams, each annotated with whether its
// numbers actually came up - once that draw's results have been
// published. This is the honest follow-up loop: it shows real outcomes,
// including misses.
app.get('/api/journal', (req, res) => {
  const userId = currentUserId(req);
  const entries = store.getJournalForUser(userId, 30);

  const annotated = entries.map((e) => {
    const result = store.getDrawResult(e.drawDate);
    if (!result) {
      return { ...e, status: 'pending', checked: false };
    }
    const numberChecks = (e.numbers || []).map((n) => ({
      number: n,
      ...drawResults.checkShortNumber(n, result),
    }));
    const anyHit = numberChecks.some((c) => c.hit);
    return { ...e, status: anyHit ? 'hit' : 'miss', checked: true, numberChecks, result };
  });

  // A user's own honest hit-rate across checked entries.
  const checkedEntries = annotated.filter((e) => e.checked);
  const hits = checkedEntries.filter((e) => e.status === 'hit').length;

  res.json({
    entries: annotated,
    summary: {
      total: annotated.length,
      checked: checkedEntries.length,
      hits,
    },
  });
});

app.post('/api/journal/delete', readingLimiter, (req, res) => {
  const userId = currentUserId(req);
  const id = (req.body.id || '').trim();
  const ok = store.deleteJournalEntry(userId, id);
  res.json({ deleted: ok });
});

// ---------- daily tarot ----------
// One card per person per day. The card meanings are traditional tarot
// (Major Arcana), which is documented practice - unlike the dream
// numbers, this content isn't invented. The lucky-number derivation on
// top of it IS this app's own method, and the UI says so.

app.get('/api/tarot/daily', (req, res) => {
  const userId = currentUserId(req);
  const today = dayjs().format('YYYY-MM-DD');
  const card = tarot.drawDailyCard(userId, today);
  res.json({ date: today, card });
});

// ---------- visit counter ----------

app.get('/api/visits', (req, res) => {
  res.json(store.getVisitStats());
});

// ---------- visitor profile & personalisation ----------

app.get('/api/profile', (req, res) => {
  const userId = currentUserId(req);
  const profile = store.getProfile(userId);
  if (!profile) return res.json({ hasProfile: false });

  const birthDay =
    profile.birthDayIndex !== null && profile.birthDayIndex !== undefined
      ? birthdays[profile.birthDayIndex]
      : null;

  res.json({ hasProfile: true, profile, birthDay });
});

app.post('/api/profile', readingLimiter, (req, res) => {
  const userId = currentUserId(req);
  const displayName = (req.body.displayName || '').trim().slice(0, 40);
  const rawIndex = req.body.birthDayIndex;
  const birthDayIndex = rawIndex === null || rawIndex === undefined || rawIndex === '' ? null : parseInt(rawIndex, 10);

  if (!displayName) return res.status(400).json({ error: 'Name required' });

  const profile = store.saveProfile({ userId, displayName, birthDayIndex });
  const birthDay =
    profile.birthDayIndex !== null && profile.birthDayIndex !== undefined
      ? birthdays[profile.birthDayIndex]
      : null;

  res.json({ saved: true, profile, birthDay });
});

app.post('/api/profile/clear', readingLimiter, (req, res) => {
  store.clearProfile(currentUserId(req));
  res.json({ cleared: true });
});

// Full list of days for the onboarding picker.
app.get('/api/birthdays', (req, res) => {
  res.json({ days: birthdays });
});

// ---------- auspicious dates (ฤกษ์) ----------
// Free tier gives the next 3 best dates; the full 60-day calendar with
// reasoning is part of the premium pass. Real value either way - the free
// answer is genuinely useful, which is what makes the upgrade fair rather
// than a tease.

app.get('/api/auspicious/activities', (req, res) => {
  res.json({ activities: auspicious.listActivities() });
});

app.post('/api/auspicious', readingLimiter, (req, res) => {
  const key = (req.body.activity || '').trim();
  const userId = currentUserId(req);
  const hasPremium = store.hasUnlockedDraw(userId, currentDrawDate());

  const result = auspicious.bestDates(key, 60, hasPremium ? 12 : 3);
  if (!result) return res.status(400).json({ error: 'Unknown activity' });

  res.json({
    activity: {
      key: result.activity.key,
      icon: result.activity.icon,
      name_en: result.activity.name_en,
      name_th: result.activity.name_th,
    },
    best: result.best,
    hasPremium,
    freeLimit: 3,
    paymentsAvailable: isOmiseConfigured() || Boolean(site.manualPayment && site.manualPayment.enabled),
  });
});

// ---------- tarot spreads (premium) ----------

app.get('/api/tarot/spreads', (req, res) => {
  res.json({ spreads: tarot.listSpreads() });
});

app.post('/api/tarot/spread', readingLimiter, (req, res) => {
  const userId = currentUserId(req);
  const hasPremium = store.hasUnlockedDraw(userId, currentDrawDate());

  if (!hasPremium) {
    return res.json({
      locked: true,
      paymentsAvailable: isOmiseConfigured() || Boolean(site.manualPayment && site.manualPayment.enabled),
    });
  }

  const key = (req.body.spread || 'three').trim();
  const result = tarot.drawSpread(key);
  if (!result) return res.status(400).json({ error: 'Unknown spread' });
  res.json({ locked: false, ...result });
});


// ---------- ห้องมงคล / Blessing Room (the premium area) ----------
// One clearly-signposted place where everything paid lives, rather than
// locks scattered across the page. Free visitors see exactly what's
// inside and one obvious way to unlock it.

app.get('/api/blessing-room', (req, res) => {
  const userId = currentUserId(req);
  const hasPremium = store.hasUnlockedDraw(userId, currentDrawDate());
  const profile = store.getProfile(userId);

  const birthIndex =
    profile && profile.birthDayIndex !== null && profile.birthDayIndex !== undefined
      ? profile.birthDayIndex
      : null;

  // The day-of-birth chant is personalised when we know their birth day;
  // otherwise fall back to today's weekday so there's still something useful.
  const dayIndex = birthIndex !== null ? birthIndex : new Date().getDay();
  const dayChant = prayers.byDay[dayIndex];

  if (!hasPremium) {
    return res.json({
      unlocked: false,
      pricing: site.pricing,
      paymentsAvailable: isOmiseConfigured() || Boolean(site.manualPayment && site.manualPayment.enabled),
    });
  }

  res.json({
    unlocked: true,
    usedBirthDay: birthIndex !== null,
    prayers: prayers.core,
    dayChant,
  });
});

app.listen(PORT, () => {
  console.log(`${site.siteName} listening on port ${PORT}`);
});
