/**
 * Mini seed script for a compact but transcript-friendly CampusOne dataset.
 *
 * Creates:
 * - 1 CS department and BSCS curriculum aligned with scripts/seed.js
 * - 4 terms (FA24, SP25, FA25, SP26 active)
 * - 4 teachers
 * - 10 students: 5 currently in semester 2 and 5 currently in semester 4
 * - completed historical enrollments so transcript/CGPA views look realistic
 * - active semester 2 and semester 4 offerings, attendance, assignments, quizzes
 * - at least 1 approved TA assignment for a semester 4 student
 *
 * Run with: node scripts/miniSeed.js
 */

import bcrypt from 'bcryptjs';
import prisma from '../prisma/client.js';
import { CURRICULUM } from './seed.js';
import { getTemplate } from '../utils/gradeTemplates.js';

const PASS = 'Campus@123';
const NOW = new Date();

const GRADE_POINTS = {
  A_PLUS: 4.0,
  A: 4.0,
  A_MINUS: 3.67,
  B_PLUS: 3.33,
  B: 3.0,
  B_MINUS: 2.67,
  C_PLUS: 2.33,
  C: 2.0,
  C_MINUS: 1.67,
  D_PLUS: 1.33,
  D: 1.0,
  F: 0.0,
};

const DEPARTMENT = {
  code: 'CS',
  name: 'Computer Science',
  description: 'Compact BSCS dataset with realistic semester 2 and semester 4 history.',
};

const PROGRAM = {
  code: 'BSCS',
  name: 'BS Computer Science',
  version: '2022',
};

const TERM_DEFS = [
  { code: 'FA24', season: 'FALL', academicYear: '2024-2025', startDate: '2024-09-02', endDate: '2025-01-17', isActive: false },
  { code: 'SP25', season: 'SPRING', academicYear: '2024-2025', startDate: '2025-02-03', endDate: '2025-06-20', isActive: false },
  { code: 'FA25', season: 'FALL', academicYear: '2025-2026', startDate: '2025-09-01', endDate: '2026-01-16', isActive: false },
  {
    code: 'SP26',
    season: 'SPRING',
    academicYear: '2025-2026',
    startDate: '2026-02-02',
    endDate: '2026-06-19',
    registrationOpenAt: '2026-01-19',
    registrationCloseAt: '2026-02-09',
    isActive: true,
  },
];

const TEACHERS = [
  {
    username: 'sana',
    email: 'sana@campusone.edu',
    name: 'Dr. Sana Ahmed',
    employeeId: 'T-001',
    designation: 'Associate Professor',
    officeRoom: 'CS-201',
  },
  {
    username: 'bilal',
    email: 'bilal@campusone.edu',
    name: 'Mr. Bilal Khan',
    employeeId: 'T-002',
    designation: 'Assistant Professor',
    officeRoom: 'CS-203',
  },
  {
    username: 'hira',
    email: 'hira@campusone.edu',
    name: 'Ms. Hira Malik',
    employeeId: 'T-003',
    designation: 'Lecturer',
    officeRoom: 'CS-205',
  },
  {
    username: 'usman',
    email: 'usman@campusone.edu',
    name: 'Mr. Usman Tariq',
    employeeId: 'T-004',
    designation: 'Lecturer',
    officeRoom: 'CS-207',
  },
];

