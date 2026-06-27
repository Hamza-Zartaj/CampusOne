import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, RefreshCw, Sparkles, Eye, EyeOff } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { markComponentAPI } from '../../../utils/api';

const KIND_LABEL = {
  ASSIGNMENT: 'Assign', QUIZ: 'Quiz', MID: 'Mid', FINAL: 'Final',
  PROJECT_PRESENTATION: 'Proj/Pres', PARTICIPATION: 'Part.', LAB_WORK: 'Lab',
};

const cellKey = (enrollmentId, kind, index) => `${enrollmentId}|${kind}|${index}`;

const MarksUpload = () => {
  const { offeringId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [edits, setEdits] = useState({});
  const [initing, setIniting] = useState(false);
  const [releaseLoading, setReleaseLoading] = useState({});

  const toggleRelease = async (kind, released) => {
    setReleaseLoading((p) => ({ ...p, [kind]: true }));
    try {
      await markComponentAPI.setReleased(data.course.id, kind, released);
      setData((prev) => ({
        ...prev,
        course: {
          ...prev.course,
          gradeComponents: prev.course.gradeComponents.map((c) =>
            c.kind === kind ? { ...c, marksReleased: released } : c,
          ),
        },
      }));
      toast.success(released ? 'Released for this course' : 'Hidden for this course');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setReleaseLoading((p) => { const { [kind]: _, ...rest } = p; return rest; });
    }
  };

  useEffect(() => { load(); }, [offeringId]);

  const load = async () => {
    try {
      setLoading(true);
      const r = await markComponentAPI.listForOffering(offeringId);
      setData(r.data.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  const init = async () => {
    setIniting(true);
    try {
      const r = await markComponentAPI.init(offeringId);
      toast.success(`Initialized ${r.data.created} mark cells`);
      await load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setIniting(false);
    }
  };

  // Build column definitions from gradeComponents (kind × index expanded)
  const columns = useMemo(() => {
    if (!data) return [];
    const cols = [];
    const components = data.course.gradeComponents.slice().sort((a, b) => a.orderIndex - b.orderIndex);
    for (const cmp of components) {
      for (let i = 1; i <= cmp.count; i++) {
        cols.push({
          kind: cmp.kind,
          index: i,
          label: cmp.count > 1 ? `${KIND_LABEL[cmp.kind] || cmp.kind} ${i}` : (KIND_LABEL[cmp.kind] || cmp.kind),
          totalPerInstance: cmp.totalPerInstance,
        });
      }
    }
    return cols;
  }, [data]);

  // Look up MarkComponent record per (enrollment, kind, index)
  const findCell = (enrollment, kind, index) =>
    enrollment.markComponents?.find((m) => m.kind === kind && m.index === index);

  const setEdit = (markId, value) => {
    setEdits((prev) => ({ ...prev, [markId]: value }));
  };

  const saveCell = async (markId) => {
    const value = edits[markId];
    if (value === undefined) return;
    setSaving((prev) => ({ ...prev, [markId]: true }));
    try {
      const payload = { obtainedMarks: value === '' ? null : Number(value) };
      await markComponentAPI.update(markId, payload);
      // Update local data
      setData((prev) => ({
        ...prev,
        enrollments: prev.enrollments.map((e) => ({
          ...e,
          markComponents: e.markComponents.map((m) => m.id === markId ? { ...m, obtainedMarks: payload.obtainedMarks } : m),
        })),
      }));
      setEdits((prev) => { const { [markId]: _, ...rest } = prev; return rest; });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSaving((prev) => { const { [markId]: _, ...rest } = prev; return rest; });
    }
  };

  if (loading) return <div className="p-12 text-center text-slate-400">Loading…</div>;
  if (!data) return <div className="p-12 text-center text-slate-400">No data</div>;

  const allEnrollmentsHaveCells = data.enrollments.every((e) =>
    e.markComponents.length === columns.length,
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mb-3">
        <ArrowLeft size={14} />Back
      </button>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">
            <span className="font-mono text-blue-700">{data.course.code}</span> — {data.course.title}
          </h1>
          <p className="text-sm text-slate-500">Sec {data.section} · {data.term?.code}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="inline-flex items-center gap-1.5 py-2 px-3 rounded-lg text-sm border border-gray-200 bg-white text-slate-600 hover:bg-slate-50">
            <RefreshCw size={14} />Reload
          </button>
          <button onClick={init} disabled={initing} title="Create missing mark cells (idempotent — safe to run after editing components)"
            className="inline-flex items-center gap-1.5 py-2 px-3 rounded-lg text-sm border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50">
            <Sparkles size={14} />{initing ? 'Initializing…' : (allEnrollmentsHaveCells ? 'Re-init cells' : 'Initialize cells')}
          </button>
        </div>
      </div>

      {/* Release toggles per component kind */}
      {data.course?.gradeComponents?.length > 0 && (
        <div className="bg-white rounded-xl border p-4 mb-5">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Marks visibility to students
          </div>
          <div className="flex flex-wrap gap-2">
            {data.course.gradeComponents.slice().sort((a, b) => a.orderIndex - b.orderIndex).map((cmp) => (
              <button
                key={cmp.kind}
                onClick={() => toggleRelease(cmp.kind, !cmp.marksReleased)}
                disabled={releaseLoading[cmp.kind]}
                className={`inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium border transition-colors ${
                  cmp.marksReleased
                    ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                    : 'border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100'
                } disabled:opacity-50`}
                title={cmp.marksReleased ? 'Visible to students — click to hide' : 'Hidden — click to release'}
              >
                {cmp.marksReleased ? <Eye size={12} /> : <EyeOff size={12} />}
                {cmp.label} ({cmp.weightPercent}%)
              </button>
            ))}
          </div>
          <p className="text-[11px] text-slate-400 mt-2">
            These toggles are course-wide and apply to every offering of {data.course.code}. Hidden components show as &quot;—&quot; on the student portal until released.
          </p>
        </div>
      )}

      {data.enrollments.length === 0 ? (
        <div className="text-center py-12 text-slate-400 bg-white rounded-xl border">No enrolled students.</div>
      ) : columns.length === 0 ? (
        <div className="text-center py-12 text-slate-400 bg-white rounded-xl border">
          This course has no grade components configured. Ask admin to set them in Course Management.
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left px-3 py-2 font-semibold text-slate-600 sticky left-0 bg-slate-50 z-10 border-r border-slate-200">Student</th>
                {columns.map((c) => (
                  <th key={`${c.kind}-${c.index}`} className="text-center px-2 py-2 font-semibold text-xs">
                    <div className="text-slate-700">{c.label}</div>
                    <div className="text-[10px] text-slate-400 font-normal">/{c.totalPerInstance}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.enrollments.map((enr) => (
                <tr key={enr.id} className="hover:bg-slate-50">
                  <td className="px-3 py-2 sticky left-0 bg-white z-10 border-r border-slate-100">
                    <div className="font-medium text-slate-800">{enr.student.user.name}</div>
                    <div className="text-xs text-slate-500">{enr.student.studentId}</div>
                  </td>
                  {columns.map((c) => {
                    const cell = findCell(enr, c.kind, c.index);
                    if (!cell) {
                      return <td key={`${c.kind}-${c.index}`} className="px-2 py-2 text-center text-xs text-slate-300">—</td>;
                    }
                    const editing = edits[cell.id] !== undefined;
                    const displayValue = editing ? edits[cell.id] : (cell.obtainedMarks ?? '');
                    return (
                      <td key={cell.id} className="px-2 py-1.5 text-center">
                        <input
                          type="number"
                          step="0.5"
                          value={displayValue}
                          onChange={(e) => setEdit(cell.id, e.target.value)}
                          onBlur={() => editing && saveCell(cell.id)}
                          className={`w-16 py-1 px-1.5 text-center border rounded text-xs ${editing ? 'border-blue-300 bg-blue-50' : 'border-slate-200'} ${saving[cell.id] ? 'opacity-50' : ''}`}
                          placeholder="—"
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MarksUpload;
