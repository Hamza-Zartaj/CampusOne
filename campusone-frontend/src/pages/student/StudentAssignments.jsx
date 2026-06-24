import React, { useState, useEffect } from 'react';
import {
  FileText, Search, Calendar, Clock, CheckCircle,
  AlertCircle, Upload, ChevronDown, ChevronUp,
  Download, Award, X, Loader2,
} from 'lucide-react';
import { assignmentAPI } from '../../utils/api';
import toast from 'react-hot-toast';

const STATUS_CONFIG = {
  pending:   { bg: 'bg-amber-50',  text: 'text-amber-700',  border: 'border-amber-200',  label: 'Pending',   Icon: Clock },
  submitted: { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200',   label: 'Submitted', Icon: CheckCircle },
  late:      { bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200',     label: 'Late',      Icon: AlertCircle },
  graded:    { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200',  label: 'Graded',    Icon: Award },
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const daysUntil = (dateStr) => {
  const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return <span className="text-red-500 font-medium">Overdue by {Math.abs(diff)}d</span>;
  if (diff === 0) return <span className="text-amber-600 font-medium">Due today</span>;
  if (diff <= 3) return <span className="text-amber-600 font-medium">{diff}d left</span>;
  return <span className="text-slate-500">{diff}d left</span>;
};

// Derive a display status from assignment + submission data
const getDisplayStatus = (a) => {
  const sub = a.submissions?.[0];
  if (!sub) {
    const overdue = new Date() > new Date(a.dueDate);
    return overdue ? 'late' : 'pending';
  }
  if (sub.status === 'GRADED') return 'graded';
  if (sub.status === 'LATE') return 'late';
  return 'submitted';
};

// ─── Submit Modal ─────────────────────────────────────────────────────────────
const SubmitModal = ({ assignment, onClose, onSubmitted }) => {
  const [text, setText] = useState('');
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const sub = assignment.submissions?.[0];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text && !file) { toast.error('Provide text or upload a file'); return; }
    setSubmitting(true);
    try {
      const fd = new FormData();
      if (text) fd.append('submissionText', text);
      if (file) fd.append('file', file);
      await assignmentAPI.submit(assignment.id, fd);
      toast.success(sub ? 'Submission updated' : 'Submitted successfully');
      onSubmitted();
    } catch (err) {
      toast.error(err?.response?.data?.message ?? 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800 m-0">{sub ? 'Update Submission' : 'Submit Assignment'}</h2>
            <p className="text-sm text-slate-500 m-0">{assignment.title}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {sub && (
              <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-sm text-blue-800">
                You already submitted on {fmtDate(sub.submittedAt)}. Re-submitting will replace your previous submission.
              </div>
            )}
            <div>
              <label className="block text-[0.9rem] font-medium text-slate-800 mb-2">Text Answer (optional)</label>
              <textarea
                rows={4} value={text} onChange={(e) => setText(e.target.value)}
                placeholder="Type your answer here…"
                className="w-full py-2.5 px-3.5 border border-gray-200 rounded-lg text-[0.95rem] focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-[0.9rem] font-medium text-slate-800 mb-2">Upload File (optional)</label>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.zip,.txt,.png,.jpg,.jpeg"
                onChange={(e) => setFile(e.target.files[0])}
                className="w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              <p className="text-xs text-slate-400 mt-1">PDF, DOC, DOCX, ZIP, images, TXT · max 20 MB</p>
            </div>
          </div>
          <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="py-2.5 px-5 border border-gray-200 rounded-lg text-[0.95rem] font-medium bg-white text-slate-800 hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="inline-flex items-center gap-2 py-2.5 px-5 border-none rounded-lg text-[0.95rem] font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60">
              {submitting && <Loader2 size={16} className="animate-spin" />}
              <Upload size={16} /> {sub ? 'Update' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const StudentAssignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [submitTarget, setSubmitTarget] = useState(null);

  const loadAssignments = async () => {
    try {
      // Only show ACTIVE items (ungraded / not yet submitted). Graded items live inside My Courses.
      const { studentAPI } = await import('../../utils/api');
      const r = await studentAPI.activeAssignments();
      setAssignments(r.data.data);
    } catch {
      toast.error('Failed to load assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAssignments(); }, []);

  const filtered = assignments.filter((a) => {
    const status = getDisplayStatus(a);
    if (filterStatus && status !== filterStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return a.title.toLowerCase().includes(q) || a.offering?.course?.code?.toLowerCase().includes(q);
    }
    return true;
  });

  const pendingCount  = assignments.filter((a) => getDisplayStatus(a) === 'pending').length;
  const submittedCount = assignments.filter((a) => getDisplayStatus(a) === 'submitted').length;
  const gradedCount   = assignments.filter((a) => getDisplayStatus(a) === 'graded').length;
  const avgScore = (() => {
    const graded = assignments.filter((a) => getDisplayStatus(a) === 'graded');
    if (!graded.length) return '—';
    const avg = graded.reduce((s, a) => {
      const m = a.submissions?.[0]?.obtainedMarks ?? 0;
      return s + (m / a.totalMarks) * 100;
    }, 0) / graded.length;
    return `${Math.round(avg)}%`;
  })();

  const stats = [
    { icon: FileText,    label: 'Total',     value: assignments.length, color: '#3b82f6' },
    { icon: Clock,       label: 'Pending',   value: pendingCount,       color: '#f59e0b' },
    { icon: CheckCircle, label: 'Submitted', value: submittedCount,     color: '#06b6d4' },
    { icon: Award,       label: 'Avg Score', value: avgScore,           color: '#10b981' },
  ];

  return (
    <div className="max-w-[1400px] mx-auto">
      <div className="mb-6">
        <h1 className="text-[28px] font-bold text-slate-800 m-0 max-md:text-2xl">My Assignments</h1>
        <p className="text-sm text-slate-500 m-0 mt-1">View and submit your course assignments</p>
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
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="py-2.5 px-3.5 border border-gray-200 rounded-lg text-[0.95rem] bg-white focus:outline-none focus:border-blue-500">
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="submitted">Submitted</option>
          <option value="late">Late</option>
          <option value="graded">Graded</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 size={28} className="animate-spin" /></div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => {
            const expanded = expandedId === a.id;
            const displayStatus = getDisplayStatus(a);
            const sc = STATUS_CONFIG[displayStatus];
            const StatusIcon = sc.Icon;
            const sub = a.submissions?.[0];
            const isPastDue = new Date() > new Date(a.dueDate);
            const canSubmit = a.status === 'PUBLISHED' && (!isPastDue || a.allowLate);

            return (
              <div key={a.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
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
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${sc.bg} ${sc.text} ${sc.border}`}>
                        <StatusIcon size={12} /> {sc.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                      <span>{a.offering?.course?.code} — {a.offering?.course?.title}</span>
                      <span>&middot;</span>
                      <span className="flex items-center gap-1"><Calendar size={12} /> Due: {fmtDate(a.dueDate)}</span>
                      <span>&middot;</span>
                      {displayStatus === 'pending' ? daysUntil(a.dueDate) : <span>Submitted: {fmtDate(sub?.submittedAt)}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 max-sm:w-full max-sm:justify-between">
                    {displayStatus === 'graded' ? (
                      <div className="text-right">
                        <p className="text-xs text-slate-500 m-0">Score</p>
                        <p className="text-lg font-bold text-green-600 m-0">{sub?.obtainedMarks}/{a.totalMarks}</p>
                      </div>
                    ) : (
                      <div className="text-right">
                        <p className="text-xs text-slate-500 m-0">Total Marks</p>
                        <p className="text-sm font-semibold text-slate-700 m-0">{a.totalMarks}</p>
                      </div>
                    )}
                    {expanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                  </div>
                </div>

                {expanded && (
                  <div className="px-5 pb-5 border-t border-slate-100 pt-4">
                    {a.description && <p className="text-sm text-slate-600 mb-4">{a.description}</p>}

                    {a.attachmentUrl && (
                      <div className="mb-4">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Instruction File</h4>
                        <a href={a.attachmentUrl} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1.5 py-1.5 px-3 border border-gray-200 rounded-lg text-sm bg-white text-slate-700 hover:bg-slate-50">
                          <Download size={14} /> Download
                        </a>
                      </div>
                    )}

                    {sub?.submissionText && (
                      <div className="mb-4">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Your Answer</h4>
                        <p className="text-sm text-slate-700 bg-slate-50 rounded-xl p-3">{sub.submissionText}</p>
                      </div>
                    )}

                    {sub?.attachmentUrl && (
                      <div className="mb-4">
                        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Your Submission File</h4>
                        <a href={sub.attachmentUrl} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1.5 py-1.5 px-3 border border-gray-200 rounded-lg text-sm bg-white text-slate-700 hover:bg-slate-50">
                          <Download size={14} /> Download
                        </a>
                      </div>
                    )}

                    {sub?.feedback && (
                      <div className="p-3 rounded-xl bg-green-50 border border-green-200 mb-4">
                        <h4 className="text-xs font-semibold text-green-700 m-0 mb-1">Instructor Feedback</h4>
                        <p className="text-sm text-green-800 m-0">{sub.feedback}</p>
                      </div>
                    )}

                    {canSubmit && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setSubmitTarget(a); }}
                        className="inline-flex items-center gap-2 py-2.5 px-5 border-none rounded-lg text-[0.95rem] font-medium cursor-pointer transition-all bg-blue-600 text-white hover:bg-blue-700"
                      >
                        <Upload size={18} /> {sub ? 'Update Submission' : 'Submit Assignment'}
                      </button>
                    )}
                    {a.status === 'CLOSED' && (
                      <p className="text-sm text-red-600 font-medium">
                        Submissions and resubmissions have been closed by the teacher.
                      </p>
                    )}
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
          <p className="text-sm text-slate-500 m-0">Try adjusting your filters.</p>
        </div>
      )}

      {submitTarget && (
        <SubmitModal
          assignment={submitTarget}
          onClose={() => setSubmitTarget(null)}
          onSubmitted={() => { setSubmitTarget(null); loadAssignments(); }}
        />
      )}
    </div>
  );
};

export default StudentAssignments;