const STUDENT_BATCHES = [
  {
    batch: 'FA24',
    label: '8',
    section: '8A',
    enrollmentYear: 2024,
    currentSemester: 4,
    completedTimeline: [
      { termCode: 'FA24', semesterSlot: 1 },
      { termCode: 'SP25', semesterSlot: 2 },
      { termCode: 'FA25', semesterSlot: 3 },
    ],
    activeTimeline: { termCode: 'SP26', semesterSlot: 4 },
    students: [
      { username: 'amna.fa24.01', email: 'amna.fa24.01@std.campusone.edu', name: 'Amna Tariq', studentId: 'FA24-BSCS-001', performanceBias: 16 },
      { username: 'saad.fa24.02', email: 'saad.fa24.02@std.campusone.edu', name: 'Saad Rauf', studentId: 'FA24-BSCS-002', performanceBias: 11 },
      { username: 'iqra.fa24.03', email: 'iqra.fa24.03@std.campusone.edu', name: 'Iqra Mehmood', studentId: 'FA24-BSCS-003', performanceBias: 8 },
      { username: 'talha.fa24.04', email: 'talha.fa24.04@std.campusone.edu', name: 'Talha Hashmi', studentId: 'FA24-BSCS-004', performanceBias: 5 },
      { username: 'komal.fa24.05', email: 'komal.fa24.05@std.campusone.edu', name: 'Komal Siddiqui', studentId: 'FA24-BSCS-005', performanceBias: 2 },
    ],
  },
  {
    batch: 'FA25',
    label: '9',
    section: '9A',
    enrollmentYear: 2025,
    currentSemester: 2,
    completedTimeline: [{ termCode: 'FA25', semesterSlot: 1 }],
    activeTimeline: { termCode: 'SP26', semesterSlot: 2 },
    students: [
      { username: 'mariam.fa25.01', email: 'mariam.fa25.01@std.campusone.edu', name: 'Mariam Noor', studentId: 'FA25-BSCS-001', performanceBias: 9 },
      { username: 'hamza.fa25.02', email: 'hamza.fa25.02@std.campusone.edu', name: 'Hamza Khalid', studentId: 'FA25-BSCS-002', performanceBias: 6 },
      { username: 'zara.fa25.03', email: 'zara.fa25.03@std.campusone.edu', name: 'Zara Waqar', studentId: 'FA25-BSCS-003', performanceBias: 4 },
      { username: 'junaid.fa25.04', email: 'junaid.fa25.04@std.campusone.edu', name: 'Junaid Ali', studentId: 'FA25-BSCS-004', performanceBias: 2 },
      { username: 'nadia.fa25.05', email: 'nadia.fa25.05@std.campusone.edu', name: 'Nadia Khan', studentId: 'FA25-BSCS-005', performanceBias: 0 },
    ],
  },
];

const ROOMS = [
  { code: 'R110', name: 'Lecture Room 110', type: 'LECTURE', capacity: 45, building: 'Commerce Block', floor: 0 },
  { code: 'R120', name: 'Lecture Room 120', type: 'LECTURE', capacity: 45, building: 'Commerce Block', floor: 1 },
  { code: 'R21', name: 'Database Lab', type: 'LAB', capacity: 30, building: 'Science Block', floor: 1 },
];

const ACTIVE_SESSION_BLUEPRINTS = {
  CSCP1013: [{ dayOfWeek: 'MON', slotIndex: 1, roomCode: 'R110' }, { dayOfWeek: 'WED', slotIndex: 1, roomCode: 'R110' }],
  CSCP1011: [{ dayOfWeek: 'FRI', slotIndex: 2, roomCode: 'R21' }],
  CSCS2523: [{ dayOfWeek: 'TUE', slotIndex: 1, roomCode: 'R120' }, { dayOfWeek: 'THU', slotIndex: 1, roomCode: 'R120' }],
  CSCS2521: [{ dayOfWeek: 'TUE', slotIndex: 3, roomCode: 'R21' }],
  CSSS1713: [{ dayOfWeek: 'MON', slotIndex: 3, roomCode: 'R110' }, { dayOfWeek: 'WED', slotIndex: 3, roomCode: 'R110' }],
  ENG1023: [{ dayOfWeek: 'TUE', slotIndex: 2, roomCode: 'R120' }, { dayOfWeek: 'THU', slotIndex: 2, roomCode: 'R120' }],
  HU1013: [{ dayOfWeek: 'FRI', slotIndex: 1, roomCode: 'R120' }],
  CSCP2033: [{ dayOfWeek: 'MON', slotIndex: 5, roomCode: 'R110' }, { dayOfWeek: 'WED', slotIndex: 5, roomCode: 'R110' }],
  CSCP2031: [{ dayOfWeek: 'FRI', slotIndex: 4, roomCode: 'R21' }],
  CSDB2313: [{ dayOfWeek: 'TUE', slotIndex: 4, roomCode: 'R120' }, { dayOfWeek: 'THU', slotIndex: 4, roomCode: 'R120' }],
  CSDB2311: [{ dayOfWeek: 'TUE', slotIndex: 6, roomCode: 'R21' }],
  CSSS2743: [{ dayOfWeek: 'MON', slotIndex: 6, roomCode: 'R120' }, { dayOfWeek: 'WED', slotIndex: 6, roomCode: 'R120' }],
  CSSS2753: [{ dayOfWeek: 'TUE', slotIndex: 5, roomCode: 'R110' }, { dayOfWeek: 'THU', slotIndex: 5, roomCode: 'R110' }],
  CSDS4423: [{ dayOfWeek: 'FRI', slotIndex: 5, roomCode: 'R120' }],
};

