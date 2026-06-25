import React, { useState, useEffect, useMemo } from 'react';
import { ClipboardList, Plus, Trash2, ArrowRightLeft, X, Upload, Download, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { enrollmentAPI, offeringAPI, termAPI, userAPI } from '../../../utils/api';

const inputClass = 'w-full py-2.5 px-3.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10';
const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5';
const btnPrimary = 'inline-flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50';
const btnSecondary = 'inline-flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium border border-gray-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors';

const STATUS_COLORS = { ENROLLED: 'bg-green-50 text-green-700', DROPPED: 'bg-red-50 text-red-600', COMPLETED: 'bg-blue-50 text-blue-700', FAILED: 'bg-red-100 text-red-800', WITHDRAWN: 'bg-gray-100 text-gray-600', INCOMPLETE: 'bg-yellow-50 text-yellow-700' };

const EnrollmentManagement = () => {
  const [enrollments, setEnrollments] = useState([]);
  const [offerings, setOfferings] = useState([]);
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ studentSearch: '', studentId: '', offeringId: '' });
  const [studentResults, setStudentResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterOffering, setFilterOffering] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const [transferTarget, setTransferTarget] = useState(null);
  const [transferOfferingId, setTransferOfferingId] = useState('');
  const [transferring, setTransferring] = useState(false);
  const [showBulk, setShowBulk] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkUploading, setBulkUploading] = useState(false);
  const [bulkResult, setBulkResult] = useState(null);

  useEffect(() => { loadMeta(); }, []);
  useEffect(() => { if (filterOffering) loadEnrollments(); }, [filterOffering]);

  const loadMeta = async () => {
    try {
      const [termRes] = await Promise.all([termAPI.getAll()]);
      setTerms(termRes.data.data || []);
      const active = (termRes.data.data || []).find((t) => t.isActive);
      if (active) { setFilterTerm(active.id); loadOfferingsByTerm(active.id); }
    } catch {
      toast.error('Failed to load metadata');
    }
  };

  const loadOfferingsByTerm = async (termId) => {
    try {
      const res = await offeringAPI.getAll({ termId });
      setOfferings(res.data.data || []);
    } catch {}
  };

  const loadEnrollments = async () => {
    try {
      setLoading(true);
      const res = await enrollmentAPI.getAll({ offeringId: filterOffering });
      setEnrollments(res.data.data || []);
    } catch {
      toast.error('Failed to load enrollments');
    } finally {
      setLoading(false);
    }
  };

  const handleTermChange = (termId) => {
    setFilterTerm(termId);
    setFilterOffering('');
    setEnrollments([]);
    if (termId) loadOfferingsByTerm(termId);
  };

  const searchStudents = async (q) => {
    setForm((f) => ({ ...f, studentSearch: q, studentId: '' }));
    if (!q.trim()) { setStudentResults([]); return; }
    try {
      setSearching(true);
      const res = await userAPI.searchStudents(q);
      setStudentResults(res.data.data || res.data.students || []);
    } catch {} finally {
      setSearching(false);
    }
  };

  const handleEnroll = async (e) => {
    e.preventDefault();
    if (!form.studentId || !form.offeringId) return toast.error('Select a student and offering');
    try {
      setSaving(true);
      await enrollmentAPI.enroll({ studentId: form.studentId, offeringId: form.offeringId });
      toast.success('Student enrolled');
      setShowForm(false);
      setForm({ studentSearch: '', studentId: '', offeringId: filterOffering });
      setStudentResults([]);
      if (filterOffering) loadEnrollments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to enroll');
    } finally {
      setSaving(false);
    }
  };

  const openTransfer = (enrollment) => {
    setTransferTarget(enrollment);
    setTransferOfferingId('');
  };

  const handleTransfer = async () => {
    if (!transferTarget || !transferOfferingId) return toast.error('Select a target section');
    try {
      setTransferring(true);
      await enrollmentAPI.transferSection(transferTarget.id, transferOfferingId);
      toast.success('Section transferred');
      setTransferTarget(null);
      setTransferOfferingId('');
      loadEnrollments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to transfer');
    } finally {
      setTransferring(false);
    }
  };

  // Sections of same course in same term, excluding current
  const sectionOptions = transferTarget
    ? offerings.filter(
        (o) =>
          o.courseId === transferTarget.offering?.course?.id ||
          o.course?.code === transferTarget.offering?.course?.code
      ).filter((o) => o.id !== transferTarget.offeringId)
    : [];

  const downloadBulkTemplate = async () => {
    try {
      const res = await enrollmentAPI.bulkImportTemplate();
      const url = window.URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'enrollment_bulk_template.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download template');
    }
  };

  const handleBulkImport = async (e) => {
    e.preventDefault();
    if (!filterOffering) return toast.error('Pick an offering first');
    if (!bulkFile) return toast.error('Select an Excel file');
    setBulkUploading(true);
    setBulkResult(null);
    try {
      const r = await enrollmentAPI.bulkImport(filterOffering, bulkFile);
      setBulkResult(r.data);
      toast.success(`${r.data.enrolled} enrolled, ${r.data.skipped} skipped, ${r.data.errors?.length || 0} errors`);
      loadEnrollments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setBulkUploading(false);
    }
  };

  const currentOffering = useMemo(
    () => offerings.find((o) => o.id === filterOffering),
    [offerings, filterOffering],
  );
  const capacityRatio = currentOffering
    ? (currentOffering._count?.enrollments ?? enrollments.length) / (currentOffering.capacity || 1)
    : 0;
  const overCapacity = capacityRatio > 1;
  const nearCapacity = capacityRatio >= 0.9 && !overCapacity;

  const handleDrop = async (enrollment) => {
    if (!confirm(`Drop ${enrollment.student?.user?.name} from this course?`)) return;
    try {
      await enrollmentAPI.drop(enrollment.id);
      toast.success('Enrollment dropped');
      loadEnrollments();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ClipboardList size={24} className="text-blue-600" />
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Enrollment Management</h1>
            <p className="text-sm text-slate-500">Enroll and drop students from course offerings</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={downloadBulkTemplate} className={btnSecondary}>
            <Download size={14} />Template
          </button>
          <button
            onClick={() => { setShowBulk(true); setBulkFile(null); setBulkResult(null); }}
            disabled={!filterOffering}
            className={btnSecondary + ' disabled:opacity-50'}
          >
            <Upload size={14} />Bulk Import
          </button>
          <button onClick={() => { setShowForm(true); setForm({ studentSearch: '', studentId: '', offeringId: filterOffering }); }} className={btnPrimary}><Plus size={16} />Enroll Student</button>
        </div>
      </div>

      <div className="flex gap-3 mb-5 items-center">
        <select className="py-2 px-3 border border-gray-200 rounded-lg text-sm" value={filterTerm} onChange={(e) => handleTermChange(e.target.value)}>
          <option value="">Select Term</option>
          {terms.map((t) => <option key={t.id} value={t.id}>{t.code} {t.isActive ? '(active)' : ''}</option>)}
        </select>
        <select className="py-2 px-3 border border-gray-200 rounded-lg text-sm flex-1" value={filterOffering} onChange={(e) => setFilterOffering(e.target.value)} disabled={!filterTerm}>
          <option value="">Select Offering</option>
          {offerings.map((o) => {
            const filled = o._count?.enrollments ?? 0;
            const ratio = filled / (o.capacity || 1);
            const tag = ratio > 1 ? ' ⚠ OVER' : ratio >= 0.9 ? ' ⚠' : '';
            return <option key={o.id} value={o.id}>{o.course?.code} – {o.course?.title} (Sec {o.section}) [{filled}/{o.capacity}{tag}]</option>;
          })}
        </select>
        {currentOffering && (
          <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
            overCapacity ? 'bg-red-50 text-red-700 border-red-200' :
            nearCapacity ? 'bg-amber-50 text-amber-700 border-amber-200' :
                           'bg-green-50 text-green-700 border-green-200'
          }`}>
            {(overCapacity || nearCapacity) && <AlertTriangle size={12} />}
            {(currentOffering._count?.enrollments ?? enrollments.length)} / {currentOffering.capacity}
          </span>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-modal p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="font-semibold text-slate-800">Enroll Student</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
            </div>
            <form onSubmit={handleEnroll} className="p-6 space-y-4">
              <div>
                <label className={labelClass}>Search Student *</label>
                <div className="relative">
                  <input className={inputClass} value={form.studentSearch} onChange={(e) => searchStudents(e.target.value)} placeholder="Name or student ID…" />
                  {searching && <span className="absolute right-3 top-2.5 text-slate-400 text-xs">…</span>}
                </div>
                {studentResults.length > 0 && (
                  <div className="border border-gray-200 rounded-lg mt-1 max-h-40 overflow-y-auto bg-white shadow-sm">
                    {studentResults.map((s) => (
                      <button key={s.id} type="button" onClick={() => { setForm((f) => ({ ...f, studentId: s.studentId || s.id, studentSearch: s.user?.name || s.name })); setStudentResults([]); }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 text-sm">
                        <span className="font-medium">{s.user?.name || s.name}</span>
                        <span className="text-slate-400 ml-2 text-xs">{s.studentId}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className={labelClass}>Offering *</label>
                <select className={inputClass} value={form.offeringId} onChange={(e) => setForm((f) => ({ ...f, offeringId: e.target.value }))} required>
                  <option value="">Select offering…</option>
                  {offerings.map((o) => <option key={o.id} value={o.id}>{o.course?.code} – {o.course?.title} (Sec {o.section})</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className={btnSecondary}>Cancel</button>
                <button type="submit" disabled={saving || !form.studentId} className={btnPrimary}>{saving ? 'Enrolling…' : 'Enroll'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBulk && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-modal p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="font-semibold text-slate-800">Bulk Import Enrollments</h2>
              <button onClick={() => setShowBulk(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <form onSubmit={handleBulkImport} className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600 space-y-1">
                <p className="m-0">Upload an .xlsx file with a <code className="font-mono">studentId</code> column (e.g. <code className="font-mono">CS-2023-001</code>).</p>
                <p className="m-0">Target offering: <b>{currentOffering?.course?.code} — Sec {currentOffering?.section}</b></p>
                <p className="m-0">Available capacity: <b>{(currentOffering?.capacity || 0) - (currentOffering?._count?.enrollments ?? enrollments.length)}</b> seats</p>
              </div>
              <div>
                <label className={labelClass}>Excel File *</label>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setBulkFile(e.target.files[0])}
                  className="w-full text-sm"
                  required
                />
              </div>
              {bulkResult && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs space-y-1">
                  <div className="flex justify-between"><span>Total rows</span><b>{bulkResult.total}</b></div>
                  <div className="flex justify-between text-green-700"><span>Enrolled</span><b>{bulkResult.enrolled}</b></div>
                  <div className="flex justify-between text-amber-700"><span>Already enrolled (skipped)</span><b>{bulkResult.skipped}</b></div>
                  <div className="flex justify-between text-red-700"><span>Errors</span><b>{bulkResult.errors?.length || 0}</b></div>
                  {bulkResult.errors?.length > 0 && (
                    <ul className="mt-1 max-h-32 overflow-y-auto border-t border-slate-200 pt-1">
                      {bulkResult.errors.map((er, i) => (
                        <li key={i} className="text-red-600">{er.studentId}: {er.reason}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowBulk(false)} className={btnSecondary}>Close</button>
                <button type="submit" disabled={bulkUploading || !bulkFile} className={btnPrimary}>
                  {bulkUploading ? 'Importing…' : 'Import'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {transferTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-modal p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="font-semibold text-slate-800">Move to Another Section</h2>
              <button onClick={() => setTransferTarget(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-slate-50 rounded-lg p-3 text-sm">
                <p className="m-0"><b>{transferTarget.student?.user?.name}</b> ({transferTarget.student?.studentId})</p>
                <p className="m-0 text-xs text-slate-600 mt-1">
                  Currently in: {transferTarget.offering?.course?.code} — Sec {transferTarget.offering?.section}
                </p>
              </div>
              <div>
                <label className={labelClass}>Target Section</label>
                <select
                  className={inputClass}
                  value={transferOfferingId}
                  onChange={(e) => setTransferOfferingId(e.target.value)}
                >
                  <option value="">Select another section…</option>
                  {sectionOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      Sec {o.section} — {o.teacher?.user?.name || 'Unassigned'}
                    </option>
                  ))}
                </select>
                {sectionOptions.length === 0 && (
                  <p className="text-xs text-slate-400 mt-1">No other sections of this course in this term.</p>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setTransferTarget(null)} className={btnSecondary}>Cancel</button>
                <button
                  onClick={handleTransfer}
                  disabled={transferring || !transferOfferingId}
                  className={btnPrimary}
                >
                  {transferring ? 'Moving…' : 'Move'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!filterOffering ? (
        <div className="text-center py-12 text-slate-400">Select a term and offering to view enrollments.</div>
      ) : loading ? (
        <div className="text-center py-12 text-slate-400">Loading…</div>
      ) : enrollments.length === 0 ? (
        <div className="text-center py-12 text-slate-400">No enrollments for this offering.</div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b text-sm text-slate-600">{enrollments.length} enrollment{enrollments.length !== 1 ? 's' : ''}</div>
          <table className="w-full text-sm">
            <thead className="border-b">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Student</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Student ID</th>
                <th className="text-center py-3 px-4 font-medium text-slate-600">Status</th>
                <th className="text-center py-3 px-4 font-medium text-slate-600">Grade</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {enrollments.map((e) => (
                <tr key={e.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-medium text-slate-800">{e.student?.user?.name}</td>
                  <td className="py-3 px-4 font-mono text-xs text-slate-600">{e.student?.studentId}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[e.status] || 'bg-slate-100 text-slate-600'}`}>{e.status}</span>
                  </td>
                  <td className="py-3 px-4 text-center text-slate-600 font-medium">{e.gradeLetter || '—'}</td>
                  <td className="py-3 px-4 text-right">
                    {e.status === 'ENROLLED' && (
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          onClick={() => openTransfer(e)}
                          title="Move to another section"
                          className="p-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50"
                        ><ArrowRightLeft size={13} /></button>
                        <button onClick={() => handleDrop(e)} className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50"><Trash2 size={13} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default EnrollmentManagement;
