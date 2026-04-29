import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, CheckCircle, AlertCircle } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { offeringAPI, enrollmentAPI } from '../../../utils/api';

const GRADE_COLORS = {
  A_PLUS: 'text-green-700', A: 'text-green-700', A_MINUS: 'text-green-600',
  B_PLUS: 'text-blue-700', B: 'text-blue-700', B_MINUS: 'text-blue-600',
  C_PLUS: 'text-yellow-700', C: 'text-yellow-700', C_MINUS: 'text-yellow-600',
  D_PLUS: 'text-orange-700', D: 'text-orange-700',
  F: 'text-red-700',
};

const gradeLabel = (g) => g?.replace(/_PLUS$/, '+').replace(/_MINUS$/, '-') || '—';

function calcGrade(total) {
  if (total == null || total === '') return null;
  const t = Number(total);
  if (isNaN(t)) return null;
  if (t >= 90) return 'A_PLUS';
  if (t >= 85) return 'A';
  if (t >= 80) return 'A_MINUS';
  if (t >= 75) return 'B_PLUS';
  if (t >= 70) return 'B';
  if (t >= 65) return 'B_MINUS';
  if (t >= 60) return 'C_PLUS';
  if (t >= 55) return 'C';
  if (t >= 50) return 'C_MINUS';
  if (t >= 45) return 'D_PLUS';
  if (t >= 40) return 'D';
  return 'F';
}

const GRADE_POINTS = {
  A_PLUS: 4.0, A: 4.0, A_MINUS: 3.67,
  B_PLUS: 3.33, B: 3.0, B_MINUS: 2.67,
  C_PLUS: 2.33, C: 2.0, C_MINUS: 1.67,
  D_PLUS: 1.33, D: 1.0, F: 0.0,
};

