import React, { useState, useEffect } from 'react';
import { FileText, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { studentAPI } from '../../../utils/api';

const gradeLabel = (g) => g?.replace(/_PLUS$/, '+').replace(/_MINUS$/, '-') || '—';
const GRADE_COLORS = { A_PLUS: 'text-green-700', A: 'text-green-700', A_MINUS: 'text-green-600', B_PLUS: 'text-blue-700', B: 'text-blue-700', B_MINUS: 'text-blue-600', C_PLUS: 'text-yellow-700', C: 'text-yellow-700', C_MINUS: 'text-yellow-600', D_PLUS: 'text-orange-700', D: 'text-orange-700', F: 'text-red-700', I: 'text-gray-600', W: 'text-gray-600' };

const Transcript = () => {
  const [transcript, setTranscript] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const res = await studentAPI.myTranscript();
      setTranscript(res.data.data);
    } catch {
      toast.error('Failed to load transcript');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-slate-400">Loading…</div>;
  if (!transcript) return <div className="text-center py-12 text-slate-400">No transcript data found.</div>;

  const { student, terms, cgpa, completedCredits, totalRequiredCredits } = transcript;

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="bg-white rounded-xl border overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-600 text-white px-8 py-6">
          <h1 className="text-2xl font-bold tracking-wide">Official Transcript</h1>
          <p className="text-blue-200 text-sm mt-1">CampusOne University</p>
        </div>

        {/* Student info */}
        <div className="px-8 py-5 border-b grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-slate-500">Name</span><p className="font-semibold text-slate-800">{student?.user?.name}</p></div>
          <div><span className="text-slate-500">Email</span><p className="font-semibold text-slate-800">{student?.user?.email}</p></div>
          <div><span className="text-slate-500">Program</span><p className="font-semibold text-slate-800">{student?.program?.name} ({student?.program?.programCode})</p></div>
          <div><span className="text-slate-500">Department</span><p className="font-semibold text-slate-800">{student?.department?.name}</p></div>
          <div><span className="text-slate-500">CGPA</span><p className="text-xl font-bold text-blue-700">{cgpa ?? '—'} / 4.00</p></div>
          <div><span className="text-slate-500">Credits</span><p className="font-semibold text-slate-800">{completedCredits} / {totalRequiredCredits} completed</p></div>
        </div>

        {/* Per-term tables */}
        {terms.length === 0 ? (
          <div className="text-center py-8 text-slate-400">No completed courses yet.</div>
        ) : (
          <div className="px-8 py-5 space-y-6">
            {terms.map((t) => (
              <div key={t.term.code}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-slate-800 text-sm">{t.term.code} — {t.term.academicYear}</h3>
                  <span className="text-sm text-slate-600">GPA: <span className="font-bold text-blue-700">{t.termGPA ?? '—'}</span> · {t.termCredits} credits</span>
                </div>
                <table className="w-full text-xs border rounded-lg overflow-hidden">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left py-2 px-3 font-medium text-slate-600">Course Code</th>
                      <th className="text-left py-2 px-3 font-medium text-slate-600">Course Title</th>
                      <th className="text-center py-2 px-3 font-medium text-slate-600">Cr Hr</th>
                      <th className="text-center py-2 px-3 font-medium text-slate-600">Grade</th>
                      <th className="text-center py-2 px-3 font-medium text-slate-600">Pts</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {t.courses.map((c, i) => (
                      <tr key={i}>
                        <td className="py-2 px-3 font-mono font-semibold text-blue-700">{c.code}</td>
                        <td className="py-2 px-3 text-slate-700">{c.title}</td>
                        <td className="py-2 px-3 text-center">{c.creditHours}</td>
                        <td className={`py-2 px-3 text-center font-bold ${GRADE_COLORS[c.gradeLetter] || 'text-slate-600'}`}>{gradeLabel(c.gradeLetter)}</td>
                        <td className="py-2 px-3 text-center text-slate-600">{c.gradePoints ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        )}

        <div className="px-8 py-4 bg-slate-50 border-t text-xs text-slate-400 text-center">
          Generated from CampusOne — {new Date().toLocaleDateString()}
        </div>
      </div>
    </div>
  );
};

export default Transcript;
