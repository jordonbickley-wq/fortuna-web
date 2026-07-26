// Standard Pythagorean numerology letter-to-number mapping (a real,
// documented system - not something invented for this project). Only
// covers Latin letters; non-Latin characters fall back to char-code
// reduction below, which is a reasonable approximation but not a proper
// Thai-script numerology system - worth revisiting if Thai-name input
// becomes common (see README).
const PYTHAGOREAN_MAP = {
  a: 1, j: 1, s: 1,
  b: 2, k: 2, t: 2,
  c: 3, l: 3, u: 3,
  d: 4, m: 4, v: 4,
  e: 5, n: 5, w: 5,
  f: 6, o: 6, x: 6,
  g: 7, p: 7, y: 7,
  h: 8, q: 8, z: 8,
  i: 9, r: 9,
};

function reduceToSingleDigit(n) {
  let value = n;
  while (value > 9) {
    value = String(value)
      .split('')
      .reduce((sum, digit) => sum + parseInt(digit, 10), 0);
  }
  return value;
}

// Reduces a name to a 1-9 "power number" using the Pythagorean system
// where letters are present, falling back to raw char code for anything
// else (digits, Thai script, symbols) so every input still produces a
// number.
function nameToPowerNumber(name) {
  let sum = 0;
  for (const ch of name.toLowerCase()) {
    if (PYTHAGOREAN_MAP[ch] !== undefined) {
      sum += PYTHAGOREAN_MAP[ch];
    } else if (/[a-z0-9]/i.test(ch) === false && ch.trim() !== '') {
      sum += ch.charCodeAt(0) % 9 + 1;
    }
  }
  return sum === 0 ? 1 : reduceToSingleDigit(sum);
}

function extractDigits(text) {
  return (text.match(/\d/g) || []).join('');
}

// Produces an overall + 3 sub-scores (love/money/work) from a string of
// digits (plate or phone number). This is a demo/illustrative scoring
// model built on digit-sum reduction - NOT sourced from a specific
// authoritative numerology tradition, unlike nameToPowerNumber above.
// Label it as such in the UI; see README.
function digitsToScores(text) {
  const digits = extractDigits(text) || '0';
  const digitSum = digits.split('').reduce((sum, d) => sum + parseInt(d, 10), 0);
  const base = reduceToSingleDigit(digitSum || 1);

  // Spread three sub-scores off the base digit + digit-position weighting,
  // so the same input always gives the same result (deterministic) but
  // different digit patterns produce visibly different profiles.
  let loveSeed = 0;
  let moneySeed = 0;
  let workSeed = 0;
  digits.split('').forEach((d, i) => {
    const val = parseInt(d, 10);
    loveSeed += val * ((i % 3) + 1);
    moneySeed += val * (((i + 1) % 3) + 1);
    workSeed += val * (((i + 2) % 3) + 1);
  });

  const scale = (seed) => 45 + (seed % 50);

  return {
    base,
    overall: 40 + base * 6,
    love: scale(loveSeed),
    money: scale(moneySeed),
    work: scale(workSeed),
  };
}

module.exports = { nameToPowerNumber, digitsToScores, reduceToSingleDigit, extractDigits };
