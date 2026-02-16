import React, { useState } from 'react';
import {
  FileText,
  Search,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  Upload,
  ChevronDown,
  ChevronUp,
  Download,
  BookOpen,
  Award,
} from 'lucide-react';

const assignments = [
  {
    id: 1,
    title: 'Assignment 1: Variables & Data Types',
    courseCode: 'CS101',
    courseName: 'Intro to Programming',
    teacher: 'Dr. Sarah Khan',
    dueDate: '2026-02-20',
    totalMarks: 100,
    obtainedMarks: null,
    status: 'pending',
    submittedAt: null,
    description: 'Write programs demonstrating the use of variables, constants, and different data types in C++. Include examples of type casting and overflow scenarios.',
    attachments: ['assignment1_instructions.pdf'],
  },
  {
    id: 2,
    title: 'Lab 1: Linked List Implementation',
    courseCode: 'CS201',
    courseName: 'Data Structures',
    teacher: 'Dr. Sarah Khan',
    dueDate: '2026-02-18',
    totalMarks: 50,
    obtainedMarks: 45,
    status: 'graded',
    submittedAt: '2026-02-17',
    description: 'Implement singly and doubly linked lists with insertion, deletion, and traversal operations.',
    attachments: ['lab1_spec.pdf'],
    feedback: 'Excellent implementation. Minor issue with edge case handling in delete operation for empty list.',
  },
  {
    id: 3,
    title: 'Assignment 1: Stack & Queue',
    courseCode: 'CS201',
    courseName: 'Data Structures',
    teacher: 'Dr. Sarah Khan',
    dueDate: '2026-02-25',
    totalMarks: 100,
    obtainedMarks: null,
    status: 'pending',
    submittedAt: null,
    description: 'Implement stack and queue ADTs using both arrays and linked lists. Include applications of each.',
    attachments: ['assignment1_ds.pdf'],
  },
  {
    id: 4,
    title: 'Assignment 1: Complexity Analysis',
    courseCode: 'CS301',
    courseName: 'Algorithms',
    teacher: 'Dr. Ali Raza',
    dueDate: '2026-02-15',
    totalMarks: 80,
    obtainedMarks: 68,
    status: 'graded',
    submittedAt: '2026-02-14',
    description: 'Analyze time and space complexity of given algorithms using Big-O notation.',
    attachments: ['complexity_problems.pdf'],
    feedback: 'Good analysis overall. Need to be more precise with logarithmic complexity derivations.',
  },
  {
    id: 5,
    title: 'Assignment 2: Divide & Conquer',
    courseCode: 'CS301',
    courseName: 'Algorithms',
    teacher: 'Dr. Ali Raza',
    dueDate: '2026-03-01',
    totalMarks: 100,
    obtainedMarks: null,
    status: 'pending',
    submittedAt: null,
    description: 'Implement merge sort, quick sort, and binary search. Compare their performance empirically.',
    attachments: ['dc_assignment.pdf'],
  },
  {
    id: 6,
    title: 'Essay: Technical Documentation',
    courseCode: 'ENG201',
    courseName: 'Technical Writing',
    teacher: 'Ms. Rabia Tariq',
    dueDate: '2026-02-10',
    totalMarks: 50,
    obtainedMarks: null,
    status: 'submitted',
    submittedAt: '2026-02-09',
    description: 'Write a technical documentation for a software tool of your choice following IEEE format.',
    attachments: ['essay_guidelines.pdf'],
  },
];

const statusConfig = {
  pending: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Pending', icon: Clock },
  submitted: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'Submitted', icon: CheckCircle },
  graded: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', label: 'Graded', icon: Award },
  overdue: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', label: 'Overdue', icon: AlertCircle },
};

