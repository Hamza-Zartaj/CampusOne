import React, { useEffect, useState } from 'react';
import {
  GraduationCap, CheckCircle2, XCircle, Clock, AlertCircle, Filter, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { taAPI, termAPI } from '../../utils/api';

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

const TAOversight = () => {
  const [terms, setTerms] = useState([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(null);
  const [decision, setDecision] = useState(null);
  const [reviewNotes, setReviewNotes] = useState('');

  useEffect(() => {
    termAPI.getAll().then((r) => setTerms(r.data.data || [])).catch(() => {});
  }, []);

  const load = () => {
    setLoading(true);
    taAPI.getAll({
      ...(filterStatus ? { status: filterStatus } : {}),
      ...(filterTerm ? { termId: filterTerm } : {}),
    })
      .then((r) => setApps(r.data.data || []))
      .catch(() => toast.error('Failed to load TA assignments'))
      .finally(() => setLoading(false));
  };
  useEffect(load, [filterStatus, filterTerm]);

  const submitDecision = async () => {
    if (!reviewing || !decision) return;
    try {
      if (decision === 'REJECTED') {
        await taAPI.reject(reviewing.id, reviewNotes);
        toast.success('Rejected');
      } else if (decision === 'RELIEVED') {
        await taAPI.relieve(reviewing.id, reviewNotes);
        toast.success('Relieved');
      }
      setReviewing(null); setDecision(null); setReviewNotes('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const counts = {
    PENDING:  apps.filter((a) => a.status === 'PENDING').length,
    APPROVED: apps.filter((a) => a.status === 'APPROVED').length,
    REJECTED: apps.filter((a) => a.status === 'REJECTED').length,
    RELIEVED: apps.filter((a) => a.status === 'RELIEVED').length,
  };

  return (
    <div className="max-w-350 mx-auto">
      <div className="flex items-center justify-between mb-6 max-sm:flex-col max-sm:items-start max-sm:gap-3">
        <div className="flex items-center gap-3">
          <GraduationCap size={24} className="text-indigo-600" />
          <div>
            <h1 className="text-[28px] font-bold text-slate-800 m-0 max-md:text-2xl">TA Oversight</h1>
            <p className="text-sm text-slate-500 m-0 mt-1">All TA applications across the institution</p>
          </div>
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-4 gap-3 mb-6 max-sm:grid-cols-2">
        {[
          { key: 'PENDING',  color: 'amber',  label: 'Pending'  },
          { key: 'APPROVED', color: 'green',  label: 'Active'   },
          { key: 'REJECTED', color: 'red',    label: 'Rejected' },
          { key: 'RELIEVED', color: 'slate',  label: 'Relieved' },
        ].map((s) => (
          <div key={s.key} className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-xs text-slate-500 m-0">{s.label}</p>
            <p className={`text-2xl font-bold text-${s.color}-600 m-0 mt-1`}>{counts[s.key]}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-4 flex items-center gap-3 flex-wrap">
        <Filter size={16} className="text-slate-400" />
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
          className="py-2 px-3 rounded-lg border border-slate-200 text-sm bg-white">
          <option value="">All statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
          <option value="RELIEVED">Relieved</option>
        </select>
        <select value={filterTerm} onChange={(e) => setFilterTerm(e.target.value)}
          className="py-2 px-3 rounded-lg border border-slate-200 text-sm bg-white">
          <option value="">All terms</option>
          {terms.map((t) => (
            <option key={t.id} value={t.id}>{t.code} {t.isActive ? '(active)' : ''}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400 text-sm">Loading…</div>
        ) : apps.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">No assignments match these filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold">Student</th>
                  <th className="text-left px-3 py-3 font-semibold">Sem</th>
                  <th className="text-left px-3 py-3 font-semibold">Course</th>
                  <th className="text-left px-3 py-3 font-semibold">Section</th>
                  <th className="text-left px-3 py-3 font-semibold">Term</th>
                  <th className="text-left px-3 py-3 font-semibold">Teacher</th>
                  <th className="text-left px-3 py-3 font-semibold">Permissions</th>
                  <th className="text-left px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {apps.map((a) => (
                  <tr key={a.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-800">{a.student.user.name}</div>
                      <div className="text-xs text-slate-500">{a.student.studentId}</div>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-600">{a.student.currentSemester}</td>
                    <td className="px-3 py-3">
                      <div className="text-sm font-medium text-slate-800">{a.offering.course.code}</div>
                      <div className="text-xs text-slate-500 truncate max-w-50">{a.offering.course.title}</div>
                    </td>
                    <td className="px-3 py-3 text-sm text-slate-600">{a.offering.section}</td>
                    <td className="px-3 py-3 text-xs text-slate-600">{a.offering.term.code}</td>
                    <td className="px-3 py-3 text-xs text-slate-600">{a.offering.teacher.user.name}</td>
                    <td className="px-3 py-3">
                      {a.status === 'APPROVED' && a.permissions?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {a.permissions.slice(0, 3).map((p) => (
                            <span key={p} className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-700">
                              {p.replace(/_/g, ' ').toLowerCase()}
                            </span>
                          ))}
                          {a.permissions.length > 3 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] text-slate-500">+{a.permissions.length - 3}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${STATUS_CHIP[a.status]}`}>
                        <StatusIcon s={a.status} /> {a.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      {a.status === 'PENDING' && (
                        <button
                          onClick={() => { setReviewing(a); setDecision('REJECTED'); }}
                          className="px-2 py-1 rounded bg-red-600 text-white text-xs hover:bg-red-700"
                        >Reject</button>
                      )}
                      {a.status === 'APPROVED' && (
                        <button
                          onClick={() => { setReviewing(a); setDecision('RELIEVED'); }}
                          className="px-2 py-1 rounded bg-slate-700 text-white text-xs hover:bg-slate-800"
                        >Relieve</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {reviewing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 m-0">
                {decision === 'REJECTED' ? 'Reject Application' : 'Relieve TA'}
              </h3>
              <button onClick={() => { setReviewing(null); setDecision(null); setReviewNotes(''); }}
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
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Notes (optional)</label>
                <textarea rows={3} value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => { setReviewing(null); setDecision(null); setReviewNotes(''); }}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100">Cancel</button>
                <button onClick={submitDecision}
                  className={`px-4 py-2 rounded-lg text-white text-sm font-medium ${decision === 'REJECTED' ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-700 hover:bg-slate-800'}`}>
                  {decision === 'REJECTED' ? 'Reject' : 'Relieve'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TAOversight;
