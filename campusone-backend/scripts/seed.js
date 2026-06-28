/**
 * Focused CampusOne test seed.
 *
 * Creates a focused two-semester test setup with:
 * - 1 super admin
 * - 1 teacher
 * - 10 students split between semester 1 and semester 3
 * - 1 active term with 2 courses and offerings
 * - 1 approved semester-3 TA assigned to the semester-1 offering
 * - assignment scenarios for draft, open, overdue, closed, grading, late work,
 *   and similarity scanning
 * - quiz scenarios for draft, upcoming, live, in-progress, closed, automatic
 *   grading, manual grading, review, and violation auto-submission
 * - timetable data with rooms, master schedule config, and weekly class sessions
 *
 * This script clears all application data before seeding.
 */

import bcrypt from 'bcryptjs';
import prisma from '../prisma/client.js';

const PASSWORD = 'Campus@123';
const now = new Date();

const at = ({ days = 0, hours = 0, minutes = 0 } = {}) => new Date(
  now.getTime()
  + days * 24 * 60 * 60 * 1000
  + hours * 60 * 60 * 1000
  + minutes * 60 * 1000
);

const STUDENTS = [
  ['student01', 'Ayesha Khan', 'FA26-BSCS-001', 1, 'FA26'],
  ['student02', 'Bilal Ahmed', 'FA26-BSCS-002', 1, 'FA26'],
  ['student03', 'Fatima Noor', 'FA26-BSCS-003', 1, 'FA26'],
  ['student04', 'Hamza Ali', 'FA26-BSCS-004', 1, 'FA26'],
  ['student05', 'Iqra Malik', 'FA26-BSCS-005', 1, 'FA26'],
  ['student06', 'Junaid Raza', 'FA25-BSCS-006', 3, 'FA25'],
  ['student07', 'Komal Shah', 'FA25-BSCS-007', 3, 'FA25'],
  ['student08', 'Mariam Tariq', 'FA25-BSCS-008', 3, 'FA25'],
  ['student09', 'Saad Hussain', 'FA25-BSCS-009', 3, 'FA25'],
  ['student10', 'Zara Siddiqui', 'FA25-BSCS-010', 3, 'FA25'],
];

