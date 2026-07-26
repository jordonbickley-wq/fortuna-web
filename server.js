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
app.use(express.static(path.join(__dirname, 'public')));
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
    return res.json({
      manual: true,
      qrImageUrl: site.manualPayment.qrImagePath,
      contactQrImageUrl: site.manualPayment.contactQrImagePath,
      contactInfo: site.manualPayment.contactInfo,
      amountSatang: site.pricing.drawPassAmountSatang,
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
  store.createPendingManualEntitlement({ userId, drawDate, payerNote });
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

app.get('/api/dream/symbols', (req, res) => {
  const symbols = dictionary.map((entry) => ({
    id: entry.id,
    keyword: entry.keywords[0],
    keyword_en: entry.keywords.find((k) => /^[a-zA-Z ]+$/.test(k)) || entry.keywords[0],
    emoji: (SYMBOL_DISPLAY[entry.id] || {}).emoji || '✨',
    label_en: (SYMBOL_DISPLAY[entry.id] || {}).label_en || entry.id,
    label_th: (SYMBOL_DISPLAY[entry.id] || {}).label_th || entry.id,
  }));
  res.json({ symbols });
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
        <td>${p.userId}</td>
        <td>${p.drawDate}</td>
        <td>${(p.payerNote || '').replace(/</g, '&lt;')}</td>
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

  res.send(`
    <html><body style="font-family:sans-serif;max-width:800px;margin:40px auto;">
      <h2>Pending Manual Payments (${pending.length})</h2>
      <p style="color:#666;">Check your bank app for the payment, then click Confirm to unlock that visitor's numbers.</p>
      <table border="1" cellpadding="8" style="border-collapse:collapse;width:100%;">
        <tr><th>Visitor</th><th>Draw</th><th>Note from payer</th><th>Submitted</th><th>Action</th></tr>
        ${rows || '<tr><td colspan="5">No pending payments right now.</td></tr>'}
      </table>

      <h2 style="margin-top:40px;">Shop Orders (${orders.length})</h2>
      <p style="color:#666;">Check your bank app + LINE for the payment and message, follow up to pick the right item and arrange delivery, then mark handled.</p>
      <table border="1" cellpadding="8" style="border-collapse:collapse;width:100%;">
        <tr><th>Visitor</th><th>Item</th><th>Note from buyer</th><th>Submitted</th><th>Action</th></tr>
        ${orderRows || '<tr><td colspan="5">No pending orders right now.</td></tr>'}
      </table>
    </body></html>
  `);
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

app.listen(PORT, () => {
  console.log(`${site.siteName} listening on port ${PORT}`);
});
