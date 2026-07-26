// Official Government Lottery (สลากกินแบ่งรัฐบาล) result handling.
//
// IMPORTANT: results are entered manually by the site owner via /admin
// after each draw, copied from the official GLO announcement
// (https://www.glo.or.th). There is no automated feed here - that's a
// deliberate choice, because publishing wrong prize numbers would be far
// worse than publishing them an hour late.
//
// Prize structure per the official GLO draw:
//   first          - 6,000,000 THB (one 6-digit number)
//   nearFirst      - 100,000 THB (the numbers immediately above/below first)
//   frontThree     - two 3-digit numbers (matched against first 3 digits)
//   lastThree      - two 3-digit numbers (matched against last 3 digits)
//   lastTwo        - one 2-digit number (matched against last 2 digits)
// Lower-tier prizes (second through fifth) exist too, but this checker
// covers the tiers most people actually check by eye.

function normalizeDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

// Checks a full 6-digit ticket against a draw result, returning every
// prize tier it matches (a ticket can match more than one).
function checkTicket(ticketNumber, result) {
  const ticket = normalizeDigits(ticketNumber);
  if (ticket.length !== 6) {
    return { valid: false, error: 'Ticket number must be 6 digits' };
  }

  const wins = [];
  const first = normalizeDigits(result.first);
  const lastTwo = normalizeDigits(result.lastTwo);
  const frontThree = (result.frontThree || []).map(normalizeDigits);
  const lastThree = (result.lastThree || []).map(normalizeDigits);
  const nearFirst = (result.nearFirst || []).map(normalizeDigits);

  if (first && ticket === first) {
    wins.push({ tier: 'first', amount: 6000000 });
  }
  if (nearFirst.includes(ticket)) {
    wins.push({ tier: 'nearFirst', amount: 100000 });
  }
  if (frontThree.includes(ticket.slice(0, 3))) {
    wins.push({ tier: 'frontThree', amount: 4000 });
  }
  if (lastThree.includes(ticket.slice(-3))) {
    wins.push({ tier: 'lastThree', amount: 4000 });
  }
  if (lastTwo && ticket.slice(-2) === lastTwo) {
    wins.push({ tier: 'lastTwo', amount: 2000 });
  }

  return { valid: true, ticket, wins, won: wins.length > 0 };
}

// Checks a short number (2 or 3 digits - the kind our dream readings
// produce) against a draw result. This is what powers the "did my dream
// number actually come up?" follow-up.
//
// Deliberately honest about scope: a 2-digit number is only meaningfully
// checkable against the last-two prize, and a 3-digit against the
// front/last-three prizes. We don't stretch matches to look better than
// they are.
function checkShortNumber(number, result) {
  const num = normalizeDigits(number);
  const hits = [];

  if (num.length === 2) {
    if (normalizeDigits(result.lastTwo) === num) {
      hits.push({ tier: 'lastTwo', label: 'เลขท้าย 2 ตัว', label_en: 'Last 2 digits' });
    }
    // Also worth telling the user if it appeared inside the first prize,
    // clearly marked as "appeared in" rather than "won" - it isn't a prize.
    if (normalizeDigits(result.first).slice(-2) === num) {
      hits.push({ tier: 'inFirstPrize', label: 'ตรงกับ 2 ตัวท้ายรางวัลที่ 1', label_en: 'Matches last 2 of first prize', notAPrize: true });
    }
  }

  if (num.length === 3) {
    const front = (result.frontThree || []).map(normalizeDigits);
    const last = (result.lastThree || []).map(normalizeDigits);
    if (front.includes(num)) {
      hits.push({ tier: 'frontThree', label: 'เลขหน้า 3 ตัว', label_en: 'Front 3 digits' });
    }
    if (last.includes(num)) {
      hits.push({ tier: 'lastThree', label: 'เลขท้าย 3 ตัว', label_en: 'Last 3 digits' });
    }
  }

  // Deduplicate identical tiers (frontThree can list the same number twice)
  const seen = new Set();
  const unique = hits.filter((h) => {
    if (seen.has(h.tier)) return false;
    seen.add(h.tier);
    return true;
  });

  return { number: num, hits: unique, hit: unique.some((h) => !h.notAPrize) };
}

// Real, verifiable digit statistics across stored past draws. Unlike the
// "lucky numbers", this is genuine observed data the user could check
// themselves against GLO's archive - which is exactly why it's worth
// showing.
function getDigitFrequency(results) {
  const lastTwoCounts = {};
  let total = 0;

  results.forEach((r) => {
    const lt = normalizeDigits(r.lastTwo);
    if (lt.length === 2) {
      lastTwoCounts[lt] = (lastTwoCounts[lt] || 0) + 1;
      total += 1;
    }
  });

  const ranked = Object.entries(lastTwoCounts)
    .map(([num, count]) => ({ number: num, count }))
    .sort((a, b) => b.count - a.count);

  return { totalDrawsCounted: total, ranked };
}

module.exports = { checkTicket, checkShortNumber, getDigitFrequency, normalizeDigits };
