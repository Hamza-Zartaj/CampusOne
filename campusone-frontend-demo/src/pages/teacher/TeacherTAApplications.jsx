import React, { useEffect, useState } from 'react';
import {
  Users, CheckCircle2, XCircle, Clock, AlertCircle, X, GraduationCap,
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

const ALL_PERMS = [
  { value: 'MARK_ATTENDANCE',   label: 'Mark attendance' },
  { value: 'GRADE_ASSIGNMENTS', label: 'Grade assignments' },
  { value: 'GRADE_QUIZZES',     label: 'Grade quizzes (manual)' },
  { value: 'ANSWER_QNA',        label: 'Answer Q&A' },
  { value: 'UPLOAD_RESOURCES',  label: 'Upload resources' },
];

const REVIEW_NOTES_MAX_LENGTH = 1000;

const TeacherTAApplications = () => {
  const [tab, setTab] = useState('pending');
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(null);
  const [decision, setDecision] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [grantedPerms, setGrantedPerms] = useState([]);

  const load = () => {
    setLoading(true);
    taAPI.getTeacherApplications()
      .then((r) => setApplications(r.data.data || []))
      .catch(() => toast.error('Failed to load TA applications'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const togglePerm = (p) =>
    setGrantedPerms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));

  const submitDecision = async () => {
    if (!reviewing || !decision) return;
    if (reviewNotes.length > REVIEW_NOTES_MAX_LENGTH) {
      toast.error(`Notes must be ${REVIEW_NOTES_MAX_LENGTH} characters or fewer`);
      return;
    }
    try {
      if (decision === 'APPROVED') {
        await taAPI.approve(reviewing.id, { permissions: grantedPerms, reviewNotes });
        toast.success('TA approved');
      } else if (decision === 'REJECTED') {
        await taAPI.reject(reviewing.id, reviewNotes);
        toast.success('Application rejected');
      } else if (decision === 'RELIEVED') {
        await taAPI.relieve(reviewing.id, reviewNotes);
        toast.success('TA relieved');
      }
      setReviewing(null); setDecision(null); setReviewNotes(''); setGrantedPerms([]);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const filtered =
    tab === 'pending'  ? applications.filter((a) => a.status === 'PENDING') :
    tab === 'active'   ? applications.filter((a) => a.status === 'APPROVED') :
    tab === 'history'  ? applications.filter((a) => a.status === 'REJECTED' || a.status === 'RELIEVED') :
    applications;

  return (
    <div className="max-w-350 mx-auto">
      <div className="mb-6">
        <h1 className="text-[28px] font-bold text-slate-800 m-0 max-md:text-2xl">TA Applications</h1>
        <p className="text-sm text-slate-500 m-0 mt-1">Review and manage Teaching Assistants for your courses</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-2 mb-4 inline-flex">
        {[
          { id: 'pending', label: 'Pending',  count: applications.filter((a) => a.status === 'PENDING').length },
          { id: 'active',  label: 'Active',   count: applications.filter((a) => a.status === 'APPROVED').length },
          { id: 'history', label: 'History',  count: applications.filter((a) => a.status === 'REJECTED' || a.status === 'RELIEVED').length },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${tab === t.id ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            {t.label}
            {t.count > 0 && <span className={`ml-2 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${tab === t.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>{t.count}</span>}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl shadow-sm">
        {loading ? (
          <div className="p-10 text-center text-slate-400 text-sm">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">No applications.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((a) => (
              <div key={a.id} className="p-5 flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-slate-800">{a.student.user.name}</span>
                    <span className="text-xs text-slate-500">({a.student.studentId})</span>
                    <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
                      Sem {a.student.currentSemester}
                    </span>
                    <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                      {a.offering.course.code} (Sec {a.offering.section})
                    </span>
                  </div>
                  {a.reason && (
                    <p className="text-xs text-slate-700 m-0 mt-1 italic">"{a.reason}"</p>
                  )}
                  {a.permissions?.length > 0 && a.status === 'APPROVED' && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {a.permissions.map((p) => (
                        <span key={p} className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-indigo-50 text-indigo-700">
                          {p.replace(/_/g, ' ').toLowerCase()}
                        </span>
                      ))}
                    </div>
                  )}
                  {a.reviewNotes && (
                    <p className="text-xs text-slate-500 mt-1">Note: {a.reviewNotes}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_CHIP[a.status]}`}>
                    <StatusIcon s={a.status} /> {a.status}
                  </span>
                  {a.status === 'PENDING' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => { setReviewing(a); setDecision('APPROVED'); setGrantedPerms(['MARK_ATTENDANCE', 'ANSWER_QNA']); }}
                        className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700"
                      >Approve</button>
                      <button
                        onClick={() => { setReviewing(a); setDecision('REJECTED'); }}
                        className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700"
                      >Reject</button>
                    </div>
                  )}
                  {a.status === 'APPROVED' && (
                    <button
                      onClick={() => { setReviewing(a); setDecision('RELIEVED'); }}
                      className="px-3 py-1.5 rounded-lg bg-slate-700 text-white text-xs font-medium hover:bg-slate-800"
                    >Relieve</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Decision modal */}
      {reviewing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-modal p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 m-0">
                {decision === 'APPROVED' ? 'Approve TA' : decision === 'REJECTED' ? 'Reject Application' : 'Relieve TA'}
              </h3>
              <button onClick={() => { setReviewing(null); setDecision(null); setReviewNotes(''); setGrantedPerms([]); }}
                className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-slate-50 rounded-lg p-3 text-sm">
                <p className="m-0"><b>{reviewing.student.user.name}</b> ({reviewing.student.studentId})</p>
                <p className="m-0 text-xs text-slate-600 mt-0.5">
                  {reviewing.offering.course.code} · Sec {reviewing.offering.section}
                </p>
              </div>

              {decision === 'APPROVED' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Grant permissions</label>
                  <div className="space-y-1.5">
                    {ALL_PERMS.map((p) => (
                      <label key={p.value} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input
                          type="checkbox"
                          checked={grantedPerms.includes(p.value)}
                          onChange={() => togglePerm(p.value)}
                          className="w-4 h-4 rounded text-indigo-600"
                        />
                        <span className="text-slate-700">{p.label}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-2">VIEW_ROSTER is granted by default.</p>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes (optional)</label>
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  maxLength={REVIEW_NOTES_MAX_LENGTH}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-slate-400 mt-1 m-0 text-right">
                  {reviewNotes.length}/{REVIEW_NOTES_MAX_LENGTH}
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => { setReviewing(null); setDecision(null); setReviewNotes(''); setGrantedPerms([]); }}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100">Cancel</button>
                <button onClick={submitDecision}
                  className={`px-4 py-2 rounded-lg text-white text-sm font-medium ${decision === 'APPROVED' ? 'bg-green-600 hover:bg-green-700' : decision === 'REJECTED' ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-700 hover:bg-slate-800'}`}>
                  {decision === 'APPROVED' ? 'Approve' : decision === 'REJECTED' ? 'Reject' : 'Relieve'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherTAApplications;
