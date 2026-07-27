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

// ---- multi-card spreads (premium) ----
// Unlike the daily card, a spread is drawn fresh each time - that's how
// tarot spreads work, you shuffle for the question at hand.

const SPREADS = {
  three: {
    key: 'three',
    positions: [
      { key: 'past', label_en: 'Past', label_th: 'อดีต' },
      { key: 'present', label_en: 'Present', label_th: 'ปัจจุบัน' },
      { key: 'future', label_en: 'Future', label_th: 'อนาคต' },
    ],
    name_en: 'Past · Present · Future',
    name_th: 'อดีต · ปัจจุบัน · อนาคต',
  },
  love: {
    key: 'love',
    positions: [
      { key: 'you', label_en: 'You', label_th: 'ตัวคุณ' },
      { key: 'them', label_en: 'Them', label_th: 'อีกฝ่าย' },
      { key: 'between', label_en: 'Between you', label_th: 'ความสัมพันธ์' },
      { key: 'advice', label_en: 'Advice', label_th: 'คำแนะนำ' },
    ],
    name_en: 'Love & Relationship',
    name_th: 'ความรักและความสัมพันธ์',
  },
  career: {
    key: 'career',
    positions: [
      { key: 'situation', label_en: 'Where you are', label_th: 'สถานการณ์ตอนนี้' },
      { key: 'obstacle', label_en: 'What blocks you', label_th: 'อุปสรรค' },
      { key: 'strength', label_en: 'Your strength', label_th: 'จุดแข็งของคุณ' },
      { key: 'outcome', label_en: 'Where it leads', label_th: 'ผลลัพธ์' },
    ],
    name_en: 'Work & Money',
    name_th: 'การงานและการเงิน',
  },
};

// Draws a spread without repeating cards - a real shuffle wouldn't deal
// the same card twice.
function drawSpread(spreadKey) {
  const spread = SPREADS[spreadKey];
  if (!spread) return null;

  const pool = deck.map((_, i) => i);
  // Fisher-Yates on the index pool.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const cards = spread.positions.map((pos, i) => {
    const card = deck[pool[i]];
    const orientation = Math.random() < 0.35 ? 'reversed' : 'upright';
    return {
      position: pos,
      ...card,
      orientation,
      reading: card[orientation],
    };
  });

  return { spread: { key: spread.key, name_en: spread.name_en, name_th: spread.name_th }, cards };
}

function listSpreads() {
  return Object.values(SPREADS).map((s) => ({
    key: s.key,
    name_en: s.name_en,
    name_th: s.name_th,
    cardCount: s.positions.length,
  }));
}

module.exports = { drawDailyCard, getDeckSize, drawSpread, listSpreads };
