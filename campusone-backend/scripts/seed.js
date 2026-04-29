/**
 * Seed script — run with: node scripts/seed.js
 * Populates the DB with sample departments, programs, curricula, courses,
 * teachers, students, terms, offerings, enrollments, and incharges.
 *
 * All users get password: Campus@123
 * Safe to re-run (upsert throughout).
 */

import bcrypt from 'bcryptjs';
import prisma from '../prisma/client.js';

const PASS = 'Campus@123';

const GRADE_POINTS = {
  A_PLUS: 4.0, A: 4.0, A_MINUS: 3.67,
  B_PLUS: 3.33, B: 3.0, B_MINUS: 2.67,
  C_PLUS: 2.33, C: 2.0, C_MINUS: 1.67,
  D_PLUS: 1.33, D: 1.0, F: 0.0,
};

async function main() {
  console.log('🌱  Starting seed…\n');
  const hash = await bcrypt.hash(PASS, 10);

  // ── 1. DEPARTMENTS ──────────────────────────────────────────────
  console.log('1/9  Departments…');
  const cs = await prisma.department.upsert({
    where: { code: 'CS' },
    update: {},
    create: { code: 'CS', name: 'Computer Science', description: 'Undergraduate and postgraduate programs in computing and information technology.' },
  });
  const ee = await prisma.department.upsert({
    where: { code: 'EE' },
    update: {},
    create: { code: 'EE', name: 'Electrical Engineering', description: 'Programs covering electrical, electronics, and embedded systems engineering.' },
  });
  const bba = await prisma.department.upsert({
    where: { code: 'BBA' },
    update: {},
    create: { code: 'BBA', name: 'Business Administration', description: 'Programs in management, finance, marketing, and entrepreneurship.' },
  });

  // ── 2. TEACHERS ─────────────────────────────────────────────────
  console.log('2/9  Teachers…');
  const teacherDefs = [
    { username: 'asad.khan',    email: 'asad.khan@campusone.edu.pk',    name: 'Dr. Asad Khan',       empId: 'EMP-001', designation: 'Professor',            dept: cs.id  },
    { username: 'sara.malik',   email: 'sara.malik@campusone.edu.pk',   name: 'Dr. Sara Malik',      empId: 'EMP-002', designation: 'Associate Professor',   dept: cs.id  },
    { username: 'usman.raza',   email: 'usman.raza@campusone.edu.pk',   name: 'Mr. Usman Raza',      empId: 'EMP-003', designation: 'Lecturer',              dept: cs.id  },
    { username: 'hira.baig',    email: 'hira.baig@campusone.edu.pk',    name: 'Ms. Hira Baig',       empId: 'EMP-004', designation: 'Lecturer',              dept: cs.id  },
    { username: 'imran.ahmed',  email: 'imran.ahmed@campusone.edu.pk',  name: 'Dr. Imran Ahmed',     empId: 'EMP-005', designation: 'Professor',            dept: ee.id  },
    { username: 'bilal.siddiqui', email: 'bilal.siddiqui@campusone.edu.pk', name: 'Mr. Bilal Siddiqui', empId: 'EMP-006', designation: 'Lecturer', dept: ee.id },
    { username: 'farah.noor',   email: 'farah.noor@campusone.edu.pk',   name: 'Dr. Farah Noor',      empId: 'EMP-007', designation: 'Professor',            dept: bba.id },
  ];

  const T = {};
  for (const t of teacherDefs) {
    const user = await prisma.user.upsert({
      where: { username: t.username },
      update: {},
      create: { username: t.username, email: t.email, name: t.name, password: hash, role: 'teacher', isFirstLogin: false },
    });
    T[t.username] = await prisma.teacher.upsert({
      where: { userId: user.id },
      update: {},
      create: { userId: user.id, employeeId: t.empId, designation: t.designation, departmentId: t.dept },
    });
  }

  // Set HODs
  await prisma.department.update({ where: { id: cs.id },  data: { hodTeacherId: T['asad.khan'].id } });
  await prisma.department.update({ where: { id: ee.id },  data: { hodTeacherId: T['imran.ahmed'].id } });
  await prisma.department.update({ where: { id: bba.id }, data: { hodTeacherId: T['farah.noor'].id } });

  // ── 3. PROGRAMS ─────────────────────────────────────────────────
  console.log('3/9  Programs…');
  const BSCS = await prisma.program.upsert({
    where: { programCode: 'BSCS' },
    update: {},
    create: { programCode: 'BSCS', name: 'BS Computer Science', type: 'BACHELOR', totalSemesters: 8, totalCredits: 130, departmentId: cs.id },
  });
  const MSCS = await prisma.program.upsert({
    where: { programCode: 'MSCS' },
    update: {},
    create: { programCode: 'MSCS', name: 'MS Computer Science', type: 'MASTER', totalSemesters: 4, totalCredits: 60, departmentId: cs.id },
  });
  const BSEE = await prisma.program.upsert({
    where: { programCode: 'BSEE' },
    update: {},
    create: { programCode: 'BSEE', name: 'BS Electrical Engineering', type: 'BACHELOR', totalSemesters: 8, totalCredits: 132, departmentId: ee.id },
  });
  const BBA = await prisma.program.upsert({
    where: { programCode: 'BBA' },
    update: {},
    create: { programCode: 'BBA', name: 'Bachelor of Business Administration', type: 'BACHELOR', totalSemesters: 8, totalCredits: 124, departmentId: bba.id },
  });

  // ── 4. COURSES ──────────────────────────────────────────────────
  console.log('4/9  Courses…');
  const courseDefs = [
    // CS courses
    { code: 'CS-101', title: 'Introduction to Computing',       creditHours: 3, departmentId: cs.id },
    { code: 'CS-102', title: 'Object Oriented Programming',     creditHours: 3, departmentId: cs.id },
    { code: 'CS-103', title: 'Data Structures & Algorithms',    creditHours: 3, departmentId: cs.id },
    { code: 'CS-201', title: 'Database Systems',                creditHours: 3, departmentId: cs.id },
    { code: 'CS-202', title: 'Computer Networks',               creditHours: 3, departmentId: cs.id },
    { code: 'CS-203', title: 'Operating Systems',               creditHours: 3, departmentId: cs.id },
    { code: 'CS-204', title: 'Theory of Computation',           creditHours: 3, departmentId: cs.id },
    { code: 'CS-301', title: 'Software Engineering',            creditHours: 3, departmentId: cs.id },
    { code: 'CS-302', title: 'Artificial Intelligence',         creditHours: 3, departmentId: cs.id },
    { code: 'CS-303', title: 'Computer Graphics',               creditHours: 3, departmentId: cs.id },
    { code: 'CS-401', title: 'Final Year Project I',            creditHours: 3, departmentId: cs.id },
    { code: 'CS-402', title: 'Final Year Project II',           creditHours: 6, departmentId: cs.id },
    // EE courses
    { code: 'EE-101', title: 'Circuit Analysis',                creditHours: 3, departmentId: ee.id },
    { code: 'EE-102', title: 'Digital Logic Design',            creditHours: 3, departmentId: ee.id },
    { code: 'EE-201', title: 'Electronics I',                   creditHours: 3, departmentId: ee.id },
    { code: 'EE-202', title: 'Signals & Systems',               creditHours: 3, departmentId: ee.id },
    { code: 'EE-301', title: 'Power Systems',                   creditHours: 3, departmentId: ee.id },
    // BBA courses
    { code: 'BBA-101', title: 'Principles of Management',       creditHours: 3, departmentId: bba.id },
    { code: 'BBA-102', title: 'Financial Accounting',           creditHours: 3, departmentId: bba.id },
    { code: 'BBA-201', title: 'Marketing Management',           creditHours: 3, departmentId: bba.id },
    { code: 'BBA-202', title: 'Business Finance',               creditHours: 3, departmentId: bba.id },
    // Shared service courses (placed under CS for now)
    { code: 'MTH-101', title: 'Calculus & Analytical Geometry', creditHours: 3, departmentId: cs.id },
    { code: 'MTH-102', title: 'Linear Algebra',                 creditHours: 3, departmentId: cs.id },
    { code: 'ENG-101', title: 'English Communication Skills',   creditHours: 2, departmentId: cs.id },
    { code: 'ISL-101', title: 'Islamic Studies',                creditHours: 2, departmentId: cs.id },
    { code: 'PAK-101', title: 'Pakistan Studies',               creditHours: 2, departmentId: cs.id },
  ];

  const C = {};
  for (const c of courseDefs) {
    C[c.code] = await prisma.course.upsert({
      where: { code: c.code },
      update: {},
      create: c,
    });
  }

  // Prerequisites
  const prereqs = [
    ['CS-102', 'CS-101'],
    ['CS-103', 'CS-102'],
    ['CS-201', 'CS-101'],
    ['CS-202', 'CS-101'],
    ['CS-203', 'CS-103'],
    ['CS-204', 'CS-103'],
    ['CS-301', 'CS-202'],
    ['CS-302', 'CS-103'],
    ['CS-303', 'CS-103'],
    ['CS-401', 'CS-301'],
    ['CS-402', 'CS-401'],
    ['EE-102', 'EE-101'],
    ['EE-201', 'EE-101'],
    ['EE-202', 'MTH-101'],
    ['EE-301', 'EE-201'],
    ['MTH-102', 'MTH-101'],
  ];
  for (const [course, prereq] of prereqs) {
    await prisma.course.update({
      where: { id: C[course].id },
      data: { prerequisites: { connect: { id: C[prereq].id } } },
    }).catch(() => {}); // skip if already connected
  }

  // ── 5. CURRICULA ────────────────────────────────────────────────
  console.log('5/9  Curricula…');
  const bscsCurr = await prisma.curriculum.upsert({
    where: { programId_version: { programId: BSCS.id, version: '2022' } },
    update: {},
    create: { programId: BSCS.id, version: '2022', effectiveFromYear: 2022, totalCredits: 130, isActive: true },
  });
  const bseeCurr = await prisma.curriculum.upsert({
    where: { programId_version: { programId: BSEE.id, version: '2022' } },
    update: {},
    create: { programId: BSEE.id, version: '2022', effectiveFromYear: 2022, totalCredits: 132, isActive: true },
  });

  const bscsMap = [
    { code: 'CS-101',  sem: 1, type: 'CORE' },
    { code: 'MTH-101', sem: 1, type: 'CORE' },
    { code: 'ENG-101', sem: 1, type: 'GENERAL' },
    { code: 'ISL-101', sem: 1, type: 'GENERAL' },
    { code: 'CS-102',  sem: 2, type: 'CORE' },
    { code: 'MTH-102', sem: 2, type: 'CORE' },
    { code: 'PAK-101', sem: 2, type: 'GENERAL' },
    { code: 'CS-103',  sem: 3, type: 'CORE' },
    { code: 'CS-201',  sem: 3, type: 'CORE' },
    { code: 'CS-202',  sem: 4, type: 'CORE' },
    { code: 'CS-203',  sem: 4, type: 'CORE' },
    { code: 'CS-204',  sem: 4, type: 'CORE' },
    { code: 'CS-301',  sem: 5, type: 'CORE' },
    { code: 'CS-302',  sem: 5, type: 'CORE' },
    { code: 'CS-303',  sem: 5, type: 'ELECTIVE', isElective: true },
    { code: 'CS-401',  sem: 7, type: 'CORE' },
    { code: 'CS-402',  sem: 8, type: 'CORE' },
  ];
  for (const m of bscsMap) {
    await prisma.curriculumCourse.upsert({
      where: { curriculumId_courseId: { curriculumId: bscsCurr.id, courseId: C[m.code].id } },
      update: {},
      create: { curriculumId: bscsCurr.id, courseId: C[m.code].id, semesterSlot: m.sem, type: m.type, isElective: m.isElective ?? false },
    });
  }

  const bseeMap = [
    { code: 'EE-101',  sem: 1, type: 'CORE' },
    { code: 'MTH-101', sem: 1, type: 'CORE' },
    { code: 'ENG-101', sem: 1, type: 'GENERAL' },
    { code: 'EE-102',  sem: 2, type: 'CORE' },
    { code: 'EE-201',  sem: 3, type: 'CORE' },
    { code: 'EE-202',  sem: 4, type: 'CORE' },
    { code: 'EE-301',  sem: 5, type: 'CORE' },
  ];
  for (const m of bseeMap) {
    await prisma.curriculumCourse.upsert({
      where: { curriculumId_courseId: { curriculumId: bseeCurr.id, courseId: C[m.code].id } },
      update: {},
      create: { curriculumId: bseeCurr.id, courseId: C[m.code].id, semesterSlot: m.sem, type: m.type, isElective: false },
    });
  }

  // ── 6. TERMS ────────────────────────────────────────────────────
  console.log('6/9  Terms…');
  const FA24 = await prisma.term.upsert({
    where: { code: 'FA24' },
    update: {},
    create: {
      code: 'FA24', season: 'FALL', academicYear: '2024-2025',
      startDate: new Date('2024-09-02'), endDate: new Date('2025-01-17'),
      isActive: false,
    },
  });
  const SP25 = await prisma.term.upsert({
    where: { code: 'SP25' },
    update: {},
    create: {
      code: 'SP25', season: 'SPRING', academicYear: '2024-2025',
      startDate: new Date('2025-02-03'), endDate: new Date('2025-06-20'),
      registrationOpenAt: new Date('2025-01-20'),
      registrationCloseAt: new Date('2025-02-10'),
      isActive: true,
    },
  });

  // ── 7. STUDENTS ─────────────────────────────────────────────────
  console.log('7/9  Students…');
  const studentDefs = [
    // FA22 batch → currently semester 6 in SP25
    { username: 'ahmed.hassan',    email: 'ahmed.hassan@std.campusone.edu.pk',    name: 'Ahmed Hassan',    sid: 'BSCS-22-001', batch: 'FA22', year: 2022, sem: 6 },
    { username: 'sara.ali',        email: 'sara.ali@std.campusone.edu.pk',        name: 'Sara Ali',        sid: 'BSCS-22-002', batch: 'FA22', year: 2022, sem: 6 },
    { username: 'zaid.akhtar',     email: 'zaid.akhtar@std.campusone.edu.pk',     name: 'Zaid Akhtar',     sid: 'BSCS-22-003', batch: 'FA22', year: 2022, sem: 6 },
    // FA23 batch → currently semester 4 in SP25
    { username: 'usman.khan',      email: 'usman.khan@std.campusone.edu.pk',      name: 'Usman Khan',      sid: 'BSCS-23-001', batch: 'FA23', year: 2023, sem: 4 },
    { username: 'fatima.zahra',    email: 'fatima.zahra@std.campusone.edu.pk',    name: 'Fatima Zahra',    sid: 'BSCS-23-002', batch: 'FA23', year: 2023, sem: 4 },
    { username: 'hamza.tariq',     email: 'hamza.tariq@std.campusone.edu.pk',     name: 'Hamza Tariq',     sid: 'BSCS-23-003', batch: 'FA23', year: 2023, sem: 4 },
    // FA24 batch → currently semester 2 in SP25
    { username: 'ali.raza',        email: 'ali.raza@std.campusone.edu.pk',        name: 'Ali Raza',        sid: 'BSCS-24-001', batch: 'FA24', year: 2024, sem: 2 },
    { username: 'ayesha.siddiqui', email: 'ayesha.siddiqui@std.campusone.edu.pk', name: 'Ayesha Siddiqui', sid: 'BSCS-24-002', batch: 'FA24', year: 2024, sem: 2 },
    { username: 'bilal.ahmad',     email: 'bilal.ahmad@std.campusone.edu.pk',     name: 'Bilal Ahmad',     sid: 'BSCS-24-003', batch: 'FA24', year: 2024, sem: 2 },
    { username: 'mariam.noor',     email: 'mariam.noor@std.campusone.edu.pk',     name: 'Mariam Noor',     sid: 'BSCS-24-004', batch: 'FA24', year: 2024, sem: 2 },
  ];

  const S = {};
  for (const s of studentDefs) {
    const user = await prisma.user.upsert({
      where: { username: s.username },
      update: {},
      create: { username: s.username, email: s.email, name: s.name, password: hash, role: 'student', isFirstLogin: false },
    });
    S[s.username] = await prisma.student.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id, studentId: s.sid, enrollmentYear: s.year,
        batch: s.batch, currentSemester: s.sem,
        programId: BSCS.id, curriculumId: bscsCurr.id, departmentId: cs.id,
      },
    });
  }

  // ── 8. COURSE OFFERINGS ─────────────────────────────────────────
  console.log('8/9  Offerings & Enrollments…');

  const makeOffering = async (courseCode, term, teacherKey, section, cap, schedule) => {
    return prisma.courseOffering.upsert({
      where: { courseId_termId_section: { courseId: C[courseCode].id, termId: term.id, section } },
      update: {},
      create: { courseId: C[courseCode].id, termId: term.id, teacherId: T[teacherKey].id, section, capacity: cap, schedule },
    });
  };

  const enroll = async (studentKey, offeringId, data = {}) => {
    return prisma.enrollment.upsert({
      where: { studentId_offeringId: { studentId: S[studentKey].id, offeringId } },
      update: {},
      create: { studentId: S[studentKey].id, offeringId, ...data },
    });
  };

  // ── FA24 offerings (completed term) ──────────────────────────
  const o_cs101_FA24 = await makeOffering('CS-101', FA24, 'asad.khan', 'A', 40, [
    { day: 'MON', start: '09:00', end: '10:30', room: 'CS-101' },
    { day: 'WED', start: '09:00', end: '10:30', room: 'CS-101' },
  ]);
  const o_cs103_FA24 = await makeOffering('CS-103', FA24, 'sara.malik', 'A', 35, [
    { day: 'TUE', start: '09:00', end: '10:30', room: 'CS-201' },
    { day: 'THU', start: '09:00', end: '10:30', room: 'CS-201' },
  ]);
  const o_cs201_FA24 = await makeOffering('CS-201', FA24, 'hira.baig', 'A', 35, [
    { day: 'TUE', start: '11:00', end: '12:30', room: 'CS-202' },
    { day: 'THU', start: '11:00', end: '12:30', room: 'CS-202' },
  ]);
  const o_cs301_FA24 = await makeOffering('CS-301', FA24, 'asad.khan', 'A', 30, [
    { day: 'MON', start: '11:00', end: '12:30', room: 'CS-301' },
    { day: 'WED', start: '11:00', end: '12:30', room: 'CS-301' },
  ]);

  // ── FA24 completed enrollments (with grades) ──────────────────
  const completedAt = new Date('2025-01-20');

  const gradeRow = (assign, mid, final, grade) => ({
    status: 'COMPLETED',
    assignmentMarks: assign, midMarks: mid, finalMarks: final,
    totalMarks: assign + mid + final,
    gradeLetter: grade, gradePoints: GRADE_POINTS[grade],
    completedAt,
  });

  // FA22 batch did CS-301 in FA24 (sem 5)
  await enroll('ahmed.hassan',    o_cs301_FA24.id, gradeRow(28, 27, 36, 'A_PLUS'));  // 91 → A+
  await enroll('sara.ali',        o_cs301_FA24.id, gradeRow(24, 23, 33, 'A_MINUS')); // 80 → A-
  await enroll('zaid.akhtar',     o_cs301_FA24.id, gradeRow(22, 20, 30, 'B_PLUS'));  // 72 → B  wait 72 is B. Let me use 76 → B+
  // Actually let me compute: 22+20+30=72 which is B (≥70). Let me use 23+22+31=76 → B_PLUS
  // I'll fix zaid below

  // FA23 batch did CS-103 and CS-201 in FA24 (sem 3)
  await enroll('usman.khan',   o_cs103_FA24.id, gradeRow(26, 25, 35, 'A'));      // 86 → A
  await enroll('usman.khan',   o_cs201_FA24.id, gradeRow(27, 26, 35, 'A'));      // 88 → A
  await enroll('fatima.zahra', o_cs103_FA24.id, gradeRow(23, 22, 31, 'B_PLUS')); // 76 → B+
  await enroll('fatima.zahra', o_cs201_FA24.id, gradeRow(21, 20, 29, 'B'));      // 70 → B
  await enroll('hamza.tariq',  o_cs103_FA24.id, gradeRow(20, 18, 28, 'B_MINUS')); // 66 → B-
  await enroll('hamza.tariq',  o_cs201_FA24.id, gradeRow(18, 17, 26, 'C_PLUS')); // 61 → C+

  // FA24 batch did CS-101 in FA24 (sem 1)
  await enroll('ali.raza',        o_cs101_FA24.id, gradeRow(22, 20, 28, 'B'));       // 70 → B
  await enroll('ayesha.siddiqui', o_cs101_FA24.id, gradeRow(25, 24, 34, 'A_MINUS')); // 83 → A-
  await enroll('bilal.ahmad',     o_cs101_FA24.id, gradeRow(17, 15, 25, 'C'));       // 57 → C
  await enroll('mariam.noor',     o_cs101_FA24.id, gradeRow(26, 25, 35, 'A'));       // 86 → A

  // Fix zaid (use correct numbers)
  await prisma.enrollment.updateMany({
    where: { studentId: S['zaid.akhtar'].id, offeringId: o_cs301_FA24.id },
    data: { assignmentMarks: 23, midMarks: 22, finalMarks: 31, totalMarks: 76, gradeLetter: 'B_PLUS', gradePoints: GRADE_POINTS['B_PLUS'] },
  });

  // ── SP25 offerings (active term) ──────────────────────────────
  const o_cs102_A = await makeOffering('CS-102', SP25, 'asad.khan', 'A', 40, [
    { day: 'MON', start: '09:00', end: '10:30', room: 'CS-102' },
    { day: 'WED', start: '09:00', end: '10:30', room: 'CS-102' },
  ]);
  const o_cs102_B = await makeOffering('CS-102', SP25, 'usman.raza', 'B', 40, [
    { day: 'TUE', start: '09:00', end: '10:30', room: 'CS-103' },
    { day: 'THU', start: '09:00', end: '10:30', room: 'CS-103' },
  ]);
  const o_cs202_A = await makeOffering('CS-202', SP25, 'usman.raza', 'A', 35, [
    { day: 'TUE', start: '11:00', end: '12:30', room: 'CS-201' },
    { day: 'THU', start: '11:00', end: '12:30', room: 'CS-201' },
  ]);
  const o_cs203_A = await makeOffering('CS-203', SP25, 'sara.malik', 'A', 35, [
    { day: 'MON', start: '11:00', end: '12:30', room: 'CS-301' },
    { day: 'WED', start: '11:00', end: '12:30', room: 'CS-301' },
  ]);
  const o_cs302_A = await makeOffering('CS-302', SP25, 'sara.malik', 'A', 30, [
    { day: 'TUE', start: '09:00', end: '10:30', room: 'CS-401' },
    { day: 'THU', start: '09:00', end: '10:30', room: 'CS-401' },
  ]);
  const o_cs204_A = await makeOffering('CS-204', SP25, 'hira.baig', 'A', 35, [
    { day: 'FRI', start: '09:00', end: '10:30', room: 'CS-202' },
    { day: 'FRI', start: '11:00', end: '12:30', room: 'CS-202' },
  ]);

  // SP25 active enrollments
  // FA24 batch (sem 2): CS-102
  await enroll('ali.raza',        o_cs102_A.id, { status: 'ENROLLED' });
  await enroll('ayesha.siddiqui', o_cs102_A.id, { status: 'ENROLLED' });
  await enroll('mariam.noor',     o_cs102_A.id, { status: 'ENROLLED' });
  await enroll('bilal.ahmad',     o_cs102_B.id, { status: 'ENROLLED' });

  // FA23 batch (sem 4): CS-202, CS-203, CS-204
  await enroll('usman.khan',   o_cs202_A.id, { status: 'ENROLLED' });
  await enroll('usman.khan',   o_cs203_A.id, { status: 'ENROLLED' });
  await enroll('usman.khan',   o_cs204_A.id, { status: 'ENROLLED' });
  await enroll('fatima.zahra', o_cs202_A.id, { status: 'ENROLLED' });
  await enroll('fatima.zahra', o_cs203_A.id, { status: 'ENROLLED' });
  await enroll('fatima.zahra', o_cs204_A.id, { status: 'ENROLLED' });
  await enroll('hamza.tariq',  o_cs202_A.id, { status: 'ENROLLED' });
  await enroll('hamza.tariq',  o_cs203_A.id, { status: 'ENROLLED' });

  // FA22 batch (sem 6): CS-302
  await enroll('ahmed.hassan', o_cs302_A.id, { status: 'ENROLLED' });
  await enroll('sara.ali',     o_cs302_A.id, { status: 'ENROLLED' });
  await enroll('zaid.akhtar',  o_cs302_A.id, { status: 'ENROLLED' });

  // ── 9. SEMESTER INCHARGES ────────────────────────────────────────
  console.log('9/9  Semester incharges…');
  const upsertIncharge = (teacherKey, prog, batch, sem, ay) =>
    prisma.semesterIncharge.upsert({
      where: { programId_batch_semesterNumber_academicYear: { programId: prog.id, batch, semesterNumber: sem, academicYear: ay } },
      update: {},
      create: { teacherId: T[teacherKey].id, programId: prog.id, batch, academicYear: ay, semesterNumber: sem, status: 'active' },
    });

  await upsertIncharge('asad.khan',  BSCS, 'FA24', 2, '2024-2025');
  await upsertIncharge('sara.malik', BSCS, 'FA23', 4, '2024-2025');
  await upsertIncharge('asad.khan',  BSCS, 'FA22', 6, '2024-2025');

  // ── DONE ─────────────────────────────────────────────────────────
  console.log('\n✅  Seed complete!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Default password for all users: Campus@123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  TEACHERS');
  console.log('  --------');
  console.log('  asad.khan       Dr. Asad Khan (CS HOD, Professor)');
  console.log('  sara.malik      Dr. Sara Malik (CS, Assoc. Professor)');
  console.log('  usman.raza      Mr. Usman Raza (CS, Lecturer)');
  console.log('  hira.baig       Ms. Hira Baig (CS, Lecturer)');
  console.log('  imran.ahmed     Dr. Imran Ahmed (EE HOD, Professor)');
  console.log('  bilal.siddiqui  Mr. Bilal Siddiqui (EE, Lecturer)');
  console.log('  farah.noor      Dr. Farah Noor (BBA HOD, Professor)');
  console.log('');
  console.log('  STUDENTS (all BSCS 2022 curriculum)');
  console.log('  -------');
  console.log('  ahmed.hassan    FA22 batch · sem 6 · has FA24 grades (A+)');
  console.log('  sara.ali        FA22 batch · sem 6 · has FA24 grades (A-)');
  console.log('  zaid.akhtar     FA22 batch · sem 6 · has FA24 grades (B+)');
  console.log('  usman.khan      FA23 batch · sem 4 · has FA24 grades (A, A)');
  console.log('  fatima.zahra    FA23 batch · sem 4 · has FA24 grades (B+, B)');
  console.log('  hamza.tariq     FA23 batch · sem 4 · has FA24 grades (B-, C+)');
  console.log('  ali.raza        FA24 batch · sem 2 · has FA24 grades (B)');
  console.log('  ayesha.siddiqui FA24 batch · sem 2 · has FA24 grades (A-)');
  console.log('  bilal.ahmad     FA24 batch · sem 2 · has FA24 grades (C)');
  console.log('  mariam.noor     FA24 batch · sem 2 · has FA24 grades (A)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  ACTIVE TERM: SP25 (Spring 2024-2025)');
  console.log('  Current offerings: CS-102-A/B, CS-202-A, CS-203-A, CS-204-A, CS-302-A');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch(console.error).finally(() => prisma.$disconnect());
