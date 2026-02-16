import React, { useState } from 'react';
import {
  HelpCircle,
  Plus,
  Search,
  Clock,
  Users,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Play,
  Eye,
  Edit3,
  Trash2,
  Trophy,
  Timer,
  BarChart3,
  Copy,
} from 'lucide-react';

const offerings = [
  { id: 1, code: 'CS101', name: 'Intro to Programming', section: 'A' },
  { id: 2, code: 'CS201', name: 'Data Structures', section: 'A' },
  { id: 3, code: 'CS301', name: 'Algorithms', section: 'B' },
];

const quizzes = [
  {
    id: 1,
    title: 'Quiz 1: Basics of Programming',
    courseCode: 'CS101',
    courseName: 'Intro to Programming',
    section: 'A',
    questions: 15,
    duration: 30,
    totalMarks: 30,
    startDate: '2026-02-10',
    endDate: '2026-02-10',
    attempts: 43,
    totalStudents: 45,
    avgScore: 24.5,
    highestScore: 30,
    lowestScore: 12,
    status: 'completed',
  },
  {
    id: 2,
    title: 'Quiz 2: Loops & Arrays',
    courseCode: 'CS101',
    courseName: 'Intro to Programming',
    section: 'A',
    questions: 20,
    duration: 40,
    totalMarks: 40,
    startDate: '2026-02-20',
    endDate: '2026-02-20',
    attempts: 0,
    totalStudents: 45,
    avgScore: null,
    highestScore: null,
    lowestScore: null,
    status: 'scheduled',
  },
  {
    id: 3,
    title: 'Quiz 1: Arrays & Pointers Review',
    courseCode: 'CS201',
    courseName: 'Data Structures',
    section: 'A',
    questions: 10,
    duration: 20,
    totalMarks: 20,
    startDate: '2026-02-12',
    endDate: '2026-02-12',
    attempts: 38,
    totalStudents: 38,
    avgScore: 16.2,
    highestScore: 20,
    lowestScore: 8,
    status: 'completed',
  },
  {
    id: 4,
    title: 'Quiz 2: Trees & Graphs',
    courseCode: 'CS201',
    courseName: 'Data Structures',
    section: 'A',
    questions: 15,
    duration: 30,
    totalMarks: 30,
    startDate: '2026-02-25',
    endDate: '2026-02-25',
    attempts: 0,
    totalStudents: 38,
    avgScore: null,
    highestScore: null,
    lowestScore: null,
    status: 'draft',
  },
  {
    id: 5,
    title: 'Midterm Quiz: Complexity & Sorting',
    courseCode: 'CS301',
    courseName: 'Algorithms',
    section: 'B',
    questions: 25,
    duration: 45,
    totalMarks: 50,
    startDate: '2026-02-16',
    endDate: '2026-02-16',
    attempts: 28,
    totalStudents: 32,
    avgScore: null,
    highestScore: null,
    lowestScore: null,
    status: 'active',
  },
];

const statusConfig = {
  active: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', label: 'Live Now' },
  scheduled: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'Scheduled' },
  completed: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', label: 'Completed' },
  draft: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Draft' },
};

