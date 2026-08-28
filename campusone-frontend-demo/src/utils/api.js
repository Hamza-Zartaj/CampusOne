import { clone, loadDemoStore, nextDemoId, saveDemoStore, writeDemoStore } from '../data/demoStore.js';
import { dateOnly, dateTime, textDataUrl } from '../data/mockData.js';

export const clearAllApiCache = () => {};

const ok = (data) => Promise.resolve({ data });
const dataOk = (data, extra = {}) => ok({ success: true, data, ...extra });
const fail = (message, status = 400, extra = {}) => Promise.reject({
  response: { status, data: { message, ...extra } },
});

const compact = (value) => {
  if (value === undefined || value === null) return '';
  return String(value).trim().toLowerCase();
};

const parseStoredUser = () => {
  if (typeof localStorage === 'undefined') return null;
  try {
    return JSON.parse(localStorage.getItem('user') || 'null');
  } catch {
    return null;
  }
};

const findById = (items, id) => items.find((item) => item.id === id);
const sortByDateDesc = (items, key = 'createdAt') => [...items].sort((a, b) => new Date(b[key] || 0) - new Date(a[key] || 0));

const normalizeStatus = (status) => String(status || '').toUpperCase().replace(/\s+/g, '_');

const admissionDisplayStatus = (status) => ({
  PENDING: 'Pending',
  UNDER_REVIEW: 'Under Review',
  ACCEPTED: 'Accepted',
  REJECTED: 'Rejected',
  WAITLISTED: 'Waitlisted',
}[normalizeStatus(status)] || status || 'Pending');

const userPublic = (user) => {
  if (!user) return null;
  const {
    password: _password,
    permissions: _permissions,
    isSuperAdmin: _isSuperAdmin,
    ...publicUser
  } = user;
  return publicUser;
};

const departmentById = (store, id) => findById(store.departments, id);
const programById = (store, id) => findById(store.programs, id);
const courseById = (store, id) => findById(store.courses, id);
const termById = (store, id) => findById(store.terms, id);
const roomById = (store, id) => findById(store.rooms, id);
const studentById = (store, id) => findById(store.students, id);
const teacherById = (store, id) => findById(store.teachers, id);
const userById = (store, id) => findById(store.users, id);
const offeringById = (store, id) => findById(store.offerings, id);

const expandDepartment = (store, department) => {
  if (!department) return null;
  const hod = teacherById(store, department.hodTeacherId);
  return {
    ...clone(department),
    hod: hod ? expandTeacher(store, hod) : null,
    _count: {
      programs: store.programs.filter((program) => program.departmentId === department.id).length,
      courses: store.courses.filter((course) => course.departmentId === department.id).length,
      students: store.students.filter((student) => student.departmentId === department.id).length,
    },
  };
};

const expandProgram = (store, program) => {
  if (!program) return null;
  return {
    ...clone(program),
    department: expandDepartment(store, departmentById(store, program.departmentId)),
    _count: {
      students: store.students.filter((student) => student.programId === program.id).length,
    },
  };
};

const courseGradeComponents = (store, courseId) => (
  store.gradeComponents
    .filter((component) => component.courseId === courseId)
    .sort((left, right) => Number(left.orderIndex) - Number(right.orderIndex))
    .map(clone)
);

const expandCourseBasic = (store, course) => {
  if (!course) return null;
  return {
    ...clone(course),
    department: expandDepartment(store, departmentById(store, course.departmentId)),
  };
};

const expandCourse = (store, course) => {
  if (!course) return null;
  return {
    ...expandCourseBasic(store, course),
    prerequisites: (course.prerequisiteIds || [])
      .map((id) => expandCourseBasic(store, courseById(store, id)))
      .filter(Boolean),
    gradeComponents: courseGradeComponents(store, course.id),
  };
};

const expandTeacher = (store, teacher) => {
  if (!teacher) return null;
  const user = userById(store, teacher.userId);
  return {
    ...clone(teacher),
    user: userPublic(user),
    department: expandDepartmentShallow(store, departmentById(store, teacher.departmentId)),
  };
};

const expandDepartmentShallow = (_store, department) => (department ? clone(department) : null);

const expandStudent = (store, student) => {
  if (!student) return null;
  return {
    ...clone(student),
    user: userPublic(userById(store, student.userId)),
    department: expandDepartmentShallow(store, departmentById(store, student.departmentId)),
    program: expandProgramShallow(store, programById(store, student.programId)),
  };
};

const expandProgramShallow = (store, program) => {
  if (!program) return null;
  return {
    ...clone(program),
    department: expandDepartmentShallow(store, departmentById(store, program.departmentId)),
  };
};

const expandOffering = (store, offering) => {
  if (!offering) return null;
  const sessions = (offering.sessions || []).map((session) => ({
    ...clone(session),
    room: roomById(store, session.roomId) ? clone(roomById(store, session.roomId)) : null,
  }));
  return {
    ...clone(offering),
    course: expandCourse(store, courseById(store, offering.courseId)),
    term: termById(store, offering.termId) ? clone(termById(store, offering.termId)) : null,
    teacher: expandTeacher(store, teacherById(store, offering.teacherId)),
    sessions,
    schedule: sessions.map((session) => ({
      day: session.dayOfWeek,
      dayOfWeek: session.dayOfWeek,
      slotIndex: session.slotIndex,
      room: session.room,
    })),
    _count: {
      enrollments: store.enrollments.filter((enrollment) => (
        enrollment.offeringId === offering.id && enrollment.status !== 'DROPPED'
      )).length,
    },
  };
};

const expandEnrollment = (store, enrollment) => {
  if (!enrollment) return null;
  return {
    ...clone(enrollment),
    student: expandStudent(store, studentById(store, enrollment.studentId)),
    offering: expandOffering(store, offeringById(store, enrollment.offeringId)),
  };
};

const currentUserRecord = (store) => {
  const stored = parseStoredUser();
  if (!stored?.id) return null;
  return userById(store, stored.id);
};

const currentStudent = (store) => {
  const user = currentUserRecord(store);
  return user?.role === 'student' ? store.students.find((student) => student.userId === user.id) : null;
};

const currentTeacher = (store) => {
  const user = currentUserRecord(store);
  return user?.role === 'teacher' ? store.teachers.find((teacher) => teacher.userId === user.id) : null;
};

const currentAdmin = (store) => {
  const user = currentUserRecord(store);
  return user?.role === 'admin' ? user : null;
};

const publicUserWithRoleData = (store, user) => ({
  ...userPublic(user),
  trustedDevices: [
    {
      id: 'device_demo',
      browser: 'Current browser',
      location: 'Frontend demo',
      lastUsedAt: dateTime(0, 9),
    },
  ],
  roleData: roleDataForUser(store, user),
});

const roleDataForUser = (store, user) => {
  if (!user) return null;

  if (user.role === 'admin') {
    return {
      isSuperAdmin: !!user.isSuperAdmin,
      permissions: user.permissions || [],
    };
  }

  if (user.role === 'teacher') {
    const teacher = store.teachers.find((item) => item.userId === user.id);
    if (!teacher) return null;
    const teachingCourses = store.offerings
      .filter((offering) => offering.teacherId === teacher.id)
      .map((offering) => expandOffering(store, offering));
    return {
      ...expandTeacher(store, teacher),
      department: departmentById(store, teacher.departmentId)?.name || '',
      teachingCourses,
    };
  }

  const student = store.students.find((item) => item.userId === user.id);
  if (!student) return null;
  const enrolledCourses = store.enrollments
    .filter((enrollment) => enrollment.studentId === student.id)
    .map((enrollment) => ({
      ...clone(enrollment),
      courseId: expandCourse(store, courseById(store, offeringById(store, enrollment.offeringId)?.courseId)),
      offering: expandOffering(store, offeringById(store, enrollment.offeringId)),
    }));

  return {
    ...expandStudent(store, student),
    department: departmentById(store, student.departmentId)?.name || '',
    program: programById(store, student.programId)?.name || '',
    enrolledCourses,
  };
};

const syncStoredUser = (store, user) => {
  if (typeof localStorage === 'undefined' || !user) return;
  const stored = parseStoredUser();
  if (!stored?.id || stored.id !== user.id) return;
  const roleData = roleDataForUser(store, user);
  localStorage.setItem('user', JSON.stringify({
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    role: user.role,
    profilePicture: user.profilePicture || '',
    isSuperAdmin: roleData?.isSuperAdmin,
    permissions: roleData?.permissions || [],
    authenticated: true,
  }));
};

const offeringIdsForStudent = (store, studentId) => new Set(
  store.enrollments
    .filter((enrollment) => enrollment.studentId === studentId && enrollment.status !== 'DROPPED')
    .map((enrollment) => enrollment.offeringId)
);

const accessibleTeacherOfferingIds = (store, permission = null) => {
  const teacher = currentTeacher(store);
  if (teacher) {
    return new Set(store.offerings.filter((offering) => offering.teacherId === teacher.id).map((offering) => offering.id));
  }

  const student = currentStudent(store);
  if (student) {
    return new Set(store.taApplications
      .filter((app) => (
        app.studentId === student.id
        && app.status === 'APPROVED'
        && (!permission || (app.permissions || []).includes(permission))
      ))
      .map((app) => app.offeringId));
  }

  return new Set();
};

const formToObject = (payload) => {
  if (typeof FormData !== 'undefined' && payload instanceof FormData) {
    const out = {};
    payload.forEach((value, key) => {
      if (out[key] === undefined) out[key] = value;
      else if (Array.isArray(out[key])) out[key].push(value);
      else out[key] = [out[key], value];
    });
    return out;
  }
  return payload || {};
};

const fileToUrl = (file, fallback = 'CampusOne demo file') => {
  if (!file || typeof file !== 'object' || !file.name || !file.size) return Promise.resolve(textDataUrl(fallback));
  if (typeof FileReader === 'undefined') return Promise.resolve(textDataUrl(file.name));

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve(textDataUrl(file.name));
    reader.readAsDataURL(file);
  });
};

const getFileName = (file, fallback) => (file && typeof file === 'object' && file.name ? file.name : fallback);

const expandAnnouncement = (store, announcement) => ({
  ...clone(announcement),
  author: userPublic(userById(store, announcement.createdById)),
  createdBy: userPublic(userById(store, announcement.createdById)),
  offering: announcement.offeringId ? expandOffering(store, offeringById(store, announcement.offeringId)) : null,
});

const currentUserAnnouncementFilter = (store, announcement) => {
  const user = currentUserRecord(store);
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (announcement.targetAudience === 'all') return true;
  if (announcement.targetAudience === 'students') return user.role === 'student';
  if (announcement.targetAudience === 'teachers') return user.role === 'teacher';
  if (announcement.targetAudience === 'course') {
    if (user.role === 'teacher') {
      const teacher = currentTeacher(store);
      return teacher && offeringById(store, announcement.offeringId)?.teacherId === teacher.id;
    }
    const student = currentStudent(store);
    return student && offeringIdsForStudent(store, student.id).has(announcement.offeringId);
  }
  return true;
};

const expandNotification = (notification) => ({
  ...clone(notification),
  body: notification.body || notification.message,
  message: notification.message || notification.body,
  linkUrl: notification.linkUrl || notification.link,
});

const attendanceCounts = (records, leavePolicy, approvedLeaves = 0) => {
  const present = records.filter((record) => record.status === 'PRESENT').length;
  const late = records.filter((record) => record.status === 'LATE').length;
  const absent = records.filter((record) => record.status === 'ABSENT').length;
  const excusedAbsent = records.filter((record) => record.status === 'EXCUSED_ABSENT').length;
  const totalSessions = records.length;
  const countedAbsent = absent + late * Number(leavePolicy.lateWeight || 0.5);
  const effectiveTotalSessions = Math.max(0, totalSessions - (leavePolicy.excusedAbsenceReducesTotal ? excusedAbsent : 0));
  const attendedUnits = present + late * 0.5;
  const percentage = effectiveTotalSessions ? Math.round((attendedUnits / effectiveTotalSessions) * 1000) / 10 : 100;
  const n = Math.max(0, countedAbsent - approvedLeaves);
  let band = 'free';
  if (n > Number(leavePolicy.fineQuota || 6)) band = 'drop';
  else if (n > Number(leavePolicy.freeQuota || 4)) band = 'fined';
  return {
    totalSessions,
    effectiveTotalSessions,
    total: totalSessions,
    present,
    late,
    absent,
    countedAbsent,
    excusedAbsent,
    percentage,
    isAtRisk: percentage < 75 || band === 'drop',
    approvedLeaveDays: approvedLeaves,
    n,
    band,
    dropOff: Math.max(0, Number(leavePolicy.fineQuota || 6) - n),
  };
};

const attendanceForEnrollment = (store, enrollment) => {
  const applications = store.leaveApplications.filter((app) => (
    app.enrollmentId === enrollment.id && app.status === 'APPROVED'
  ));
  const approvedLeaves = applications.length;
  const records = store.attendanceRecords
    .filter((record) => record.enrollmentId === enrollment.id)
    .map((record) => ({
      ...clone(record),
      isExcused: record.status === 'EXCUSED_ABSENT',
    }));
  return attendanceCounts(records, store.leavePolicy, approvedLeaves);
};

const expandAssignment = (store, assignment) => ({
  ...clone(assignment),
  offering: expandOffering(store, offeringById(store, assignment.offeringId)),
  _count: {
    submissions: store.assignmentSubmissions.filter((sub) => sub.assignmentId === assignment.id).length,
  },
});

const expandAssignmentSubmission = (store, submission) => ({
  ...clone(submission),
  student: expandStudent(store, studentById(store, submission.studentId)),
  pendingGrades: (submission.pendingGrades || []).map((pending) => ({
    ...clone(pending),
    taStudent: expandStudent(store, studentById(store, pending.taStudentId)),
  })),
});

