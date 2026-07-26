// Normalizes text for matching: strips whitespace and common filler words
// so "เมื่อคืนฝันเห็นงูใหญ่มาก" still matches the "snake" entry.
function normalize(text) {
  return text.trim().toLowerCase();
}

// Returns an array of matched dictionary entries (usually 0 or 1, but a
// message could plausibly mention two symbols - e.g. snake AND water).
function matchDream(text, dictionary) {
  const normalized = normalize(text);
  const matches = dictionary.filter((entry) =>
    entry.keywords.some((keyword) => normalized.includes(keyword.toLowerCase()))
  );
  return matches;
}

module.exports = { matchDream, normalize };
