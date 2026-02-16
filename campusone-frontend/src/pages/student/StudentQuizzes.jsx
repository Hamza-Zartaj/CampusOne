import React, { useState } from 'react';
import {
  HelpCircle,
  Clock,
  CheckCircle,
  AlertCircle,
  Play,
  Trophy,
  Timer,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Award,
  BarChart3,
  Lock,
} from 'lucide-react';

const quizzes = [
  {
    id: 1,
    title: 'Quiz 1: Basics of Programming',
    courseCode: 'CS101',
    courseName: 'Intro to Programming',
    teacher: 'Dr. Sarah Khan',
    questions: 15,
    duration: 30,
    totalMarks: 30,
    obtainedMarks: 26,
    startDate: '2026-02-10',
    endDate: '2026-02-10',
    attemptedAt: '2026-02-10T09:15:00',
    timeTaken: 22,
    status: 'completed',
    rank: 5,
    totalAttempts: 43,
    avgScore: 24.5,
  },
  {
    id: 2,
    title: 'Quiz 2: Loops & Arrays',
    courseCode: 'CS101',
    courseName: 'Intro to Programming',
    teacher: 'Dr. Sarah Khan',
    questions: 20,
    duration: 40,
    totalMarks: 40,
    obtainedMarks: null,
    startDate: '2026-02-20',
    endDate: '2026-02-20',
    attemptedAt: null,
    timeTaken: null,
    status: 'upcoming',
    rank: null,
    totalAttempts: null,
    avgScore: null,
  },
  {
    id: 3,
    title: 'Quiz 1: Arrays & Pointers Review',
    courseCode: 'CS201',
    courseName: 'Data Structures',
    teacher: 'Dr. Sarah Khan',
    questions: 10,
    duration: 20,
    totalMarks: 20,
    obtainedMarks: 18,
    startDate: '2026-02-12',
    endDate: '2026-02-12',
    attemptedAt: '2026-02-12T10:05:00',
    timeTaken: 15,
    status: 'completed',
    rank: 2,
    totalAttempts: 38,
    avgScore: 16.2,
  },
  {
    id: 4,
    title: 'Midterm Quiz: Complexity & Sorting',
    courseCode: 'CS301',
    courseName: 'Algorithms',
    teacher: 'Dr. Ali Raza',
    questions: 25,
    duration: 45,
    totalMarks: 50,
    obtainedMarks: null,
    startDate: '2026-02-16',
    endDate: '2026-02-16',
    attemptedAt: null,
    timeTaken: null,
    status: 'active',
    rank: null,
    totalAttempts: null,
    avgScore: null,
  },
  {
    id: 5,
    title: 'Quiz 1: Grammar Fundamentals',
    courseCode: 'ENG201',
    courseName: 'Technical Writing',
    teacher: 'Ms. Rabia Tariq',
    questions: 20,
    duration: 25,
    totalMarks: 20,
    obtainedMarks: 17,
    startDate: '2026-02-08',
    endDate: '2026-02-08',
    attemptedAt: '2026-02-08T14:00:00',
    timeTaken: 18,
    status: 'completed',
    rank: 8,
    totalAttempts: 42,
    avgScore: 15.3,
  },
  {
    id: 6,
    title: 'Quiz 2: Trees & Graphs',
    courseCode: 'CS201',
    courseName: 'Data Structures',
    teacher: 'Dr. Sarah Khan',
    questions: 15,
    duration: 30,
    totalMarks: 30,
    obtainedMarks: null,
    startDate: '2026-02-25',
    endDate: '2026-02-25',
    attemptedAt: null,
    timeTaken: null,
    status: 'upcoming',
    rank: null,
    totalAttempts: null,
    avgScore: null,
  },
];

const statusConfig = {
  active: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', label: 'Live Now' },
  upcoming: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'Upcoming' },
  completed: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', label: 'Completed' },
  missed: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: 'Missed' },
};

