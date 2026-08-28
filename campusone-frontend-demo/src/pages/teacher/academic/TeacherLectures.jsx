import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus, Trash2, Edit, Download, X, BookOpen, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { holidayAPI, lectureAPI, offeringAPI } from '../../../utils/api';

const inputClass = 'w-full py-2 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10';
const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5';
const DAY_CODES = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAY_NAMES = {
  MON: 'Monday',
  TUE: 'Tuesday',
  WED: 'Wednesday',
  THU: 'Thursday',
  FRI: 'Friday',
  SAT: 'Saturday',
  SUN: 'Sunday',
};

const formatDateInput = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateInput = (value) => {
  const [year, month, day] = (value || '').split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
};

const TODAY = formatDateInput(new Date());
const toDateOnly = (value) => (value ? String(value).slice(0, 10) : '');
const maxDate = (a, b) => (a && b ? (a > b ? a : b) : a || b || '');
const getDayCode = (dateString) => {
  const date = parseDateInput(dateString);
  return date ? DAY_CODES[date.getDay()] : null;
};

const getHolidayForDate = (dateString, holidays, termId) => {
  if (!dateString) return null;
  const monthDay = dateString.slice(5);
  return (holidays || []).find((holiday) => {
    if (holiday.termId && holiday.termId !== termId) return false;
    const holidayDate = toDateOnly(holiday.date);
    return holidayDate === dateString || (holiday.isRecurring && holidayDate.slice(5) === monthDay);
  }) || null;
};

const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });
const sortLecturesByDate = (items = []) => (
  [...items].sort((a, b) => (
    toDateOnly(a.date).localeCompare(toDateOnly(b.date)) ||
    String(a.createdAt || '').localeCompare(String(b.createdAt || ''))
  ))
);
const fmtSlotDate = (dateString) => {
  const date = parseDateInput(dateString);
  return date
    ? date.toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
    : dateString;
};

const buildLectureDateOptions = ({ offering, lectures, holidays, existing }) => {
  const sessions = offering?.sessions || [];
  const scheduledDays = new Set(sessions.map((session) => session.dayOfWeek));
  if (!offering || !scheduledDays.size) return [];

  const termStart = toDateOnly(offering?.term?.startDate);
  const termEnd = toDateOnly(offering?.term?.endDate);
  const earliestAllowed = termStart || '1900-01-01';
  const latestAllowed = termEnd || '2999-12-31';
  const existingLectureDates = new Set(
    (lectures || [])
      .filter((lecture) => lecture.id !== existing?.id)
      .map((lecture) => toDateOnly(lecture.date))
      .filter(Boolean)
  );

  const isAvailable = (dateString) => (
    dateString >= earliestAllowed &&
    dateString <= latestAllowed &&
    scheduledDays.has(getDayCode(dateString)) &&
    !existingLectureDates.has(dateString) &&
    !getHolidayForDate(dateString, holidays, offering.termId)
  );

  const makeOption = (dateString, type) => {
    const dayOfWeek = getDayCode(dateString);
    const slots = sessions
      .filter((session) => session.dayOfWeek === dayOfWeek)
      .map((session) => `slot ${session.slotIndex}${session.room?.code ? ` (${session.room.code})` : ''}`)
      .join(', ');
    return {
      date: dateString,
      type,
      label: `${type === 'previous' ? 'Previous missed' : 'Upcoming'} - ${fmtSlotDate(dateString)}`,
      detail: slots,
    };
  };

  let previous = null;
  const cursor = parseDateInput(TODAY);
  if (cursor) cursor.setDate(cursor.getDate() - 1);
  for (let i = 0; i < 370 && cursor; i += 1) {
    const key = formatDateInput(cursor);
    if (key < earliestAllowed) break;
    if (isAvailable(key)) {
      previous = makeOption(key, 'previous');
      break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }

  const upcoming = [];
  const forwardCursor = parseDateInput(maxDate(TODAY, earliestAllowed));
  for (let i = 0; i < 370 && forwardCursor; i += 1) {
    const key = formatDateInput(forwardCursor);
    if (key > latestAllowed || upcoming.length >= 2) break;
    if (isAvailable(key)) upcoming.push(makeOption(key, 'upcoming'));
    forwardCursor.setDate(forwardCursor.getDate() + 1);
  }

  return [previous, ...upcoming].filter(Boolean);
};

const downloadFile = async (url, filename) => {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename || 'file';
    a.click();
    URL.revokeObjectURL(a.href);
  } catch {
    window.location.href = url;
  }
};