const MarksUpload = () => {
  const { offeringId } = useParams();
  const navigate = useNavigate();
  const [offering, setOffering] = useState(null);
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(null);
  const [bulkSaving, setBulkSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [offeringId]);

  const load = async () => {
    try {
      setLoading(true);
      const [offerRes, studentsRes] = await Promise.all([
        offeringAPI.getById(offeringId),
        offeringAPI.getStudents(offeringId),
      ]);
      setOffering(offerRes.data.data);
      const enrollments = studentsRes.data.data || [];
      setRows(
        enrollments.map((e) => ({
          id: e.id,
          name: e.student?.user?.name || '—',
          rollNo: e.student?.user?.username || '—',
          assignmentMarks: e.assignmentMarks ?? '',
          midMarks: e.midMarks ?? '',
          finalMarks: e.finalMarks ?? '',
          totalMarks: e.totalMarks ?? '',
          gradeLetter: e.gradeLetter || null,
          gradePoints: e.gradePoints ?? null,
          status: e.status,
          saved: true,
        }))
      );
    } catch {
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const updateRow = (i, field, value) => {
    setRows((prev) => {
      const next = [...prev];
      const row = { ...next[i], [field]: value, saved: false };
      const a = Number(row.assignmentMarks) || 0;
      const m = Number(row.midMarks) || 0;
      const f = Number(row.finalMarks) || 0;
      if (row.assignmentMarks !== '' || row.midMarks !== '' || row.finalMarks !== '') {
        const total = a + m + f;
        row.totalMarks = total;
        row.gradeLetter = calcGrade(total);
        row.gradePoints = row.gradeLetter ? (GRADE_POINTS[row.gradeLetter] ?? null) : null;
      }
      next[i] = row;
      return next;
    });
  };

  const saveRow = async (i) => {
    const row = rows[i];
    try {
      setSaving(i);
      await enrollmentAPI.updateGrade(row.id, {
        assignmentMarks: row.assignmentMarks !== '' ? Number(row.assignmentMarks) : null,
        midMarks: row.midMarks !== '' ? Number(row.midMarks) : null,
        finalMarks: row.finalMarks !== '' ? Number(row.finalMarks) : null,
      });
      setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, saved: true } : r));
      toast.success('Saved');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(null);
    }
  };

  const saveAll = async () => {
    const unsaved = rows.filter((r) => !r.saved);
    if (unsaved.length === 0) { toast('All marks already saved'); return; }
    try {
      setBulkSaving(true);
      const grades = unsaved.map((r) => ({
        enrollmentId: r.id,
        assignmentMarks: r.assignmentMarks !== '' ? Number(r.assignmentMarks) : null,
        midMarks: r.midMarks !== '' ? Number(r.midMarks) : null,
        finalMarks: r.finalMarks !== '' ? Number(r.finalMarks) : null,
      }));
      await enrollmentAPI.bulkGrade({ offeringId, grades });
      setRows((prev) => prev.map((r) => ({ ...r, saved: true })));
      toast.success(`Saved ${unsaved.length} students`);
    } catch {
      toast.error('Bulk save failed');
    } finally {
      setBulkSaving(false);
    }
  };

  const unsavedCount = rows.filter((r) => !r.saved).length;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/teacher/offerings')} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1 className="text-xl font-semibold text-slate-800">
            {offering ? `${offering.course?.code} — Sec ${offering.section}` : 'Marks Upload'}
          </h1>
          {offering && <p className="text-sm text-slate-500">{offering.course?.title} · {offering.term?.code}</p>}
        </div>
        {unsavedCount > 0 && (
          <span className="text-xs bg-amber-100 text-amber-700 border border-amber-200 px-2 py-1 rounded-lg">
            {unsavedCount} unsaved
          </span>
        )}
        <button
          onClick={saveAll}
          disabled={bulkSaving || unsavedCount === 0}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          <Save size={15} />{bulkSaving ? 'Saving…' : 'Save All'}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <AlertCircle size={36} className="mx-auto mb-3 text-slate-300" />
          No enrolled students found.
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-slate-600">#</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Student</th>
                <th className="text-center py-3 px-3 font-medium text-slate-600">Assignment<br /><span className="text-xs font-normal text-slate-400">/30</span></th>
                <th className="text-center py-3 px-3 font-medium text-slate-600">Mid<br /><span className="text-xs font-normal text-slate-400">/30</span></th>
                <th className="text-center py-3 px-3 font-medium text-slate-600">Final<br /><span className="text-xs font-normal text-slate-400">/40</span></th>
                <th className="text-center py-3 px-3 font-medium text-slate-600">Total<br /><span className="text-xs font-normal text-slate-400">/100</span></th>
                <th className="text-center py-3 px-3 font-medium text-slate-600">Grade</th>
                <th className="text-center py-3 px-3 font-medium text-slate-600">Pts</th>
                <th className="text-center py-3 px-3 font-medium text-slate-600">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row, i) => {
                const grade = row.gradeLetter || calcGrade(row.totalMarks);
                return (
                  <tr key={row.id} className={`hover:bg-slate-50 ${!row.saved ? 'bg-amber-50/40' : ''}`}>
                    <td className="py-2.5 px-4 text-slate-500">{i + 1}</td>
                    <td className="py-2.5 px-4">
                      <div className="font-medium text-slate-800">{row.name}</div>
                      <div className="text-xs text-slate-500 font-mono">{row.rollNo}</div>
                    </td>
                    {['assignmentMarks', 'midMarks', 'finalMarks'].map((field) => (
                      <td key={field} className="py-2.5 px-3 text-center">
                        <input
                          type="number"
                          min="0"
                          max={field === 'finalMarks' ? 40 : 30}
                          value={row[field]}
                          onChange={(e) => updateRow(i, field, e.target.value)}
                          className="w-16 text-center border border-gray-200 rounded px-1.5 py-1 text-sm focus:outline-none focus:border-blue-400"
                          placeholder="—"
                        />
                      </td>
                    ))}
                    <td className="py-2.5 px-3 text-center font-semibold text-slate-700">
                      {row.totalMarks !== '' && row.totalMarks != null ? Number(row.totalMarks).toFixed(1) : '—'}
                    </td>
                    <td className={`py-2.5 px-3 text-center font-bold ${GRADE_COLORS[grade] || 'text-slate-500'}`}>
                      {gradeLabel(grade)}
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-600 text-xs">
                      {grade ? (GRADE_POINTS[grade] ?? '—') : '—'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {row.saved ? (
                        <CheckCircle size={16} className="mx-auto text-green-500" />
                      ) : (
                        <button
                          onClick={() => saveRow(i)}
                          disabled={saving === i}
                          className="text-xs bg-blue-600 text-white px-2.5 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          {saving === i ? '…' : 'Save'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-slate-400 mt-3 text-center">
        Grading scale: A+ ≥90 · A ≥85 · A– ≥80 · B+ ≥75 · B ≥70 · B– ≥65 · C+ ≥60 · C ≥55 · C– ≥50 · D+ ≥45 · D ≥40 · F &lt;40
      </p>
    </div>
  );
};

export default MarksUpload;
