import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  BookOpen,
  Calendar,
  CheckCircle,
  ChevronRight,
  Clock,
  Search,
  Users,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { attendanceAPI, holidayAPI, lectureAPI, offeringAPI } from '../../utils/api';

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

const STATUS_META = {
  PRESENT: {
    label: 'Present',
    icon: CheckCircle,
    text: 'text-emerald-700',
    soft: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    solid: 'bg-emerald-600 border-emerald-600 text-white shadow-sm',
  },
  ABSENT: {
    label: 'Absent',
    icon: XCircle,
    text: 'text-rose-700',
    soft: 'bg-rose-50 border-rose-200 text-rose-700',
    solid: 'bg-rose-600 border-rose-600 text-white shadow-sm',
  },
  LATE: {
    label: 'Late',
    icon: Clock,
    text: 'text-amber-700',
    soft: 'bg-amber-50 border-amber-200 text-amber-700',
    solid: 'bg-amber-500 border-amber-500 text-white shadow-sm',
  },
};

const VIEW_OPTIONS = [
  { id: 'mark', label: 'Mark' },
  { id: 'summary', label: 'Sessions' },
  { id: 'students', label: 'Students' },
];

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
const minDate = (a, b) => (a && b ? (a < b ? a : b) : a || b || '');

const getHolidayForDate = (dateString, holidays, termId) => {
  if (!dateString) return null;
  const monthDay = dateString.slice(5);
  return (holidays || []).find((holiday) => {
    if (holiday.termId && holiday.termId !== termId) return false;
    const holidayDate = toDateOnly(holiday.date);
    return holidayDate === dateString || (holiday.isRecurring && holidayDate.slice(5) === monthDay);
  }) || null;
};

const getDayCode = (dateString) => {
  const date = parseDateInput(dateString);
  return date ? DAY_CODES[date.getDay()] : null;
};

const formatDisplayDate = (dateString) => {
  const date = parseDateInput(dateString);
  if (!date) return 'Select date';
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
};

const offeringLabel = (offering) => `${offering?.course?.code ?? ''} - ${offering?.section ?? ''}`;
const sortLecturesByDate = (items = []) => (
  [...items].sort((a, b) => (
    toDateOnly(a.date).localeCompare(toDateOnly(b.date)) ||
    String(a.createdAt || '').localeCompare(String(b.createdAt || ''))
  ))
);

const getInitials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const buildDefaultStatuses = (studentSummary) => {
  const map = {};
  studentSummary.forEach(({ student }) => {
    map[student.id] = 'PRESENT';
  });
  return map;
};

const getLatestScheduledDate = (offering, holidays = []) => {
  const sessions = offering?.sessions || [];
  const scheduledDays = new Set(sessions.map((session) => session.dayOfWeek));
  if (!scheduledDays.size) return TODAY;

  const termStart = toDateOnly(offering?.term?.startDate);
  const termEnd = toDateOnly(offering?.term?.endDate);
  const latestAllowed = minDate(TODAY, termEnd || TODAY) || TODAY;
  const earliestAllowed = termStart || '1900-01-01';
  const cursor = parseDateInput(latestAllowed);

  for (let i = 0; i < 370 && cursor; i += 1) {
    const key = formatDateInput(cursor);
    if (key < earliestAllowed) break;
    if (
      scheduledDays.has(DAY_CODES[cursor.getDay()]) &&
      !getHolidayForDate(key, holidays, offering.termId)
    ) return key;
    cursor.setDate(cursor.getDate() - 1);
  }

  return latestAllowed;
};

const StatusButtons = ({ value, onChange }) => (
  <div className="grid grid-cols-3 gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
    {Object.entries(STATUS_META).map(([status, meta]) => {
      const Icon = meta.icon;
      const active = value === status;
      return (
        <button
          key={status}
          type="button"
          onClick={() => onChange(status)}
          className={`inline-flex h-9 min-w-24 items-center justify-center gap-1.5 rounded-md border px-3 text-xs font-semibold transition-colors ${
            active ? meta.solid : 'border-transparent bg-white text-slate-600 hover:border-slate-200 hover:bg-slate-100'
          }`}
        >
          <Icon size={15} />
          {meta.label}
        </button>
      );
    })}
  </div>
);

