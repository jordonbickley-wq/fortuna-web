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

// ---- official draw results (entered manually by the owner from GLO) ----
db.defaults({ draws: [], journal: [] }).write();

function saveDrawResult(result) {
  const existing = db.get('draws').find({ drawDate: result.drawDate }).value();
  if (existing) {
    db.get('draws').find({ drawDate: result.drawDate }).assign({ ...result, updatedAt: new Date().toISOString() }).write();
    return db.get('draws').find({ drawDate: result.drawDate }).value();
  }
  const record = { ...result, createdAt: new Date().toISOString() };
  db.get('draws').push(record).write();
  return record;
}

function getDrawResult(drawDate) {
  return db.get('draws').find({ drawDate }).value();
}

function getLatestDrawResult() {
  const all = db.get('draws').value() || [];
  if (all.length === 0) return null;
  return [...all].sort((a, b) => (a.drawDate < b.drawDate ? 1 : -1))[0];
}

function getAllDrawResults() {
  return db.get('draws').value() || [];
}

// ---- dream journal: saved readings, later checked against real results ----
function saveJournalEntry({ userId, dreamText, symbolIds, numbers, drawDate }) {
  const record = {
    id: `jrn_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    userId,
    dreamText: (dreamText || '').slice(0, 200),
    symbolIds: symbolIds || [],
    numbers: numbers || [],
    drawDate,
    createdAt: new Date().toISOString(),
  };
  db.get('journal').push(record).write();
  return record;
}

function getJournalForUser(userId, limit = 20) {
  const all = db.get('journal').filter({ userId }).value() || [];
  return [...all].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)).slice(0, limit);
}

function deleteJournalEntry(userId, id) {
  const entry = db.get('journal').find({ id }).value();
  // Only allow deleting your own entry - the userId check matters because
  // the id alone is guessable-ish and shouldn't be enough to delete.
  if (!entry || entry.userId !== userId) return false;
  db.get('journal').remove({ id }).write();
  return true;
}

// ---- visit counter ----
// Counts real visits only. `total` increments on each page load;
// `unique` counts distinct visitor IDs ever seen. No seeding, no
// inflation - a brand new deployment honestly starts at zero.
db.defaults({ visits: { total: 0, unique: 0, seenIds: [], byDate: {} } }).write();

function recordVisit(userId) {
  const visits = db.get('visits').value();
  const today = new Date().toISOString().slice(0, 10);

  const seen = visits.seenIds || [];
  const isNew = !seen.includes(userId);

  // Cap the stored ID list so this file can't grow without bound. Once
  // past the cap we stop counting new uniques rather than silently
  // guessing at them - an undercount is more honest than a made-up number.
  const CAP = 50000;
  const updatedSeen = isNew && seen.length < CAP ? [...seen, userId] : seen;

  const byDate = { ...(visits.byDate || {}) };
  byDate[today] = (byDate[today] || 0) + 1;

  // Keep only the last 90 days of daily counts.
  const cutoff = new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10);
  Object.keys(byDate).forEach((d) => {
    if (d < cutoff) delete byDate[d];
  });

  db.get('visits')
    .assign({
      total: (visits.total || 0) + 1,
      unique: isNew && seen.length < CAP ? (visits.unique || 0) + 1 : visits.unique || 0,
      seenIds: updatedSeen,
      byDate,
    })
    .write();
}

function getVisitStats() {
  const visits = db.get('visits').value() || {};
  const today = new Date().toISOString().slice(0, 10);
  return {
    total: visits.total || 0,
    unique: visits.unique || 0,
    today: (visits.byDate || {})[today] || 0,
  };
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
  saveDrawResult,
  getDrawResult,
  getLatestDrawResult,
  getAllDrawResults,
  saveJournalEntry,
  getJournalForUser,
  deleteJournalEntry,
  recordVisit,
  getVisitStats,
};
