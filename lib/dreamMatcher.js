// Normalises text for matching.
function normalize(text) {
  return String(text || '').trim().toLowerCase();
}

// Matches a free-text dream against the dictionary.
//
// Two behaviours worth knowing about:
//
// 1. Longest keyword wins. A dream mentioning "แม่น้ำ" shouldn't be
//    reduced to the generic "น้ำ" entry when a river entry exists, and
//    "งูใหญ่" should match snake via its most specific keyword. Scoring
//    by matched-keyword length handles this.
//
// 2. Results are capped. A long, rambling dream can legitimately touch
//    five or six symbols, but showing all of them buries the reading in
//    noise - so we return the strongest few.
function matchDreamDetailed(text, dictionary, limit = 3) {
  const normalized = normalize(text);
  if (!normalized) return [];

  const scored = [];
  dictionary.forEach((entry) => {
    let best = null;
    entry.keywords.forEach((keyword) => {
      const k = String(keyword).toLowerCase();
      if (k && normalized.includes(k)) {
        if (!best || k.length > best.length) best = k;
      }
    });
    if (best) scored.push({ entry, matchedKeyword: best, weight: best.length });
  });

  scored.sort((a, b) => b.weight - a.weight);

  // Thai has no spaces between words, so a short keyword can match inside
  // a longer unrelated one - "แม่น้ำ" (river) contains "แม่" (mother), and
  // without this we'd wrongly report a dream about a river as being about
  // someone's mother. Drop any match whose keyword is contained inside a
  // stronger match's keyword.
  const kept = [];
  scored.forEach((s) => {
    const swallowed = kept.some(
      (k) => k.matchedKeyword.length > s.matchedKeyword.length && k.matchedKeyword.includes(s.matchedKeyword)
    );
    if (!swallowed) kept.push(s);
  });

  return kept.slice(0, limit);
}

function matchDream(text, dictionary, limit = 3) {
  return matchDreamDetailed(text, dictionary, limit).map((s) => s.entry);
}

module.exports = { matchDream, matchDreamDetailed, normalize };
