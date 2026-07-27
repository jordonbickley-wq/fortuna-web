const crypto = require('crypto');
const deck = require('../config/tarot.json');

// Draws one card per person per day, deterministically. This matters:
// if the card changed on every refresh it would feel like a slot machine
// rather than a reading, and people would just re-roll until they liked
// the result. Same person + same date = same card, all day.
function drawDailyCard(userId, dateString) {
  const hash = crypto.createHash('md5').update(`tarot:${userId}:${dateString}`).digest('hex');

  const cardIndex = parseInt(hash.slice(0, 8), 16) % deck.length;
  // Separate slice of the hash decides orientation, so the card and its
  // orientation vary independently.
  const isReversed = parseInt(hash.slice(8, 12), 16) % 100 < 35; // ~35% reversed

  const card = deck[cardIndex];
  const orientation = isReversed ? 'reversed' : 'upright';

  return {
    ...card,
    orientation,
    reading: card[orientation],
    luckyNumbers: deriveLuckyNumbers(card.number, hash),
  };
}

// Derives lucky numbers from the card's traditional Major Arcana number.
//
// Being straight about this: the card numbers themselves are traditional
// (The Fool is 0, The World is 21, and so on), but turning them into
// 2-digit lottery numbers is this app's own method, not an established
// tarot practice. The UI labels it accordingly.
function deriveLuckyNumbers(cardNumber, hash) {
  const two = String(cardNumber).padStart(2, '0');
  const mirrored = two.split('').reverse().join('');
  // A third number seeded from the same daily hash, so it's stable for
  // the day but not simply a restatement of the card number.
  const extra = String(parseInt(hash.slice(12, 18), 16) % 100).padStart(2, '0');

  // Deduplicate while preserving order.
  const seen = new Set();
  return [two, mirrored, extra].filter((n) => {
    if (seen.has(n)) return false;
    seen.add(n);
    return true;
  });
}

function getDeckSize() {
  return deck.length;
}

module.exports = { drawDailyCard, getDeckSize };
