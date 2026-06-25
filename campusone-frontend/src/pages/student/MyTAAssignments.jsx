import React, { useEffect, useState } from 'react';
import {
  GraduationCap, CheckCircle2, XCircle, Clock, AlertCircle, Plus, X,
  BookOpen, Award, Users,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { taAPI } from '../../utils/api';

const STATUS_CHIP = {
  PENDING:  'bg-amber-50 text-amber-700 border-amber-200',
  APPROVED: 'bg-green-50 text-green-700 border-green-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
  RELIEVED: 'bg-slate-100 text-slate-600 border-slate-200',
};
const StatusIcon = ({ s }) => {
  if (s === 'APPROVED') return <CheckCircle2 size={14} className="text-green-600" />;
  if (s === 'REJECTED') return <XCircle size={14} className="text-red-600" />;
  if (s === 'RELIEVED') return <AlertCircle size={14} className="text-slate-500" />;
  return <Clock size={14} className="text-amber-600" />;
};

const PERM_LABEL = {
  MARK_ATTENDANCE:    'Mark attendance',
  GRADE_ASSIGNMENTS:  'Grade assignments',
  GRADE_QUIZZES:      'Grade quizzes (manual)',
  ANSWER_QNA:         'Answer Q&A',
  UPLOAD_RESOURCES:   'Upload resources',
  VIEW_ROSTER:        'View roster',
};

const MyTAAssignments = () => {
  const [eligibility, setEligibility] = useState(null);
  const [my, setMy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ courseId: '', offeringId: '', reason: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([taAPI.getEligibility(), taAPI.getMy()])
      .then(([e, m]) => {
        setEligibility(e.data.data);
        setMy(m.data.data || []);
      })
      .catch(() => toast.error('Failed to load'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const eligibleCourse = eligibility?.eligibleCourses?.find((c) => c.courseId === form.courseId);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.offeringId || !form.reason.trim()) {
      toast.error('Pick a section and write a reason'); return;
    }
    setSubmitting(true);
    try {
      await taAPI.apply({ offeringId: form.offeringId, reason: form.reason });
      toast.success('Application submitted');
      setModalOpen(false);
      setForm({ courseId: '', offeringId: '', reason: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to apply');
    } finally { setSubmitting(false); }
  };

  if (loading) {
    return (
      <div className="max-w-350 mx-auto">
        <div className="mb-6">
          <h1 className="text-[28px] font-bold text-slate-800 m-0 max-md:text-2xl">My TA Assignments</h1>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-slate-400 text-sm">Loading…</div>
      </div>
    );
  }

  const active = my.filter((a) => a.status === 'APPROVED');
  const pending = my.filter((a) => a.status === 'PENDING');
  const closed = my.filter((a) => a.status === 'REJECTED' || a.status === 'RELIEVED');

  return (
    <div className="max-w-350 mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] font-bold text-slate-800 m-0 max-md:text-2xl">My TA Assignments</h1>
          <p className="text-sm text-slate-500 m-0 mt-1">Apply to teach, grade, or assist with junior courses</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          disabled={!eligibility?.eligible || (eligibility?.eligibleCourses?.length || 0) === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus size={16} /> Apply for TA
        </button>
      </div>

      {/* Eligibility card */}
      <div className="bg-white rounded-2xl shadow-sm p-5 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
            <GraduationCap size={20} />
          </div>
          <h2 className="text-base font-semibold text-slate-800 m-0">Eligibility</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-500 m-0 mb-0.5">CGPA</p>
            <p className="text-lg font-bold text-slate-800 m-0">{eligibility?.cgpa ?? '—'}</p>
            <p className="text-[10px] text-slate-500 m-0 mt-0.5">min {eligibility?.config?.minCgpa}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-500 m-0 mb-0.5">Current Semester</p>
            <p className="text-lg font-bold text-slate-800 m-0">{eligibility?.currentSemester ?? '—'}</p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-500 m-0 mb-0.5">Active TA Roles</p>
            <p className="text-lg font-bold text-slate-800 m-0">
              {eligibility?.activeAssignmentCount ?? 0} / {eligibility?.config?.maxActiveAssignments}
            </p>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <p className="text-xs text-slate-500 m-0 mb-0.5">Eligible Courses</p>
            <p className="text-lg font-bold text-slate-800 m-0">{eligibility?.eligibleCourses?.length || 0}</p>
          </div>
        </div>
        {!eligibility?.eligible && eligibility?.reasons?.length > 0 && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs font-semibold text-amber-700 m-0 mb-1">Not currently eligible</p>
            <ul className="text-xs text-amber-700 m-0 pl-4 list-disc">
              {eligibility.reasons.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        )}
        {eligibility?.eligible && (eligibility?.eligibleCourses?.length || 0) === 0 && (
          <p className="mt-3 text-xs text-slate-500 m-0">
            No courses you've completed (with A/A+) are being offered this term to junior batches.
          </p>
        )}
      </div>

      {/* Active assignments */}
      {active.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Active</h3>
          <div className="space-y-3">
            {active.map((a) => (
              <div key={a.id} className="bg-white rounded-2xl shadow-sm p-5 border-l-4 border-green-500">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-slate-800">{a.offering.course.code}</span>
                      <span className="text-sm text-slate-500">·</span>
                      <span className="text-sm text-slate-700">{a.offering.course.title}</span>
                      <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
                        Sec {a.offering.section}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 m-0">
                      {a.offering.term.code} · Teacher: {a.offering.teacher.user.name}
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(a.permissions || []).map((p) => (
                        <span key={p} className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-indigo-50 text-indigo-700">
                          {PERM_LABEL[p] || p}
                        </span>
                      ))}
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_CHIP[a.status]}`}>
                    <StatusIcon s={a.status} /> Active
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending */}
      {pending.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">Pending</h3>
          <div className="space-y-2">
            {pending.map((a) => (
              <div key={a.id} className="bg-white rounded-xl shadow-sm p-4 flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="m-0 font-medium text-slate-800 text-sm">
                    {a.offering.course.code} (Sec {a.offering.section})
                  </p>
                  <p className="m-0 text-xs text-slate-500 mt-0.5">
                    {a.offering.term.code} · Submitted {new Date(a.appliedAt).toLocaleDateString()}
                  </p>
                  {a.reason && <p className="m-0 text-xs text-slate-600 mt-1 italic">"{a.reason}"</p>}
                </div>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_CHIP[a.status]}`}>
                  <StatusIcon s={a.status} /> {a.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Closed history */}
      {closed.length > 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-slate-700 mb-2">History</h3>
          <div className="space-y-2">
            {closed.map((a) => (
              <div key={a.id} className="bg-white rounded-xl shadow-sm p-4 flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <p className="m-0 font-medium text-slate-800 text-sm">
                    {a.offering.course.code} (Sec {a.offering.section})
                  </p>
                  <p className="m-0 text-xs text-slate-500 mt-0.5">
                    {a.offering.term.code}
                  </p>
                  {a.reviewNotes && <p className="m-0 text-xs text-slate-600 mt-1 italic">Note: {a.reviewNotes}</p>}
                </div>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_CHIP[a.status]}`}>
                  <StatusIcon s={a.status} /> {a.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {my.length === 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-slate-400 text-sm">
          You haven't applied to be a TA yet.
        </div>
      )}

      {/* Apply modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-modal p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 m-0">Apply for TA</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Course</label>
                <select
                  required
                  value={form.courseId}
                  onChange={(e) => setForm({ ...form, courseId: e.target.value, offeringId: '' })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- choose course --</option>
                  {(eligibility?.eligibleCourses || []).map((c) => (
                    <option key={c.courseId} value={c.courseId}>
                      {c.code} — {c.title} (Sem {c.semesterSlot})
                    </option>
                  ))}
                </select>
              </div>
              {eligibleCourse && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Section</label>
                  <select
                    required
                    value={form.offeringId}
                    onChange={(e) => setForm({ ...form, offeringId: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- choose section --</option>
                    {eligibleCourse.sections.map((s) => (
                      <option key={s.offeringId} value={s.offeringId}>
                        Sec {s.section} — {s.teacher}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason / Pitch</label>
                <textarea
                  required rows={4}
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="Why are you a good fit? What can you offer the class?"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
                  {submitting ? 'Submitting…' : 'Submit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyTAAssignments;
