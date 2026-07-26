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

module.exports = {
  upsertUser,
  getUser,
  logSubmission,
  createPendingEntitlement,
  markEntitlementPaid,
  hasUnlockedDraw,
  getEntitlementByCharge,
};
