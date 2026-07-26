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
const { createRateLimiter } = require('./lib/rateLimiter');
const { getMoonPhase } = require('./lib/moonPhase');

// 20 requests per minute per IP on the free-text endpoints - generous for
// a real user clicking around, tight enough to blunt casual spam/scraping.
const readingLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 20 });

const MAX_INPUT_LENGTH = 200; // dream text, plate, phone, name - all capped here

// real Thai day-of-week color tradition, indexed by JS Date#getDay() (0=Sunday)
const DAY_COLORS = [
  { name: 'Red', hex: '#C4342B' },
  { name: 'Yellow', hex: '#E4C158' },
  { name: 'Pink', hex: '#E38FA0' },
  { name: 'Green', hex: '#3E6B5C' },
  { name: 'Orange', hex: '#E8873A' },
  { name: 'Light Blue', hex: '#6FA8C9' },
  { name: 'Purple', hex: '#7B5EA7' },
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

  const readings = matches.map((m) => ({
    id: m.id,
    interpretation: m.interpretation,
    // Premium numbers only included if this draw cycle is unlocked.
    luckyNumbers: hasUnlock ? m.luckyNumbers : null,
    locked: !hasUnlock,
  }));

  res.json({
    matched: matches.length > 0,
    readings,
    personalNumber,
    hasUnlock,
    paymentsAvailable: isOmiseConfigured(),
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

  if (!isOmiseConfigured()) {
    // Real payments aren't wired up yet - tell the frontend so it can show
    // a "launching soon" state instead of a broken/erroring checkout.
    return res.json({ comingSoon: true, message: 'Online payments are launching soon - check back shortly!' });
  }

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

    res.json({ chargeId: charge.id, qrImageUrl, amountSatang: site.pricing.drawPassAmountSatang });
  } catch (err) {
    console.error('Charge creation failed:', err);
    res.status(500).json({ error: 'Could not start payment. Please try again.' });
  }
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
  res.json({ name, power, meaning: numerologyContent.nameNumberMeanings[String(power)] });
});

// ---------- zodiac daily reading ----------

app.post('/api/zodiac', readingLimiter, (req, res) => {
  const animal = (req.body.animal || '').trim();
  if (!animal || !numerologyContent.zodiacAnimals.includes(animal)) {
    return res.status(400).json({ error: 'Unknown zodiac animal', options: numerologyContent.zodiacAnimals });
  }
  const readings = numerologyContent.zodiacReadings[animal];
  const reading = readings[Math.floor(Math.random() * readings.length)];
  const luckyNumber = Math.floor(Math.random() * 9) + 1;
  res.json({ animal, reading, luckyNumber });
});

// ---------- amulet match ----------

app.post('/api/amulet', readingLimiter, (req, res) => {
  const goal = (req.body.goal || '').trim();
  const match = numerologyContent.amuletMatches[goal];
  if (!match) {
    return res.status(400).json({ error: 'Unknown goal', options: Object.keys(numerologyContent.amuletMatches) });
  }
  res.json({ goal, summary: match.summary, tip: match.tip });
});

app.listen(PORT, () => {
  console.log(`${site.siteName} listening on port ${PORT}`);
});
