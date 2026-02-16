import React, { useState } from 'react';
import {
  ClipboardList,
  Calendar,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  ChevronDown,
  ChevronUp,
  Download,
  AlertCircle,
} from 'lucide-react';

const offerings = [
  { id: 1, code: 'CS101', name: 'Intro to Programming', section: 'A', students: 45 },
  { id: 2, code: 'CS201', name: 'Data Structures', section: 'A', students: 38 },
  { id: 3, code: 'CS301', name: 'Algorithms', section: 'B', students: 32 },
];

const attendanceRecords = {
  1: [
    { date: '2026-02-16', present: 40, absent: 3, late: 2, total: 45 },
    { date: '2026-02-13', present: 42, absent: 2, late: 1, total: 45 },
    { date: '2026-02-11', present: 38, absent: 5, late: 2, total: 45 },
    { date: '2026-02-09', present: 43, absent: 1, late: 1, total: 45 },
    { date: '2026-02-06', present: 41, absent: 3, late: 1, total: 45 },
    { date: '2026-02-04', present: 44, absent: 0, late: 1, total: 45 },
    { date: '2026-02-02', present: 39, absent: 4, late: 2, total: 45 },
  ],
  2: [
    { date: '2026-02-16', present: 34, absent: 2, late: 2, total: 38 },
    { date: '2026-02-13', present: 36, absent: 1, late: 1, total: 38 },
    { date: '2026-02-11', present: 33, absent: 4, late: 1, total: 38 },
    { date: '2026-02-09', present: 37, absent: 0, late: 1, total: 38 },
    { date: '2026-02-06', present: 35, absent: 2, late: 1, total: 38 },
  ],
  3: [
    { date: '2026-02-16', present: 28, absent: 3, late: 1, total: 32 },
    { date: '2026-02-13', present: 30, absent: 1, late: 1, total: 32 },
    { date: '2026-02-11', present: 29, absent: 2, late: 1, total: 32 },
    { date: '2026-02-09', present: 31, absent: 0, late: 1, total: 32 },
  ],
};

const studentList = [
  { id: 1, name: 'Ahmed Hassan', rollNo: 'BSCS-2024-001', totalClasses: 7, attended: 7, status: 'present' },
  { id: 2, name: 'Sara Ali', rollNo: 'BSCS-2024-002', totalClasses: 7, attended: 6, status: 'present' },
  { id: 3, name: 'Usman Khan', rollNo: 'BSCS-2024-003', totalClasses: 7, attended: 5, status: 'absent' },
  { id: 4, name: 'Fatima Zahra', rollNo: 'BSCS-2024-004', totalClasses: 7, attended: 7, status: 'present' },
  { id: 5, name: 'Ali Raza', rollNo: 'BSCS-2024-005', totalClasses: 7, attended: 4, status: 'late' },
  { id: 6, name: 'Ayesha Siddiqui', rollNo: 'BSCS-2024-006', totalClasses: 7, attended: 6, status: 'present' },
  { id: 7, name: 'Bilal Ahmad', rollNo: 'BSCS-2024-007', totalClasses: 7, attended: 3, status: 'absent' },
  { id: 8, name: 'Hira Malik', rollNo: 'BSCS-2024-008', totalClasses: 7, attended: 7, status: 'present' },
];

