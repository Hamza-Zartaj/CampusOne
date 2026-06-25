import React, { useEffect, useState } from 'react';
import {
  FileText, CheckCircle2, XCircle, Clock, AlertCircle, Users, Filter, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { leaveAPI, offeringAPI } from '../../utils/api';

const STATUS_CHIP = {
  PENDING:  'bg-amber-50 text-amber-700 border-amber-200',
  APPROVED: 'bg-green-50 text-green-700 border-green-200',
  REJECTED: 'bg-red-50 text-red-700 border-red-200',
};
const StatusIcon = ({ s }) => {
  if (s === 'APPROVED') return <CheckCircle2 size={14} className="text-green-600" />;
  if (s === 'REJECTED') return <XCircle size={14} className="text-red-600" />;
  return <Clock size={14} className="text-amber-600" />;
};

const BAND = {
  free:    'text-green-700 bg-green-50 border-green-200',
  fined:   'text-amber-700 bg-amber-50 border-amber-200',
  dropoff: 'text-red-700 bg-red-50 border-red-200',
};

const TeacherLeaveApplications = () => {
  const [tab, setTab] = useState('pending');
  const [offerings, setOfferings] = useState([]);
  const [selectedOffering, setSelectedOffering] = useState(null);
  const [pending, setPending] = useState([]);
  const [offeringData, setOfferingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [decision, setDecision] = useState(null);

  useEffect(() => {
    offeringAPI.getMy()
      .then(r => {
        const list = r.data.data || [];
        setOfferings(list);
        if (list.length) setSelectedOffering(list[0]);
      })
      .catch(() => toast.error('Failed to load offerings'));
  }, []);

  const loadPending = () => {
    setLoading(true);
    leaveAPI.getPendingForTeacher()
      .then(r => setPending(r.data.data || []))
      .catch(() => toast.error('Failed to load applications'))
      .finally(() => setLoading(false));
  };
  const loadOffering = (id) => {
    if (!id) return;
    setLoading(true);
    leaveAPI.getOfferingStatus(id)
      .then(r => setOfferingData(r.data.data))
      .catch(() => toast.error('Failed to load leave status'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { if (tab === 'pending') loadPending(); }, [tab]);
  useEffect(() => { if (tab === 'roster' && selectedOffering) loadOffering(selectedOffering.id); }, [tab, selectedOffering]);

  const submitDecision = async () => {
    if (!reviewing || !decision) return;
    try {
      const fn = decision === 'APPROVED' ? leaveAPI.approve : leaveAPI.reject;
      await fn(reviewing.id, reviewNotes);
      toast.success(`Application ${decision.toLowerCase()}`);
      setReviewing(null); setReviewNotes(''); setDecision(null);
      if (tab === 'pending') loadPending();
      else if (selectedOffering) loadOffering(selectedOffering.id);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const pendingCount = pending.filter(a => a.status === 'PENDING').length;

  return (
    <div className="max-w-350 mx-auto">
      <div className="mb-6">
        <h1 className="text-[28px] font-bold text-slate-800 m-0 max-md:text-2xl">Leave Applications</h1>
        <p className="text-sm text-slate-500 m-0 mt-1">Review student leave requests and quota status</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-sm p-2 mb-4 inline-flex">
        <button
          onClick={() => setTab('pending')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${tab === 'pending' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <FileText size={14} className="inline mr-1" /> Applications
          {pendingCount > 0 && <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500 text-white font-bold">{pendingCount}</span>}
        </button>
        <button
          onClick={() => setTab('roster')}
          className={`px-4 py-2 rounded-xl text-sm font-medium transition ${tab === 'roster' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}
        >
          <Users size={14} className="inline mr-1" /> Class Roster
        </button>
      </div>

      {tab === 'pending' && (
        <div className="bg-white rounded-2xl shadow-sm">
          {loading ? (
            <div className="p-10 text-center text-slate-400 text-sm">Loading…</div>
          ) : pending.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">No leave applications.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {pending.map(a => (
                <div key={a.id} className="p-5 flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="font-semibold text-slate-800">{a.student.user.name}</span>
                      <span className="text-xs text-slate-500">({a.student.studentId})</span>
                      <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
                        {a.offering.course.code}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 m-0 mb-1">{a.fromDate} → {a.toDate}</p>
                    <p className="text-xs text-slate-600 m-0">{a.reason}</p>
                    {a.reviewNotes && (
                      <p className="text-xs text-slate-500 mt-1 italic">Review: {a.reviewNotes}</p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${STATUS_CHIP[a.status]}`}>
                      <StatusIcon s={a.status} /> {a.status}
                    </span>
                    {a.status === 'PENDING' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => { setReviewing(a); setDecision('APPROVED'); }}
                          className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700"
                        >Approve</button>
                        <button
                          onClick={() => { setReviewing(a); setDecision('REJECTED'); }}
                          className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700"
                        >Reject</button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'roster' && (
        <>
          <div className="mb-4">
            <select
              value={selectedOffering?.id || ''}
              onChange={e => setSelectedOffering(offerings.find(o => o.id === e.target.value))}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {offerings.map(o => (
                <option key={o.id} value={o.id}>
                  {o.course.code} — {o.course.title} (Sec {o.section})
                </option>
              ))}
            </select>
          </div>

          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-10 text-center text-slate-400 text-sm">Loading…</div>
            ) : !offeringData || offeringData.rows.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-sm">No students.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="text-left px-4 py-3 font-semibold">Student</th>
                      <th className="text-center px-3 py-3 font-semibold">Lectures</th>
                      <th className="text-center px-3 py-3 font-semibold">Present</th>
                      <th className="text-center px-3 py-3 font-semibold">Absent</th>
                      <th className="text-center px-3 py-3 font-semibold">Late</th>
                      <th className="text-center px-3 py-3 font-semibold">Approved</th>
                      <th className="text-center px-3 py-3 font-semibold">n</th>
                      <th className="text-center px-3 py-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {offeringData.rows.map(({ student, enrollmentStatus, counter }) => (
                      <tr key={student.id} className={enrollmentStatus === 'DROPPED' ? 'bg-red-50/40' : ''}>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-800">{student.user.name}</div>
                          <div className="text-xs text-slate-500">{student.studentId}</div>
                        </td>
                        <td className="text-center px-3 py-3">{counter.totalLectures}</td>
                        <td className="text-center px-3 py-3 text-green-700 font-semibold">{counter.present}</td>
                        <td className="text-center px-3 py-3 text-red-700 font-semibold">{counter.absent}</td>
                        <td className="text-center px-3 py-3 text-amber-700 font-semibold">{counter.late}</td>
                        <td className="text-center px-3 py-3 text-blue-700">{counter.approvedLeaveDays}</td>
                        <td className="text-center px-3 py-3 font-bold">{counter.n}</td>
                        <td className="text-center px-3 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${BAND[counter.band]}`}>
                            {enrollmentStatus === 'DROPPED' ? 'Dropped' : counter.band === 'free' ? 'Free' : counter.band === 'fined' ? 'Fined' : 'Drop-off'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Course-scoped applications */}
          {offeringData && offeringData.applications.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm mt-4 p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                <FileText size={14} /> Applications for this course
              </h3>
              <div className="divide-y divide-slate-100">
                {offeringData.applications.map(a => (
                  <div key={a.id} className="py-3 flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="font-medium text-slate-800 text-sm">{a.student.user.name}</span>
                        <span className="text-xs text-slate-500">({a.student.studentId})</span>
                      </div>
                      <p className="text-xs text-slate-700 m-0">{a.fromDate} → {a.toDate} · {a.reason}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_CHIP[a.status]}`}>
                        <StatusIcon s={a.status} /> {a.status}
                      </span>
                      {a.status === 'PENDING' && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => { setReviewing(a); setDecision('APPROVED'); }}
                            className="px-2 py-1 rounded bg-green-600 text-white text-xs hover:bg-green-700"
                          >Approve</button>
                          <button
                            onClick={() => { setReviewing(a); setDecision('REJECTED'); }}
                            className="px-2 py-1 rounded bg-red-600 text-white text-xs hover:bg-red-700"
                          >Reject</button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Review modal */}
      {reviewing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-modal p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 m-0">
                {decision === 'APPROVED' ? 'Approve' : 'Reject'} Application
              </h3>
              <button onClick={() => { setReviewing(null); setReviewNotes(''); setDecision(null); }}
                className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div className="bg-slate-50 rounded-lg p-3 text-sm">
                <p className="m-0 mb-1"><b>{reviewing.student.user.name}</b> ({reviewing.student.studentId})</p>
                <p className="m-0 text-xs text-slate-600">{reviewing.fromDate} → {reviewing.toDate}</p>
                <p className="m-0 text-xs text-slate-600 mt-1">{reviewing.reason}</p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes (optional)</label>
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={e => setReviewNotes(e.target.value)}
                  placeholder="Add a note for the student..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => { setReviewing(null); setReviewNotes(''); setDecision(null); }}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100">Cancel</button>
                <button onClick={submitDecision}
                  className={`px-4 py-2 rounded-lg text-white text-sm font-medium ${decision === 'APPROVED' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                  {decision === 'APPROVED' ? 'Approve' : 'Reject'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherLeaveApplications;
