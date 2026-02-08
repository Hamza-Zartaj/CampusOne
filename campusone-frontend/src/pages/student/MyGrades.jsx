import React, { useState, useEffect, useCallback } from 'react';
import {
  Award,
  TrendingUp,
  BookOpen,
  Filter,
  AlertCircle,
  FileText,
  Download,
  ChevronDown,
  ChevronUp,
  GraduationCap
} from 'lucide-react';
import { studentPortalAPI } from '../../utils/api';
import toast from 'react-hot-toast';

const gradeColors = {
  'A+': 'bg-emerald-100 text-emerald-700',
  'A': 'bg-emerald-100 text-emerald-700',
  'A-': 'bg-green-100 text-green-700',
  'B+': 'bg-blue-100 text-blue-700',
  'B': 'bg-blue-100 text-blue-700',
  'B-': 'bg-sky-100 text-sky-700',
  'C+': 'bg-amber-100 text-amber-700',
  'C': 'bg-amber-100 text-amber-700',
  'C-': 'bg-orange-100 text-orange-700',
  'D+': 'bg-orange-100 text-orange-700',
  'D': 'bg-orange-100 text-orange-700',
  'F': 'bg-red-100 text-red-700',
  'W': 'bg-slate-100 text-slate-700',
  'I': 'bg-purple-100 text-purple-700',
};

