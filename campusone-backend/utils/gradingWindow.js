export const getGradingWindowError = (term, now = new Date()) => {
  if (!term) {
    return 'The course term could not be determined';
  }
  if (!term.isActive) {
    return `Grading is closed because term ${term.code || ''} is not active`.trim();
  }
  if (term.endDate) {
    const endDate = new Date(term.endDate);
    // Term dates come from an HTML date input and are stored at midnight.
    // Treat the named end date as inclusive.
    if (
      endDate.getUTCHours() === 0
      && endDate.getUTCMinutes() === 0
      && endDate.getUTCSeconds() === 0
      && endDate.getUTCMilliseconds() === 0
    ) {
      endDate.setUTCHours(23, 59, 59, 999);
    }
    if (now > endDate) {
      return `Grading is closed because term ${term.code || ''} ended on ${new Date(term.endDate).toLocaleDateString()}`.trim();
    }
  }
  return null;
};
