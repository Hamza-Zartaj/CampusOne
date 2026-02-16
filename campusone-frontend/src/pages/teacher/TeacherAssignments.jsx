import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  Users,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Edit3,
  Trash2,
  Eye,
  Download,
} from 'lucide-react';

const offerings = [
  { id: 1, code: 'CS101', name: 'Intro to Programming', section: 'A' },
  { id: 2, code: 'CS201', name: 'Data Structures', section: 'A' },
  { id: 3, code: 'CS301', name: 'Algorithms', section: 'B' },
];

const assignments = [
  {
    id: 1,
    title: 'Assignment 1: Variables & Data Types',
    courseCode: 'CS101',
    courseName: 'Intro to Programming',
    section: 'A',
    dueDate: '2026-02-20',
    createdAt: '2026-02-01',
    totalMarks: 100,
    submissions: 42,
    totalStudents: 45,
    graded: 38,
    status: 'active',
    description: 'Write programs demonstrating the use of variables, constants, and different data types in C++.',
  },
  {
    id: 2,
    title: 'Assignment 2: Control Structures',
    courseCode: 'CS101',
    courseName: 'Intro to Programming',
    section: 'A',
    dueDate: '2026-03-05',
    createdAt: '2026-02-10',
    totalMarks: 100,
    submissions: 15,
    totalStudents: 45,
    graded: 0,
    status: 'active',
    description: 'Implement programs using if-else, switch-case, and loop constructs.',
  },
  {
    id: 3,
    title: 'Lab 1: Linked List Implementation',
    courseCode: 'CS201',
    courseName: 'Data Structures',
    section: 'A',
    dueDate: '2026-02-18',
    createdAt: '2026-02-05',
    totalMarks: 50,
    submissions: 38,
    totalStudents: 38,
    graded: 38,
    status: 'graded',
    description: 'Implement singly and doubly linked lists with insertion, deletion, and traversal operations.',
  },
  {
    id: 4,
    title: 'Assignment 1: Stack & Queue',
    courseCode: 'CS201',
    courseName: 'Data Structures',
    section: 'A',
    dueDate: '2026-02-25',
    createdAt: '2026-02-12',
    totalMarks: 100,
    submissions: 20,
    totalStudents: 38,
    graded: 0,
    status: 'active',
    description: 'Implement stack and queue ADTs using arrays and linked lists.',
  },
  {
    id: 5,
    title: 'Assignment 1: Complexity Analysis',
    courseCode: 'CS301',
    courseName: 'Algorithms',
    section: 'B',
    dueDate: '2026-02-15',
    createdAt: '2026-01-28',
    totalMarks: 80,
    submissions: 32,
    totalStudents: 32,
    graded: 32,
    status: 'graded',
    description: 'Analyze time and space complexity of given algorithms using Big-O notation.',
  },
  {
    id: 6,
    title: 'Assignment 2: Divide & Conquer',
    courseCode: 'CS301',
    courseName: 'Algorithms',
    section: 'B',
    dueDate: '2026-03-01',
    createdAt: '2026-02-14',
    totalMarks: 100,
    submissions: 5,
    totalStudents: 32,
    graded: 0,
    status: 'active',
    description: 'Implement merge sort, quick sort, and binary search using divide and conquer strategy.',
  },
];

const statusConfig = {
  active: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', label: 'Active' },
  graded: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', label: 'Graded' },
  closed: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', label: 'Closed' },
  draft: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', label: 'Draft' },
};

