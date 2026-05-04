/**
 * Seed script — mirrors UCP-style university with a single CS department
 * and a single BSCS program over 8 semesters.
 *
 * Run with:  node scripts/seed.js
 *
 * The Super Admin is NOT created here — use scripts/createSuperAdmin.js for
 * that and save the recovery keys it prints.
 *
 * Default password for every seeded user: Campus@123
 *
 * Reproducible: deterministic RNG, idempotent on cores via upsert. Bulk
 * tables (enrollments, attendance, etc.) use createMany — re-running after
 * an existing seed will skip duplicates.
 *
 * Recommended workflow: `npx prisma migrate reset` (you, not Claude) →
 * `node scripts/createSuperAdmin.js` → `node scripts/seed.js`.
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

let _rng = 1;
const rand = () => { _rng = (_rng * 9301 + 49297) % 233280; return _rng / 233280; };
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const randInt = (min, max) => Math.floor(rand() * (max - min + 1)) + min;
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const hoursAgo = (n) => new Date(Date.now() - n * 60 * 60 * 1000);

const FIRST_NAMES = [
  'Ahmed', 'Sara', 'Zaid', 'Usman', 'Fatima', 'Hamza', 'Ali', 'Ayesha', 'Bilal', 'Mariam',
  'Asad', 'Hira', 'Imran', 'Farah', 'Noor', 'Tariq', 'Sana', 'Kamran', 'Rabia', 'Hassan',
  'Maryam', 'Adnan', 'Saima', 'Faisal', 'Zara', 'Junaid', 'Nadia', 'Waqar', 'Shazia', 'Yasir',
  'Amna', 'Saad', 'Iqra', 'Talha', 'Komal', 'Rehan', 'Sadia', 'Arsalan', 'Mehwish', 'Daniyal',
];
const LAST_NAMES = [
  'Khan', 'Ali', 'Ahmed', 'Hussain', 'Malik', 'Raza', 'Siddiqui', 'Zahra', 'Tariq', 'Noor',
  'Akhtar', 'Baig', 'Rashid', 'Iqbal', 'Hashmi', 'Sheikh', 'Mahmood', 'Riaz', 'Aslam', 'Mirza',
  'Qureshi', 'Ansari', 'Butt', 'Cheema', 'Awan', 'Sattar', 'Saleem', 'Naveed', 'Rauf', 'Bhatti',
];

const TEACHER_DESIGNATIONS = ['Professor', 'Associate Professor', 'Assistant Professor', 'Lecturer'];

// ── BSCS curriculum (from real UCP transcript) ─────────────────────────────
// Each entry: code, title, credits, type, semester slot, prerequisite code (optional)
const CURRICULUM = [
  // Semester 1 (Fall) — fixed core + GENERAL
  { code: 'CSCS1513', title: 'Introduction to Computing',         cr: 3, type: 'CORE',    sem: 1 },
  { code: 'CSCS1511', title: 'Introduction to Computing-Lab',     cr: 1, type: 'LAB',     sem: 1 },
  { code: 'CSHU1833', title: 'English-I',                         cr: 3, type: 'GENERAL', sem: 1 },
  { code: 'CSHU2833', title: 'Logic Thinking',                    cr: 3, type: 'GENERAL', sem: 1 },
  { code: 'CSSS1723', title: 'Basic Electronics',                 cr: 3, type: 'CORE',    sem: 1 },
  { code: 'ISL1012',  title: 'Islamic Studies/Ethics',            cr: 2, type: 'GENERAL', sem: 1 },
  { code: 'ENT1011',  title: 'Fundamentals of Entrepreneurship',  cr: 1, type: 'GENERAL', sem: 1 },

  // Semester 2 (Spring) — fixed core
  { code: 'CSCP1013', title: 'Programming Fundamentals',          cr: 3, type: 'CORE',    sem: 2 },
  { code: 'CSCP1011', title: 'Programming Fundamentals-Lab',      cr: 1, type: 'LAB',     sem: 2, prereq: null },
  { code: 'CSCS2523', title: 'Digital Logic Design',              cr: 3, type: 'CORE',    sem: 2 },
  { code: 'CSCS2521', title: 'Digital Logic Design-Lab',          cr: 1, type: 'LAB',     sem: 2 },
  { code: 'CSSS1713', title: 'Calculus and Analytical Geometry',  cr: 3, type: 'CORE',    sem: 2 },
  { code: 'ENG1023',  title: 'Advanced English Writing',          cr: 3, type: 'GENERAL', sem: 2, prereq: 'CSHU1833' },
  { code: 'HU1013',   title: 'Introduction to Psychology',        cr: 3, type: 'GENERAL', sem: 2 },

  // Semester 3 (Fall) — fixed core
  { code: 'CSCP2023', title: 'Object Oriented Programming',       cr: 3, type: 'CORE',    sem: 3, prereq: 'CSCP1013' },
  { code: 'CSCP2021', title: 'Object Oriented Programming-Lab',   cr: 1, type: 'LAB',     sem: 3, prereq: 'CSCP1011' },
  { code: 'CSCS3543', title: 'Computer Organization & Assembly',  cr: 3, type: 'CORE',    sem: 3, prereq: 'CSCS2523' },
  { code: 'CSCS3541', title: 'Computer Organization & Assembly-Lab', cr: 1, type: 'LAB',  sem: 3, prereq: 'CSCS2521' },
  { code: 'CSSS2733', title: 'Multivariate Calculus',             cr: 3, type: 'CORE',    sem: 3, prereq: 'CSSS1713' },
  { code: 'CSAL1213', title: 'Discrete Structures',               cr: 3, type: 'CORE',    sem: 3 },
  { code: 'PAK1012',  title: 'Pakistan Studies',                  cr: 2, type: 'GENERAL', sem: 3 },

  // Semester 4 (Spring) — fixed core
  { code: 'CSCP2033', title: 'Data Structures and Algorithms',    cr: 3, type: 'CORE',    sem: 4, prereq: 'CSCP2023' },
  { code: 'CSCP2031', title: 'Data Structures & Algorithms-Lab',  cr: 1, type: 'LAB',     sem: 4, prereq: 'CSCP2021' },
  { code: 'CSDB2313', title: 'Introduction to Database Systems',  cr: 3, type: 'CORE',    sem: 4 },
  { code: 'CSDB2311', title: 'Introduction to Database Systems-Lab', cr: 1, type: 'LAB',  sem: 4 },
  { code: 'CSSS2743', title: 'Probability & Statistics',          cr: 3, type: 'CORE',    sem: 4, prereq: 'CSSS1713' },
  { code: 'CSSS2753', title: 'Linear Algebra',                    cr: 3, type: 'CORE',    sem: 4, prereq: 'CSSS1713' },
  { code: 'CSDS4423', title: 'Programming for Big Data',          cr: 3, type: 'ELECTIVE', sem: 4, prereq: 'CSCP1013' },

  // Semester 5 (Fall) — core + 1 elective slot
  { code: 'CSCS3553', title: 'Operating Systems',                 cr: 3, type: 'CORE',    sem: 5, prereq: 'CSCS3543' },
  { code: 'CSCS3551', title: 'Operating Systems-Lab',             cr: 1, type: 'LAB',     sem: 5, prereq: 'CSCS3541' },
  { code: 'CSAL3233', title: 'Design Analysis of Algorithm',      cr: 3, type: 'CORE',    sem: 5, prereq: 'CSCP2033' },
  { code: 'CSSE3113', title: 'Software Engineering',              cr: 3, type: 'CORE',    sem: 5, prereq: 'CSCP2023' },
  { code: 'CSSS2763', title: 'Differential Equation',             cr: 3, type: 'CORE',    sem: 5, prereq: 'CSSS1713' },
  { code: 'CASE2143', title: 'Web Application Development',       cr: 3, type: 'ELECTIVE', sem: 5, prereq: 'CSCP2023' },

  // Semester 6 (Spring) — core + 1 elective
  { code: 'CSAL3243', title: 'Artificial Intelligence',           cr: 3, type: 'CORE',    sem: 6, prereq: 'CSCP2033' },
  { code: 'CSAL3241', title: 'Artificial Intelligence-Lab',       cr: 1, type: 'LAB',     sem: 6, prereq: 'CSCP2031' },
  { code: 'CSAL3253', title: 'Theory of Automata',                cr: 3, type: 'CORE',    sem: 6, prereq: 'CSAL1213' },
  { code: 'CSNC2413', title: 'Computer Communications & Networks',cr: 3, type: 'CORE',    sem: 6 },
  { code: 'CSNC2411', title: 'Computer Communications & Networks-Lab', cr: 1, type: 'LAB', sem: 6 },
  { code: 'CASE2163', title: 'Web Programming',                   cr: 3, type: 'ELECTIVE', sem: 6, prereq: 'CASE2143' },
  { code: 'CSHU2813', title: 'English-III',                       cr: 3, type: 'GENERAL', sem: 6, prereq: 'ENG1023' },

  // Semester 7 (Fall) — core + electives
  { code: 'CSSE4183', title: 'Project-I',                         cr: 3, type: 'CORE',    sem: 7, prereq: 'CSSE3113' },
  { code: 'CSCS4573', title: 'Compiler Construction',             cr: 3, type: 'CORE',    sem: 7, prereq: 'CSAL3253' },
  { code: 'CSNC4003', title: 'Numerical Computing',               cr: 3, type: 'ELECTIVE', sem: 7, prereq: 'CSSS2753' },
  { code: 'CSIS2022', title: 'Information Security',              cr: 2, type: 'ELECTIVE', sem: 7 },
  { code: 'CSIS2021', title: 'Information Security-Lab',          cr: 1, type: 'LAB',     sem: 7 },
  { code: 'ACCT3013', title: 'Financial Accounting',              cr: 3, type: 'ELECTIVE', sem: 7 },
  { code: 'CAIM2113', title: 'Intro to Management Information System', cr: 3, type: 'ELECTIVE', sem: 7 },

  // Semester 8 (Spring — currently active SP26) — core + electives
  { code: 'CSSE4193', title: 'Project II',                        cr: 3, type: 'CORE',    sem: 8, prereq: 'CSSE4183' },
  { code: 'CSCP4063', title: 'Mobile Application Development',    cr: 3, type: 'ELECTIVE', sem: 8, prereq: 'CSCP2023' },
  { code: 'CSCS2543', title: 'Parallel and Distributed Computing',cr: 3, type: 'ELECTIVE', sem: 8, prereq: 'CSCS3553' },
  { code: 'CSGE4963', title: 'Professional Practices',            cr: 3, type: 'GENERAL', sem: 8 },
  { code: 'CAMG2913', title: 'Technology Entrepreneurship',       cr: 3, type: 'GENERAL', sem: 8 },
];

// Section configuration per batch (matching UCP-style numbering)
// Batch FA22 = 6th BSCS batch  → sections 6A, 6B   (currently sem 8 in SP26)
// Batch FA23 = 7th BSCS batch  → sections 7A, 7B, 7C (currently sem 6)
// Batch FA24 = 8th BSCS batch  → sections 8A, 8B   (currently sem 4)
// Batch FA25 = 9th BSCS batch  → sections 9A, 9B, 9C (currently sem 2)
const BATCH_CONFIG = [
  { batch: 'FA22', label: '6', sections: ['A', 'B'],      currentSem: 8, year: 2022, studentsPerSection: 25 },
  { batch: 'FA23', label: '7', sections: ['A', 'B', 'C'], currentSem: 6, year: 2023, studentsPerSection: 25 },
  { batch: 'FA24', label: '8', sections: ['A', 'B'],      currentSem: 4, year: 2024, studentsPerSection: 25 },
  { batch: 'FA25', label: '9', sections: ['A', 'B', 'C'], currentSem: 2, year: 2025, studentsPerSection: 25 },
];

async function safeCreateMany(model, data, label) {
  if (data.length === 0) return 0;
  try {
    const r = await prisma[model].createMany({ data, skipDuplicates: true });
    console.log(`     +${r.count} ${label}`);
    return r.count;
  } catch (err) {
    console.warn(`     ⚠ ${model}.createMany failed:`, err.message);
    return 0;
  }
}

async function main() {
  console.log('\n🌱  Seeding UCP-style BSCS data…\n');
  const hash = await bcrypt.hash(PASS, 10);

  // ── 1. DEPARTMENT (single: Computer Science) ───────────────────
  console.log('1/12 Department (CS)…');
  const cs = await prisma.department.upsert({
    where: { code: 'CS' },
    update: {},
    create: { code: 'CS', name: 'Computer Science', description: 'Faculty of Computer Science offering BSCS — 8 semester program with core + elective tracks.' },
  });

  // ── 2. ADMINS (5 role-based; super admin via separate script) ──
  console.log('2/12 Admins (5)…');
  const adminDefs = [
    { username: 'registrar.head', name: 'Mr. Tariq Rauf',    empId: 'ADM-001', designation: 'Chief Registrar',     permissions: ['manage_users', 'manage_admissions', 'view_reports'] },
    { username: 'academic.head',  name: 'Dr. Adnan Hussain', empId: 'ADM-002', designation: 'Academic Head',       permissions: ['manage_academic', 'manage_offerings', 'view_reports'] },
    { username: 'comms.head',     name: 'Ms. Nadia Khan',    empId: 'ADM-003', designation: 'Communications Head', permissions: ['manage_announcements', 'view_reports'] },
    { username: 'audit.officer',  name: 'Mr. Yasir Mahmood', empId: 'ADM-004', designation: 'Audit Officer',       permissions: ['view_audit_logs', 'view_reports'] },
    { username: 'admissions.head',name: 'Ms. Saima Iqbal',   empId: 'ADM-005', designation: 'Admissions Head',     permissions: ['manage_admissions', 'manage_users', 'view_reports'] },
  ];

  for (const a of adminDefs) {
    const user = await prisma.user.upsert({
      where: { username: a.username },
      update: {},
      create: {
        username: a.username,
        email: `${a.username}@ucp.campusone.edu.pk`,
        name: a.name, password: hash, role: 'admin', isFirstLogin: false,
      },
    });
    await prisma.admin.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id, employeeId: a.empId, designation: a.designation,
        isSuperAdmin: false, permissions: a.permissions, departmentId: cs.id,
      },
    });
  }

  // ── 3. TEACHERS (10) ───────────────────────────────────────────
  console.log('3/12 Teachers (10)…');
  const teacherDefs = [
    { username: 'asad.khan',       name: 'Dr. Asad Khan',       designation: 'Professor',           hod: true },
    { username: 'sara.malik',      name: 'Dr. Sara Malik',      designation: 'Associate Professor' },
    { username: 'usman.raza',      name: 'Mr. Usman Raza',      designation: 'Assistant Professor' },
    { username: 'hira.baig',       name: 'Ms. Hira Baig',       designation: 'Lecturer' },
    { username: 'imran.ahmed',     name: 'Dr. Imran Ahmed',     designation: 'Professor' },
    { username: 'bilal.siddiqui',  name: 'Mr. Bilal Siddiqui',  designation: 'Lecturer' },
    { username: 'farah.noor',      name: 'Dr. Farah Noor',      designation: 'Associate Professor' },
    { username: 'kamran.tariq',    name: 'Mr. Kamran Tariq',    designation: 'Assistant Professor' },
    { username: 'rabia.hashmi',    name: 'Ms. Rabia Hashmi',    designation: 'Lecturer' },
    { username: 'hassan.aslam',    name: 'Dr. Hassan Aslam',    designation: 'Associate Professor' },
  ];
  const T = {};
  for (let i = 0; i < teacherDefs.length; i++) {
    const t = teacherDefs[i];
    const user = await prisma.user.upsert({
      where: { username: t.username },
      update: {},
      create: {
        username: t.username, email: `${t.username}@ucp.campusone.edu.pk`,
        name: t.name, password: hash, role: 'teacher', isFirstLogin: false,
      },
    });
    T[t.username] = await prisma.teacher.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id, employeeId: `EMP-${String(i + 1).padStart(3, '0')}`,
        designation: t.designation, departmentId: cs.id,
        qualification: t.designation.includes('Professor') ? 'PhD' : 'MS',
        officeRoom: `CS-${200 + i}`, officeHours: 'Mon-Wed 14:00-16:00',
      },
    });
  }
  // HOD = first teacher
  await prisma.department.update({ where: { id: cs.id }, data: { hodTeacherId: T['asad.khan'].id } });

  // ── 4. PROGRAM (single: BSCS) ──────────────────────────────────
  console.log('4/12 Program (BSCS)…');
  const totalCredits = CURRICULUM.reduce((s, c) => s + c.cr, 0);
  const BSCS = await prisma.program.upsert({
    where: { programCode: 'BSCS' },
    update: {},
    create: {
      programCode: 'BSCS', name: 'BS Computer Science', type: 'BACHELOR',
      totalSemesters: 8, totalCredits, departmentId: cs.id,
    },
  });

  // ── 5. COURSES + PREREQUISITES ─────────────────────────────────
  console.log(`5/12 Courses (${CURRICULUM.length})…`);
  const C = {};
  for (const c of CURRICULUM) {
    C[c.code] = await prisma.course.upsert({
      where: { code: c.code },
      update: {},
      create: { code: c.code, title: c.title, creditHours: c.cr, departmentId: cs.id },
    });
  }
  // Connect prerequisites
  for (const c of CURRICULUM) {
    if (c.prereq && C[c.prereq]) {
      await prisma.course.update({
        where: { id: C[c.code].id },
        data: { prerequisites: { connect: { id: C[c.prereq].id } } },
      }).catch(() => {});
    }
  }

  // ── 6. CURRICULUM (BSCS-2022 version) ──────────────────────────
  console.log('6/12 Curriculum mappings…');
  const curr = await prisma.curriculum.upsert({
    where: { programId_version: { programId: BSCS.id, version: '2022' } },
    update: {},
    create: { programId: BSCS.id, version: '2022', effectiveFromYear: 2022, totalCredits, isActive: true },
  });
  for (const c of CURRICULUM) {
    await prisma.curriculumCourse.upsert({
      where: { curriculumId_courseId: { curriculumId: curr.id, courseId: C[c.code].id } },
      update: {},
      create: {
        curriculumId: curr.id, courseId: C[c.code].id, semesterSlot: c.sem,
        type: c.type === 'LAB' ? 'LAB' : c.type, isElective: c.type === 'ELECTIVE',
      },
    });
  }

  // ── 7. TERMS ───────────────────────────────────────────────────
  console.log('7/12 Terms (9 — FA22 → SP26)…');
  const termDefs = [
    { code: 'FA22', season: 'FALL',   ay: '2022-2023', start: '2022-09-05', end: '2023-01-20', active: false },
    { code: 'SP23', season: 'SPRING', ay: '2022-2023', start: '2023-02-06', end: '2023-06-23', active: false },
    { code: 'FA23', season: 'FALL',   ay: '2023-2024', start: '2023-09-04', end: '2024-01-19', active: false },
    { code: 'SP24', season: 'SPRING', ay: '2023-2024', start: '2024-02-05', end: '2024-06-21', active: false },
    { code: 'FA24', season: 'FALL',   ay: '2024-2025', start: '2024-09-02', end: '2025-01-17', active: false },
    { code: 'SP25', season: 'SPRING', ay: '2024-2025', start: '2025-02-03', end: '2025-06-20', active: false },
    { code: 'SU25', season: 'SUMMER', ay: '2024-2025', start: '2025-07-01', end: '2025-08-22', active: false },
    { code: 'FA25', season: 'FALL',   ay: '2025-2026', start: '2025-09-01', end: '2026-01-16', active: false },
    { code: 'SP26', season: 'SPRING', ay: '2025-2026', start: '2026-02-02', end: '2026-06-19',
      regOpen: '2026-01-19', regClose: '2026-02-09', active: true },
  ];
  const TM = {};
  for (const t of termDefs) {
    TM[t.code] = await prisma.term.upsert({
      where: { code: t.code },
      update: {},
      create: {
        code: t.code, season: t.season, academicYear: t.ay,
        startDate: new Date(t.start), endDate: new Date(t.end),
        registrationOpenAt: t.regOpen ? new Date(t.regOpen) : null,
        registrationCloseAt: t.regClose ? new Date(t.regClose) : null,
        isActive: t.active,
      },
    });
  }

  // ── 8. STUDENTS ────────────────────────────────────────────────
  console.log('8/12 Students…');
  // Map: students[batch][section] = [studentRecord, ...]
  const students = {};
  let studentCounter = 0;
  for (const b of BATCH_CONFIG) {
    students[b.batch] = {};
    for (const sec of b.sections) {
      students[b.batch][sec] = [];
      for (let i = 1; i <= b.studentsPerSection; i++) {
        studentCounter++;
        const fn = FIRST_NAMES[(studentCounter * 7) % FIRST_NAMES.length];
        const ln = LAST_NAMES[(studentCounter * 11) % LAST_NAMES.length];
        const username = `${fn.toLowerCase()}.${ln.toLowerCase()}.${b.label}${sec.toLowerCase()}${String(i).padStart(2, '0')}`;
        // Registration number format: F{section_first_letter}F{batch_year_yy}UBSCS{nnn}
        const studentId = `F${sec[0]}F${b.batch.slice(2)}UBSCS${String(studentCounter).padStart(3, '0')}`;

        const user = await prisma.user.upsert({
          where: { username },
          update: {},
          create: {
            username, email: `${username}@std.ucp.edu.pk`,
            name: `${fn} ${ln}`, password: hash, role: 'student', isFirstLogin: false,
          },
        });
        const stu = await prisma.student.upsert({
          where: { userId: user.id },
          update: {},
          create: {
            userId: user.id, studentId, enrollmentYear: b.year,
            batch: b.batch, currentSemester: b.currentSem,
            programId: BSCS.id, curriculumId: curr.id, departmentId: cs.id,
            phone: `+9230${randInt(0, 9)}${randInt(1000000, 9999999)}`,
            dateOfBirth: new Date(`${b.year - 18}-${String(randInt(1, 12)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`),
          },
        });
        students[b.batch][sec].push(stu);
      }
    }
  }
  console.log(`     ${studentCounter} students across ${BATCH_CONFIG.reduce((s, b) => s + b.sections.length, 0)} sections`);

  // ── 9. COURSE OFFERINGS ────────────────────────────────────────
  console.log('9/12 Offerings — historical + current SP26…');
  // For each completed term, create offerings for the courses each batch took that semester.
  // Map: which (batch, term) → which semester slot
  // batch FA22 took: FA22→sem1, SP23→sem2, FA23→sem3, SP24→sem4, FA24→sem5, SP25→sem6, FA25→sem7, SP26→sem8
  // batch FA23 took: FA23→sem1, SP24→sem2, FA24→sem3, SP25→sem4, FA25→sem5, SP26→sem6
  // batch FA24 took: FA24→sem1, SP25→sem2, FA25→sem3, SP26→sem4
  // batch FA25 took: FA25→sem1, SP26→sem2

  const termSequence = ['FA22', 'SP23', 'FA23', 'SP24', 'FA24', 'SP25', 'FA25', 'SP26'];
  const batchTermSemester = (batch) => {
    const startIdx = termSequence.indexOf(batch);
    if (startIdx === -1) return {};
    const map = {};
    for (let i = startIdx; i < termSequence.length; i++) {
      map[termSequence[i]] = i - startIdx + 1;
    }
    return map;
  };

  const offerings = {}; // key: `${batch}-${section}-${termCode}-${courseCode}`
  let teacherCursor = 0;
  const teacherKeys = Object.keys(T);

  const makeOffering = async (courseCode, termCode, section) => {
    const teacher = T[teacherKeys[teacherCursor++ % teacherKeys.length]];

    return prisma.courseOffering.upsert({
      where: { courseId_termId_section: { courseId: C[courseCode].id, termId: TM[termCode].id, section } },
      update: {},
      create: {
        courseId: C[courseCode].id, termId: TM[termCode].id, teacherId: teacher.id,
        section, capacity: 35,
      },
    });
  };

  // Create offerings for every (batch, section, term, course in that semester)
  for (const b of BATCH_CONFIG) {
    const semMap = batchTermSemester(b.batch);
    for (const [termCode, sem] of Object.entries(semMap)) {
      const coursesThisSem = CURRICULUM.filter((c) => c.sem === sem);
      for (const sec of b.sections) {
        const sectionCode = `${b.label}${sec}`;
        for (const c of coursesThisSem) {
          const off = await makeOffering(c.code, termCode, sectionCode);
          offerings[`${b.batch}-${sectionCode}-${termCode}-${c.code}`] = off;
        }
      }
    }
  }
  console.log(`     ${Object.keys(offerings).length} offerings created`);

  // ── Summer retake offerings (SU25) — for students who failed in earlier terms ──
  // We'll create a small set (e.g. CSCP1013 retake, CSCP2023 retake, CSAL1213 retake)
  console.log('     Summer retake offerings…');
  const retakeCourses = ['CSCP1013', 'CSCP2023', 'CSAL1213', 'CSSS1713'];
  for (const code of retakeCourses) {
    const off = await makeOffering(code, 'SU25', 'RT'); // RT = retake section
    offerings[`RETAKE-${code}-SU25`] = off;
  }

  // ── 10. ENROLLMENTS — completed semesters get grades, current SP26 = ENROLLED ──
  console.log('10/12 Enrollments…');

  const gradeForScore = (score) => {
    if (score >= 90) return 'A_PLUS';
    if (score >= 85) return 'A';
    if (score >= 80) return 'A_MINUS';
    if (score >= 75) return 'B_PLUS';
    if (score >= 70) return 'B';
    if (score >= 65) return 'B_MINUS';
    if (score >= 60) return 'C_PLUS';
    if (score >= 55) return 'C';
    if (score >= 50) return 'C_MINUS';
    if (score >= 45) return 'D_PLUS';
    if (score >= 40) return 'D';
    return 'F';
  };

  const enrollData = [];
  const failedEnrollments = []; // students who failed sometthing → eligible for SU25 retake
  for (const b of BATCH_CONFIG) {
    const semMap = batchTermSemester(b.batch);
    for (const [termCode, sem] of Object.entries(semMap)) {
      // Skip future or current term — only enroll completed terms with grades, plus current as ENROLLED
      const term = termDefs.find((t) => t.code === termCode);
      const isCurrent = term.active;
      const coursesThisSem = CURRICULUM.filter((c) => c.sem === sem);

      for (const sec of b.sections) {
        const sectionCode = `${b.label}${sec}`;
        const sectionStudents = students[b.batch][sec];
        // Top ~30% of senior batches (FA22, FA23, FA24) are flagged "high achievers"
        // → guarantees them A/A+ grades and CGPA ≥ 3.5 (TA-eligible pool).
        const highAchieverCutoff = ['FA22', 'FA23', 'FA24'].includes(b.batch)
          ? Math.ceil(sectionStudents.length * 0.30)
          : 0;
        sectionStudents.forEach((stu, idx) => {
          const isHighAchiever = idx < highAchieverCutoff;
          for (const c of coursesThisSem) {
            const off = offerings[`${b.batch}-${sectionCode}-${termCode}-${c.code}`];
            if (!off) continue;

            if (isCurrent) {
              enrollData.push({ studentId: stu.id, offeringId: off.id, status: 'ENROLLED' });
            } else {
              let assign, mid, final, score, failed = false;
              if (isHighAchiever) {
                // Mostly A/A+ scores (85-100), occasional A- (80-84)
                assign = randInt(25, 30);
                mid    = randInt(25, 30);
                final  = randInt(33, 40);
                score  = Math.min(100, assign + mid + final);
              } else {
                assign = randInt(15, 30);
                mid    = randInt(15, 30);
                final  = randInt(15, 40);
                const total = assign + mid + final;
                failed = rand() < 0.05;
                score = failed ? randInt(20, 39) : total;
              }
              const letter = gradeForScore(score);
              enrollData.push({
                studentId: stu.id, offeringId: off.id,
                status: 'COMPLETED',
                assignmentMarks: assign, midMarks: mid, finalMarks: final, totalMarks: score,
                gradeLetter: letter, gradePoints: GRADE_POINTS[letter],
                completedAt: new Date(term.end),
              });
              if (failed && retakeCourses.includes(c.code)) {
                failedEnrollments.push({ studentId: stu.id, courseCode: c.code });
              }
            }
          }
        });
      }
    }
  }
  await safeCreateMany('enrollment', enrollData, 'enrollments');

  // SU25 retake enrollments for those who failed retake-eligible courses
  console.log('     SU25 retake enrollments…');
  const retakeData = [];
  for (const f of failedEnrollments.slice(0, 20)) {
    const off = offerings[`RETAKE-${f.courseCode}-SU25`];
    if (!off) continue;
    const score = randInt(60, 85);
    const letter = gradeForScore(score);
    retakeData.push({
      studentId: f.studentId, offeringId: off.id,
      status: 'COMPLETED',
      assignmentMarks: 25, midMarks: 25, finalMarks: score - 50, totalMarks: score,
      gradeLetter: letter, gradePoints: GRADE_POINTS[letter],
      completedAt: new Date('2025-08-22'),
    });
  }
  await safeCreateMany('enrollment', retakeData, 'retake enrollments');

  // ── 11. SEMESTER INCHARGES ─────────────────────────────────────
  console.log('11/12 Semester incharges…');
  const inchargeData = [];
  let icCursor = 0;
  for (const b of BATCH_CONFIG) {
    for (let sem = 1; sem <= 8; sem++) {
      if (sem > b.currentSem) continue;
      inchargeData.push({
        teacherId: T[teacherKeys[icCursor++ % teacherKeys.length]].id,
        programId: BSCS.id, batch: b.batch, academicYear: '2025-2026',
        semesterNumber: sem, status: sem === b.currentSem ? 'active' : 'relieved',
      });
    }
  }
  await safeCreateMany('semesterIncharge', inchargeData, 'semester incharges');

  // ── 12. ASSIGNMENTS / ATTENDANCE / ANNOUNCEMENTS / Q&A / NOTIFICATIONS ──
  console.log('12/12 Assignments + Attendance + Announcements + Q&A + Notifications…');

  // Active SP26 offerings only
  const sp26Offerings = Object.values(offerings).filter((o) => o.termId === TM['SP26'].id);

  // Assignments: 2 per offering, capped at 60
  const assignmentData = [];
  for (const off of sp26Offerings.slice(0, 30)) {
    for (let i = 1; i <= 2; i++) {
      assignmentData.push({
        offeringId: off.id,
        title: `Assignment ${i}`,
        description: 'Submit your solution by the due date. Late submissions incur a 10% per day penalty.',
        totalMarks: pick([20, 25, 30, 50]),
        dueDate: daysAgo(randInt(-15, 15)),
        allowLate: true,
        status: 'PUBLISHED',
      });
    }
  }
  await safeCreateMany('assignment', assignmentData, 'assignments');

  // Submissions
  const allAssignments = await prisma.assignment.findMany({ select: { id: true, offeringId: true, totalMarks: true, dueDate: true } });
  const submissionData = [];
  for (const a of allAssignments) {
    const enrolled = await prisma.enrollment.findMany({
      where: { offeringId: a.offeringId, status: 'ENROLLED' },
      select: { studentId: true },
      take: 8,
    });
    for (const e of enrolled) {
      const submittedAt = new Date(a.dueDate.getTime() - randInt(-86400000, 86400000));
      const isLate = submittedAt > a.dueDate;
      const obtained = randInt(Math.floor(a.totalMarks * 0.5), a.totalMarks);
      submissionData.push({
        assignmentId: a.id, studentId: e.studentId,
        submissionText: 'Submission text goes here.',
        isLate,
        obtainedMarks: rand() > 0.4 ? obtained : null,
        feedback: rand() > 0.4 ? pick(['Good work', 'Needs improvement', 'Excellent']) : null,
        gradedAt: rand() > 0.4 ? daysAgo(randInt(0, 5)) : null,
        status: isLate ? 'LATE' : (rand() > 0.4 ? 'GRADED' : 'SUBMITTED'),
        submittedAt,
      });
    }
  }
  await safeCreateMany('submission', submissionData, 'submissions');

  // Attendance — 5 sessions × first 10 students per offering for first 15 SP26 offerings
  const attendanceData = [];
  for (const off of sp26Offerings.slice(0, 15)) {
    const enrolled = await prisma.enrollment.findMany({
      where: { offeringId: off.id, status: 'ENROLLED' },
      select: { studentId: true },
    });
    for (let session = 0; session < 5; session++) {
      const date = daysAgo(session * 7).toISOString().slice(0, 10);
      for (const e of enrolled.slice(0, 10)) {
        const r = rand();
        const status = r > 0.85 ? 'ABSENT' : (r > 0.75 ? 'LATE' : 'PRESENT');
        attendanceData.push({
          offeringId: off.id, studentId: e.studentId, date, status,
          markedBy: off.teacherId,
        });
      }
    }
  }
  await safeCreateMany('attendance', attendanceData, 'attendance entries');

  // Lectures — 3 past lectures per first 20 SP26 offerings (so MyCourses has data to render)
  const lectureTitles = [
    'Course Introduction & Syllabus Walkthrough',
    'Foundational Concepts & Definitions',
    'Core Principles — Worked Examples',
    'Hands-on Demo & Discussion',
    'Case Study Review',
    'Problem-Solving Session',
    'Mid-term Preparation Recap',
    'Advanced Topics — Part I',
  ];
  const lectureData = [];
  for (let oi = 0; oi < Math.min(20, sp26Offerings.length); oi++) {
    const off = sp26Offerings[oi];
    const teacher = await prisma.teacher.findUnique({ where: { id: off.teacherId }, select: { userId: true } });
    if (!teacher) continue;
    for (let i = 0; i < 3; i++) {
      lectureData.push({
        offeringId: off.id,
        date: new Date(daysAgo((3 - i) * 7).toISOString().slice(0, 10)),
        title: lectureTitles[(oi + i) % lectureTitles.length],
        description: 'Auto-seeded lecture entry. Replace with real content once teacher uploads materials.',
        createdBy: teacher.userId,
      });
    }
  }
  await safeCreateMany('lecture', lectureData, 'lectures');

  // Announcements
  const adminUsers = await prisma.user.findMany({ where: { role: 'admin' }, select: { id: true } });
  const announcementTitles = [
    'Spring 2026 Mid-Term Exam Schedule',
    'Library Hours Extended for Final Year Project Students',
    'BSCS Final Year Project Showcase 2026',
    'Career Fair Next Friday — Tech Companies Visiting',
    'Course Registration for Fall 2026 Opens Soon',
    'Tuition Fee Deadline Reminder: 28 Feb 2026',
    'Spring 2026 Convocation Details',
    'Faculty Office Hours Updated',
    'CS Department Industry Visit Program',
    'Research Symposium Call for Papers',
    'Campus Wi-Fi Maintenance Window',
    'Code Sprint 2026: Programming Competition',
    'Final Exam Seating Plan Released',
    'Eid Holiday Schedule',
    'Scholarship Applications Open for Fall 2026',
    'Workshop on Public Speaking',
    'Spring Sports Day Registration',
    'Alumni Meet 2026',
    'Student Council Elections',
    'New Cafeteria Menu Available',
    'BSCS Curriculum Review Meeting',
    'Mock Interview Sessions for Final Year',
    'CS-Lab Equipment Maintenance Update',
    'Course Withdrawal Last Date: 15 March 2026',
    'Spring Break Schedule',
    'Annual Magazine Submissions Open',
    'Programming Contest: CodeUCP 2026',
    'Workshop: Resume Writing for CS Students',
    'CS Department Open House',
    'Internship Opportunities Notice',
  ];
  const announcementData = announcementTitles.map((title, i) => ({
    title,
    content: `${title}. Detailed information will follow via email and the campus portal.`,
    priority: i % 5 === 0 ? 'high' : (i % 3 === 0 ? 'medium' : 'low'),
    targetAudience: pick(['all', 'students', 'teachers']),
    createdBy: adminUsers[i % adminUsers.length].id,
    createdAt: daysAgo(randInt(0, 60)),
  }));
  await safeCreateMany('announcement', announcementData, 'announcements');

  // Q&A — 1 thread per first 25 SP26 offerings
  const qnaData = [];
  const qnaTitles = [
    ['Doubt in Lab Assignment 3', 'I am stuck on the Dijkstra implementation.'],
    ['Mid-term syllabus clarification', 'Will Chapter 7 be included in the upcoming mid-term?'],
    ['Group project formation', 'How should we form groups?'],
    ['Late submission policy', 'What is the penalty for submitting one day late?'],
    ['Office hours timing', 'Are office hours available on Friday afternoons?'],
    ['Lecture slides availability', 'Will today\'s slides be uploaded to the LMS?'],
    ['Make-up class request', 'Will there be a make-up for last Wednesday\'s class?'],
    ['Final exam format', 'Open-book or closed-book?'],
    ['Marks dispute', 'I think there\'s a marking error in my Assignment 1.'],
    ['Reference book recommendation', 'Any extra references beyond the prescribed text?'],
    ['Quiz reschedule', 'Can the quiz on Friday be moved to Monday?'],
    ['Concept clarification', 'Could you explain tail recursion vs head recursion?'],
    ['Database normalization', 'Why is 3NF preferred over BCNF in practice?'],
    ['OS scheduling', 'When does Round Robin perform worse than SJF?'],
    ['Software design patterns', 'Difference between Strategy and State pattern?'],
    ['Algorithm complexity', 'How is QuickSort O(n log n) on average?'],
    ['Project topic approval', 'Could you confirm AI-based recommender is acceptable?'],
    ['Internship credits', 'Does the summer internship count toward credit hours?'],
    ['Course withdrawal deadline', 'When is the last date to withdraw?'],
    ['FYP mentor', 'Who is the assigned mentor for our group?'],
    ['Plagiarism policy', 'What is the threshold on Turnitin?'],
    ['Recording lecture request', 'Can today\'s lecture be recorded?'],
    ['Lab equipment issue', 'CS-Lab-2 PCs are very slow.'],
    ['Repeating a course', 'I failed CSCP2033; what is the procedure?'],
    ['Networking concept', 'Real-world UDP example?'],
  ];
  for (let i = 0; i < Math.min(25, sp26Offerings.length); i++) {
    const off = sp26Offerings[i];
    const enrolled = await prisma.enrollment.findMany({
      where: { offeringId: off.id, status: 'ENROLLED' },
      select: { studentId: true }, take: 1,
    });
    if (enrolled.length === 0) continue;
    const stu = await prisma.student.findUnique({ where: { id: enrolled[0].studentId }, select: { userId: true } });
    const [title, body] = qnaTitles[i % qnaTitles.length];
    qnaData.push({
      offeringId: off.id, askedById: stu.userId, title, body,
      status: rand() > 0.5 ? 'RESOLVED' : 'OPEN',
      createdAt: daysAgo(randInt(0, 30)),
    });
  }
  await safeCreateMany('qnaThread', qnaData, 'Q&A threads');

  // Q&A replies (one teacher reply per thread)
  const allThreads = await prisma.qnaThread.findMany({ include: { offering: { select: { teacherId: true } } } });
  const replyData = [];
  for (const th of allThreads) {
    const teacher = await prisma.teacher.findUnique({ where: { id: th.offering.teacherId }, select: { userId: true } });
    if (rand() > 0.3) {
      replyData.push({
        threadId: th.id, authorId: teacher.userId,
        body: pick([
          'Good question. Refer to slide 15 from last week.',
          'I will cover this in tomorrow\'s class.',
          'Yes, that is acceptable. Document your assumptions.',
          'See office hours for a detailed walkthrough.',
        ]),
        createdAt: new Date(th.createdAt.getTime() + randInt(1, 48) * 60 * 60 * 1000),
      });
    }
  }
  await safeCreateMany('qnaReply', replyData, 'Q&A replies');

  // ── TA ASSIGNMENTS ─────────────────────────────────────────────
  // Pick eligible students (CGPA >= 3.5, completed a course with A/A+, semester gap >= 2)
  // and assign them to currently-active SP26 offerings of those courses.
  console.log('  ⏳ Building TA assignments…');
  const taAssignmentData = [];
  const taApprovedSeen = new Set(); // studentId|offeringId for de-dupe across batches

  // Compute CGPA per student from existing graded enrollments
  const studentsForTA = await prisma.student.findMany({
    select: {
      id: true, userId: true, currentSemester: true,
      enrollments: {
        where: { gradePoints: { not: null } },
        select: {
          gradeLetter: true, gradePoints: true,
          offering: { select: { courseId: true, course: { select: { code: true } } } },
        },
      },
    },
  });

  const ccRows = await prisma.curriculumCourse.findMany({ select: { courseId: true, semesterSlot: true } });
  const slotByCourseId = {};
  for (const c of ccRows) slotByCourseId[c.courseId] = c.semesterSlot;

  // Active term offerings keyed by courseId (one section list)
  const sp26ByCourse = {};
  for (const off of sp26Offerings) {
    if (!sp26ByCourse[off.courseId]) sp26ByCourse[off.courseId] = [];
    sp26ByCourse[off.courseId].push(off);
  }

  // Distribution targets: ~6 active TAs (different students) + 3 pending + 1 rejected
  const candidates = [];
  for (const s of studentsForTA) {
    const completed = s.enrollments.filter((e) => e.gradePoints != null);
    if (completed.length === 0) continue;
    const totalCr = completed.length * 3; // approximation; credit hours not fetched here
    const totalPts = completed.reduce((x, e) => x + e.gradePoints, 0) * 3;
    const cgpa = totalCr ? totalPts / totalCr : 0;
    if (cgpa < 3.5) continue;

    const aPlusCourses = completed.filter((e) => e.gradeLetter === 'A_PLUS' || e.gradeLetter === 'A');
    if (aPlusCourses.length === 0) continue;

    // Find an offering of one of those courses where semester gap >= 2 and student has none yet
    for (const e of aPlusCourses) {
      const slot = slotByCourseId[e.offering.courseId];
      if (slot == null || s.currentSemester < slot + 2) continue;
      const offerings = sp26ByCourse[e.offering.courseId] || [];
      if (offerings.length === 0) continue;
      const off = offerings[0];
      const key = `${s.id}|${off.id}`;
      if (taApprovedSeen.has(key)) continue;
      candidates.push({ student: s, offering: off, slot, courseCode: e.offering.course.code });
      break; // one candidate offering per student
    }
  }

  // Shuffle deterministically and split into APPROVED / PENDING / REJECTED buckets
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  const TA_PERMS_DEFAULT = ['VIEW_ROSTER', 'MARK_ATTENDANCE', 'ANSWER_QNA'];
  const TA_PERMS_FULL = ['VIEW_ROSTER', 'MARK_ATTENDANCE', 'ANSWER_QNA', 'GRADE_ASSIGNMENTS', 'GRADE_QUIZZES'];
  const teacherUserIdByOffering = {};
  for (const off of sp26Offerings) {
    const t = await prisma.teacher.findUnique({ where: { id: off.teacherId }, select: { userId: true } });
    if (t) teacherUserIdByOffering[off.id] = t.userId;
  }

  console.log(`     ${candidates.length} TA-eligible students found`);
  const approvedTargets = candidates.slice(0, Math.min(10, Math.floor(candidates.length * 0.5)));
  const pendingTargets  = candidates.slice(approvedTargets.length, approvedTargets.length + 5);
  const rejectedTargets = candidates.slice(approvedTargets.length + pendingTargets.length, approvedTargets.length + pendingTargets.length + 2);

  for (const c of approvedTargets) {
    taAssignmentData.push({
      studentId: c.student.id,
      offeringId: c.offering.id,
      status: 'APPROVED',
      permissions: rand() > 0.5 ? TA_PERMS_FULL : TA_PERMS_DEFAULT,
      appliedSemester: c.student.currentSemester,
      targetSemesterMin: 1,
      targetSemesterMax: c.slot,
      reason: `I scored well in ${c.courseCode} and want to help juniors strengthen their fundamentals.`,
      reviewedBy: teacherUserIdByOffering[c.offering.id],
      reviewNotes: 'Approved — strong record in this subject.',
      reviewedAt: daysAgo(randInt(2, 30)),
      appliedAt: daysAgo(randInt(30, 60)),
      startedAt: daysAgo(randInt(2, 30)),
    });
    taApprovedSeen.add(`${c.student.id}|${c.offering.id}`);
  }
  for (const c of pendingTargets) {
    taAssignmentData.push({
      studentId: c.student.id,
      offeringId: c.offering.id,
      status: 'PENDING',
      permissions: ['VIEW_ROSTER'],
      appliedSemester: c.student.currentSemester,
      targetSemesterMin: 1,
      targetSemesterMax: c.slot,
      reason: `Looking forward to TA ${c.courseCode} — I really enjoyed this course.`,
      appliedAt: daysAgo(randInt(1, 14)),
    });
  }
  for (const c of rejectedTargets) {
    taAssignmentData.push({
      studentId: c.student.id,
      offeringId: c.offering.id,
      status: 'REJECTED',
      permissions: ['VIEW_ROSTER'],
      appliedSemester: c.student.currentSemester,
      targetSemesterMin: 1,
      targetSemesterMax: c.slot,
      reason: `Want to help with ${c.courseCode}.`,
      reviewedBy: teacherUserIdByOffering[c.offering.id],
      reviewNotes: 'TA quota for this section already filled.',
      reviewedAt: daysAgo(randInt(1, 10)),
      appliedAt: daysAgo(randInt(15, 30)),
    });
  }

  await safeCreateMany('tAAssignment', taAssignmentData, 'TA assignments');

  // Notifications — sample 3-5 per first 60 students/teachers
  const allUsers = await prisma.user.findMany({ select: { id: true }, take: 80 });
  const notificationData = [];
  for (const u of allUsers) {
    for (let i = 0; i < randInt(2, 5); i++) {
      notificationData.push({
        userId: u.id,
        type: pick(['ANNOUNCEMENT', 'ASSIGNMENT_NEW', 'ASSIGNMENT_GRADED', 'QNA_REPLY', 'GENERAL']),
        title: pick(['New announcement', 'Assignment posted', 'Assignment graded', 'Reply on your question']),
        body: 'Tap to view details.',
        isRead: rand() > 0.5,
        readAt: rand() > 0.5 ? hoursAgo(randInt(1, 100)) : null,
        createdAt: hoursAgo(randInt(0, 240)),
      });
    }
  }
  await safeCreateMany('notification', notificationData, 'notifications');

  // ── SCHEDULE: config + rooms + holidays + ClassSessions ────────
  console.log('  ⏳ Schedule config + rooms + holidays…');

  await prisma.scheduleConfig.upsert({
    where: { id: 'default' },
    update: {},
    create: { id: 'default' },
  });

  const ROOMS = [
    // Commerce Block ground (110-119)
    { code: 'R110', type: 'LECTURE', building: 'Commerce Block', floor: 0, capacity: 40 },
    { code: 'R111', type: 'LECTURE', building: 'Commerce Block', floor: 0, capacity: 40 },
    { code: 'R112', type: 'LECTURE', building: 'Commerce Block', floor: 0, capacity: 40 },
    { code: 'R113', type: 'SEMINAR', building: 'Commerce Block', floor: 0, capacity: 60, name: 'Seminar Hall A' },
    // Commerce Block 1st floor (120-129)
    { code: 'R120', type: 'LECTURE', building: 'Commerce Block', floor: 1, capacity: 40 },
    { code: 'R121', type: 'LECTURE', building: 'Commerce Block', floor: 1, capacity: 40 },
    { code: 'R125', type: 'LECTURE', building: 'Commerce Block', floor: 1, capacity: 50 },
    { code: 'R126', type: 'LECTURE', building: 'Commerce Block', floor: 1, capacity: 40 },
    // Commerce Block 2nd floor (130-139)
    { code: 'R130', type: 'LECTURE', building: 'Commerce Block', floor: 2, capacity: 40 },
    { code: 'R131', type: 'LECTURE', building: 'Commerce Block', floor: 2, capacity: 40 },
    // Science Block ground (10-19)
    { code: 'R10', type: 'LECTURE', building: 'Science Block', floor: 0, capacity: 40 },
    { code: 'R11', type: 'LAB', building: 'Science Block', floor: 0, capacity: 30, name: 'Programming Lab' },
    { code: 'R12', type: 'LAB', building: 'Science Block', floor: 0, capacity: 30, name: 'Networking Lab' },
    // Science Block 1st (20-29)
    { code: 'R20', type: 'LECTURE', building: 'Science Block', floor: 1, capacity: 40 },
    { code: 'R21', type: 'LAB', building: 'Science Block', floor: 1, capacity: 30, name: 'Database Lab' },
    // Science Block 2nd (30-39)
    { code: 'R30', type: 'LECTURE', building: 'Science Block', floor: 2, capacity: 40 },
    { code: 'R31', type: 'LAB', building: 'Science Block', floor: 2, capacity: 30, name: 'Mobile Dev Lab' },
  ];
  for (const r of ROOMS) {
    await prisma.room.upsert({ where: { code: r.code }, update: {}, create: r });
  }
  console.log(`     ✓ ${ROOMS.length} rooms`);

  const HOLIDAYS = [
    { date: '2026-03-23', name: 'Pakistan Day', isRecurring: true },
    { date: '2026-05-01', name: 'Labour Day', isRecurring: true },
    { date: '2026-08-14', name: 'Independence Day', isRecurring: true },
  ];
  for (const h of HOLIDAYS) {
    try {
      await prisma.holiday.create({
        data: { date: new Date(h.date), name: h.name, isRecurring: h.isRecurring },
      });
    } catch (e) { if (e.code !== 'P2002') throw e; }
  }
  console.log(`     ✓ ${HOLIDAYS.length} holidays`);

  // Tag courses with sessionType (LAB if title contains "lab", PROJECT for FYP/thesis)
  const allCourses = await prisma.course.findMany();
  let labCount = 0, projectCount = 0;
  for (const c of allCourses) {
    const t = c.title.toLowerCase();
    let sessionType = 'LECTURE';
    if (t.includes('lab')) { sessionType = 'LAB'; labCount++; }
    else if (t.includes('final year project') || t.includes('fyp') || t.includes('thesis')) { sessionType = 'PROJECT'; projectCount++; }
    await prisma.course.update({ where: { id: c.id }, data: { sessionType } });
  }
  console.log(`     ✓ Tagged courses: ${labCount} LAB, ${projectCount} PROJECT, rest LECTURE`);

  // Apply default grade-component template to every course based on its sessionType.
  console.log('  ⏳ Applying grade templates…');
  const { TEMPLATES } = await import('../utils/gradeTemplates.js');
  const taggedCourses = await prisma.course.findMany({ select: { id: true, sessionType: true } });
  let templatedCount = 0;
  for (const c of taggedCourses) {
    const tmpl = TEMPLATES[c.sessionType] || TEMPLATES.LECTURE;
    for (const row of tmpl) {
      await prisma.courseGradeComponent.upsert({
        where: { courseId_kind: { courseId: c.id, kind: row.kind } },
        update: {},
        create: { courseId: c.id, ...row },
      });
    }
    templatedCount++;
  }
  console.log(`     ✓ Applied templates to ${templatedCount} courses`);

  // Generate per-component MarkComponent rows for every enrollment.
  //   - COMPLETED enrollments → all components graded (synthetic obtainedMarks driven by enrollment.totalMarks if present)
  //   - ENROLLED (active term) → some components graded so the running grade has data; rest stay null
  console.log('  ⏳ Generating MarkComponent rows for enrollments…');
  const allEnrollments = await prisma.enrollment.findMany({
    select: {
      id: true, status: true, totalMarks: true,
      offering: { select: { course: { select: { id: true, sessionType: true } } } },
    },
  });
  const componentsByCourse = {};
  const allCgc = await prisma.courseGradeComponent.findMany();
  for (const c of allCgc) {
    if (!componentsByCourse[c.courseId]) componentsByCourse[c.courseId] = [];
    componentsByCourse[c.courseId].push(c);
  }

  const mcRows = [];
  for (const enr of allEnrollments) {
    const courseId = enr.offering.course.id;
    const components = componentsByCourse[courseId] || [];
    if (components.length === 0) continue;

    // Determine per-component obtainedMarks based on enrollment.status + totalMarks
    const pctTarget = enr.status === 'COMPLETED' && enr.totalMarks != null
      ? Math.max(0.4, Math.min(1, enr.totalMarks / 100))     // map raw score to 0..1
      : null;

    for (const cmp of components) {
      for (let i = 1; i <= cmp.count; i++) {
        let obtained = null;
        if (enr.status === 'COMPLETED' && pctTarget != null) {
          // Add small random jitter ±5% per component
          const jitter = (rand() - 0.5) * 0.10;
          const pct = Math.max(0, Math.min(1, pctTarget + jitter));
          obtained = +(pct * cmp.totalPerInstance).toFixed(1);
        } else if (enr.status === 'ENROLLED') {
          // Half the lecture components have a grade so running-grade preview is populated; rest pending
          if (rand() < 0.5 && (cmp.kind === 'ASSIGNMENT' || cmp.kind === 'QUIZ' || cmp.kind === 'PARTICIPATION')) {
            obtained = +(((rand() * 0.4) + 0.5) * cmp.totalPerInstance).toFixed(1); // 50%–90%
          }
        }
        mcRows.push({
          enrollmentId: enr.id,
          kind: cmp.kind,
          index: i,
          totalMarks: cmp.totalPerInstance,
          obtainedMarks: obtained,
        });
      }
    }
  }
  // createMany in chunks of 1000 to avoid statement size limits
  let mcInserted = 0;
  for (let i = 0; i < mcRows.length; i += 1000) {
    const chunk = mcRows.slice(i, i + 1000);
    const r = await prisma.markComponent.createMany({ data: chunk, skipDuplicates: true });
    mcInserted += r.count;
  }
  console.log(`     ✓ Generated ${mcInserted} MarkComponent rows`);

  // Generate ClassSessions for the active term (SP26) — 2 sessions per non-PROJECT offering
  console.log('  ⏳ Generating timetable for active term…');
  const sp26 = await prisma.term.findFirst({ where: { isActive: true } });
  if (!sp26) {
    console.log('     ⚠  no active term, skipping ClassSession generation');
  } else {
    const allRooms = await prisma.room.findMany({ where: { isActive: true } });
    const lectureRooms = allRooms.filter((r) => r.type !== 'LAB');
    const labRooms     = allRooms.filter((r) => r.type === 'LAB');

    const config = await prisma.scheduleConfig.findUnique({ where: { id: 'default' } });
    const overrides = config.dayOverrides || {};
    const workingDays = config.workingDays || ['MON','TUE','WED','THU','FRI','SAT'];
    const slotsByDay = {};
    for (const d of workingDays) {
      const lec = overrides[d]?.lecturesPerDay ?? config.regularLecturesPerDay;
      slotsByDay[d] = Array.from({ length: lec }, (_, i) => i + 1);
    }

    // Group offerings by (course, term) so we can stagger sections to avoid overlap
    const sp26Offerings = await prisma.courseOffering.findMany({
      where: { termId: sp26.id },
      include: { course: { select: { id: true, code: true, sessionType: true } } },
    });

    // Constraint state
    const roomBusy     = {};   // `${day}-${slot}` → Set<roomId>
    const teacherBusy  = {};   // `${day}-${slot}` → Set<teacherId>
    const courseSlots  = {};   // courseId        → Set<`${day}-${slot}`>
    const teacherDay   = {};   // `${teacherId}-${day}` → count

    const cellKey = (d, s) => `${d}-${s}`;
    const isFree = (off, d, s, room) => {
      const k = cellKey(d, s);
      if ((roomBusy[k] || new Set()).has(room.id)) return false;
      if ((teacherBusy[k] || new Set()).has(off.teacherId)) return false;
      if ((courseSlots[off.course.id] || new Set()).has(k)) return false;
      if ((teacherDay[`${off.teacherId}-${d}`] || 0) >= config.maxTeacherLecturesPerDay) return false;
      return true;
    };
    const claim = (off, d, s, room) => {
      const k = cellKey(d, s);
      if (!roomBusy[k]) roomBusy[k] = new Set();
      if (!teacherBusy[k]) teacherBusy[k] = new Set();
      if (!courseSlots[off.course.id]) courseSlots[off.course.id] = new Set();
      roomBusy[k].add(room.id);
      teacherBusy[k].add(off.teacherId);
      courseSlots[off.course.id].add(k);
      teacherDay[`${off.teacherId}-${d}`] = (teacherDay[`${off.teacherId}-${d}`] || 0) + 1;
    };

    const sessionsToCreate = [];
    let scheduledCount = 0, skippedCount = 0;
    // Process LAB offerings first (fewer rooms = harder), then sort by section so A→B→C
    sp26Offerings.sort((a, b) => {
      if (a.course.sessionType !== b.course.sessionType) {
        if (a.course.sessionType === 'LAB') return -1;
        if (b.course.sessionType === 'LAB') return 1;
      }
      return a.section.localeCompare(b.section);
    });

    for (const off of sp26Offerings) {
      if (off.course.sessionType === 'PROJECT') continue;
      const pool = off.course.sessionType === 'LAB' ? labRooms : lectureRooms;
      const picked = [];

      for (const day of workingDays) {
        if (picked.length >= 2) break;
        if (picked.find((p) => p.dayOfWeek === day)) continue; // prefer different days
        for (const slot of slotsByDay[day]) {
          let chosen = null;
          for (const room of pool) {
            if (isFree(off, day, slot, room)) { chosen = room; break; }
          }
          if (chosen) {
            claim(off, day, slot, chosen);
            picked.push({ offeringId: off.id, dayOfWeek: day, slotIndex: slot, roomId: chosen.id });
            break;
          }
        }
      }
      // Fallback: allow same-day if 2 distinct days couldn't be found
      if (picked.length < 2) {
        for (const day of workingDays) {
          if (picked.length >= 2) break;
          for (const slot of slotsByDay[day]) {
            if (picked.find((p) => p.dayOfWeek === day && p.slotIndex === slot)) continue;
            let chosen = null;
            for (const room of pool) {
              if (isFree(off, day, slot, room)) { chosen = room; break; }
            }
            if (chosen) {
              claim(off, day, slot, chosen);
              picked.push({ offeringId: off.id, dayOfWeek: day, slotIndex: slot, roomId: chosen.id });
            }
          }
        }
      }

      if (picked.length === 2) {
        sessionsToCreate.push(...picked);
        scheduledCount++;
      } else {
        skippedCount++;
      }
    }

    if (sessionsToCreate.length > 0) {
      await prisma.classSession.createMany({ data: sessionsToCreate, skipDuplicates: true });
    }
    console.log(`     ✓ ${scheduledCount} offerings scheduled, ${skippedCount} could not fit`);
  }

  // ── DONE ──────────────────────────────────────────────────────
  console.log('\n✅  Seed complete!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Default password for every seeded user: Campus@123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Department:  CS (Computer Science) — single department');
  console.log('  Program:     BSCS — 8 semesters, ~' + totalCredits + ' credit hours');
  console.log('  Active term: SP26 (Spring 2025-2026)');
  console.log('');
  console.log('  ADMINS (5)');
  console.log('  ----------');
  console.log('  registrar.head    Chief Registrar  (manage_users, manage_admissions, view_reports)');
  console.log('  academic.head     Academic Head    (manage_academic, manage_offerings, view_reports)');
  console.log('  comms.head        Comms Head       (manage_announcements, view_reports)');
  console.log('  audit.officer     Audit Officer    (view_audit_logs, view_reports)');
  console.log('  admissions.head   Admissions Head  (manage_admissions, manage_users, view_reports)');
  console.log('  Plus: superadmin (created via createSuperAdmin.js, NOT in seed)');
  console.log('');
  console.log('  TEACHERS (10)');
  console.log('  -------------');
  console.log('  asad.khan (HOD), sara.malik, usman.raza, hira.baig, imran.ahmed,');
  console.log('  bilal.siddiqui, farah.noor, kamran.tariq, rabia.hashmi, hassan.aslam');
  console.log('');
  console.log('  STUDENTS — across 4 batches');
  console.log('  ----------------------------');
  for (const b of BATCH_CONFIG) {
    console.log(`  Batch ${b.batch} (currently sem ${b.currentSem}): sections ${b.sections.map((s) => b.label + s).join(', ')} (${b.studentsPerSection} students each)`);
  }
  console.log('');
  console.log('');
  console.log('  TA ASSIGNMENTS (sample)');
  console.log('  -----------------------');
  console.log('  ~6 APPROVED, ~3 PENDING, ~1 REJECTED across senior students');
  console.log('  Eligibility: CGPA ≥ 3.5 + A/A+ in the course + semester gap ≥ 2');
  console.log('');
  console.log('  TERMS: FA22 → SP23 → FA23 → SP24 → FA24 → SP25 → SU25 (retakes) → FA25 → SP26 (active)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch(console.error).finally(() => prisma.$disconnect());
