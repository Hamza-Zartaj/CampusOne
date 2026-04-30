import React, { useState, useEffect } from 'react';
import {
  Calendar, CheckCircle, XCircle, Clock,
  AlertCircle, TrendingUp, BookOpen, ChevronDown, ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { attendanceAPI } from '../../utils/api';

const statusBadge = (status) => {
  const s = {
    PRESENT: 'bg-green-50 text-green-700 border-green-200',
    ABSENT:  'bg-red-50 text-red-700 border-red-200',
    LATE:    'bg-amber-50 text-amber-700 border-amber-200',
  };
  return `inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${s[status] || s.PRESENT}`;
};

const StatusIcon = ({ status }) => {
  if (status === 'PRESENT') return <CheckCircle size={16} className="text-green-600" />;
  if (status === 'ABSENT')  return <XCircle size={16} className="text-red-500" />;
  return <Clock size={16} className="text-amber-500" />;
};

const StudentAttendance = () => {
  const [courses, setCourses]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    attendanceAPI.getMy()
      .then(r => setCourses(r.data.data || []))
      .catch(() => toast.error('Failed to load attendance'))
      .finally(() => setLoading(false));
  }, []);

  const overallClasses = courses.reduce((s, c) => s + c.totalSessions, 0);
  const overallAttended = courses.reduce((s, c) => s + c.present + c.late, 0);
  const overallRate = overallClasses > 0 ? Math.round(overallAttended / overallClasses * 100) : 100;
  const atRiskCount = courses.filter(c => c.isAtRisk).length;

  const stats = [
    { icon: Calendar,    label: 'Total Sessions',  value: overallClasses,     color: '#3b82f6' },
    { icon: CheckCircle, label: 'Attended',         value: overallAttended,    color: '#10b981' },
    { icon: TrendingUp,  label: 'Overall Rate',     value: `${overallRate}%`,  color: '#06b6d4' },
    { icon: AlertCircle, label: 'At Risk Courses',  value: atRiskCount,        color: '#ef4444' },
  ];

  if (loading) {
    return (
      <div className="max-w-350 mx-auto">
        <div className="mb-6">
          <h1 className="text-[28px] font-bold text-slate-800 m-0 max-md:text-2xl">My Attendance</h1>
          <p className="text-sm text-slate-500 m-0 mt-1">Track your class attendance across all courses</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-slate-400 text-sm">Loading…</div>
      </div>
    );
  }

  return (
    <div className="max-w-350 mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[28px] font-bold text-slate-800 m-0 max-md:text-2xl">My Attendance</h1>
        <p className="text-sm text-slate-500 m-0 mt-1">Track your class attendance across all courses</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-5 mb-6 max-sm:grid-cols-2">
        {stats.map((s, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 flex items-center gap-3 shadow-sm">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${s.color}15`, color: s.color }}>
              <s.icon size={22} />
            </div>
            <div>
              <p className="text-xs text-slate-500 m-0 mb-0.5 font-medium">{s.label}</p>
              <h3 className="text-2xl font-bold text-slate-800 m-0">{s.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Course cards */}
      {courses.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-slate-400 text-sm">
          No attendance records yet.
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map((c) => {
            const expanded = expandedId === c.offering.id;
            return (
              <div key={c.offering.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div
                  className="p-5 flex items-center gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors max-sm:flex-col max-sm:items-start"
                  onClick={() => setExpandedId(expanded ? null : c.offering.id)}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${c.isAtRisk ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                    <BookOpen size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[0.95rem] font-semibold text-slate-800 m-0">
                      {c.offering.course.code} — {c.offering.course.title}
                    </h3>
                    <p className="text-xs text-slate-500 m-0 mt-0.5">
                      {c.offering.teacher} &middot; Section {c.offering.section}
                    </p>
                  </div>
                  <div className="flex items-center gap-5 max-sm:w-full max-sm:justify-between">
                    <div className="text-center">
                      <p className="text-xs text-slate-500 m-0">Present</p>
                      <p className="text-sm font-bold text-green-600 m-0">{c.present}</p>
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
                        <span className={`text-sm font-bold ${c.isAtRisk ? 'text-red-600' : 'text-green-600'}`}>
                          {c.percentage}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${c.isAtRisk ? 'bg-red-500' : c.percentage < 85 ? 'bg-amber-500' : 'bg-green-500'}`}
                          style={{ width: `${c.percentage}%` }}
                        />
                      </div>
                    </div>
                    {c.isAtRisk && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200 shrink-0">
                        <AlertCircle size={12} /> Low
                      </span>
                    )}
                    {expanded ? <ChevronUp size={18} className="text-slate-400 shrink-0" /> : <ChevronDown size={18} className="text-slate-400 shrink-0" />}
                  </div>
                </div>

                {expanded && (
                  <div className="px-5 pb-5 border-t border-slate-100 pt-4">
                    <h4 className="text-sm font-semibold text-slate-700 m-0 mb-3">Recent Records</h4>
                    {c.records.length === 0 ? (
                      <p className="text-sm text-slate-400">No records yet.</p>
                    ) : (
                      <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-2">
                        {c.records.map((r, i) => (
                          <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50/50">
                            <span className="text-sm text-slate-600">
                              {new Date(r.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                            </span>
                            <span className={statusBadge(r.status)}>
                              <StatusIcon status={r.status} />
                              {r.status.charAt(0) + r.status.slice(1).toLowerCase()}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                    {c.isAtRisk && (
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
      )}
    </div>
  );
};

export default StudentAttendance;
