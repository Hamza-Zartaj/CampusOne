import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle, FileText, CheckCircle2, XCircle, Clock,
  ChevronDown, ChevronUp, Plus, X, BookOpen, Wallet,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { leaveAPI } from '../../utils/api';

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

const BAND_LABEL = {
  free:    { text: 'Within free quota',  color: 'text-green-700 bg-green-50 border-green-200' },
  fined:   { text: 'Fined band',          color: 'text-amber-700 bg-amber-50 border-amber-200' },
  dropoff: { text: 'Drop-off triggered',  color: 'text-red-700 bg-red-50 border-red-200' },
};

const toDateOnly = (value) => (value ? String(value).slice(0, 10) : '');

const parseDateOnly = (value) => {
  const [year, month, day] = toDateOnly(value).split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const formatLectureDate = (dateString) => {
  const date = parseDateOnly(dateString);
  return date
    ? date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: '2-digit' })
    : dateString;
};

const groupConsecutiveDates = (dates) => {
  const sorted = [...dates].sort();
  const groups = [];
  for (const dateString of sorted) {
    const lastGroup = groups[groups.length - 1];
    const previousDate = lastGroup?.[lastGroup.length - 1];
    const previous = parseDateOnly(previousDate);
    if (previous) previous.setDate(previous.getDate() + 1);
    const expectedNext = previous
      ? `${previous.getFullYear()}-${String(previous.getMonth() + 1).padStart(2, '0')}-${String(previous.getDate()).padStart(2, '0')}`
      : null;

    if (lastGroup && expectedNext === dateString) lastGroup.push(dateString);
    else groups.push([dateString]);
  }
  return groups;
};

