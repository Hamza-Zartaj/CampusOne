import React, { useState, useEffect } from 'react';
import { CalendarDays } from 'lucide-react';
import toast from 'react-hot-toast';
import { scheduleAPI, studentAPI } from '../../../utils/api';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAY_LABELS = { MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday', FRI: 'Friday', SAT: 'Saturday' };
const COLORS = ['bg-blue-100 border-blue-300 text-blue-800', 'bg-purple-100 border-purple-300 text-purple-800', 'bg-green-100 border-green-300 text-green-800', 'bg-amber-100 border-amber-300 text-amber-800', 'bg-pink-100 border-pink-300 text-pink-800', 'bg-teal-100 border-teal-300 text-teal-800'];
const EMPTY_TIMETABLE = Object.fromEntries(DAYS.map((day) => [day, []]));

const MyTimetable = () => {
  const [timetable, setTimetable] = useState({});
  const [slotTable, setSlotTable] = useState({});
  const [term, setTerm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [primarySection, setPrimarySection] = useState(null);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const [coursesRes, slotsRes] = await Promise.all([
        studentAPI.myCourses(),
        scheduleAPI.getSlots(),
      ]);
      const enrollments = coursesRes.data.data || [];
      setTerm(coursesRes.data.term);
      setSlotTable(slotsRes.data?.data?.slots || {});

      // Derive primary section: the most common section across the student's enrollments
      const sectionCounts = {};
      enrollments.forEach((e) => {
        const s = e.offering?.section;
        if (s) sectionCounts[s] = (sectionCounts[s] || 0) + 1;
      });
      const top = Object.entries(sectionCounts).sort((a, b) => b[1] - a[1])[0];
      setPrimarySection(top ? top[0] : null);

      const byDay = { ...EMPTY_TIMETABLE };

      enrollments.forEach((e, idx) => {
        const sessions = Array.isArray(e.offering?.sessions) ? e.offering.sessions : [];
        sessions.forEach((session) => {
          if (byDay[session.dayOfWeek] !== undefined) {
            byDay[session.dayOfWeek].push({
              code: e.offering?.course?.code,
              title: e.offering?.course?.title,
              section: e.offering?.section,
              teacher: e.offering?.teacher?.user?.name,
              slotIndex: session.slotIndex,
              room: session.room?.code || session.room?.name,
              colorIdx: idx % COLORS.length,
            });
          }
        });
      });

      Object.keys(byDay).forEach((d) => byDay[d].sort((a, b) => a.slotIndex - b.slotIndex));
      setTimetable(byDay);
    } catch {
      toast.error('Failed to load timetable');
    } finally {
      setLoading(false);
    }
  };

  const activeDays = DAYS.filter((d) => timetable[d]?.length > 0);
  const slotDefs = React.useMemo(() => {
    const fromConfig = Object.values(slotTable || {})
      .flat()
      .map((slot) => ({ index: slot.index, start: slot.start, end: slot.end }));

    const seen = new Map();
    for (const slot of fromConfig) {
      if (!seen.has(slot.index)) seen.set(slot.index, slot);
    }

    for (const day of DAYS) {
      for (const cls of timetable[day] || []) {
        if (!seen.has(cls.slotIndex)) seen.set(cls.slotIndex, { index: cls.slotIndex, start: null, end: null });
      }
    }

    return Array.from(seen.values()).sort((a, b) => a.index - b.index);
  }, [slotTable, timetable]);

  const cellMap = React.useMemo(() => {
    const map = {};
    for (const day of DAYS) {
      for (const cls of timetable[day] || []) {
        const key = `${day}-${cls.slotIndex}`;
        if (!map[key]) map[key] = [];
        map[key].push(cls);
      }
    }
    return map;
  }, [timetable]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-3">
          <CalendarDays size={24} className="text-blue-600" />
          <div>
            <h1 className="text-xl font-semibold text-slate-800">My Timetable</h1>
            {term && <p className="text-sm text-slate-500">{term.code} — {term.academicYear}</p>}
          </div>
        </div>
        {primarySection && (
          <div className="px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-sm font-semibold">
            Section {primarySection}
          </div>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading…</div>
      ) : activeDays.length === 0 ? (
        <div className="text-center py-12 text-slate-400">No scheduled classes found. Enroll in courses to see your timetable.</div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-190 border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b">
                  <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 w-32">Day</th>
                  {slotDefs.map((slot) => (
                    <th key={slot.index} className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-slate-500 min-w-40 border-l border-slate-100">
                      <div>Slot {slot.index}</div>
                      <div className="normal-case font-medium text-slate-400 mt-1">
                        {slot.start && slot.end ? `${slot.start} - ${slot.end}` : 'Time not set'}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day) => (
                  <tr key={day} className="border-b last:border-b-0">
                    <td className="px-4 py-4 align-top bg-slate-50/70 text-sm font-semibold text-slate-700">{DAY_LABELS[day]}</td>
                    {slotDefs.map((slot) => {
                      const classes = cellMap[`${day}-${slot.index}`] || [];
                      return (
                        <td key={`${day}-${slot.index}`} className="px-3 py-3 align-top border-l border-slate-100 h-28">
                          {classes.length === 0 ? (
                            <div className="h-full rounded-lg border border-dashed border-slate-200 bg-slate-50/50" />
                          ) : (
                            <div className="space-y-2">
                              {classes.map((cls, index) => (
                                <div key={`${cls.code}-${index}`} className={`rounded-lg border px-3 py-2 ${COLORS[cls.colorIdx]}`}>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-xs font-bold">{cls.code}</span>
                                    <span className="text-xs opacity-70">Sec {cls.section}</span>
                                  </div>
                                  <div className="text-sm font-medium mt-1">{cls.title}</div>
                                  <div className="text-xs opacity-70 mt-1">{cls.teacher}</div>
                                  {cls.room && <div className="text-xs opacity-70">{cls.room}</div>}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyTimetable;
