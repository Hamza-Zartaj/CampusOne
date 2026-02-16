import React, { useState } from 'react';
import {
  MessageSquare,
  Search,
  Plus,
  ThumbsUp,
  MessageCircle,
  Clock,
  CheckCircle2,
  Pin,
  Filter,
  ChevronDown,
  ChevronUp,
  Send,
  User,
  BookOpen,
} from 'lucide-react';

const offerings = [
  { id: 1, code: 'CS101', name: 'Intro to Programming', section: 'A' },
  { id: 2, code: 'CS201', name: 'Data Structures', section: 'A' },
  { id: 3, code: 'CS301', name: 'Algorithms', section: 'B' },
];

const threads = [
  {
    id: 1,
    title: 'How to handle null pointer exceptions in linked list?',
    courseCode: 'CS201',
    author: 'Ahmed Hassan',
    authorRole: 'student',
    createdAt: '2026-02-16T10:30:00',
    content: 'I keep getting null pointer exceptions when trying to delete the last node in my linked list implementation. I\'ve checked the traversal logic but can\'t find the issue. Can someone help?',
    upvotes: 8,
    replies: 4,
    pinned: false,
    resolved: false,
    tags: ['linked-list', 'debugging'],
    replyList: [
      { id: 1, author: 'Dr. Sarah Khan', authorRole: 'teacher', content: 'Make sure you\'re checking if the next node is null before accessing its properties. Post your code and I\'ll take a look.', createdAt: '2026-02-16T11:00:00', upvotes: 5 },
      { id: 2, author: 'Sara Ali', authorRole: 'student', content: 'I had the same issue! The problem was in the boundary condition when the list has only one node.', createdAt: '2026-02-16T11:15:00', upvotes: 3 },
      { id: 3, author: 'Ahmed Hassan', authorRole: 'student', content: 'Thanks! I found the bug. I wasn\'t handling the single-node case separately.', createdAt: '2026-02-16T12:00:00', upvotes: 1 },
      { id: 4, author: 'Dr. Sarah Khan', authorRole: 'teacher', content: 'Great! Always consider edge cases: empty list, single node, and last node. I\'ll cover this in tomorrow\'s lecture.', createdAt: '2026-02-16T12:30:00', upvotes: 6 },
    ],
  },
  {
    id: 2,
    title: 'Midterm exam coverage and format',
    courseCode: 'CS301',
    author: 'Dr. Ali Raza',
    authorRole: 'teacher',
    createdAt: '2026-02-15T09:00:00',
    content: 'The midterm will cover chapters 1-5: Algorithm Analysis, Divide & Conquer, Greedy Algorithms, Dynamic Programming basics, and Graph fundamentals. Format: 3 theory questions (30 marks) + 2 coding problems (20 marks). Duration: 2 hours. Open book is NOT allowed.',
    upvotes: 15,
    replies: 6,
    pinned: true,
    resolved: false,
    tags: ['midterm', 'exam', 'important'],
    replyList: [
      { id: 1, author: 'Usman Khan', authorRole: 'student', content: 'Will dynamic programming be tested in detail or just the basics?', createdAt: '2026-02-15T10:00:00', upvotes: 4 },
      { id: 2, author: 'Dr. Ali Raza', authorRole: 'teacher', content: 'Only the basic concepts covered in class — memoization and tabulation approaches. No advanced DP.', createdAt: '2026-02-15T10:30:00', upvotes: 8 },
    ],
  },
  {
    id: 3,
    title: 'Difference between while and do-while loop?',
    courseCode: 'CS101',
    author: 'Fatima Zahra',
    authorRole: 'student',
    createdAt: '2026-02-14T14:00:00',
    content: 'Can someone explain the practical difference between while and do-while loops? When would you use one over the other?',
    upvotes: 4,
    replies: 3,
    pinned: false,
    resolved: true,
    tags: ['loops', 'basics'],
    replyList: [
      { id: 1, author: 'Hira Malik', authorRole: 'student', content: 'While checks condition first, do-while executes at least once. Use do-while when you need at least one iteration, like menu-driven programs.', createdAt: '2026-02-14T14:30:00', upvotes: 6 },
      { id: 2, author: 'Dr. Sarah Khan', authorRole: 'teacher', content: 'Good answer Hira! A classic example: input validation — you want to ask the user at least once before checking.', createdAt: '2026-02-14T15:00:00', upvotes: 3 },
    ],
  },
  {
    id: 4,
    title: 'Best resources for understanding Big-O notation?',
    courseCode: 'CS301',
    author: 'Bilal Ahmad',
    authorRole: 'student',
    createdAt: '2026-02-13T16:00:00',
    content: 'I\'m struggling with asymptotic analysis. Can anyone recommend good resources besides the textbook?',
    upvotes: 12,
    replies: 5,
    pinned: false,
    resolved: true,
    tags: ['resources', 'big-o', 'complexity'],
    replyList: [
      { id: 1, author: 'Ayesha Siddiqui', authorRole: 'student', content: 'MIT OpenCourseWare has excellent lectures on this. Also check out "Big-O Cheat Sheet" website.', createdAt: '2026-02-13T16:30:00', upvotes: 7 },
    ],
  },
  {
    id: 5,
    title: 'Assignment 1 deadline extension request',
    courseCode: 'CS201',
    author: 'Ali Raza',
    authorRole: 'student',
    createdAt: '2026-02-12T11:00:00',
    content: 'Several students are having issues with the tree balancing part of Assignment 1. Could we get a 2-day extension?',
    upvotes: 18,
    replies: 3,
    pinned: false,
    resolved: true,
    tags: ['assignment', 'deadline'],
    replyList: [
      { id: 1, author: 'Dr. Sarah Khan', authorRole: 'teacher', content: 'I understand the difficulty. I\'ll extend the deadline by 2 days to Feb 20. However, please attend office hours if you need help.', createdAt: '2026-02-12T14:00:00', upvotes: 20 },
    ],
  },
];