const TeacherAttendance = () => {
  const [searchParams] = useSearchParams();
  const initialOfferingId = searchParams.get('offeringId') || '';
  const [offerings, setOfferings] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState('mark');
  const [sessions, setSessions] = useState([]);
  const [lectures, setLectures] = useState([]);
  const [studentSummary, setStudentSummary] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [markDate, setMarkDate] = useState(TODAY);
  const [saving, setSaving] = useState(false);
  const [savingLecture, setSavingLecture] = useState(false);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [showLectureForm, setShowLectureForm] = useState(false);
  const [lectureForm, setLectureForm] = useState({ title: '', description: '', file: null });

  useEffect(() => {
    Promise.all([
      offeringAPI.getMy({ taPermission: 'MARK_ATTENDANCE' }),
      holidayAPI.getAll(),
    ])
      .then(([offeringResponse, holidayResponse]) => {
        const list = offeringResponse.data.data || [];
        setOfferings(list);
        setHolidays(holidayResponse.data.data || []);
        if (list.length) {
          setSelected(list.find((offering) => offering.id === initialOfferingId) || list[0]);
        }
      })
      .catch(() => toast.error('Failed to load offerings'));
  }, [initialOfferingId]);

  useEffect(() => {
    if (!selected) return;
    setMarkDate(getLatestScheduledDate(selected, holidays));
    setStatuses({});
    setSearch('');
    setShowLectureForm(false);
    setLectureForm({ title: '', description: '', file: null });
  }, [holidays, selected]);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    Promise.all([
      attendanceAPI.getSessions(selected.id),
      attendanceAPI.getStudentSummary(selected.id),
      lectureAPI.list(selected.id),
    ])
      .then(([sessionResponse, studentResponse, lectureResponse]) => {
        setSessions(sessionResponse.data.data || []);
        setStudentSummary(studentResponse.data.data || []);
        setLectures(sortLecturesByDate(lectureResponse.data.data || []));
      })
      .catch(() => toast.error('Failed to load attendance data'))
      .finally(() => setLoading(false));
  }, [selected]);

  const selectedDateState = useMemo(() => {
    const dayOfWeek = getDayCode(markDate);
    const timetableSessions = (selected?.sessions || []).filter((session) => session.dayOfWeek === dayOfWeek);
    const termStart = toDateOnly(selected?.term?.startDate);
    const termEnd = toDateOnly(selected?.term?.endDate);
    const maxAllowed = minDate(TODAY, termEnd || TODAY) || TODAY;
    const holiday = getHolidayForDate(markDate, holidays, selected?.termId);
    const lecture = (lectures || []).find((item) => toDateOnly(item.date) === markDate);

    let reason = '';
    let needsLecture = false;
    if (!selected) reason = 'Select an offering first.';
    else if (!selected.sessions?.length) reason = 'No timetable sessions are configured for this offering.';
    else if (!markDate) reason = 'Select a lecture date.';
    else if (markDate > TODAY) reason = 'Future attendance cannot be marked.';
    else if (termStart && markDate < termStart) reason = `Date is before the term start (${termStart}).`;
    else if (termEnd && markDate > termEnd) reason = `Date is after the term end (${termEnd}).`;
    else if (holiday) reason = `${holiday.name} is a holiday on this date. Attendance cannot be marked on holidays.`;
    else if (!timetableSessions.length) reason = `No ${DAY_NAMES[dayOfWeek] || 'scheduled'} lecture exists for this offering.`;
    else if (!lecture) {
      needsLecture = true;
      reason = 'Create a lecture for this date before marking attendance.';
    }

    return {
      dayOfWeek,
      timetableSessions,
      lecture,
      needsLecture,
      termStart,
      termEnd,
      minAllowed: termStart || '',
      maxAllowed,
      canMark: !reason,
      reason,
    };
  }, [holidays, lectures, selected, markDate]);

  const loadMarkSession = useCallback(async () => {
    if (!selected || !studentSummary.length) return;

    const defaults = buildDefaultStatuses(studentSummary);
    if (!selectedDateState.canMark) {
      setStatuses(defaults);
      return;
    }

    try {
      const response = await attendanceAPI.getSessionDetail(selected.id, markDate);
      const existing = response.data.data || [];
      existing.forEach((record) => {
        defaults[record.studentId] = record.status;
      });
      setStatuses(defaults);
    } catch {
      setStatuses(defaults);
    }
  }, [selected, studentSummary, selectedDateState.canMark, markDate]);

  useEffect(() => {
    if (view === 'mark') loadMarkSession();
  }, [view, loadMarkSession]);

  const setStudentStatus = (studentId, status) => {
    setStatuses((previous) => ({ ...previous, [studentId]: status }));
  };

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return studentSummary;
    return studentSummary.filter(({ student }) => (
      student.user.name.toLowerCase().includes(query)
      || student.studentId.toLowerCase().includes(query)
    ));
  }, [studentSummary, search]);

  const applyBulkStatus = (status) => {
    const targets = filteredStudents.length ? filteredStudents : studentSummary;
    const next = {};
    targets.forEach(({ student }) => {
      next[student.id] = status;
    });
    setStatuses((previous) => ({ ...previous, ...next }));
  };

  const refreshAttendanceData = async () => {
    if (!selected) return;
    const [sessionResponse, studentResponse, lectureResponse] = await Promise.all([
      attendanceAPI.getSessions(selected.id),
      attendanceAPI.getStudentSummary(selected.id),
      lectureAPI.list(selected.id),
    ]);
    setSessions(sessionResponse.data.data || []);
    setStudentSummary(studentResponse.data.data || []);
    setLectures(sortLecturesByDate(lectureResponse.data.data || []));
  };

  const openLectureForm = () => {
    setLectureForm({
      title: `Lecture - ${formatDisplayDate(markDate)}`,
      description: '',
      file: null,
    });
    setShowLectureForm(true);
  };

  const createLectureForDate = async (event) => {
    event.preventDefault();
    if (!selected || !markDate || !lectureForm.title.trim()) {
      toast.error('Lecture title required');
      return;
    }

    setSavingLecture(true);
    try {
      const formData = new FormData();
      formData.append('offeringId', selected.id);
      formData.append('date', markDate);
      formData.append('title', lectureForm.title.trim());
      if (lectureForm.description.trim()) formData.append('description', lectureForm.description.trim());
      if (lectureForm.file) formData.append('material', lectureForm.file);

      await lectureAPI.create(formData);
      toast.success('Lecture created');
      setShowLectureForm(false);
      setLectureForm({ title: '', description: '', file: null });
      await refreshAttendanceData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create lecture');
    } finally {
      setSavingLecture(false);
    }
  };

  const saveAttendance = async () => {
    if (!selected || !studentSummary.length) return;
    if (!selectedDateState.canMark) {
      toast.error(selectedDateState.reason);
      return;
    }

    setSaving(true);
    try {
      const records = studentSummary.map(({ student }) => ({
        studentId: student.id,
        status: statuses[student.id] || 'PRESENT',
      }));
      await attendanceAPI.mark({ offeringId: selected.id, date: markDate, records });
      toast.success(`Attendance saved for ${formatDisplayDate(markDate)}`);
      await refreshAttendanceData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const totalSessions = sessions.length;
  const totalStudents = studentSummary.length;
  const avgAttendance = totalSessions
    ? Math.round(sessions.reduce((sum, row) => sum + (row.total ? (row.present / row.total) * 100 : 0), 0) / totalSessions)
    : 0;
  const atRiskCount = studentSummary.filter((student) => student.isAtRisk).length;
  const statusTotals = studentSummary.reduce((acc, { student }) => {
    const status = statuses[student.id] || 'PRESENT';
    acc[status] += 1;
    return acc;
  }, { PRESENT: 0, ABSENT: 0, LATE: 0 });

  const stats = [
    { icon: Calendar, label: 'Sessions', value: totalSessions, tone: 'bg-blue-50 text-blue-700' },
    { icon: Users, label: 'Students', value: totalStudents, tone: 'bg-cyan-50 text-cyan-700' },
    { icon: CheckCircle, label: 'Average', value: `${avgAttendance}%`, tone: 'bg-emerald-50 text-emerald-700' },
    { icon: AlertCircle, label: 'At Risk', value: atRiskCount, tone: 'bg-rose-50 text-rose-700' },
  ];

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex items-start justify-between gap-4 max-sm:flex-col">
        <div>
          <p className="m-0 text-xs font-semibold uppercase tracking-wider text-blue-600">Teacher workspace</p>
          <h1 className="m-0 mt-1 text-3xl font-bold text-slate-900 max-md:text-2xl">Attendance</h1>
          <p className="m-0 mt-1 text-sm text-slate-500">Mark only the lectures that exist in the course timetable.</p>
        </div>
        <div className="flex rounded-lg border border-slate-200 bg-white p-1 shadow-sm max-sm:w-full">
          {VIEW_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setView(option.id)}
              className={`h-10 rounded-md px-4 text-sm font-semibold transition-colors max-sm:flex-1 ${
                view === option.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        {offerings.length === 0 ? (
          <p className="m-0 text-sm text-slate-500">No offerings assigned.</p>
        ) : (
          <div className="flex gap-2 overflow-x-auto">
            {offerings.map((offering) => (
              <button
                key={offering.id}
                type="button"
                onClick={() => setSelected(offering)}
                className={`flex min-w-44 items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left transition-colors ${
                  selected?.id === offering.id
                    ? 'border-blue-500 bg-blue-50 text-blue-800'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <span>
                  <span className="block text-sm font-bold">{offeringLabel(offering)}</span>
                  <span className="block text-xs text-slate-500">{offering.sessions?.length || 0} timetable slots</span>
                </span>
                {selected?.id === offering.id && <ChevronRight size={16} />}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mb-6 grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-sm:grid-cols-1">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${stat.tone}`}>
                  <Icon size={21} />
                </div>
                <div>
                  <p className="m-0 text-xs font-semibold uppercase tracking-wide text-slate-500">{stat.label}</p>
                  <p className="m-0 text-2xl font-bold text-slate-900">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {loading && (
        <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">
          Loading attendance data...
        </div>
      )}

      {!loading && view === 'mark' && (
        <div className="grid grid-cols-[minmax(0,1fr)_320px] gap-5 max-xl:grid-cols-1">
          <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-start justify-between gap-4 max-md:flex-col">
              <div>
                <h2 className="m-0 text-xl font-bold text-slate-900">Mark lecture attendance</h2>
                <p className="m-0 mt-1 text-sm text-slate-500">
                  {selected ? offeringLabel(selected) : 'Select an offering'}
                </p>
              </div>
              <div className="flex items-center gap-2 max-sm:w-full">
                <input
                  type="date"
                  value={markDate}
                  min={selectedDateState.minAllowed}
                  max={selectedDateState.maxAllowed}
                  onChange={(event) => setMarkDate(event.target.value)}
                  className="h-11 rounded-lg border border-slate-200 px-3 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 max-sm:flex-1"
                />
                <button
                  type="button"
                  onClick={saveAttendance}
                  disabled={saving || !studentSummary.length || !selectedDateState.canMark}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CheckCircle size={18} />
                  {saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>

            <div className={`mb-5 rounded-lg border p-4 ${
              selectedDateState.canMark ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'
            }`}>
              <div className="flex items-start gap-3">
                {selectedDateState.canMark ? (
                  <CheckCircle className="mt-0.5 text-emerald-700" size={20} />
                ) : (
                  <AlertCircle className="mt-0.5 text-amber-700" size={20} />
                )}
                <div>
                  <p className={`m-0 text-sm font-bold ${selectedDateState.canMark ? 'text-emerald-900' : 'text-amber-900'}`}>
                    {formatDisplayDate(markDate)}
                  </p>
                  <p className={`m-0 mt-1 text-sm ${selectedDateState.canMark ? 'text-emerald-700' : 'text-amber-800'}`}>
                    {selectedDateState.canMark
                      ? `${selectedDateState.lecture?.title || 'Lecture'} is ready for attendance.`
                      : selectedDateState.reason}
                  </p>
                  {selectedDateState.needsLecture && (
                    <button
                      type="button"
                      onClick={openLectureForm}
                      className="mt-3 inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 text-xs font-bold text-white transition hover:bg-slate-800"
                    >
                      <BookOpen size={15} />
                      Create Lecture
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-4 grid grid-cols-[1fr_auto] gap-3 max-lg:grid-cols-1">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by name or roll number"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="h-11 w-full rounded-lg border border-slate-200 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(STATUS_META).map(([status, meta]) => {
                  const Icon = meta.icon;
                  return (
                    <button
                      key={status}
                      type="button"
                      onClick={() => applyBulkStatus(status)}
                      className={`inline-flex h-11 items-center justify-center gap-1.5 rounded-lg border px-3 text-xs font-bold transition hover:brightness-95 ${meta.soft}`}
                    >
                      <Icon size={16} />
                      All {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-4 grid grid-cols-3 gap-3 max-sm:grid-cols-1">
              {Object.entries(STATUS_META).map(([status, meta]) => (
                <div key={status} className={`rounded-lg border px-4 py-3 ${meta.soft}`}>
                  <p className="m-0 text-xs font-semibold uppercase tracking-wide opacity-80">{meta.label}</p>
                  <p className="m-0 mt-1 text-2xl font-bold">{statusTotals[status]}</p>
                </div>
              ))}
            </div>

            {filteredStudents.length === 0 ? (
              <p className="m-0 rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                No students match this search.
              </p>
            ) : (
              <div className="space-y-2">
                {filteredStudents.map(({ student }) => (
                  <div
                    key={student.id}
                    className="grid grid-cols-[minmax(220px,1fr)_auto] items-center gap-3 rounded-lg border border-slate-200 bg-white p-3 transition hover:border-slate-300 hover:bg-slate-50 max-lg:grid-cols-1"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-slate-600">
                        {getInitials(student.user.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="m-0 truncate text-sm font-bold text-slate-900">{student.user.name}</p>
                        <p className="m-0 text-xs text-slate-500">{student.studentId}</p>
                      </div>
                    </div>
                    <StatusButtons
                      value={statuses[student.id] || 'PRESENT'}
                      onChange={(status) => setStudentStatus(student.id, status)}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>

          <aside className="space-y-5">
            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="m-0 text-sm font-bold uppercase tracking-wide text-slate-500">Timetable</h3>
              <p className="m-0 mt-1 text-lg font-bold text-slate-900">{selected ? offeringLabel(selected) : '-'}</p>
              <div className="mt-4 space-y-2">
                {(selected?.sessions || []).length === 0 ? (
                  <p className="m-0 rounded-lg border border-dashed border-slate-200 p-4 text-sm text-slate-500">
                    No timetable slots configured.
                  </p>
                ) : (
                  selected.sessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                      <div>
                        <p className="m-0 text-sm font-bold text-slate-800">{DAY_NAMES[session.dayOfWeek]}</p>
                        <p className="m-0 text-xs text-slate-500">Slot {session.slotIndex}</p>
                      </div>
                      <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                        {session.room?.code || 'Room'}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="m-0 text-sm font-bold uppercase tracking-wide text-slate-500">Selected date</h3>
              <p className="m-0 mt-2 text-2xl font-bold text-slate-900">{DAY_NAMES[selectedDateState.dayOfWeek] || '-'}</p>
              <p className="m-0 mt-1 text-sm text-slate-500">{formatDisplayDate(markDate)}</p>
              <div className="mt-4 space-y-2">
                {selectedDateState.timetableSessions.map((session) => (
                  <div key={session.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
                    Slot {session.slotIndex} {session.room?.code ? `in ${session.room.code}` : ''}
                  </div>
                ))}
                {!selectedDateState.timetableSessions.length && (
                  <p className="m-0 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
                    Not a lecture day for this offering.
                  </p>
                )}
              </div>
            </div>
          </aside>
        </div>
      )}

      {!loading && view === 'summary' && (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3 max-sm:flex-col max-sm:items-start">
            <div>
              <h2 className="m-0 text-xl font-bold text-slate-900">Session history</h2>
              <p className="m-0 mt-1 text-sm text-slate-500">{selected ? offeringLabel(selected) : ''}</p>
            </div>
          </div>

          {sessions.length === 0 ? (
            <p className="m-0 rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
              No attendance sessions recorded yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr className="border-b border-slate-200">
                    {['Date', 'Timetable', 'Present', 'Absent', 'Late', 'Rate'].map((heading, index) => (
                      <th
                        key={heading}
                        className={`px-3 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 ${
                          index < 2 ? 'text-left' : 'text-right'
                        }`}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((row) => {
                    const rate = row.total ? Math.round((row.present / row.total) * 100) : 0;
                    const dayCode = getDayCode(row.date);
                    const matched = (selected?.sessions || []).filter((session) => session.dayOfWeek === dayCode);
                    return (
                      <tr key={row.date} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-4 text-sm font-bold text-slate-800">{formatDisplayDate(row.date)}</td>
                        <td className="px-3 py-4">
                          {matched.length ? (
                            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                              {matched.length} slot{matched.length === 1 ? '' : 's'}
                            </span>
                          ) : (
                            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
                              Off timetable
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-4 text-right text-sm font-bold text-emerald-600">{row.present}</td>
                        <td className="px-3 py-4 text-right text-sm font-bold text-rose-600">{row.absent}</td>
                        <td className="px-3 py-4 text-right text-sm font-bold text-amber-600">{row.late}</td>
                        <td className="px-3 py-4 text-right">
                          <div className="inline-flex items-center gap-2">
                            <div className="h-2 w-20 rounded-full bg-slate-100">
                              <div
                                className={`h-2 rounded-full ${rate >= 90 ? 'bg-emerald-500' : rate >= 75 ? 'bg-amber-500' : 'bg-rose-500'}`}
                                style={{ width: `${rate}%` }}
                              />
                            </div>
                            <span className="text-sm font-bold text-slate-800">{rate}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {!loading && view === 'students' && (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="m-0 text-xl font-bold text-slate-900">Student overview</h2>
          <p className="m-0 mt-1 text-sm text-slate-500">{selected ? offeringLabel(selected) : ''}</p>

          {studentSummary.length === 0 ? (
            <p className="m-0 mt-4 rounded-lg border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
              No students enrolled.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[780px]">
                <thead>
                  <tr className="border-b border-slate-200">
                    {['Student', 'Roll No', 'Present', 'Absent', 'Late', 'Rate', 'Status'].map((heading, index) => (
                      <th
                        key={heading}
                        className={`px-3 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 ${
                          index < 2 ? 'text-left' : 'text-right'
                        }`}
                      >
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {studentSummary.map(({ student, present, absent, late, percentage, isAtRisk }) => (
                    <tr key={student.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-4 text-sm font-bold text-slate-800">{student.user.name}</td>
                      <td className="px-3 py-4 text-sm text-slate-500">{student.studentId}</td>
                      <td className="px-3 py-4 text-right text-sm font-bold text-emerald-600">{present}</td>
                      <td className="px-3 py-4 text-right text-sm font-bold text-rose-600">{absent}</td>
                      <td className="px-3 py-4 text-right text-sm font-bold text-amber-600">{late}</td>
                      <td className={`px-3 py-4 text-right text-sm font-bold ${isAtRisk ? 'text-rose-600' : 'text-emerald-600'}`}>
                        {percentage}%
                      </td>
                      <td className="px-3 py-4 text-right">
                        {isAtRisk ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                            <AlertCircle size={14} />
                            At Risk
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            <CheckCircle size={14} />
                            Good
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {showLectureForm && (
        <div className="fixed inset-0 z-modal flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 p-5">
              <div>
                <h3 className="m-0 text-lg font-bold text-slate-900">Create Lecture</h3>
                <p className="m-0 mt-1 text-sm text-slate-500">{formatDisplayDate(markDate)}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowLectureForm(false)}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <XCircle size={18} />
              </button>
            </div>
            <form onSubmit={createLectureForDate} className="space-y-4 p-5">
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Title *</label>
                <input
                  type="text"
                  value={lectureForm.title}
                  onChange={(event) => setLectureForm((previous) => ({ ...previous, title: event.target.value }))}
                  className="h-11 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Description (optional)</label>
                <textarea
                  rows={3}
                  value={lectureForm.description}
                  onChange={(event) => setLectureForm((previous) => ({ ...previous, description: event.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-semibold text-slate-700">Material (optional)</label>
                <input
                  type="file"
                  onChange={(event) => setLectureForm((previous) => ({ ...previous, file: event.target.files?.[0] || null }))}
                  className="w-full text-sm text-slate-700"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLectureForm(false)}
                  className="inline-flex h-10 items-center justify-center rounded-lg border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingLecture}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <BookOpen size={16} />
                  {savingLecture ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherAttendance;
