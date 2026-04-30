import React, { useState, useEffect, useCallback } from 'react';
import {
  ClipboardList, Calendar, Search, CheckCircle, XCircle,
  Clock, Users, Download, AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { attendanceAPI, offeringAPI } from '../../utils/api';

const TODAY = new Date().toISOString().slice(0, 10);

const STATUS_CYCLE = { PRESENT: 'ABSENT', ABSENT: 'LATE', LATE: 'PRESENT' };

const StatusBadge = ({ status }) => {
  const cfg = {
    PRESENT: 'bg-green-50 text-green-700 border-green-200',
    ABSENT:  'bg-red-50 text-red-700 border-red-200',
    LATE:    'bg-amber-50 text-amber-700 border-amber-200',
  };
  const Icon = status === 'PRESENT' ? CheckCircle : status === 'ABSENT' ? XCircle : Clock;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${cfg[status]}`}>
      <Icon size={14} />
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
};

const TeacherAttendance = () => {
  const [offerings, setOfferings]           = useState([]);
  const [selected, setSelected]             = useState(null);
  const [view, setView]                     = useState('summary');
  const [sessions, setSessions]             = useState([]);
  const [studentSummary, setStudentSummary] = useState([]);
  const [statuses, setStatuses]             = useState({});
  const [markDate, setMarkDate]             = useState(TODAY);
  const [saving, setSaving]                 = useState(false);
  const [loading, setLoading]               = useState(false);
  const [search, setSearch]                 = useState('');

  // Load teacher's offerings once
  useEffect(() => {
    offeringAPI.getMy()
      .then(r => {
        const list = r.data.data || [];
        setOfferings(list);
        if (list.length) setSelected(list[0]);
      })
      .catch(() => toast.error('Failed to load offerings'));
  }, []);

  // Load sessions + student summary when offering changes
  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    Promise.all([
      attendanceAPI.getSessions(selected.id),
      attendanceAPI.getStudentSummary(selected.id),
    ])
      .then(([sessR, studR]) => {
        setSessions(sessR.data.data || []);
        setStudentSummary(studR.data.data || []);
      })
      .catch(() => toast.error('Failed to load attendance data'))
      .finally(() => setLoading(false));
  }, [selected?.id]);

  // Load existing session detail when switching to mark view or date changes
  const loadMarkSession = useCallback(async () => {
    if (!selected || !studentSummary.length) return;
    try {
      const r = await attendanceAPI.getSessionDetail(selected.id, markDate);
      const existing = r.data.data || [];
      const map = {};
      studentSummary.forEach(({ student }) => { map[student.id] = 'PRESENT'; });
      existing.forEach(rec => { map[rec.studentId] = rec.status; });
      setStatuses(map);
    } catch {
      // No records for this date yet — default everyone to PRESENT
      const map = {};
      studentSummary.forEach(({ student }) => { map[student.id] = 'PRESENT'; });
      setStatuses(map);
    }
  }, [selected, markDate, studentSummary]);

  useEffect(() => {
    if (view === 'mark') loadMarkSession();
  }, [view, markDate, loadMarkSession]);

  const toggleStatus = (studentId) =>
    setStatuses(prev => ({ ...prev, [studentId]: STATUS_CYCLE[prev[studentId]] || 'PRESENT' }));

  const saveAttendance = async () => {
    if (!selected || !Object.keys(statuses).length) return;
    setSaving(true);
    try {
      const records = Object.entries(statuses).map(([studentId, status]) => ({ studentId, status }));
      await attendanceAPI.mark({ offeringId: selected.id, date: markDate, records });
      toast.success('Attendance saved');
      // Refresh summary data
      const [sessR, studR] = await Promise.all([
        attendanceAPI.getSessions(selected.id),
        attendanceAPI.getStudentSummary(selected.id),
      ]);
      setSessions(sessR.data.data || []);
      setStudentSummary(studR.data.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  // Derived stats
  const totalSessions = sessions.length;
  const totalStudents = studentSummary.length;
  const avgAttendance = sessions.length
    ? Math.round(sessions.reduce((s, r) => s + (r.total ? r.present / r.total * 100 : 0), 0) / sessions.length)
    : 0;
  const atRiskCount = studentSummary.filter(s => s.isAtRisk).length;

  const stats = [
    { icon: Calendar,     label: 'Total Sessions', value: totalSessions,        color: '#3b82f6' },
    { icon: Users,        label: 'Students',        value: totalStudents,        color: '#06b6d4' },
    { icon: CheckCircle,  label: 'Avg Attendance',  value: `${avgAttendance}%`,  color: '#10b981' },
    { icon: AlertCircle,  label: 'Low Attendance',  value: atRiskCount,          color: '#ef4444' },
  ];

  const offeringLabel = o => `${o.course?.code ?? ''} - ${o.section}`;

  const filteredStudents = studentSummary.filter(({ student }) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return student.user.name.toLowerCase().includes(q) || student.studentId.toLowerCase().includes(q);
  });

  return (
    <div className="max-w-350 mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 max-sm:flex-col max-sm:items-start max-sm:gap-3">
        <div>
          <h1 className="text-[28px] font-bold text-slate-800 m-0 max-md:text-2xl">Attendance Management</h1>
          <p className="text-sm text-slate-500 m-0 mt-1">Track and manage class attendance</p>
        </div>
      </div>

      {/* Offering selector + view switcher */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-5 flex items-center gap-3 max-sm:flex-col">
        {offerings.length === 0 ? (
          <p className="text-sm text-slate-400 flex-1">No offerings assigned</p>
        ) : (
          <div className="flex gap-2 overflow-x-auto flex-1 max-sm:w-full">
            {offerings.map(o => (
              <button
                key={o.id}
                onClick={() => setSelected(o)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all cursor-pointer border ${
                  selected?.id === o.id
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-white border-gray-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                {offeringLabel(o)}
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2 max-sm:w-full shrink-0">
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
              {v === 'mark' ? 'Mark' : v}
            </button>
          ))}
        </div>
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

      {loading && (
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-slate-400 text-sm">Loading…</div>
      )}

      {/* Summary View */}
      {!loading && view === 'summary' && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 m-0 mb-4">
            Session History — {selected ? offeringLabel(selected) : ''}
          </h2>
          {sessions.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No attendance sessions recorded yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['Date', 'Present', 'Absent', 'Late', 'Rate'].map(h => (
                      <th key={h} className={`py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider ${h === 'Date' ? 'text-left' : 'text-right'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((r, i) => {
                    const rate = r.total ? Math.round(r.present / r.total * 100) : 0;
                    return (
                      <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                        <td className="py-3 px-3 text-sm font-medium text-slate-700">
                          {new Date(r.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        </td>
                        <td className="py-3 px-3 text-sm text-right text-green-600 font-medium">{r.present}</td>
                        <td className="py-3 px-3 text-sm text-right text-red-500 font-medium">{r.absent}</td>
                        <td className="py-3 px-3 text-sm text-right text-amber-500 font-medium">{r.late}</td>
                        <td className="py-3 px-3 text-sm text-right">
                          <div className="inline-flex items-center gap-2">
                            <div className="w-16 bg-slate-100 rounded-full h-1.5">
                              <div className={`h-1.5 rounded-full ${rate >= 90 ? 'bg-green-500' : rate >= 75 ? 'bg-amber-500' : 'bg-red-500'}`}
                                style={{ width: `${rate}%` }} />
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
          )}
        </div>
      )}

      {/* Mark View */}
      {!loading && view === 'mark' && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center justify-between mb-5 max-sm:flex-col max-sm:items-start max-sm:gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-800 m-0">Mark Attendance</h2>
              <p className="text-sm text-slate-500 m-0 mt-1">{selected ? offeringLabel(selected) : ''}</p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={markDate}
                max={TODAY}
                onChange={e => setMarkDate(e.target.value)}
                className="py-2 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/10"
              />
              <button
                onClick={saveAttendance}
                disabled={saving || !Object.keys(statuses).length}
                className="inline-flex items-center gap-2 py-2.5 px-5 border-none rounded-lg text-[0.95rem] font-medium cursor-pointer transition-all bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle size={18} /> {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>

          <div className="relative mb-4">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search student…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full py-2.5 pl-10 pr-4 border border-gray-200 rounded-lg text-[0.95rem] focus:outline-none focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/10"
            />
          </div>

          {filteredStudents.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No students enrolled.</p>
          ) : (
            <>
              {/* Quick-select row */}
              <div className="flex gap-2 mb-3">
                {['PRESENT', 'ABSENT', 'LATE'].map(s => (
                  <button
                    key={s}
                    onClick={() => {
                      const map = {};
                      filteredStudents.forEach(({ student }) => { map[student.id] = s; });
                      setStatuses(prev => ({ ...prev, ...map }));
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-200 text-slate-600 hover:bg-slate-50 cursor-pointer transition-all"
                  >
                    All {s.charAt(0) + s.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                {filteredStudents.map(({ student }) => (
                  <div
                    key={student.id}
                    onClick={() => toggleStatus(student.id)}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:bg-slate-50/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-sm font-semibold text-slate-600">
                        {student.user.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-slate-700 m-0">{student.user.name}</p>
                        <p className="text-xs text-slate-400 m-0">{student.studentId}</p>
                      </div>
                    </div>
                    <StatusBadge status={statuses[student.id] || 'PRESENT'} />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Students View */}
      {!loading && view === 'students' && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h2 className="text-lg font-bold text-slate-800 m-0 mb-4">Student Attendance Overview</h2>
          {studentSummary.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">No students enrolled.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['Student', 'Roll No', 'Present', 'Absent', 'Late', 'Rate', 'Status'].map((h, i) => (
                      <th key={h} className={`py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider ${i < 2 ? 'text-left' : 'text-right'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {studentSummary.map(({ student, present, absent, late, percentage, isAtRisk }, i) => (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-3 text-sm font-medium text-slate-700">{student.user.name}</td>
                      <td className="py-3 px-3 text-sm text-slate-500">{student.studentId}</td>
                      <td className="py-3 px-3 text-sm text-right text-green-600 font-medium">{present}</td>
                      <td className="py-3 px-3 text-sm text-right text-red-500 font-medium">{absent}</td>
                      <td className="py-3 px-3 text-sm text-right text-amber-500 font-medium">{late}</td>
                      <td className="py-3 px-3 text-sm text-right">
                        <span className={`font-semibold ${isAtRisk ? 'text-red-600' : 'text-green-600'}`}>{percentage}%</span>
                      </td>
                      <td className="py-3 px-3 text-sm text-right">
                        {isAtRisk ? (
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TeacherAttendance;
