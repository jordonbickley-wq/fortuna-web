// Makes a manual (non-gateway) payment identifiable from the bank
// statement alone, so the payer doesn't have to message you separately.
//
// The trick: vary the satang. Instead of everyone paying exactly 29.00,
// each person is asked for a slightly different amount - 29.01, 29.02,
// 29.03 and so on. When you look at your bank feed you can match a
// payment to a person by the exact amount, with no LINE message needed.
//
// Honest limits of this approach:
//   - it gives 99 unique slots per base price, so it only works while
//     concurrent unpaid requests stay well under that
//   - you still have to look at your bank app yourself; this makes the
//     matching instant, it doesn't make it automatic
//   - a real payment gateway removes the manual step entirely, which is
//     why this is framed as an interim measure rather than the answer

const MAX_SATANG_SLOTS = 99;

// Picks the lowest satang offset not currently held by another pending
// request, so two people are never asked for the same amount at once.
function allocateReference(baseSatang, takenAmounts) {
  const taken = new Set(takenAmounts || []);
  for (let offset = 1; offset <= MAX_SATANG_SLOTS; offset++) {
    const candidate = baseSatang + offset;
    if (!taken.has(candidate)) {
      return { amountSatang: candidate, offset, exhausted: false };
    }
  }
  // Every slot is in use - fall back to the base amount and flag it, so
  // the caller can warn rather than silently issuing a duplicate.
  return { amountSatang: baseSatang, offset: 0, exhausted: true };
}

function formatThb(satang) {
  return (satang / 100).toFixed(2);
}

module.exports = { allocateReference, formatThb, MAX_SATANG_SLOTS };