const StudentLeaveStatus = () => {
  const [data, setData]         = useState([]);
  const [config, setConfig]     = useState({ freeQuota: 4, fineQuota: 6, finePerAbsent: 500, lateWeight: 0.5 });
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ offeringId: '', lectureDates: [], reason: '' });
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    leaveAPI.getMy()
      .then(r => { setData(r.data.data || []); setConfig(r.data.config || config); })
      .catch(() => toast.error('Failed to load leave status'))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const totalUnpaid = data.reduce((s, c) =>
    s + c.fines.filter(f => f.status === 'UNPAID').reduce((x, f) => x + f.amount, 0), 0);
  const dropOffCount = data.filter(c => c.counter.dropOff).length;
  const pendingApps = data.reduce((s, c) => s + c.applications.filter(a => a.status === 'PENDING').length, 0);
  const selectedCourse = useMemo(
    () => data.find(({ enrollment }) => enrollment.offeringId === form.offeringId),
    [data, form.offeringId],
  );
  const selectedLectures = selectedCourse?.upcomingLectures || [];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.offeringId || form.lectureDates.length === 0 || !form.reason.trim()) {
      toast.error('Select a course, at least one lecture, and a reason'); return;
    }
    setSubmitting(true);
    try {
      const groups = groupConsecutiveDates(form.lectureDates);
      await Promise.all(groups.map((dates) => leaveAPI.submitApplication({
        offeringId: form.offeringId,
        fromDate: dates[0],
        toDate: dates[dates.length - 1],
        reason: form.reason,
      })));
      toast.success(groups.length === 1 ? 'Leave application submitted' : `${groups.length} leave applications submitted`);
      setModalOpen(false);
      setForm({ offeringId: '', lectureDates: [], reason: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit');
    } finally { setSubmitting(false); }
  };

  if (loading) {
    return (
      <div className="max-w-350 mx-auto">
        <div className="mb-6">
          <h1 className="text-[28px] font-bold text-slate-800 m-0 max-md:text-2xl">Leave Status</h1>
          <p className="text-sm text-slate-500 m-0 mt-1">Track absences, leaves, and fines per course</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-slate-400 text-sm">Loading…</div>
      </div>
    );
  }

  return (
    <div className="max-w-350 mx-auto">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[28px] font-bold text-slate-800 m-0 max-md:text-2xl">Leave Status</h1>
          <p className="text-sm text-slate-500 m-0 mt-1">
            {config.freeQuota} free units; next {config.fineQuota - config.freeQuota} are fined (PKR {config.finePerAbsent} each); late = {config.lateWeight} unit; over {config.fineQuota} → drop-off
          </p>
        </div>
        <button
          onClick={() => {
            setForm({
              offeringId: data[0]?.enrollment?.offeringId || '',
              lectureDates: [],
              reason: '',
            });
            setModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition"
        >
          <Plus size={16} /> Apply for Leave
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-5 mb-6 max-sm:grid-cols-2">
        {[
          { icon: BookOpen,   label: 'Active Courses', value: data.length,        color: '#3b82f6' },
          { icon: Clock,      label: 'Pending Apps',   value: pendingApps,        color: '#f59e0b' },
          { icon: AlertCircle,label: 'Drop-off Risk',  value: dropOffCount,       color: '#ef4444' },
          { icon: Wallet,     label: 'Unpaid Fines',   value: `PKR ${totalUnpaid}`, color: '#8b5cf6' },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 flex items-center gap-3 shadow-sm">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${s.color}15`, color: s.color }}>
              <s.icon size={22} />
            </div>
            <div>
              <p className="text-xs text-slate-500 m-0 mb-0.5 font-medium">{s.label}</p>
              <h3 className="text-2xl font-bold text-slate-800 m-0">{s.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Per-course rows */}
      {data.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-slate-400 text-sm">
          You are not enrolled in any active courses.
        </div>
      ) : (
        <div className="space-y-3">
          {data.map(({ enrollment, counter, applications, fines }) => {
            const eId = enrollment.id;
            const isOpen = expanded === eId;
            const c = enrollment.offering.course;
            const band = BAND_LABEL[counter.band];
            const unpaidFines = fines.filter(f => f.status === 'UNPAID').reduce((s, f) => s + f.amount, 0);
            return (
              <div key={eId} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <button
                  onClick={() => setExpanded(isOpen ? null : eId)}
                  className="w-full flex items-center justify-between gap-4 p-5 hover:bg-slate-50 transition text-left"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-base font-semibold text-slate-800">{c.code}</span>
                      <span className="text-sm text-slate-500">·</span>
                      <span className="text-sm text-slate-700 truncate">{c.title}</span>
                      <span className="ml-1 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
                        Sec {enrollment.offering.section}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                      <span>Lectures: <b className="text-slate-700">{counter.totalLectures}</b></span>
                      <span>Present: <b className="text-green-700">{counter.present}</b></span>
                      <span>Recorded absent: <b className="text-red-700">{counter.absent}</b></span>
                      <span>Excused: <b className="text-blue-700">{counter.excusedAbsent || 0}</b></span>
                      <span>Counted absent: <b className="text-red-700">{counter.countedAbsent || 0}</b></span>
                      <span>Late: <b className="text-amber-700">{counter.late}</b></span>
                      <span>Approved leaves: <b className="text-blue-700">{counter.approvedLeaveDays}</b></span>
                      <span>n: <b className="text-slate-800">{counter.n}</b></span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${band.color}`}>
                      {band.text}
                    </span>
                    {unpaidFines > 0 && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold border bg-purple-50 text-purple-700 border-purple-200">
                        PKR {unpaidFines}
                      </span>
                    )}
                    {isOpen ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                  </div>
                </button>

                {isOpen && (
                  <div className="px-5 pb-5 border-t border-slate-100 bg-slate-50/50">
                    {/* Applications */}
                    <div className="mt-4 mb-4">
                      <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                        <FileText size={14} /> Leave Applications
                      </h4>
                      {applications.length === 0 ? (
                        <p className="text-xs text-slate-400">No applications submitted.</p>
                      ) : (
                        <div className="space-y-2">
                          {applications.map(a => (
                            <div key={a.id} className="bg-white rounded-lg p-3 border border-slate-200 text-sm">
                              <div className="flex items-center justify-between gap-3 flex-wrap mb-1">
                                <span className="font-medium text-slate-700">{a.fromDate} → {a.toDate}</span>
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_CHIP[a.status]}`}>
                                  <StatusIcon s={a.status} /> {a.status}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 m-0">{a.reason}</p>
                              {a.reviewNotes && (
                                <p className="text-xs text-slate-500 mt-1 italic">Note: {a.reviewNotes}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Fines */}
                    <div>
                      <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                        <Wallet size={14} /> Fines
                      </h4>
                      {fines.length === 0 ? (
                        <p className="text-xs text-slate-400">No fines.</p>
                      ) : (
                        <div className="space-y-2">
                          {fines.map(f => (
                            <div key={f.id} className="bg-white rounded-lg p-3 border border-slate-200 text-sm flex justify-between gap-3">
                              <div>
                                <p className="font-medium text-slate-700 m-0">{f.reason}</p>
                                <p className="text-xs text-slate-500 m-0 mt-0.5">Issued {new Date(f.createdAt).toLocaleDateString()}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-slate-800 m-0">PKR {f.amount}</p>
                                <span className={`text-xs font-semibold ${f.status === 'PAID' ? 'text-green-600' : f.status === 'WAIVED' ? 'text-blue-600' : 'text-red-600'}`}>
                                  {f.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Apply modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-modal p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 m-0">Apply for Leave</h3>
              <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Course</label>
                <select
                  required
                  value={form.offeringId}
                  onChange={e => setForm({ ...form, offeringId: e.target.value, lectureDates: [] })}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">-- select course --</option>
                  {data.map(({ enrollment }) => (
                    <option key={enrollment.id} value={enrollment.offeringId}>
                      {enrollment.offering.course.code} — {enrollment.offering.course.title} (Sec {enrollment.offering.section})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <label className="block text-xs font-semibold text-slate-700">Upcoming lectures</label>
                  {form.lectureDates.length > 0 && (
                    <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-full px-2 py-0.5">
                      {form.lectureDates.length} selected
                    </span>
                  )}
                </div>
                {!form.offeringId ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    Select a course to view its upcoming lecture slots.
                  </div>
                ) : selectedLectures.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    No upcoming lecture slots are available for this course yet.
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
                    {selectedLectures.map((lecture) => {
                      const checked = form.lectureDates.includes(lecture.date);
                      const slotText = (lecture.sessions || [])
                        .map((session) => `S${session.slotIndex}${session.room?.code ? ` - ${session.room.code}` : ''}`)
                        .join(', ');

                      return (
                        <label
                          key={`${lecture.date}-${lecture.dayOfWeek}`}
                          className={`flex items-start gap-3 p-3 cursor-pointer transition ${checked ? 'bg-indigo-50' : 'bg-white hover:bg-slate-50'}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(event) => {
                              setForm((current) => ({
                                ...current,
                                lectureDates: event.target.checked
                                  ? [...current.lectureDates, lecture.date].sort()
                                  : current.lectureDates.filter((date) => date !== lecture.date),
                              }));
                            }}
                            className="mt-1 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-3">
                              <span className="text-sm font-semibold text-slate-800">{formatLectureDate(lecture.date)}</span>
                              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">
                                {lecture.dayOfWeek}
                              </span>
                            </div>
                            <p className="m-0 mt-1 text-sm text-slate-700 truncate">{lecture.title}</p>
                            {slotText && <p className="m-0 mt-1 text-xs text-slate-500">{slotText}</p>}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                )}
                {selectedCourse?.counter && (
                  <p className="m-0 mt-2 text-xs text-slate-500">
                    Current attendance count: n={selectedCourse.counter.n}. Selected approved leaves will cover matching absences.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason</label>
                <textarea
                  required rows={3}
                  value={form.reason}
                  onChange={e => setForm({ ...form, reason: e.target.value })}
                  placeholder="Briefly explain the reason for leave..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100">Cancel</button>
                <button type="submit" disabled={submitting || form.lectureDates.length === 0}
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

export default StudentLeaveStatus;