const TEACHER_BY_COURSE = {
  CSCP1013: 0,
  CSCP1011: 0,
  CSCS2523: 1,
  CSCS2521: 1,
  CSSS1713: 2,
  ENG1023: 3,
  HU1013: 3,
  CSCP2033: 0,
  CSCP2031: 0,
  CSDB2313: 1,
  CSDB2311: 1,
  CSSS2743: 2,
  CSSS2753: 2,
  CSDS4423: 3,
};

const courseSessionType = (course) => (course.type === 'LAB' ? 'LAB' : 'LECTURE');
const daysFromNow = (days) => new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000);
const isoDate = (daysOffset) => daysFromNow(daysOffset).toISOString().slice(0, 10);
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

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

const buildHistoricalScore = (studentBias, semesterSlot, courseIndex) => {
  const raw = 64 + studentBias + semesterSlot * 2 + (courseIndex % 4) * 2 + (courseIndex % 2 === 0 ? 1 : -1);
  return clamp(raw, 52, 96);
};

const splitMarks = (total) => {
  const assignmentMarks = Math.round(total * 0.3);
  const midMarks = Math.round(total * 0.28);
  const finalMarks = total - assignmentMarks - midMarks;
  return { assignmentMarks, midMarks, finalMarks };
};

const ensureUser = async (data, hash) => prisma.user.upsert({
  where: { username: data.username },
  update: {
    email: data.email,
    name: data.name,
    role: data.role,
    isFirstLogin: false,
  },
  create: {
    username: data.username,
    email: data.email,
    name: data.name,
    password: hash,
    role: data.role,
    isFirstLogin: false,
  },
});

