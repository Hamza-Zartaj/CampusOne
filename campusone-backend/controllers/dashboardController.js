import prisma from '../prisma/client.js';

// Letter → grade points (mirror enrollmentController logic)
const GRADE_POINTS = {
  A_PLUS: 4.0, A: 4.0, A_MINUS: 3.7,
  B_PLUS: 3.3, B: 3.0, B_MINUS: 2.7,
  C_PLUS: 2.3, C: 2.0, C_MINUS: 1.7,
  D_PLUS: 1.3, D: 1.0,
  F: 0.0,
};

// ─── ADMIN DASHBOARD ─────────────────────────────────────────────────────────
export const getAdminDashboard = async (req, res) => {
  try {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      students,
      teachers,
      admins,
      pendingAdmissions,
      departments,
      programs,
      courses,
      activeOfferings,
      openQna,
      auditLast24h,
      newSignupsThisWeek,
      recentAdmissions,
      recentAnnouncements,
      recentAuditLogs,
    ] = await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { role: 'student', isActive: true } }),
      prisma.user.count({ where: { role: 'teacher', isActive: true } }),
      prisma.user.count({ where: { role: 'admin', isActive: true } }),
      prisma.admissionApplication.count({ where: { applicationStatus: 'Pending' } }),
      prisma.department.count({ where: { isActive: true } }),
      prisma.program.count({ where: { isActive: true } }),
      prisma.course.count({ where: { isActive: true } }),
      prisma.courseOffering.count({ where: { isActive: true } }),
      prisma.qnaThread.count({ where: { status: 'OPEN' } }),
      prisma.auditLog.count({ where: { createdAt: { gte: dayAgo } } }),
      prisma.user.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.admissionApplication.findMany({
        where: { applicationStatus: 'Pending' },
        orderBy: { applicationDate: 'desc' },
        take: 5,
        select: { id: true, applicationNumber: true, fullName: true, email: true, program: true, applicationDate: true },
      }),
      prisma.announcement.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, title: true, priority: true, targetAudience: true, createdAt: true },
      }),
      prisma.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, action: true, category: true, performedByRole: true, description: true, createdAt: true },
      }),
    ]);

    res.json({
      success: true,
      data: {
        stats: {
          totalUsers,
          students,
          teachers,
          admins,
          pendingAdmissions,
          departments,
          programs,
          courses,
          activeOfferings,
          openQna,
          auditLast24h,
          newSignupsThisWeek,
        },
        recentAdmissions,
        recentAnnouncements,
        recentAuditLogs,
      },
    });
  } catch (err) {
    console.error('[dashboard:admin]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── TEACHER DASHBOARD ───────────────────────────────────────────────────────
export const getTeacherDashboard = async (req, res) => {
  try {
    const teacher = await prisma.teacher.findUnique({ where: { userId: req.user.id } });
    if (!teacher) return res.status(404).json({ success: false, message: 'Teacher profile not found' });

    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Get active term + my offerings under it
    const activeTerm = await prisma.term.findFirst({
      where: { isActive: true },
      orderBy: { startDate: 'desc' },
    });

    const myOfferings = await prisma.courseOffering.findMany({
      where: {
        teacherId: teacher.id,
        ...(activeTerm ? { termId: activeTerm.id } : {}),
        isActive: true,
      },
      include: {
        course: { select: { id: true, code: true, title: true, creditHours: true } },
        term: { select: { code: true, season: true, academicYear: true } },
        _count: { select: { enrollments: true } },
      },
      orderBy: { course: { code: 'asc' } },
    });

    const offeringIds = myOfferings.map((o) => o.id);

    const [
      totalStudents,
      pendingSubmissions,
      pendingShortAnswers,
      openQnaCount,
      upcomingQuizzesCount,
      recentQna,
      upcomingQuizzes,
      recentAnnouncements,
    ] = await Promise.all([
      prisma.enrollment.count({ where: { offeringId: { in: offeringIds }, status: 'ENROLLED' } }),
      prisma.submission.count({
        where: { assignment: { offeringId: { in: offeringIds } }, status: { in: ['SUBMITTED', 'LATE'] } },
      }),
      prisma.quizAnswer.count({
        where: {
          attempt: { quiz: { offeringId: { in: offeringIds } }, status: { in: ['SUBMITTED', 'AUTO_SUBMITTED'] } },
          question: { type: 'SHORT' },
          isCorrect: null,
        },
      }),
      prisma.qnaThread.count({ where: { offeringId: { in: offeringIds }, status: 'OPEN' } }),
      prisma.quiz.count({
        where: {
          offeringId: { in: offeringIds },
          status: 'PUBLISHED',
          startAt: { gte: now, lte: weekFromNow },
        },
      }),
      prisma.qnaThread.findMany({
        where: { offeringId: { in: offeringIds }, status: 'OPEN' },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        include: {
          offering: { select: { course: { select: { code: true } }, section: true } },
          _count: { select: { replies: true } },
        },
      }),
      prisma.quiz.findMany({
        where: {
          offeringId: { in: offeringIds },
          status: 'PUBLISHED',
          endAt: { gte: now },
        },
        orderBy: { startAt: 'asc' },
        take: 5,
        include: {
          offering: { select: { course: { select: { code: true, title: true } }, section: true } },
          _count: { select: { questions: true, attempts: true } },
        },
      }),
      prisma.announcement.findMany({
        where: { OR: [{ targetAudience: 'all' }, { targetAudience: 'teachers' }] },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, title: true, priority: true, content: true, createdAt: true },
      }),
    ]);

    // Enrich Q&A with asker name
    const askerIds = recentQna.map((t) => t.askedById);
    const askers = askerIds.length
      ? await prisma.user.findMany({ where: { id: { in: askerIds } }, select: { id: true, name: true } })
      : [];
    const askerMap = new Map(askers.map((u) => [u.id, u.name]));
    const enrichedQna = recentQna.map((t) => ({ ...t, askedByName: askerMap.get(t.askedById) || 'Unknown' }));

    res.json({
      success: true,
      data: {
        teacher: {
          name: req.user.name,
          designation: teacher.designation,
          employeeId: teacher.employeeId,
        },
        activeTerm,
        stats: {
          myOfferings: myOfferings.length,
          totalStudents,
          pendingSubmissions,
          pendingShortAnswers,
          openQnaCount,
          upcomingQuizzesCount,
        },
        myOfferings,
        recentQna: enrichedQna,
        upcomingQuizzes,
        recentAnnouncements,
      },
    });
  } catch (err) {
    console.error('[dashboard:teacher]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── STUDENT DASHBOARD ───────────────────────────────────────────────────────
export const getStudentDashboard = async (req, res) => {
  try {
    const student = await prisma.student.findUnique({
      where: { userId: req.user.id },
      include: {
        program: { select: { name: true, programCode: true } },
        department: { select: { name: true, code: true } },
      },
    });
    if (!student) return res.status(404).json({ success: false, message: 'Student profile not found' });

    const now = new Date();
    const weekFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Active term
    const activeTerm = await prisma.term.findFirst({
      where: { isActive: true },
      orderBy: { startDate: 'desc' },
    });

    // Current enrollments
    const currentEnrollments = await prisma.enrollment.findMany({
      where: {
        studentId: student.id,
        status: 'ENROLLED',
        ...(activeTerm ? { offering: { termId: activeTerm.id } } : {}),
      },
      include: {
        offering: {
          include: {
            course: { select: { id: true, code: true, title: true, creditHours: true } },
            teacher: { select: { user: { select: { name: true } } } },
          },
        },
      },
    });

    const currentOfferingIds = currentEnrollments.map((e) => e.offeringId);
    const totalCredits = currentEnrollments.reduce((s, e) => s + (e.offering?.course?.creditHours || 0), 0);

    // CGPA — across ALL completed enrollments
    const completedEnrollments = await prisma.enrollment.findMany({
      where: {
        studentId: student.id,
        status: 'COMPLETED',
        gradeLetter: { not: null },
      },
      include: { offering: { select: { course: { select: { creditHours: true } } } } },
    });
    let totalGradePoints = 0;
    let totalCreditHours = 0;
    completedEnrollments.forEach((e) => {
      const credits = e.offering?.course?.creditHours || 0;
      const points = GRADE_POINTS[e.gradeLetter] ?? 0;
      totalGradePoints += points * credits;
      totalCreditHours += credits;
    });
    const cgpa = totalCreditHours > 0 ? (totalGradePoints / totalCreditHours).toFixed(2) : null;

    const [
      pendingAssignments,
      availableQuizzes,
      upcomingQuizzes,
      recentGrades,
      attendanceRecords,
      recentAnnouncements,
      submittedQuizAttempts,
    ] = await Promise.all([
      // Pending assignments — published, no submission, due within next 7 days OR overdue
      prisma.assignment.findMany({
        where: {
          offeringId: { in: currentOfferingIds },
          status: 'PUBLISHED',
          submissions: { none: { studentId: student.id } },
        },
        orderBy: { dueDate: 'asc' },
        take: 10,
        include: {
          offering: { select: { course: { select: { code: true, title: true } }, section: true } },
        },
      }),
      // Quizzes open right now (no attempt yet)
      prisma.quiz.findMany({
        where: {
          offeringId: { in: currentOfferingIds },
          status: 'PUBLISHED',
          startAt: { lte: now },
          endAt: { gte: now },
          attempts: { none: { studentId: student.id } },
        },
        orderBy: { endAt: 'asc' },
        take: 5,
        include: {
          offering: { select: { course: { select: { code: true, title: true } } } },
          _count: { select: { questions: true } },
        },
      }),
      // Quizzes scheduled within the next 7 days, not yet attempted
      prisma.quiz.findMany({
        where: {
          offeringId: { in: currentOfferingIds },
          status: 'PUBLISHED',
          startAt: { gt: now, lte: weekFromNow },
        },
        orderBy: { startAt: 'asc' },
        take: 5,
        include: {
          offering: { select: { course: { select: { code: true, title: true } } } },
          _count: { select: { questions: true } },
        },
      }),
      // Recent graded submissions
      prisma.submission.findMany({
        where: { studentId: student.id, status: 'GRADED' },
        orderBy: { gradedAt: 'desc' },
        take: 5,
        include: {
          assignment: {
            select: {
              title: true, totalMarks: true,
              offering: { select: { course: { select: { code: true } } } },
            },
          },
        },
      }),
      // Attendance per offering
      prisma.attendance.findMany({
        where: { studentId: student.id, offeringId: { in: currentOfferingIds } },
        select: { offeringId: true, status: true },
      }),
      prisma.announcement.findMany({
        where: { OR: [{ targetAudience: 'all' }, { targetAudience: 'students' }] },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, title: true, priority: true, content: true, createdAt: true },
      }),
      // Quiz attempts with totalScore (for "recent quiz scores" widget)
      prisma.quizAttempt.findMany({
        where: { studentId: student.id, status: { in: ['SUBMITTED', 'AUTO_SUBMITTED'] } },
        orderBy: { submittedAt: 'desc' },
        take: 5,
        include: { quiz: { select: { title: true, totalMarks: true, offering: { select: { course: { select: { code: true } } } } } } },
      }),
    ]);

    // Build attendance summary per offering
    const attendanceByOffering = {};
    attendanceRecords.forEach((a) => {
      if (!attendanceByOffering[a.offeringId]) {
        attendanceByOffering[a.offeringId] = { total: 0, present: 0, late: 0, absent: 0 };
      }
      const s = attendanceByOffering[a.offeringId];
      s.total += 1;
      if (a.status === 'PRESENT') s.present += 1;
      else if (a.status === 'LATE') s.late += 1;
      else if (a.status === 'ABSENT') s.absent += 1;
    });

    const attendanceSummary = currentEnrollments.map((e) => {
      const s = attendanceByOffering[e.offeringId] || { total: 0, present: 0, late: 0, absent: 0 };
      const presentCount = s.present + s.late;
      const percentage = s.total > 0 ? Math.round((presentCount / s.total) * 100) : null;
      return {
        offeringId: e.offeringId,
        courseCode: e.offering?.course?.code,
        courseTitle: e.offering?.course?.title,
        section: e.offering?.section,
        ...s,
        percentage,
        isAtRisk: percentage !== null && percentage < 75,
      };
    });

    const lowAttendanceCount = attendanceSummary.filter((a) => a.isAtRisk).length;

    // Categorize pending assignments: overdue vs due-soon
    const dueSoon = pendingAssignments.filter((a) => new Date(a.dueDate) >= now && new Date(a.dueDate) <= weekFromNow).length;
    const overdue = pendingAssignments.filter((a) => new Date(a.dueDate) < now).length;

    res.json({
      success: true,
      data: {
        student: {
          name: req.user.name,
          studentId: student.studentId,
          program: student.program?.name,
          department: student.department?.name,
          currentSemester: student.currentSemester,
          batch: student.batch,
        },
        activeTerm,
        stats: {
          enrolledCourses: currentEnrollments.length,
          totalCredits,
          cgpa,
          pendingAssignmentsCount: pendingAssignments.length,
          dueSoonCount: dueSoon,
          overdueCount: overdue,
          availableQuizzesCount: availableQuizzes.length,
          upcomingQuizzesCount: upcomingQuizzes.length,
          lowAttendanceCount,
        },
        currentEnrollments: currentEnrollments.map((e) => ({
          id: e.id,
          offeringId: e.offeringId,
          courseCode: e.offering?.course?.code,
          courseTitle: e.offering?.course?.title,
          section: e.offering?.section,
          creditHours: e.offering?.course?.creditHours,
          teacherName: e.offering?.teacher?.user?.name,
        })),
        pendingAssignments,
        availableQuizzes,
        upcomingQuizzes,
        recentGrades,
        recentQuizAttempts: submittedQuizAttempts,
        attendanceSummary,
        recentAnnouncements,
      },
    });
  } catch (err) {
    console.error('[dashboard:student]', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