const TeacherQuizzes = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filtered = quizzes.filter(q => {
    if (filterCourse && q.courseCode !== filterCourse) return false;
    if (filterStatus && q.status !== filterStatus) return false;
    if (searchQuery) {
      const s = searchQuery.toLowerCase();
      return q.title.toLowerCase().includes(s) || q.courseCode.toLowerCase().includes(s);
    }
    return true;
  });

  const totalQuizzes = quizzes.length;
  const activeCount = quizzes.filter(q => q.status === 'active').length;
  const completedCount = quizzes.filter(q => q.status === 'completed').length;
  const scheduledCount = quizzes.filter(q => q.status === 'scheduled').length;

  const stats = [
    { icon: HelpCircle, label: 'Total Quizzes', value: totalQuizzes, color: '#3b82f6' },
    { icon: Play, label: 'Live Now', value: activeCount, color: '#10b981' },
    { icon: Clock, label: 'Scheduled', value: scheduledCount, color: '#06b6d4' },
    { icon: CheckCircle, label: 'Completed', value: completedCount, color: '#8b5cf6' },
  ];

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 max-sm:flex-col max-sm:items-start max-sm:gap-3">
        <div>
          <h1 className="text-[28px] font-bold text-slate-800 m-0 max-md:text-2xl">Quiz Management</h1>
          <p className="text-sm text-slate-500 m-0 mt-1">Create and manage course quizzes</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 py-2.5 px-5 border-none rounded-lg text-[0.95rem] font-medium cursor-pointer transition-all bg-blue-600 text-white hover:bg-blue-700"
        >
          <Plus size={18} /> Create Quiz
        </button>
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

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-5 flex items-center gap-3 max-sm:flex-col">
        <div className="flex-1 relative max-sm:w-full">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search quizzes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full py-2.5 pl-10 pr-4 border border-gray-200 rounded-lg text-[0.95rem] focus:outline-none focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/10"
          />
        </div>
        <select
          value={filterCourse}
          onChange={(e) => setFilterCourse(e.target.value)}
          className="py-2.5 px-3.5 border border-gray-200 rounded-lg text-[0.95rem] bg-white focus:outline-none focus:border-blue-500"
        >
          <option value="">All Courses</option>
          {offerings.map(o => (
            <option key={o.id} value={o.code}>{o.code} - {o.section}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="py-2.5 px-3.5 border border-gray-200 rounded-lg text-[0.95rem] bg-white focus:outline-none focus:border-blue-500"
        >
          <option value="">All Status</option>
          <option value="active">Live</option>
          <option value="scheduled">Scheduled</option>
          <option value="completed">Completed</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      {/* Quiz Cards */}
      <div className="space-y-3">
        {filtered.map((q) => {
          const expanded = expandedId === q.id;
          const sc = statusConfig[q.status];
          return (
            <div key={q.id} className="bg-white rounded-2xl shadow-sm overflow-hidden transition-all">
              <div
                className="p-5 flex items-center gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors max-sm:flex-col max-sm:items-start"
                onClick={() => setExpandedId(expanded ? null : q.id)}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  q.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-purple-50 text-purple-600'
                }`}>
                  <HelpCircle size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-[0.95rem] font-semibold text-slate-800 m-0 truncate">{q.title}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${sc.bg} ${sc.text} ${sc.border}`}>
                      {q.status === 'active' && <span className="inline-block w-1.5 h-1.5 bg-green-500 rounded-full mr-1 animate-pulse" />}
                      {sc.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>{q.courseCode} - {q.courseName} (Sec {q.section})</span>
                    <span>&middot;</span>
                    <span className="flex items-center gap-1"><Timer size={12} /> {q.duration} min</span>
                    <span>&middot;</span>
                    <span>{q.questions} questions</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 max-sm:w-full max-sm:justify-between">
                  <div className="text-right">
                    <p className="text-xs text-slate-500 m-0">Attempts</p>
                    <p className="text-sm font-semibold text-slate-700 m-0">{q.attempts}/{q.totalStudents}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 m-0">Total Marks</p>
                    <p className="text-sm font-semibold text-slate-700 m-0">{q.totalMarks}</p>
                  </div>
                  {expanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                </div>
              </div>
              {expanded && (
                <div className="px-5 pb-5 border-t border-slate-100 pt-4">
                  <div className="grid grid-cols-3 gap-4 mb-4 max-sm:grid-cols-1">
                    <div className="bg-slate-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-slate-500 m-0 mb-1">Average Score</p>
                      <p className="text-lg font-bold text-slate-800 m-0">
                        {q.avgScore !== null ? `${q.avgScore}/${q.totalMarks}` : '—'}
                      </p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-green-600 m-0 mb-1">Highest Score</p>
                      <p className="text-lg font-bold text-green-700 m-0">
                        {q.highestScore !== null ? q.highestScore : '—'}
                      </p>
                    </div>
                    <div className="bg-red-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-red-500 m-0 mb-1">Lowest Score</p>
                      <p className="text-lg font-bold text-red-600 m-0">
                        {q.lowestScore !== null ? q.lowestScore : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm text-slate-500 mb-4">
                    <span>Scheduled: {q.startDate}</span>
                    {q.endDate !== q.startDate && <span>to {q.endDate}</span>}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button className="inline-flex items-center gap-1.5 py-2 px-4 border border-gray-200 rounded-lg text-sm font-medium cursor-pointer transition-all bg-white text-slate-700 hover:bg-slate-50">
                      <Eye size={16} /> View Results
                    </button>
                    <button className="inline-flex items-center gap-1.5 py-2 px-4 border border-gray-200 rounded-lg text-sm font-medium cursor-pointer transition-all bg-white text-slate-700 hover:bg-slate-50">
                      <BarChart3 size={16} /> Analytics
                    </button>
                    <button className="inline-flex items-center gap-1.5 py-2 px-4 border border-gray-200 rounded-lg text-sm font-medium cursor-pointer transition-all bg-white text-slate-700 hover:bg-slate-50">
                      <Copy size={16} /> Duplicate
                    </button>
                    <button className="inline-flex items-center gap-1.5 py-2 px-4 border border-gray-200 rounded-lg text-sm font-medium cursor-pointer transition-all bg-white text-slate-700 hover:bg-slate-50">
                      <Edit3 size={16} /> Edit
                    </button>
                    <button className="inline-flex items-center gap-1.5 py-2 px-4 border border-red-200 rounded-lg text-sm font-medium cursor-pointer transition-all bg-white text-red-600 hover:bg-red-50">
                      <Trash2 size={16} /> Delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <HelpCircle size={48} className="mx-auto text-slate-300 mb-3" />
          <h3 className="text-lg font-semibold text-slate-700 m-0 mb-1">No quizzes found</h3>
          <p className="text-sm text-slate-500 m-0">Try adjusting your filters or create a new quiz.</p>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800 m-0">Create Quiz</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-[0.9rem] font-medium text-slate-800 mb-2">Course</label>
                <select className="w-full py-2.5 px-3.5 border border-gray-200 rounded-lg text-[0.95rem] focus:outline-none focus:border-blue-500">
                  {offerings.map(o => (
                    <option key={o.id}>{o.code} - {o.name} (Sec {o.section})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[0.9rem] font-medium text-slate-800 mb-2">Title</label>
                <input className="w-full py-2.5 px-3.5 border border-gray-200 rounded-lg text-[0.95rem] focus:outline-none focus:border-blue-500" placeholder="Quiz title..." />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[0.9rem] font-medium text-slate-800 mb-2">Questions</label>
                  <input type="number" className="w-full py-2.5 px-3.5 border border-gray-200 rounded-lg text-[0.95rem] focus:outline-none focus:border-blue-500" placeholder="15" />
                </div>
                <div>
                  <label className="block text-[0.9rem] font-medium text-slate-800 mb-2">Duration (min)</label>
                  <input type="number" className="w-full py-2.5 px-3.5 border border-gray-200 rounded-lg text-[0.95rem] focus:outline-none focus:border-blue-500" placeholder="30" />
                </div>
                <div>
                  <label className="block text-[0.9rem] font-medium text-slate-800 mb-2">Total Marks</label>
                  <input type="number" className="w-full py-2.5 px-3.5 border border-gray-200 rounded-lg text-[0.95rem] focus:outline-none focus:border-blue-500" placeholder="30" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[0.9rem] font-medium text-slate-800 mb-2">Start Date</label>
                  <input type="date" className="w-full py-2.5 px-3.5 border border-gray-200 rounded-lg text-[0.95rem] focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-[0.9rem] font-medium text-slate-800 mb-2">End Date</label>
                  <input type="date" className="w-full py-2.5 px-3.5 border border-gray-200 rounded-lg text-[0.95rem] focus:outline-none focus:border-blue-500" />
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="py-2.5 px-5 border border-gray-200 rounded-lg text-[0.95rem] font-medium cursor-pointer bg-white text-slate-800 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowCreateModal(false)}
                className="py-2.5 px-5 border-none rounded-lg text-[0.95rem] font-medium cursor-pointer bg-blue-600 text-white hover:bg-blue-700"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherQuizzes;