async function main() {
  console.log('\n🌱 Seeding transcript-friendly CampusOne dataset…\n');
  const hash = await bcrypt.hash(PASS, 10);

  const department = await prisma.department.upsert({
    where: { code: DEPARTMENT.code },
    update: DEPARTMENT,
    create: DEPARTMENT,
  });

  const totalCredits = CURRICULUM.reduce((sum, course) => sum + course.cr, 0);
  const program = await prisma.program.upsert({
    where: { programCode: PROGRAM.code },
    update: {
      name: PROGRAM.name,
      type: 'BACHELOR',
      totalSemesters: 8,
      totalCredits,
      departmentId: department.id,
    },
    create: {
      programCode: PROGRAM.code,
      name: PROGRAM.name,
      type: 'BACHELOR',
      totalSemesters: 8,
      totalCredits,
      departmentId: department.id,
    },
  });

  const curriculum = await prisma.curriculum.upsert({
    where: { programId_version: { programId: program.id, version: PROGRAM.version } },
    update: { effectiveFromYear: 2022, totalCredits, isActive: true },
    create: {
      programId: program.id,
      version: PROGRAM.version,
      effectiveFromYear: 2022,
      totalCredits,
      isActive: true,
    },
  });

  const teacherRecords = [];
  for (const teacherDef of TEACHERS) {
    const user = await ensureUser({ ...teacherDef, role: 'teacher' }, hash);
    const teacher = await prisma.teacher.upsert({
      where: { userId: user.id },
      update: {
        employeeId: teacherDef.employeeId,
        designation: teacherDef.designation,
        qualification: teacherDef.designation.includes('Professor') ? 'PhD' : 'MS',
        officeRoom: teacherDef.officeRoom,
        officeHours: 'Mon-Wed 14:00-16:00',
        departmentId: department.id,
      },
      create: {
        employeeId: teacherDef.employeeId,
        designation: teacherDef.designation,
        qualification: teacherDef.designation.includes('Professor') ? 'PhD' : 'MS',
        officeRoom: teacherDef.officeRoom,
        officeHours: 'Mon-Wed 14:00-16:00',
        user: { connect: { id: user.id } },
        department: { connect: { id: department.id } },
      },
    });
    teacherRecords.push({ ...teacherDef, user, teacher });
  }

  await prisma.department.update({
    where: { id: department.id },
    data: { hodTeacherId: teacherRecords[0].teacher.id },
  });

  const courseRecords = {};
  for (const courseDef of CURRICULUM) {
    const sessionType = courseSessionType(courseDef);
    const course = await prisma.course.upsert({
      where: { code: courseDef.code },
      update: {
        title: courseDef.title,
        creditHours: courseDef.cr,
        departmentId: department.id,
        sessionType,
      },
      create: {
        code: courseDef.code,
        title: courseDef.title,
        creditHours: courseDef.cr,
        departmentId: department.id,
        sessionType,
      },
    });
    courseRecords[courseDef.code] = course;

    await prisma.curriculumCourse.upsert({
      where: { curriculumId_courseId: { curriculumId: curriculum.id, courseId: course.id } },
      update: {
        semesterSlot: courseDef.sem,
        type: courseDef.type === 'LAB' ? 'LAB' : courseDef.type,
        isElective: courseDef.type === 'ELECTIVE',
      },
      create: {
        curriculumId: curriculum.id,
        courseId: course.id,
        semesterSlot: courseDef.sem,
        type: courseDef.type === 'LAB' ? 'LAB' : courseDef.type,
        isElective: courseDef.type === 'ELECTIVE',
      },
    });

    const template = getTemplate(sessionType);
    for (const row of template) {
      await prisma.courseGradeComponent.upsert({
        where: { courseId_kind: { courseId: course.id, kind: row.kind } },
        update: row,
        create: { courseId: course.id, ...row },
      });
    }
  }

  const termRecords = {};
  for (const termDef of TERM_DEFS) {
    termRecords[termDef.code] = await prisma.term.upsert({
      where: { code: termDef.code },
      update: {
        season: termDef.season,
        academicYear: termDef.academicYear,
        startDate: new Date(termDef.startDate),
        endDate: new Date(termDef.endDate),
        registrationOpenAt: termDef.registrationOpenAt ? new Date(termDef.registrationOpenAt) : null,
        registrationCloseAt: termDef.registrationCloseAt ? new Date(termDef.registrationCloseAt) : null,
        isActive: termDef.isActive,
      },
      create: {
        code: termDef.code,
        season: termDef.season,
        academicYear: termDef.academicYear,
        startDate: new Date(termDef.startDate),
        endDate: new Date(termDef.endDate),
        registrationOpenAt: termDef.registrationOpenAt ? new Date(termDef.registrationOpenAt) : null,
        registrationCloseAt: termDef.registrationCloseAt ? new Date(termDef.registrationCloseAt) : null,
        isActive: termDef.isActive,
      },
    });
  }

  const roomRecords = {};
  for (const roomDef of ROOMS) {
    roomRecords[roomDef.code] = await prisma.room.upsert({
      where: { code: roomDef.code },
      update: roomDef,
      create: roomDef,
    });
  }

  const studentRecords = [];
  for (const batch of STUDENT_BATCHES) {
    for (const [index, studentDef] of batch.students.entries()) {
      const user = await ensureUser({ ...studentDef, role: 'student' }, hash);
      const student = await prisma.student.upsert({
        where: { userId: user.id },
        update: {
          studentId: studentDef.studentId,
          enrollmentYear: batch.enrollmentYear,
          batch: batch.batch,
          currentSemester: batch.currentSemester,
          phone: `+9230${batch.label}${String(index + 1).padStart(8, '0')}`,
          address: `${batch.section}, CampusOne Residence Block`,
          emergencyContact: '+923009999999',
          dateOfBirth: new Date(`${batch.enrollmentYear - 18}-${String((index % 9) + 1).padStart(2, '0')}-15T00:00:00.000Z`),
          departmentId: department.id,
          programId: program.id,
          curriculumId: curriculum.id,
        },
        create: {
          studentId: studentDef.studentId,
          enrollmentYear: batch.enrollmentYear,
          batch: batch.batch,
          currentSemester: batch.currentSemester,
          phone: `+9230${batch.label}${String(index + 1).padStart(8, '0')}`,
          address: `${batch.section}, CampusOne Residence Block`,
          emergencyContact: '+923009999999',
          dateOfBirth: new Date(`${batch.enrollmentYear - 18}-${String((index % 9) + 1).padStart(2, '0')}-15T00:00:00.000Z`),
          user: { connect: { id: user.id } },
          department: { connect: { id: department.id } },
          program: { connect: { id: program.id } },
          curriculum: { connect: { id: curriculum.id } },
        },
      });
      studentRecords.push({ ...studentDef, batch, user, student, index });
    }
  }

  const offeringsByKey = new Map();
  const activeOfferings = [];

  for (const batch of STUDENT_BATCHES) {
    const timeline = [...batch.completedTimeline, batch.activeTimeline];
    for (const step of timeline) {
      const semesterCourses = CURRICULUM.filter((course) => course.sem === step.semesterSlot);
      for (const courseDef of semesterCourses) {
        const teacherIndex = TEACHER_BY_COURSE[courseDef.code] ?? 0;
        const offering = await prisma.courseOffering.upsert({
          where: {
            courseId_termId_section: {
              courseId: courseRecords[courseDef.code].id,
              termId: termRecords[step.termCode].id,
              section: batch.section,
            },
          },
          update: {
            teacherId: teacherRecords[teacherIndex].teacher.id,
            capacity: 35,
            isActive: step.termCode === batch.activeTimeline.termCode,
          },
          create: {
            courseId: courseRecords[courseDef.code].id,
            termId: termRecords[step.termCode].id,
            teacherId: teacherRecords[teacherIndex].teacher.id,
            section: batch.section,
            capacity: 35,
            isActive: step.termCode === batch.activeTimeline.termCode,
          },
          include: { course: true, teacher: { include: { user: true } } },
        });

        offeringsByKey.set(`${batch.batch}:${step.termCode}:${courseDef.code}`, offering);
        if (step.termCode === batch.activeTimeline.termCode) {
          activeOfferings.push({ ...offering, batch });
          const sessions = ACTIVE_SESSION_BLUEPRINTS[courseDef.code] || [];
          for (const session of sessions) {
            await prisma.classSession.upsert({
              where: {
                offeringId_dayOfWeek_slotIndex: {
                  offeringId: offering.id,
                  dayOfWeek: session.dayOfWeek,
                  slotIndex: session.slotIndex,
                },
              },
              update: { roomId: roomRecords[session.roomCode].id },
              create: {
                offeringId: offering.id,
                dayOfWeek: session.dayOfWeek,
                slotIndex: session.slotIndex,
                roomId: roomRecords[session.roomCode].id,
              },
            });
          }
        }
      }
    }
  }

  for (const record of studentRecords) {
    for (const step of record.batch.completedTimeline) {
      const semesterCourses = CURRICULUM.filter((course) => course.sem === step.semesterSlot);
      for (const [courseIndex, courseDef] of semesterCourses.entries()) {
        const offering = offeringsByKey.get(`${record.batch.batch}:${step.termCode}:${courseDef.code}`);
        const totalMarks = buildHistoricalScore(record.performanceBias, step.semesterSlot, courseIndex + record.index);
        const gradeLetter = gradeForScore(totalMarks);
        const marks = splitMarks(totalMarks);
        await prisma.enrollment.upsert({
          where: {
            studentId_offeringId: {
              studentId: record.student.id,
              offeringId: offering.id,
            },
          },
          update: {
            status: 'COMPLETED',
            assignmentMarks: marks.assignmentMarks,
            midMarks: marks.midMarks,
            finalMarks: marks.finalMarks,
            totalMarks,
            gradeLetter,
            gradePoints: GRADE_POINTS[gradeLetter],
            completedAt: termRecords[step.termCode].endDate,
          },
          create: {
            studentId: record.student.id,
            offeringId: offering.id,
            status: 'COMPLETED',
            assignmentMarks: marks.assignmentMarks,
            midMarks: marks.midMarks,
            finalMarks: marks.finalMarks,
            totalMarks,
            gradeLetter,
            gradePoints: GRADE_POINTS[gradeLetter],
            completedAt: termRecords[step.termCode].endDate,
          },
        });
      }
    }

    const activeCourses = CURRICULUM.filter((course) => course.sem === record.batch.activeTimeline.semesterSlot);
    for (const courseDef of activeCourses) {
      const offering = offeringsByKey.get(`${record.batch.batch}:${record.batch.activeTimeline.termCode}:${courseDef.code}`);
      await prisma.enrollment.upsert({
        where: {
          studentId_offeringId: {
            studentId: record.student.id,
            offeringId: offering.id,
          },
        },
        update: {
          status: 'ENROLLED',
          assignmentMarks: null,
          midMarks: null,
          finalMarks: null,
          totalMarks: null,
          gradeLetter: null,
          gradePoints: null,
          completedAt: null,
        },
        create: {
          studentId: record.student.id,
          offeringId: offering.id,
          status: 'ENROLLED',
        },
      });
    }
  }

  for (const [index, offering] of activeOfferings.entries()) {
    await prisma.assignment.upsert({
      where: { id: `assignment-${offering.id}` },
      update: {
        title: `${offering.course.code} Weekly Assignment`,
        description: `Current coursework for section ${offering.section}.`,
        totalMarks: 100,
        dueDate: daysFromNow(3 + (index % 5)),
        allowLate: true,
        status: 'PUBLISHED',
      },
      create: {
        id: `assignment-${offering.id}`,
        offeringId: offering.id,
        title: `${offering.course.code} Weekly Assignment`,
        description: `Current coursework for section ${offering.section}.`,
        totalMarks: 100,
        dueDate: daysFromNow(3 + (index % 5)),
        allowLate: true,
        status: 'PUBLISHED',
      },
    });
  }

  const openQuizOffering = activeOfferings.find((offering) => offering.course.code === 'CSCP1013');
  const upcomingQuizOffering = activeOfferings.find((offering) => offering.course.code === 'CSCP2033');

  if (openQuizOffering) {
    await prisma.quiz.upsert({
      where: { id: `quiz-open-${openQuizOffering.id}` },
      update: {
        title: `${openQuizOffering.course.code} Arrays and Flow Control`,
        description: 'Live quiz window for semester 2 students.',
        totalMarks: 15,
        durationMinutes: 25,
        startAt: daysFromNow(-1),
        endAt: daysFromNow(1),
        status: 'PUBLISHED',
        allowReview: true,
      },
      create: {
        id: `quiz-open-${openQuizOffering.id}`,
        offeringId: openQuizOffering.id,
        title: `${openQuizOffering.course.code} Arrays and Flow Control`,
        description: 'Live quiz window for semester 2 students.',
        totalMarks: 15,
        durationMinutes: 25,
        startAt: daysFromNow(-1),
        endAt: daysFromNow(1),
        status: 'PUBLISHED',
        allowReview: true,
        questions: {
          create: [
            {
              type: 'MCQ',
              questionText: 'Which loop is best when the iteration count is known in advance?',
              options: ['for loop', 'while loop', 'switch', 'try/catch'],
              correctAnswer: 0,
              marks: 5,
              order: 1,
            },
            {
              type: 'TRUE_FALSE',
              questionText: 'An array stores multiple values under one variable name.',
              options: ['True', 'False'],
              correctAnswer: 0,
              marks: 5,
              order: 2,
            },
            {
              type: 'MCQ',
              questionText: 'Which symbol is commonly used for modulo in C-style languages?',
              options: ['%', '#', '&', '$'],
              correctAnswer: 0,
              marks: 5,
              order: 3,
            },
          ],
        },
      },
    });
  }

  if (upcomingQuizOffering) {
    await prisma.quiz.upsert({
      where: { id: `quiz-upcoming-${upcomingQuizOffering.id}` },
      update: {
        title: `${upcomingQuizOffering.course.code} Trees and Complexity`,
        description: 'Upcoming quiz visible in the semester 4 dashboard.',
        totalMarks: 20,
        durationMinutes: 30,
        startAt: daysFromNow(2),
        endAt: daysFromNow(4),
        status: 'PUBLISHED',
        allowReview: true,
      },
      create: {
        id: `quiz-upcoming-${upcomingQuizOffering.id}`,
        offeringId: upcomingQuizOffering.id,
        title: `${upcomingQuizOffering.course.code} Trees and Complexity`,
        description: 'Upcoming quiz visible in the semester 4 dashboard.',
        totalMarks: 20,
        durationMinutes: 30,
        startAt: daysFromNow(2),
        endAt: daysFromNow(4),
        status: 'PUBLISHED',
        allowReview: true,
        questions: {
          create: [
            {
              type: 'MCQ',
              questionText: 'Which traversal visits the root node between left and right subtrees?',
              options: ['Preorder', 'Inorder', 'Postorder', 'Level order'],
              correctAnswer: 1,
              marks: 10,
              order: 1,
            },
            {
              type: 'MCQ',
              questionText: 'What is the average time complexity of binary search?',
              options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
              correctAnswer: 1,
              marks: 10,
              order: 2,
            },
          ],
        },
      },
    });
  }

  await prisma.announcement.upsert({
    where: { id: 'announcement-live-week' },
    update: {
      title: 'Week 6 academic update',
      content: 'Semester 2 programming quiz opens today and semester 4 assignment submissions close this Friday. TA support slots are available after Zuhr in CS-201.',
      priority: 'high',
      targetAudience: 'all',
      createdBy: teacherRecords[0].user.id,
    },
    create: {
      id: 'announcement-live-week',
      title: 'Week 6 academic update',
      content: 'Semester 2 programming quiz opens today and semester 4 assignment submissions close this Friday. TA support slots are available after Zuhr in CS-201.',
      priority: 'high',
      targetAudience: 'all',
      createdBy: teacherRecords[0].user.id,
    },
  });

  if (openQuizOffering) {
    const qnaStudent = studentRecords.find((record) => record.batch.batch === 'FA25');
    await prisma.qnaThread.upsert({
      where: { id: 'qna-thread-cscp1013' },
      update: {
        offeringId: openQuizOffering.id,
        askedById: qnaStudent.user.id,
        title: 'Will the quiz include nested loops?',
        body: 'The practice sheet covers nested loops and arrays. Should we expect both topics in the live quiz?',
        status: 'OPEN',
      },
      create: {
        id: 'qna-thread-cscp1013',
        offeringId: openQuizOffering.id,
        askedById: qnaStudent.user.id,
        title: 'Will the quiz include nested loops?',
        body: 'The practice sheet covers nested loops and arrays. Should we expect both topics in the live quiz?',
        status: 'OPEN',
        replies: {
          create: {
            authorId: openQuizOffering.teacher.userId,
            body: 'Yes. Focus on loop tracing, array traversal, and dry runs of small programs.',
          },
        },
      },
    });
  }

  const attendanceTargets = [
    { courseCode: 'CSCP1013', batch: 'FA25', date: isoDate(-2) },
    { courseCode: 'CSCP2033', batch: 'FA24', date: isoDate(-1) },
  ];

  for (const target of attendanceTargets) {
    const offering = activeOfferings.find((entry) => entry.course.code === target.courseCode && entry.batch.batch === target.batch);
    if (!offering) continue;
    const students = studentRecords.filter((record) => record.batch.batch === target.batch);
    for (const [index, record] of students.entries()) {
      const status = index === students.length - 1 ? 'LATE' : index === students.length - 2 ? 'ABSENT' : 'PRESENT';
      await prisma.attendance.upsert({
        where: {
          offeringId_studentId_date: {
            offeringId: offering.id,
            studentId: record.student.id,
            date: target.date,
          },
        },
        update: {
          status,
          markedBy: offering.teacherId,
        },
        create: {
          offeringId: offering.id,
          studentId: record.student.id,
          date: target.date,
          status,
          markedBy: offering.teacherId,
        },
      });
    }
  }

  const taStudent = studentRecords.find((record) => record.studentId === 'FA24-BSCS-001');
  const taOffering = activeOfferings.find((entry) => entry.course.code === 'CSCP1013' && entry.batch.batch === 'FA25');

  if (taStudent && taOffering) {
    await prisma.tAAssignment.upsert({
      where: {
        studentId_offeringId: {
          studentId: taStudent.student.id,
          offeringId: taOffering.id,
        },
      },
      update: {
        status: 'APPROVED',
        permissions: ['VIEW_ROSTER', 'MARK_ATTENDANCE', 'ANSWER_QNA'],
        appliedSemester: taStudent.batch.currentSemester,
        targetSemesterMin: 1,
        targetSemesterMax: 2,
        reason: 'I scored an A in Programming Fundamentals and already mentor juniors informally.',
        reviewNotes: 'Approved for lab support and roster handling.',
        reviewedBy: taOffering.teacher.userId,
        reviewedAt: daysFromNow(-5),
        appliedAt: daysFromNow(-12),
        startedAt: daysFromNow(-3),
        endedAt: null,
      },
      create: {
        studentId: taStudent.student.id,
        offeringId: taOffering.id,
        status: 'APPROVED',
        permissions: ['VIEW_ROSTER', 'MARK_ATTENDANCE', 'ANSWER_QNA'],
        appliedSemester: taStudent.batch.currentSemester,
        targetSemesterMin: 1,
        targetSemesterMax: 2,
        reason: 'I scored an A in Programming Fundamentals and already mentor juniors informally.',
        reviewNotes: 'Approved for lab support and roster handling.',
        reviewedBy: taOffering.teacher.userId,
        reviewedAt: daysFromNow(-5),
        appliedAt: daysFromNow(-12),
        startedAt: daysFromNow(-3),
      },
    });
  }

  console.log('seed complete.');
  console.log(`Default password for seeded users: ${PASS}`);
  console.log('Teachers: sana, bilal, hira, usman');
  console.log('Students: 5 in semester 2 (FA25) and 5 in semester 4 (FA24)');
  console.log('Transcript history: FA24, SP25, FA25 completed terms + SP26 active term');
  console.log('TA assignment: 1 approved senior TA attached to CSCP1013 section 9A');
}

main()
  .catch(async (error) => {
    console.error('seed failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });