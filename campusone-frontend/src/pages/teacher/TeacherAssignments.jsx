import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FileText, Plus, Search, Calendar, Clock, Users,
  CheckCircle, AlertCircle, ChevronDown, ChevronUp,
  Edit3, Trash2, Eye, Download, X, Loader2, Award,
  Lock, LockOpen, ScanSearch, ShieldCheck, AlertTriangle, Save, Upload,
} from 'lucide-react';
import { assignmentAPI, offeringAPI, taAPI } from '../../utils/api';
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

const daysUntil = (dateStr, status) => {
  const diff = Math.ceil((new Date(dateStr) - new Date()) / (1000 * 60 * 60 * 24));
  if (status === 'CLOSED') {
    return <span className="font-medium text-slate-500">{diff > 0 ? 'Closed early' : 'Closed'}</span>;
  }
  if (diff < 0) return <span className="font-semibold text-red-600">Overdue</span>;
  if (diff === 0) return <span className="font-semibold text-amber-600">Due today</span>;
  if (diff <= 3) return <span className="font-semibold text-amber-600">{diff}d left</span>;
  return <span className="font-medium text-slate-500">{diff}d left</span>;
};

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

// ─── Create / Edit Modal ──────────────────────────────────────────────────────
const AssignmentModal = ({ offerings, assignments = [], initial, onClose, onSave }) => {
  const [form, setForm] = useState({
    offeringId: initial?.offeringId ?? '',
    componentIndex: initial?.componentIndex ?? '',
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    totalMarks: initial?.totalMarks ?? 10,
    dueDate: initial?.dueDate ? new Date(initial.dueDate).toISOString().split('T')[0] : '',
    allowLate: initial?.allowLate ?? false,
    status: initial?.status ?? 'PUBLISHED',
  });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const selectedOffering = offerings.find((offering) => offering.id === form.offeringId);
  const assignmentComponent = selectedOffering?.course?.gradeComponents?.find((component) => component.kind === 'ASSIGNMENT');
  const existingCount = assignments.filter(
    (assignment) => assignment.offeringId === form.offeringId && assignment.id !== initial?.id
  ).length;
  const usedIndexes = new Set(
    assignments
      .filter((assignment) => assignment.offeringId === form.offeringId && assignment.id !== initial?.id)
      .map((assignment) => Number(assignment.componentIndex))
      .filter(Boolean)
  );
  const slotOptions = assignmentComponent
    ? Array.from({ length: assignmentComponent.count }, (_, index) => index + 1)
    : [];
  const limitReached = Boolean(assignmentComponent) && existingCount >= assignmentComponent.count;

  const handleOfferingChange = (offeringId) => {
    const offering = offerings.find((item) => item.id === offeringId);
    const component = offering?.course?.gradeComponents?.find((item) => item.kind === 'ASSIGNMENT');
    const existing = assignments.filter((assignment) => assignment.offeringId === offeringId && assignment.id !== initial?.id);
    const taken = new Set(existing.map((assignment) => Number(assignment.componentIndex)).filter(Boolean));
    const hasRoom = component && existing.length < component.count;
    const firstAvailable = component
      ? Array.from({ length: component.count }, (_, index) => index + 1).find((slot) => hasRoom && !taken.has(slot))
      : '';

    setForm((current) => ({
      ...current,
      offeringId,
      componentIndex: firstAvailable || '',
      totalMarks: component?.totalPerInstance ?? current.totalMarks,
    }));
  };

  const handleSlotChange = (componentIndex) => {
    setForm((current) => ({
      ...current,
      componentIndex,
      totalMarks: assignmentComponent?.totalPerInstance ?? current.totalMarks,
    }));
  };

  const fieldClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-3 focus:ring-blue-500/10 disabled:bg-slate-50';
  const labelClass = 'mb-1.5 block text-sm font-semibold text-slate-700';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.offeringId || !form.title || !form.dueDate) {
      toast.error('Course, title, and due date are required');
      return;
    }
    if (assignmentComponent && !form.componentIndex) {
      toast.error('Select an assignment number');
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
    <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/45 p-3 sm:p-5">
      <div className="flex max-h-[calc(100vh-24px)] w-full max-w-xl flex-col overflow-hidden rounded-lg bg-white shadow-xl sm:max-h-[calc(100vh-40px)]">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <h2 className="m-0 text-lg font-bold text-slate-800">{initial ? 'Edit Assignment' : 'Create Assignment'}</h2>
            <p className="m-0 mt-0.5 text-xs text-slate-500">
              {initial ? 'Update assignment details and availability.' : 'Add coursework for one of your active offerings.'}
            </p>
          </div>
          <button type="button" onClick={onClose} title="Close" className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600">
            <X size={19} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4 sm:px-6">
            <div>
              <label className={labelClass}>Course Offering</label>
              <select
                value={form.offeringId}
                onChange={(e) => handleOfferingChange(e.target.value)}
                required
                disabled={!!initial}
                className={fieldClass}
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
              <label className={labelClass}>Assignment Number</label>
              <select
                value={form.componentIndex}
                onChange={(e) => handleSlotChange(e.target.value)}
                required={!!assignmentComponent}
                disabled={!assignmentComponent}
                className={fieldClass}
              >
                <option value="">
                  {assignmentComponent
                    ? (limitReached ? 'Assignment limit reached' : 'Select assignment number...')
                    : 'No assignment component configured'}
                </option>
                {slotOptions.map((slot) => (
                  <option key={slot} value={slot} disabled={limitReached || usedIndexes.has(slot)}>
                    Assignment {slot}{limitReached || usedIndexes.has(slot) ? ' (used)' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Title</label>
              <input
                value={form.title} onChange={(e) => set('title', e.target.value)}
                required placeholder="Assignment title…"
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Description / Instructions</label>
              <textarea
                rows={3} value={form.description} onChange={(e) => set('description', e.target.value)}
                placeholder="Enter instructions…"
                className={`${fieldClass} resize-none`}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Due Date</label>
                <input
                  type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} required
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>Total Marks</label>
                <input
                  type="number" value={form.totalMarks} onChange={(e) => set('totalMarks', e.target.value)}
                  min={1} max={1000}
                  disabled={!!assignmentComponent}
                  className={fieldClass}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Status</label>
                <select
                  value={form.status} onChange={(e) => set('status', e.target.value)}
                  className={fieldClass}
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex min-h-10 w-full cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                  <span>
                    <span className="block text-sm font-semibold text-slate-700">Late submissions</span>
                    <span className="block text-[11px] text-slate-500">Accept work after the deadline</span>
                  </span>
                  <span className="relative inline-flex shrink-0">
                    <input
                      type="checkbox"
                      checked={form.allowLate}
                      onChange={(e) => set('allowLate', e.target.checked)}
                      className="peer sr-only"
                    />
                    <span className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-blue-600" />
                    <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-sm transition peer-checked:translate-x-5" />
                  </span>
                </label>
              </div>
            </div>
            <div>
              <label className={labelClass}>Attachment <span className="font-normal text-slate-400">(optional)</span></label>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-3 transition hover:border-blue-300 hover:bg-blue-50/40">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm">
                  <Upload size={17} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-slate-700">{file?.name || 'Choose a file'}</span>
                  <span className="block text-[11px] text-slate-500">PDF, Word, text, PNG or JPG</span>
                </span>
                <span className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700">Browse</span>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                  onChange={(e) => setFile(e.target.files[0])}
                  className="sr-only"
                />
              </label>
              {initial?.attachmentUrl && !file && (
                <a href={initial.attachmentUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline mt-1 inline-block">
                  View current attachment
                </a>
              )}
            </div>
          </div>
          <div className="flex shrink-0 justify-end gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:px-6">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="inline-flex min-w-32 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">
              {saving && <Loader2 size={16} className="animate-spin" />}
              {initial ? 'Save Changes' : 'Create Assignment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Submissions Panel ────────────────────────────────────────────────────────
const SimilarityResults = ({ report, onReview, reviewingMatchId }) => {
  const [expanded, setExpanded] = useState(true);
  const summary = report.summary || {};
  const labels = {
    EXACT_FILE: 'Identical file',
    EXACT_TEXT: 'Identical text',
    HIGH_LEXICAL: 'High text overlap',
    SEMANTIC: 'Semantic similarity',
  };
  const reviewLabels = {
    CONFIRMED: 'Confirmed',
    DISMISSED: 'Dismissed',
    NEEDS_DISCUSSION: 'Discuss',
    PENDING: 'Pending',
  };

  return (
    <div className="overflow-hidden rounded-xl border border-violet-200 bg-white">
      <button type="button" onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between gap-3 bg-violet-50 px-4 py-3 text-left">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-violet-600" />
          <div>
            <p className="m-0 text-sm font-semibold text-slate-800">Similarity scan evidence</p>
            <p className="m-0 text-xs text-slate-500">
              {summary.flaggedPairs || 0} flagged of {summary.comparedPairs || 0} compared pairs
              {summary.semanticPairs ? ` - ${summary.semanticPairs} semantic` : ''}
              {report.isStale ? ' · report is stale' : ''}
            </p>
          </div>
        </div>
        {expanded ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
      </button>

      {expanded && (
        <div className="space-y-3 p-4">
          <div className="hidden">
            {[
              ['Exact files', summary.exactFilePairs || 0],
              ['Exact text', summary.exactTextPairs || 0],
              ['High overlap', summary.lexicalPairs || 0],
              ['Semantic', summary.semanticPairs || 0],
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
          {report.matches?.length > 0 && (
            <p className="m-0 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
              Findings are shown on the related submission cards below.
            </p>
          )}
          {report.matches?.length > 0 ? (
            <div className="hidden">
              {report.matches.map((match) => (
                <div key={match.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-medium text-slate-800">
                      {match.submissionA.student.user.name}
                      <span className="mx-2 text-slate-300">↔</span>
                      {match.submissionB.student.user.name}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        match.matchType === 'SEMANTIC' ? 'bg-violet-50 text-violet-700' : 'bg-red-50 text-red-700'
                      }`}>{labels[match.matchType]}</span>
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
                  {match.aiExplanation && (
                    <p className="m-0 mt-2 rounded bg-violet-50 px-2 py-1.5 text-xs text-violet-800">
                      {match.aiExplanation}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {match.review?.decision && match.review.decision !== 'PENDING' && (
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600">
                        {reviewLabels[match.review.decision]}
                      </span>
                    )}
                    {[
                      ['CONFIRMED', 'Confirm'],
                      ['DISMISSED', 'Dismiss'],
                      ['NEEDS_DISCUSSION', 'Discuss'],
                    ].map(([decision, label]) => (
                      <button
                        key={decision}
                        type="button"
                        onClick={() => onReview?.(match.id, decision)}
                        disabled={reviewingMatchId === match.id}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {reviewingMatchId === match.id ? 'Saving...' : label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="m-0 rounded-lg bg-green-50 px-3 py-3 text-sm text-green-700">
              No similarity matches were found.
            </p>
          )}
          <p className="m-0 text-[11px] text-slate-400">Local evidence only—this is not an automatic plagiarism verdict.</p>
        </div>
      )}
    </div>
  );
};

const SIMILARITY_LABELS = {
  EXACT_FILE: 'Exact file match',
  EXACT_TEXT: 'Exact text match',
  HIGH_LEXICAL: 'High overlap',
  SEMANTIC: 'Semantic similarity',
};

const SIMILARITY_SHORT_LABELS = {
  EXACT_FILE: 'Exact file',
  EXACT_TEXT: 'Exact text',
  HIGH_LEXICAL: 'High overlap',
  SEMANTIC: 'Semantic',
};

const SIMILARITY_STAGE_LABELS = {
  EXACT_FILE: 'Stage 1',
  EXACT_TEXT: 'Stage 1',
  HIGH_LEXICAL: 'Stage 1',
  SEMANTIC: 'Stage 2',
};

const SIMILARITY_TONES = {
  EXACT_FILE: {
    chip: 'border-red-200 bg-red-50 text-red-700',
    panel: 'border-red-100 bg-red-50/70',
    note: 'bg-white/80 text-red-800',
  },
  EXACT_TEXT: {
    chip: 'border-orange-200 bg-orange-50 text-orange-700',
    panel: 'border-orange-100 bg-orange-50/70',
    note: 'bg-white/80 text-orange-800',
  },
  HIGH_LEXICAL: {
    chip: 'border-amber-200 bg-amber-50 text-amber-700',
    panel: 'border-amber-100 bg-amber-50/70',
    note: 'bg-white/80 text-amber-800',
  },
  SEMANTIC: {
    chip: 'border-violet-200 bg-violet-50 text-violet-700',
    panel: 'border-violet-100 bg-violet-50/70',
    note: 'bg-white/80 text-violet-800',
  },
};

const REVIEW_LABELS = {
  CONFIRMED: 'Confirmed',
  DISMISSED: 'Dismissed',
  NEEDS_DISCUSSION: 'Discuss',
  PENDING: 'Pending',
};

const getSimilarityScore = (match) => Math.round(Number(match.combinedScore || match.semanticScore || match.lexicalScore || 0) * 100);
const getSubmissionName = (submission) => submission?.student?.user?.name || 'Student';
const getSubmissionStudentId = (submission) => submission?.student?.studentId || 'Unknown ID';
const getOtherMatchSubmission = (match, submissionId) => (
  match.submissionA?.id === submissionId ? match.submissionB : match.submissionA
);

const getTimingText = (submission, otherSubmission) => {
  const currentTime = submission?.submittedAt ? new Date(submission.submittedAt).getTime() : null;
  const otherTime = otherSubmission?.submittedAt ? new Date(otherSubmission.submittedAt).getTime() : null;
  const otherName = getSubmissionName(otherSubmission);

  if (!Number.isFinite(currentTime) || !Number.isFinite(otherTime)) return null;
  if (currentTime === otherTime) return 'Submitted at the same time';
  return otherTime < currentTime
    ? `${otherName} submitted first`
    : `${otherName} submitted later`;
};

const SubmissionSimilarityFindings = ({
  submission,
  matches,
  submissionsById,
  onReview,
  reviewingMatchId,
}) => {
  const [expanded, setExpanded] = useState(false);

  if (!matches?.length) return null;

  return (
    <div className="mt-3 border-t border-slate-200 pt-3">
      <div className="flex flex-wrap items-center gap-2">
        {matches.map((match) => {
          const otherReportSubmission = getOtherMatchSubmission(match, submission.id);
          const otherSubmission = submissionsById.get(otherReportSubmission?.id) || otherReportSubmission;
          const otherName = getSubmissionName(otherSubmission);
          const timingText = getTimingText(submission, otherSubmission);
          const tone = SIMILARITY_TONES[match.matchType] || SIMILARITY_TONES.HIGH_LEXICAL;
          const score = getSimilarityScore(match);

          return (
            <button
              key={match.id}
              type="button"
              onClick={() => setExpanded((value) => !value)}
              className={`inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition hover:shadow-sm ${tone.chip}`}
            >
              <AlertTriangle size={13} />
              {SIMILARITY_SHORT_LABELS[match.matchType] || 'Match'} with {otherName}
              <span className="font-bold">{score}%</span>
              {timingText && <span className="font-medium opacity-80">- {timingText}</span>}
            </button>
          );
        })}
      </div>

      {expanded && (
        <div className="mt-3 space-y-2">
          {matches.map((match) => {
            const otherReportSubmission = getOtherMatchSubmission(match, submission.id);
            const otherSubmission = submissionsById.get(otherReportSubmission?.id) || otherReportSubmission;
            const otherName = getSubmissionName(otherSubmission);
            const timingText = getTimingText(submission, otherSubmission);
            const tone = SIMILARITY_TONES[match.matchType] || SIMILARITY_TONES.HIGH_LEXICAL;
            const score = getSimilarityScore(match);

            return (
              <div key={match.id} className={`rounded-lg border p-3 ${tone.panel}`}>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="m-0 text-xs font-bold text-slate-800">
                      {SIMILARITY_LABELS[match.matchType] || 'Similarity match'} with {otherName}
                    </p>
                    <p className="m-0 mt-0.5 text-[11px] text-slate-600">
                      {SIMILARITY_STAGE_LABELS[match.matchType] || 'Scan'} - {getSubmissionStudentId(otherSubmission)}
                      {timingText ? ` - ${timingText}` : ''}
                    </p>
                  </div>
                  <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-bold text-slate-700">
                    {score}%
                  </span>
                </div>

                {match.matchedPassages?.length > 0 && (
                  <p className={`m-0 mt-2 rounded px-2 py-1.5 text-xs ${tone.note}`}>
                    Evidence: "{match.matchedPassages[0]}"
                  </p>
                )}
                {match.aiExplanation && (
                  <p className="m-0 mt-2 rounded bg-white/80 px-2 py-1.5 text-xs text-violet-800">
                    {match.aiExplanation}
                  </p>
                )}

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  {match.review?.decision && match.review.decision !== 'PENDING' && (
                    <span className="rounded-full bg-white/80 px-2 py-1 text-[11px] font-semibold text-slate-600">
                      {REVIEW_LABELS[match.review.decision]}
                    </span>
                  )}
                  {[
                    ['CONFIRMED', 'Confirm'],
                    ['DISMISSED', 'Dismiss'],
                    ['NEEDS_DISCUSSION', 'Discuss'],
                  ].map(([decision, label]) => (
                    <button
                      key={decision}
                      type="button"
                      onClick={() => onReview?.(match.id, decision)}
                      disabled={reviewingMatchId === match.id}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {reviewingMatchId === match.id ? 'Saving...' : label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

const SubmissionsPanel = ({ assignment, onClose, onAssignmentStatusChange }) => {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const canManageAssignment = currentUser.role === 'teacher' || currentUser.role === 'admin';
  const canReviewTAGrades = currentUser.role === 'teacher' || currentUser.role === 'admin';
  const canViewTAGrades = canReviewTAGrades || currentUser.role === 'student';
  const [currentAssignment, setCurrentAssignment] = useState(assignment);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gradingId, setGradingId] = useState(null);
  const [gradeForm, setGradeForm] = useState({});
  const [similarityReport, setSimilarityReport] = useState(null);
  const [scanningStageOne, setScanningStageOne] = useState(false);
  const [scanningStageTwo, setScanningStageTwo] = useState(false);
  const [reviewingMatchId, setReviewingMatchId] = useState(null);
  const [changingStatus, setChangingStatus] = useState(false);
  const [savingGradeId, setSavingGradeId] = useState(null);

  const loadSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const submissionsResponse = await assignmentAPI.getSubmissions(assignment.id);
      setSubmissions(submissionsResponse.data.data);

      if (canManageAssignment) {
        try {
          const reportResponse = await assignmentAPI.getLatestSimilarityReport(assignment.id);
          setSimilarityReport(reportResponse.data.data);
        } catch {
          setSimilarityReport(null);
        }
      } else {
        setSimilarityReport(null);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  }, [assignment.id, canManageAssignment]);

  useEffect(() => {
    loadSubmissions();
  }, [loadSubmissions]);

  const runSimilarityScan = async () => {
    if (!canManageAssignment) return;
    setScanningStageOne(true);
    try {
      const response = await assignmentAPI.runSimilarityScan(assignment.id);
      setSimilarityReport(response.data.data);
      toast.success('Stage 1 similarity scan completed');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Similarity scan failed');
    } finally {
      setScanningStageOne(false);
    }
  };

  const runSimilarityAIScan = async () => {
    if (!canManageAssignment) return;
    setScanningStageTwo(true);
    try {
      const response = await assignmentAPI.runSimilarityAIScan(assignment.id, { includeExplanations: true });
      setSimilarityReport(response.data.data);
      toast.success('Stage 2 AI scan completed');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Stage 2 AI scan failed');
    } finally {
      setScanningStageTwo(false);
    }
  };

  const reviewSimilarityMatch = async (matchId, decision) => {
    if (!canManageAssignment) return;
    setReviewingMatchId(matchId);
    try {
      const response = await assignmentAPI.reviewSimilarityMatch(assignment.id, matchId, { decision });
      setSimilarityReport(response.data.data);
      toast.success('Review saved');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Review save failed');
    } finally {
      setReviewingMatchId(null);
    }
  };

  const changeSubmissionStatus = async () => {
    if (!canManageAssignment) return;
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
    const numericMarks = Number(marks);
    if (marks === '' || !Number.isFinite(numericMarks)) {
      toast.error('Enter valid marks');
      return;
    }
    if (numericMarks < 0 || numericMarks > currentAssignment.totalMarks) {
      toast.error(`Marks must be between 0 and ${currentAssignment.totalMarks}`);
      return;
    }

    setSavingGradeId(subId);
    try {
      const response = await assignmentAPI.gradeSubmission(subId, { obtainedMarks: numericMarks, feedback });
      if (response.data.pendingApproval) {
        const pendingGrade = response.data.data || {};
        const visiblePendingGrade = {
          ...pendingGrade,
          status: pendingGrade.status || 'PENDING',
          marksAwarded: pendingGrade.marksAwarded ?? numericMarks,
          feedback: pendingGrade.feedback ?? feedback ?? null,
          taStudent: pendingGrade.taStudent || { user: { name: currentUser.name || 'You' } },
        };
        setSubmissions((prev) => prev.map((s) => {
          if (s.id !== subId) return s;
          const currentPendingGrades = s.taPendingGrades || [];
          const otherPendingGrades = currentPendingGrades.filter((pending) => (
            pending.id !== visiblePendingGrade.id
            && (!visiblePendingGrade.taStudentId || pending.taStudentId !== visiblePendingGrade.taStudentId)
          ));
          return {
            ...s,
            taPendingGrades: [visiblePendingGrade, ...otherPendingGrades],
          };
        }));
        toast.success('Grade saved for teacher approval');
      } else {
        setSubmissions((prev) => prev.map((s) => s.id === subId ? { ...s, status: 'GRADED', obtainedMarks: numericMarks, feedback } : s));
        toast.success('Grade saved');
      }
      setGradingId(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Grade save failed');
    } finally {
      setSavingGradeId(null);
    }
  };

  const approvePendingGrade = async (pendingId) => {
    try {
      await assignmentAPI.approvePendingGrade(pendingId);
      toast.success('TA grade approved');
      loadSubmissions();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Approval failed');
    }
  };

  const rejectPendingGrade = async (pendingId) => {
    try {
      await assignmentAPI.rejectPendingGrade(pendingId);
      toast.success('TA grade rejected');
      loadSubmissions();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Rejection failed');
    }
  };

  const scanBusy = scanningStageOne || scanningStageTwo;
  const canRunStageTwo = Boolean(similarityReport)
    && !similarityReport.isStale
    && currentAssignment.status === 'CLOSED';
  const submissionsById = useMemo(
    () => new Map(submissions.map((submission) => [submission.id, submission])),
    [submissions]
  );
  const similarityMatchesBySubmissionId = useMemo(() => {
    const grouped = new Map();
    (similarityReport?.matches || []).forEach((match) => {
      [match.submissionA?.id, match.submissionB?.id].filter(Boolean).forEach((submissionId) => {
        const current = grouped.get(submissionId) || [];
        current.push(match);
        grouped.set(submissionId, current);
      });
    });
    grouped.forEach((matches) => {
      matches.sort((left, right) => getSimilarityScore(right) - getSimilarityScore(left));
    });
    return grouped;
  }, [similarityReport]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-modal p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-4 shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800 m-0">{currentAssignment.title}</h2>
            <p className="text-sm text-slate-500 m-0">Submissions · {submissions.length} received</p>
          </div>
          <div className="flex items-center gap-2">
            {canManageAssignment && (
              <>
                <button
                  onClick={changeSubmissionStatus}
                  disabled={changingStatus || scanBusy}
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
                  disabled={scanningStageOne || scanningStageTwo || changingStatus || loading || submissions.length < 2 || currentAssignment.status !== 'CLOSED'}
                  title={currentAssignment.status !== 'CLOSED' ? 'Close submissions before scanning' : 'Run local Stage 1 checks'}
                  className="inline-flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 text-xs font-semibold text-violet-700 transition hover:bg-violet-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {scanningStageOne ? <Loader2 size={14} className="animate-spin" /> : <ScanSearch size={14} />}
                  {scanningStageOne ? 'Scanning...' : similarityReport ? 'Stage 1 Again' : 'Stage 1 Local Scan'}
                </button>
                <button
                  onClick={runSimilarityAIScan}
                  disabled={scanningStageTwo || scanningStageOne || changingStatus || loading || !canRunStageTwo}
                  title={!similarityReport ? 'Run Stage 1 first' : similarityReport.isStale ? 'Run Stage 1 again before Stage 2' : 'Run Stage 2 AI semantic scan'}
                  className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {scanningStageTwo ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                  {scanningStageTwo ? 'AI scanning...' : 'Stage 2 AI Scan'}
                </button>
              </>
            )}
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400"><X size={20} /></button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {canManageAssignment && currentAssignment.status !== 'CLOSED' && (
            <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <Lock size={17} className="mt-0.5 shrink-0" />
              <span>Close submissions here before running similarity checks.</span>
            </div>
          )}
          {canManageAssignment && similarityReport && (
            <SimilarityResults
              report={similarityReport}
              onReview={reviewSimilarityMatch}
              reviewingMatchId={reviewingMatchId}
            />
          )}
          {loading ? (
            <div className="flex items-center justify-center py-12 text-slate-400"><Loader2 size={24} className="animate-spin" /></div>
          ) : submissions.length === 0 ? (
            <div className="text-center py-12 text-slate-400">No submissions yet</div>
          ) : submissions.map((sub) => {
            const pendingGrades = (sub.taPendingGrades || []).filter((pending) => pending.status === 'PENDING');
            const pendingGrade = pendingGrades[0];
            const hasPendingGrade = pendingGrades.length > 0;
            const sc = hasPendingGrade
              ? { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Pending approval' }
              : (SUB_STATUS[sub.status] || SUB_STATUS.SUBMITTED);
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
                    {hasPendingGrade && (
                      <span className="text-sm font-bold text-amber-700">{pendingGrade.marksAwarded}/{currentAssignment.totalMarks}</span>
                    )}
                  </div>
                </div>

                {sub.submissionText && <p className="text-sm text-slate-600 mb-2 line-clamp-2">{sub.submissionText}</p>}
                {sub.feedback && <p className="text-xs text-green-700 bg-green-50 rounded p-2 mb-2">{sub.feedback}</p>}
                {canManageAssignment && similarityReport && (
                  <SubmissionSimilarityFindings
                    submission={sub}
                    matches={similarityMatchesBySubmissionId.get(sub.id)}
                    submissionsById={submissionsById}
                    onReview={reviewSimilarityMatch}
                    reviewingMatchId={reviewingMatchId}
                  />
                )}
                {canViewTAGrades && pendingGrades.map((pending) => (
                  <div key={pending.id} className="mb-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="m-0 text-xs font-semibold text-amber-800">
                          {canReviewTAGrades ? 'Pending TA grade' : 'Your pending grade'}: {pending.marksAwarded}/{currentAssignment.totalMarks}
                        </p>
                        <p className="m-0 mt-0.5 text-[11px] text-amber-700">
                          {pending.taStudent?.user?.name || 'TA'}{pending.feedback ? ` · ${pending.feedback}` : ''}
                        </p>
                      </div>
                      {canReviewTAGrades && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => approvePendingGrade(pending.id)}
                            className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => rejectPendingGrade(pending.id)}
                            className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {!isGrading ? (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
                    {sub.attachmentUrl && (
                      <a
                        href={sub.attachmentUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-100"
                      >
                        <Download size={14} /> Download
                      </a>
                    )}
                    <button
                      onClick={() => {
                        setGradingId(sub.id);
                        setGradeForm((f) => ({
                          ...f,
                          [sub.id]: {
                            marks: pendingGrade?.marksAwarded ?? sub.obtainedMarks ?? '',
                            feedback: pendingGrade?.feedback ?? sub.feedback ?? '',
                          },
                        }));
                      }}
                      className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                    >
                      <Award size={14} />
                      {hasPendingGrade ? 'Edit pending grade' : sub.status === 'GRADED' ? 'Edit grade' : 'Grade'}
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-col gap-3 border-t border-slate-200 pt-3 sm:flex-row sm:items-end">
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
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => saveGrade(sub.id)}
                        disabled={savingGradeId === sub.id}
                        className="inline-flex min-h-9 items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {savingGradeId === sub.id ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                        Save
                      </button>
                      <button
                        onClick={() => setGradingId(null)}
                        disabled={savingGradeId === sub.id}
                        className="min-h-9 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Cancel
                      </button>
                    </div>
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
  const [searchParams] = useSearchParams();
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const canManageCoursework = currentUser.role === 'teacher' || currentUser.role === 'admin';
  const initialOfferingId = searchParams.get('offeringId') || '';
  const [assignments, setAssignments] = useState([]);
  const [offerings, setOfferings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterOffering, setFilterOffering] = useState(initialOfferingId);
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
    offeringAPI.getMy()
      .then((r) => setOfferings(r.data.data))
      .catch(() => {
        taAPI.getMyActive().then((r) => {
          setOfferings((r.data.data || []).map((assignment) => assignment.offering));
        }).catch(() => {});
      });
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
      <div className="mb-5 flex items-center justify-between max-sm:flex-col max-sm:items-start max-sm:gap-3">
        <div>
          <h1 className="text-[28px] font-bold text-slate-800 m-0 max-md:text-2xl">Assignments</h1>
          <p className="text-sm text-slate-500 m-0 mt-1">Create and manage course assignments</p>
        </div>
        {canManageCoursework && <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
        >
          <Plus size={18} /> Create Assignment
        </button>}
      </div>

      <div className="mb-5 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3 max-sm:grid-cols-2">
        {stats.map((s, i) => (
          <div key={i} className="flex min-h-20 items-center gap-3 rounded-lg border border-slate-100 bg-white px-4 py-3 shadow-sm">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${s.color}15`, color: s.color }}>
              <s.icon size={19} />
            </div>
            <div>
              <p className="m-0 text-xs font-medium text-slate-500">{s.label}</p>
              <h3 className="m-0 text-xl font-bold text-slate-800">{s.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-4 grid grid-cols-[minmax(260px,1fr)_minmax(210px,280px)_160px] items-center gap-3 rounded-lg border border-slate-100 bg-white p-3 shadow-sm max-lg:grid-cols-[1fr_220px_150px] max-md:grid-cols-2 max-sm:grid-cols-1">
        <div className="relative max-md:col-span-2 max-sm:col-span-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text" placeholder="Search assignments…"
            value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-3 focus:ring-blue-500/10"
          />
        </div>
        <select value={filterOffering} onChange={(e) => setFilterOffering(e.target.value)}
          aria-label="Filter by course"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500">
          <option value="">All Courses</option>
          {offerings.map((o) => (
            <option key={o.id} value={o.id}>{o.course?.code} Sec {o.section}</option>
          ))}
        </select>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          aria-label="Filter by status"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500">
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="PUBLISHED">Published</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 size={28} className="animate-spin" /></div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((a) => {
            const expanded = expandedId === a.id;
            const sc = STATUS_CONFIG[a.status] ?? STATUS_CONFIG.PUBLISHED;
            const subCount = a._count?.submissions ?? 0;
            return (
              <div key={a.id} className="overflow-hidden rounded-lg border border-slate-100 bg-white shadow-sm transition-all">
                <div
                  className="flex cursor-pointer items-center gap-3 px-4 py-3.5 transition-colors hover:bg-slate-50/70 max-sm:flex-col max-sm:items-start"
                  onClick={() => setExpandedId(expanded ? null : a.id)}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <FileText size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <h3 className="m-0 truncate text-sm font-semibold text-slate-800">{a.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${sc.bg} ${sc.text} ${sc.border}`}>{sc.label}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
                      <span>{a.offering?.course?.code} — {a.offering?.course?.title} (Sec {a.offering?.section})</span>
                      <span>&middot;</span>
                      {a.componentIndex && (
                        <>
                          <span>Assignment {a.componentIndex}</span>
                          <span>&middot;</span>
                        </>
                      )}
                      <span className="flex items-center gap-1"><Calendar size={12} /> {fmtDate(a.dueDate)}</span>
                      <span>&middot;</span>
                      {daysUntil(a.dueDate, a.status)}
                    </div>
                  </div>
                  <div
                    className="hidden items-center gap-1 lg:flex"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <button
                      type="button"
                      title={`View ${subCount} submissions`}
                      onClick={() => setSubmissionsFor(a)}
                      className="rounded-lg p-2 text-slate-500 transition hover:bg-blue-50 hover:text-blue-700"
                    >
                      <Eye size={17} />
                    </button>
                    {canManageCoursework && <button
                      type="button"
                      title="Edit assignment"
                      onClick={() => setEditTarget(a)}
                      className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                    >
                      <Edit3 size={17} />
                    </button>}
                    {canManageCoursework && a.status !== 'DRAFT' && (
                      <button
                        type="button"
                        title={a.status === 'CLOSED' ? 'Reopen submissions' : 'Close submissions'}
                        onClick={() => handleSubmissionStatus(a)}
                        disabled={changingStatusId === a.id}
                        className="rounded-lg p-2 text-slate-500 transition hover:bg-amber-50 hover:text-amber-700 disabled:opacity-50"
                      >
                        {changingStatusId === a.id
                          ? <Loader2 size={17} className="animate-spin" />
                          : a.status === 'CLOSED' ? <LockOpen size={17} /> : <Lock size={17} />}
                      </button>
                    )}
                    {canManageCoursework && <button
                      type="button"
                      title="Delete assignment"
                      onClick={() => handleDelete(a.id)}
                      disabled={deletingId === a.id}
                      className="rounded-lg p-2 text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    >
                      {deletingId === a.id ? <Loader2 size={17} className="animate-spin" /> : <Trash2 size={17} />}
                    </button>}
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
                      {canManageCoursework && <button
                        onClick={() => setEditTarget(a)}
                        className="inline-flex items-center gap-1.5 py-2 px-4 border border-gray-200 rounded-lg text-sm font-medium bg-white text-slate-700 hover:bg-slate-50">
                        <Edit3 size={16} /> Edit
                      </button>}
                      {canManageCoursework && a.status !== 'DRAFT' && (
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
                      {canManageCoursework && <button
                        onClick={() => handleDelete(a.id)}
                        disabled={deletingId === a.id}
                        className="inline-flex items-center gap-1.5 py-2 px-4 border border-red-200 rounded-lg text-sm font-medium bg-white text-red-600 hover:bg-red-50 disabled:opacity-50">
                        {deletingId === a.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={16} />} Delete
                      </button>}
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

      {canManageCoursework && showModal && (
        <AssignmentModal assignments={assignments} offerings={offerings} initial={null} onClose={() => setShowModal(false)} onSave={handleCreate} />
      )}
      {canManageCoursework && editTarget && (
        <AssignmentModal assignments={assignments} offerings={offerings} initial={editTarget} onClose={() => setEditTarget(null)} onSave={handleUpdate} />
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
