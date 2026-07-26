// Standard approximate synodic-month moon phase calculation. This is a
// well-known public astronomical approximation (not fabricated), accurate
// enough for a "fun daily fact" feature - not precision-grade.
const SYNODIC_MONTH_SECONDS = 2551443;
const KNOWN_NEW_MOON = new Date(2000, 0, 6, 18, 14, 0).getTime() / 1000;

const PHASE_NAMES = [
  'New Moon',
  'Waxing Crescent',
  'First Quarter',
  'Waxing Gibbous',
  'Full Moon',
  'Waning Gibbous',
  'Last Quarter',
  'Waning Crescent',
];

function getMoonPhase(date = new Date()) {
  let phase = (date.getTime() / 1000 - KNOWN_NEW_MOON) % SYNODIC_MONTH_SECONDS;
  if (phase < 0) phase += SYNODIC_MONTH_SECONDS;
  const index = Math.floor((phase / SYNODIC_MONTH_SECONDS) * 8 + 0.5) % 8;
  return PHASE_NAMES[index];
}

module.exports = { getMoonPhase };
