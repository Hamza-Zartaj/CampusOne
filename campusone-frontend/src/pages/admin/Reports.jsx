import React, { useEffect, useState } from 'react';
import {
  BarChart3, TrendingUp, Users, BookOpen, GraduationCap, Download,
  PieChart, Activity, AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { reportsAPI, termAPI } from '../../utils/api';

const Reports = () => {
  const [terms, setTerms] = useState([]);
  const [selectedTerm, setSelectedTerm] = useState('');
  const [overview, setOverview] = useState(null);
  const [enrollmentByProgram, setEnrollmentByProgram] = useState([]);
  const [termTrends, setTermTrends] = useState([]);
  const [admissionFunnel, setAdmissionFunnel] = useState([]);
  const [coursePerformance, setCoursePerformance] = useState([]);
  const [gradeDist, setGradeDist] = useState([]);
  const [attendance, setAttendance] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    termAPI.getAll()
      .then((r) => {
        const list = r.data.data || [];
        setTerms(list);
        const active = list.find((t) => t.isActive);
        setSelectedTerm(active?.id || '');
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      reportsAPI.overview(),
      reportsAPI.enrollmentByProgram(),
      reportsAPI.termTrends(),
      reportsAPI.admissionFunnel(),
      reportsAPI.coursePerformance(selectedTerm),
      reportsAPI.gradeDistribution(selectedTerm),
      reportsAPI.attendanceSummary(selectedTerm),
    ])
      .then(([ov, ep, tt, af, cp, gd, at]) => {
        setOverview(ov.data.data);
        setEnrollmentByProgram(ep.data.data || []);
        setTermTrends(tt.data.data || []);
        setAdmissionFunnel(af.data.data || []);
        setCoursePerformance(cp.data.data || []);
        setGradeDist(gd.data.data || []);
        setAttendance(at.data.data);
      })
      .catch((err) => toast.error(err.response?.data?.message || 'Failed to load reports'))
      .finally(() => setLoading(false));
  }, [selectedTerm]);

  const stats = [
    { icon: Users, label: 'Total Students',     value: overview?.totalStudents ?? '—',                color: '#3b82f6' },
    { icon: BookOpen, label: 'Active Offerings', value: overview?.activeOfferings ?? '—',             color: '#06b6d4' },
    { icon: GraduationCap, label: 'Graduation Rate', value: overview ? `${overview.graduationRate}%` : '—', color: '#10b981' },
    { icon: TrendingUp, label: 'Avg CGPA',       value: overview?.avgCGPA ?? '—',                     color: '#f59e0b' },
  ];

  const maxGradeCount = Math.max(1, ...gradeDist.map((g) => g.count));

  return (
    <div className="max-w-350 mx-auto">
      <div className="flex items-center justify-between mb-6 max-sm:flex-col max-sm:items-start max-sm:gap-3">
        <div>
          <h1 className="text-[28px] font-bold text-slate-800 m-0 max-md:text-2xl">Reports & Analytics</h1>
          <p className="text-sm text-slate-500 m-0 mt-1">Institutional performance overview</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedTerm}
            onChange={(e) => setSelectedTerm(e.target.value)}
            className="py-2.5 px-3.5 border border-gray-200 rounded-lg text-[0.95rem] bg-white focus:outline-none focus:border-blue-500"
          >
            <option value="">All Terms</option>
            {terms.map((t) => (
              <option key={t.id} value={t.id}>{t.code} {t.isActive ? '(active)' : ''}</option>
            ))}
          </select>
          <button
            onClick={() => toast('Export coming soon', { icon: 'ℹ️' })}
            className="inline-flex items-center gap-2 py-2.5 px-5 border-none rounded-lg text-[0.95rem] font-medium cursor-pointer transition-all bg-blue-600 text-white hover:bg-blue-700"
          >
            <Download size={18} /> Export
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-5 mb-8 max-sm:grid-cols-1">
        {stats.map((stat, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 flex items-center gap-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${stat.color}15`, color: stat.color }}>
              <stat.icon size={24} />
            </div>
            <div className="flex-1">
              <p className="text-sm text-slate-500 m-0 mb-1 font-medium">{stat.label}</p>
              <h3 className="text-[28px] font-bold text-slate-800 m-0">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {loading && (
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-slate-400 text-sm mb-6">Loading reports…</div>
      )}

      {/* Enrollment by Program */}
      <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <PieChart size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-800 m-0">Enrollment by Program</h2>
          </div>
        </div>

        {enrollmentByProgram.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">No programs.</p>
        ) : (
          <div className="space-y-4">
            {enrollmentByProgram.map((prog, i) => {
              const pct = Math.round((prog.students / prog.capacity) * 100);
              return (
                <div key={i} className="flex items-center gap-4">
                  <div className="w-24 text-sm font-medium text-slate-600 shrink-0">{prog.code}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-700">{prog.program}</span>
                      <span className="text-sm font-medium text-slate-600">{prog.students} students</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2.5">
                      <div
                        className="h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, pct)}%`, backgroundColor: prog.color }}
                      />
                    </div>
                  </div>
                  <div className="w-14 text-right text-sm font-semibold" style={{ color: prog.color }}>
                    {pct}%
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6 max-lg:grid-cols-1">
        {/* Term Trends */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center text-cyan-600">
              <Activity size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-800 m-0">Term Trends</h2>
          </div>
          {termTrends.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No terms.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Term</th>
                    <th className="text-right py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Enrolled</th>
                    <th className="text-right py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed</th>
                    <th className="text-right py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg GPA</th>
                  </tr>
                </thead>
                <tbody>
                  {termTrends.map((s, i) => (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-2 text-sm font-medium text-slate-700">{s.code}</td>
                      <td className="py-3 px-2 text-sm text-right text-slate-600">{s.enrolled}</td>
                      <td className="py-3 px-2 text-sm text-right text-slate-600">{s.completed ?? <span className="text-slate-400 italic">In progress</span>}</td>
                      <td className="py-3 px-2 text-sm text-right font-medium text-slate-700">{s.gpa?.toFixed(2) ?? <span className="text-slate-400 italic">—</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Admission Funnel */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
              <TrendingUp size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-800 m-0">Admission Funnel</h2>
          </div>
          {admissionFunnel.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No admissions data.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Month</th>
                    <th className="text-right py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Applied</th>
                    <th className="text-right py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Accepted</th>
                    <th className="text-right py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Enrolled</th>
                  </tr>
                </thead>
                <tbody>
                  {admissionFunnel.map((a, i) => (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-2 text-sm font-medium text-slate-700">{a.month}</td>
                      <td className="py-3 px-2 text-sm text-right text-slate-600">{a.applied}</td>
                      <td className="py-3 px-2 text-sm text-right text-slate-600">{a.accepted}</td>
                      <td className="py-3 px-2 text-sm text-right text-slate-600">{a.enrolled || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Grade Distribution + Attendance Summary */}
      <div className="grid grid-cols-2 gap-6 mb-6 max-lg:grid-cols-1">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
              <BarChart3 size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-800 m-0">Grade Distribution</h2>
          </div>
          {gradeDist.every((g) => g.count === 0) ? (
            <p className="text-sm text-slate-400 text-center py-6">No grades recorded yet.</p>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {gradeDist.map((g, i) => (
                <div key={i} className="flex flex-col items-center gap-1">
                  <div className="w-full bg-slate-100 rounded-md flex items-end" style={{ height: 80 }}>
                    <div
                      className="w-full bg-indigo-500 rounded-md transition-all"
                      style={{ height: `${(g.count / maxGradeCount) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-700">{g.grade}</span>
                  <span className="text-[10px] text-slate-500">{g.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
              <AlertCircle size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-800 m-0">Attendance Summary</h2>
          </div>
          {!attendance || attendance.total === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">No attendance recorded yet.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Present rate</span>
                <span className="text-2xl font-bold text-emerald-600">{attendance.presentRate}%</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-emerald-700 font-medium m-0">Present</p>
                  <p className="text-xl font-bold text-emerald-800 m-0 mt-1">{attendance.PRESENT}</p>
                </div>
                <div className="bg-amber-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-amber-700 font-medium m-0">Late</p>
                  <p className="text-xl font-bold text-amber-800 m-0 mt-1">{attendance.LATE}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-red-700 font-medium m-0">Absent</p>
                  <p className="text-xl font-bold text-red-800 m-0 mt-1">{attendance.ABSENT}</p>
                </div>
              </div>
              <p className="text-xs text-slate-400 text-center">{attendance.total} total records</p>
            </div>
          )}
        </div>
      </div>

      {/* Course Performance */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <BarChart3 size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-800 m-0">Course Performance</h2>
          </div>
        </div>
        {coursePerformance.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">No course data for this term.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Course</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Sec</th>
                  <th className="text-right py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Enrolled</th>
                  <th className="text-right py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Grade</th>
                  <th className="text-right py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Pass Rate</th>
                </tr>
              </thead>
              <tbody>
                {coursePerformance.map((c, i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-3 text-sm font-medium text-slate-700">{c.course}</td>
                    <td className="py-3 px-3 text-sm text-slate-500">{c.section}</td>
                    <td className="py-3 px-3 text-sm text-right text-slate-600">{c.enrolled}</td>
                    <td className="py-3 px-3 text-sm text-right">
                      <span className="inline-block px-2 py-0.5 rounded-md text-xs font-semibold bg-blue-50 text-blue-700">{c.avgGrade}</span>
                    </td>
                    <td className="py-3 px-3 text-sm text-right">
                      <div className="inline-flex items-center gap-2">
                        <div className="w-20 bg-slate-100 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${c.passRate >= 85 ? 'bg-green-500' : c.passRate >= 75 ? 'bg-amber-500' : 'bg-red-500'}`}
                            style={{ width: `${c.passRate}%` }}
                          />
                        </div>
                        <span className={`font-medium ${c.passRate >= 85 ? 'text-green-600' : c.passRate >= 75 ? 'text-amber-600' : 'text-red-600'}`}>
                          {c.passRate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
