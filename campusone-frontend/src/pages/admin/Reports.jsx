import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  Users,
  BookOpen,
  GraduationCap,
  Download,
  Filter,
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  PieChart,
  Activity,
} from 'lucide-react';

const enrollmentByProgram = [
  { program: 'BS Computer Science', code: 'BSCS', students: 245, capacity: 300, color: '#3b82f6' },
  { program: 'BS Electrical Engineering', code: 'BSEE', students: 189, capacity: 250, color: '#06b6d4' },
  { program: 'BS Business Admin', code: 'BSBA', students: 210, capacity: 250, color: '#10b981' },
  { program: 'BS Mathematics', code: 'BSMA', students: 78, capacity: 100, color: '#f59e0b' },
  { program: 'BS Physics', code: 'BSPH', students: 56, capacity: 80, color: '#8b5cf6' },
  { program: 'MS Computer Science', code: 'MSCS', students: 45, capacity: 60, color: '#ec4899' },
];

const courseStats = [
  { course: 'CS101 - Intro to Programming', enrolled: 120, avgGrade: 'B+', passRate: 92 },
  { course: 'CS201 - Data Structures', enrolled: 95, avgGrade: 'B', passRate: 85 },
  { course: 'EE101 - Circuit Analysis', enrolled: 88, avgGrade: 'B-', passRate: 78 },
  { course: 'BA201 - Marketing Mgmt', enrolled: 110, avgGrade: 'B+', passRate: 91 },
  { course: 'MA101 - Calculus I', enrolled: 150, avgGrade: 'C+', passRate: 72 },
  { course: 'CS301 - Algorithms', enrolled: 75, avgGrade: 'B-', passRate: 80 },
  { course: 'PH101 - Mechanics', enrolled: 65, avgGrade: 'B', passRate: 83 },
];

const semesterTrends = [
  { semester: 'Fall 2024', enrolled: 780, graduated: 120, gpa: 3.12 },
  { semester: 'Spring 2025', enrolled: 810, graduated: 95, gpa: 3.18 },
  { semester: 'Fall 2025', enrolled: 845, graduated: 130, gpa: 3.22 },
  { semester: 'Spring 2026', enrolled: 823, graduated: null, gpa: null },
];

const recentAdmissions = [
  { month: 'Sep 2025', applied: 450, accepted: 310, enrolled: 275 },
  { month: 'Oct 2025', applied: 120, accepted: 85, enrolled: 72 },
  { month: 'Nov 2025', applied: 60, accepted: 40, enrolled: 35 },
  { month: 'Jan 2026', applied: 380, accepted: 260, enrolled: 230 },
  { month: 'Feb 2026', applied: 210, accepted: 140, enrolled: null },
];

const Reports = () => {
  const [selectedPeriod, setSelectedPeriod] = useState('current');

  const stats = [
    { icon: Users, label: 'Total Students', value: '823', change: '+2.6%', up: true, color: '#3b82f6' },
    { icon: BookOpen, label: 'Active Courses', value: '124', change: '+8.7%', up: true, color: '#06b6d4' },
    { icon: GraduationCap, label: 'Graduation Rate', value: '87%', change: '+1.2%', up: true, color: '#10b981' },
    { icon: TrendingUp, label: 'Avg CGPA', value: '3.22', change: '-0.04', up: false, color: '#f59e0b' },
  ];

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 max-sm:flex-col max-sm:items-start max-sm:gap-3">
        <div>
          <h1 className="text-[28px] font-bold text-slate-800 m-0 max-md:text-2xl">Reports & Analytics</h1>
          <p className="text-sm text-slate-500 m-0 mt-1">Institutional performance overview</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="py-2.5 px-3.5 border border-gray-200 rounded-lg text-[0.95rem] bg-white focus:outline-none focus:border-blue-500"
          >
            <option value="current">Spring 2026</option>
            <option value="fall2025">Fall 2025</option>
            <option value="spring2025">Spring 2025</option>
          </select>
          <button className="inline-flex items-center gap-2 py-2.5 px-5 border-none rounded-lg text-[0.95rem] font-medium cursor-pointer transition-all bg-blue-600 text-white hover:bg-blue-700">
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
              <div className="flex items-baseline gap-2">
                <h3 className="text-[28px] font-bold text-slate-800 m-0">{stat.value}</h3>
                <span className={`text-xs font-medium flex items-center gap-0.5 ${stat.up ? 'text-green-600' : 'text-red-500'}`}>
                  {stat.up ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {stat.change}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

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

        <div className="space-y-4">
          {enrollmentByProgram.map((prog, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-24 text-sm font-medium text-slate-600 shrink-0">{prog.code}</div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-slate-700">{prog.program}</span>
                  <span className="text-sm font-medium text-slate-600">{prog.students}/{prog.capacity}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5">
                  <div
                    className="h-2.5 rounded-full transition-all duration-500"
                    style={{ width: `${(prog.students / prog.capacity) * 100}%`, backgroundColor: prog.color }}
                  />
                </div>
              </div>
              <div className="w-14 text-right text-sm font-semibold" style={{ color: prog.color }}>
                {Math.round((prog.students / prog.capacity) * 100)}%
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6 max-lg:grid-cols-1">
        {/* Semester Trends */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-cyan-50 flex items-center justify-center text-cyan-600">
              <Activity size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-800 m-0">Semester Trends</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Semester</th>
                  <th className="text-right py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Enrolled</th>
                  <th className="text-right py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Graduated</th>
                  <th className="text-right py-3 px-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg GPA</th>
                </tr>
              </thead>
              <tbody>
                {semesterTrends.map((s, i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-2 text-sm font-medium text-slate-700">{s.semester}</td>
                    <td className="py-3 px-2 text-sm text-right text-slate-600">{s.enrolled}</td>
                    <td className="py-3 px-2 text-sm text-right text-slate-600">{s.graduated ?? <span className="text-slate-400 italic">In progress</span>}</td>
                    <td className="py-3 px-2 text-sm text-right font-medium text-slate-700">{s.gpa?.toFixed(2) ?? <span className="text-slate-400 italic">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Admission Funnel */}
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
              <TrendingUp size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-800 m-0">Admission Funnel</h2>
          </div>
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
                {recentAdmissions.map((a, i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 px-2 text-sm font-medium text-slate-700">{a.month}</td>
                    <td className="py-3 px-2 text-sm text-right text-slate-600">{a.applied}</td>
                    <td className="py-3 px-2 text-sm text-right text-slate-600">{a.accepted}</td>
                    <td className="py-3 px-2 text-sm text-right text-slate-600">{a.enrolled ?? <span className="text-slate-400 italic">Pending</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Course Performance Table */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
              <BarChart3 size={20} />
            </div>
            <h2 className="text-lg font-bold text-slate-800 m-0">Course Performance</h2>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Course</th>
                <th className="text-right py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Enrolled</th>
                <th className="text-right py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Grade</th>
                <th className="text-right py-3 px-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Pass Rate</th>
              </tr>
            </thead>
            <tbody>
              {courseStats.map((c, i) => (
                <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-3 text-sm font-medium text-slate-700">{c.course}</td>
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
      </div>
    </div>
  );
};

export default Reports;
