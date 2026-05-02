/**
 * Seed script — run with: node scripts/seed.js
 *
 * Populates the database with substantial sample data (30+ rows in every
 * meaningful table) so you can demo / develop / take screenshots without
 * wiring data by hand.
 *
 * Default password for every user: Campus@123
 *
 * Idempotent on cores (departments, programs, curricula, courses, terms,
 * users) via upsert. Bulk tables (enrollments, assignments, attendances,
 * announcements, audit logs, quizzes, qna, notifications) use createMany;
 * if you re-run after a fresh reset they'll insert cleanly. After data
 * already exists you'll get a unique-constraint warning per table and the
 * script continues — so re-running is safe but not perfectly additive.
 *
 * Recommended workflow: `npx prisma migrate reset` then `node scripts/seed.js`.
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

// Deterministic pseudo-random so re-runs produce the same data
let _rng = 1;
const rand = () => {
  _rng = (_rng * 9301 + 49297) % 233280;
  return _rng / 233280;
};
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const pickN = (arr, n) => {
  const out = [];
  const used = new Set();
  while (out.length < n && used.size < arr.length) {
    const i = Math.floor(rand() * arr.length);
    if (!used.has(i)) { used.add(i); out.push(arr[i]); }
  }
  return out;
};
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

const ANNOUNCEMENT_TITLES = [
  'Mid-Term Exam Schedule Released',
  'Library Hours Extended',
  'Spring Sports Day Registration',
  'Career Fair Next Friday',
  'Course Registration Opens',
  'Tuition Fee Deadline Reminder',
  'Convocation Ceremony Details',
  'New Online Learning Resources',
  'Hostel Allotment Update',
  'Faculty Development Week',
  'Industry Visit Program',
  'Research Symposium Call for Papers',
  'Campus Wi-Fi Maintenance',
  'Annual Tech Fest Announcement',
  'Final Exam Seating Plan',
  'Holiday Schedule Update',
  'Scholarship Applications Open',
  'Workshop on Public Speaking',
  'Health & Wellness Camp',
  'Alumni Meet 2025',
  'Student Council Elections',
  'New Cafeteria Menu',
  'Bus Route Change Notice',
  'Examination Hall Allocation',
  'Cultural Night Tickets Available',
  'Mock Interview Sessions',
  'Coding Competition: CodeCampus',
  'Photography Workshop Sign-up',
  'Library Book Returns',
  'Annual Magazine Submissions',
];

const QNA_QUESTIONS = [
  ['Doubt in Lab Assignment 3', 'I am stuck on the Dijkstra implementation. Could you clarify how to handle disconnected nodes?'],
  ['Mid-term syllabus clarification', 'Will Chapter 7 be included in the upcoming mid-term?'],
  ['Group project formation', 'How should we form groups — by lab section or any classmate?'],
  ['Late submission policy', 'What is the penalty for submitting one day late?'],
  ['Office hours timing', 'Are office hours available on Friday afternoons?'],
  ['Grading rubric for Quiz 2', 'Could you share the rubric for short answer questions?'],
  ['Lecture slides availability', 'Will today\'s slides be uploaded to the LMS?'],
  ['Make-up class request', 'Will there be a make-up for last Wednesday\'s missed class?'],
  ['Project topic approval', 'Could you confirm whether AI-based recommender system is acceptable?'],
  ['Final exam format', 'Is the final going to be open-book or closed-book?'],
  ['Marks dispute', 'I think there\'s a marking error in my Assignment 1; how should I report it?'],
  ['Reference book recommendation', 'Any extra reference books beyond the prescribed text?'],
  ['Quiz reschedule', 'Can the quiz on Friday be moved to Monday?'],
  ['Attendance correction', 'I was marked absent on the 12th but I attended; can it be corrected?'],
  ['Lab equipment issue', 'The PCs in CS-Lab-2 are very slow; is there a fix?'],
  ['Repeating a course', 'I failed CS-201; what is the procedure to repeat?'],
  ['Internship credits', 'Does the summer internship count toward the credit hours?'],
  ['Course withdrawal deadline', 'When is the last date to withdraw from a course?'],
  ['Research opportunity', 'Are there any undergraduate research positions open?'],
  ['Software installation help', 'Having trouble installing the lab software on Windows 11.'],
  ['Project demo schedule', 'When are the project demos for FYP-I scheduled?'],
  ['Final-year project mentor', 'Who is the assigned mentor for our group?'],
  ['Plagiarism policy', 'What is the threshold for plagiarism flags on Turnitin?'],
  ['Recording lecture request', 'Can today\'s lecture be recorded? I missed it due to illness.'],
  ['Concept clarification — recursion', 'Struggling with tail recursion vs head recursion.'],
  ['Database normalization', 'Why is 3NF preferred over BCNF in practice?'],
  ['OS scheduling algorithms', 'When does Round Robin perform worse than SJF?'],
  ['Networking — TCP vs UDP', 'Real-world example where UDP is preferred?'],
  ['Software design patterns', 'Difference between Strategy and State pattern?'],
  ['Algorithm complexity', 'How is the complexity of QuickSort O(n log n) on average?'],
];

async function safeCreateMany(model, data, where = 'records') {
  if (data.length === 0) return 0;
  try {
    const r = await prisma[model].createMany({ data, skipDuplicates: true });
    console.log(`     +${r.count} ${where}`);
    return r.count;
  } catch (err) {
    console.warn(`     ⚠ ${model}.createMany failed:`, err.message);
    return 0;
  }
}

async function main() {
  console.log('\n🌱  Starting seed (large dataset)…\n');
  const hash = await bcrypt.hash(PASS, 10);

  // ── 1. DEPARTMENTS ──────────────────────────────────────────────
  console.log('1/15 Departments (30)…');
  const deptDefs = [
    { code: 'CS',   name: 'Computer Science' },
    { code: 'EE',   name: 'Electrical Engineering' },
    { code: 'BBA',  name: 'Business Administration' },
    { code: 'ME',   name: 'Mechanical Engineering' },
    { code: 'CE',   name: 'Civil Engineering' },
    { code: 'CHE',  name: 'Chemical Engineering' },
    { code: 'MATH', name: 'Mathematics' },
    { code: 'PHY',  name: 'Physics' },
    { code: 'CHEM', name: 'Chemistry' },
    { code: 'BIO',  name: 'Biology' },
    { code: 'ENG',  name: 'English & Literature' },
    { code: 'PSY',  name: 'Psychology' },
    { code: 'ECO',  name: 'Economics' },
    { code: 'POL',  name: 'Political Science' },
    { code: 'SOC',  name: 'Sociology' },
    { code: 'HIS',  name: 'History' },
    { code: 'ART',  name: 'Fine Arts' },
    { code: 'MUS',  name: 'Music' },
    { code: 'JOUR', name: 'Journalism' },
    { code: 'LAW',  name: 'Law' },
    { code: 'PHARM',name: 'Pharmacy' },
    { code: 'NUR',  name: 'Nursing' },
    { code: 'ARCH', name: 'Architecture' },
    { code: 'ENV',  name: 'Environmental Science' },
    { code: 'GEO',  name: 'Geography' },
    { code: 'EDU',  name: 'Education' },
    { code: 'PHIL', name: 'Philosophy' },
    { code: 'ANTH', name: 'Anthropology' },
    { code: 'STAT', name: 'Statistics' },
    { code: 'IS',   name: 'Information Systems' },
  ];
  const D = {};
  for (const d of deptDefs) {
    D[d.code] = await prisma.department.upsert({
      where: { code: d.code },
      update: {},
      create: { code: d.code, name: d.name, description: `${d.name} department offering undergraduate and graduate programs.` },
    });
  }

  // ── 2. ADMINS ────────────────────────────────────────────────────
  console.log('2/15 Admins (30)…');
  const adminDefs = [
    { username: 'superadmin',     name: 'System Administrator', empId: 'ADM-000', designation: 'Super Administrator', isSuper: true,  permissions: [] },
    { username: 'registrar.main', name: 'Mr. Tariq Rauf',        empId: 'ADM-001', designation: 'Chief Registrar',    isSuper: false, permissions: ['manage_users', 'manage_admissions', 'view_reports'] },
    { username: 'registrar.asst', name: 'Ms. Saima Iqbal',       empId: 'ADM-002', designation: 'Asst Registrar',     isSuper: false, permissions: ['manage_users', 'manage_admissions', 'view_reports'] },
    { username: 'academic.head',  name: 'Dr. Adnan Hussain',     empId: 'ADM-003', designation: 'Academic Head',      isSuper: false, permissions: ['manage_academic', 'manage_offerings', 'view_reports'] },
    { username: 'academic.asst',  name: 'Mr. Faisal Bhatti',     empId: 'ADM-004', designation: 'Academic Officer',   isSuper: false, permissions: ['manage_academic', 'manage_offerings', 'view_reports'] },
    { username: 'comms.head',     name: 'Ms. Nadia Khan',        empId: 'ADM-005', designation: 'Communications Head',isSuper: false, permissions: ['manage_announcements', 'view_reports'] },
    { username: 'audit.officer',  name: 'Mr. Yasir Mahmood',     empId: 'ADM-006', designation: 'Audit Officer',      isSuper: false, permissions: ['view_audit_logs', 'view_reports'] },
  ];
  // Pad to 30
  for (let i = 7; i <= 29; i++) {
    const fn = pick(FIRST_NAMES);
    const ln = pick(LAST_NAMES);
    adminDefs.push({
      username: `admin${String(i).padStart(2, '0')}`,
      name: `${fn} ${ln}`,
      empId: `ADM-${String(i).padStart(3, '0')}`,
      designation: 'Administrator',
      isSuper: false,
      permissions: pickN(['manage_users', 'manage_admissions', 'manage_academic', 'manage_offerings', 'manage_announcements', 'view_audit_logs', 'view_reports'], randInt(1, 3)),
    });
  }

  for (const a of adminDefs) {
    const user = await prisma.user.upsert({
      where: { username: a.username },
      update: {},
      create: {
        username: a.username,
        email: `${a.username}@campusone.edu.pk`,
        name: a.name,
        password: hash,
        role: 'admin',
        isFirstLogin: false,
      },
    });
    await prisma.admin.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        employeeId: a.empId,
        designation: a.designation,
        isSuperAdmin: a.isSuper,
        permissions: a.permissions,
      },
    });
  }

  // ── 3. TEACHERS ─────────────────────────────────────────────────
  console.log('3/15 Teachers (35)…');
  const T = {};
  const teacherUsernames = [];
  const deptCodes = Object.keys(D);
  for (let i = 1; i <= 35; i++) {
    const fn = FIRST_NAMES[(i * 3) % FIRST_NAMES.length];
    const ln = LAST_NAMES[(i * 7) % LAST_NAMES.length];
    const username = `${fn.toLowerCase()}.${ln.toLowerCase()}${i}`;
    teacherUsernames.push(username);
    const deptCode = deptCodes[i % deptCodes.length];
    const designation = TEACHER_DESIGNATIONS[i % TEACHER_DESIGNATIONS.length];
    const user = await prisma.user.upsert({
      where: { username },
      update: {},
      create: {
        username,
        email: `${username}@campusone.edu.pk`,
        name: `${designation.includes('Professor') ? 'Dr.' : (i % 2 === 0 ? 'Mr.' : 'Ms.')} ${fn} ${ln}`,
        password: hash,
        role: 'teacher',
        isFirstLogin: false,
      },
    });
    T[username] = await prisma.teacher.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        employeeId: `EMP-${String(i).padStart(3, '0')}`,
        designation,
        departmentId: D[deptCode].id,
        qualification: ['PhD', 'MS', 'MPhil'][i % 3],
        specialization: pickN(['AI', 'ML', 'NLP', 'Data Science', 'Networks', 'Security', 'OS', 'DB', 'Algorithms', 'HCI'], 2),
        officeRoom: `Room-${100 + i}`,
        officeHours: 'Mon-Wed 14:00-16:00',
      },
    });
  }

  // Set HODs (one per dept, first matching teacher)
  const teachersByDept = {};
  for (const username of teacherUsernames) {
    const t = await prisma.teacher.findUnique({ where: { id: T[username].id } });
    if (!teachersByDept[t.departmentId]) teachersByDept[t.departmentId] = T[username];
  }
  for (const [deptId, teacher] of Object.entries(teachersByDept)) {
    await prisma.department.update({ where: { id: deptId }, data: { hodTeacherId: teacher.id } }).catch(() => {});
  }

  // ── 4. PROGRAMS ─────────────────────────────────────────────────
  console.log('4/15 Programs (32)…');
  const programDefs = [
    { code: 'BSCS', name: 'BS Computer Science',          type: 'BACHELOR', sems: 8, creds: 130, dept: 'CS' },
    { code: 'MSCS', name: 'MS Computer Science',          type: 'MASTER',   sems: 4, creds: 60,  dept: 'CS' },
    { code: 'PHDCS',name: 'PhD Computer Science',         type: 'PHD',      sems: 6, creds: 36,  dept: 'CS' },
    { code: 'BSSE', name: 'BS Software Engineering',      type: 'BACHELOR', sems: 8, creds: 130, dept: 'CS' },
    { code: 'BSDS', name: 'BS Data Science',              type: 'BACHELOR', sems: 8, creds: 130, dept: 'IS' },
    { code: 'BSAI', name: 'BS Artificial Intelligence',   type: 'BACHELOR', sems: 8, creds: 130, dept: 'CS' },
    { code: 'BSEE', name: 'BS Electrical Engineering',    type: 'BACHELOR', sems: 8, creds: 132, dept: 'EE' },
    { code: 'MSEE', name: 'MS Electrical Engineering',    type: 'MASTER',   sems: 4, creds: 60,  dept: 'EE' },
    { code: 'BSME', name: 'BS Mechanical Engineering',    type: 'BACHELOR', sems: 8, creds: 132, dept: 'ME' },
    { code: 'BSCE', name: 'BS Civil Engineering',         type: 'BACHELOR', sems: 8, creds: 132, dept: 'CE' },
    { code: 'BSCHE',name: 'BS Chemical Engineering',      type: 'BACHELOR', sems: 8, creds: 132, dept: 'CHE' },
    { code: 'BBA',  name: 'Bachelor of Business Admin',   type: 'BACHELOR', sems: 8, creds: 124, dept: 'BBA' },
    { code: 'MBA',  name: 'Master of Business Admin',     type: 'MASTER',   sems: 4, creds: 66,  dept: 'BBA' },
    { code: 'BSMATH',name:'BS Mathematics',               type: 'BACHELOR', sems: 8, creds: 130, dept: 'MATH' },
    { code: 'BSPHY',name: 'BS Physics',                   type: 'BACHELOR', sems: 8, creds: 130, dept: 'PHY' },
    { code: 'BSCHEM',name:'BS Chemistry',                 type: 'BACHELOR', sems: 8, creds: 130, dept: 'CHEM' },
    { code: 'BSBIO',name: 'BS Biology',                   type: 'BACHELOR', sems: 8, creds: 130, dept: 'BIO' },
    { code: 'BSENG',name: 'BS English Literature',        type: 'BACHELOR', sems: 8, creds: 124, dept: 'ENG' },
    { code: 'BSPSY',name: 'BS Psychology',                type: 'BACHELOR', sems: 8, creds: 130, dept: 'PSY' },
    { code: 'BSECO',name: 'BS Economics',                 type: 'BACHELOR', sems: 8, creds: 130, dept: 'ECO' },
    { code: 'BSPOL',name: 'BS Political Science',         type: 'BACHELOR', sems: 8, creds: 124, dept: 'POL' },
    { code: 'BSSOC',name: 'BS Sociology',                 type: 'BACHELOR', sems: 8, creds: 124, dept: 'SOC' },
    { code: 'BSHIS',name: 'BS History',                   type: 'BACHELOR', sems: 8, creds: 124, dept: 'HIS' },
    { code: 'BSART',name: 'BS Fine Arts',                 type: 'BACHELOR', sems: 8, creds: 124, dept: 'ART' },
    { code: 'BSJOUR',name:'BS Journalism',                type: 'BACHELOR', sems: 8, creds: 124, dept: 'JOUR' },
    { code: 'LLB',  name: 'Bachelor of Law',              type: 'BACHELOR', sems: 10,creds: 160, dept: 'LAW' },
    { code: 'PHARM',name: 'Pharm-D',                      type: 'BACHELOR', sems: 10,creds: 165, dept: 'PHARM' },
    { code: 'BSNUR',name: 'BS Nursing',                   type: 'BACHELOR', sems: 8, creds: 130, dept: 'NUR' },
    { code: 'BARCH',name: 'Bachelor of Architecture',     type: 'BACHELOR', sems: 10,creds: 160, dept: 'ARCH' },
    { code: 'BSENV',name: 'BS Environmental Science',     type: 'BACHELOR', sems: 8, creds: 130, dept: 'ENV' },
    { code: 'BSEDU',name: 'BS Education',                 type: 'BACHELOR', sems: 8, creds: 124, dept: 'EDU' },
    { code: 'BSSTAT',name:'BS Statistics',                type: 'BACHELOR', sems: 8, creds: 130, dept: 'STAT' },
  ];
  const P = {};
  for (const p of programDefs) {
    P[p.code] = await prisma.program.upsert({
      where: { programCode: p.code },
      update: {},
      create: {
        programCode: p.code, name: p.name, type: p.type,
        totalSemesters: p.sems, totalCredits: p.creds,
        departmentId: D[p.dept].id,
      },
    });
  }

  // ── 5. COURSES ──────────────────────────────────────────────────
  console.log('5/15 Courses (80)…');
  const courseDefs = [
    // CS / SE / DS / AI courses (24)
    { code: 'CS-101', title: 'Introduction to Computing',       cr: 3, dept: 'CS' },
    { code: 'CS-102', title: 'Object Oriented Programming',     cr: 3, dept: 'CS' },
    { code: 'CS-103', title: 'Data Structures & Algorithms',    cr: 3, dept: 'CS' },
    { code: 'CS-201', title: 'Database Systems',                cr: 3, dept: 'CS' },
    { code: 'CS-202', title: 'Computer Networks',               cr: 3, dept: 'CS' },
    { code: 'CS-203', title: 'Operating Systems',               cr: 3, dept: 'CS' },
    { code: 'CS-204', title: 'Theory of Computation',           cr: 3, dept: 'CS' },
    { code: 'CS-301', title: 'Software Engineering',            cr: 3, dept: 'CS' },
    { code: 'CS-302', title: 'Artificial Intelligence',         cr: 3, dept: 'CS' },
    { code: 'CS-303', title: 'Computer Graphics',               cr: 3, dept: 'CS' },
    { code: 'CS-304', title: 'Compiler Construction',           cr: 3, dept: 'CS' },
    { code: 'CS-305', title: 'Web Engineering',                 cr: 3, dept: 'CS' },
    { code: 'CS-306', title: 'Mobile App Development',          cr: 3, dept: 'CS' },
    { code: 'CS-401', title: 'Final Year Project I',            cr: 3, dept: 'CS' },
    { code: 'CS-402', title: 'Final Year Project II',           cr: 6, dept: 'CS' },
    { code: 'AI-301', title: 'Machine Learning',                cr: 3, dept: 'CS' },
    { code: 'AI-302', title: 'Deep Learning',                   cr: 3, dept: 'CS' },
    { code: 'AI-303', title: 'Natural Language Processing',     cr: 3, dept: 'CS' },
    { code: 'DS-301', title: 'Data Mining',                     cr: 3, dept: 'IS' },
    { code: 'DS-302', title: 'Big Data Analytics',              cr: 3, dept: 'IS' },
    { code: 'SE-301', title: 'Software Testing',                cr: 3, dept: 'CS' },
    { code: 'SE-302', title: 'Software Architecture',           cr: 3, dept: 'CS' },
    { code: 'SEC-301',title: 'Information Security',            cr: 3, dept: 'CS' },
    { code: 'SEC-302',title: 'Cryptography',                    cr: 3, dept: 'CS' },
    // EE courses (10)
    { code: 'EE-101', title: 'Circuit Analysis',                cr: 3, dept: 'EE' },
    { code: 'EE-102', title: 'Digital Logic Design',            cr: 3, dept: 'EE' },
    { code: 'EE-201', title: 'Electronics I',                   cr: 3, dept: 'EE' },
    { code: 'EE-202', title: 'Signals & Systems',               cr: 3, dept: 'EE' },
    { code: 'EE-203', title: 'Electromagnetics',                cr: 3, dept: 'EE' },
    { code: 'EE-301', title: 'Power Systems',                   cr: 3, dept: 'EE' },
    { code: 'EE-302', title: 'Control Systems',                 cr: 3, dept: 'EE' },
    { code: 'EE-303', title: 'Communication Systems',           cr: 3, dept: 'EE' },
    { code: 'EE-304', title: 'Microprocessors',                 cr: 3, dept: 'EE' },
    { code: 'EE-305', title: 'Digital Signal Processing',       cr: 3, dept: 'EE' },
    // ME courses (5)
    { code: 'ME-101', title: 'Engineering Mechanics',           cr: 3, dept: 'ME' },
    { code: 'ME-201', title: 'Thermodynamics',                  cr: 3, dept: 'ME' },
    { code: 'ME-202', title: 'Fluid Mechanics',                 cr: 3, dept: 'ME' },
    { code: 'ME-301', title: 'Heat Transfer',                   cr: 3, dept: 'ME' },
    { code: 'ME-302', title: 'Manufacturing Processes',         cr: 3, dept: 'ME' },
    // CE courses (5)
    { code: 'CE-101', title: 'Surveying',                       cr: 3, dept: 'CE' },
    { code: 'CE-201', title: 'Structural Analysis',             cr: 3, dept: 'CE' },
    { code: 'CE-202', title: 'Geotechnical Engineering',        cr: 3, dept: 'CE' },
    { code: 'CE-301', title: 'Transportation Engineering',      cr: 3, dept: 'CE' },
    { code: 'CE-302', title: 'Hydraulics',                      cr: 3, dept: 'CE' },
    // BBA courses (8)
    { code: 'BBA-101', title: 'Principles of Management',       cr: 3, dept: 'BBA' },
    { code: 'BBA-102', title: 'Financial Accounting',           cr: 3, dept: 'BBA' },
    { code: 'BBA-201', title: 'Marketing Management',           cr: 3, dept: 'BBA' },
    { code: 'BBA-202', title: 'Business Finance',               cr: 3, dept: 'BBA' },
    { code: 'BBA-301', title: 'Operations Management',          cr: 3, dept: 'BBA' },
    { code: 'BBA-302', title: 'Strategic Management',           cr: 3, dept: 'BBA' },
    { code: 'BBA-303', title: 'Human Resource Management',      cr: 3, dept: 'BBA' },
    { code: 'BBA-304', title: 'Organizational Behavior',        cr: 3, dept: 'BBA' },
    // Math/Phy/Chem/Bio (10)
    { code: 'MTH-101', title: 'Calculus & Analytical Geometry', cr: 3, dept: 'MATH' },
    { code: 'MTH-102', title: 'Linear Algebra',                 cr: 3, dept: 'MATH' },
    { code: 'MTH-201', title: 'Differential Equations',         cr: 3, dept: 'MATH' },
    { code: 'MTH-202', title: 'Probability & Statistics',       cr: 3, dept: 'MATH' },
    { code: 'MTH-203', title: 'Discrete Mathematics',           cr: 3, dept: 'MATH' },
    { code: 'PHY-101', title: 'Applied Physics',                cr: 3, dept: 'PHY' },
    { code: 'PHY-201', title: 'Quantum Mechanics',              cr: 3, dept: 'PHY' },
    { code: 'CHEM-101',title: 'General Chemistry',              cr: 3, dept: 'CHEM' },
    { code: 'BIO-101', title: 'Cell Biology',                   cr: 3, dept: 'BIO' },
    { code: 'STAT-201',title: 'Statistical Inference',          cr: 3, dept: 'STAT' },
    // General education (8)
    { code: 'ENG-101', title: 'English Communication Skills',   cr: 2, dept: 'ENG' },
    { code: 'ENG-201', title: 'Technical Writing',              cr: 2, dept: 'ENG' },
    { code: 'ISL-101', title: 'Islamic Studies',                cr: 2, dept: 'ENG' },
    { code: 'PAK-101', title: 'Pakistan Studies',               cr: 2, dept: 'HIS' },
    { code: 'PSY-101', title: 'Introduction to Psychology',     cr: 3, dept: 'PSY' },
    { code: 'ECO-101', title: 'Microeconomics',                 cr: 3, dept: 'ECO' },
    { code: 'ECO-201', title: 'Macroeconomics',                 cr: 3, dept: 'ECO' },
    { code: 'SOC-101', title: 'Sociology Basics',               cr: 3, dept: 'SOC' },
    // Misc (10)
    { code: 'LAW-101', title: 'Introduction to Law',            cr: 3, dept: 'LAW' },
    { code: 'PHARM-101',title:'Pharmaceutics I',                cr: 3, dept: 'PHARM' },
    { code: 'NUR-101', title: 'Fundamentals of Nursing',        cr: 3, dept: 'NUR' },
    { code: 'ARCH-101',title: 'Architectural Drawing',          cr: 3, dept: 'ARCH' },
    { code: 'ENV-101', title: 'Environmental Studies',          cr: 3, dept: 'ENV' },
    { code: 'EDU-101', title: 'Educational Psychology',         cr: 3, dept: 'EDU' },
    { code: 'JOUR-101',title: 'Mass Communication',             cr: 3, dept: 'JOUR' },
    { code: 'PHIL-101',title: 'Critical Thinking',              cr: 3, dept: 'PHIL' },
    { code: 'ART-101', title: 'Drawing Fundamentals',           cr: 3, dept: 'ART' },
    { code: 'MUS-101', title: 'Music Theory',                   cr: 3, dept: 'MUS' },
  ];

  const C = {};
  for (const c of courseDefs) {
    C[c.code] = await prisma.course.upsert({
      where: { code: c.code },
      update: {},
      create: { code: c.code, title: c.title, creditHours: c.cr, departmentId: D[c.dept].id },
    });
  }

  // Prerequisites (sample)
  const prereqs = [
    ['CS-102', 'CS-101'], ['CS-103', 'CS-102'], ['CS-201', 'CS-101'], ['CS-202', 'CS-101'],
    ['CS-203', 'CS-103'], ['CS-204', 'CS-103'], ['CS-301', 'CS-202'], ['CS-302', 'CS-103'],
    ['CS-303', 'CS-103'], ['CS-401', 'CS-301'], ['CS-402', 'CS-401'],
    ['EE-102', 'EE-101'], ['EE-201', 'EE-101'], ['EE-202', 'MTH-101'], ['EE-301', 'EE-201'],
    ['MTH-102', 'MTH-101'], ['AI-301', 'CS-103'], ['AI-302', 'AI-301'], ['DS-301', 'CS-103'],
  ];
  for (const [course, prereq] of prereqs) {
    await prisma.course.update({
      where: { id: C[course].id },
      data: { prerequisites: { connect: { id: C[prereq].id } } },
    }).catch(() => {});
  }

  // ── 6. CURRICULA ────────────────────────────────────────────────
  console.log('6/15 Curricula (32)…');
  const Curr = {};
  for (const p of programDefs) {
    Curr[p.code] = await prisma.curriculum.upsert({
      where: { programId_version: { programId: P[p.code].id, version: '2022' } },
      update: {},
      create: { programId: P[p.code].id, version: '2022', effectiveFromYear: 2022, totalCredits: p.creds, isActive: true },
    });
  }

  // CurriculumCourse mappings — substantive for BSCS, light for others
  console.log('     Curriculum-Course mappings…');
  const bscsMap = [
    { code: 'CS-101',  sem: 1, type: 'CORE' }, { code: 'MTH-101', sem: 1, type: 'CORE' },
    { code: 'ENG-101', sem: 1, type: 'GENERAL' }, { code: 'ISL-101', sem: 1, type: 'GENERAL' },
    { code: 'CS-102',  sem: 2, type: 'CORE' }, { code: 'MTH-102', sem: 2, type: 'CORE' },
    { code: 'PAK-101', sem: 2, type: 'GENERAL' }, { code: 'PHY-101', sem: 2, type: 'CORE' },
    { code: 'CS-103',  sem: 3, type: 'CORE' }, { code: 'CS-201',  sem: 3, type: 'CORE' },
    { code: 'MTH-203', sem: 3, type: 'CORE' },
    { code: 'CS-202',  sem: 4, type: 'CORE' }, { code: 'CS-203',  sem: 4, type: 'CORE' },
    { code: 'CS-204',  sem: 4, type: 'CORE' }, { code: 'MTH-202', sem: 4, type: 'CORE' },
    { code: 'CS-301',  sem: 5, type: 'CORE' }, { code: 'CS-302',  sem: 5, type: 'CORE' },
    { code: 'CS-303',  sem: 5, type: 'ELECTIVE', isElective: true },
    { code: 'CS-304',  sem: 6, type: 'CORE' }, { code: 'CS-305',  sem: 6, type: 'CORE' },
    { code: 'CS-306',  sem: 6, type: 'ELECTIVE', isElective: true },
    { code: 'AI-301',  sem: 7, type: 'ELECTIVE', isElective: true },
    { code: 'CS-401',  sem: 7, type: 'CORE' },
    { code: 'CS-402',  sem: 8, type: 'CORE' },
  ];
  for (const m of bscsMap) {
    await prisma.curriculumCourse.upsert({
      where: { curriculumId_courseId: { curriculumId: Curr['BSCS'].id, courseId: C[m.code].id } },
      update: {},
      create: { curriculumId: Curr['BSCS'].id, courseId: C[m.code].id, semesterSlot: m.sem, type: m.type, isElective: m.isElective ?? false },
    });
  }
  // Lighter mapping for other key programs (≥2 each)
  const otherCurricula = [
    ['BSEE',  ['EE-101', 'EE-102', 'EE-201', 'EE-202', 'EE-301', 'MTH-101', 'PHY-101']],
    ['BSME',  ['ME-101', 'ME-201', 'ME-202', 'ME-301', 'MTH-101', 'PHY-101']],
    ['BBA',   ['BBA-101', 'BBA-102', 'BBA-201', 'BBA-202', 'ECO-101', 'ENG-101']],
    ['BSSE',  ['CS-101', 'CS-102', 'CS-103', 'SE-301', 'SE-302', 'CS-301']],
    ['BSAI',  ['CS-101', 'CS-102', 'AI-301', 'AI-302', 'AI-303', 'MTH-202']],
    ['BSDS',  ['CS-103', 'DS-301', 'DS-302', 'MTH-202', 'STAT-201']],
  ];
  for (const [progCode, codes] of otherCurricula) {
    for (let i = 0; i < codes.length; i++) {
      await prisma.curriculumCourse.upsert({
        where: { curriculumId_courseId: { curriculumId: Curr[progCode].id, courseId: C[codes[i]].id } },
        update: {},
        create: { curriculumId: Curr[progCode].id, courseId: C[codes[i]].id, semesterSlot: Math.floor(i / 2) + 1, type: 'CORE', isElective: false },
      });
    }
  }

  // ── 7. TERMS ────────────────────────────────────────────────────
  console.log('7/15 Terms (8)…');
  const termDefs = [
    { code: 'FA22', season: 'FALL',   ay: '2022-2023', start: '2022-09-05', end: '2023-01-20', active: false },
    { code: 'SP23', season: 'SPRING', ay: '2022-2023', start: '2023-02-06', end: '2023-06-23', active: false },
    { code: 'FA23', season: 'FALL',   ay: '2023-2024', start: '2023-09-04', end: '2024-01-19', active: false },
    { code: 'SP24', season: 'SPRING', ay: '2023-2024', start: '2024-02-05', end: '2024-06-21', active: false },
    { code: 'FA24', season: 'FALL',   ay: '2024-2025', start: '2024-09-02', end: '2025-01-17', active: false },
    { code: 'SP25', season: 'SPRING', ay: '2024-2025', start: '2025-02-03', end: '2025-06-20', regOpen: '2025-01-20', regClose: '2025-02-10', active: true },
    { code: 'SU25', season: 'SUMMER', ay: '2024-2025', start: '2025-06-30', end: '2025-08-22', active: false },
    { code: 'FA25', season: 'FALL',   ay: '2025-2026', start: '2025-09-01', end: '2026-01-16', active: false },
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

  // ── 8. STUDENTS ─────────────────────────────────────────────────
  console.log('8/15 Students (120)…');
  const S = {};
  const studentUsernames = [];
  // Distribute across BSCS / BSEE / BBA mostly, batches FA22-FA24
  const batches = [
    { batch: 'FA22', year: 2022, sem: 6, count: 30, prog: 'BSCS' },
    { batch: 'FA23', year: 2023, sem: 4, count: 30, prog: 'BSCS' },
    { batch: 'FA24', year: 2024, sem: 2, count: 30, prog: 'BSCS' },
    { batch: 'FA23', year: 2023, sem: 4, count: 15, prog: 'BSEE' },
    { batch: 'FA24', year: 2024, sem: 2, count: 15, prog: 'BBA' },
  ];
  let sIdx = 0;
  for (const b of batches) {
    for (let i = 1; i <= b.count; i++) {
      sIdx++;
      const fn = FIRST_NAMES[(sIdx * 7) % FIRST_NAMES.length];
      const ln = LAST_NAMES[(sIdx * 11) % LAST_NAMES.length];
      const username = `${fn.toLowerCase()}.${ln.toLowerCase()}.std${sIdx}`;
      studentUsernames.push(username);
      const sid = `${b.prog}-${b.batch.slice(2)}-${String(i).padStart(3, '0')}`;
      const user = await prisma.user.upsert({
        where: { username },
        update: {},
        create: {
          username,
          email: `${username}@std.campusone.edu.pk`,
          name: `${fn} ${ln}`,
          password: hash,
          role: 'student',
          isFirstLogin: false,
        },
      });
      const progDef = programDefs.find(p => p.code === b.prog);
      S[username] = await prisma.student.upsert({
        where: { userId: user.id },
        update: {},
        create: {
          userId: user.id,
          studentId: sid,
          enrollmentYear: b.year,
          batch: b.batch,
          currentSemester: b.sem,
          programId: P[b.prog].id,
          curriculumId: Curr[b.prog].id,
          departmentId: D[progDef.dept].id,
          phone: `+9230${randInt(10, 99)}${randInt(1000000, 9999999)}`,
          dateOfBirth: new Date(`${b.year - 18}-${String(randInt(1, 12)).padStart(2, '0')}-${String(randInt(1, 28)).padStart(2, '0')}`),
        },
      });
    }
  }

  // ── 9. COURSE OFFERINGS + ENROLLMENTS ───────────────────────────
  console.log('9/15 Offerings (50) + Enrollments (300+)…');

  // Helper: pick a teacher round-robin from a department
  const teachersInDept = (deptId) =>
    Object.entries(T).filter(([k, v]) => v.departmentId === deptId).map(([k, v]) => v);

  // Build offerings for FA24 (completed) and SP25 (active)
  const offeringPlan = [
    // FA24 (completed term — students from FA22 sem 5, FA23 sem 3, FA24 sem 1)
    { course: 'CS-301', term: 'FA24', section: 'A', cap: 35 },
    { course: 'CS-302', term: 'FA24', section: 'A', cap: 35 },
    { course: 'CS-103', term: 'FA24', section: 'A', cap: 40 },
    { course: 'CS-201', term: 'FA24', section: 'A', cap: 40 },
    { course: 'CS-101', term: 'FA24', section: 'A', cap: 45 },
    { course: 'CS-101', term: 'FA24', section: 'B', cap: 45 },
    { course: 'MTH-101',term: 'FA24', section: 'A', cap: 50 },
    { course: 'EE-101', term: 'FA24', section: 'A', cap: 35 },
    { course: 'EE-201', term: 'FA24', section: 'A', cap: 30 },
    { course: 'BBA-101',term: 'FA24', section: 'A', cap: 40 },
    // SP25 (active term)
    { course: 'CS-102', term: 'SP25', section: 'A', cap: 40 },
    { course: 'CS-102', term: 'SP25', section: 'B', cap: 40 },
    { course: 'CS-202', term: 'SP25', section: 'A', cap: 40 },
    { course: 'CS-202', term: 'SP25', section: 'B', cap: 40 },
    { course: 'CS-203', term: 'SP25', section: 'A', cap: 40 },
    { course: 'CS-204', term: 'SP25', section: 'A', cap: 40 },
    { course: 'CS-303', term: 'SP25', section: 'A', cap: 30 },
    { course: 'CS-304', term: 'SP25', section: 'A', cap: 30 },
    { course: 'CS-401', term: 'SP25', section: 'A', cap: 30 },
    { course: 'AI-301', term: 'SP25', section: 'A', cap: 30 },
    { course: 'MTH-102',term: 'SP25', section: 'A', cap: 50 },
    { course: 'MTH-203',term: 'SP25', section: 'A', cap: 45 },
    { course: 'EE-102', term: 'SP25', section: 'A', cap: 35 },
    { course: 'EE-202', term: 'SP25', section: 'A', cap: 30 },
    { course: 'BBA-102',term: 'SP25', section: 'A', cap: 40 },
    { course: 'BBA-201',term: 'SP25', section: 'A', cap: 40 },
    { course: 'PHY-101',term: 'SP25', section: 'A', cap: 50 },
    { course: 'ENG-201',term: 'SP25', section: 'A', cap: 50 },
    // FA25 upcoming
    { course: 'CS-305', term: 'FA25', section: 'A', cap: 35 },
    { course: 'AI-302', term: 'FA25', section: 'A', cap: 30 },
  ];

  const O = {};
  let teacherCursor = 0;
  for (const op of offeringPlan) {
    const course = await prisma.course.findUnique({ where: { code: op.course } });
    const deptTeachers = teachersInDept(course.departmentId);
    const teacher = deptTeachers[teacherCursor % deptTeachers.length] || Object.values(T)[teacherCursor % Object.keys(T).length];
    teacherCursor++;
    const days = pickN(['MON', 'TUE', 'WED', 'THU', 'FRI'], 2);
    const start = `${randInt(8, 14)}:${pick(['00', '30'])}`;
    const end = `${parseInt(start.split(':')[0]) + 1}:${start.split(':')[1] === '00' ? '30' : '00'}`;
    const room = `${course.code.split('-')[0]}-${randInt(101, 410)}`;
    const offering = await prisma.courseOffering.upsert({
      where: { courseId_termId_section: { courseId: course.id, termId: TM[op.term].id, section: op.section } },
      update: {},
      create: {
        courseId: course.id, termId: TM[op.term].id, teacherId: teacher.id,
        section: op.section, capacity: op.cap,
        schedule: [
          { day: days[0], start, end, room },
          { day: days[1], start, end, room },
        ],
      },
    });
    O[`${op.course}_${op.term}_${op.section}`] = offering;
  }

  // ── ENROLLMENTS ───────────────────────────────────────────────
  // FA22 batch students → FA24 sem 5 courses (CS-301, CS-302) — completed with grades
  // FA23 batch students → FA24 sem 3 courses (CS-103, CS-201) — completed with grades
  // FA24 batch students → FA24 sem 1 (CS-101, MTH-101) — completed with grades
  // SP25 active enrollments

  const completedAt = new Date('2025-01-25');
  const allGrades = ['A_PLUS', 'A', 'A_MINUS', 'B_PLUS', 'B', 'B_MINUS', 'C_PLUS', 'C', 'C_MINUS', 'D_PLUS', 'D'];
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
    return 'D';
  };

  const fa22Students = studentUsernames.filter((u) => u.includes('std') && S[u].batch === 'FA22');
  const fa23StudentsBSCS = studentUsernames.filter((u) => S[u].batch === 'FA23' && S[u].programId === P['BSCS'].id);
  const fa23StudentsBSEE = studentUsernames.filter((u) => S[u].batch === 'FA23' && S[u].programId === P['BSEE'].id);
  const fa24StudentsBSCS = studentUsernames.filter((u) => S[u].batch === 'FA24' && S[u].programId === P['BSCS'].id);
  const fa24StudentsBBA = studentUsernames.filter((u) => S[u].batch === 'FA24' && S[u].programId === P['BBA'].id);

  const enrollData = [];
  const addCompleted = (sUsername, offKey) => {
    const off = O[offKey];
    if (!off) return;
    const assign = randInt(15, 30);
    const mid = randInt(15, 30);
    const final = randInt(20, 40);
    const total = assign + mid + final;
    enrollData.push({
      studentId: S[sUsername].id, offeringId: off.id, status: 'COMPLETED',
      assignmentMarks: assign, midMarks: mid, finalMarks: final, totalMarks: total,
      gradeLetter: gradeForScore(total), gradePoints: GRADE_POINTS[gradeForScore(total)],
      completedAt,
    });
  };
  const addEnrolled = (sUsername, offKey) => {
    const off = O[offKey];
    if (!off) return;
    enrollData.push({ studentId: S[sUsername].id, offeringId: off.id, status: 'ENROLLED' });
  };

  // FA24 completed grades
  for (const u of fa22Students) {
    addCompleted(u, 'CS-301_FA24_A');
    addCompleted(u, 'CS-302_FA24_A');
  }
  for (const u of fa23StudentsBSCS) {
    addCompleted(u, 'CS-103_FA24_A');
    addCompleted(u, 'CS-201_FA24_A');
  }
  for (const u of fa23StudentsBSEE) {
    addCompleted(u, 'EE-101_FA24_A');
    addCompleted(u, 'EE-201_FA24_A');
  }
  for (let i = 0; i < fa24StudentsBSCS.length; i++) {
    addCompleted(fa24StudentsBSCS[i], i % 2 === 0 ? 'CS-101_FA24_A' : 'CS-101_FA24_B');
    addCompleted(fa24StudentsBSCS[i], 'MTH-101_FA24_A');
  }
  for (const u of fa24StudentsBBA) {
    addCompleted(u, 'BBA-101_FA24_A');
  }

  // SP25 active enrollments
  // FA22 sem 6 → CS-303, CS-304, CS-401
  for (const u of fa22Students) {
    addEnrolled(u, 'CS-303_SP25_A');
    addEnrolled(u, 'CS-304_SP25_A');
    addEnrolled(u, 'CS-401_SP25_A');
  }
  // FA23 BSCS sem 4 → CS-202, CS-203, CS-204
  for (let i = 0; i < fa23StudentsBSCS.length; i++) {
    addEnrolled(fa23StudentsBSCS[i], i % 2 === 0 ? 'CS-202_SP25_A' : 'CS-202_SP25_B');
    addEnrolled(fa23StudentsBSCS[i], 'CS-203_SP25_A');
    addEnrolled(fa23StudentsBSCS[i], 'CS-204_SP25_A');
  }
  for (const u of fa23StudentsBSEE) {
    addEnrolled(u, 'EE-102_SP25_A');
    addEnrolled(u, 'EE-202_SP25_A');
  }
  // FA24 BSCS sem 2 → CS-102, MTH-102
  for (let i = 0; i < fa24StudentsBSCS.length; i++) {
    addEnrolled(fa24StudentsBSCS[i], i % 2 === 0 ? 'CS-102_SP25_A' : 'CS-102_SP25_B');
    addEnrolled(fa24StudentsBSCS[i], 'MTH-102_SP25_A');
  }
  for (const u of fa24StudentsBBA) {
    addEnrolled(u, 'BBA-102_SP25_A');
    addEnrolled(u, 'BBA-201_SP25_A');
  }

  await safeCreateMany('enrollment', enrollData, 'enrollments');

  // ── 10. SEMESTER INCHARGES ──────────────────────────────────────
  console.log('10/15 Semester incharges (30)…');
  const inchargeData = [];
  const teacherKeys = Object.keys(T);
  let tk = 0;
  for (let sem = 1; sem <= 8; sem++) {
    inchargeData.push({
      teacherId: T[teacherKeys[tk++ % teacherKeys.length]].id,
      programId: P['BSCS'].id, batch: 'FA22', academicYear: '2024-2025',
      semesterNumber: sem, status: sem === 6 ? 'active' : 'relieved',
    });
    inchargeData.push({
      teacherId: T[teacherKeys[tk++ % teacherKeys.length]].id,
      programId: P['BSCS'].id, batch: 'FA23', academicYear: '2024-2025',
      semesterNumber: sem, status: sem === 4 ? 'active' : 'relieved',
    });
    inchargeData.push({
      teacherId: T[teacherKeys[tk++ % teacherKeys.length]].id,
      programId: P['BSCS'].id, batch: 'FA24', academicYear: '2024-2025',
      semesterNumber: sem, status: sem === 2 ? 'active' : 'relieved',
    });
    inchargeData.push({
      teacherId: T[teacherKeys[tk++ % teacherKeys.length]].id,
      programId: P['BSEE'].id, batch: 'FA23', academicYear: '2024-2025',
      semesterNumber: sem, status: sem === 4 ? 'active' : 'relieved',
    });
  }
  await safeCreateMany('semesterIncharge', inchargeData.slice(0, 32), 'semester incharges');

  // ── 11. ASSIGNMENTS + SUBMISSIONS ───────────────────────────────
  console.log('11/15 Assignments (40) + Submissions (~150)…');
  const sp25Offerings = Object.values(O).filter((o) => o.termId === TM['SP25'].id);
  const assignmentData = [];
  for (let i = 0; i < 40; i++) {
    const off = sp25Offerings[i % sp25Offerings.length];
    assignmentData.push({
      offeringId: off.id,
      title: `Assignment ${(i % 5) + 1} - ${pick(['Implementation', 'Theory', 'Analysis', 'Design', 'Report'])}`,
      description: 'Submit your solution by the due date. Late submissions incur 10% per day penalty.',
      totalMarks: pick([20, 25, 30, 50, 100]),
      dueDate: daysAgo(randInt(-30, 10)),
      allowLate: rand() > 0.5,
      status: 'PUBLISHED',
    });
  }
  await safeCreateMany('assignment', assignmentData, 'assignments');

  const allAssignments = await prisma.assignment.findMany({ select: { id: true, offeringId: true, totalMarks: true, dueDate: true } });
  const submissionData = [];
  for (const a of allAssignments) {
    const enrolled = await prisma.enrollment.findMany({
      where: { offeringId: a.offeringId, status: 'ENROLLED' },
      select: { studentId: true },
      take: 6,
    });
    for (const e of enrolled) {
      const submittedAt = new Date(a.dueDate.getTime() - randInt(-86400000, 86400000 * 2));
      const isLate = submittedAt > a.dueDate;
      const obtained = randInt(Math.floor(a.totalMarks * 0.5), a.totalMarks);
      submissionData.push({
        assignmentId: a.id, studentId: e.studentId,
        submissionText: 'Submission text/notes here.',
        isLate, obtainedMarks: rand() > 0.3 ? obtained : null,
        feedback: rand() > 0.3 ? pick(['Good work', 'Needs improvement', 'Excellent', 'Partially correct']) : null,
        gradedAt: rand() > 0.3 ? daysAgo(randInt(0, 5)) : null,
        status: isLate ? 'LATE' : (rand() > 0.3 ? 'GRADED' : 'SUBMITTED'),
        submittedAt,
      });
    }
  }
  await safeCreateMany('submission', submissionData.slice(0, 200), 'submissions');

  // ── 12. ATTENDANCE ───────────────────────────────────────────────
  console.log('12/15 Attendance records (~400)…');
  const attendanceData = [];
  for (const off of sp25Offerings.slice(0, 10)) {
    const enrolled = await prisma.enrollment.findMany({
      where: { offeringId: off.id, status: 'ENROLLED' },
      select: { studentId: true },
    });
    const offering = await prisma.courseOffering.findUnique({ where: { id: off.id }, select: { teacherId: true } });
    // 5 sessions over the past month
    for (let session = 0; session < 5; session++) {
      const date = daysAgo(session * 7).toISOString().slice(0, 10);
      for (const e of enrolled.slice(0, 8)) {
        const r = rand();
        const status = r > 0.85 ? 'ABSENT' : (r > 0.75 ? 'LATE' : 'PRESENT');
        attendanceData.push({
          offeringId: off.id, studentId: e.studentId, date, status,
          markedBy: offering.teacherId,
        });
      }
    }
  }
  await safeCreateMany('attendance', attendanceData, 'attendance entries');

  // ── 13. ANNOUNCEMENTS ────────────────────────────────────────────
  console.log('13/15 Announcements (35)…');
  const adminUsers = await prisma.user.findMany({ where: { role: 'admin' }, select: { id: true } });
  const announcementData = ANNOUNCEMENT_TITLES.map((title, i) => ({
    title,
    content: `${title} - Detailed information will be communicated shortly via email and the campus portal. Please stay tuned and check the official channels for updates.`,
    priority: i % 5 === 0 ? 'high' : (i % 3 === 0 ? 'medium' : 'low'),
    targetAudience: pick(['all', 'students', 'teachers']),
    createdBy: adminUsers[i % adminUsers.length].id,
    createdAt: daysAgo(randInt(0, 60)),
  }));
  // Pad to 35
  while (announcementData.length < 35) {
    announcementData.push({
      title: `Notice #${announcementData.length + 1}`,
      content: 'Please refer to the noticeboard for full details.',
      priority: 'low',
      targetAudience: 'all',
      createdBy: adminUsers[0].id,
      createdAt: daysAgo(randInt(60, 120)),
    });
  }
  await safeCreateMany('announcement', announcementData, 'announcements');

  // ── 14. AUDIT LOGS, QUIZZES, Q&A, NOTIFICATIONS ─────────────────
  console.log('14/15 Audit logs (50)…');
  const allUsers = await prisma.user.findMany({ select: { id: true, role: true } });
  const auditData = [];
  const auditCategories = ['AUTH', 'USER_MANAGEMENT', 'ACADEMIC', 'ADMISSION', 'ANNOUNCEMENT', 'GRADING'];
  const auditActions = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'ACTIVATE', 'DEACTIVATE'];
  for (let i = 0; i < 50; i++) {
    const u = pick(allUsers);
    auditData.push({
      action: pick(auditActions),
      category: pick(auditCategories),
      performedBy: u.id,
      performedByRole: u.role,
      targetModel: pick(['User', 'Course', 'Enrollment', 'Assignment', 'Quiz', 'Announcement']),
      targetId: 'sample-id',
      description: `Sample ${pick(auditActions).toLowerCase()} action performed`,
      createdAt: hoursAgo(randInt(0, 720)),
    });
  }
  await safeCreateMany('auditLog', auditData, 'audit logs');

  console.log('     Quizzes (35) + Questions (~140) + Attempts (~80)…');
  const quizData = [];
  for (let i = 0; i < 35; i++) {
    const off = sp25Offerings[i % sp25Offerings.length];
    const startAt = daysAgo(randInt(-15, 30));
    quizData.push({
      offeringId: off.id,
      title: `Quiz ${(i % 4) + 1} - ${pick(['Concepts', 'Applications', 'Practice'])}`,
      description: 'Online quiz; please ensure stable internet and a quiet environment.',
      totalMarks: 0, // will recompute after questions
      durationMinutes: pick([15, 20, 30, 45]),
      startAt,
      endAt: new Date(startAt.getTime() + 7 * 24 * 60 * 60 * 1000),
      status: 'PUBLISHED',
      maxViolations: 3,
    });
  }
  await safeCreateMany('quiz', quizData, 'quizzes');

  const allQuizzes = await prisma.quiz.findMany({ select: { id: true } });
  const questionData = [];
  for (const q of allQuizzes) {
    const numQuestions = randInt(3, 5);
    for (let i = 0; i < numQuestions; i++) {
      const type = pick(['MCQ', 'MCQ', 'TRUE_FALSE', 'SHORT']);
      let options = [], correct = 0;
      if (type === 'MCQ') {
        options = ['Option A', 'Option B', 'Option C', 'Option D'];
        correct = randInt(0, 3);
      } else if (type === 'TRUE_FALSE') {
        options = ['True', 'False'];
        correct = randInt(0, 1);
      } else {
        correct = 'Sample expected answer';
      }
      questionData.push({
        quizId: q.id, type,
        questionText: `Q${i + 1}. ${pick(['Explain', 'What is', 'Compare', 'Describe', 'Define'])} the concept of ${pick(['inheritance', 'polymorphism', 'normalization', 'recursion', 'concurrency', 'encryption', 'complexity'])}.`,
        options, correctAnswer: correct, marks: pick([1, 2, 5]), order: i + 1,
      });
    }
  }
  await safeCreateMany('quizQuestion', questionData, 'quiz questions');

  // Update quiz totalMarks
  for (const q of allQuizzes) {
    const sum = await prisma.quizQuestion.aggregate({
      where: { quizId: q.id }, _sum: { marks: true },
    });
    await prisma.quiz.update({ where: { id: q.id }, data: { totalMarks: sum._sum.marks || 0 } });
  }

  // Quiz attempts (4 students per quiz, mix of submitted/in-progress)
  const attemptData = [];
  for (const q of allQuizzes.slice(0, 30)) {
    const off = await prisma.quiz.findUnique({ where: { id: q.id }, select: { offeringId: true } });
    const enrolled = await prisma.enrollment.findMany({
      where: { offeringId: off.offeringId, status: 'ENROLLED' },
      select: { studentId: true }, take: 4,
    });
    for (const e of enrolled) {
      const status = pick(['SUBMITTED', 'SUBMITTED', 'AUTO_SUBMITTED']);
      attemptData.push({
        quizId: q.id, studentId: e.studentId,
        startedAt: hoursAgo(randInt(1, 200)),
        submittedAt: hoursAgo(randInt(0, 100)),
        status,
        autoGradedScore: randInt(2, 8),
        manualScore: 0,
        totalScore: randInt(2, 10),
        violations: randInt(0, 2),
      });
    }
  }
  await safeCreateMany('quizAttempt', attemptData, 'quiz attempts');

  // Quiz answers
  const allAttempts = await prisma.quizAttempt.findMany({ select: { id: true, quizId: true } });
  const answerData = [];
  for (const att of allAttempts) {
    const questions = await prisma.quizQuestion.findMany({ where: { quizId: att.quizId } });
    for (const qq of questions) {
      let answer = null;
      if (qq.type === 'MCQ') answer = randInt(0, 3);
      else if (qq.type === 'TRUE_FALSE') answer = randInt(0, 1);
      else answer = 'Sample student response';
      const isCorrect = (qq.type === 'MCQ' || qq.type === 'TRUE_FALSE') ? answer === qq.correctAnswer : null;
      answerData.push({
        attemptId: att.id, questionId: qq.id,
        answer, isCorrect,
        marksAwarded: isCorrect === true ? qq.marks : 0,
      });
    }
  }
  await safeCreateMany('quizAnswer', answerData, 'quiz answers');

  console.log('     Q&A threads (35) + Replies (~70)…');
  const qnaData = [];
  for (let i = 0; i < 35; i++) {
    const off = sp25Offerings[i % sp25Offerings.length];
    const enrolled = await prisma.enrollment.findMany({
      where: { offeringId: off.id, status: 'ENROLLED' },
      select: { studentId: true }, take: 1,
    });
    if (enrolled.length === 0) continue;
    const student = await prisma.student.findUnique({ where: { id: enrolled[0].studentId }, select: { userId: true } });
    const [title, body] = QNA_QUESTIONS[i % QNA_QUESTIONS.length];
    qnaData.push({
      offeringId: off.id,
      askedById: student.userId,
      title, body,
      status: rand() > 0.6 ? 'RESOLVED' : 'OPEN',
      createdAt: daysAgo(randInt(0, 30)),
    });
  }
  await safeCreateMany('qnaThread', qnaData, 'Q&A threads');

  const allThreads = await prisma.qnaThread.findMany({ include: { offering: { select: { teacherId: true } } } });
  const replyData = [];
  for (const th of allThreads) {
    const teacher = await prisma.teacher.findUnique({ where: { id: th.offering.teacherId }, select: { userId: true } });
    if (rand() > 0.3) {
      replyData.push({
        threadId: th.id, authorId: teacher.userId,
        body: pick([
          'Good question. Please refer to slide 15 of last week\'s lecture.',
          'I will cover this in tomorrow\'s class — please attend.',
          'Yes, that is acceptable. Document your assumptions clearly.',
          'See office hours for a detailed walkthrough.',
          'The deadline cannot be extended further.',
        ]),
        createdAt: new Date(th.createdAt.getTime() + randInt(1, 48) * 60 * 60 * 1000),
      });
    }
    if (rand() > 0.5) {
      replyData.push({
        threadId: th.id, authorId: th.askedById,
        body: 'Thank you, that clarifies it.',
        createdAt: new Date(th.createdAt.getTime() + randInt(48, 72) * 60 * 60 * 1000),
      });
    }
  }
  await safeCreateMany('qnaReply', replyData, 'Q&A replies');

  // ── 15. NOTIFICATIONS + ADMISSIONS + TRUSTED DEVICES ─────────────
  console.log('15/15 Notifications (~150) + Admissions (35) + Trusted Devices (35)…');
  const notificationData = [];
  for (const u of allUsers.slice(0, 50)) {
    const count = randInt(2, 6);
    for (let i = 0; i < count; i++) {
      notificationData.push({
        userId: u.id,
        type: pick(['ANNOUNCEMENT', 'ASSIGNMENT_NEW', 'ASSIGNMENT_GRADED', 'QUIZ_NEW', 'QNA_REPLY', 'GENERAL']),
        title: pick(['New announcement', 'Assignment posted', 'Assignment graded', 'Quiz scheduled', 'Reply on your question']),
        body: 'Tap to view details.',
        isRead: rand() > 0.5,
        readAt: rand() > 0.5 ? hoursAgo(randInt(1, 100)) : null,
        createdAt: hoursAgo(randInt(0, 240)),
      });
    }
  }
  await safeCreateMany('notification', notificationData, 'notifications');

  // Admission Settings (one row)
  await prisma.admissionSettings.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
      isOpen: true,
      startDate: daysAgo(30),
      endDate: daysAgo(-30),
      requiresDocuments: true,
      requiredDocuments: ['CNIC', 'Matric Certificate', 'Intermediate Certificate', 'Domicile'],
      instructions: 'Submit all documents in PDF format. Each file must be under 10 MB.',
    },
  }).catch(() => {});

  const admissionData = [];
  const programChoices = ['BSCS', 'BSEE', 'BSSE', 'BBA', 'BSAI', 'BSDS', 'BSME', 'BSCE'];
  for (let i = 1; i <= 35; i++) {
    const fn = pick(FIRST_NAMES);
    const ln = pick(LAST_NAMES);
    admissionData.push({
      applicationNumber: `APP-2025-${String(i).padStart(4, '0')}`,
      fullName: `${fn} ${ln}`,
      email: `applicant${i}@gmail.com`,
      phone: `+9230${randInt(0, 9)}${String(randInt(1000000, 9999999))}`,
      cnic: `${randInt(10000, 99999)}-${randInt(1000000, 9999999)}-${randInt(1, 9)}`,
      gender: pick(['Male', 'Female']),
      program: pick(programChoices),
      address: { city: pick(['Lahore', 'Karachi', 'Islamabad', 'Peshawar', 'Multan']), street: 'Sample Street' },
      guardian: { name: `${pick(FIRST_NAMES)} ${ln}`, relation: 'Father', phone: `+9230${randInt(0, 9)}${String(randInt(1000000, 9999999))}` },
      educationRecords: [
        { level: 'Matric', board: 'BISE Lahore', year: randInt(2018, 2023), percentage: randInt(70, 95) },
        { level: 'Intermediate', board: 'BISE Lahore', year: randInt(2020, 2024), percentage: randInt(70, 95) },
      ],
      applicationStatus: pick(['Pending', 'Pending', 'Approved', 'Rejected', 'Under Review']),
      applicationDate: daysAgo(randInt(0, 60)),
    });
  }
  await safeCreateMany('admissionApplication', admissionData, 'admission applications');

  // Trusted devices (random 35 users)
  const trustedData = [];
  for (let i = 0; i < 35; i++) {
    const u = pick(allUsers);
    trustedData.push({
      userId: u.id,
      deviceId: `DEV-${i}-${randInt(1000, 9999)}`,
      deviceName: pick(['Chrome on Windows', 'Safari on macOS', 'Firefox on Linux', 'Edge on Windows', 'Chrome on Android']),
      userAgent: 'Mozilla/5.0 …',
      ipAddress: `192.168.${randInt(0, 255)}.${randInt(0, 255)}`,
      lastUsed: hoursAgo(randInt(0, 240)),
    });
  }
  await safeCreateMany('trustedDevice', trustedData, 'trusted devices');

  // ── DONE ─────────────────────────────────────────────────────────
  console.log('\n✅  Seed complete!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Default password for every seeded user: Campus@123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  KEY ACCOUNTS');
  console.log('  ------------');
  console.log('  superadmin       Super Administrator (full access)');
  console.log('  registrar.main   Chief Registrar (manage_users, manage_admissions, view_reports)');
  console.log('  academic.head    Academic Head (manage_academic, manage_offerings, view_reports)');
  console.log('  comms.head       Communications Head (manage_announcements, view_reports)');
  console.log('  audit.officer    Audit Officer (view_audit_logs, view_reports)');
  console.log('  Other admins:    admin07 … admin29 (random 1-3 permissions each)');
  console.log('  Teachers:        35 teachers (look for *.* + numeric suffix usernames)');
  console.log('  Students:        120 students across BSCS / BSEE / BBA');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  ACTIVE TERM: SP25 (Spring 2024-2025)');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

main().catch(console.error).finally(() => prisma.$disconnect());
