import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen, FileText, HelpCircle, Award, AlertTriangle, Megaphone,
  Clock, Calendar, ChevronRight, ArrowRight, Loader2, TrendingUp,
  CheckCircle, Target,
} from 'lucide-react';
import { dashboardAPI } from '../../utils/api';
import toast from 'react-hot-toast';

const fmtRelative = (d) => {
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const fmtDate = (d) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
const fmtDateTime = (d) => new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

const dueLabel = (dueDate) => {
  const diff = Math.ceil((new Date(dueDate) - Date.now()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return <span className="text-red-600 font-medium">Overdue</span>;
  if (diff === 0) return <span className="text-amber-600 font-medium">Due today</span>;
  if (diff <= 3) return <span className="text-amber-600 font-medium">Due in {diff}d</span>;
  return <span className="text-slate-500">Due in {diff}d</span>;
};

const StatCard = ({ icon: Icon, label, value, sub, color, link, valueColor }) => {
  const card = (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-5 ${link ? 'hover:shadow-md hover:border-blue-300 cursor-pointer transition-all' : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <div className={`p-2 rounded-lg ${color}`}><Icon className="w-5 h-5 text-white" /></div>
        {link && <ChevronRight size={16} className="text-slate-300" />}
      </div>
      <div className={`text-3xl font-bold ${valueColor || 'text-slate-900'}`}>{value}</div>
      <div className="text-sm text-slate-600">{label}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  );
  return link ? <Link to={link}>{card}</Link> : card;
};

const PRIORITY_COLOR = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-blue-100 text-blue-700',
  low: 'bg-green-100 text-green-700',
};

const StudentDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.student()
      .then((r) => setData(r.data.data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>;
  if (!data) return <div className="p-6 text-center text-slate-500">Failed to load dashboard</div>;

  const {
    student, activeTerm, stats, currentEnrollments, pendingAssignments,
    availableQuizzes, upcomingQuizzes, recentGrades, recentQuizAttempts,
    attendanceSummary, recentAnnouncements,
  } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 m-0">Welcome back, {student.name?.split(' ')[0] || 'Student'} 👋</h1>
          <p className="text-slate-600 m-0">
            {student.studentId} · {student.program}
            {student.batch && <> · Batch {student.batch}</>}
            {student.currentSemester && <> · Sem {student.currentSemester}</>}
            {activeTerm && <> · <span className="font-medium">{activeTerm.code} {activeTerm.academicYear}</span></>}
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <StatCard
            icon={BookOpen} label="Enrolled Courses"
            value={stats.enrolledCourses}
            sub={`${stats.totalCredits} credit hours`}
            color="bg-blue-500"
            link="/student/courses"
          />
          <StatCard
            icon={Award} label="CGPA"
            value={stats.cgpa ?? '—'}
            sub="Cumulative"
            color="bg-purple-500"
            link="/student/transcript"
            valueColor={stats.cgpa && +stats.cgpa >= 3.0 ? 'text-green-600' : stats.cgpa && +stats.cgpa < 2.0 ? 'text-red-600' : 'text-slate-900'}
          />
          <StatCard
            icon={FileText} label="Pending Assignments"
            value={stats.pendingAssignmentsCount}
            sub={stats.overdueCount > 0 ? `${stats.overdueCount} overdue` : `${stats.dueSoonCount} due this week`}
            color={stats.overdueCount > 0 ? 'bg-red-500' : 'bg-amber-500'}
            link="/student/assignments"
          />
          <StatCard
            icon={HelpCircle} label="Quizzes Available"
            value={stats.availableQuizzesCount}
            sub={`${stats.upcomingQuizzesCount} upcoming this week`}
            color="bg-cyan-500"
            link="/student/quizzes"
          />
          <StatCard
            icon={AlertTriangle} label="Low Attendance"
            value={stats.lowAttendanceCount}
            sub={stats.lowAttendanceCount > 0 ? 'Courses below 75%' : 'All on track ✓'}
            color={stats.lowAttendanceCount > 0 ? 'bg-red-500' : 'bg-green-500'}
            link="/student/attendance"
            valueColor={stats.lowAttendanceCount > 0 ? 'text-red-600' : 'text-green-600'}
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Assignments */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800 m-0 flex items-center gap-2">
                <FileText size={18} className="text-amber-500" /> Pending Assignments
              </h2>
              <Link to="/student/assignments" className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1">
                View all <ArrowRight size={14} />
              </Link>
            </div>
            {pendingAssignments.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6 m-0">No pending assignments 🎉</p>
            ) : (
              <div className="space-y-2">
                {pendingAssignments.slice(0, 5).map((a) => (
                  <Link
                    key={a.id} to="/student/assignments"
                    className="block p-3 rounded-lg border border-slate-100 hover:bg-slate-50 hover:border-blue-200 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 m-0 truncate">{a.title}</p>
                        <p className="text-xs text-slate-500 m-0 mt-1">
                          {a.offering?.course?.code} · {a.totalMarks} marks
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0 text-xs">
                        {dueLabel(a.dueDate)}
                        <div className="text-slate-400 mt-1">{fmtDate(a.dueDate)}</div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Available Quizzes */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800 m-0 flex items-center gap-2">
                <HelpCircle size={18} className="text-cyan-500" /> Quizzes
              </h2>
              <Link to="/student/quizzes" className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1">
                View all <ArrowRight size={14} />
              </Link>
            </div>
            {availableQuizzes.length === 0 && upcomingQuizzes.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6 m-0">No quizzes scheduled</p>
            ) : (
              <div className="space-y-3">
                {availableQuizzes.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-green-700 uppercase tracking-wide mb-2 m-0">Available now</p>
                    <div className="space-y-2">
                      {availableQuizzes.map((q) => (
                        <Link
                          key={q.id} to="/student/quizzes"
                          className="block p-3 rounded-lg border border-green-200 bg-green-50/50 hover:bg-green-50 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-800 m-0 truncate">{q.title}</p>
                              <p className="text-xs text-slate-600 m-0 mt-1">
                                {q.offering?.course?.code} · {q._count?.questions ?? 0} questions · {q.durationMinutes} min
                              </p>
                            </div>
                            <span className="text-xs text-amber-600 font-medium flex-shrink-0">Closes {fmtDateTime(q.endAt)}</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
                {upcomingQuizzes.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 m-0">Upcoming</p>
                    <div className="space-y-2">
                      {upcomingQuizzes.map((q) => (
                        <div key={q.id} className="p-3 rounded-lg border border-slate-100">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-slate-800 m-0 truncate">{q.title}</p>
                              <p className="text-xs text-slate-500 m-0 mt-1">
                                {q.offering?.course?.code} · {q._count?.questions ?? 0} questions
                              </p>
                            </div>
                            <span className="text-xs text-slate-500 flex-shrink-0">Opens {fmtDateTime(q.startAt)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Attendance Summary */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800 m-0 flex items-center gap-2">
                <Target size={18} className="text-blue-500" /> Attendance
              </h2>
              <Link to="/student/attendance" className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1">
                View all <ArrowRight size={14} />
              </Link>
            </div>
            {attendanceSummary.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6 m-0">No attendance records yet</p>
            ) : (
              <div className="space-y-2">
                {attendanceSummary.map((a) => (
                  <div key={a.offeringId} className="p-3 rounded-lg border border-slate-100">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 m-0 truncate">{a.courseCode} <span className="text-slate-500 font-normal">— Sec {a.section}</span></p>
                        <p className="text-xs text-slate-500 m-0">{a.total} sessions ({a.present} present, {a.late} late, {a.absent} absent)</p>
                      </div>
                      <span className={`text-lg font-bold ${a.isAtRisk ? 'text-red-600' : a.percentage >= 85 ? 'text-green-600' : 'text-slate-700'}`}>
                        {a.percentage !== null ? `${a.percentage}%` : '—'}
                      </span>
                    </div>
                    {a.percentage !== null && (
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full ${a.isAtRisk ? 'bg-red-500' : a.percentage >= 85 ? 'bg-green-500' : 'bg-blue-500'}`}
                          style={{ width: `${a.percentage}%` }}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Grades */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800 m-0 flex items-center gap-2">
                <CheckCircle size={18} className="text-green-500" /> Recent Grades
              </h2>
            </div>
            {recentGrades.length === 0 && recentQuizAttempts.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6 m-0">No graded work yet</p>
            ) : (
              <div className="space-y-2">
                {recentGrades.map((g) => {
                  const pct = g.assignment.totalMarks > 0 ? Math.round((g.obtainedMarks / g.assignment.totalMarks) * 100) : 0;
                  return (
                    <div key={g.id} className="flex items-center justify-between gap-2 p-3 rounded-lg border border-slate-100">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 m-0 truncate">{g.assignment.title}</p>
                        <p className="text-xs text-slate-500 m-0">
                          {g.assignment.offering?.course?.code} · Assignment · {fmtRelative(g.gradedAt)}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className={`font-bold ${pct >= 70 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                          {g.obtainedMarks} / {g.assignment.totalMarks}
                        </div>
                        <div className="text-xs text-slate-400">{pct}%</div>
                      </div>
                    </div>
                  );
                })}
                {recentQuizAttempts.map((q) => {
                  const pct = q.quiz.totalMarks > 0 ? Math.round(((q.totalScore ?? 0) / q.quiz.totalMarks) * 100) : 0;
                  return (
                    <div key={q.id} className="flex items-center justify-between gap-2 p-3 rounded-lg border border-slate-100">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 m-0 truncate">{q.quiz.title}</p>
                        <p className="text-xs text-slate-500 m-0">
                          {q.quiz.offering?.course?.code} · Quiz · {fmtRelative(q.submittedAt)}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className={`font-bold ${pct >= 70 ? 'text-green-600' : pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                          {q.totalScore ?? '—'} / {q.quiz.totalMarks}
                        </div>
                        <div className="text-xs text-slate-400">{pct}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Announcements */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800 m-0 flex items-center gap-2">
                <Megaphone size={18} className="text-blue-500" /> Recent Announcements
              </h2>
            </div>
            {recentAnnouncements.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6 m-0">No announcements</p>
            ) : (
              <div className="space-y-2">
                {recentAnnouncements.map((a) => (
                  <div key={a.id} className="p-3 rounded-lg border border-slate-100">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-medium text-slate-800 m-0 flex-1">{a.title}</p>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${PRIORITY_COLOR[a.priority] || 'bg-slate-100'}`}>
                        {a.priority}
                      </span>
                    </div>
                    <p className="text-sm text-slate-600 line-clamp-2 m-0">{a.content}</p>
                    <p className="text-xs text-slate-400 mt-1 m-0">{fmtRelative(a.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
