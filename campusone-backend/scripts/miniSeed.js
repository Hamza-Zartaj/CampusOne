/**
 * Mini seed script for a compact CampusOne dataset.
 *
 * Creates:
 * - 1 department
 * - 1 program + curriculum
 * - 4 courses in a single active term
 * - 2 teachers
 * - 5 students
 * - offerings, enrollments, rooms, sessions
 * - a few assignments, quizzes, an announcement, and one Q&A thread
 *
 * Run with: node scripts/miniSeed.js
 *
 * Recommended on a fresh database reset. The Super Admin is still created
 * separately with scripts/createSuperAdmin.js.
 */

import bcrypt from 'bcryptjs';
import prisma from '../prisma/client.js';
import { getTemplate } from '../utils/gradeTemplates.js';

const PASS = 'Campus@123';
const NOW = new Date();

const DEPARTMENT = {
  code: 'CSM',
  name: 'Computer Science',
  description: 'Compact department dataset for quick local testing.',
};

const PROGRAM = {
  code: 'BSCS',
  name: 'BS Computer Science',
  version: '2026',
};

const TERM = {
  code: 'SP26',
  season: 'SPRING',
  academicYear: '2025-2026',
  startDate: new Date('2026-04-28T00:00:00.000Z'),
  endDate: new Date('2026-08-15T00:00:00.000Z'),
  registrationOpenAt: new Date('2026-04-20T00:00:00.000Z'),
  registrationCloseAt: new Date('2026-05-20T00:00:00.000Z'),
};

const COURSES = [
  { code: 'CS101', title: 'Introduction to Computing', creditHours: 3, semesterSlot: 1, type: 'CORE', sessionType: 'LECTURE' },
  { code: 'CS101L', title: 'Introduction to Computing Lab', creditHours: 1, semesterSlot: 1, type: 'LAB', sessionType: 'LAB' },
  { code: 'MTH101', title: 'Applied Calculus I', creditHours: 3, semesterSlot: 1, type: 'CORE', sessionType: 'LECTURE' },
  { code: 'ENG101', title: 'Academic Writing', creditHours: 3, semesterSlot: 1, type: 'GENERAL', sessionType: 'LECTURE' },
];

const TEACHERS = [
  {
    username: 'teacher1',
    email: 'teacher1@campusone.edu',
    name: 'Dr. Sana Ahmed',
    employeeId: 'T-001',
    designation: 'Assistant Professor',
  },
  {
    username: 'teacher2',
    email: 'teacher2@campusone.edu',
    name: 'Mr. Bilal Khan',
    employeeId: 'T-002',
    designation: 'Lecturer',
  },
];

const STUDENTS = [
  { username: 'student1', email: 'student1@campusone.edu', name: 'Ali Raza', studentId: 'CS-001' },
  { username: 'student2', email: 'student2@campusone.edu', name: 'Fatima Noor', studentId: 'CS-002' },
  { username: 'student3', email: 'student3@campusone.edu', name: 'Usman Tariq', studentId: 'CS-003' },
  { username: 'student4', email: 'student4@campusone.edu', name: 'Hira Malik', studentId: 'CS-004' },
  { username: 'student5', email: 'student5@campusone.edu', name: 'Ahmed Hassan', studentId: 'CS-005' },
];

const ROOMS = [
  { code: 'R1', name: 'Lecture Room 1', type: 'LECTURE', capacity: 30, building: 'Block', floor: 1 },
  { code: 'R2', name: 'Lecture Room 2', type: 'LECTURE', capacity: 30, building: 'Block', floor: 1 },
  { code: 'LAB1', name: 'Lab 1', type: 'LAB', capacity: 25, building: 'Block', floor: 2 },
];

const daysFromNow = (days) => new Date(NOW.getTime() + days * 24 * 60 * 60 * 1000);
const isoDate = (daysOffset) => daysFromNow(daysOffset).toISOString().slice(0, 10);

