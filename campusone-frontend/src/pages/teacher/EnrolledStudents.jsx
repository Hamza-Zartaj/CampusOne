import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Users,
  Search,
  ArrowLeft,
  Edit,
  Save,
  X,
  Lock,
  Unlock,
  Download,
  BarChart3,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { teacherToolsAPI } from '../../utils/api';
import toast from 'react-hot-toast';

const inputClass = "w-full py-1.5 px-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-500 focus:ring-[2px] focus:ring-primary-500/10 text-center";

const VALID_GRADES = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'F', 'I', 'W', 'P', 'NP'];

const EnrolledStudents = () => {
  const { courseCode } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [offeringId, setOfferingId] = useState(location.state?.offeringId || null);
  const [students, setStudents] = useState([]);
  const [offering, setOffering] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [editingId, setEditingId] = useState(null);
  const [editMarks, setEditMarks] = useState({});
  const [saving, setSaving] = useState(false);
  const [showGradeSummary, setShowGradeSummary] = useState(false);
  const [gradeSummary, setGradeSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      const res = await teacherToolsAPI.getEnrolledStudents(offeringId, { sortBy });
      if (res.data.success) {
        setStudents(res.data.data);
        setOffering(res.data.offering);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error fetching students');
    } finally {
      setLoading(false);
    }
  }, [offeringId, sortBy]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  const fetchGradeSummary = async () => {
    try {
      setSummaryLoading(true);
      const res = await teacherToolsAPI.getGradeSummary(offeringId);
      if (res.data.success) {
        setGradeSummary(res.data.data);
        setShowGradeSummary(true);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error fetching grade summary');
    } finally {
      setSummaryLoading(false);
    }
  };

  const startEditing = (student) => {
    setEditingId(student.enrollmentId);
    setEditMarks({
      midtermMarks: student.midtermMarks ?? '',
      finalMarks: student.finalMarks ?? '',
      assignmentMarks: student.assignmentMarks ?? '',
      quizMarks: student.quizMarks ?? '',
      labMarks: student.labMarks ?? '',
      totalMarks: student.totalMarks ?? '',
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditMarks({});
  };

  const saveMarks = async (enrollmentId) => {
    try {
      setSaving(true);
      const marksToSend = {};
      Object.keys(editMarks).forEach(key => {
        if (editMarks[key] !== '' && editMarks[key] !== undefined) {
          marksToSend[key] = parseFloat(editMarks[key]);
        }
      });
      const res = await teacherToolsAPI.uploadStudentMarks(enrollmentId, marksToSend);
      if (res.data.success) {
        toast.success('Marks saved successfully');
        setEditingId(null);
        fetchStudents();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error saving marks');
    } finally {
      setSaving(false);
    }
  };

  const submitGrade = async (enrollmentId, grade, autoCalculate = false) => {
    try {
      const res = await teacherToolsAPI.submitStudentGrade(enrollmentId, { grade, autoCalculate });
      if (res.data.success) {
        toast.success(`Grade ${res.data.data.grade} submitted`);
        fetchStudents();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error submitting grade');
    }
  };

  const handleBulkAutoGrade = async () => {
    if (!confirm('Auto-calculate and submit grades for all students with total marks?')) return;
    try {
      const res = await teacherToolsAPI.submitFinalGrades(offeringId, { autoCalculate: true });
      if (res.data.success) {
        toast.success(`Grades submitted: ${res.data.summary.successful} successful, ${res.data.summary.skipped} skipped`);
        fetchStudents();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error submitting grades');
    }
  };

  const handleLockResults = async () => {
    if (!confirm('Lock results? Grades cannot be changed after locking.')) return;
    try {
      const res = await teacherToolsAPI.lockResults(offeringId);
      if (res.data.success) {
        toast.success('Results locked');
        fetchStudents();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error locking results');
    }
  };

  const handleExport = async (format) => {
    try {
      const res = await teacherToolsAPI.exportGrades(offeringId, format);
      if (format === 'csv') {
        const blob = new Blob([res.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `grades_${offeringId}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast.success('Grades exported');
      }
    } catch (err) {
      toast.error('Error exporting grades');
    }
  };

  const filteredStudents = students.filter(s => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.name?.toLowerCase().includes(q) ||
      s.studentId?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => navigate('/teacher/offerings')}
          className="w-10 h-10 rounded-lg border border-gray-200 flex items-center justify-center bg-white hover:bg-slate-50 cursor-pointer transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-[24px] font-bold text-slate-800 m-0 max-md:text-xl">Enrolled Students</h1>
          <p className="text-sm text-slate-500 m-0 mt-0.5">
            {offering ? `${offering.academicYear} • Semester ${offering.semesterNumber} • Section ${offering.section}` : ''}
            {offering?.resultsLocked && <span className="ml-2 text-green-600 font-medium">🔒 Results Locked</span>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchGradeSummary}
            disabled={summaryLoading}
            className="inline-flex items-center gap-2 py-2 px-4 border border-gray-200 rounded-lg text-sm font-medium bg-white hover:bg-slate-50 cursor-pointer transition-all"
          >
            <BarChart3 size={16} /> Summary
          </button>
          <button
            onClick={() => handleExport('csv')}
            className="inline-flex items-center gap-2 py-2 px-4 border border-gray-200 rounded-lg text-sm font-medium bg-white hover:bg-slate-50 cursor-pointer transition-all"
          >
            <Download size={16} /> Export CSV
          </button>
          {!offering?.resultsLocked && (
            <>
              <button
                onClick={handleBulkAutoGrade}
                className="inline-flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium bg-amber-500 text-white hover:bg-amber-600 cursor-pointer transition-all border-none"
              >
                <CheckCircle2 size={16} /> Auto-Grade All
              </button>
              <button
                onClick={handleLockResults}
                className="inline-flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 cursor-pointer transition-all border-none"
              >
                <Lock size={16} /> Lock Results
              </button>
            </>
          )}
        </div>
      </div>

      {/* Grade Summary Panel */}
      {showGradeSummary && gradeSummary && (
        <div className="bg-white rounded-2xl shadow-sm p-5 mb-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-slate-800 m-0">Grade Summary</h3>
            <button onClick={() => setShowGradeSummary(false)} className="text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-4 mb-4">
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-xs text-blue-600 font-medium m-0">Total</p>
              <p className="text-xl font-bold text-blue-700 m-0">{gradeSummary.totalEnrolled}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-3 text-center">
              <p className="text-xs text-green-600 font-medium m-0">Graded</p>
              <p className="text-xl font-bold text-green-700 m-0">{gradeSummary.graded}</p>
            </div>
            <div className="bg-amber-50 rounded-xl p-3 text-center">
              <p className="text-xs text-amber-600 font-medium m-0">Pending</p>
              <p className="text-xl font-bold text-amber-700 m-0">{gradeSummary.pending}</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-3 text-center">
              <p className="text-xs text-emerald-600 font-medium m-0">Pass Rate</p>
              <p className="text-xl font-bold text-emerald-700 m-0">{gradeSummary.passRate ?? '-'}%</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-3 text-center">
              <p className="text-xs text-purple-600 font-medium m-0">Avg Marks</p>
              <p className="text-xl font-bold text-purple-700 m-0">{gradeSummary.averageMarks ?? '-'}</p>
            </div>
          </div>
          {gradeSummary.gradeDistribution && Object.keys(gradeSummary.gradeDistribution).length > 0 && (
            <div>
              <p className="text-sm font-medium text-slate-600 mb-2">Grade Distribution</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(gradeSummary.gradeDistribution).sort().map(([grade, count]) => (
                  <span key={grade} className="bg-slate-100 px-3 py-1 rounded-full text-sm font-medium text-slate-700">
                    {grade}: {count}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-5 flex items-center gap-3 max-sm:flex-col">
        <div className="flex-1 relative max-sm:w-full">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search student name, ID, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full py-2.5 pl-10 pr-4 border border-gray-200 rounded-lg text-[0.95rem] focus:outline-none focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="py-2.5 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-500"
        >
          <option value="name">Sort by Name</option>
          <option value="studentId">Sort by Student ID</option>
          <option value="totalMarks">Sort by Marks</option>
        </select>
      </div>

      {/* Students Table */}
      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-slate-400">Loading students...</div>
      ) : filteredStudents.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <AlertCircle size={48} className="mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-semibold text-slate-700 mb-1">No students found</h3>
          <p className="text-slate-500">No enrolled students in this offering.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">#</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Student</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Midterm</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Final</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Assignment</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Quiz</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Lab</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Total</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Grade</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((student, index) => (
                  <tr key={student.enrollmentId} className="border-b border-gray-100 hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 text-sm text-slate-500">{index + 1}</td>
                    <td className="py-3 px-4">
                      <p className="text-sm font-medium text-slate-800 m-0">{student.name}</p>
                      <p className="text-xs text-slate-400 m-0">{student.studentId} • {student.email}</p>
                    </td>
                    {editingId === student.enrollmentId ? (
                      <>
                        {['midtermMarks', 'finalMarks', 'assignmentMarks', 'quizMarks', 'labMarks', 'totalMarks'].map(field => (
                          <td key={field} className="py-3 px-2">
                            <input
                              type="number"
                              value={editMarks[field]}
                              onChange={(e) => setEditMarks({ ...editMarks, [field]: e.target.value })}
                              className={inputClass}
                              placeholder="-"
                              min="0"
                              max="100"
                            />
                          </td>
                        ))}
                      </>
                    ) : (
                      <>
                        <td className="py-3 px-4 text-center text-sm text-slate-600">{student.midtermMarks ?? '-'}</td>
                        <td className="py-3 px-4 text-center text-sm text-slate-600">{student.finalMarks ?? '-'}</td>
                        <td className="py-3 px-4 text-center text-sm text-slate-600">{student.assignmentMarks ?? '-'}</td>
                        <td className="py-3 px-4 text-center text-sm text-slate-600">{student.quizMarks ?? '-'}</td>
                        <td className="py-3 px-4 text-center text-sm text-slate-600">{student.labMarks ?? '-'}</td>
                        <td className="py-3 px-4 text-center text-sm font-semibold text-slate-800">{student.totalMarks ?? '-'}</td>
                      </>
                    )}
                    <td className="py-3 px-4 text-center">
                      {student.grade ? (
                        <span className={`text-sm font-bold px-2 py-0.5 rounded ${
                          ['A+', 'A', 'A-'].includes(student.grade) ? 'bg-green-100 text-green-700' :
                          ['B+', 'B', 'B-'].includes(student.grade) ? 'bg-blue-100 text-blue-700' :
                          ['C+', 'C', 'C-'].includes(student.grade) ? 'bg-amber-100 text-amber-700' :
                          student.grade === 'F' ? 'bg-red-100 text-red-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {student.grade}
                        </span>
                      ) : (
                        <span className="text-sm text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {offering?.resultsLocked ? (
                        <Lock size={14} className="text-slate-300 mx-auto" />
                      ) : editingId === student.enrollmentId ? (
                        <div className="flex items-center gap-1 justify-center">
                          <button
                            onClick={() => saveMarks(student.enrollmentId)}
                            disabled={saving}
                            className="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center hover:bg-green-100 cursor-pointer border-none transition-colors"
                          >
                            <Save size={14} />
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="w-8 h-8 rounded-lg bg-slate-50 text-slate-600 flex items-center justify-center hover:bg-slate-100 cursor-pointer border-none transition-colors"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 justify-center">
                          <button
                            onClick={() => startEditing(student)}
                            className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 cursor-pointer border-none transition-colors"
                            title="Edit Marks"
                          >
                            <Edit size={14} />
                          </button>
                          {student.totalMarks != null && !student.grade && (
                            <button
                              onClick={() => submitGrade(student.enrollmentId, null, true)}
                              className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center hover:bg-amber-100 cursor-pointer border-none transition-colors"
                              title="Auto-Grade"
                            >
                              <CheckCircle2 size={14} />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="py-3 px-5 bg-slate-50 text-sm text-slate-500">
            Showing {filteredStudents.length} of {students.length} students
          </div>
        </div>
      )}
    </div>
  );
};

export default EnrolledStudents;
