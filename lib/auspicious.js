const activities = require('../config/auspicious.json');

// Scores the next N days for a given activity using traditional Thai
// day-of-week suitability.
//
// Scope note carried into the UI: a real ฤกษ์ from a หมอดู also weighs the
// individual's birth chart, the lunar calendar and planetary positions.
// This is the day-of-week layer only - useful guidance, not a substitute
// for a personal consultation.
function scoreDates(activityKey, days = 60, startDate = new Date()) {
  const activity = activities.find((a) => a.key === activityKey);
  if (!activity) return null;

  const out = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i);
    const dow = d.getDay();
    out.push({
      date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      dayOfWeek: dow,
      score: activity.scores[dow],
      note_en: activity.notes_en[String(dow)],
      note_th: activity.notes_th[String(dow)],
      daysAway: i,
    });
  }
  return { activity, dates: out };
}

// The best upcoming dates, highest score first, tie-broken by soonest.
function bestDates(activityKey, days = 60, limit = 10) {
  const scored = scoreDates(activityKey, days);
  if (!scored) return null;
  const sorted = [...scored.dates].sort((a, b) => (b.score !== a.score ? b.score - a.score : a.daysAway - b.daysAway));
  return { activity: scored.activity, best: sorted.slice(0, limit), all: scored.dates };
}

function listActivities() {
  return activities.map((a) => ({
    key: a.key,
    icon: a.icon,
    name_en: a.name_en,
    name_th: a.name_th,
  }));
}

module.exports = { scoreDates, bestDates, listActivities };