const TeacherQnA = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCourse, setFilterCourse] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [replyText, setReplyText] = useState('');

  const filtered = threads.filter(t => {
    if (filterCourse && t.courseCode !== filterCourse) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return t.title.toLowerCase().includes(q) || t.content.toLowerCase().includes(q) || t.tags.some(tag => tag.includes(q));
    }
    return true;
  });

  const totalThreads = threads.length;
  const unresolvedCount = threads.filter(t => !t.resolved).length;
  const pinnedCount = threads.filter(t => t.pinned).length;

  const stats = [
    { icon: MessageSquare, label: 'Total Threads', value: totalThreads, color: '#3b82f6' },
    { icon: MessageCircle, label: 'Unresolved', value: unresolvedCount, color: '#f59e0b' },
    { icon: Pin, label: 'Pinned', value: pinnedCount, color: '#8b5cf6' },
    { icon: CheckCircle2, label: 'Resolved', value: totalThreads - unresolvedCount, color: '#10b981' },
  ];

  const timeAgo = (dateStr) => {
    const diff = Math.floor((new Date('2026-02-16T15:00:00') - new Date(dateStr)) / 60000);
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  };

  // Sort: pinned first, then by date
  const sorted = [...filtered].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 max-sm:flex-col max-sm:items-start max-sm:gap-3">
        <div>
          <h1 className="text-[28px] font-bold text-slate-800 m-0 max-md:text-2xl">Q&A Forum</h1>
          <p className="text-sm text-slate-500 m-0 mt-1">Course discussions and student queries</p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="inline-flex items-center gap-2 py-2.5 px-5 border-none rounded-lg text-[0.95rem] font-medium cursor-pointer transition-all bg-blue-600 text-white hover:bg-blue-700"
        >
          <Plus size={18} /> New Thread
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-5 mb-6 max-sm:grid-cols-2">
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

      {/* Create Thread */}
      {showCreate && (
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-5">
          <h3 className="text-base font-semibold text-slate-800 m-0 mb-4">Start a New Discussion</h3>
          <div className="space-y-3">
            <select className="w-full py-2.5 px-3.5 border border-gray-200 rounded-lg text-[0.95rem] focus:outline-none focus:border-blue-500">
              <option value="">Select Course</option>
              {offerings.map(o => (
                <option key={o.id}>{o.code} - {o.name} (Sec {o.section})</option>
              ))}
            </select>
            <input className="w-full py-2.5 px-3.5 border border-gray-200 rounded-lg text-[0.95rem] focus:outline-none focus:border-blue-500" placeholder="Thread title..." />
            <textarea rows={3} className="w-full py-2.5 px-3.5 border border-gray-200 rounded-lg text-[0.95rem] focus:outline-none focus:border-blue-500 resize-none" placeholder="Describe your question or topic..." />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowCreate(false)} className="py-2 px-4 border border-gray-200 rounded-lg text-sm font-medium cursor-pointer bg-white text-slate-700 hover:bg-slate-50">Cancel</button>
              <button className="py-2 px-4 border-none rounded-lg text-sm font-medium cursor-pointer bg-blue-600 text-white hover:bg-blue-700">Post</button>
            </div>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-5 flex items-center gap-3 max-sm:flex-col">
        <div className="flex-1 relative max-sm:w-full">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search threads..."
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
            <option key={o.id} value={o.code}>{o.code}</option>
          ))}
        </select>
      </div>

      {/* Threads */}
      <div className="space-y-3">
        {sorted.map((t) => {
          const expanded = expandedId === t.id;
          return (
            <div key={t.id} className={`bg-white rounded-2xl shadow-sm overflow-hidden transition-all ${t.pinned ? 'ring-1 ring-purple-200' : ''}`}>
              <div
                className="p-5 flex gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                onClick={() => setExpandedId(expanded ? null : t.id)}
              >
                {/* Upvotes */}
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <button className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-colors cursor-pointer border-none">
                    <ThumbsUp size={14} />
                  </button>
                  <span className="text-sm font-bold text-slate-700">{t.upvotes}</span>
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {t.pinned && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                        <Pin size={10} /> Pinned
                      </span>
                    )}
                    {t.resolved && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                        <CheckCircle2 size={10} /> Resolved
                      </span>
                    )}
                    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      {t.courseCode}
                    </span>
                  </div>
                  <h3 className="text-[0.95rem] font-semibold text-slate-800 m-0 mb-1">{t.title}</h3>
                  <p className="text-sm text-slate-500 m-0 line-clamp-2">{t.content}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                    <span className="flex items-center gap-1">
                      <User size={12} />
                      <span className={t.authorRole === 'teacher' ? 'text-blue-600 font-medium' : ''}>{t.author}</span>
                      {t.authorRole === 'teacher' && <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 text-[10px] font-semibold">Instructor</span>}
                    </span>
                    <span>&middot;</span>
                    <span className="flex items-center gap-1"><Clock size={12} /> {timeAgo(t.createdAt)}</span>
                    <span>&middot;</span>
                    <span className="flex items-center gap-1"><MessageCircle size={12} /> {t.replies} replies</span>
                  </div>
                </div>
                <div className="shrink-0 self-center">
                  {expanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                </div>
              </div>

              {/* Expanded replies */}
              {expanded && (
                <div className="border-t border-slate-100 px-5 pb-5">
                  {/* Tags */}
                  <div className="flex gap-2 py-3 flex-wrap">
                    {t.tags.map((tag, i) => (
                      <span key={i} className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">#{tag}</span>
                    ))}
                  </div>
                  {/* Replies */}
                  <div className="space-y-3 mb-4">
                    {t.replyList.map((r) => (
                      <div key={r.id} className={`p-3 rounded-xl border ${r.authorRole === 'teacher' ? 'bg-blue-50/50 border-blue-100' : 'bg-slate-50 border-slate-100'}`}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${r.authorRole === 'teacher' ? 'bg-blue-200 text-blue-700' : 'bg-slate-200 text-slate-600'}`}>
                            {r.author.split(' ').map(n => n[0]).join('')}
                          </div>
                          <span className={`text-sm font-medium ${r.authorRole === 'teacher' ? 'text-blue-700' : 'text-slate-700'}`}>{r.author}</span>
                          {r.authorRole === 'teacher' && <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 text-[10px] font-semibold">Instructor</span>}
                          <span className="text-xs text-slate-400">{timeAgo(r.createdAt)}</span>
                          <div className="ml-auto flex items-center gap-1 text-xs text-slate-400">
                            <ThumbsUp size={12} /> {r.upvotes}
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 m-0 ml-8">{r.content}</p>
                      </div>
                    ))}
                  </div>
                  {/* Reply input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write a reply..."
                      className="flex-1 py-2.5 px-3.5 border border-gray-200 rounded-lg text-[0.95rem] focus:outline-none focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/10"
                    />
                    <button className="inline-flex items-center gap-1.5 py-2.5 px-4 border-none rounded-lg text-sm font-medium cursor-pointer bg-blue-600 text-white hover:bg-blue-700">
                      <Send size={16} /> Reply
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {sorted.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <MessageSquare size={48} className="mx-auto text-slate-300 mb-3" />
          <h3 className="text-lg font-semibold text-slate-700 m-0 mb-1">No threads found</h3>
          <p className="text-sm text-slate-500 m-0">Start a new discussion or adjust your filters.</p>
        </div>
      )}
    </div>
  );
};

export default TeacherQnA;