const assignmentSubmissionForStudent = (store, assignmentId, studentId) => (
  store.assignmentSubmissions.find((submission) => submission.assignmentId === assignmentId && submission.studentId === studentId)
);

const expandQuiz = (store, quiz) => ({
  ...clone(quiz),
  offering: expandOffering(store, offeringById(store, quiz.offeringId)),
  _count: {
    questions: (quiz.questions || []).length,
    attempts: store.quizAttempts.filter((attempt) => attempt.quizId === quiz.id).length,
  },
});

const expandQuizAttempt = (store, attempt) => ({
  ...clone(attempt),
  student: expandStudent(store, studentById(store, attempt.studentId)),
  attempt: clone(attempt),
});

const scoreQuizAttempt = (quiz, answers) => {
  let totalScore = 0;
  const scored = answers.map((answer) => {
    const question = quiz.questions.find((item) => item.id === answer.questionId);
    if (!question) return answer;
    if (question.type === 'SHORT') {
      return {
        ...answer,
        isCorrect: answer.isCorrect ?? null,
        marksAwarded: answer.marksAwarded ?? null,
      };
    }
    const isCorrect = Number(answer.answer) === Number(question.correctAnswer);
    const marksAwarded = isCorrect ? Number(question.marks || 0) : 0;
    totalScore += marksAwarded;
    return { ...answer, isCorrect, marksAwarded };
  });
  scored.forEach((answer) => {
    const question = quiz.questions.find((item) => item.id === answer.questionId);
    if (question?.type === 'SHORT' && Number.isFinite(Number(answer.marksAwarded))) {
      totalScore += Number(answer.marksAwarded);
    }
  });
  return { totalScore, scored };
};

const quizAttemptAnswers = (store, attemptId) => (
  store.quizAnswers.filter((answer) => answer.attemptId === attemptId).map((answer) => ({
    ...clone(answer),
    taPendingGrades: (answer.taPendingGrades || []).map((pending) => ({
      ...clone(pending),
      taStudent: expandStudent(store, studentById(store, pending.taStudentId)),
    })),
  }))
);

const studentTranscript = (store, studentId) => {
  const student = expandStudent(store, studentById(store, studentId));
  const pastCourses = [
    { code: 'CS201', title: 'Data Structures', creditHours: 3, totalMarks: 88, gradeLetter: 'A', gradePoints: 4.0 },
    { code: 'SE203', title: 'Object Oriented Software Engineering', creditHours: 3, totalMarks: 82, gradeLetter: 'A-', gradePoints: 3.7 },
    { code: 'MTH205', title: 'Linear Algebra', creditHours: 3, totalMarks: 76, gradeLetter: 'B+', gradePoints: 3.3 },
    { code: 'HUM101', title: 'Communication Skills', creditHours: 2, totalMarks: 91, gradeLetter: 'A', gradePoints: 4.0 },
  ];
  return {
    student,
    terms: [
      {
        term: { code: 'SP26', academicYear: '2025-2026' },
        termGPA: 3.72,
        termCredits: 11,
        courses: pastCourses,
      },
      {
        term: { code: 'FA26', academicYear: '2026-2027' },
        termGPA: null,
        termCredits: store.enrollments
          .filter((enrollment) => enrollment.studentId === studentId)
          .reduce((sum, enrollment) => sum + Number(courseById(store, offeringById(store, enrollment.offeringId)?.courseId)?.creditHours || 0), 0),
        courses: store.enrollments
          .filter((enrollment) => enrollment.studentId === studentId)
          .map((enrollment) => {
            const offering = offeringById(store, enrollment.offeringId);
            const course = courseById(store, offering?.courseId);
            return {
              code: course?.code,
              title: course?.title,
              creditHours: course?.creditHours,
              totalMarks: null,
              gradeLetter: 'IP',
              gradePoints: null,
            };
          }),
      },
    ],
    cgpa: student?.cgpa || 0,
    completedCredits: 67,
    totalRequiredCredits: programById(store, studentById(store, studentId)?.programId)?.totalCredits || 130,
  };
};

const runningGradeForEnrollment = (store, enrollment) => {
  const offering = offeringById(store, enrollment.offeringId);
  const course = courseById(store, offering?.courseId);
  const components = courseGradeComponents(store, course?.id);
  const marks = markComponentsForEnrollment(store, enrollment);

  let earnedPercent = 0;
  let gradedWeight = 0;
  const breakdown = components.map((component) => {
    const componentMarks = marks.filter((mark) => mark.kind === component.kind);
    const graded = componentMarks.filter((mark) => mark.obtainedMarks !== null && mark.obtainedMarks !== undefined);
    let earned = 0;
    if (graded.length) {
      const ratios = graded.map((mark) => Number(mark.totalMarks) ? Number(mark.obtainedMarks) / Number(mark.totalMarks) : 0);
      const ratio = component.aggregation === 'AVERAGE'
        ? ratios.reduce((sum, item) => sum + item, 0) / ratios.length
        : ratios[0];
      earned = ratio * Number(component.weightPercent || 0);
      earnedPercent += earned;
      gradedWeight += Number(component.weightPercent || 0);
    }
    return {
      ...clone(component),
      gradedCount: graded.length,
      totalCount: Number(component.count || 0),
      earnedPercent: graded.length ? Math.round((earned / Number(component.weightPercent || 1)) * 1000) / 10 : null,
      contribution: Math.round(earned * 10) / 10,
    };
  });

  return {
    earnedPercent: Math.round(earnedPercent * 10) / 10,
    gradedWeight,
    breakdown,
  };
};

const assignmentMarksForEnrollment = (store, enrollment) => {
  const assignments = store.assignments.filter((assignment) => assignment.offeringId === enrollment.offeringId);
  return assignments.map((assignment) => {
    const submission = assignmentSubmissionForStudent(store, assignment.id, enrollment.studentId);
    return {
      id: `mark_${assignment.id}_${enrollment.studentId}`,
      enrollmentId: enrollment.id,
      offeringId: enrollment.offeringId,
      studentId: enrollment.studentId,
      kind: 'ASSIGNMENT',
      index: Number(assignment.componentIndex || 1),
      title: assignment.title,
      date: assignment.dueDate?.slice(0, 10),
      totalMarks: Number(assignment.totalMarks || 0),
      obtainedMarks: submission?.obtainedMarks ?? null,
      fileUrl: assignment.attachmentUrl,
      fileName: assignment.attachmentName,
      submissionFileUrl: submission?.attachmentUrl,
      submissionFileName: submission?.attachmentName,
    };
  });
};

const quizMarksForEnrollment = (store, enrollment) => {
  const quizzes = store.quizzes.filter((quiz) => quiz.offeringId === enrollment.offeringId);
  return quizzes.map((quiz) => {
    const attempt = store.quizAttempts.find((item) => item.quizId === quiz.id && item.studentId === enrollment.studentId);
    return {
      id: `mark_${quiz.id}_${enrollment.studentId}`,
      enrollmentId: enrollment.id,
      offeringId: enrollment.offeringId,
      studentId: enrollment.studentId,
      kind: 'QUIZ',
      index: Number(quiz.componentIndex || 1),
      title: quiz.title,
      date: quiz.endAt?.slice(0, 10),
      totalMarks: Number(quiz.totalMarks || 0),
      obtainedMarks: attempt?.totalScore ?? null,
    };
  });
};

const markComponentsForEnrollment = (store, enrollment) => [
  ...assignmentMarksForEnrollment(store, enrollment),
  ...quizMarksForEnrollment(store, enrollment),
  ...store.markCells.filter((mark) => mark.enrollmentId === enrollment.id).map(clone),
];

const unreadForUser = (store, userId) => (
  store.notifications.filter((notification) => notification.userId === userId && !notification.isRead).length
);

const addNotification = (store, userId, input) => {
  store.notifications.unshift({
    id: nextDemoId('notif'),
    userId,
    title: input.title,
    message: input.message || input.body || '',
    body: input.body || input.message || '',
    type: input.type || 'GENERAL',
    link: input.link || input.linkUrl || '',
    linkUrl: input.linkUrl || input.link || '',
    isRead: false,
    createdAt: new Date().toISOString(),
  });
};

const addAudit = (store, input) => {
  const user = currentUserRecord(store);
  store.auditLogs.unshift({
    id: nextDemoId('audit'),
    createdAt: new Date().toISOString(),
    action: input.action || 'UPDATE',
    category: input.category || 'Demo',
    performedByRole: user?.role || 'demo',
    performerId: user?.id || null,
    targetModel: input.targetModel || 'DemoRecord',
    targetId: input.targetId || '',
    description: input.description || 'Demo action recorded locally.',
    previousValue: input.previousValue ?? null,
    newValue: input.newValue ?? null,
  });
};