const LectureForm = ({ offeringId, offering, lectures, holidays, existing, onClose, onSaved }) => {
  const existingDate = existing?.date ? toDateOnly(existing.date) : '';
  const lectureDateOptions = useMemo(() => buildLectureDateOptions({
    offering,
    lectures,
    holidays,
    existing,
  }), [existing, holidays, lectures, offering]);
  const [date, setDate] = useState(existingDate || lectureDateOptions[0]?.date || '');
  const [title, setTitle] = useState(existing?.title || '');
  const [description, setDescription] = useState(existing?.description || '');
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existingDate) {
      setDate(existingDate);
      return;
    }
    setDate((currentDate) => (
      lectureDateOptions.some((option) => option.date === currentDate)
        ? currentDate
        : lectureDateOptions[0]?.date || ''
    ));
  }, [existingDate, lectureDateOptions]);

  const selectedDateState = useMemo(() => {
    const dayOfWeek = getDayCode(date);
    const timetableSessions = (offering?.sessions || []).filter((session) => session.dayOfWeek === dayOfWeek);
    const termStart = toDateOnly(offering?.term?.startDate);
    const termEnd = toDateOnly(offering?.term?.endDate);
    const maxAllowed = termEnd || '';
    const holiday = getHolidayForDate(date, holidays, offering?.termId);
    const duplicateLecture = (lectures || []).find((lecture) => (
      lecture.id !== existing?.id && toDateOnly(lecture.date) === date
    ));

    let reason = '';
    if (!offering) reason = 'Offering details are still loading.';
    else if (!offering.sessions?.length) reason = 'No timetable slots are configured for this offering.';
    else if (!existing && !lectureDateOptions.length) reason = 'No available lecture slots found. Holidays and existing lectures are skipped.';
    else if (!date) reason = 'Select a lecture slot.';
    else if (termStart && date < termStart) reason = `Date is before the term start (${termStart}).`;
    else if (termEnd && date > termEnd) reason = `Date is after the term end (${termEnd}).`;
    else if (holiday) reason = `${holiday.name} is a holiday on this date. Lectures cannot be created on holidays.`;
    else if (duplicateLecture) reason = `A lecture already exists on this date: ${duplicateLecture.title}.`;
    else if (!timetableSessions.length) reason = `No ${DAY_NAMES[dayOfWeek] || 'scheduled'} slot exists for this offering.`;

    return {
      dayOfWeek,
      timetableSessions,
      minAllowed: termStart || '',
      maxAllowed,
      canSaveDate: !reason,
      reason,
    };
  }, [date, existing, holidays, lectureDateOptions.length, lectures, offering]);

  const submit = async (e) => {
    e.preventDefault();
    if (!date || !title) { toast.error('Date and title required'); return; }
    if (!selectedDateState.canSaveDate) { toast.error(selectedDateState.reason); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('offeringId', offeringId);
      fd.append('date', date);
      fd.append('title', title);
      if (description) fd.append('description', description);
      if (file) fd.append('material', file);
      if (existing) await lectureAPI.update(existing.id, fd);
      else await lectureAPI.create(fd);
      toast.success(existing ? 'Updated' : 'Created');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-modal p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="font-semibold text-slate-800">{existing ? 'Edit Lecture' : 'New Lecture'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-3">
          <div>
            <label className={labelClass}>{existing ? 'Date *' : 'Lecture slot *'}</label>
            {existing ? (
              <input
                type="date"
                className={inputClass}
                value={date}
                min={selectedDateState.minAllowed}
                max={selectedDateState.maxAllowed}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            ) : (
              <select
                className={inputClass}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                disabled={!lectureDateOptions.length}
                required
              >
                {lectureDateOptions.length ? lectureDateOptions.map((option) => (
                  <option key={option.date} value={option.date}>
                    {option.label}{option.detail ? ` - ${option.detail}` : ''}
                  </option>
                )) : (
                  <option value="">No available lecture slots</option>
                )}
              </select>
            )}
            <div className={`mt-2 rounded-lg border px-3 py-2 text-xs ${
              selectedDateState.canSaveDate
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-amber-200 bg-amber-50 text-amber-800'
            }`}>
              <div className="flex items-start gap-2">
                {selectedDateState.canSaveDate ? <CheckCircle size={15} /> : <AlertCircle size={15} />}
                <div>
                  {selectedDateState.canSaveDate ? (
                    <>
                      <span className="font-semibold">{DAY_NAMES[selectedDateState.dayOfWeek]}</span>
                      {' matches '}
                      {selectedDateState.timetableSessions.map((session) => `slot ${session.slotIndex}${session.room?.code ? ` (${session.room.code})` : ''}`).join(', ')}.
                    </>
                  ) : selectedDateState.reason}
                </div>
              </div>
            </div>
          </div>
          <div>
            <label className={labelClass}>Title *</label>
            <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Variables and Types" required />
          </div>
          <div>
            <label className={labelClass}>Description (optional)</label>
            <textarea className={inputClass} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Material (optional)</label>
            <input type="file" onChange={(e) => setFile(e.target.files[0])} className="w-full text-sm" />
            {existing?.materialName && <p className="text-xs text-slate-500 mt-1">Current: {existing.materialName}</p>}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="inline-flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium border border-gray-200 bg-white text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving || !selectedDateState.canSaveDate} className="inline-flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const TeacherLectures = () => {
  const { offeringId } = useParams();
  const navigate = useNavigate();
  const [offering, setOffering] = useState(null);
  const [lectures, setLectures] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [offRes, lecRes, holRes] = await Promise.all([
        offeringAPI.getById(offeringId),
        lectureAPI.list(offeringId),
        holidayAPI.getAll(),
      ]);
      setOffering(offRes.data.data);
      setLectures(sortLecturesByDate(lecRes.data.data || []));
      setHolidays(holRes.data.data || []);
    } catch {
      toast.error('Failed to load lectures');
    } finally {
      setLoading(false);
    }
  }, [offeringId]);

  useEffect(() => { load(); }, [load]);

  const remove = async (l) => {
    if (!confirm(`Delete lecture "${l.title}"?`)) return;
    try {
      await lectureAPI.delete(l.id);
      toast.success('Deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mb-3">
        <ArrowLeft size={14} />Back
      </button>

      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <BookOpen size={24} className="text-blue-600" />
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Lectures</h1>
            {offering && <p className="text-sm text-slate-500">{offering.course.code} — {offering.course.title} · Sec {offering.section}</p>}
          </div>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="inline-flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700">
          <Plus size={16} />New Lecture
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading…</div>
      ) : lectures.length === 0 ? (
        <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-slate-200">
          No lectures yet. Click <span className="font-semibold">New Lecture</span> to add one.
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold">Date</th>
                <th className="text-left px-4 py-2.5 font-semibold">Title</th>
                <th className="text-left px-4 py-2.5 font-semibold">Material</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lectures.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-700">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={13} className="text-slate-400" />
                      {fmtDate(l.date)}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-slate-800">{l.title}</div>
                    {l.description && <div className="text-xs text-slate-500 mt-0.5">{l.description}</div>}
                  </td>
                  <td className="px-4 py-2.5">
                    {l.materialUrl ? (
                      <button onClick={() => downloadFile(l.materialUrl, l.materialName)} className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs">
                        <Download size={13} />{l.materialName || 'download'}
                      </button>
                    ) : <span className="text-xs text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => { setEditing(l); setShowForm(true); }} className="p-1.5 rounded text-slate-600 hover:bg-slate-100 mr-1"><Edit size={13} /></button>
                    <button onClick={() => remove(l)} className="p-1.5 rounded text-red-500 hover:bg-red-50"><Trash2 size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <LectureForm
          offeringId={offeringId}
          offering={offering}
          lectures={lectures}
          holidays={holidays}
          existing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); load(); }}
        />
      )}
    </div>
  );
};

export default TeacherLectures;