const StudentAssignments = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [expandedId, setExpandedId] = useState(null);

  const filtered = assignments.filter(a => {
    if (filterStatus && a.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return a.title.toLowerCase().includes(q) || a.courseCode.toLowerCase().includes(q);
    }
    return true;
  });

  const pendingCount = assignments.filter(a => a.status === 'pending').length;
  const submittedCount = assignments.filter(a => a.status === 'submitted').length;
  const gradedCount = assignments.filter(a => a.status === 'graded').length;
  const avgScore = (() => {
    const graded = assignments.filter(a => a.status === 'graded' && a.obtainedMarks != null);
    if (graded.length === 0) return '—';
    const avg = graded.reduce((s, a) => s + (a.obtainedMarks / a.totalMarks) * 100, 0) / graded.length;
    return `${Math.round(avg)}%`;
  })();

  const stats = [
    { icon: FileText, label: 'Total', value: assignments.length, color: '#3b82f6' },
    { icon: Clock, label: 'Pending', value: pendingCount, color: '#f59e0b' },
    { icon: CheckCircle, label: 'Submitted', value: submittedCount, color: '#06b6d4' },
    { icon: Award, label: 'Avg Score', value: avgScore, color: '#10b981' },
  ];

  const daysUntil = (dateStr) => {
    const diff = Math.ceil((new Date(dateStr) - new Date('2026-02-16')) / (1000 * 60 * 60 * 24));
    if (diff < 0) return <span className="text-red-500 font-medium">Overdue by {Math.abs(diff)}d</span>;
    if (diff === 0) return <span className="text-amber-600 font-medium">Due today</span>;
    if (diff <= 3) return <span className="text-amber-600 font-medium">{diff}d left</span>;
    return <span className="text-slate-500">{diff}d left</span>;
  };

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[28px] font-bold text-slate-800 m-0 max-md:text-2xl">My Assignments</h1>
        <p className="text-sm text-slate-500 m-0 mt-1">View and submit your course assignments</p>
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
            placeholder="Search assignments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full py-2.5 pl-10 pr-4 border border-gray-200 rounded-lg text-[0.95rem] focus:outline-none focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/10"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="py-2.5 px-3.5 border border-gray-200 rounded-lg text-[0.95rem] bg-white focus:outline-none focus:border-blue-500"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="submitted">Submitted</option>
          <option value="graded">Graded</option>
        </select>
      </div>

      {/* Assignment Cards */}
      <div className="space-y-3">
        {filtered.map((a) => {
          const expanded = expandedId === a.id;
          const sc = statusConfig[a.status];
          const StatusIcon = sc.icon;
          return (
            <div key={a.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div
                className="p-5 flex items-center gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors max-sm:flex-col max-sm:items-start"
                onClick={() => setExpandedId(expanded ? null : a.id)}
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                  <FileText size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h3 className="text-[0.95rem] font-semibold text-slate-800 m-0 truncate">{a.title}</h3>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${sc.bg} ${sc.text} ${sc.border}`}>
                      <StatusIcon size={12} /> {sc.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>{a.courseCode} - {a.courseName}</span>
                    <span>&middot;</span>
                    <span className="flex items-center gap-1"><Calendar size={12} /> Due: {a.dueDate}</span>
                    <span>&middot;</span>
                    {a.status === 'pending' ? daysUntil(a.dueDate) : <span>Submitted: {a.submittedAt}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-4 max-sm:w-full max-sm:justify-between">
                  {a.status === 'graded' && (
                    <div className="text-right">
                      <p className="text-xs text-slate-500 m-0">Score</p>
                      <p className="text-lg font-bold text-green-600 m-0">{a.obtainedMarks}/{a.totalMarks}</p>
                    </div>
                  )}
                  {a.status !== 'graded' && (
                    <div className="text-right">
                      <p className="text-xs text-slate-500 m-0">Total Marks</p>
                      <p className="text-sm font-semibold text-slate-700 m-0">{a.totalMarks}</p>
                    </div>
                  )}
                  {expanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                </div>
              </div>
              {expanded && (
                <div className="px-5 pb-5 border-t border-slate-100 pt-4">
                  <p className="text-sm text-slate-600 mb-4">{a.description}</p>

                  {/* Attachments */}
                  {a.attachments?.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Attachments</h4>
                      <div className="flex gap-2 flex-wrap">
                        {a.attachments.map((file, i) => (
                          <button key={i} className="inline-flex items-center gap-1.5 py-1.5 px-3 border border-gray-200 rounded-lg text-sm cursor-pointer bg-white text-slate-700 hover:bg-slate-50">
                            <Download size={14} /> {file}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Feedback */}
                  {a.feedback && (
                    <div className="p-3 rounded-xl bg-green-50 border border-green-200 mb-4">
                      <h4 className="text-xs font-semibold text-green-700 m-0 mb-1">Instructor Feedback</h4>
                      <p className="text-sm text-green-800 m-0">{a.feedback}</p>
                    </div>
                  )}

                  {/* Submit button */}
                  {a.status === 'pending' && (
                    <button className="inline-flex items-center gap-2 py-2.5 px-5 border-none rounded-lg text-[0.95rem] font-medium cursor-pointer transition-all bg-blue-600 text-white hover:bg-blue-700">
                      <Upload size={18} /> Submit Assignment
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <FileText size={48} className="mx-auto text-slate-300 mb-3" />
          <h3 className="text-lg font-semibold text-slate-700 m-0 mb-1">No assignments found</h3>
          <p className="text-sm text-slate-500 m-0">Try adjusting your filters.</p>
        </div>
      )}
    </div>
  );
};

export default StudentAssignments;
