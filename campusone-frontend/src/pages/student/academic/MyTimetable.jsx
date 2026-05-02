import React, { useState, useEffect } from 'react';
import { CalendarDays } from 'lucide-react';
import toast from 'react-hot-toast';
import { enrollmentAPI } from '../../../utils/api';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAY_LABELS = { MON: 'Monday', TUE: 'Tuesday', WED: 'Wednesday', THU: 'Thursday', FRI: 'Friday', SAT: 'Saturday' };
const COLORS = ['bg-blue-100 border-blue-300 text-blue-800', 'bg-purple-100 border-purple-300 text-purple-800', 'bg-green-100 border-green-300 text-green-800', 'bg-amber-100 border-amber-300 text-amber-800', 'bg-pink-100 border-pink-300 text-pink-800', 'bg-teal-100 border-teal-300 text-teal-800'];

const MyTimetable = () => {
  const [timetable, setTimetable] = useState({});
  const [term, setTerm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [primarySection, setPrimarySection] = useState(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user?.roleData?.id) load(user.roleData.id);
  }, []);

  const load = async (studentId) => {
    try {
      setLoading(true);
      const res = await enrollmentAPI.getCurrent(studentId);
      const enrollments = res.data.data || [];
      setTerm(res.data.term);

      // Derive primary section: the most common section across the student's enrollments
      const sectionCounts = {};
      enrollments.forEach((e) => {
        const s = e.offering?.section;
        if (s) sectionCounts[s] = (sectionCounts[s] || 0) + 1;
      });
      const top = Object.entries(sectionCounts).sort((a, b) => b[1] - a[1])[0];
      setPrimarySection(top ? top[0] : null);

      const byDay = {};
      DAYS.forEach((d) => (byDay[d] = []));

      enrollments.forEach((e, idx) => {
        const schedule = Array.isArray(e.offering?.schedule) ? e.offering.schedule : [];
        schedule.forEach((s) => {
          if (byDay[s.day] !== undefined) {
            byDay[s.day].push({
              code: e.offering?.course?.code,
              title: e.offering?.course?.title,
              section: e.offering?.section,
              teacher: e.offering?.teacher?.user?.name,
              start: s.start,
              end: s.end,
              room: s.room,
              colorIdx: idx % COLORS.length,
            });
          }
        });
      });

      Object.keys(byDay).forEach((d) => byDay[d].sort((a, b) => a.start.localeCompare(b.start)));
      setTimetable(byDay);
    } catch {
      toast.error('Failed to load timetable');
    } finally {
      setLoading(false);
    }
  };

  const activeDays = DAYS.filter((d) => timetable[d]?.length > 0);

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
        <div className="space-y-4">
          {DAYS.filter((d) => timetable[d]?.length > 0).map((day) => (
            <div key={day} className="bg-white rounded-xl border overflow-hidden">
              <div className="px-5 py-2.5 bg-slate-50 border-b">
                <h3 className="font-semibold text-slate-700 text-sm">{DAY_LABELS[day]}</h3>
              </div>
              <div className="p-4 flex flex-col gap-3">
                {timetable[day].map((cls, i) => (
                  <div key={i} className={`flex items-start gap-4 border rounded-lg px-4 py-3 ${COLORS[cls.colorIdx]}`}>
                    <div className="text-xs font-mono font-semibold whitespace-nowrap pt-0.5">{cls.start}<br />{cls.end}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold">{cls.code}</span>
                        <span className="text-xs opacity-70">Sec {cls.section}</span>
                      </div>
                      <p className="font-medium text-sm">{cls.title}</p>
                      <div className="text-xs opacity-70 mt-0.5">
                        {cls.teacher}{cls.room && ` · ${cls.room}`}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyTimetable;
