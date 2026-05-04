export const GRADE_POINTS = {
  A_PLUS: 4.0, A: 4.0, A_MINUS: 3.67,
  B_PLUS: 3.33, B: 3.0, B_MINUS: 2.67,
  C_PLUS: 2.33, C: 2.0, C_MINUS: 1.67,
  D_PLUS: 1.33, D: 1.0,
  F: 0.0, I: null, W: null,
};

const SPECIAL_GRADE_LETTERS = new Set(['I', 'W']);

export const gradeLetterFromTotalMarks = (totalMarks) => {
  const numericTotal = Number(totalMarks);
  if (!Number.isFinite(numericTotal)) return undefined;
  if (numericTotal >= 90) return 'A_PLUS';
  if (numericTotal >= 85) return 'A';
  if (numericTotal >= 80) return 'A_MINUS';
  if (numericTotal >= 75) return 'B_PLUS';
  if (numericTotal >= 70) return 'B';
  if (numericTotal >= 65) return 'B_MINUS';
  if (numericTotal >= 60) return 'C_PLUS';
  if (numericTotal >= 55) return 'C';
  if (numericTotal >= 50) return 'C_MINUS';
  if (numericTotal >= 45) return 'D_PLUS';
  if (numericTotal >= 40) return 'D';
  return 'F';
};

export const normalizeEnrollmentGrade = ({ totalMarks, gradeLetter }) => {
  const explicitGrade = typeof gradeLetter === 'string' && gradeLetter.trim() ? gradeLetter.trim() : undefined;
  if (explicitGrade && SPECIAL_GRADE_LETTERS.has(explicitGrade)) return explicitGrade;

  const derivedGrade = gradeLetterFromTotalMarks(totalMarks);
  if (derivedGrade) return derivedGrade;

  return explicitGrade;
};

export const gradePointsForLetter = (gradeLetter) => {
  if (gradeLetter === undefined) return undefined;
  return GRADE_POINTS[gradeLetter] ?? null;
};

export const enrollmentStatusForGrade = (gradeLetter) => {
  if (!gradeLetter) return undefined;
  if (gradeLetter === 'F') return 'FAILED';
  if (gradeLetter === 'I') return 'INCOMPLETE';
  if (gradeLetter === 'W') return 'WITHDRAWN';
  return 'COMPLETED';
};

export const computeGradePointAverage = (rows, getCreditHours) => {
  const countable = rows.filter((row) => row.gradePoints !== null && row.gradePoints !== undefined);
  if (!countable.length) return null;

  const totalGradePoints = countable.reduce(
    (sum, row) => sum + row.gradePoints * (getCreditHours(row) || 0),
    0,
  );
  const totalCreditHours = countable.reduce((sum, row) => sum + (getCreditHours(row) || 0), 0);

  return totalCreditHours ? +(totalGradePoints / totalCreditHours).toFixed(2) : null;
};