const MyGrades = () => {
  const [activeTab, setActiveTab] = useState('grades');
  const [grades, setGrades] = useState([]);
  const [transcript, setTranscript] = useState(null);
  const [cgpaData, setCgpaData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterYear, setFilterYear] = useState('');
  const [filterSemester, setFilterSemester] = useState('');

  const fetchGrades = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterYear) params.academicYear = filterYear;
      if (filterSemester) params.semesterNumber = filterSemester;
      const res = await studentPortalAPI.getMyGrades(params);
      if (res.data.success) {
        setGrades(res.data.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error fetching grades');
    } finally {
      setLoading(false);
    }
  }, [filterYear, filterSemester]);

  const fetchTranscript = async () => {
    try {
      setLoading(true);
      const res = await studentPortalAPI.getMyTranscript();
      if (res.data.success) {
        setTranscript(res.data.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error fetching transcript');
    } finally {
      setLoading(false);
    }
  };

  const fetchCGPA = async () => {
    try {
      const res = await studentPortalAPI.getMyCGPA();
      if (res.data.success) {
        setCgpaData(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching CGPA:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'grades') {
      fetchGrades();
    } else if (activeTab === 'transcript') {
      fetchTranscript();
    }
    fetchCGPA();
  }, [activeTab, fetchGrades]);

  // Group grades by semester
  const groupedGrades = grades.reduce((acc, g) => {
    const key = `${g.academicYear}-Sem${g.semesterNumber}`;
    if (!acc[key]) {
      acc[key] = { academicYear: g.academicYear, semesterNumber: g.semesterNumber, courses: [] };
    }
    acc[key].courses.push(g);
    return acc;
  }, {});

  const tabClass = (tab) =>
    `py-2.5 px-5 text-sm font-medium rounded-lg cursor-pointer transition-all border-none ${
      activeTab === tab
        ? 'bg-gradient-primary text-white shadow-sm'
        : 'bg-transparent text-slate-500 hover:bg-slate-100'
    }`;

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 max-sm:flex-col max-sm:items-start max-sm:gap-3">
        <div>
          <h1 className="text-[28px] font-bold text-slate-800 m-0 max-md:text-2xl">My Grades</h1>
          <p className="text-sm text-slate-500 m-0 mt-1">Academic performance & transcript</p>
        </div>
        {cgpaData && (
          <div className="bg-white rounded-2xl shadow-sm px-6 py-3 flex items-center gap-3">
            <GraduationCap size={24} className="text-primary-500" />
            <div>
              <p className="text-xs text-slate-500 m-0 font-medium">Cumulative GPA</p>
              <p className="text-2xl font-bold text-slate-800 m-0">{cgpaData.cgpa?.toFixed(2) || '-'}</p>
            </div>
            {cgpaData.totalCredits && (
              <div className="ml-4 pl-4 border-l border-gray-200">
                <p className="text-xs text-slate-500 m-0 font-medium">Total Credits</p>
                <p className="text-2xl font-bold text-slate-800 m-0">{cgpaData.totalCredits}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm p-2 mb-5 flex items-center gap-1">
        <button className={tabClass('grades')} onClick={() => setActiveTab('grades')}>
          <span className="flex items-center gap-2"><Award size={16} /> Grades</span>
        </button>
        <button className={tabClass('transcript')} onClick={() => setActiveTab('transcript')}>
          <span className="flex items-center gap-2"><FileText size={16} /> Transcript</span>
        </button>
      </div>

      {/* Grades Tab */}
      {activeTab === 'grades' && (
        <>
          {/* Filters */}
          <div className="bg-white rounded-2xl shadow-sm p-4 mb-5 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Academic Year</label>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="w-full py-2 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-500"
              >
                <option value="">All Years</option>
                {[...new Set(grades.map(g => g.academicYear))].sort().reverse().map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Semester</label>
              <select
                value={filterSemester}
                onChange={(e) => setFilterSemester(e.target.value)}
                className="w-full py-2 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-500"
              >
                <option value="">All Semesters</option>
                {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-slate-400">Loading grades...</div>
          ) : grades.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
              <AlertCircle size={48} className="mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-semibold text-slate-700 mb-1">No grades yet</h3>
              <p className="text-slate-500">Grades will appear here once they are submitted by your instructors.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {Object.values(groupedGrades).sort((a, b) => {
                if (b.academicYear !== a.academicYear) return b.academicYear.localeCompare(a.academicYear);
                return b.semesterNumber - a.semesterNumber;
              }).map((group) => (
                <div key={`${group.academicYear}-${group.semesterNumber}`} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="py-4 px-5 bg-slate-50 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-700 m-0">
                      {group.academicYear} — Semester {group.semesterNumber}
                    </h3>
                    <span className="text-xs text-slate-500">
                      {group.courses.length} course{group.courses.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Course</th>
                          <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase">CH</th>
                          <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Midterm</th>
                          <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Final</th>
                          <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Total</th>
                          <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Grade</th>
                          <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase">GP</th>
                          <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {group.courses.map((item) => (
                          <tr key={item.enrollmentId} className="border-b border-gray-50 hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-4">
                              <p className="text-sm font-medium text-slate-800 m-0">{item.course?.code}</p>
                              <p className="text-xs text-slate-500 m-0">{item.course?.name}</p>
                            </td>
                            <td className="py-3 px-4 text-center text-sm text-slate-600">{item.course?.creditHours}</td>
                            <td className="py-3 px-4 text-center text-sm text-slate-600">{item.marks?.midterm ?? '-'}</td>
                            <td className="py-3 px-4 text-center text-sm text-slate-600">{item.marks?.final ?? '-'}</td>
                            <td className="py-3 px-4 text-center text-sm font-semibold text-slate-800">{item.marks?.total ?? '-'}</td>
                            <td className="py-3 px-4 text-center">
                              {item.grade ? (
                                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${gradeColors[item.grade] || 'bg-slate-100 text-slate-700'}`}>
                                  {item.grade}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">-</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center text-sm text-slate-600">{item.gradePoints ?? '-'}</td>
                            <td className="py-3 px-4 text-center">
                              <span className={`text-xs font-medium capitalize ${
                                item.status === 'completed' ? 'text-green-600' :
                                item.status === 'failed' ? 'text-red-600' :
                                'text-slate-500'
                              }`}>
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Transcript Tab */}
      {activeTab === 'transcript' && (
        <>
          {loading ? (
            <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-slate-400">Loading transcript...</div>
          ) : !transcript || (!transcript.semesters?.length && !transcript.length) ? (
            <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
              <AlertCircle size={48} className="mx-auto mb-4 text-slate-300" />
              <h3 className="text-lg font-semibold text-slate-700 mb-1">No transcript data</h3>
              <p className="text-slate-500">Your transcript will be available after completing courses.</p>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Student Info */}
              {transcript.student && (
                <div className="bg-white rounded-2xl shadow-sm p-5">
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
                    <div>
                      <p className="text-xs text-slate-500 m-0">Student</p>
                      <p className="text-sm font-semibold text-slate-800 m-0">{transcript.student.name}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 m-0">Student ID</p>
                      <p className="text-sm font-semibold text-slate-800 m-0">{transcript.student.studentId}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 m-0">Program</p>
                      <p className="text-sm font-semibold text-slate-800 m-0">{transcript.student.program || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 m-0">CGPA</p>
                      <p className="text-sm font-bold text-primary-600 m-0">{transcript.cgpa?.toFixed(2) || '-'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Semester Cards */}
              {(transcript.semesters || transcript).map((sem, si) => (
                <div key={si} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="py-4 px-5 bg-slate-50 border-b border-gray-200 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-700 m-0">
                      {sem.academicYear} — Semester {sem.semesterNumber}
                    </h3>
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      {sem.semesterGPA != null && <span>GPA: <strong className="text-slate-700">{sem.semesterGPA?.toFixed(2)}</strong></span>}
                      {sem.totalCredits != null && <span>Credits: <strong className="text-slate-700">{sem.totalCredits}</strong></span>}
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-100">
                          <th className="text-left py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase">Course</th>
                          <th className="text-center py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase">CH</th>
                          <th className="text-center py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase">Grade</th>
                          <th className="text-center py-2.5 px-4 text-xs font-semibold text-slate-500 uppercase">GP</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(sem.courses || []).map((course, ci) => (
                          <tr key={ci} className="border-b border-gray-50">
                            <td className="py-2.5 px-4">
                              <p className="text-sm font-medium text-slate-800 m-0">{course.courseCode || course.code}</p>
                              <p className="text-xs text-slate-500 m-0">{course.courseName || course.name}</p>
                            </td>
                            <td className="py-2.5 px-4 text-center text-sm text-slate-600">{course.creditHours}</td>
                            <td className="py-2.5 px-4 text-center">
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${gradeColors[course.grade] || 'bg-slate-100 text-slate-700'}`}>
                                {course.grade || '-'}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-center text-sm text-slate-600">{course.gradePoints ?? '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MyGrades;
