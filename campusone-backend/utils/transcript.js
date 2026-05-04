import prisma from '../prisma/client.js';
import { computeGradePointAverage } from './grading.js';

export const buildTranscriptData = async (studentId) => {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    include: {
      user: { select: { name: true, email: true } },
      program: { select: { programCode: true, name: true, totalCredits: true } },
      curriculum: { select: { version: true } },
      department: { select: { name: true } },
    },
  });

  if (!student) return null;

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId, status: { in: ['COMPLETED', 'FAILED', 'WITHDRAWN', 'INCOMPLETE'] } },
    include: {
      offering: {
        include: {
          course: { select: { code: true, title: true, creditHours: true } },
          term: { select: { code: true, season: true, academicYear: true } },
        },
      },
    },
    orderBy: { offering: { term: { academicYear: 'asc' } } },
  });

  const termMap = {};
  for (const enrollment of enrollments) {
    const termCode = enrollment.offering.term.code;
    if (!termMap[termCode]) {
      termMap[termCode] = { term: enrollment.offering.term, courses: [], termGPA: null };
    }
    termMap[termCode].courses.push({
      code: enrollment.offering.course.code,
      title: enrollment.offering.course.title,
      creditHours: enrollment.offering.course.creditHours,
      gradeLetter: enrollment.gradeLetter,
      gradePoints: enrollment.gradePoints,
      totalMarks: enrollment.totalMarks,
      status: enrollment.status,
    });
  }

  const terms = Object.values(termMap).map((term) => {
    term.termGPA = computeGradePointAverage(term.courses, (course) => course.creditHours);
    term.termCredits = term.courses
      .filter((course) => course.gradePoints !== null && course.gradePoints !== undefined)
      .reduce((sum, course) => sum + course.creditHours, 0);
    return term;
  });

  const cgpa = computeGradePointAverage(enrollments, (enrollment) => enrollment.offering.course.creditHours);
  const completedCredits = enrollments
    .filter((enrollment) => enrollment.status === 'COMPLETED')
    .reduce((sum, enrollment) => sum + enrollment.offering.course.creditHours, 0);

  return {
    student,
    terms,
    cgpa,
    completedCredits,
    totalRequiredCredits: student.program.totalCredits,
  };
};