const TeacherAssignments = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filtered = assignments.filter(a => {
    if (filterCourse && a.courseCode !== filterCourse) return false;
    if (filterStatus && a.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return a.title.toLowerCase().includes(q) || a.courseCode.toLowerCase().includes(q);
    }
    return true;
  });

  const totalAssignments = assignments.length;
  const activeCount = assignments.filter(a => a.status === 'active').length;
  const gradedCount = assignments.filter(a => a.status === 'graded').length;
  const pendingGrading = assignments.reduce((sum, a) => sum + (a.submissions - a.graded), 0);

  const stats = [
    { icon: FileText, label: 'Total Assignments', value: totalAssignments, color: '#3b82f6' },
    { icon: Clock, label: 'Active', value: activeCount, color: '#06b6d4' },
    { icon: CheckCircle, label: 'Fully Graded', value: gradedCount, color: '#10b981' },
    { icon: AlertCircle, label: 'Pending Grading', value: pendingGrading, color: '#f59e0b' },
  ];

  const daysUntil = (dateStr) => {
    const diff = Math.ceil((new Date(dateStr) - new Date('2026-02-16')) / (1000 * 60 * 60 * 24));
    if (diff < 0) return <span className="text-red-500 font-medium">Overdue</span>;
    if (diff === 0) return <span className="text-amber-600 font-medium">Due today</span>;
    if (diff <= 3) return <span className="text-amber-600 font-medium">{diff}d left</span>;
    return <span className="text-slate-500">{diff}d left</span>;
  };

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 max-sm:flex-col max-sm:items-start max-sm:gap-3">
        <div>
          <h1 className="text-[28px] font-bold text-slate-800 m-0 max-md:text-2xl">Assignments</h1>
          <p className="text-sm text-slate-500 m-0 mt-1">Create and manage course assignments</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 py-2.5 px-5 border-none rounded-lg text-[0.95rem] font-medium cursor-pointer transition-all bg-blue-600 text-white hover:bg-blue-700"
        >
          <Plus size={18} /> Create Assignment
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
            placeholder="Search assignments..."
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
          <option value="active">Active</option>
          <option value="graded">Graded</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Assignment Cards */}
      <div className="space-y-3">
        {filtered.map((a) => {
          const expanded = expandedId === a.id;
          const submissionRate = Math.round((a.submissions / a.totalStudents) * 100);
          const sc = statusConfig[a.status];
          return (
            <div key={a.id} className="bg-white rounded-2xl shadow-sm overflow-hidden transition-all">
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
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${sc.bg} ${sc.text} ${sc.border}`}>
                      {sc.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span>{a.courseCode} - {a.courseName} (Sec {a.section})</span>
                    <span>&middot;</span>
                    <span className="flex items-center gap-1"><Calendar size={12} /> Due: {a.dueDate}</span>
                    <span>&middot;</span>
                    {daysUntil(a.dueDate)}
                  </div>
                </div>
                <div className="flex items-center gap-4 max-sm:w-full max-sm:justify-between">
                  <div className="text-right">
                    <p className="text-xs text-slate-500 m-0">Submissions</p>
                    <p className="text-sm font-semibold text-slate-700 m-0">{a.submissions}/{a.totalStudents}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 m-0">Graded</p>
                    <p className="text-sm font-semibold text-slate-700 m-0">{a.graded}/{a.submissions}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500 m-0">Marks</p>
                    <p className="text-sm font-semibold text-slate-700 m-0">{a.totalMarks}</p>
                  </div>
                  {expanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                </div>
              </div>
              {expanded && (
                <div className="px-5 pb-5 border-t border-slate-100 pt-4">
                  <p className="text-sm text-slate-600 mb-4">{a.description}</p>
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-xs text-slate-500">Submission rate:</span>
                    <div className="flex-1 max-w-xs bg-slate-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${submissionRate >= 80 ? 'bg-green-500' : submissionRate >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${submissionRate}%` }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-slate-700">{submissionRate}%</span>
                  </div>
                  <div className="flex gap-2">
                    <button className="inline-flex items-center gap-1.5 py-2 px-4 border border-gray-200 rounded-lg text-sm font-medium cursor-pointer transition-all bg-white text-slate-700 hover:bg-slate-50">
                      <Eye size={16} /> View Submissions
                    </button>
                    <button className="inline-flex items-center gap-1.5 py-2 px-4 border border-gray-200 rounded-lg text-sm font-medium cursor-pointer transition-all bg-white text-slate-700 hover:bg-slate-50">
                      <Edit3 size={16} /> Edit
                    </button>
                    <button className="inline-flex items-center gap-1.5 py-2 px-4 border border-gray-200 rounded-lg text-sm font-medium cursor-pointer transition-all bg-white text-red-600 hover:bg-red-50 border-red-200">
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
          <FileText size={48} className="mx-auto text-slate-300 mb-3" />
          <h3 className="text-lg font-semibold text-slate-700 m-0 mb-1">No assignments found</h3>
          <p className="text-sm text-slate-500 m-0">Try adjusting your filters or create a new assignment.</p>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-800 m-0">Create Assignment</h2>
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
                <input className="w-full py-2.5 px-3.5 border border-gray-200 rounded-lg text-[0.95rem] focus:outline-none focus:border-blue-500" placeholder="Assignment title..." />
              </div>
              <div>
                <label className="block text-[0.9rem] font-medium text-slate-800 mb-2">Description</label>
                <textarea rows={3} className="w-full py-2.5 px-3.5 border border-gray-200 rounded-lg text-[0.95rem] focus:outline-none focus:border-blue-500 resize-none" placeholder="Enter instructions..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[0.9rem] font-medium text-slate-800 mb-2">Due Date</label>
                  <input type="date" className="w-full py-2.5 px-3.5 border border-gray-200 rounded-lg text-[0.95rem] focus:outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-[0.9rem] font-medium text-slate-800 mb-2">Total Marks</label>
                  <input type="number" className="w-full py-2.5 px-3.5 border border-gray-200 rounded-lg text-[0.95rem] focus:outline-none focus:border-blue-500" placeholder="100" />
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

export default TeacherAssignments;
