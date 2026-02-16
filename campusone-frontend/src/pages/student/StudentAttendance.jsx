import React, { useState } from 'react';
import {
  ClipboardList,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  TrendingUp,
  ChevronDown,
  ChevronUp,
  BookOpen,
} from 'lucide-react';

const coursesAttendance = [
  {
    id: 1,
    code: 'CS201',
    name: 'Data Structures',
    teacher: 'Dr. Sarah Khan',
    section: 'A',
    totalClasses: 18,
    attended: 16,
    late: 1,
    absent: 1,
    records: [
      { date: '2026-02-16', status: 'present' },
      { date: '2026-02-13', status: 'present' },
      { date: '2026-02-11', status: 'late' },
      { date: '2026-02-09', status: 'present' },
      { date: '2026-02-06', status: 'absent' },
      { date: '2026-02-04', status: 'present' },
      { date: '2026-02-02', status: 'present' },
      { date: '2026-01-30', status: 'present' },
      { date: '2026-01-28', status: 'present' },
      { date: '2026-01-26', status: 'present' },
    ],
  },
  {
    id: 2,
    code: 'CS301',
    name: 'Algorithms',
    teacher: 'Dr. Ali Raza',
    section: 'B',
    totalClasses: 16,
    attended: 13,
    late: 1,
    absent: 2,
    records: [
      { date: '2026-02-15', status: 'present' },
      { date: '2026-02-12', status: 'absent' },
      { date: '2026-02-10', status: 'present' },
      { date: '2026-02-08', status: 'present' },
      { date: '2026-02-05', status: 'late' },
      { date: '2026-02-03', status: 'present' },
      { date: '2026-01-29', status: 'absent' },
      { date: '2026-01-27', status: 'present' },
    ],
  },
  {
    id: 3,
    code: 'MA101',
    name: 'Calculus I',
    teacher: 'Dr. Nadia Hussain',
    section: 'A',
    totalClasses: 20,
    attended: 19,
    late: 0,
    absent: 1,
    records: [
      { date: '2026-02-16', status: 'present' },
      { date: '2026-02-14', status: 'present' },
      { date: '2026-02-12', status: 'present' },
      { date: '2026-02-10', status: 'present' },
      { date: '2026-02-07', status: 'absent' },
      { date: '2026-02-05', status: 'present' },
      { date: '2026-02-03', status: 'present' },
    ],
  },
  {
    id: 4,
    code: 'ENG201',
    name: 'Technical Writing',
    teacher: 'Ms. Rabia Tariq',
    section: 'C',
    totalClasses: 14,
    attended: 10,
    late: 2,
    absent: 2,
    records: [
      { date: '2026-02-14', status: 'present' },
      { date: '2026-02-11', status: 'absent' },
      { date: '2026-02-07', status: 'late' },
      { date: '2026-02-04', status: 'present' },
      { date: '2026-01-31', status: 'late' },
      { date: '2026-01-28', status: 'absent' },
      { date: '2026-01-24', status: 'present' },
    ],
  },
];

const StudentAttendance = () => {
  const [expandedId, setExpandedId] = useState(null);

  const overallClasses = coursesAttendance.reduce((s, c) => s + c.totalClasses, 0);
  const overallAttended = coursesAttendance.reduce((s, c) => s + c.attended, 0);
  const overallRate = Math.round((overallAttended / overallClasses) * 100);
  const lowCourses = coursesAttendance.filter(c => Math.round((c.attended / c.totalClasses) * 100) < 75).length;

  const stats = [
    { icon: Calendar, label: 'Total Classes', value: overallClasses, color: '#3b82f6' },
    { icon: CheckCircle, label: 'Attended', value: overallAttended, color: '#10b981' },
    { icon: TrendingUp, label: 'Overall Rate', value: `${overallRate}%`, color: '#06b6d4' },
    { icon: AlertCircle, label: 'At Risk Courses', value: lowCourses, color: '#ef4444' },
  ];

  const statusIcon = (status) => {
    if (status === 'present') return <CheckCircle size={16} className="text-green-600" />;
    if (status === 'absent') return <XCircle size={16} className="text-red-500" />;
    return <Clock size={16} className="text-amber-500" />;
  };

  const statusBadge = (status) => {
    const s = {
      present: 'bg-green-50 text-green-700 border-green-200',
      absent: 'bg-red-50 text-red-700 border-red-200',
      late: 'bg-amber-50 text-amber-700 border-amber-200',
    };
    return `inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${s[status]}`;
  };

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[28px] font-bold text-slate-800 m-0 max-md:text-2xl">My Attendance</h1>
        <p className="text-sm text-slate-500 m-0 mt-1">Track your class attendance across all courses</p>
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

      {/* Course Cards */}
      <div className="space-y-3">
        {coursesAttendance.map((c) => {
          const rate = Math.round((c.attended / c.totalClasses) * 100);
          const expanded = expandedId === c.id;
          const danger = rate < 75;

          return (
            <div key={c.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div
                className="p-5 flex items-center gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors max-sm:flex-col max-sm:items-start"
                onClick={() => setExpandedId(expanded ? null : c.id)}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${danger ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                  <BookOpen size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-[0.95rem] font-semibold text-slate-800 m-0">{c.code} - {c.name}</h3>
                  <p className="text-xs text-slate-500 m-0 mt-0.5">{c.teacher} &middot; Section {c.section}</p>
                </div>
                <div className="flex items-center gap-5 max-sm:w-full max-sm:justify-between">
                  <div className="text-center">
                    <p className="text-xs text-slate-500 m-0">Present</p>
                    <p className="text-sm font-bold text-green-600 m-0">{c.attended}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500 m-0">Late</p>
                    <p className="text-sm font-bold text-amber-500 m-0">{c.late}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-slate-500 m-0">Absent</p>
                    <p className="text-sm font-bold text-red-500 m-0">{c.absent}</p>
                  </div>
                  <div className="w-24">
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-bold ${danger ? 'text-red-600' : 'text-green-600'}`}>{rate}%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${danger ? 'bg-red-500' : rate < 85 ? 'bg-amber-500' : 'bg-green-500'}`}
                        style={{ width: `${rate}%` }}
                      />
                    </div>
                  </div>
                  {danger && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200 shrink-0">
                      <AlertCircle size={12} /> Low
                    </span>
                  )}
                  {expanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                </div>
              </div>

              {expanded && (
                <div className="px-5 pb-5 border-t border-slate-100 pt-4">
                  <h4 className="text-sm font-semibold text-slate-700 m-0 mb-3">Recent Records</h4>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2">
                    {c.records.map((r, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/50">
                        <span className="text-sm text-slate-600">
                          {new Date(r.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                        <span className={statusBadge(r.status)}>
                          {statusIcon(r.status)}
                          {r.status}
                        </span>
                      </div>
                    ))}
                  </div>
                  {danger && (
                    <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2">
                      <AlertCircle size={16} className="text-red-500 mt-0.5 shrink-0" />
                      <p className="text-sm text-red-700 m-0">
                        Your attendance is below 75%. You may face debarment from the final exam if it doesn't improve.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default StudentAttendance;
