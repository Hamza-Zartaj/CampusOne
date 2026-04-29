import React, { useState, useEffect } from 'react';
import { Award } from 'lucide-react';
import toast from 'react-hot-toast';
import { enrollmentAPI } from '../../../utils/api';

const GRADE_COLORS = { A_PLUS: 'text-green-700 bg-green-50', A: 'text-green-700 bg-green-50', A_MINUS: 'text-green-600 bg-green-50', B_PLUS: 'text-blue-700 bg-blue-50', B: 'text-blue-700 bg-blue-50', B_MINUS: 'text-blue-600 bg-blue-50', C_PLUS: 'text-yellow-700 bg-yellow-50', C: 'text-yellow-700 bg-yellow-50', C_MINUS: 'text-yellow-600 bg-yellow-50', D_PLUS: 'text-orange-700 bg-orange-50', D: 'text-orange-700 bg-orange-50', F: 'text-red-700 bg-red-50', I: 'text-gray-600 bg-gray-100', W: 'text-gray-600 bg-gray-100' };
const gradeLabel = (g) => g?.replace(/_PLUS$/, '+').replace(/_MINUS$/, '-') || '—';

const MyGrades = () => {
  const [transcript, setTranscript] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user?.roleData?.id) load(user.roleData.id);
  }, []);

  const load = async (studentId) => {
    try {
      setLoading(true);
      const res = await enrollmentAPI.getTranscript(studentId);
      setTranscript(res.data.data);
    } catch {
      toast.error('Failed to load grades');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-slate-400">Loading…</div>;
  if (!transcript) return <div className="text-center py-12 text-slate-400">No grade data found.</div>;

  const { student, terms, cgpa, completedCredits, totalRequiredCredits } = transcript;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Award size={24} className="text-blue-600" />
        <div>
          <h1 className="text-xl font-semibold text-slate-800">My Grades</h1>
          <p className="text-sm text-slate-500">{student?.program?.programCode} — {student?.program?.name}</p>
        </div>
        <div className="ml-auto text-right">
          <div className="text-2xl font-bold text-blue-700">{cgpa ?? '—'}</div>
          <div className="text-xs text-slate-500">CGPA</div>
        </div>
      </div>

      <div className="flex gap-4 mb-6">
        <div className="bg-white border rounded-xl px-5 py-3 text-center flex-1">
          <div className="text-xl font-bold text-slate-800">{completedCredits}</div>
          <div className="text-xs text-slate-500">Credits Completed</div>
        </div>
        <div className="bg-white border rounded-xl px-5 py-3 text-center flex-1">
          <div className="text-xl font-bold text-slate-800">{totalRequiredCredits}</div>
          <div className="text-xs text-slate-500">Credits Required</div>
        </div>
        <div className="bg-white border rounded-xl px-5 py-3 text-center flex-1">
          <div className="text-xl font-bold text-slate-800">{Math.round((completedCredits / totalRequiredCredits) * 100)}%</div>
          <div className="text-xs text-slate-500">Progress</div>
        </div>
      </div>

      {terms.length === 0 ? (
        <div className="text-center py-8 text-slate-400">No completed courses yet.</div>
      ) : (
        <div className="space-y-6">
          {terms.map((t) => (
            <div key={t.term.code} className="bg-white rounded-xl border overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-b">
                <div>
                  <span className="font-semibold text-slate-800">{t.term.code}</span>
                  <span className="ml-2 text-sm text-slate-500">{t.term.academicYear}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-semibold text-blue-700">GPA {t.termGPA ?? '—'}</span>
                  <span className="text-xs text-slate-500 ml-2">· {t.termCredits} cr</span>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    <th className="text-left py-2.5 px-5 font-medium text-slate-600">Course</th>
                    <th className="text-center py-2.5 px-4 font-medium text-slate-600">Credits</th>
                    <th className="text-center py-2.5 px-4 font-medium text-slate-600">Marks</th>
                    <th className="text-center py-2.5 px-4 font-medium text-slate-600">Grade</th>
                    <th className="text-center py-2.5 px-4 font-medium text-slate-600">Points</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {t.courses.map((c, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-3 px-5">
                        <span className="font-mono text-xs text-blue-700 mr-2">{c.code}</span>
                        <span className="text-slate-700">{c.title}</span>
                      </td>
                      <td className="py-3 px-4 text-center text-slate-600">{c.creditHours}</td>
                      <td className="py-3 px-4 text-center text-slate-600">{c.totalMarks ?? '—'}</td>
                      <td className="py-3 px-4 text-center">
                        {c.gradeLetter ? (
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${GRADE_COLORS[c.gradeLetter] || 'bg-slate-100 text-slate-600'}`}>{gradeLabel(c.gradeLetter)}</span>
                        ) : '—'}
                      </td>
                      <td className="py-3 px-4 text-center text-slate-600">{c.gradePoints ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyGrades;
