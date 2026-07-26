const dayjs = require('dayjs');

// Returns the next draw date (from drawDaysOfMonth, e.g. [1, 16]) and how many
// days away it is. Used to nudge users ("5 days to the draw!") and to know
// when to push extra engagement/content.
function getNextDraw(drawDaysOfMonth) {
  const today = dayjs();
  const sortedDays = [...drawDaysOfMonth].sort((a, b) => a - b);

  for (const day of sortedDays) {
    const candidate = today.date(day);
    if (candidate.isAfter(today, 'day') || candidate.isSame(today, 'day')) {
      return {
        date: candidate.format('YYYY-MM-DD'),
        daysAway: candidate.diff(today, 'day'),
        isToday: candidate.isSame(today, 'day'),
      };
    }
  }

  // No remaining draw day this month -> first draw day next month.
  const nextMonth = today.add(1, 'month').date(sortedDays[0]);
  return {
    date: nextMonth.format('YYYY-MM-DD'),
    daysAway: nextMonth.diff(today, 'day'),
    isToday: false,
  };
}

module.exports = { getNextDraw };