const clearDatabase = async () => {
  const tables = await prisma.$queryRawUnsafe(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
  `);

  if (tables.length === 0) return;
  const quotedTables = tables
    .map(({ tablename }) => `"${String(tablename).replaceAll('"', '""')}"`)
    .join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${quotedTables} RESTART IDENTITY CASCADE`);
};

const createUser = ({ username, name, role, password }) => prisma.user.create({
  data: {
    username,
    email: `${username}@campusone.test`,
    name,
    password,
    role,
    isFirstLogin: false,
    isActive: true,
  },
});

const createTimetableData = async (semesterOneOfferingId, semesterThreeOfferingId) => {
  await prisma.scheduleConfig.create({
    data: {
      id: 'default',
      lectureDurationMin: 90,
      breakDurationMin: 15,
      dayStartTime: '09:00',
      workingDays: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
      regularLecturesPerDay: 4,
      maxTeacherLecturesPerDay: 3,
      defaultSessionsPerCourse: 3,
      dayOverrides: {
        FRI: {
          lecturesPerDay: 3,
          jummahAfterSlot: 2,
          jummahMin: 60,
        },
      },
    },
  });

  const lectureHall = await prisma.room.create({
    data: {
      code: 'LH-101',
      name: 'Main Lecture Hall',
      type: 'LECTURE',
      capacity: 60,
      building: 'CS Block',
      floor: 1,
    },
  });

  await prisma.room.createMany({
    data: [
      {
        code: 'LH-102',
        name: 'Seminar Lecture Room',
        type: 'SEMINAR',
        capacity: 35,
        building: 'CS Block',
        floor: 1,
      },
      {
        code: 'LAB-201',
        name: 'Programming Lab',
        type: 'LAB',
        capacity: 40,
        building: 'CS Block',
        floor: 2,
      },
    ],
  });

  await prisma.classSession.createMany({
    data: [
      { offeringId: semesterOneOfferingId, dayOfWeek: 'MON', slotIndex: 1, roomId: lectureHall.id },
      { offeringId: semesterOneOfferingId, dayOfWeek: 'WED', slotIndex: 2, roomId: lectureHall.id },
      { offeringId: semesterOneOfferingId, dayOfWeek: 'FRI', slotIndex: 1, roomId: lectureHall.id },
      { offeringId: semesterThreeOfferingId, dayOfWeek: 'TUE', slotIndex: 1, roomId: lectureHall.id },
      { offeringId: semesterThreeOfferingId, dayOfWeek: 'THU', slotIndex: 2, roomId: lectureHall.id },
      { offeringId: semesterThreeOfferingId, dayOfWeek: 'SAT', slotIndex: 1, roomId: lectureHall.id },
    ],
  });
};

const createAssignmentData = async (offeringId, students, teacherId) => {
  await prisma.assignment.create({
    data: {
      offeringId,
      title: 'Draft: Variables Practice',
      description: 'Draft assignment used to test editing and publishing.',
      totalMarks: 10,
      dueDate: at({ days: 7 }),
      allowLate: false,
      status: 'DRAFT',
    },
  });

  const openAssignment = await prisma.assignment.create({
    data: {
      offeringId,
      title: 'Assignment 1: Control Flow',
      description: 'Solve the conditional and loop exercises. Students 04-05 can submit this assignment from a clean state.',
      totalMarks: 20,
      dueDate: at({ days: 5 }),
      allowLate: true,
      status: 'PUBLISHED',
    },
  });

  await prisma.submission.createMany({
    data: [
      {
        assignmentId: openAssignment.id,
        studentId: students[0].id,
        submissionText: 'I implemented the exercises using if statements, for loops, and input validation.',
        submittedAt: at({ days: -1 }),
        status: 'SUBMITTED',
      },
      {
        assignmentId: openAssignment.id,
        studentId: students[1].id,
        submissionText: 'My solution includes nested loops and comments explaining each step.',
        submittedAt: at({ hours: -12 }),
        status: 'SUBMITTED',
      },
      {
        assignmentId: openAssignment.id,
        studentId: students[2].id,
        submissionText: 'Completed all control-flow exercises with sample output.',
        submittedAt: at({ hours: -4 }),
        status: 'SUBMITTED',
      },
    ],
  });

  await prisma.assignment.create({
    data: {
      offeringId,
      title: 'Late Submission Test',
      description: 'Published and overdue with late submissions enabled. Use an unsubmitted student to test the late workflow.',
      totalMarks: 15,
      dueDate: at({ days: -1 }),
      allowLate: true,
      status: 'PUBLISHED',
    },
  });

  const closedAssignment = await prisma.assignment.create({
    data: {
      offeringId,
      title: 'Assignment 2: Problem Solving',
      description: 'Closed assignment containing graded, ungraded, late, and duplicate-text submissions.',
      totalMarks: 25,
      dueDate: at({ days: -3 }),
      allowLate: true,
      status: 'CLOSED',
    },
  });

  await prisma.submission.createMany({
    data: [
      {
        assignmentId: closedAssignment.id,
        studentId: students[0].id,
        submissionText: 'Implemented the array problem with validation and clear comments.',
        submittedAt: at({ days: -5 }),
        obtainedMarks: 23,
        feedback: 'Excellent solution and explanation.',
        gradedAt: at({ days: -1 }),
        gradedBy: teacherId,
        status: 'GRADED',
      },
      {
        assignmentId: closedAssignment.id,
        studentId: students[1].id,
        submissionText: 'Used a loop to compare each value and track the current maximum.',
        submittedAt: at({ days: -4 }),
        obtainedMarks: 19,
        feedback: 'Good work. Add more input validation.',
        gradedAt: at({ days: -1 }),
        gradedBy: teacherId,
        status: 'GRADED',
      },
      {
        assignmentId: closedAssignment.id,
        studentId: students[2].id,
        submissionText: 'Solution includes pseudocode, source code, and sample output.',
        submittedAt: at({ days: -4 }),
        status: 'SUBMITTED',
      },
      {
        assignmentId: closedAssignment.id,
        studentId: students[3].id,
        submissionText: 'Submitted after the deadline with a complete working solution.',
        submittedAt: at({ days: -2 }),
        isLate: true,
        status: 'LATE',
      },
      {
        assignmentId: closedAssignment.id,
        studentId: students[4].id,
        submissionText: 'Late submission with comments and test cases.',
        submittedAt: at({ days: -2 }),
        isLate: true,
        obtainedMarks: 16,
        feedback: 'Correct, but submitted late.',
        gradedAt: at({ hours: -18 }),
        gradedBy: teacherId,
        status: 'GRADED',
      },
    ],
  });
};

const quizQuestions = [
  {
    type: 'MCQ',
    questionText: 'Which data type stores a whole number?',
    options: ['String', 'Integer', 'Boolean', 'Character'],
    correctAnswer: 1,
    marks: 4,
    order: 1,
  },
  {
    type: 'TRUE_FALSE',
    questionText: 'A while loop may execute zero times.',
    options: ['True', 'False'],
    correctAnswer: 0,
    marks: 3,
    order: 2,
  },
  {
    type: 'SHORT',
    questionText: 'Briefly explain the difference between a compiler and an interpreter.',
    options: [],
    correctAnswer: 'A compiler translates a program before execution, while an interpreter executes it incrementally.',
    marks: 3,
    order: 3,
  },
];

const createClosedAttempt = async ({
  quiz,
  questions,
  studentId,
  status = 'SUBMITTED',
  violations = 0,
  mcqAnswer,
  trueFalseAnswer,
  shortAnswer,
  shortMarks = null,
  shortFeedback = null,
}) => {
  const mcqCorrect = mcqAnswer === 1;
  const trueFalseCorrect = trueFalseAnswer === 0;
  const autoScore = (mcqCorrect ? 4 : 0) + (trueFalseCorrect ? 3 : 0);
  const manualScore = shortMarks ?? 0;

  return prisma.quizAttempt.create({
    data: {
      quizId: quiz.id,
      studentId,
      startedAt: at({ days: -3, minutes: -25 }),
      submittedAt: at({ days: -3 }),
      status,
      totalScore: autoScore + manualScore,
      autoGradedScore: autoScore,
      manualScore,
      violations,
      violationLog: violations
        ? Array.from({ length: violations }, (_, index) => ({
            type: 'TAB_SWITCH',
            at: at({ days: -3, minutes: -20 + index }).toISOString(),
          }))
        : [],
      questionOrder: questions.map((question) => question.id),
      answers: {
        create: [
          {
            questionId: questions[0].id,
            answer: mcqAnswer,
            isCorrect: mcqCorrect,
            marksAwarded: mcqCorrect ? 4 : 0,
          },
          {
            questionId: questions[1].id,
            answer: trueFalseAnswer,
            isCorrect: trueFalseCorrect,
            marksAwarded: trueFalseCorrect ? 3 : 0,
          },
          {
            questionId: questions[2].id,
            answer: shortAnswer,
            isCorrect: shortMarks === null ? null : shortMarks === questions[2].marks,
            marksAwarded: shortMarks ?? 0,
            feedback: shortFeedback,
          },
        ],
      },
    },
  });
};

const createQuizData = async (offeringId, students) => {
  await prisma.quiz.create({
    data: {
      offeringId,
      title: 'Draft Quiz: Variables',
      description: 'Draft quiz for testing edit, question management, Excel import, publish, and delete.',
      totalMarks: 10,
      durationMinutes: 15,
      startAt: at({ days: 4 }),
      endAt: at({ days: 5 }),
      status: 'DRAFT',
      questions: {
        create: [
          {
            type: 'MCQ',
            questionText: 'Which keyword declares a constant in JavaScript?',
            options: ['let', 'var', 'const', 'static'],
            correctAnswer: 2,
            marks: 10,
            order: 1,
          },
        ],
      },
    },
  });

  await prisma.quiz.create({
    data: {
      offeringId,
      title: 'Upcoming Quiz: Selection Statements',
      description: 'Published but not yet open.',
      totalMarks: 10,
      durationMinutes: 20,
      startAt: at({ days: 2 }),
      endAt: at({ days: 3 }),
      status: 'PUBLISHED',
      shuffleQuestions: true,
      questions: {
        create: [
          {
            type: 'MCQ',
            questionText: 'Which statement selects between multiple branches?',
            options: ['if', 'import', 'return', 'class'],
            correctAnswer: 0,
            marks: 5,
            order: 1,
          },
          {
            type: 'TRUE_FALSE',
            questionText: 'An else block is always required.',
            options: ['True', 'False'],
            correctAnswer: 1,
            marks: 5,
            order: 2,
          },
        ],
      },
    },
  });

  const liveQuiz = await prisma.quiz.create({
    data: {
      offeringId,
      title: 'Live Quiz: Programming Basics',
      description: 'Currently open. Student 01 has a resumable attempt; students 02-05 can start fresh.',
      totalMarks: 10,
      durationMinutes: 30,
      startAt: at({ hours: -1 }),
      endAt: at({ days: 1 }),
      status: 'PUBLISHED',
      shuffleQuestions: true,
      maxViolations: 3,
      allowReview: true,
      questions: { create: quizQuestions },
    },
    include: { questions: { orderBy: { order: 'asc' } } },
  });

  await prisma.quizAttempt.create({
    data: {
      quizId: liveQuiz.id,
      studentId: students[0].id,
      startedAt: at({ minutes: -10 }),
      status: 'IN_PROGRESS',
      violations: 1,
      violationLog: [{ type: 'TAB_SWITCH', at: at({ minutes: -8 }).toISOString() }],
      questionOrder: liveQuiz.questions.map((question) => question.id),
      answers: {
        create: [
          {
            questionId: liveQuiz.questions[0].id,
            answer: 1,
          },
          {
            questionId: liveQuiz.questions[2].id,
            answer: 'A compiler translates the program before it runs.',
          },
        ],
      },
    },
  });

  const closedQuiz = await prisma.quiz.create({
    data: {
      offeringId,
      title: 'Closed Quiz: Foundations',
      description: 'Completed attempts for automatic grading, manual grading, review, and violation testing.',
      totalMarks: 10,
      durationMinutes: 30,
      startAt: at({ days: -4 }),
      endAt: at({ days: -3 }),
      status: 'CLOSED',
      maxViolations: 3,
      allowReview: true,
      questions: { create: quizQuestions },
    },
    include: { questions: { orderBy: { order: 'asc' } } },
  });

  await createClosedAttempt({
    quiz: closedQuiz,
    questions: closedQuiz.questions,
    studentId: students[0].id,
    mcqAnswer: 1,
    trueFalseAnswer: 0,
    shortAnswer: 'A compiler translates everything first; an interpreter runs code step by step.',
  });
  await createClosedAttempt({
    quiz: closedQuiz,
    questions: closedQuiz.questions,
    studentId: students[1].id,
    mcqAnswer: 0,
    trueFalseAnswer: 0,
    shortAnswer: 'Compiler translates before running; interpreter processes during execution.',
    shortMarks: 3,
    shortFeedback: 'Clear and correct.',
  });
  await createClosedAttempt({
    quiz: closedQuiz,
    questions: closedQuiz.questions,
    studentId: students[2].id,
    status: 'AUTO_SUBMITTED',
    violations: 3,
    mcqAnswer: 1,
    trueFalseAnswer: 1,
    shortAnswer: 'They translate code in different ways.',
  });
  await createClosedAttempt({
    quiz: closedQuiz,
    questions: closedQuiz.questions,
    studentId: students[3].id,
    mcqAnswer: 1,
    trueFalseAnswer: 0,
    shortAnswer: 'A compiler builds an executable; an interpreter executes statements directly.',
  });
  await createClosedAttempt({
    quiz: closedQuiz,
    questions: closedQuiz.questions,
    studentId: students[4].id,
    mcqAnswer: 1,
    trueFalseAnswer: 0,
    shortAnswer: 'Compiler translates first, interpreter translates while running.',
    shortMarks: 2,
    shortFeedback: 'Good answer; mention whole-program translation.',
  });
};

async function main() {
  console.log('Resetting application data...');
  await clearDatabase();

  const password = await bcrypt.hash(PASSWORD, 10);

  const department = await prisma.department.create({
    data: {
      code: 'CS',
      name: 'Computer Science',
      description: 'Focused semester 1 and semester 3 testing department.',
    },
  });

  const adminUser = await createUser({
    username: 'admin',
    name: 'CampusOne Admin',
    role: 'admin',
    password,
  });
  await prisma.admin.create({
    data: {
      userId: adminUser.id,
      employeeId: 'ADM-001',
      designation: 'Super Administrator',
      departmentId: department.id,
      isSuperAdmin: true,
      permissions: [],
    },
  });

  const teacherUser = await createUser({
    username: 'teacher',
    name: 'Dr. Asad Khan',
    role: 'teacher',
    password,
  });
  const teacher = await prisma.teacher.create({
    data: {
      userId: teacherUser.id,
      employeeId: 'T-001',
      designation: 'Assistant Professor',
      qualification: 'MS Computer Science',
      specialization: ['Programming Fundamentals', 'Software Engineering'],
      departmentId: department.id,
      officeRoom: 'CS-201',
      officeHours: 'Monday and Wednesday, 2:00 PM - 4:00 PM',
    },
  });
  await prisma.department.update({
    where: { id: department.id },
    data: { hodTeacherId: teacher.id },
  });

  const program = await prisma.program.create({
    data: {
      programCode: 'BSCS',
      name: 'BS Computer Science',
      type: 'BACHELOR',
      totalSemesters: 8,
      totalCredits: 6,
      departmentId: department.id,
    },
  });
  const curriculum = await prisma.curriculum.create({
    data: {
      programId: program.id,
      version: '2026-TEST',
      effectiveFromYear: now.getUTCFullYear(),
      totalCredits: 6,
    },
  });
  const semesterOneCourse = await prisma.course.create({
    data: {
      code: 'CS101',
      title: 'Programming Fundamentals',
      description: 'First-semester course used for assignment and quiz testing.',
      creditHours: 3,
      departmentId: department.id,
      sessionType: 'LECTURE',
    },
  });
  const semesterThreeCourse = await prisma.course.create({
    data: {
      code: 'CS201',
      title: 'Data Structures',
      description: 'Third-semester course used for the semester-3 student group.',
      creditHours: 3,
      departmentId: department.id,
      sessionType: 'LECTURE',
    },
  });
  await prisma.curriculumCourse.createMany({
    data: [
      {
        curriculumId: curriculum.id,
        courseId: semesterOneCourse.id,
        semesterSlot: 1,
        type: 'CORE',
      },
      {
        curriculumId: curriculum.id,
        courseId: semesterThreeCourse.id,
        semesterSlot: 3,
        type: 'CORE',
      },
    ],
  });

  const currentTerm = await prisma.term.create({
    data: {
      code: 'FA26',
      season: 'FALL',
      academicYear: '2026-2027',
      startDate: at({ days: -30 }),
      endDate: at({ days: 90 }),
      registrationOpenAt: at({ days: -45 }),
      registrationCloseAt: at({ days: -20 }),
      isActive: true,
    },
  });
  const previousTerm = await prisma.term.create({
    data: {
      code: 'FA25',
      season: 'FALL',
      academicYear: '2025-2026',
      startDate: at({ days: -395 }),
      endDate: at({ days: -215 }),
      registrationOpenAt: at({ days: -425 }),
      registrationCloseAt: at({ days: -405 }),
      isActive: false,
    },
  });
  const semesterOneOffering = await prisma.courseOffering.create({
    data: {
      courseId: semesterOneCourse.id,
      termId: currentTerm.id,
      teacherId: teacher.id,
      section: '1A',
      capacity: 5,
    },
  });
  const semesterThreeOffering = await prisma.courseOffering.create({
    data: {
      courseId: semesterThreeCourse.id,
      termId: currentTerm.id,
      teacherId: teacher.id,
      section: '3A',
      capacity: 5,
    },
  });
  const previousSemesterOneOffering = await prisma.courseOffering.create({
    data: {
      courseId: semesterOneCourse.id,
      termId: previousTerm.id,
      teacherId: teacher.id,
      section: '1A',
      capacity: 5,
      isActive: false,
    },
  });
  await createTimetableData(semesterOneOffering.id, semesterThreeOffering.id);
  await prisma.semesterIncharge.createMany({
    data: [
      {
        teacherId: teacher.id,
        programId: program.id,
        batch: 'FA26',
        academicYear: currentTerm.academicYear,
        semesterNumber: 1,
        status: 'active',
      },
      {
        teacherId: teacher.id,
        programId: program.id,
        batch: 'FA25',
        academicYear: currentTerm.academicYear,
        semesterNumber: 3,
        status: 'active',
      },
    ],
  });

  const semesterOneStudents = [];
  const semesterThreeStudents = [];
  for (const [index, [username, name, studentId, currentSemester, batch]] of STUDENTS.entries()) {
    const user = await createUser({ username, name, role: 'student', password });
    const student = await prisma.student.create({
      data: {
        userId: user.id,
        studentId,
        enrollmentYear: currentSemester === 3 ? 2025 : 2026,
        batch,
        currentSemester,
        programId: program.id,
        curriculumId: curriculum.id,
        departmentId: department.id,
        phone: `0300-00000${String(index + 1).padStart(2, '0')}`,
      },
    });
    await prisma.enrollment.create({
      data: {
        studentId: student.id,
        offeringId: currentSemester === 1 ? semesterOneOffering.id : semesterThreeOffering.id,
        status: 'ENROLLED',
      },
    });
    if (currentSemester === 3) {
      await prisma.enrollment.create({
        data: {
          studentId: student.id,
          offeringId: previousSemesterOneOffering.id,
          status: 'COMPLETED',
          assignmentMarks: 92,
          midMarks: 18,
          finalMarks: 45,
          totalMarks: 92,
          gradeLetter: 'A',
          gradePoints: 4,
          completedAt: at({ days: -220 }),
        },
      });
      semesterThreeStudents.push(student);
    } else {
      semesterOneStudents.push(student);
    }
  }

  const taStudent = semesterThreeStudents[0];
  await prisma.tAAssignment.create({
    data: {
      studentId: taStudent.id,
      offeringId: semesterOneOffering.id,
      status: 'APPROVED',
      permissions: [
        'VIEW_ROSTER',
        'MARK_ATTENDANCE',
        'GRADE_ASSIGNMENTS',
        'GRADE_QUIZZES',
        'ANSWER_QNA',
        'UPLOAD_RESOURCES',
      ],
      appliedSemester: taStudent.currentSemester,
      targetSemesterMin: 1,
      targetSemesterMax: 1,
      reason: 'Seeded TA for Programming Fundamentals.',
      reviewNotes: 'Approved in seed data.',
      reviewedBy: teacherUser.id,
      reviewedAt: at({ days: -1 }),
      startedAt: at({ days: -1 }),
    },
  });

  await createAssignmentData(semesterOneOffering.id, semesterOneStudents, teacher.id);
  await createQuizData(semesterOneOffering.id, semesterOneStudents);

  console.log('\nFocused CampusOne test database is ready.');
  console.log(`Default password: ${PASSWORD}`);
  console.log('Admin:   admin');
  console.log('Teacher: teacher');
  console.log('Students: student01 through student10');
  console.log('Semester 1: student01-student05 enrolled in CS101 Programming Fundamentals, Section 1A');
  console.log('Semester 3: student06-student10 enrolled in CS201 Data Structures, Section 3A');
  console.log('TA: student06 is approved for CS101 Programming Fundamentals');
  console.log('CS101 timetable: MON S1, WED S2, FRI S1 in LH-101');
  console.log('CS201 timetable: TUE S1, THU S2, SAT S1 in LH-101');
  console.log('\nSuggested tests:');
  console.log('- student01: resume live quiz; view graded assignment and pending quiz result');
  console.log('- student02: start live quiz fresh; view fully graded closed quiz');
  console.log('- student03: inspect auto-submitted quiz with three violations');
  console.log('- student04-student05: clean semester-1 accounts for new assignment and quiz attempts');
  console.log('- student06: use the TA workspace for CS101 while enrolled in semester-3 CS201');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
