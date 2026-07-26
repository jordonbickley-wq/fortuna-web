const crypto = require('crypto');

// Deterministic (same user + same day = same number) so it feels personal
// and consistent rather than random-every-tap, without needing a database.
// This is explicitly flavor/engagement content, not a "real" prediction -
// keep it labeled as such in bot replies.
function getPersonalNumber(userId, dateString) {
  const hash = crypto.createHash('md5').update(`${userId}:${dateString}`).digest('hex');
  const twoDigit = (parseInt(hash.slice(0, 8), 16) % 100).toString().padStart(2, '0');
  return twoDigit;
}

module.exports = { getPersonalNumber };
