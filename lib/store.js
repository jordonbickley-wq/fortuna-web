const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const path = require('path');

const adapter = new FileSync(path.join(__dirname, '..', 'db.json'));
const db = low(adapter);

db.defaults({ users: [], submissions: [], entitlements: [] }).write();

// ---- users ----
function upsertUser({ lineUserId, displayName, pictureUrl }) {
  const existing = db.get('users').find({ lineUserId }).value();
  if (existing) {
    db.get('users').find({ lineUserId }).assign({ displayName, pictureUrl }).write();
    return db.get('users').find({ lineUserId }).value();
  }
  const user = { lineUserId, displayName, pictureUrl, createdAt: new Date().toISOString() };
  db.get('users').push(user).write();
  return user;
}

function getUser(lineUserId) {
  return db.get('users').find({ lineUserId }).value();
}

// ---- dream submissions (for analytics, same as the bot) ----
function logSubmission({ userId, text, matchedIds }) {
  db.get('submissions')
    .push({ userId, text, matchedIds, at: new Date().toISOString() })
    .write();
}

// ---- entitlements: one row per user per draw-cycle purchase ----
function createPendingEntitlement({ userId, drawDate, chargeId, amountSatang }) {
  const record = {
    id: `ent_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    userId,
    drawDate,
    chargeId,
    amountSatang,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };
  db.get('entitlements').push(record).write();
  return record;
}

function markEntitlementPaid(chargeId) {
  db.get('entitlements').find({ chargeId }).assign({ status: 'paid', paidAt: new Date().toISOString() }).write();
}

function hasUnlockedDraw(userId, drawDate) {
  return !!db.get('entitlements').find({ userId, drawDate, status: 'paid' }).value();
}

function getEntitlementByCharge(chargeId) {
  return db.get('entitlements').find({ chargeId }).value();
}

// ---- real usage stats (no fake/seeded numbers - reflects actual activity) ----
function getTodayStats() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const dreamsToday = db
    .get('submissions')
    .filter((s) => s.at && s.at.startsWith(todayStr))
    .size()
    .value();
  const unlocksToday = db
    .get('entitlements')
    .filter((e) => e.status === 'paid' && e.paidAt && e.paidAt.startsWith(todayStr))
    .size()
    .value();
  return { dreamsToday, unlocksToday };
}

// Top matched dream symbols across all submissions ever logged - real
// counts, not illustrative/seeded data.
function getTopSymbols(limit = 5) {
  const all = db.get('submissions').value();
  const counts = {};
  all.forEach((s) => {
    (s.matchedIds || []).forEach((id) => {
      counts[id] = (counts[id] || 0) + 1;
    });
  });
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, count]) => ({ id, count }));
}

// ---- manual payment (own bank/PromptPay QR, admin-confirmed) ----
function createPendingManualEntitlement({ userId, drawDate, payerNote }) {
  const record = {
    id: `ent_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    userId,
    drawDate,
    payerNote: (payerNote || '').slice(0, 200),
    chargeId: null,
    status: 'pending_manual',
    createdAt: new Date().toISOString(),
  };
  db.get('entitlements').push(record).write();
  return record;
}

function hasPendingManualClaim(userId, drawDate) {
  return !!db.get('entitlements').find({ userId, drawDate, status: 'pending_manual' }).value();
}

function getPendingManualEntitlements() {
  return db.get('entitlements').filter({ status: 'pending_manual' }).value();
}

function confirmManualEntitlement(id) {
  db.get('entitlements').find({ id }).assign({ status: 'paid', paidAt: new Date().toISOString() }).write();
}

// ---- shop orders (manual fulfillment - no automated shipping/inventory,
// just a record so the site owner can see who paid and follow up on LINE) ----
db.defaults({ orders: [] }).write();

function createOrder({ userId, productId, productName, priceSatang, payerNote }) {
  const record = {
    id: `ord_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    userId,
    productId,
    productName,
    priceSatang,
    payerNote: (payerNote || '').slice(0, 200),
    status: 'submitted',
    createdAt: new Date().toISOString(),
  };
  db.get('orders').push(record).write();
  return record;
}

function getOpenOrders() {
  return db.get('orders').filter({ status: 'submitted' }).value();
}

function markOrderHandled(id) {
  db.get('orders').find({ id }).assign({ status: 'handled', handledAt: new Date().toISOString() }).write();
}

module.exports = {
  upsertUser,
  getUser,
  logSubmission,
  createPendingEntitlement,
  markEntitlementPaid,
  hasUnlockedDraw,
  getEntitlementByCharge,
  getTodayStats,
  getTopSymbols,
  createPendingManualEntitlement,
  hasPendingManualClaim,
  getPendingManualEntitlements,
  confirmManualEntitlement,
  createOrder,
  getOpenOrders,
  markOrderHandled,
};