const StudentQuizzes = () => {
  const [expandedId, setExpandedId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');

  const filtered = quizzes.filter(q => {
    if (filterStatus && q.status !== filterStatus) return false;
    return true;
  });

  const completedQuizzes = quizzes.filter(q => q.status === 'completed');
  const avgPercent = completedQuizzes.length > 0
    ? Math.round(completedQuizzes.reduce((s, q) => s + (q.obtainedMarks / q.totalMarks) * 100, 0) / completedQuizzes.length)
    : 0;
  const bestRank = completedQuizzes.reduce((best, q) => (q.rank && (!best || q.rank < best)) ? q.rank : best, null);

  const stats = [
    { icon: HelpCircle, label: 'Total Quizzes', value: quizzes.length, color: '#3b82f6' },
    { icon: CheckCircle, label: 'Completed', value: completedQuizzes.length, color: '#10b981' },
    { icon: BarChart3, label: 'Avg Score', value: `${avgPercent}%`, color: '#06b6d4' },
    { icon: Trophy, label: 'Best Rank', value: bestRank ? `#${bestRank}` : '—', color: '#f59e0b' },
  ];

  const daysUntil = (dateStr) => {
    const diff = Math.ceil((new Date(dateStr) - new Date('2026-02-16')) / (1000 * 60 * 60 * 24));
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff > 0) return `In ${diff} days`;
    return `${Math.abs(diff)}d ago`;
  };

  // Sort: active first, upcoming, then completed
  const sortOrder = { active: 0, upcoming: 1, completed: 2, missed: 3 };
  const sorted = [...filtered].sort((a, b) => sortOrder[a.status] - sortOrder[b.status]);

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[28px] font-bold text-slate-800 m-0 max-md:text-2xl">My Quizzes</h1>
        <p className="text-sm text-slate-500 m-0 mt-1">View and attempt your course quizzes</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-5 mb-6 max-sm:grid-cols-2">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 flex items-center gap-3 shadow-sm">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${stat.color}15`, color: stat.color }}>
              <stat.icon size={22} />
            </div>
            <div>
              <p className="text-xs text-slate-500 m-0 mb-0.5 font-medium">{stat.label}</p>
              <h3 className="text-2xl font-bold text-slate-800 m-0">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-5 flex items-center gap-3">
        <span className="text-sm text-slate-500 font-medium">Filter:</span>
        {['', 'active', 'upcoming', 'completed'].map(s => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer border ${
              filterStatus === s
                ? 'bg-slate-800 border-slate-800 text-white'
                : 'bg-white border-gray-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Quiz Cards */}
      <div className="space-y-3">
        {sorted.map(q => {
          const expanded = expandedId === q.id;
          const sc = statusConfig[q.status];
          const scorePercent = q.obtainedMarks != null ? Math.round((q.obtainedMarks / q.totalMarks) * 100) : null;

          return (
            <div key={q.id} className={`bg-white rounded-2xl shadow-sm overflow-hidden transition-all ${q.status === 'active' ? 'ring-2 ring-green-300' : ''}`}>
              <div
                className="p-5 flex items-center gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors max-sm:flex-col max-sm:items-start"
                onClick={() => setExpandedId(expanded ? null : q.id)}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  q.status === 'active' ? 'bg-green-50 text-green-600' : q.status === 'upcoming' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                }`}>
                  {q.status === 'active' ? <Play size={20} /> : q.status === 'upcoming' ? <Lock size={20} /> : <HelpCircle size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-[0.95rem] font-semibold text-slate-800 m-0 truncate">{q.title}</h3>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${sc.bg} ${sc.text} ${sc.border}`}>
                      {q.status === 'active' && <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />}
                      {sc.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>{q.courseCode} - {q.courseName}</span>
                    <span>&middot;</span>
                    <span className="flex items-center gap-1"><Timer size={12} /> {q.duration} min</span>
                    <span>&middot;</span>
                    <span>{q.questions} questions</span>
                    <span>&middot;</span>
                    <span>{daysUntil(q.startDate)}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 max-sm:w-full max-sm:justify-between">
                  {q.status === 'completed' && scorePercent !== null && (
                    <div className="text-right">
                      <p className="text-xs text-slate-500 m-0">Score</p>
                      <p className={`text-lg font-bold m-0 ${scorePercent >= 80 ? 'text-green-600' : scorePercent >= 60 ? 'text-amber-600' : 'text-red-600'}`}>
                        {q.obtainedMarks}/{q.totalMarks}
                      </p>
                    </div>
                  )}
                  {q.status === 'active' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); }}
                      className="inline-flex items-center gap-1.5 py-2 px-4 border-none rounded-lg text-sm font-medium cursor-pointer bg-green-600 text-white hover:bg-green-700 transition-all"
                    >
                      <Play size={16} /> Start Quiz
                    </button>
                  )}
                  {q.status !== 'active' && q.status !== 'completed' && (
                    <div className="text-right">
                      <p className="text-xs text-slate-500 m-0">Total</p>
                      <p className="text-sm font-semibold text-slate-700 m-0">{q.totalMarks} marks</p>
                    </div>
                  )}
                  {expanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                </div>
              </div>
              {expanded && (
                <div className="px-5 pb-5 border-t border-slate-100 pt-4">
                  <div className="grid grid-cols-4 gap-4 max-sm:grid-cols-2">
                    <div className="bg-slate-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-slate-500 m-0 mb-1">Questions</p>
                      <p className="text-lg font-bold text-slate-800 m-0">{q.questions}</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-slate-500 m-0 mb-1">Duration</p>
                      <p className="text-lg font-bold text-slate-800 m-0">{q.duration} min</p>
                    </div>
                    {q.status === 'completed' && (
                      <>
                        <div className="bg-green-50 rounded-xl p-3 text-center">
                          <p className="text-xs text-green-600 m-0 mb-1">Your Rank</p>
                          <p className="text-lg font-bold text-green-700 m-0">#{q.rank} / {q.totalAttempts}</p>
                        </div>
                        <div className="bg-blue-50 rounded-xl p-3 text-center">
                          <p className="text-xs text-blue-600 m-0 mb-1">Class Average</p>
                          <p className="text-lg font-bold text-blue-700 m-0">{q.avgScore}/{q.totalMarks}</p>
                        </div>
                      </>
                    )}
                    {q.status !== 'completed' && (
                      <>
                        <div className="bg-blue-50 rounded-xl p-3 text-center">
                          <p className="text-xs text-blue-600 m-0 mb-1">Date</p>
                          <p className="text-lg font-bold text-blue-700 m-0">{q.startDate.slice(5)}</p>
                        </div>
                        <div className="bg-amber-50 rounded-xl p-3 text-center">
                          <p className="text-xs text-amber-600 m-0 mb-1">Total Marks</p>
                          <p className="text-lg font-bold text-amber-700 m-0">{q.totalMarks}</p>
                        </div>
                      </>
                    )}
                  </div>
                  {q.timeTaken && (
                    <p className="text-sm text-slate-500 mt-3 m-0">
                      Completed in <span className="font-medium text-slate-700">{q.timeTaken} minutes</span> on {new Date(q.attemptedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {sorted.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <HelpCircle size={48} className="mx-auto text-slate-300 mb-3" />
          <h3 className="text-lg font-semibold text-slate-700 m-0 mb-1">No quizzes found</h3>
          <p className="text-sm text-slate-500 m-0">Check back later for upcoming quizzes.</p>
        </div>
      )}
    </div>
  );
};

export default StudentQuizzes;