const makeSlots = (store) => {
  const config = store.scheduleConfig;
  const [startHour, startMinute] = String(config.dayStartTime || '08:30').split(':').map(Number);
  const slotFor = (index, day = null) => {
    const dayConfig = day && config.dayOverrides?.[day] ? { ...config, ...config.dayOverrides[day] } : config;
    const [baseHour, baseMinute] = String(dayConfig.dayStartTime || `${startHour}:${startMinute}`).split(':').map(Number);
    const start = new Date();
    start.setHours(baseHour, baseMinute + (index - 1) * (Number(config.lectureDurationMin) + Number(config.breakDurationMin)), 0, 0);
    const end = new Date(start);
    end.setMinutes(end.getMinutes() + Number(config.lectureDurationMin || 75));
    const fmt = (date) => `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    return { index, start: fmt(start), end: fmt(end) };
  };

  return Object.fromEntries((config.workingDays || []).map((day) => [
    day,
    Array.from({ length: config.dayOverrides?.[day]?.regularLecturesPerDay || config.regularLecturesPerDay || 5 }, (_, index) => slotFor(index + 1, day)),
  ]));
};

const createCsvBlob = (content, type = 'text/csv;charset=utf-8') => (
  typeof Blob === 'undefined' ? content : new Blob([content], { type })
);

export const authAPI = {
  login: (username, password) => {
    const store = loadDemoStore();
    const loginId = compact(username);
    const user = store.users.find((item) => compact(item.email) === loginId || compact(item.username) === loginId);
    if (!user || user.password !== password) {
      return fail('Invalid demo email or password', 401);
    }
    if (!user.isActive) return fail('This demo account is inactive', 403);
    user.lastLogin = new Date().toISOString();
    saveDemoStore(store);
    const roleData = roleDataForUser(store, user);
    return ok({
      success: true,
      token: `demo-token-${user.role}-${Date.now()}`,
      data: {
        user: userPublic(user),
        roleData,
      },
    });
  },
  verify2FA: () => ok({
    success: true,
    token: `demo-token-2fa-${Date.now()}`,
    data: {
      user: userPublic(loadDemoStore().users[0]),
      roleData: roleDataForUser(loadDemoStore(), loadDemoStore().users[0]),
    },
  }),
  getCurrentUser: () => {
    const store = loadDemoStore();
    const user = currentUserRecord(store);
    if (!user) return fail('Not authenticated in demo', 401);
    return dataOk(publicUserWithRoleData(store, user));
  },
  logout: () => ok({ success: true }),
  setup2FA: () => dataOk({ qrCode: textDataUrl('Demo 2FA QR placeholder'), secret: 'DEMO-2FA-SECRET' }),
  enable2FA: () => {
    const store = loadDemoStore();
    const user = currentUserRecord(store);
    if (user) {
      user.twoFactorEnabled = true;
      user.twoFactorMethod = 'authenticator';
      saveDemoStore(store);
      syncStoredUser(store, user);
    }
    return dataOk({ enabled: true });
  },
  disable2FA: () => {
    const store = loadDemoStore();
    const user = currentUserRecord(store);
    if (user) {
      user.twoFactorEnabled = false;
      user.twoFactorMethod = null;
      saveDemoStore(store);
      syncStoredUser(store, user);
    }
    return dataOk({ enabled: false });
  },
  completeFirstTimeSetup: () => dataOk({ complete: true }),
  skip2FASetup: () => dataOk({ skipped: true }),
  setupEmail2FA: () => dataOk({ sent: true, message: 'Demo OTP sent. Use 123456.' }),
  enableEmail2FA: () => dataOk({ enabled: true }),
  sendLoginOTP: () => dataOk({ sent: true }),
  verifyEmailOTP: () => dataOk({ verified: true }),
  forgotPassword: () => dataOk({ sent: true, message: 'Demo reset code: 123456' }),
  verifyResetCode: () => dataOk({ verified: true }),
  resetPassword: () => dataOk({ reset: true }),
  changePassword: (currentPassword, newPassword) => {
    const store = loadDemoStore();
    const user = currentUserRecord(store);
    if (!user) return fail('Not authenticated in demo', 401);
    if (currentPassword && user.password !== currentPassword) return fail('Current password is incorrect', 400);
    user.password = newPassword || user.password;
    user.passwordChangedAt = new Date().toISOString();
    saveDemoStore(store);
    return dataOk({ changed: true });
  },
  sendVerificationOTP: () => dataOk({ sent: true }),
  recoverSuperAdmin: () => dataOk({ recovered: true }),
  updateMyEmail: (email) => {
    const store = loadDemoStore();
    const user = currentUserRecord(store);
    if (!user) return fail('Not authenticated in demo', 401);
    user.email = email;
    saveDemoStore(store);
    syncStoredUser(store, user);
    return dataOk(publicUserWithRoleData(store, user));
  },
  updateMyProfile: (payload) => {
    const store = loadDemoStore();
    const user = currentUserRecord(store);
    if (!user) return fail('Not authenticated in demo', 401);
    Object.assign(user, payload || {});
    saveDemoStore(store);
    syncStoredUser(store, user);
    return dataOk(publicUserWithRoleData(store, user));
  },
  uploadProfilePicture: async (file) => {
    const store = loadDemoStore();
    const user = currentUserRecord(store);
    if (!user) return fail('Not authenticated in demo', 401);
    user.profilePicture = await fileToUrl(file, 'CampusOne demo profile picture');
    saveDemoStore(store);
    syncStoredUser(store, user);
    return dataOk({ profilePicture: user.profilePicture });
  },
  removeProfilePicture: () => {
    const store = loadDemoStore();
    const user = currentUserRecord(store);
    if (user) {
      user.profilePicture = '';
      saveDemoStore(store);
      syncStoredUser(store, user);
    }
    return dataOk({ profilePicture: '' });
  },
};

export const userAPI = {
  getUserStatsByRole: () => {
    const store = loadDemoStore();
    return ok({
      success: true,
      data: {
        admins: store.users.filter((user) => user.role === 'admin').length,
        teachers: store.users.filter((user) => user.role === 'teacher').length,
        students: store.users.filter((user) => user.role === 'student').length,
        tas: store.taApplications.filter((app) => app.status === 'APPROVED').length,
        total: store.users.length,
      },
    });
  },
  searchStudents: (q = '') => {
    const store = loadDemoStore();
    const query = compact(q);
    const rows = store.students
      .filter((student) => {
        const user = userById(store, student.userId);
        return !query || compact(user?.name).includes(query) || compact(user?.email).includes(query) || compact(student.studentId).includes(query);
      })
      .map((student) => expandStudent(store, student));
    return ok({ success: true, data: rows });
  },
  createUser: (payload = {}) => {
    const role = payload.role || 'student';
    const id = nextDemoId('usr');
    const user = {
      id,
      name: payload.name || payload.fullName || 'Demo User',
      username: payload.username || compact(payload.email || id).replace(/[^a-z0-9]+/g, '.'),
      email: payload.email || `${id}@campusone.demo`,
      password: payload.password || `${role}123`,
      role,
      profilePicture: '',
      isActive: true,
      isLocked: false,
      twoFactorEnabled: false,
      lastLogin: null,
      createdAt: new Date().toISOString(),
      passwordChangedAt: null,
      permissions: role === 'admin' ? (payload.permissions || ['view_reports']) : undefined,
      isSuperAdmin: false,
    };

    const created = writeDemoStore((store) => {
      store.users.push(user);
      if (role === 'student') {
        store.students.push({
          id: nextDemoId('stu'),
          userId: id,
          studentId: payload.studentId || `DEMO-${Date.now().toString().slice(-5)}`,
          departmentId: payload.departmentId || 'dept_se',
          programId: payload.programId || 'prog_bsse',
          batch: payload.batch || String(new Date().getFullYear()),
          currentSemester: Number(payload.currentSemester || 1),
          cgpa: Number(payload.cgpa || 3.0),
          phone: payload.phone || '',
          dateOfBirth: payload.dateOfBirth || '',
          address: payload.address || '',
          guardianContact: payload.guardianContact || '',
          enrollmentYear: Number(payload.enrollmentYear || new Date().getFullYear()),
        });
      }
      if (role === 'teacher') {
        store.teachers.push({
          id: nextDemoId('teach'),
          userId: id,
          employeeId: payload.employeeId || `FAC-DEMO-${Date.now().toString().slice(-4)}`,
          departmentId: payload.departmentId || 'dept_cs',
          designation: payload.designation || 'Lecturer',
          phone: payload.phone || '',
          officeRoom: payload.officeRoom || '',
          officeHours: payload.officeHours || '',
          qualification: payload.qualification || '',
          specialization: [],
          researchInterests: [],
        });
      }
      addAudit(store, { action: 'CREATE', category: 'Users', targetModel: 'User', targetId: id, description: `Created demo ${role} ${user.name}.` });
      return publicUserWithRoleData(store, user);
    });
    return ok({ success: true, data: created });
  },
  downloadBulkUploadTemplate: () => ok(createCsvBlob('name,email,studentId,programCode,batch,currentSemester\nDemo Student,demo.student@campusone.demo,BSSE-2026-099,BSSE,2026,1\n')),
  bulkUploadStudents: () => ok({ success: true, results: { successful: [{ email: 'bulk.demo@campusone.demo', message: 'Demo import simulated' }], failed: [] } }),
  getAllUsers: (params = {}) => {
    const store = loadDemoStore();
    const role = params.role || params?.params?.role;
    const users = store.users
      .filter((user) => !role || user.role === role)
      .map((user) => publicUserWithRoleData(store, user));
    return ok({ success: true, data: users });
  },
  getUserById: (id) => {
    const store = loadDemoStore();
    const user = userById(store, id);
    return user ? ok({ success: true, data: publicUserWithRoleData(store, user) }) : fail('User not found', 404);
  },
  updateUser: (id, payload = {}) => {
    const updated = writeDemoStore((store) => {
      const user = userById(store, id);
      if (!user) return null;
      Object.assign(user, payload);
      if (user.role === 'student') {
        const student = store.students.find((item) => item.userId === id);
        if (student) Object.assign(student, payload.roleData || payload.student || {});
      }
      if (user.role === 'teacher') {
        const teacher = store.teachers.find((item) => item.userId === id);
        if (teacher) Object.assign(teacher, payload.roleData || payload.teacher || {});
      }
      addAudit(store, { action: 'UPDATE', category: 'Users', targetModel: 'User', targetId: id, description: `Updated demo user ${user.name}.` });
      return publicUserWithRoleData(store, user);
    });
    return updated ? ok({ success: true, data: updated }) : fail('User not found', 404);
  },
  deactivateUser: (id) => {
    writeDemoStore((store) => { const user = userById(store, id); if (user) user.isActive = false; });
    return ok({ success: true });
  },
  activateUser: (id) => {
    writeDemoStore((store) => { const user = userById(store, id); if (user) user.isActive = true; });
    return ok({ success: true });
  },
  unlockUser: (id) => {
    writeDemoStore((store) => { const user = userById(store, id); if (user) user.isLocked = false; });
    return ok({ success: true });
  },
  deleteUser: (id) => {
    writeDemoStore((store) => {
      const user = userById(store, id);
      if (!user) return;
      user.isActive = false;
      addAudit(store, { action: 'DELETE', category: 'Users', targetModel: 'User', targetId: id, description: `Archived demo user ${user.name}.` });
    });
    return ok({ success: true });
  },
  getTeachers: () => teacherAPI.getAllTeachers(),
  promoteStudentToTA: (studentIdOrUserId, payload = {}) => {
    const created = writeDemoStore((store) => {
      const student = studentById(store, studentIdOrUserId) || store.students.find((item) => item.userId === studentIdOrUserId);
      const app = {
        id: nextDemoId('ta'),
        studentId: student?.id || studentIdOrUserId,
        offeringId: payload.offeringId || 'off_web_a',
        status: 'APPROVED',
        permissions: payload.permissions || ['VIEW_ROSTER', 'ANSWER_QNA'],
        reason: payload.reason || 'Promoted through demo user management.',
        reviewNotes: payload.reviewNotes || 'Approved in admin demo.',
        appliedAt: new Date().toISOString(),
        reviewedAt: new Date().toISOString(),
      };
      store.taApplications.push(app);
      return app;
    });
    return dataOk(created);
  },
};

export const teacherAPI = {
  getAllTeachers: () => dataOk(loadDemoStore().teachers.map((teacher) => expandTeacher(loadDemoStore(), teacher))),
  getTeacherById: (id) => {
    const store = loadDemoStore();
    const teacher = teacherById(store, id);
    return teacher ? dataOk(expandTeacher(store, teacher)) : fail('Teacher not found', 404);
  },
  getTeacherByUserId: (userId) => {
    const store = loadDemoStore();
    const teacher = store.teachers.find((item) => item.userId === userId);
    return teacher ? dataOk(expandTeacher(store, teacher)) : fail('Teacher not found', 404);
  },
};

export const departmentAPI = {
  getAll: (params = {}) => {
    const store = loadDemoStore();
    const includeInactive = params.includeInactive || params?.params?.includeInactive;
    const departments = store.departments
      .filter((dept) => includeInactive || dept.isActive)
      .map((dept) => expandDepartment(store, dept));
    return dataOk(departments);
  },
  create: (payload = {}) => {
    const dept = writeDemoStore((store) => {
      const next = { id: nextDemoId('dept'), isActive: true, ...payload };
      store.departments.push(next);
      return expandDepartment(store, next);
    });
    return dataOk(dept);
  },
  update: (id, payload = {}) => {
    const dept = writeDemoStore((store) => {
      const existing = departmentById(store, id);
      if (!existing) return null;
      Object.assign(existing, payload);
      return expandDepartment(store, existing);
    });
    return dept ? dataOk(dept) : fail('Department not found', 404);
  },
  delete: (id) => {
    writeDemoStore((store) => { const dept = departmentById(store, id); if (dept) dept.isActive = false; });
    return ok({ success: true });
  },
  restore: (id) => {
    writeDemoStore((store) => { const dept = departmentById(store, id); if (dept) dept.isActive = true; });
    return ok({ success: true });
  },
};

export const programAPI = {
  getAll: () => dataOk(loadDemoStore().programs.map((program) => expandProgram(loadDemoStore(), program))),
  create: (payload = {}) => dataOk(writeDemoStore((store) => {
    const program = { id: nextDemoId('prog'), isActive: true, ...payload };
    store.programs.push(program);
    return expandProgram(store, program);
  })),
  update: (id, payload = {}) => dataOk(writeDemoStore((store) => {
    const program = programById(store, id);
    Object.assign(program, payload);
    return expandProgram(store, program);
  })),
  delete: (id) => {
    writeDemoStore((store) => { const program = programById(store, id); if (program) program.isActive = false; });
    return ok({ success: true });
  },
  restore: (id) => {
    writeDemoStore((store) => { const program = programById(store, id); if (program) program.isActive = true; });
    return ok({ success: true });
  },
};

export const courseAPI = {
  getAll: () => {
    const store = loadDemoStore();
    return dataOk(store.courses.map((course) => expandCourse(store, course)));
  },
  create: (payload = {}) => dataOk(writeDemoStore((store) => {
    const course = { id: nextDemoId('course'), isActive: true, prerequisiteIds: [], sessionType: 'LECTURE', expectedLectureCount: 30, ...payload };
    store.courses.push(course);
    return expandCourse(store, course);
  })),
  update: (id, payload = {}) => dataOk(writeDemoStore((store) => {
    const course = courseById(store, id);
    Object.assign(course, payload);
    return expandCourse(store, course);
  })),
  delete: (id) => {
    writeDemoStore((store) => { const course = courseById(store, id); if (course) course.isActive = false; });
    return ok({ success: true });
  },
  restore: (id) => {
    writeDemoStore((store) => { const course = courseById(store, id); if (course) course.isActive = true; });
    return ok({ success: true });
  },
};

export const gradeComponentAPI = {
  listForCourse: (courseId) => dataOk(courseGradeComponents(loadDemoStore(), courseId)),
  applyTemplate: (courseId) => {
    const components = writeDemoStore((store) => {
      const existing = courseGradeComponents(store, courseId);
      if (existing.length) return existing;
      const defaults = [
        { kind: 'ASSIGNMENT', label: 'Assignments', count: 2, totalPerInstance: 40, weightPercent: 25, aggregation: 'AVERAGE' },
        { kind: 'QUIZ', label: 'Quizzes', count: 2, totalPerInstance: 20, weightPercent: 15, aggregation: 'AVERAGE' },
        { kind: 'MID', label: 'Mid Term', count: 1, totalPerInstance: 50, weightPercent: 20, aggregation: 'BEST' },
        { kind: 'FINAL', label: 'Final Term', count: 1, totalPerInstance: 100, weightPercent: 40, aggregation: 'BEST' },
      ].map((component, index) => ({ id: nextDemoId('gc'), courseId, orderIndex: index + 1, marksReleased: true, ...component }));
      store.gradeComponents.push(...defaults);
      return defaults;
    });
    return dataOk(components);
  },
  replace: (courseId, components = []) => dataOk(writeDemoStore((store) => {
    store.gradeComponents = store.gradeComponents.filter((component) => component.courseId !== courseId);
    const next = components.map((component, index) => ({ id: component.id || nextDemoId('gc'), courseId, orderIndex: index + 1, ...component }));
    store.gradeComponents.push(...next);
    return courseGradeComponents(store, courseId);
  })),
};

export const termAPI = {
  getAll: () => dataOk(loadDemoStore().terms.map((term) => ({
    ...clone(term),
    _count: { offerings: loadDemoStore().offerings.filter((offering) => offering.termId === term.id).length },
  }))),
  getActive: () => dataOk(loadDemoStore().terms.find((term) => term.isActive) || loadDemoStore().terms[0]),
  create: (payload = {}) => dataOk(writeDemoStore((store) => {
    const term = { id: nextDemoId('term'), isActive: false, ...payload };
    store.terms.push(term);
    return clone(term);
  })),
  update: (id, payload = {}) => dataOk(writeDemoStore((store) => {
    const term = termById(store, id);
    Object.assign(term, payload);
    return clone(term);
  })),
  activate: (id) => dataOk(writeDemoStore((store) => {
    store.terms.forEach((term) => { term.isActive = term.id === id; });
    return clone(termById(store, id));
  })),
  delete: (id) => {
    writeDemoStore((store) => { store.terms = store.terms.filter((term) => term.id !== id); });
    return ok({ success: true });
  },
  getBatches: () => {
    const store = loadDemoStore();
    const rows = store.programs.flatMap((program) => (
      [...new Set(store.students.filter((student) => student.programId === program.id).map((student) => student.batch))]
        .map((batch) => ({
          batch,
          program: expandProgramShallow(store, program),
          department: expandDepartmentShallow(store, departmentById(store, program.departmentId)),
          semester: 5,
          studentCount: store.students.filter((student) => student.programId === program.id && student.batch === batch).length,
          offeringCount: store.offerings.length,
        }))
    ));
    return dataOk(rows);
  },
};

export const offeringAPI = {
  getAll: (params = {}) => {
    const store = loadDemoStore();
    const termId = params.termId || params?.params?.termId;
    const rows = store.offerings
      .filter((offering) => !termId || offering.termId === termId)
      .map((offering) => expandOffering(store, offering));
    return dataOk(rows);
  },
  getMy: (params = {}) => {
    const store = loadDemoStore();
    const permission = params.taPermission || params?.params?.taPermission || null;
    const ids = accessibleTeacherOfferingIds(store, permission);
    return dataOk(store.offerings.filter((offering) => ids.has(offering.id)).map((offering) => expandOffering(store, offering)));
  },
  getById: (id) => {
    const store = loadDemoStore();
    const offering = offeringById(store, id);
    return offering ? dataOk(expandOffering(store, offering)) : fail('Offering not found', 404);
  },
  create: (payload = {}) => dataOk(writeDemoStore((store) => {
    const offering = { id: nextDemoId('off'), sessions: [], capacity: 40, ...payload };
    store.offerings.push(offering);
    return expandOffering(store, offering);
  })),
  update: (id, payload = {}) => dataOk(writeDemoStore((store) => {
    const offering = offeringById(store, id);
    Object.assign(offering, payload);
    return expandOffering(store, offering);
  })),
  delete: (id) => {
    writeDemoStore((store) => { store.offerings = store.offerings.filter((offering) => offering.id !== id); });
    return ok({ success: true });
  },
  getStudents: (offeringId) => {
    const store = loadDemoStore();
    return dataOk(store.enrollments
      .filter((enrollment) => enrollment.offeringId === offeringId)
      .map((enrollment) => expandEnrollment(store, enrollment)));
  },
};

export const enrollmentAPI = {
  getAll: (params = {}) => {
    const store = loadDemoStore();
    const offeringId = params.offeringId || params?.params?.offeringId;
    return dataOk(store.enrollments
      .filter((enrollment) => !offeringId || enrollment.offeringId === offeringId)
      .map((enrollment) => expandEnrollment(store, enrollment)));
  },
  getCurrent: (studentId) => {
    const store = loadDemoStore();
    return dataOk(store.enrollments
      .filter((enrollment) => enrollment.studentId === studentId && enrollment.status !== 'DROPPED')
      .map((enrollment) => expandEnrollment(store, enrollment)));
  },
  enroll: (payload = {}) => dataOk(writeDemoStore((store) => {
    const student = currentStudent(store);
    const enrollment = {
      id: nextDemoId('enr'),
      studentId: payload.studentId || student?.id,
      offeringId: payload.offeringId,
      status: 'ENROLLED',
      gradeLetter: null,
    };
    if (!enrollment.studentId || !enrollment.offeringId) return null;
    const existing = store.enrollments.find((item) => item.studentId === enrollment.studentId && item.offeringId === enrollment.offeringId);
    if (existing) return expandEnrollment(store, existing);
    store.enrollments.push(enrollment);
    return expandEnrollment(store, enrollment);
  })),
  drop: (id) => {
    writeDemoStore((store) => { const enrollment = findById(store.enrollments, id); if (enrollment) enrollment.status = 'DROPPED'; });
    return ok({ success: true });
  },
  transferSection: (enrollmentId, offeringId) => dataOk(writeDemoStore((store) => {
    const enrollment = findById(store.enrollments, enrollmentId);
    if (!enrollment) return null;
    enrollment.offeringId = offeringId;
    enrollment.status = 'ENROLLED';
    return expandEnrollment(store, enrollment);
  })),
  bulkImportTemplate: () => ok(createCsvBlob('studentId,offeringId\nBSSE-2024-017,off_web_a\n')),
  bulkImport: (offeringId) => ok({
    success: true,
    data: {
      offeringId,
      successful: 3,
      failed: 0,
      message: 'Demo bulk enrollment import simulated.',
    },
  }),
  getTranscript: (studentId) => dataOk(studentTranscript(loadDemoStore(), studentId)),
};

export const scheduleAPI = {
  getConfig: () => dataOk(clone(loadDemoStore().scheduleConfig)),
  updateConfig: (payload = {}) => dataOk(writeDemoStore((store) => {
    store.scheduleConfig = { ...store.scheduleConfig, ...payload };
    return clone(store.scheduleConfig);
  })),
  getSlots: () => {
    const store = loadDemoStore();
    return dataOk({ config: clone(store.scheduleConfig), slots: makeSlots(store) });
  },
  getAvailability: (params = {}) => {
    const store = loadDemoStore();
    const termId = params.termId || params?.params?.termId;
    const excludeOfferingId = params.excludeOfferingId || params?.params?.excludeOfferingId;
    return dataOk(store.offerings
      .filter((offering) => (!termId || offering.termId === termId) && offering.id !== excludeOfferingId)
      .flatMap((offering) => offering.sessions.map((session) => ({
        ...clone(session),
        offering: expandOffering(store, offering),
      }))));
  },
  getOfferingSessions: (offeringId) => dataOk((offeringById(loadDemoStore(), offeringId)?.sessions || []).map((session) => ({
    ...clone(session),
    room: roomById(loadDemoStore(), session.roomId),
  }))),
  setOfferingSessions: (offeringId, sessions = []) => dataOk(writeDemoStore((store) => {
    const offering = offeringById(store, offeringId);
    offering.sessions = sessions.map((session) => ({
      id: session.id || nextDemoId('sess'),
      dayOfWeek: session.dayOfWeek,
      slotIndex: Number(session.slotIndex),
      roomId: session.roomId,
    }));
    return expandOffering(store, offering);
  })),
};

export const roomAPI = {
  getAll: () => dataOk(loadDemoStore().rooms.map(clone)),
  create: (payload = {}) => dataOk(writeDemoStore((store) => {
    const room = { id: nextDemoId('room'), isActive: true, ...payload };
    store.rooms.push(room);
    return clone(room);
  })),
  update: (id, payload = {}) => dataOk(writeDemoStore((store) => {
    const room = roomById(store, id);
    Object.assign(room, payload);
    return clone(room);
  })),
  delete: (id) => {
    writeDemoStore((store) => { const room = roomById(store, id); if (room) room.isActive = false; });
    return ok({ success: true });
  },
};

export const holidayAPI = {
  getAll: () => dataOk(loadDemoStore().holidays.map(clone)),
  create: (payload = {}) => dataOk(writeDemoStore((store) => {
    const holiday = { id: nextDemoId('holiday'), ...payload };
    store.holidays.push(holiday);
    return clone(holiday);
  })),
  update: (id, payload = {}) => dataOk(writeDemoStore((store) => {
    const holiday = findById(store.holidays, id);
    Object.assign(holiday, payload);
    return clone(holiday);
  })),
  delete: (id) => {
    writeDemoStore((store) => { store.holidays = store.holidays.filter((holiday) => holiday.id !== id); });
    return ok({ success: true });
  },
};

export const announcementAPI = {
  getAllAnnouncements: () => {
    const store = loadDemoStore();
    return ok(store.announcements.map((announcement) => expandAnnouncement(store, announcement)));
  },
  getMyAnnouncements: () => {
    const store = loadDemoStore();
    return ok(store.announcements
      .filter((announcement) => currentUserAnnouncementFilter(store, announcement))
      .map((announcement) => expandAnnouncement(store, announcement)));
  },
  sendAnnouncement: (payload = {}) => {
    const result = writeDemoStore((store) => {
      const user = currentUserRecord(store) || store.users.find((item) => item.role === 'admin');
      const announcement = {
        id: nextDemoId('ann'),
        title: payload.title,
        content: payload.content,
        priority: payload.priority || 'medium',
        targetAudience: payload.targetAudience || payload.audience || 'all',
        createdById: user?.id || 'usr_admin_farah',
        createdAt: new Date().toISOString(),
        offeringId: payload.offeringId || null,
        departmentIds: payload.departmentIds || [],
        programIds: payload.programIds || [],
        batches: payload.batches || [],
        semesters: payload.semesters || [],
      };
      store.announcements.unshift(announcement);
      store.users.forEach((recipient) => {
        if (recipient.id !== user?.id) {
          addNotification(store, recipient.id, { title: announcement.title, message: announcement.content, type: 'ANNOUNCEMENT', link: `/${recipient.role}/announcements` });
        }
      });
      addAudit(store, { action: 'SEND', category: 'Announcements', targetModel: 'Announcement', targetId: announcement.id, description: `Sent demo announcement: ${announcement.title}.` });
      return { announcement, recipientCount: store.users.length - 1 };
    });
    return ok({ success: true, recipientCount: result.recipientCount, data: expandAnnouncement(loadDemoStore(), result.announcement) });
  },
  sendCourseAnnouncement: (payload = {}) => {
    const result = writeDemoStore((store) => {
      const user = currentUserRecord(store);
      const announcement = {
        id: nextDemoId('ann'),
        title: payload.title,
        content: payload.content,
        priority: payload.priority || 'medium',
        targetAudience: 'course',
        createdById: user?.id || 'usr_teacher_sarah',
        createdAt: new Date().toISOString(),
        offeringId: payload.offeringId,
        departmentIds: [],
        programIds: [],
        batches: [],
        semesters: [],
      };
      store.announcements.unshift(announcement);
      const recipients = store.enrollments.filter((enrollment) => enrollment.offeringId === payload.offeringId);
      recipients.forEach((enrollment) => addNotification(store, studentById(store, enrollment.studentId)?.userId, {
        title: announcement.title,
        message: announcement.content,
        type: 'ANNOUNCEMENT',
        link: '/student/notifications',
      }));
      return { announcement, recipientCount: recipients.length };
    });
    return ok({ success: true, recipientCount: result.recipientCount, data: expandAnnouncement(loadDemoStore(), result.announcement) });
  },
  deleteAnnouncement: (id) => {
    writeDemoStore((store) => { store.announcements = store.announcements.filter((announcement) => announcement.id !== id); });
    return ok({ success: true });
  },
};

export const notificationAPI = {
  getAll: (params = {}) => {
    const store = loadDemoStore();
    const user = currentUserRecord(store);
    if (!user) return dataOk([]);
    const limit = Number(params.limit || params?.params?.limit || 200);
    return dataOk(sortByDateDesc(store.notifications.filter((notification) => notification.userId === user.id))
      .slice(0, limit)
      .map(expandNotification));
  },
  getUnreadCount: () => {
    const store = loadDemoStore();
    const user = currentUserRecord(store);
    return ok({ count: user ? unreadForUser(store, user.id) : 0 });
  },
  markRead: (id) => {
    writeDemoStore((store) => { const notification = findById(store.notifications, id); if (notification) notification.isRead = true; });
    return ok({ success: true });
  },
  markAllRead: () => {
    writeDemoStore((store) => {
      const user = currentUserRecord(store);
      if (user) store.notifications.forEach((notification) => { if (notification.userId === user.id) notification.isRead = true; });
    });
    return ok({ success: true });
  },
  delete: (id) => {
    writeDemoStore((store) => { store.notifications = store.notifications.filter((notification) => notification.id !== id); });
    return ok({ success: true });
  },
  clearRead: () => {
    let count = 0;
    writeDemoStore((store) => {
      const user = currentUserRecord(store);
      const before = store.notifications.length;
      store.notifications = store.notifications.filter((notification) => !(notification.userId === user?.id && notification.isRead));
      count = before - store.notifications.length;
    });
    return ok({ success: true, count });
  },
};

export const dashboardAPI = {
  admin: () => {
    const store = loadDemoStore();
    const stats = {
      totalUsers: store.users.length,
      newSignupsThisWeek: 3,
      pendingAdmissions: store.admissionApplications.filter((app) => normalizeStatus(app.status) === 'PENDING').length,
      activeOfferings: store.offerings.length,
      students: store.students.length,
      teachers: store.teachers.length,
      admins: store.users.filter((user) => user.role === 'admin').length,
      auditLast24h: store.auditLogs.filter((log) => Date.now() - new Date(log.createdAt).getTime() < 86400000).length,
      departments: store.departments.length,
      programs: store.programs.length,
      courses: store.courses.length,
    };
    return dataOk({
      stats,
      recentAdmissions: sortByDateDesc(store.admissionApplications, 'submittedAt').slice(0, 5).map((app) => ({ ...clone(app), status: admissionDisplayStatus(app.status) })),
      recentAnnouncements: sortByDateDesc(store.announcements).slice(0, 5).map((ann) => expandAnnouncement(store, ann)),
      recentAuditLogs: sortByDateDesc(store.auditLogs).slice(0, 5).map((log) => ({ ...clone(log), performer: userPublic(userById(store, log.performerId)) })),
    });
  },
  student: () => {
    const store = loadDemoStore();
    const student = currentStudent(store) || store.students[0];
    const studentUser = userById(store, student.userId);
    const activeTerm = store.terms.find((term) => term.isActive);
    const enrollments = store.enrollments.filter((enrollment) => enrollment.studentId === student.id && enrollment.status !== 'DROPPED');
    const currentEnrollments = enrollments.map((enrollment) => expandEnrollment(store, enrollment));
    const pendingAssignments = store.assignments
      .filter((assignment) => enrollments.some((enrollment) => enrollment.offeringId === assignment.offeringId))
      .filter((assignment) => !assignmentSubmissionForStudent(store, assignment.id, student.id) || assignmentSubmissionForStudent(store, assignment.id, student.id)?.status !== 'GRADED')
      .map((assignment) => ({
        ...expandAssignment(store, assignment),
        submissions: [assignmentSubmissionForStudent(store, assignment.id, student.id)].filter(Boolean).map((submission) => expandAssignmentSubmission(store, submission)),
      }));
    const myQuizzes = store.quizzes
      .filter((quiz) => enrollments.some((enrollment) => enrollment.offeringId === quiz.offeringId))
      .map((quiz) => ({
        ...expandQuiz(store, quiz),
        attempts: store.quizAttempts.filter((attempt) => attempt.quizId === quiz.id && attempt.studentId === student.id).map(clone),
      }));
    const attendanceSummary = enrollments.map((enrollment) => {
      const offering = expandOffering(store, offeringById(store, enrollment.offeringId));
      return {
        offeringId: offering.id,
        courseCode: offering.course.code,
        section: offering.section,
        ...attendanceForEnrollment(store, enrollment),
      };
    });
    const submissions = store.assignmentSubmissions
      .filter((submission) => submission.studentId === student.id && submission.obtainedMarks !== null && submission.obtainedMarks !== undefined)
      .map((submission) => ({
        ...expandAssignmentSubmission(store, submission),
        assignment: expandAssignment(store, findById(store.assignments, submission.assignmentId)),
      }));
    return dataOk({
      student: {
        name: studentUser.name,
        studentId: student.studentId,
        program: programById(store, student.programId)?.name,
        batch: student.batch,
        currentSemester: student.currentSemester,
      },
      activeTerm,
      stats: {
        enrolledCourses: enrollments.length,
        totalCredits: enrollments.reduce((sum, enrollment) => sum + Number(courseById(store, offeringById(store, enrollment.offeringId)?.courseId)?.creditHours || 0), 0),
        cgpa: student.cgpa,
        pendingAssignmentsCount: pendingAssignments.length,
        overdueCount: pendingAssignments.filter((assignment) => new Date(assignment.dueDate) < new Date()).length,
        dueSoonCount: pendingAssignments.filter((assignment) => new Date(assignment.dueDate) < new Date(Date.now() + 7 * 86400000)).length,
        availableQuizzesCount: myQuizzes.filter((quiz) => !quiz.attempts.length && new Date(quiz.startAt) <= new Date() && new Date(quiz.endAt) >= new Date()).length,
        upcomingQuizzesCount: myQuizzes.filter((quiz) => new Date(quiz.startAt) > new Date()).length,
        lowAttendanceCount: attendanceSummary.filter((row) => row.isAtRisk).length,
      },
      currentEnrollments,
      pendingAssignments,
      availableQuizzes: myQuizzes.filter((quiz) => new Date(quiz.startAt) <= new Date() && new Date(quiz.endAt) >= new Date()),
      upcomingQuizzes: myQuizzes.filter((quiz) => new Date(quiz.startAt) > new Date()),
      recentGrades: sortByDateDesc(submissions, 'gradedAt').slice(0, 5),
      recentQuizAttempts: sortByDateDesc(store.quizAttempts.filter((attempt) => attempt.studentId === student.id), 'submittedAt')
        .slice(0, 5)
        .map((attempt) => ({ ...clone(attempt), quiz: expandQuiz(store, findById(store.quizzes, attempt.quizId)) })),
      attendanceSummary,
      recentAnnouncements: sortByDateDesc(store.announcements.filter((ann) => currentUserAnnouncementFilter(store, ann))).slice(0, 5).map((ann) => expandAnnouncement(store, ann)),
    });
  },
  teacher: () => {
    const store = loadDemoStore();
    const teacher = currentTeacher(store) || store.teachers[0];
    const offerings = store.offerings.filter((offering) => offering.teacherId === teacher.id);
    const offeringIds = new Set(offerings.map((offering) => offering.id));
    const attempts = store.quizAttempts.filter((attempt) => offeringIds.has(findById(store.quizzes, attempt.quizId)?.offeringId));
    const pendingSubmissions = store.assignmentSubmissions.filter((submission) => {
      const assignment = findById(store.assignments, submission.assignmentId);
      return offeringIds.has(assignment?.offeringId) && submission.obtainedMarks === null;
    });
    return dataOk({
      teacher: {
        name: userById(store, teacher.userId)?.name,
        designation: teacher.designation,
        employeeId: teacher.employeeId,
      },
      activeTerm: store.terms.find((term) => term.isActive),
      stats: {
        myOfferings: offerings.length,
        totalStudents: new Set(store.enrollments.filter((enrollment) => offeringIds.has(enrollment.offeringId)).map((enrollment) => enrollment.studentId)).size,
        pendingSubmissions: pendingSubmissions.length,
        pendingShortAnswers: store.quizAnswers.filter((answer) => answer.isCorrect === null).length,
        openQnaCount: store.qnaThreads.filter((thread) => offeringIds.has(thread.offeringId) && thread.status === 'OPEN').length,
        upcomingQuizzesCount: store.quizzes.filter((quiz) => offeringIds.has(quiz.offeringId) && new Date(quiz.startAt) > new Date()).length,
      },
      myOfferings: offerings.map((offering) => expandOffering(store, offering)),
      recentQna: sortByDateDesc(store.qnaThreads.filter((thread) => offeringIds.has(thread.offeringId)), 'updatedAt').slice(0, 5).map((thread) => expandThread(store, thread)),
      upcomingQuizzes: store.quizzes.filter((quiz) => offeringIds.has(quiz.offeringId)).map((quiz) => ({ ...expandQuiz(store, quiz), _count: { questions: quiz.questions.length, attempts: attempts.filter((attempt) => attempt.quizId === quiz.id).length } })),
      recentAnnouncements: sortByDateDesc(store.announcements.filter((ann) => ann.createdById === userById(store, teacher.userId)?.id)).slice(0, 5).map((ann) => expandAnnouncement(store, ann)),
    });
  },
};

export const studentAPI = {
  myCourses: () => {
    const store = loadDemoStore();
    const student = currentStudent(store) || store.students[0];
    return ok({
      success: true,
      data: store.enrollments
        .filter((enrollment) => enrollment.studentId === student.id && enrollment.status !== 'DROPPED')
        .map((enrollment) => expandEnrollment(store, enrollment)),
      term: store.terms.find((term) => term.isActive),
    });
  },
  courseDetail: (offeringId) => {
    const store = loadDemoStore();
    const student = currentStudent(store) || store.students[0];
    const enrollment = store.enrollments.find((item) => item.studentId === student.id && item.offeringId === offeringId);
    if (!enrollment) return fail('Course not found for this demo student', 404);
    return dataOk({
      offering: expandOffering(store, offeringById(store, offeringId)),
      lectures: store.lectures?.filter((lecture) => lecture.offeringId === offeringId) || [],
      taResources: store.taResources.filter((resource) => resource.offeringId === offeringId),
      attendance: {
        summary: attendanceForEnrollment(store, enrollment),
        records: store.attendanceRecords.filter((record) => record.enrollmentId === enrollment.id),
      },
      runningGrade: runningGradeForEnrollment(store, enrollment),
      markComponents: markComponentsForEnrollment(store, enrollment),
    });
  },
  activeAssignments: () => {
    const store = loadDemoStore();
    const student = currentStudent(store) || store.students[0];
    const ids = offeringIdsForStudent(store, student.id);
    return dataOk(store.assignments
      .filter((assignment) => ids.has(assignment.offeringId) && assignment.status === 'PUBLISHED')
      .map((assignment) => ({
        ...expandAssignment(store, assignment),
        submissions: store.assignmentSubmissions
          .filter((submission) => submission.assignmentId === assignment.id && submission.studentId === student.id)
          .map((submission) => expandAssignmentSubmission(store, submission)),
      })));
  },
  myTranscript: () => {
    const store = loadDemoStore();
    const student = currentStudent(store) || store.students[0];
    return dataOk(studentTranscript(store, student.id));
  },
};

export const assignmentAPI = {
  getMy: () => studentAPI.activeAssignments(),
  getAll: (params = {}) => {
    const store = loadDemoStore();
    const offeringId = params.offeringId || params?.params?.offeringId;
    const status = params.status || params?.params?.status;
    const ids = accessibleTeacherOfferingIds(store);
    return dataOk(store.assignments
      .filter((assignment) => ids.has(assignment.offeringId))
      .filter((assignment) => !offeringId || assignment.offeringId === offeringId)
      .filter((assignment) => !status || assignment.status === status)
      .map((assignment) => expandAssignment(store, assignment)));
  },
  create: async (payload) => {
    const form = formToObject(payload);
    const file = form.file || form.attachment;
    const attachmentUrl = await fileToUrl(file, `Assignment file for ${form.title || 'demo assignment'}`);
    const assignment = writeDemoStore((store) => {
      const next = {
        id: nextDemoId('asg'),
        offeringId: form.offeringId,
        componentIndex: Number(form.componentIndex || 1),
        title: form.title || 'Demo Assignment',
        description: form.description || '',
        totalMarks: Number(form.totalMarks || 50),
        dueDate: form.dueDate || dateTime(7, 23, 59),
        allowLate: form.allowLate === true || form.allowLate === 'true',
        status: form.status || 'PUBLISHED',
        attachmentUrl,
        attachmentName: getFileName(file, 'assignment-brief.txt'),
        createdAt: new Date().toISOString(),
      };
      store.assignments.unshift(next);
      addAudit(store, { action: 'CREATE', category: 'Academic', targetModel: 'Assignment', targetId: next.id, description: `Created demo assignment ${next.title}.` });
      return expandAssignment(store, next);
    });
    return dataOk(assignment);
  },
  update: async (id, payload = {}) => {
    const form = formToObject(payload);
    const file = form.file || form.attachment;
    const attachmentUrl = file?.size ? await fileToUrl(file, `Assignment file for ${form.title || id}`) : null;
    const updated = writeDemoStore((store) => {
      const assignment = findById(store.assignments, id);
      if (!assignment) return null;
      Object.assign(assignment, {
        ...form,
        totalMarks: form.totalMarks !== undefined ? Number(form.totalMarks) : assignment.totalMarks,
        componentIndex: form.componentIndex !== undefined ? Number(form.componentIndex) : assignment.componentIndex,
        allowLate: form.allowLate !== undefined ? (form.allowLate === true || form.allowLate === 'true') : assignment.allowLate,
      });
      if (attachmentUrl) {
        assignment.attachmentUrl = attachmentUrl;
        assignment.attachmentName = getFileName(file, assignment.attachmentName);
      }
      return expandAssignment(store, assignment);
    });
    return updated ? dataOk(updated) : fail('Assignment not found', 404);
  },
  delete: (id) => {
    writeDemoStore((store) => { store.assignments = store.assignments.filter((assignment) => assignment.id !== id); });
    return ok({ success: true });
  },
  submit: async (assignmentId, payload) => {
    const form = formToObject(payload);
    const student = currentStudent(loadDemoStore()) || loadDemoStore().students[0];
    const file = form.file || form.attachment;
    const attachmentUrl = await fileToUrl(file, `Submission for ${assignmentId}`);
    const submission = writeDemoStore((store) => {
      const existing = store.assignmentSubmissions.find((item) => item.assignmentId === assignmentId && item.studentId === student.id);
      const next = existing || { id: nextDemoId('sub'), assignmentId, studentId: student.id, pendingGrades: [] };
      Object.assign(next, {
        status: 'SUBMITTED',
        submittedAt: new Date().toISOString(),
        submissionText: form.submissionText || form.text || '',
        attachmentUrl,
        attachmentName: getFileName(file, 'submission.txt'),
        obtainedMarks: existing?.obtainedMarks ?? null,
        feedback: existing?.feedback || '',
      });
      if (!existing) store.assignmentSubmissions.push(next);
      return expandAssignmentSubmission(store, next);
    });
    return dataOk(submission);
  },
  getSubmissions: (assignmentId) => {
    const store = loadDemoStore();
    return dataOk(store.assignmentSubmissions
      .filter((submission) => submission.assignmentId === assignmentId)
      .map((submission) => expandAssignmentSubmission(store, submission)));
  },
  getLatestSimilarityReport: (assignmentId) => dataOk(similarityReport(loadDemoStore(), assignmentId)),
  runSimilarityScan: (assignmentId) => dataOk(similarityReport(loadDemoStore(), assignmentId, false)),
  reviewSimilarityMatch: (_assignmentId, matchId, payload = {}) => dataOk({ id: matchId, review: { decision: payload.decision || 'CLEARED' } }),
  gradeSubmission: (submissionId, payload = {}) => {
    const graded = writeDemoStore((store) => {
      const submission = findById(store.assignmentSubmissions, submissionId);
      if (!submission) return null;
      submission.obtainedMarks = Number(payload.obtainedMarks);
      submission.feedback = payload.feedback || '';
      submission.status = 'GRADED';
      submission.gradedAt = new Date().toISOString();
      submission.pendingGrades = [];
      const student = studentById(store, submission.studentId);
      addNotification(store, student?.userId, { title: 'Assignment graded', message: `Your assignment was graded: ${submission.obtainedMarks}.`, type: 'ASSIGNMENT_GRADED', link: '/student/assignments' });
      return expandAssignmentSubmission(store, submission);
    });
    return graded ? dataOk(graded) : fail('Submission not found', 404);
  },
  approvePendingGrade: (pendingId) => {
    writeDemoStore((store) => {
      for (const submission of store.assignmentSubmissions) {
        const pending = (submission.pendingGrades || []).find((item) => item.id === pendingId);
        if (pending) {
          submission.obtainedMarks = Number(pending.marksAwarded);
          submission.feedback = pending.feedback || submission.feedback || '';
          submission.status = 'GRADED';
          submission.gradedAt = new Date().toISOString();
          pending.status = 'APPROVED';
        }
      }
    });
    return ok({ success: true });
  },
  rejectPendingGrade: (pendingId) => {
    writeDemoStore((store) => {
      store.assignmentSubmissions.forEach((submission) => {
        (submission.pendingGrades || []).forEach((pending) => { if (pending.id === pendingId) pending.status = 'REJECTED'; });
      });
    });
    return ok({ success: true });
  },
};

const similarityReport = (store, assignmentId, stale = false) => {
  const submissions = store.assignmentSubmissions.filter((submission) => submission.assignmentId === assignmentId);
  const [a, b] = submissions;
  return {
    id: `sim_${assignmentId}`,
    isStale: stale,
    generatedAt: new Date().toISOString(),
    summary: {
      flaggedPairs: a && b ? 1 : 0,
      comparedPairs: Math.max(0, submissions.length - 1),
      exactFilePairs: 0,
      exactTextPairs: 0,
      lexicalPairs: a && b ? 1 : 0,
      semanticPairs: 0,
    },
    matches: a && b ? [{
      id: 'match_demo_1',
      submissionA: expandAssignmentSubmission(store, a),
      submissionB: expandAssignmentSubmission(store, b),
      matchType: 'LEXICAL',
      combinedScore: 0.72,
      matchedPassages: ['Both submissions use similar language for responsive breakpoints and empty states.'],
      review: { decision: 'PENDING' },
    }] : [],
  };
};

export const quizAPI = {
  getMy: () => {
    const store = loadDemoStore();
    const student = currentStudent(store) || store.students[0];
    const ids = offeringIdsForStudent(store, student.id);
    return dataOk(store.quizzes
      .filter((quiz) => ids.has(quiz.offeringId))
      .map((quiz) => ({
        ...expandQuiz(store, quiz),
        attempts: store.quizAttempts.filter((attempt) => attempt.quizId === quiz.id && attempt.studentId === student.id).map(clone),
        reopenGrant: store.quizAttempts.find((attempt) => attempt.quizId === quiz.id && attempt.studentId === student.id && attempt.status === 'REOPENED')
          ? { until: store.quizAttempts.find((attempt) => attempt.quizId === quiz.id && attempt.studentId === student.id && attempt.status === 'REOPENED').reopenedUntil }
          : null,
      })));
  },
  getAll: (params = {}) => {
    const store = loadDemoStore();
    const ids = accessibleTeacherOfferingIds(store);
    const offeringId = params.offeringId || params?.params?.offeringId;
    return dataOk(store.quizzes
      .filter((quiz) => ids.has(quiz.offeringId))
      .filter((quiz) => !offeringId || quiz.offeringId === offeringId)
      .map((quiz) => expandQuiz(store, quiz)));
  },
  getById: (id) => {
    const store = loadDemoStore();
    const quiz = findById(store.quizzes, id);
    return quiz ? dataOk(expandQuiz(store, quiz)) : fail('Quiz not found', 404);
  },
  create: (payload = {}) => {
    const quiz = writeDemoStore((store) => {
      const next = {
        id: nextDemoId('quiz'),
        offeringId: payload.offeringId,
        componentIndex: Number(payload.componentIndex || 1),
        title: payload.title || 'Demo Quiz',
        description: payload.description || '',
        totalMarks: Number(payload.totalMarks || (payload.questions || []).reduce((sum, q) => sum + Number(q.marks || 0), 0)),
        durationMinutes: Number(payload.durationMinutes || 20),
        startAt: payload.startAt || dateTime(1, 9),
        endAt: payload.endAt || dateTime(2, 22),
        status: payload.status || 'PUBLISHED',
        deliveryMode: payload.deliveryMode || 'ONLINE',
        maxViolations: Number(payload.maxViolations || 3),
        allowReview: payload.allowReview ?? true,
        reviewAvailableAt: payload.reviewAvailableAt || dateTime(3, 9),
        questions: (payload.questions || []).map((question) => ({ id: question.id || nextDemoId('q'), ...question })),
      };
      store.quizzes.unshift(next);
      return expandQuiz(store, next);
    });
    return dataOk(quiz);
  },
  update: (id, payload = {}) => {
    const quiz = writeDemoStore((store) => {
      const existing = findById(store.quizzes, id);
      if (!existing) return null;
      Object.assign(existing, payload);
      if (payload.questions) existing.questions = payload.questions.map((question) => ({ id: question.id || nextDemoId('q'), ...question }));
      return expandQuiz(store, existing);
    });
    return quiz ? dataOk(quiz) : fail('Quiz not found', 404);
  },
  delete: (id) => {
    writeDemoStore((store) => { store.quizzes = store.quizzes.filter((quiz) => quiz.id !== id); });
    return ok({ success: true });
  },
  generateWithAI: () => dataOk({
    questions: [
      { type: 'MCQ', questionText: 'Which layer should own reusable API calls?', marks: 5, options: ['CSS', 'Data/service layer', 'Image asset', 'Inline text'], correctAnswer: 1 },
      { type: 'TRUE_FALSE', questionText: 'A demo should avoid real production credentials.', marks: 5, options: ['True', 'False'], correctAnswer: 0 },
      { type: 'SHORT', questionText: 'Name one benefit of mock data in a portfolio demo.', marks: 5, options: [], correctAnswer: 'It lets reviewers explore workflows without a backend.' },
    ],
  }),
  downloadImportTemplate: () => ok(createCsvBlob('type,questionText,marks,optionA,optionB,optionC,optionD,correctAnswer\nMCQ,Demo question?,5,One,Two,Three,Four,1\n')),
  importExcel: () => dataOk([
    { type: 'MCQ', questionText: 'Imported demo MCQ', marks: 5, options: ['A', 'B', 'C', 'D'], correctAnswer: 0 },
    { type: 'SHORT', questionText: 'Imported short answer', marks: 5, options: [], correctAnswer: 'Demo answer' },
  ], { count: 2 }),
  start: (quizId) => {
    const session = writeDemoStore((store) => {
      const student = currentStudent(store) || store.students[0];
      const quiz = findById(store.quizzes, quizId);
      if (!quiz) return null;
      let attempt = store.quizAttempts.find((item) => item.quizId === quizId && item.studentId === student.id && item.status === 'IN_PROGRESS');
      if (!attempt) {
        attempt = {
          id: nextDemoId('attempt'),
          quizId,
          studentId: student.id,
          status: 'IN_PROGRESS',
          totalScore: null,
          submittedAt: null,
          startedAt: new Date().toISOString(),
          violations: 0,
          reopenedUntil: null,
          gradingStatus: 'IN_PROGRESS',
        };
        store.quizAttempts.push(attempt);
      }
      return {
        attemptId: attempt.id,
        quiz: expandQuiz(store, quiz),
        questions: clone(quiz.questions),
        savedAnswers: quizAttemptAnswers(store, attempt.id),
        deadline: new Date(Date.now() + Number(quiz.durationMinutes || 20) * 60000).toISOString(),
        violations: attempt.violations || 0,
      };
    });
    return session ? dataOk(session) : fail('Quiz not found', 404);
  },
  saveAnswer: (attemptId, payload = {}) => {
    writeDemoStore((store) => {
      const existing = store.quizAnswers.find((answer) => answer.attemptId === attemptId && answer.questionId === payload.questionId);
      if (existing) existing.answer = payload.answer;
      else store.quizAnswers.push({ id: nextDemoId('ans'), attemptId, questionId: payload.questionId, answer: payload.answer, isCorrect: null, marksAwarded: null, feedback: '', taPendingGrades: [] });
    });
    return ok({ success: true });
  },
  logViolation: (attemptId) => {
    const result = writeDemoStore((store) => {
      const attempt = findById(store.quizAttempts, attemptId);
      const quiz = findById(store.quizzes, attempt?.quizId);
      if (!attempt || !quiz) return null;
      attempt.violations = Number(attempt.violations || 0) + 1;
      if (attempt.violations >= Number(quiz.maxViolations || 3)) {
        attempt.status = 'AUTO_SUBMITTED';
        attempt.submittedAt = new Date().toISOString();
        return { autoSubmitted: true, totalScore: attempt.totalScore || 0, status: attempt.status, violations: attempt.violations, max: quiz.maxViolations };
      }
      return { autoSubmitted: false, violations: attempt.violations, max: quiz.maxViolations };
    });
    return result ? dataOk(result) : fail('Attempt not found', 404);
  },
  submit: (attemptId, payload = {}) => {
    const result = writeDemoStore((store) => {
      const attempt = findById(store.quizAttempts, attemptId);
      const quiz = findById(store.quizzes, attempt?.quizId);
      if (!attempt || !quiz) return null;
      (payload.answers || []).forEach((incoming) => {
        const existing = store.quizAnswers.find((answer) => answer.attemptId === attemptId && answer.questionId === incoming.questionId);
        if (existing) existing.answer = incoming.answer;
        else store.quizAnswers.push({ id: nextDemoId('ans'), attemptId, questionId: incoming.questionId, answer: incoming.answer, isCorrect: null, marksAwarded: null, feedback: '', taPendingGrades: [] });
      });
      const answers = store.quizAnswers.filter((answer) => answer.attemptId === attemptId);
      const { totalScore, scored } = scoreQuizAttempt(quiz, answers);
      scored.forEach((scoredAnswer) => {
        const target = findById(store.quizAnswers, scoredAnswer.id);
        Object.assign(target, scoredAnswer);
      });
      attempt.totalScore = totalScore;
      attempt.status = 'SUBMITTED';
      attempt.submittedAt = new Date().toISOString();
      attempt.gradingStatus = scored.some((answer) => answer.isCorrect === null) ? 'PENDING_MANUAL' : 'GRADED';
      return clone(attempt);
    });
    return result ? dataOk({ ...result, attemptId: result.id }) : fail('Attempt not found', 404);
  },
  getMyResult: (attemptId) => quizAPI.getAttemptDetail(attemptId),
  getAttempts: (quizId) => {
    const store = loadDemoStore();
    const quiz = findById(store.quizzes, quizId);
    const roster = store.enrollments
      .filter((enrollment) => enrollment.offeringId === quiz?.offeringId)
      .map((enrollment) => {
        const attempt = store.quizAttempts.find((item) => item.quizId === quizId && item.studentId === enrollment.studentId);
        return {
          id: `row_${quizId}_${enrollment.studentId}`,
          student: expandStudent(store, studentById(store, enrollment.studentId)),
          attempt: attempt ? clone(attempt) : null,
          status: attempt?.status || 'NOT_ATTEMPTED',
          totalScore: attempt?.totalScore ?? null,
          violations: attempt?.violations || 0,
          reopenedUntil: attempt?.reopenedUntil || null,
        };
      });
    return dataOk(roster);
  },
  getAttemptDetail: (attemptId) => {
    const store = loadDemoStore();
    const attempt = findById(store.quizAttempts, attemptId);
    if (!attempt) return fail('Attempt not found', 404);
    const quiz = findById(store.quizzes, attempt.quizId);
    return dataOk({
      ...clone(attempt),
      attempt: clone(attempt),
      totalScore: attempt.totalScore,
      violations: attempt.violations || 0,
      student: expandStudent(store, studentById(store, attempt.studentId)),
      quiz: expandQuiz(store, quiz),
      answers: quizAttemptAnswers(store, attemptId),
      totalMarks: quiz.totalMarks,
      gradingStatus: attempt.gradingStatus,
      manualPending: quizAttemptAnswers(store, attemptId).some((answer) => answer.isCorrect === null),
      allowReview: quiz.allowReview,
      reviewAvailableAt: quiz.reviewAvailableAt,
    });
  },
  gradeAnswer: (answerId, payload = {}) => {
    const result = writeDemoStore((store) => {
      const answer = findById(store.quizAnswers, answerId);
      if (!answer) return null;
      answer.marksAwarded = Number(payload.marksAwarded);
      answer.feedback = payload.feedback || '';
      answer.isCorrect = answer.marksAwarded > 0;
      const attempt = findById(store.quizAttempts, answer.attemptId);
      const quiz = findById(store.quizzes, attempt.quizId);
      const answers = store.quizAnswers.filter((item) => item.attemptId === attempt.id);
      attempt.totalScore = answers.reduce((sum, item) => sum + Number(item.marksAwarded || 0), 0);
      attempt.gradingStatus = answers.some((item) => item.isCorrect === null) ? 'PENDING_MANUAL' : 'GRADED';
      return { answer, pendingApproval: false, quiz };
    });
    return result ? ok({ success: true, data: result.answer, pendingApproval: false }) : fail('Answer not found', 404);
  },
  approvePendingGrade: (pendingId) => {
    writeDemoStore((store) => {
      store.quizAnswers.forEach((answer) => {
        (answer.taPendingGrades || []).forEach((pending) => { if (pending.id === pendingId) pending.status = 'APPROVED'; });
      });
    });
    return ok({ success: true });
  },
  rejectPendingGrade: (pendingId) => {
    writeDemoStore((store) => {
      store.quizAnswers.forEach((answer) => {
        (answer.taPendingGrades || []).forEach((pending) => { if (pending.id === pendingId) pending.status = 'REJECTED'; });
      });
    });
    return ok({ success: true });
  },
  saveOfflineMark: (quizId, payload = {}) => {
    writeDemoStore((store) => {
      let attempt = store.quizAttempts.find((item) => item.quizId === quizId && item.studentId === payload.studentId);
      if (!attempt) {
        attempt = { id: nextDemoId('attempt'), quizId, studentId: payload.studentId, violations: 0, startedAt: dateTime(0, 9), reopenedUntil: null };
        store.quizAttempts.push(attempt);
      }
      Object.assign(attempt, { status: 'SUBMITTED', totalScore: Number(payload.marksAwarded), submittedAt: new Date().toISOString(), gradingStatus: 'GRADED' });
    });
    return ok({ success: true });
  },
  reopenForStudent: (quizId, payload = {}) => {
    writeDemoStore((store) => {
      let attempt = store.quizAttempts.find((item) => item.quizId === quizId && item.studentId === payload.studentId);
      if (!attempt) {
        attempt = { id: nextDemoId('attempt'), quizId, studentId: payload.studentId, totalScore: null, submittedAt: null, startedAt: null, violations: 0, gradingStatus: 'REOPENED' };
        store.quizAttempts.push(attempt);
      }
      attempt.status = 'REOPENED';
      attempt.reopenedUntil = new Date(Date.now() + Number(payload.minutes || 30) * 60000).toISOString();
    });
    return ok({ success: true });
  },
};

const expandThread = (store, thread) => {
  const replies = store.qnaReplies.filter((reply) => reply.threadId === thread.id);
  return {
    ...clone(thread),
    askedBy: userPublic(userById(store, thread.askedById)),
    askedByName: userById(store, thread.askedById)?.name,
    offering: expandOffering(store, offeringById(store, thread.offeringId)),
    replies: replies.map((reply) => ({
      ...clone(reply),
      author: {
        ...userPublic(userById(store, reply.authorId)),
        qnaIdentity: userById(store, reply.authorId)?.role === 'teacher' ? 'Instructor' : userById(store, reply.authorId)?.role,
      },
    })),
    viewerPermissions: {
      canManageStatus: ['teacher', 'admin'].includes(currentUserRecord(store)?.role),
      canDeleteThread: true,
      canDeleteAnyReply: ['teacher', 'admin'].includes(currentUserRecord(store)?.role),
    },
    _count: { replies: replies.length },
  };
};

export const qnaAPI = {
  getThreads: (params = {}) => {
    const store = loadDemoStore();
    const user = currentUserRecord(store);
    const offeringId = params.offeringId || params?.params?.offeringId;
    const ids = user?.role === 'teacher' ? accessibleTeacherOfferingIds(store) : user?.role === 'student' ? offeringIdsForStudent(store, currentStudent(store)?.id) : new Set(store.offerings.map((offering) => offering.id));
    return dataOk(store.qnaThreads
      .filter((thread) => ids.has(thread.offeringId))
      .filter((thread) => !offeringId || thread.offeringId === offeringId)
      .map((thread) => expandThread(store, thread)));
  },
  getThread: (id) => {
    const store = loadDemoStore();
    const thread = findById(store.qnaThreads, id);
    return thread ? dataOk(expandThread(store, thread)) : fail('Thread not found', 404);
  },
  createThread: (payload = {}) => dataOk(writeDemoStore((store) => {
    const user = currentUserRecord(store);
    const thread = {
      id: nextDemoId('qna'),
      offeringId: payload.offeringId,
      title: payload.title,
      body: payload.body,
      status: 'OPEN',
      askedById: user?.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.qnaThreads.unshift(thread);
    return expandThread(store, thread);
  })),
  reply: (threadId, payload = {}) => dataOk(writeDemoStore((store) => {
    const user = currentUserRecord(store);
    const reply = { id: nextDemoId('reply'), threadId, authorId: user?.id, body: payload.body, createdAt: new Date().toISOString() };
    store.qnaReplies.push(reply);
    const thread = findById(store.qnaThreads, threadId);
    if (thread) {
      thread.status = 'ANSWERED';
      thread.updatedAt = new Date().toISOString();
    }
    return expandThread(store, thread);
  })),
  setStatus: (threadId, status) => dataOk(writeDemoStore((store) => {
    const thread = findById(store.qnaThreads, threadId);
    thread.status = status;
    thread.updatedAt = new Date().toISOString();
    return expandThread(store, thread);
  })),
  deleteThread: (threadId) => {
    writeDemoStore((store) => {
      store.qnaThreads = store.qnaThreads.filter((thread) => thread.id !== threadId);
      store.qnaReplies = store.qnaReplies.filter((reply) => reply.threadId !== threadId);
    });
    return ok({ success: true });
  },
  deleteReply: (replyId) => {
    writeDemoStore((store) => { store.qnaReplies = store.qnaReplies.filter((reply) => reply.id !== replyId); });
    return ok({ success: true });
  },
};

export const leaveAPI = {
  getPolicy: () => dataOk(clone(loadDemoStore().leavePolicy)),
  updatePolicy: (payload = {}) => dataOk(writeDemoStore((store) => {
    store.leavePolicy = { ...store.leavePolicy, ...payload };
    return clone(store.leavePolicy);
  })),
  getMy: () => {
    const store = loadDemoStore();
    const student = currentStudent(store) || store.students[0];
    return ok({
      success: true,
      data: store.enrollments
        .filter((enrollment) => enrollment.studentId === student.id)
        .map((enrollment) => ({
          enrollment: expandEnrollment(store, enrollment),
          counter: attendanceForEnrollment(store, enrollment),
          applications: store.leaveApplications.filter((app) => app.enrollmentId === enrollment.id).map(clone),
          fines: store.fines.filter((fine) => fine.enrollmentId === enrollment.id).map(clone),
          upcomingLectures: [
            { date: dateOnly(2), dayOfWeek: 'MON', title: 'Upcoming Lecture', sessions: expandOffering(store, offeringById(store, enrollment.offeringId)).sessions },
          ],
        })),
      config: clone(store.leavePolicy),
    });
  },
  submitApplication: (payload = {}) => dataOk(writeDemoStore((store) => {
    const student = currentStudent(store) || store.students[0];
    const enrollment = store.enrollments.find((item) => item.studentId === student.id && item.offeringId === payload.offeringId);
    const app = {
      id: nextDemoId('leave'),
      enrollmentId: enrollment?.id,
      studentId: student.id,
      offeringId: payload.offeringId,
      fromDate: payload.fromDate,
      toDate: payload.toDate,
      reason: payload.reason,
      status: 'PENDING',
      reviewNotes: '',
      createdAt: new Date().toISOString(),
      reviewedAt: null,
    };
    store.leaveApplications.unshift(app);
    return clone(app);
  })),
  getPendingForTeacher: () => {
    const store = loadDemoStore();
    const ids = accessibleTeacherOfferingIds(store);
    return dataOk(store.leaveApplications
      .filter((app) => ids.has(app.offeringId))
      .map((app) => ({
        ...clone(app),
        student: expandStudent(store, studentById(store, app.studentId)),
        offering: expandOffering(store, offeringById(store, app.offeringId)),
      })));
  },
  getOfferingStatus: (offeringId) => {
    const store = loadDemoStore();
    return dataOk({
      offering: expandOffering(store, offeringById(store, offeringId)),
      rows: store.enrollments.filter((enrollment) => enrollment.offeringId === offeringId).map((enrollment) => ({
        student: expandStudent(store, studentById(store, enrollment.studentId)),
        enrollmentStatus: enrollment.status,
        counter: attendanceForEnrollment(store, enrollment),
      })),
      applications: store.leaveApplications.filter((app) => app.offeringId === offeringId).map((app) => ({
        ...clone(app),
        student: expandStudent(store, studentById(store, app.studentId)),
      })),
    });
  },
  approve: (id, reviewNotes = '') => {
    writeDemoStore((store) => {
      const app = findById(store.leaveApplications, id);
      if (app) {
        app.status = 'APPROVED';
        app.reviewNotes = reviewNotes;
        app.reviewedAt = new Date().toISOString();
        addNotification(store, studentById(store, app.studentId)?.userId, { title: 'Leave approved', message: 'Your leave application was approved.', type: 'GENERAL', link: '/student/leave-status' });
      }
    });
    return ok({ success: true });
  },
  reject: (id, reviewNotes = '') => {
    writeDemoStore((store) => {
      const app = findById(store.leaveApplications, id);
      if (app) {
        app.status = 'REJECTED';
        app.reviewNotes = reviewNotes;
        app.reviewedAt = new Date().toISOString();
      }
    });
    return ok({ success: true });
  },
};

export const attendanceAPI = {
  getMy: () => {
    const store = loadDemoStore();
    const student = currentStudent(store) || store.students[0];
    return dataOk(store.enrollments
      .filter((enrollment) => enrollment.studentId === student.id)
      .map((enrollment) => ({
        offering: expandOffering(store, offeringById(store, enrollment.offeringId)),
        records: store.attendanceRecords.filter((record) => record.enrollmentId === enrollment.id),
        ...attendanceForEnrollment(store, enrollment),
      })));
  },
  getSessions: (offeringId) => {
    const store = loadDemoStore();
    const dates = [...new Set(store.attendanceRecords.filter((record) => record.offeringId === offeringId).map((record) => record.date))];
    return dataOk(dates.map((date) => {
      const records = store.attendanceRecords.filter((record) => record.offeringId === offeringId && record.date === date);
      return { date, total: records.length, present: records.filter((record) => record.status === 'PRESENT').length, absent: records.filter((record) => record.status === 'ABSENT').length, late: records.filter((record) => record.status === 'LATE').length };
    }));
  },
  getStudentSummary: (offeringId) => {
    const store = loadDemoStore();
    return dataOk(store.enrollments.filter((enrollment) => enrollment.offeringId === offeringId).map((enrollment) => ({
      student: expandStudent(store, studentById(store, enrollment.studentId)),
      ...attendanceForEnrollment(store, enrollment),
    })));
  },
  getSessionDetail: (offeringId, date) => {
    const store = loadDemoStore();
    return dataOk(store.enrollments.filter((enrollment) => enrollment.offeringId === offeringId).map((enrollment) => {
      const record = store.attendanceRecords.find((item) => item.enrollmentId === enrollment.id && item.date === date);
      return {
        id: record?.id || `pending_${enrollment.id}`,
        studentId: enrollment.studentId,
        enrollmentId: enrollment.id,
        student: expandStudent(store, studentById(store, enrollment.studentId)),
        status: record?.status || 'PRESENT',
      };
    }));
  },
  mark: (payload = {}) => {
    writeDemoStore((store) => {
      (payload.records || []).forEach((incoming) => {
        const enrollment = store.enrollments.find((item) => item.offeringId === payload.offeringId && item.studentId === incoming.studentId);
        const existing = store.attendanceRecords.find((record) => record.offeringId === payload.offeringId && record.date === payload.date && record.studentId === incoming.studentId);
        if (existing) existing.status = incoming.status;
        else store.attendanceRecords.push({ id: nextDemoId('att'), offeringId: payload.offeringId, enrollmentId: enrollment?.id, studentId: incoming.studentId, date: payload.date, status: incoming.status });
      });
    });
    return ok({ success: true });
  },
};

export const lectureAPI = {
  list: (offeringId) => dataOk((loadDemoStore().lectures || []).filter((lecture) => lecture.offeringId === offeringId).map(clone)),
  create: async (payload) => {
    const form = formToObject(payload);
    const file = form.material || form.file;
    const materialUrl = await fileToUrl(file, `Lecture material for ${form.title || 'demo lecture'}`);
    const lecture = writeDemoStore((store) => {
      if (!store.lectures) store.lectures = [];
      const next = {
        id: nextDemoId('lecture'),
        offeringId: form.offeringId,
        date: form.date || dateOnly(0),
        title: form.title || 'Demo Lecture',
        description: form.description || '',
        materialUrl,
        materialName: getFileName(file, 'lecture-material.txt'),
        createdAt: new Date().toISOString(),
      };
      store.lectures.unshift(next);
      return clone(next);
    });
    return dataOk(lecture);
  },
  update: async (id, payload) => {
    const form = formToObject(payload);
    const file = form.material || form.file;
    const materialUrl = file?.size ? await fileToUrl(file, `Lecture material for ${form.title || 'demo lecture'}`) : null;
    const lecture = writeDemoStore((store) => {
      const existing = (store.lectures || []).find((item) => item.id === id);
      if (!existing) return null;
      Object.assign(existing, {
        offeringId: form.offeringId || existing.offeringId,
        date: form.date || existing.date,
        title: form.title || existing.title,
        description: form.description ?? existing.description,
      });
      if (materialUrl) {
        existing.materialUrl = materialUrl;
        existing.materialName = getFileName(file, existing.materialName);
      }
      return clone(existing);
    });
    return lecture ? dataOk(lecture) : fail('Lecture not found', 404);
  },
  delete: (id) => {
    writeDemoStore((store) => { store.lectures = (store.lectures || []).filter((lecture) => lecture.id !== id); });
    return ok({ success: true });
  },
};

export const markComponentAPI = {
  listForOffering: (offeringId) => {
    const store = loadDemoStore();
    const offering = offeringById(store, offeringId);
    const course = expandCourse(store, courseById(store, offering?.courseId));
    return dataOk({
      ...expandOffering(store, offering),
      course,
      assignments: store.assignments.filter((assignment) => assignment.offeringId === offeringId).map(clone),
      quizzes: store.quizzes.filter((quiz) => quiz.offeringId === offeringId).map(clone),
      enrollments: store.enrollments.filter((enrollment) => enrollment.offeringId === offeringId).map((enrollment) => ({
        ...expandEnrollment(store, enrollment),
        markComponents: markComponentsForEnrollment(store, enrollment),
      })),
    });
  },
  init: (offeringId) => {
    let created = 0;
    writeDemoStore((store) => {
      const offering = offeringById(store, offeringId);
      const components = courseGradeComponents(store, offering?.courseId);
      store.enrollments.filter((enrollment) => enrollment.offeringId === offeringId).forEach((enrollment) => {
        components.filter((component) => !['ASSIGNMENT', 'QUIZ'].includes(component.kind)).forEach((component) => {
          for (let index = 1; index <= Number(component.count || 0); index += 1) {
            const exists = store.markCells.some((mark) => mark.enrollmentId === enrollment.id && mark.kind === component.kind && mark.index === index);
            if (!exists) {
              store.markCells.push({ id: nextDemoId('mark'), enrollmentId: enrollment.id, offeringId, studentId: enrollment.studentId, kind: component.kind, index, title: component.label, date: null, totalMarks: component.totalPerInstance, obtainedMarks: null });
              created += 1;
            }
          }
        });
      });
    });
    return ok({ success: true, created });
  },
  createAssessment: (offeringId, payload = {}) => {
    writeDemoStore((store) => {
      store.enrollments.filter((enrollment) => enrollment.offeringId === offeringId).forEach((enrollment) => {
        const existing = store.markCells.find((mark) => mark.enrollmentId === enrollment.id && mark.kind === payload.kind && Number(mark.index) === Number(payload.index));
        const target = existing || { id: nextDemoId('mark'), enrollmentId: enrollment.id, offeringId, studentId: enrollment.studentId, kind: payload.kind, index: Number(payload.index), obtainedMarks: null };
        Object.assign(target, { title: payload.title, date: payload.date, totalMarks: Number(payload.totalMarks || target.totalMarks || 0) });
        if (!existing) store.markCells.push(target);
      });
    });
    return ok({ success: true });
  },
  update: (markId, payload = {}) => {
    writeDemoStore((store) => {
      const mark = findById(store.markCells, markId);
      if (mark) mark.obtainedMarks = payload.obtainedMarks;
    });
    return ok({ success: true });
  },
};

export const taAPI = {
  getEligibility: () => {
    const store = loadDemoStore();
    const student = currentStudent(store) || store.students[0];
    const activeCount = store.taApplications.filter((app) => app.studentId === student.id && app.status === 'APPROVED').length;
    return dataOk({
      eligible: student.cgpa >= 3.0 && activeCount < 3,
      cgpa: student.cgpa,
      currentSemester: student.currentSemester,
      activeAssignmentCount: activeCount,
      config: { minCgpa: 3.0, maxActiveAssignments: 3 },
      eligibleCourses: store.offerings.map((offering) => {
        const course = courseById(store, offering.courseId);
        return {
          courseId: course.id,
          code: course.code,
          title: course.title,
          semesterSlot: student.currentSemester,
          sections: store.offerings
            .filter((item) => item.courseId === course.id)
            .map((item) => ({
              offeringId: item.id,
              section: item.section,
              teacher: userById(store, teacherById(store, item.teacherId)?.userId)?.name,
            })),
        };
      }),
      reasons: student.cgpa >= 3.0 ? [] : ['CGPA is below the demo threshold.'],
    });
  },
  getMy: () => {
    const store = loadDemoStore();
    const student = currentStudent(store) || store.students[0];
    return dataOk(store.taApplications.filter((app) => app.studentId === student.id).map((app) => expandTAApplication(store, app)));
  },
  getMyActive: () => {
    const store = loadDemoStore();
    const student = currentStudent(store);
    if (!student) return dataOk([]);
    return dataOk(store.taApplications.filter((app) => app.studentId === student.id && app.status === 'APPROVED').map((app) => expandTAApplication(store, app)));
  },
  apply: (payload = {}) => dataOk(writeDemoStore((store) => {
    const student = currentStudent(store) || store.students[0];
    const app = {
      id: nextDemoId('ta'),
      studentId: student.id,
      offeringId: payload.offeringId,
      status: 'PENDING',
      permissions: [],
      reason: payload.reason || '',
      reviewNotes: '',
      appliedAt: new Date().toISOString(),
      reviewedAt: null,
    };
    store.taApplications.unshift(app);
    return expandTAApplication(store, app);
  })),
  getTeacherApplications: () => {
    const store = loadDemoStore();
    const ids = accessibleTeacherOfferingIds(store);
    return dataOk(store.taApplications.filter((app) => ids.has(app.offeringId)).map((app) => expandTAApplication(store, app)));
  },
  getAll: (params = {}) => {
    const store = loadDemoStore();
    const status = params.status || params?.params?.status;
    const termId = params.termId || params?.params?.termId;
    const rows = store.taApplications
      .filter((app) => !status || app.status === status)
      .filter((app) => !termId || offeringById(store, app.offeringId)?.termId === termId)
      .map((app) => expandTAApplication(store, app));
    return ok({ success: true, data: rows, pagination: { page: 1, limit: rows.length || 25, total: rows.length, totalPages: 1 } });
  },
  approve: (id, payload = {}) => {
    writeDemoStore((store) => {
      const app = findById(store.taApplications, id);
      if (app) {
        app.status = 'APPROVED';
        app.permissions = ['VIEW_ROSTER', ...(payload.permissions || [])].filter((item, index, arr) => arr.indexOf(item) === index);
        app.reviewNotes = payload.reviewNotes || '';
        app.reviewedAt = new Date().toISOString();
      }
    });
    return ok({ success: true });
  },
  reject: (id, reviewNotes = '') => {
    writeDemoStore((store) => {
      const app = findById(store.taApplications, id);
      if (app) {
        app.status = 'REJECTED';
        app.reviewNotes = reviewNotes;
        app.reviewedAt = new Date().toISOString();
      }
    });
    return ok({ success: true });
  },
  relieve: (id, reviewNotes = '') => {
    writeDemoStore((store) => {
      const app = findById(store.taApplications, id);
      if (app) {
        app.status = 'RELIEVED';
        app.reviewNotes = reviewNotes;
        app.reviewedAt = new Date().toISOString();
      }
    });
    return ok({ success: true });
  },
  listResources: (offeringId) => dataOk(loadDemoStore().taResources.filter((resource) => resource.offeringId === offeringId).map(clone)),
  uploadResource: async (payload) => {
    const form = formToObject(payload);
    const file = form.file;
    const fileUrl = await fileToUrl(file, `TA resource: ${form.title || 'demo resource'}`);
    const resource = writeDemoStore((store) => {
      const next = {
        id: nextDemoId('ta_res'),
        offeringId: form.offeringId,
        taApplicationId: form.taApplicationId || null,
        title: form.title || 'TA Resource',
        description: form.description || '',
        fileUrl,
        fileName: getFileName(file, 'ta-resource.txt'),
        uploadedAt: new Date().toISOString(),
      };
      store.taResources.unshift(next);
      return clone(next);
    });
    return dataOk(resource);
  },
  deleteResource: (id) => {
    writeDemoStore((store) => { store.taResources = store.taResources.filter((resource) => resource.id !== id); });
    return ok({ success: true });
  },
};

const expandTAApplication = (store, app) => ({
  ...clone(app),
  student: expandStudent(store, studentById(store, app.studentId)),
  offering: expandOffering(store, offeringById(store, app.offeringId)),
});

export const admissionAPI = {
  getSettings: () => dataOk(clone(loadDemoStore().admissionSettings)),
  updateSettings: (payload = {}) => dataOk(writeDemoStore((store) => {
    store.admissionSettings = { ...store.admissionSettings, ...payload };
    return clone(store.admissionSettings);
  })),
  submitApplication: (payload = {}) => dataOk(writeDemoStore((store) => {
    const app = {
      id: nextDemoId('adm'),
      applicationNumber: `CO-ADM-${new Date().getFullYear()}-${1000 + store.admissionApplications.length + 1}`,
      fullName: payload.fullName || `${payload.firstName || 'Demo'} ${payload.lastName || 'Applicant'}`.trim(),
      email: payload.email,
      phone: payload.phone,
      cnic: payload.cnic,
      dateOfBirth: payload.dateOfBirth,
      gender: payload.gender,
      program: payload.program || payload.programName || payload.selectedProgram || 'BS Software Engineering',
      status: 'PENDING',
      submittedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      address: payload.address || {},
      guardian: payload.guardian || {},
      educationRecords: payload.educationRecords || [],
      documents: [],
      reviewNotes: '',
    };
    store.admissionApplications.unshift(app);
    addAudit(store, { action: 'CREATE', category: 'Admissions', targetModel: 'AdmissionApplication', targetId: app.id, description: `Submitted demo application ${app.applicationNumber}.` });
    return { ...clone(app), applicationId: app.id };
  })),
  checkDuplicateEmail: () => ok({ exists: false, available: true }),
  checkDuplicateCNIC: () => ok({ exists: false, available: true }),
  checkDuplicatePhone: () => ok({ exists: false, available: true }),
  uploadApplicationDocuments: async (applicationId, payload) => {
    const form = formToObject(payload);
    const documents = Array.isArray(form.documents) ? form.documents : [form.documents].filter(Boolean);
    const uploaded = [];
    for (const document of documents) {
      uploaded.push({
        id: nextDemoId('doc'),
        type: form.documentType || 'supportingDocument',
        fileName: getFileName(document, 'application-document.txt'),
        url: await fileToUrl(document, 'Application document'),
      });
    }
    writeDemoStore((store) => {
      const app = findById(store.admissionApplications, applicationId);
      if (app) app.documents = [...(app.documents || []), ...uploaded];
    });
    return ok({ success: true, data: uploaded });
  },
  getAllApplications: (params = {}) => {
    const store = loadDemoStore();
    const status = params.status || params?.params?.status;
    const page = Number(params.page || 1);
    const limit = Number(params.limit || 10);
    const filtered = sortByDateDesc(store.admissionApplications, 'submittedAt')
      .filter((app) => !status || admissionDisplayStatus(app.status) === status)
      .map((app) => ({ ...clone(app), status: admissionDisplayStatus(app.status) }));
    const start = (page - 1) * limit;
    return dataOk({ applications: filtered.slice(start, start + limit), total: filtered.length });
  },
  getApplication: (id) => {
    const store = loadDemoStore();
    const app = findById(store.admissionApplications, id);
    return app ? dataOk({ ...clone(app), status: admissionDisplayStatus(app.status) }) : fail('Application not found', 404);
  },
  updateApplicationStatus: (id, status, reason = '') => {
    writeDemoStore((store) => {
      const app = findById(store.admissionApplications, id);
      if (app) {
        app.status = normalizeStatus(status);
        app.reviewNotes = reason || app.reviewNotes || '';
      }
    });
    return ok({ success: true });
  },
  getStatistics: () => {
    const store = loadDemoStore();
    const statuses = store.admissionApplications.map((app) => normalizeStatus(app.status));
    return dataOk({
      pending: statuses.filter((status) => status === 'PENDING').length,
      underReview: statuses.filter((status) => status === 'UNDER_REVIEW').length,
      accepted: statuses.filter((status) => status === 'ACCEPTED').length,
      rejected: statuses.filter((status) => status === 'REJECTED').length,
      total: statuses.length,
    });
  },
  uploadDocument: () => dataOk({ url: textDataUrl('Uploaded demo document') }),
  getDocuments: (applicationId) => dataOk(findById(loadDemoStore().admissionApplications, applicationId)?.documents || []),
  deleteDocument: (applicationId, documentId) => {
    writeDemoStore((store) => {
      const app = findById(store.admissionApplications, applicationId);
      if (app) app.documents = (app.documents || []).filter((doc) => doc.id !== documentId);
    });
    return ok({ success: true });
  },
};

export const auditLogAPI = {
  getLogs: (params = {}) => {
    const store = loadDemoStore();
    const page = Number(params.page || 1);
    const limit = Number(params.limit || 25);
    const category = params.category || '';
    const rows = sortByDateDesc(store.auditLogs)
      .filter((log) => !category || log.category === category)
      .map((log) => ({ ...clone(log), performer: userPublic(userById(store, log.performerId)) }));
    const start = (page - 1) * limit;
    return dataOk(rows.slice(start, start + limit), {
      pagination: {
        page,
        limit,
        total: rows.length,
        totalPages: Math.max(1, Math.ceil(rows.length / limit)),
        hasPrev: page > 1,
        hasNext: page * limit < rows.length,
      },
    });
  },
  getCategories: () => dataOk([...new Set(loadDemoStore().auditLogs.map((log) => log.category))]),
};

export const reportsAPI = {
  overview: () => {
    const store = loadDemoStore();
    return dataOk({
      students: store.students.length,
      teachers: store.teachers.length,
      courses: store.courses.length,
      activeOfferings: store.offerings.length,
      averageCgpa: Math.round((store.students.reduce((sum, student) => sum + student.cgpa, 0) / store.students.length) * 100) / 100,
      admissions: store.admissionApplications.length,
    });
  },
  enrollmentByProgram: () => {
    const store = loadDemoStore();
    return dataOk(store.programs.map((program) => ({
      program: program.programCode,
      name: program.name,
      students: store.students.filter((student) => student.programId === program.id).length,
    })));
  },
  termTrends: () => dataOk([
    { term: 'SP25', enrollments: 412, attendance: 83, cgpa: 3.21 },
    { term: 'FA25', enrollments: 438, attendance: 85, cgpa: 3.27 },
    { term: 'SP26', enrollments: 462, attendance: 84, cgpa: 3.31 },
    { term: 'FA26', enrollments: 489, attendance: 87, cgpa: 3.36 },
  ]),
  admissionFunnel: () => {
    const store = loadDemoStore();
    return dataOk([
      { stage: 'Submitted', count: store.admissionApplications.length },
      { stage: 'Under Review', count: store.admissionApplications.filter((app) => normalizeStatus(app.status) === 'UNDER_REVIEW').length },
      { stage: 'Accepted', count: store.admissionApplications.filter((app) => normalizeStatus(app.status) === 'ACCEPTED').length },
      { stage: 'Rejected', count: store.admissionApplications.filter((app) => normalizeStatus(app.status) === 'REJECTED').length },
    ]);
  },
  coursePerformance: () => {
    const store = loadDemoStore();
    return dataOk(store.offerings.map((offering) => ({
      courseCode: courseById(store, offering.courseId)?.code,
      courseTitle: courseById(store, offering.courseId)?.title,
      section: offering.section,
      average: Math.round((70 + Math.random() * 18) * 10) / 10,
      passRate: Math.round((82 + Math.random() * 12) * 10) / 10,
    })));
  },
  gradeDistribution: () => dataOk([
    { grade: 'A', count: 28 },
    { grade: 'A-', count: 34 },
    { grade: 'B+', count: 41 },
    { grade: 'B', count: 37 },
    { grade: 'C+', count: 18 },
    { grade: 'C', count: 9 },
  ]),
  attendanceSummary: () => {
    const store = loadDemoStore();
    const rows = store.enrollments.map((enrollment) => attendanceForEnrollment(store, enrollment));
    const average = rows.length ? rows.reduce((sum, row) => sum + row.percentage, 0) / rows.length : 0;
    return dataOk({
      average: Math.round(average * 10) / 10,
      atRisk: rows.filter((row) => row.isAtRisk).length,
      excellent: rows.filter((row) => row.percentage >= 90).length,
      total: rows.length,
    });
  },
};

export const curriculumAPI = {};
export const semesterInchargeAPI = {};

const api = {
  get: () => fail('HTTP requests are disabled in the frontend demo'),
  post: () => fail('HTTP requests are disabled in the frontend demo'),
  put: () => fail('HTTP requests are disabled in the frontend demo'),
  patch: () => fail('HTTP requests are disabled in the frontend demo'),
  delete: () => fail('HTTP requests are disabled in the frontend demo'),
};

export default api;
