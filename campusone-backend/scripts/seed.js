/**
 * Focused CampusOne test seed.
 *
 * Creates a focused two-semester test setup with:
 * - 1 super admin
 * - 1 teacher
 * - 10 students split between semester 1 and semester 3
 * - 1 active term with 2 courses and offerings
 * - 1 approved semester-3 TA assigned to the semester-1 offering
 * - configured grade components without seeded assignments or quizzes
 * - timetable data with rooms, master schedule config, and weekly class sessions
 *
 * This script clears all application data before seeding.
 */

import bcrypt from 'bcryptjs';
import prisma from '../prisma/client.js';
import { getTemplate } from '../utils/gradeTemplates.js';

const PASSWORD = 'Campus@123';
const now = new Date();

const at = ({ days = 0, hours = 0, minutes = 0 } = {}) => new Date(
  now.getTime()
  + days * 24 * 60 * 60 * 1000
  + hours * 60 * 60 * 1000
  + minutes * 60 * 1000
);

const STUDENTS = [
  ['student01', 'Student Seed 01', 'FA26-BSCS-001', 1, 'FA26'],
  ['student02', 'Student Seed 02', 'FA26-BSCS-002', 1, 'FA26'],
  ['student03', 'Student Seed 03', 'FA26-BSCS-003', 1, 'FA26'],
  ['student04', 'Student Seed 04', 'FA26-BSCS-004', 1, 'FA26'],
  ['student05', 'Student Seed 05', 'FA26-BSCS-005', 1, 'FA26'],
  ['student06', 'Student Seed 06', 'FA25-BSCS-006', 3, 'FA25'],
  ['student07', 'Student Seed 07', 'FA25-BSCS-007', 3, 'FA25'],
  ['student08', 'Student Seed 08', 'FA25-BSCS-008', 3, 'FA25'],
  ['student09', 'Student Seed 09', 'FA25-BSCS-009', 3, 'FA25'],
  ['student10', 'Student Seed 10', 'FA25-BSCS-010', 3, 'FA25'],
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

const configureCourseGrading = (course) => prisma.courseGradeComponent.createMany({
  data: getTemplate(course.sessionType).map((component) => ({
    ...component,
    courseId: course.id,
  })),
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
    name: 'Dr. Faculty Seed',
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
      description: 'First-semester course ready for teacher-created assignments and quizzes.',
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
  await configureCourseGrading(semesterOneCourse);
  await configureCourseGrading(semesterThreeCourse);

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
        phone: `+1-555-20${String(index + 1).padStart(2, '0')}`,
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

  console.log('\nFocused CampusOne test database is ready.');
  console.log(`Default password: ${PASSWORD}`);
  console.log('Admin:   admin');
  console.log('Teacher: teacher');
  console.log('Students: student01 through student10');
  console.log('Semester 1: student01-student05 enrolled in CS101 Programming Fundamentals, Section 1A');
  console.log('Semester 3: student06-student10 enrolled in CS201 Data Structures, Section 3A');
  console.log('TA: student06 is approved for CS101 Programming Fundamentals');
  console.log('Assignments and quizzes: none seeded; create them manually from the teacher UI');
  console.log('Schedule config: default 90-minute lectures, 15-minute breaks, Monday-Saturday');
  console.log('CS101 timetable: MON S1, WED S2, FRI S1 in LH-101');
  console.log('CS201 timetable: TUE S1, THU S2, SAT S1 in LH-101');
  console.log('\nSuggested tests:');
  console.log('- teacher: create assignments/quizzes for CS101 and CS201 from a clean assessment slate');
  console.log('- student01-student05: use clean semester-1 accounts for new assignment and quiz attempts');
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
