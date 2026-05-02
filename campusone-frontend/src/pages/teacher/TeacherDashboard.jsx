import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, BookOpen, FileText, MessageSquare, HelpCircle, Megaphone,
  Clock, Award, ChevronRight, ArrowRight, Loader2, Calendar,
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

const fmtDateTime = (d) => new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });

const StatCard = ({ icon: Icon, label, value, sub, color, link }) => {
  const card = (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-5 ${link ? 'hover:shadow-md hover:border-blue-300 cursor-pointer transition-all' : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <div className={`p-2 rounded-lg ${color}`}><Icon className="w-5 h-5 text-white" /></div>
        {link && <ChevronRight size={16} className="text-slate-300" />}
      </div>
      <div className="text-3xl font-bold text-slate-900">{value}</div>
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

const TeacherDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardAPI.teacher()
      .then((r) => setData(r.data.data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>;
  if (!data) return <div className="p-6 text-center text-slate-500">Failed to load dashboard</div>;

  const { teacher, activeTerm, stats, myOfferings, recentQna, upcomingQuizzes, recentAnnouncements } = data;

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 m-0">Welcome back, {teacher.name?.split(' ')[0] || 'Teacher'} 👋</h1>
          <p className="text-slate-600 m-0">
            {teacher.designation} · {teacher.employeeId}
            {activeTerm && <> · <span className="font-medium">{activeTerm.code} {activeTerm.academicYear}</span></>}
          </p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          <StatCard icon={BookOpen} label="My Offerings" value={stats.myOfferings} sub="This term" color="bg-blue-500" link="/teacher/offerings" />
          <StatCard icon={Users} label="Total Students" value={stats.totalStudents} sub="Across all sections" color="bg-purple-500" />
          <StatCard icon={FileText} label="Pending Grading" value={stats.pendingSubmissions} sub="Assignment submissions" color="bg-amber-500" link="/teacher/assignments" />
          <StatCard icon={HelpCircle} label="Quiz SHORT to grade" value={stats.pendingShortAnswers} sub="Short answers waiting" color="bg-orange-500" link="/teacher/quizzes" />
          <StatCard icon={MessageSquare} label="Open Questions" value={stats.openQnaCount} sub={`${stats.upcomingQuizzesCount} quizzes this week`} color="bg-cyan-500" link="/teacher/qna" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* My Offerings */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800 m-0 flex items-center gap-2">
                <BookOpen size={18} className="text-blue-500" /> My Course Offerings
              </h2>
              <Link to="/teacher/offerings" className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1">
                View all <ArrowRight size={14} />
              </Link>
            </div>
            {myOfferings.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6 m-0">No offerings assigned this term</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {myOfferings.map((o) => (
                  <Link
                    key={o.id} to={`/teacher/offerings`}
                    className="block p-4 rounded-lg border border-slate-100 hover:bg-slate-50 hover:border-blue-200 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 m-0">{o.course?.code} <span className="text-slate-500 font-normal">— Sec {o.section}</span></p>
                        <p className="text-sm text-slate-600 m-0 truncate">{o.course?.title}</p>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 shrink-0">{o.course?.creditHours} CH</span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1"><Users size={12} /> {o._count?.enrollments ?? 0} students</span>
                      <span>·</span>
                      <span>{o.term?.code}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Open Q&A */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800 m-0 flex items-center gap-2">
                <MessageSquare size={18} className="text-cyan-500" /> Open Questions
              </h2>
              <Link to="/teacher/qna" className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1">
                View all <ArrowRight size={14} />
              </Link>
            </div>
            {recentQna.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6 m-0">No open questions 🎉</p>
            ) : (
              <div className="space-y-2">
                {recentQna.map((t) => (
                  <Link
                    key={t.id} to={`/teacher/qna?thread=${t.id}`}
                    className="block p-3 rounded-lg border border-slate-100 hover:bg-slate-50 hover:border-blue-200 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 m-0 truncate">{t.title}</p>
                        <p className="text-xs text-slate-500 mt-1 m-0">
                          {t.offering?.course?.code} (Sec {t.offering?.section}) · {t.askedByName}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs text-slate-400 block">{fmtRelative(t.updatedAt)}</span>
                        <span className="text-xs text-slate-500">{t._count?.replies ?? 0} replies</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Upcoming Quizzes */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800 m-0 flex items-center gap-2">
                <HelpCircle size={18} className="text-orange-500" /> Upcoming Quizzes
              </h2>
              <Link to="/teacher/quizzes" className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1">
                View all <ArrowRight size={14} />
              </Link>
            </div>
            {upcomingQuizzes.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6 m-0">No upcoming quizzes</p>
            ) : (
              <div className="space-y-2">
                {upcomingQuizzes.map((q) => (
                  <Link
                    key={q.id} to="/teacher/quizzes"
                    className="block p-3 rounded-lg border border-slate-100 hover:bg-slate-50 hover:border-blue-200 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 m-0 truncate">{q.title}</p>
                        <p className="text-xs text-slate-500 mt-1 m-0">
                          {q.offering?.course?.code} · {q._count?.questions ?? 0} questions · {q._count?.attempts ?? 0} attempts
                        </p>
                      </div>
                      <span className="text-xs text-slate-400 shrink-0">{fmtDateTime(q.startAt)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Announcements */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800 m-0 flex items-center gap-2">
                <Megaphone size={18} className="text-blue-500" /> Recent Announcements
              </h2>
              <Link to="/announcements" className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1">
                View all <ArrowRight size={14} />
              </Link>
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

export default TeacherDashboard;