const ensureUser = async (data, hash) => prisma.user.upsert({
  where: { username: data.username },
  update: {},
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
  console.log('\n🌱 Seeding compact CampusOne dataset…\n');
  const hash = await bcrypt.hash(PASS, 10);

  const department = await prisma.department.upsert({
    where: { code: DEPARTMENT.code },
    update: {},
    create: DEPARTMENT,
  });

  const totalCredits = COURSES.reduce((sum, course) => sum + course.creditHours, 0);
  const program = await prisma.program.upsert({
    where: { programCode: PROGRAM.code },
    update: {},
    create: {
      programCode: PROGRAM.code,
      name: PROGRAM.name,
      type: 'BACHELOR',
      totalSemesters: 1,
      totalCredits,
      departmentId: department.id,
    },
  });

  const curriculum = await prisma.curriculum.upsert({
    where: { programId_version: { programId: program.id, version: PROGRAM.version } },
    update: {},
    create: {
      programId: program.id,
      version: PROGRAM.version,
      effectiveFromYear: 2026,
      totalCredits,
      isActive: true,
    },
  });

  const teacherRecords = [];
  for (const teacherDef of TEACHERS) {
    const user = await ensureUser({ ...teacherDef, role: 'teacher' }, hash);
    const teacher = await prisma.teacher.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        employeeId: teacherDef.employeeId,
        designation: teacherDef.designation,
        qualification: teacherDef.designation.includes('Professor') ? 'PhD' : 'MS',
        officeRoom: '201',
        officeHours: 'Mon-Wed 10:00-12:00',
        user: { connect: { id: user.id } },
        department: { connect: { id: department.id } },
      },
    });
    teacherRecords.push({ ...teacherDef, user, teacher });
  }

  await prisma.department.update({ where: { id: department.id }, data: { hodTeacherId: teacherRecords[0].teacher.id } });

  const studentRecords = [];
  for (const [index, studentDef] of STUDENTS.entries()) {
    const user = await ensureUser({ ...studentDef, role: 'student' }, hash);
    const student = await prisma.student.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        studentId: studentDef.studentId,
        enrollmentYear: 2026,
        batch: 'SP26',
        currentSemester: 1,
        phone: `+9230010000${index}`,
        address: 'Seed Block, CampusOne Town',
        emergencyContact: '+923009999999',
        dateOfBirth: new Date(`2006-0${(index % 5) + 1}-15T00:00:00.000Z`),
        user: { connect: { id: user.id } },
        department: { connect: { id: department.id } },
        program: { connect: { id: program.id } },
        curriculum: { connect: { id: curriculum.id } },
      },
    });
    studentRecords.push({ ...studentDef, user, student });
  }

  const courseRecords = {};
  for (const courseDef of COURSES) {
    const course = await prisma.course.upsert({
      where: { code: courseDef.code },
      update: { sessionType: courseDef.sessionType },
      create: {
        code: courseDef.code,
        title: courseDef.title,
        creditHours: courseDef.creditHours,
        departmentId: department.id,
        sessionType: courseDef.sessionType,
      },
    });
    courseRecords[courseDef.code] = course;

    await prisma.curriculumCourse.upsert({
      where: { curriculumId_courseId: { curriculumId: curriculum.id, courseId: course.id } },
      update: {},
      create: {
        curriculumId: curriculum.id,
        courseId: course.id,
        semesterSlot: courseDef.semesterSlot,
        type: courseDef.type,
        isElective: false,
      },
    });

    const template = getTemplate(courseDef.sessionType);
    for (const row of template) {
      await prisma.courseGradeComponent.upsert({
        where: { courseId_kind: { courseId: course.id, kind: row.kind } },
        update: {},
        create: { courseId: course.id, ...row },
      });
    }
  }

  const term = await prisma.term.upsert({
    where: { code: TERM.code },
    update: {},
    create: { ...TERM, isActive: true },
  });

  const roomRecords = {};
  for (const roomDef of ROOMS) {
    roomRecords[roomDef.code] = await prisma.room.upsert({
      where: { code: roomDef.code },
      update: {},
      create: roomDef,
    });
  }

  const offeringBlueprints = [
    { courseCode: 'CS101', section: 'M1', teacherIndex: 0, sessions: [{ dayOfWeek: 'MON', slotIndex: 1, roomCode: 'R1' }, { dayOfWeek: 'WED', slotIndex: 1, roomCode: 'R1' }] },
    { courseCode: 'CS101L', section: 'M1', teacherIndex: 0, sessions: [{ dayOfWeek: 'FRI', slotIndex: 2, roomCode: 'LAB1' }] },
    { courseCode: 'MTH101', section: 'M1', teacherIndex: 1, sessions: [{ dayOfWeek: 'TUE', slotIndex: 1, roomCode: 'R2' }, { dayOfWeek: 'THU', slotIndex: 1, roomCode: 'R2' }] },
    { courseCode: 'ENG101', section: 'M1', teacherIndex: 1, sessions: [{ dayOfWeek: 'MON', slotIndex: 3, roomCode: 'R2' }, { dayOfWeek: 'WED', slotIndex: 3, roomCode: 'R2' }] },
  ];

  const offerings = [];
  for (const blueprint of offeringBlueprints) {
    const offering = await prisma.courseOffering.upsert({
      where: {
        courseId_termId_section: {
          courseId: courseRecords[blueprint.courseCode].id,
          termId: term.id,
          section: blueprint.section,
        },
      },
      update: {},
      create: {
        courseId: courseRecords[blueprint.courseCode].id,
        termId: term.id,
        teacherId: teacherRecords[blueprint.teacherIndex].teacher.id,
        section: blueprint.section,
        capacity: 10,
      },
      include: { course: true },
    });
    offerings.push(offering);

    for (const session of blueprint.sessions) {
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

  for (const offering of offerings) {
    for (const record of studentRecords) {
      await prisma.enrollment.upsert({
        where: {
          studentId_offeringId: {
            studentId: record.student.id,
            offeringId: offering.id,
          },
        },
        update: {},
        create: {
          studentId: record.student.id,
          offeringId: offering.id,
          status: 'ENROLLED',
        },
      });
    }
  }

  for (const [index, offering] of offerings.entries()) {
    await prisma.assignment.upsert({
      where: { id: `assignment-${offering.id}` },
      update: {},
      create: {
        id: `assignment-${offering.id}`,
        offeringId: offering.id,
        title: `${offering.course.code} Assignment 1`,
        description: 'Starter assignment created by the  seed script.',
        totalMarks: 100,
        dueDate: daysFromNow(4 + index),
        allowLate: true,
        status: 'PUBLISHED',
      },
    });
  }

  const openQuizOffering = offerings[0];
  const upcomingQuizOffering = offerings[2];

  await prisma.quiz.upsert({
    where: { id: `quiz-open-${openQuizOffering.id}` },
    update: {},
    create: {
      id: `quiz-open-${openQuizOffering.id}`,
      offeringId: openQuizOffering.id,
      title: `${openQuizOffering.course.code} Diagnostic Quiz`,
      description: 'Currently available sample quiz.',
      totalMarks: 10,
      durationMinutes: 20,
      startAt: daysFromNow(-1),
      endAt: daysFromNow(2),
      status: 'PUBLISHED',
      allowReview: true,
      questions: {
        create: [
          {
            type: 'MCQ',
            questionText: 'Which device performs arithmetic and logic operations?',
            options: ['Monitor', 'CPU', 'Keyboard', 'Printer'],
            correctAnswer: 1,
            marks: 5,
            order: 1,
          },
          {
            type: 'TRUE_FALSE',
            questionText: 'Binary uses only 0 and 1.',
            options: ['True', 'False'],
            correctAnswer: 0,
            marks: 5,
            order: 2,
          },
        ],
      },
    },
  });

  await prisma.quiz.upsert({
    where: { id: `quiz-upcoming-${upcomingQuizOffering.id}` },
    update: {},
    create: {
      id: `quiz-upcoming-${upcomingQuizOffering.id}`,
      offeringId: upcomingQuizOffering.id,
      title: `${upcomingQuizOffering.course.code} Quiz 1`,
      description: 'Upcoming sample quiz for teacher and student dashboards.',
      totalMarks: 10,
      durationMinutes: 20,
      startAt: daysFromNow(2),
      endAt: daysFromNow(4),
      status: 'PUBLISHED',
      allowReview: true,
      questions: {
        create: [
          {
            type: 'MCQ',
            questionText: 'What is the derivative of x^2?',
            options: ['x', '2x', 'x^2', '2'],
            correctAnswer: 1,
            marks: 10,
            order: 1,
          },
        ],
      },
    },
  });

  await prisma.announcement.upsert({
    where: { id: 'announcement-welcome' },
    update: {},
    create: {
      id: 'announcement-welcome',
      title: 'Welcome to the  Seed Term',
      content: 'This is a compact seeded term with only a few users, courses, and activities for quick local testing.',
      priority: 'medium',
      targetAudience: 'all',
      createdBy: teacherRecords[0].user.id,
    },
  });

  await prisma.qnaThread.upsert({
    where: { id: 'qna-thread-1' },
    update: {},
    create: {
      id: 'qna-thread-1',
      offeringId: offerings[0].id,
      askedById: studentRecords[0].user.id,
      title: 'Will lecture slides be uploaded?',
      body: 'Please share the first week slides in the resources area when available.',
      status: 'OPEN',
      replies: {
        create: {
          authorId: teacherRecords[0].user.id,
          body: 'Yes, I will upload them after the next class.',
        },
      },
    },
  });

  for (const record of studentRecords) {
    await prisma.attendance.upsert({
      where: {
        offeringId_studentId_date: {
          offeringId: offerings[0].id,
          studentId: record.student.id,
          date: isoDate(-2),
        },
      },
      update: {},
      create: {
        offeringId: offerings[0].id,
        studentId: record.student.id,
        date: isoDate(-2),
        status: record.studentId === 'CS-005' ? 'LATE' : 'PRESENT',
        markedBy: teacherRecords[0].teacher.id,
      },
    });
  }

  console.log('seed complete.');
  console.log(`Default password for seeded users: ${PASS}`);
  console.log('Teachers: teacher1, teacher2');
  console.log('Students: student1 ... student5');
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