import React, { useState, useEffect, useCallback } from 'react';
import {
  FileText, Plus, Search, Calendar, Clock, Users,
  CheckCircle, AlertCircle, ChevronDown, ChevronUp,
  Edit3, Trash2, Eye, Download, X, Loader2, Award,
  Lock, LockOpen, ScanSearch, ShieldCheck, AlertTriangle,
} from 'lucide-react';
import { assignmentAPI, offeringAPI } from '../../utils/api';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  DRAFT:     { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  label: 'Draft' },
  PUBLISHED: { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   label: 'Published' },
  CLOSED:    { bg: 'bg-slate-50',  text: 'text-slate-700',  border: 'border-slate-200',  label: 'Closed' },
};

const SUB_STATUS = {
  SUBMITTED: { bg: 'bg-blue-50',  text: 'text-blue-700',  label: 'Submitted' },
  LATE:      { bg: 'bg-red-50',   text: 'text-red-700',   label: 'Late' },
  GRADED:    { bg: 'bg-green-50', text: 'text-green-700', label: 'Graded' },
};

const daysUntil = (dateStr) => {
  const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return <span className="text-red-500 font-medium">Overdue</span>;
  if (diff === 0) return <span className="text-amber-600 font-medium">Due today</span>;
  if (diff <= 3) return <span className="text-amber-600 font-medium">{diff}d left</span>;
  return <span className="text-slate-500">{diff}d left</span>;
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ─── Create / Edit Modal ──────────────────────────────────────────────────────
const AssignmentModal = ({ offerings, initial, onClose, onSave }) => {
  const [form, setForm] = useState({
    offeringId: initial?.offeringId ?? '',
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    totalMarks: initial?.totalMarks ?? 100,
    dueDate: initial?.dueDate ? new Date(initial.dueDate).toISOString().split('T')[0] : '',
    allowLate: initial?.allowLate ?? false,
    status: initial?.status ?? 'PUBLISHED',
  });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.offeringId || !form.title || !form.dueDate) {
      toast.error('Course, title, and due date are required');
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (file) fd.append('file', file);
      await onSave(fd);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-modal p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800 m-0">{initial ? 'Edit Assignment' : 'Create Assignment'}</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-[0.9rem] font-medium text-slate-800 mb-2">Course Offering</label>
              <select
                value={form.offeringId}
                onChange={(e) => set('offeringId', e.target.value)}
                required
                disabled={!!initial}
                className="w-full py-2.5 px-3.5 border border-gray-200 rounded-lg text-[0.95rem] focus:outline-none focus:border-blue-500 disabled:bg-slate-50"
              >
                <option value="">Select course…</option>
                {offerings.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.course?.code} — {o.course?.title} (Sec {o.section}) · {o.term?.code}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[0.9rem] font-medium text-slate-800 mb-2">Title</label>
              <input
                value={form.title} onChange={(e) => set('title', e.target.value)}
                required placeholder="Assignment title…"
                className="w-full py-2.5 px-3.5 border border-gray-200 rounded-lg text-[0.95rem] focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[0.9rem] font-medium text-slate-800 mb-2">Description / Instructions</label>
              <textarea
                rows={3} value={form.description} onChange={(e) => set('description', e.target.value)}
                placeholder="Enter instructions…"
                className="w-full py-2.5 px-3.5 border border-gray-200 rounded-lg text-[0.95rem] focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[0.9rem] font-medium text-slate-800 mb-2">Due Date</label>
                <input
                  type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} required
                  className="w-full py-2.5 px-3.5 border border-gray-200 rounded-lg text-[0.95rem] focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-[0.9rem] font-medium text-slate-800 mb-2">Total Marks</label>
                <input
                  type="number" value={form.totalMarks} onChange={(e) => set('totalMarks', e.target.value)}
                  min={1} max={1000}
                  className="w-full py-2.5 px-3.5 border border-gray-200 rounded-lg text-[0.95rem] focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[0.9rem] font-medium text-slate-800 mb-2">Status</label>
                <select
                  value={form.status} onChange={(e) => set('status', e.target.value)}
                  className="w-full py-2.5 px-3.5 border border-gray-200 rounded-lg text-[0.95rem] focus:outline-none focus:border-blue-500"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>
              <div className="flex flex-col justify-end pb-0.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.allowLate} onChange={(e) => set('allowLate', e.target.checked)} className="w-4 h-4 accent-blue-600" />
                  <span className="text-[0.9rem] font-medium text-slate-800">Allow late submissions</span>
                </label>
              </div>
            </div>
            <div>
              <label className="block text-[0.9rem] font-medium text-slate-800 mb-2">Attachment (optional)</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                onChange={(e) => setFile(e.target.files[0])}
                className="w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {initial?.attachmentUrl && !file && (
                <a href={initial.attachmentUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline mt-1 inline-block">
                  View current attachment
                </a>
              )}
            </div>
          </div>
          <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="py-2.5 px-5 border border-gray-200 rounded-lg text-[0.95rem] font-medium bg-white text-slate-800 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="py-2.5 px-5 border-none rounded-lg text-[0.95rem] font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 inline-flex items-center gap-2">
              {saving && <Loader2 size={16} className="animate-spin" />}
              {initial ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Submissions Panel ────────────────────────────────────────────────────────
const SimilarityResults = ({ report }) => {
  const [expanded, setExpanded] = useState(true);
  const summary = report.summary || {};
  const labels = {
    EXACT_FILE: 'Identical file',
    EXACT_TEXT: 'Identical text',
    HIGH_LEXICAL: 'High text overlap',
  };

  return (
    <div className="overflow-hidden rounded-xl border border-violet-200 bg-white">
      <button type="button" onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between gap-3 bg-violet-50 px-4 py-3 text-left">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-violet-600" />
          <div>
            <p className="m-0 text-sm font-semibold text-slate-800">Stage 1 similarity results</p>
            <p className="m-0 text-xs text-slate-500">
              {summary.flaggedPairs || 0} flagged of {summary.comparedPairs || 0} compared pairs
              {report.isStale ? ' · report is stale' : ''}
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
      </button>

      {expanded && (
        <div className="space-y-3 p-4">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ['Exact files', summary.exactFilePairs || 0],
              ['Exact text', summary.exactTextPairs || 0],
              ['High overlap', summary.lexicalPairs || 0],
              ['Unsupported', summary.unsupportedCount || 0],
            ].map(([label, value]) => (
              <div key={label} className="rounded-lg bg-slate-50 px-3 py-2">
                <p className="m-0 text-lg font-bold text-slate-800">{value}</p>
                <p className="m-0 text-[11px] text-slate-500">{label}</p>
              </div>
            ))}
          </div>
          {report.isStale && (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertTriangle size={14} /> Submissions changed after this scan. Run it again.
            </div>
          )}
          {report.matches?.length > 0 ? (
            <div className="space-y-2">
              {report.matches.map((match) => (
                <div key={match.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-medium text-slate-800">
                      {match.submissionA.student.user.name}
                      <span className="mx-2 text-slate-300">↔</span>
                      {match.submissionB.student.user.name}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700">{labels[match.matchType]}</span>
                      <span className="text-sm font-bold text-slate-700">{Math.round(match.combinedScore * 100)}%</span>
                    </div>
                  </div>
                  <p className="m-0 mt-1 text-xs text-slate-500">
                    {match.submissionA.student.studentId} · {match.submissionB.student.studentId}
                  </p>
                  {match.matchedPassages?.length > 0 && (
                    <p className="m-0 mt-2 rounded bg-slate-50 px-2 py-1.5 text-xs text-slate-600">
                      Shared phrase: “{match.matchedPassages[0]}”
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="m-0 rounded-lg bg-green-50 px-3 py-3 text-sm text-green-700">
              No exact duplicates or high lexical-overlap pairs were found.
            </p>
          )}
          <p className="m-0 text-[11px] text-slate-400">Local evidence only—this is not an automatic plagiarism verdict.</p>
        </div>
      )}
    </div>
  );
};

const SubmissionsPanel = ({ assignment, onClose, onAssignmentStatusChange }) => {
  const [currentAssignment, setCurrentAssignment] = useState(assignment);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gradingId, setGradingId] = useState(null);
  const [gradeForm, setGradeForm] = useState({});
  const [similarityReport, setSimilarityReport] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);

  useEffect(() => {
    Promise.all([
      assignmentAPI.getSubmissions(assignment.id),
      assignmentAPI.getLatestSimilarityReport(assignment.id),
    ])
      .then(([submissionsResponse, reportResponse]) => {
        setSubmissions(submissionsResponse.data.data);
        setSimilarityReport(reportResponse.data.data);
      })
      .catch(() => toast.error('Failed to load submissions'))
      .finally(() => setLoading(false));
  }, [assignment.id]);

  const runSimilarityScan = async () => {
    setScanning(true);
    try {
      const response = await assignmentAPI.runSimilarityScan(assignment.id);
      setSimilarityReport(response.data.data);
      toast.success('Stage 1 similarity scan completed');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Similarity scan failed');
    } finally {
      setScanning(false);
    }
  };

  const changeSubmissionStatus = async () => {
    const closing = currentAssignment.status !== 'CLOSED';
    if (closing && !window.confirm('Close submissions now? Students will no longer be able to submit or resubmit.')) return;

    setChangingStatus(true);
    try {
      const formData = new FormData();
      formData.append('status', closing ? 'CLOSED' : 'PUBLISHED');
      const response = await assignmentAPI.update(currentAssignment.id, formData);
      const updatedAssignment = response.data.data;
      setCurrentAssignment(updatedAssignment);
      onAssignmentStatusChange?.(updatedAssignment);
      toast.success(closing ? 'Submissions closed' : 'Submissions reopened');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update submission status');
    } finally {
      setChangingStatus(false);
    }
  };

  const saveGrade = async (subId) => {
    const { marks, feedback } = gradeForm[subId] || {};
    try {
      await assignmentAPI.gradeSubmission(subId, { obtainedMarks: marks, feedback });
      setSubmissions((prev) => prev.map((s) => s.id === subId ? { ...s, status: 'GRADED', obtainedMarks: +marks, feedback } : s));
      setGradingId(null);
      toast.success('Graded');
    } catch {
      toast.error('Grade save failed');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-modal p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-4 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800 m-0">{currentAssignment.title}</h2>
            <p className="text-sm text-slate-500 m-0">Submissions · {submissions.length} received</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={changeSubmissionStatus}
              disabled={changingStatus || scanning}
              className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                currentAssignment.status === 'CLOSED'
                  ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                  : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
              }`}
            >
              {changingStatus
                ? <Loader2 size={14} className="animate-spin" />
                : currentAssignment.status === 'CLOSED' ? <LockOpen size={14} /> : <Lock size={14} />}
              {currentAssignment.status === 'CLOSED' ? 'Reopen' : 'Close Submissions'}
            </button>
            <button
              onClick={runSimilarityScan}
              disabled={scanning || changingStatus || loading || submissions.length < 2 || currentAssignment.status !== 'CLOSED'}
              title={currentAssignment.status !== 'CLOSED' ? 'Close submissions before scanning' : 'Run local Stage 1 checks'}
              className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {scanning ? <Loader2 size={14} className="animate-spin" /> : <ScanSearch size={14} />}
              {scanning ? 'Scanning…' : similarityReport ? 'Scan Again' : 'Check Similarity'}
            </button>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"><X size={20} /></button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {currentAssignment.status !== 'CLOSED' && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <Lock size={17} className="mt-0.5 shrink-0" />
              <span>Close submissions here before running similarity checks.</span>
            </div>
          )}
          {similarityReport && <SimilarityResults report={similarityReport} />}
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400"><Loader2 size={24} className="animate-spin" /></div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No submissions yet</div>
          ) : submissions.map((sub) => {
            const sc = SUB_STATUS[sub.status];
            const isGrading = gradingId === sub.id;
            return (
              <div key={sub.id} className="bg-slate-50 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-800 m-0">{sub.student?.user?.name}</p>
                    <p className="text-xs text-slate-500 m-0">{sub.student?.studentId} · {fmtDate(sub.submittedAt)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${sc.bg} ${sc.text}`}>{sc.label}</span>
                    {sub.status === 'GRADED' && (
                      <span className="text-sm font-bold text-green-700">{sub.obtainedMarks}/{currentAssignment.totalMarks}</span>
                    )}
                  </div>
                </div>

                {sub.submissionText && <p className="text-sm text-slate-600 mb-2 line-clamp-2">{sub.submissionText}</p>}
                {sub.attachmentUrl && (
                  <a href={sub.attachmentUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mb-2">
                    <Download size={12} /> Download submission
                  </a>
                )}
                {sub.feedback && <p className="text-xs text-green-700 bg-green-50 rounded p-2 mb-2">{sub.feedback}</p>}

                {!isGrading ? (
                  <button
                    onClick={() => { setGradingId(sub.id); setGradeForm((f) => ({ ...f, [sub.id]: { marks: sub.obtainedMarks ?? '', feedback: sub.feedback ?? '' } })); }}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    {sub.status === 'GRADED' ? 'Edit grade' : 'Grade'}
                  </button>
                ) : (
                  <div className="flex items-end gap-2 mt-2">
                    <div>
                      <label className="text-xs text-slate-500 mb-1 block">Marks / {currentAssignment.totalMarks}</label>
                      <input
                        type="number" min={0} max={currentAssignment.totalMarks}
                        value={gradeForm[sub.id]?.marks ?? ''}
                        onChange={(e) => setGradeForm((f) => ({ ...f, [sub.id]: { ...f[sub.id], marks: e.target.value } }))}
                        className="w-24 py-1.5 px-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-slate-500 mb-1 block">Feedback (optional)</label>
                      <input
                        value={gradeForm[sub.id]?.feedback ?? ''}
                        onChange={(e) => setGradeForm((f) => ({ ...f, [sub.id]: { ...f[sub.id], feedback: e.target.value } }))}
                        placeholder="Add feedback…"
                        className="w-full py-1.5 px-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <button onClick={() => saveGrade(sub.id)} className="py-1.5 px-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Save</button>
                    <button onClick={() => setGradingId(null)} className="py-1.5 px-3 border border-gray-200 bg-white text-slate-700 rounded-lg text-sm hover:bg-slate-50">Cancel</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const TeacherAssignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [offerings, setOfferings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOffering, setFilterOffering] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [submissionsFor, setSubmissionsFor] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [changingStatusId, setChangingStatusId] = useState(null);

  const loadAssignments = useCallback(async () => {
    try {
      const params = filterOffering ? { offeringId: filterOffering } : {};
      const r = await assignmentAPI.getAll(params);
      setAssignments(r.data.data);
    } catch {
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  }, [filterOffering]);

  useEffect(() => {
    offeringAPI.getMy().then((r) => setOfferings(r.data.data)).catch(() => {});
  }, []);

  useEffect(() => { loadAssignments(); }, [loadAssignments]);

  const handleCreate = async (fd) => {
    await assignmentAPI.create(fd);
    toast.success('Assignment created');
    setShowModal(false);
    loadAssignments();
  };

  const handleUpdate = async (fd) => {
    await assignmentAPI.update(editTarget.id, fd);
    toast.success('Assignment updated');
    setEditTarget(null);
    loadAssignments();
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this assignment and all its submissions?')) return;
    setDeletingId(id);
    try {
      await assignmentAPI.delete(id);
      toast.success('Deleted');
      setAssignments((prev) => prev.filter((a) => a.id !== id));
    } catch {
      toast.error('Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmissionStatus = async (assignment) => {
    const closing = assignment.status !== 'CLOSED';
    if (closing && !window.confirm('Close submissions now? Students will no longer be able to submit or resubmit.')) return;

    setChangingStatusId(assignment.id);
    try {
      const formData = new FormData();
      formData.append('status', closing ? 'CLOSED' : 'PUBLISHED');
      await assignmentAPI.update(assignment.id, formData);
      toast.success(closing ? 'Submissions closed' : 'Submissions reopened');
      await loadAssignments();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update submission status');
    } finally {
      setChangingStatusId(null);
    }
  };

  const filtered = assignments.filter((a) => {
    if (filterStatus && a.status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return a.title.toLowerCase().includes(q) || a.offering?.course?.code?.toLowerCase().includes(q);
    }
    return true;
  });

  const activeCount = assignments.filter((a) => a.status === 'PUBLISHED').length;
  const closedCount = assignments.filter((a) => a.status === 'CLOSED').length;
  const totalSubs = assignments.reduce((s, a) => s + (a._count?.submissions ?? 0), 0);

  const stats = [
    { icon: FileText,   label: 'Total',      value: assignments.length, color: '#3b82f6' },
    { icon: Clock,      label: 'Published',  value: activeCount,        color: '#06b6d4' },
    { icon: CheckCircle,label: 'Closed',     value: closedCount,        color: '#10b981' },
    { icon: Users,      label: 'Submissions',value: totalSubs,          color: '#f59e0b' },
  ];

  return (
    <div className="max-w-350 mx-auto">
      <div className="flex items-center justify-between mb-6 max-sm:flex-col max-sm:items-start max-sm:gap-3">
        <div>
          <h1 className="text-[28px] font-bold text-slate-800 m-0 max-md:text-2xl">Assignments</h1>
          <p className="text-sm text-slate-500 m-0 mt-1">Create and manage course assignments</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 py-2.5 px-5 border-none rounded-lg text-[0.95rem] font-medium cursor-pointer transition-all bg-blue-600 text-white hover:bg-blue-700"
        >
          <Plus size={18} /> Create Assignment
        </button>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-5 mb-6 max-sm:grid-cols-2">
        {stats.map((s, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 flex items-center gap-3 shadow-sm">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${s.color}15`, color: s.color }}>
              <s.icon size={22} />
            </div>
            <div>
              <p className="text-xs text-slate-500 m-0 mb-0.5 font-medium">{s.label}</p>
              <h3 className="text-2xl font-bold text-slate-800 m-0">{s.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4 mb-5 flex items-center gap-3 max-sm:flex-col">
        <div className="flex-1 relative max-sm:w-full">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text" placeholder="Search assignments…"
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full py-2.5 pl-10 pr-4 border border-gray-200 rounded-lg text-[0.95rem] focus:outline-none focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/10"
          />
        </div>
        <select value={filterOffering} onChange={(e) => setFilterOffering(e.target.value)}
          className="py-2.5 px-3.5 border border-gray-200 rounded-lg text-[0.95rem] bg-white focus:outline-none focus:border-blue-500">
          <option value="">All Courses</option>
          {offerings.map((o) => (
            <option key={o.id} value={o.id}>{o.course?.code} Sec {o.section}</option>
          ))}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="py-2.5 px-3.5 border border-gray-200 rounded-lg text-[0.95rem] bg-white focus:outline-none focus:border-blue-500">
          <option value="">All Status</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 size={28} className="animate-spin" /></div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => {
            const expanded = expandedId === a.id;
            const sc = STATUS_CONFIG[a.status] ?? STATUS_CONFIG.PUBLISHED;
            const subCount = a._count?.submissions ?? 0;
            return (
              <div key={a.id} className="bg-white rounded-2xl shadow-sm overflow-hidden transition-all">
                <div
                  className="p-5 flex items-center gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors max-sm:flex-col max-sm:items-start"
                  onClick={() => setExpandedId(expanded ? null : a.id)}
                >
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
                    <FileText size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="text-[0.95rem] font-semibold text-slate-800 m-0 truncate">{a.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${sc.bg} ${sc.text} ${sc.border}`}>{sc.label}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>{a.offering?.course?.code} — {a.offering?.course?.title} (Sec {a.offering?.section})</span>
                      <span>&middot;</span>
                      <span className="flex items-center gap-1"><Calendar size={12} /> {fmtDate(a.dueDate)}</span>
                      <span>&middot;</span>
                      {daysUntil(a.dueDate)}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 max-sm:w-full max-sm:justify-between">
                    <div className="text-right">
                      <p className="text-xs text-slate-500 m-0">Submissions</p>
                      <p className="text-sm font-semibold text-slate-700 m-0">{subCount}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-slate-500 m-0">Marks</p>
                      <p className="text-sm font-semibold text-slate-700 m-0">{a.totalMarks}</p>
                    </div>
                    {expanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                  </div>
                </div>

                {expanded && (
                  <div className="px-5 pb-5 border-t border-slate-100 pt-4">
                    {a.description && <p className="text-sm text-slate-600 mb-4">{a.description}</p>}
                    {a.attachmentUrl && (
                      <a href={a.attachmentUrl} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1.5 py-1.5 px-3 border border-gray-200 rounded-lg text-sm bg-white text-slate-700 hover:bg-slate-50 mb-4">
                        <Download size={14} /> Download instruction file
                      </a>
                    )}
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => setSubmissionsFor(a)}
                        className="inline-flex items-center gap-1.5 py-2 px-4 border border-gray-200 rounded-lg text-sm font-medium bg-white text-slate-700 hover:bg-slate-50">
                        <Eye size={16} /> View Submissions ({subCount})
                      </button>
                      <button
                        onClick={() => setEditTarget(a)}
                        className="inline-flex items-center gap-1.5 py-2 px-4 border border-gray-200 rounded-lg text-sm font-medium bg-white text-slate-700 hover:bg-slate-50">
                        <Edit3 size={16} /> Edit
                      </button>
                      {a.status !== 'DRAFT' && (
                        <button
                          onClick={() => handleSubmissionStatus(a)}
                          disabled={changingStatusId === a.id}
                          className={`inline-flex items-center gap-1.5 py-2 px-4 border rounded-lg text-sm font-medium bg-white disabled:opacity-50 ${
                            a.status === 'CLOSED'
                              ? 'border-green-200 text-green-700 hover:bg-green-50'
                              : 'border-amber-200 text-amber-700 hover:bg-amber-50'
                          }`}
                        >
                          {changingStatusId === a.id
                            ? <Loader2 size={14} className="animate-spin" />
                            : a.status === 'CLOSED' ? <LockOpen size={16} /> : <Lock size={16} />}
                          {a.status === 'CLOSED' ? 'Reopen Submissions' : 'Close Submissions'}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(a.id)}
                        disabled={deletingId === a.id}
                        className="inline-flex items-center gap-1.5 py-2 px-4 border border-red-200 rounded-lg text-sm font-medium bg-white text-red-600 hover:bg-red-50 disabled:opacity-50">
                        {deletingId === a.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={16} />} Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <FileText size={48} className="mx-auto text-slate-300 mb-3" />
          <h3 className="text-lg font-semibold text-slate-700 m-0 mb-1">No assignments found</h3>
          <p className="text-sm text-slate-500 m-0">Try adjusting your filters or create a new assignment.</p>
        </div>
      )}

      {showModal && (
        <AssignmentModal offerings={offerings} initial={null} onClose={() => setShowModal(false)} onSave={handleCreate} />
      )}
      {editTarget && (
        <AssignmentModal offerings={offerings} initial={editTarget} onClose={() => setEditTarget(null)} onSave={handleUpdate} />
      )}
      {submissionsFor && (
        <SubmissionsPanel
          assignment={submissionsFor}
          onClose={() => setSubmissionsFor(null)}
          onAssignmentStatusChange={(updatedAssignment) => {
            setSubmissionsFor(updatedAssignment);
            setAssignments((current) => current.map(
              (item) => item.id === updatedAssignment.id
                ? { ...item, ...updatedAssignment, _count: item._count }
                : item
            ));
          }}
        />
      )}
    </div>
  );
};

export default TeacherAssignments;