const TeacherAttendance = () => {
  const [selectedOffering, setSelectedOffering] = useState(offerings[0]);
  const [view, setView] = useState('summary'); // 'summary' | 'mark' | 'students'
  const [markDate] = useState('2026-02-16');
  const [studentStatuses, setStudentStatuses] = useState(
    studentList.reduce((acc, s) => ({ ...acc, [s.id]: s.status }), {})
  );
  const [searchQuery, setSearchQuery] = useState('');

  const records = attendanceRecords[selectedOffering.id] || [];
  const totalClasses = records.length;
  const avgAttendance = records.length > 0
    ? Math.round(records.reduce((sum, r) => sum + (r.present / r.total) * 100, 0) / records.length)
    : 0;

  const stats = [
    { icon: Calendar, label: 'Total Classes', value: totalClasses, color: '#3b82f6' },
    { icon: Users, label: 'Students', value: selectedOffering.students, color: '#06b6d4' },
    { icon: CheckCircle, label: 'Avg Attendance', value: `${avgAttendance}%`, color: '#10b981' },
    { icon: AlertCircle, label: 'Low Attendance', value: studentList.filter(s => (s.attended / s.totalClasses) * 100 < 75).length, color: '#ef4444' },
  ];

  const toggleStatus = (studentId) => {
    setStudentStatuses(prev => {
      const current = prev[studentId];
      const next = current === 'present' ? 'absent' : current === 'absent' ? 'late' : 'present';
      return { ...prev, [studentId]: next };
    });
  };

  const statusIcon = (status) => {
    if (status === 'present') return <CheckCircle size={18} className="text-green-600" />;
    if (status === 'absent') return <XCircle size={18} className="text-red-500" />;
    return <Clock size={18} className="text-amber-500" />;
  };

  const statusBadge = (status) => {
    const styles = {
      present: 'bg-green-50 text-green-700 border-green-200',
      absent: 'bg-red-50 text-red-700 border-red-200',
      late: 'bg-amber-50 text-amber-700 border-amber-200',
    };
    return `inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${styles[status]}`;
  };

  const filteredStudents = studentList.filter(s => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.rollNo.toLowerCase().includes(q);
  });

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 max-sm:flex-col max-sm:items-start max-sm:gap-3">
        <div>
          <h1 className="text-[28px] font-bold text-slate-800 m-0 max-md:text-2xl">Attendance Management</h1>
          <p className="text-sm text-slate-500 m-0 mt-1">Track and manage class attendance</p>
        </div>
        <button className="inline-flex items-center gap-2 py-2.5 px-5 border-none rounded-lg text-[0.95rem] font-medium cursor-pointer transition-all bg-blue-600 text-white hover:bg-blue-700">
          <Download size={18} /> Export Report
        </button>
      </div>

      {/* Course Selector */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-5 flex items-center gap-3 max-sm:flex-col">
        <div className="flex gap-2 overflow-x-auto flex-1 max-sm:w-full">
          {offerings.map(o => (
            <button
              key={o.id}
              onClick={() => setSelectedOffering(o)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all cursor-pointer border ${
                selectedOffering.id === o.id
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-gray-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {o.code} - {o.section}
            </button>
          ))}
        </div>
        <div className="flex gap-2 max-sm:w-full">
          {['summary', 'mark', 'students'].map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition-all cursor-pointer border ${
                view === v
                  ? 'bg-slate-800 border-slate-800 text-white'
                  : 'bg-white border-gray-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {v === 'mark' ? 'Mark Today' : v}
            </button>
          ))}
        </div>
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

      {/* Summary View */}
      {view === 'summary' && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 m-0 mb-4">
            {selectedOffering.code} - {selectedOffering.name} (Section {selectedOffering.section})
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="text-right py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Present</th>
                  <th className="text-right py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Absent</th>
                  <th className="text-right py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Late</th>
                  <th className="text-right py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Rate</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r, i) => {
                  const rate = Math.round((r.present / r.total) * 100);
                  return (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-3 text-sm font-medium text-slate-700">
                        {new Date(r.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="py-3 px-3 text-sm text-right">
                        <span className="text-green-600 font-medium">{r.present}</span>
                      </td>
                      <td className="py-3 px-3 text-sm text-right">
                        <span className="text-red-500 font-medium">{r.absent}</span>
                      </td>
                      <td className="py-3 px-3 text-sm text-right">
                        <span className="text-amber-500 font-medium">{r.late}</span>
                      </td>
                      <td className="py-3 px-3 text-sm text-right">
                        <div className="inline-flex items-center gap-2">
                          <div className="w-16 bg-slate-100 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${rate >= 90 ? 'bg-green-500' : rate >= 75 ? 'bg-amber-500' : 'bg-red-500'}`}
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                          <span className="font-medium text-slate-700">{rate}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Mark Attendance View */}
      {view === 'mark' && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-slate-800 m-0">Mark Attendance</h2>
              <p className="text-sm text-slate-500 m-0 mt-1">{markDate} &middot; {selectedOffering.code} Section {selectedOffering.section}</p>
            </div>
            <button className="inline-flex items-center gap-2 py-2.5 px-5 border-none rounded-lg text-[0.95rem] font-medium cursor-pointer transition-all bg-green-600 text-white hover:bg-green-700">
              <CheckCircle size={18} /> Save Attendance
            </button>
          </div>

          <div className="relative mb-4">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search student..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full py-2.5 pl-10 pr-4 border border-gray-200 rounded-lg text-[0.95rem] focus:outline-none focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/10"
            />
          </div>

          <div className="space-y-2">
            {filteredStudents.map((s) => (
              <div
                key={s.id}
                onClick={() => toggleStatus(s.id)}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50/50 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-600">
                    {s.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700 m-0">{s.name}</p>
                    <p className="text-xs text-slate-400 m-0">{s.rollNo}</p>
                  </div>
                </div>
                <div className={statusBadge(studentStatuses[s.id])}>
                  {statusIcon(studentStatuses[s.id])}
                  {studentStatuses[s.id]}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Students Overview */}
      {view === 'students' && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 m-0 mb-4">Student Attendance Overview</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Student</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Roll No</th>
                  <th className="text-right py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Attended</th>
                  <th className="text-right py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total</th>
                  <th className="text-right py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Rate</th>
                  <th className="text-right py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {studentList.map((s) => {
                  const rate = Math.round((s.attended / s.totalClasses) * 100);
                  const danger = rate < 75;
                  return (
                    <tr key={s.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-3 text-sm font-medium text-slate-700">{s.name}</td>
                      <td className="py-3 px-3 text-sm text-slate-500">{s.rollNo}</td>
                      <td className="py-3 px-3 text-sm text-right text-slate-600">{s.attended}</td>
                      <td className="py-3 px-3 text-sm text-right text-slate-600">{s.totalClasses}</td>
                      <td className="py-3 px-3 text-sm text-right">
                        <span className={`font-semibold ${danger ? 'text-red-600' : 'text-green-600'}`}>{rate}%</span>
                      </td>
                      <td className="py-3 px-3 text-sm text-right">
                        {danger ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-600 border border-red-200">
                            <AlertCircle size={12} /> At Risk
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-600 border border-green-200">
                            <CheckCircle size={12} /> Good
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherAttendance;
