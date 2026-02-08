import React, { useState, useEffect } from 'react';
import {
  Clock,
  MapPin,
  BookOpen,
  AlertCircle,
  Filter
} from 'lucide-react';
import { studentPortalAPI } from '../../utils/api';
import toast from 'react-hot-toast';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
];

const COLORS = [
  { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200' },
  { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200' },
  { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200' },
  { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200' },
  { bg: 'bg-rose-100', text: 'text-rose-700', border: 'border-rose-200' },
  { bg: 'bg-cyan-100', text: 'text-cyan-700', border: 'border-cyan-200' },
  { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200' },
  { bg: 'bg-indigo-100', text: 'text-indigo-700', border: 'border-indigo-200' },
];

const Timetable = () => {
  const [timetable, setTimetable] = useState({});
  const [loading, setLoading] = useState(true);
  const [academicYear, setAcademicYear] = useState('');
  const [semesterNumber, setSemesterNumber] = useState('');

  const currentYear = new Date().getFullYear();
  const yearOptions = [`${currentYear - 1}-${currentYear}`, `${currentYear}-${currentYear + 1}`];

  useEffect(() => {
    if (academicYear && semesterNumber) {
      fetchTimetable();
    }
  }, [academicYear, semesterNumber]);

  // Auto-fetch without filters too
  useEffect(() => {
    fetchTimetable();
  }, []);

  const fetchTimetable = async () => {
    try {
      setLoading(true);
      const params = {};
      if (academicYear) params.academicYear = academicYear;
      if (semesterNumber) params.semesterNumber = semesterNumber;
      const res = await studentPortalAPI.getMyTimetable(params);
      if (res.data.success) {
        setTimetable(res.data.data);
      }
    } catch (err) {
      if (err.response?.status !== 404) {
        toast.error(err.response?.data?.message || 'Error fetching timetable');
      }
    } finally {
      setLoading(false);
    }
  };

  // Build a color map for courses
  const courseColorMap = {};
  let colorIndex = 0;
  Object.values(timetable).forEach(slots => {
    slots.forEach(slot => {
      if (!courseColorMap[slot.courseCode]) {
        courseColorMap[slot.courseCode] = COLORS[colorIndex % COLORS.length];
        colorIndex++;
      }
    });
  });

  const hasClasses = Object.values(timetable).some(slots => slots.length > 0);

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[28px] font-bold text-slate-800 m-0 max-md:text-2xl">Weekly Timetable</h1>
        <p className="text-sm text-slate-500 m-0 mt-1">Your class schedule at a glance</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm p-5 mb-5">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Academic Year</label>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full py-2.5 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-500"
            >
              <option value="">Current</option>
              {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Semester</label>
            <select
              value={semesterNumber}
              onChange={(e) => setSemesterNumber(e.target.value)}
              className="w-full py-2.5 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-500"
            >
              <option value="">Current</option>
              {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Timetable Grid */}
      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-slate-400">Loading timetable...</div>
      ) : !hasClasses ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <AlertCircle size={48} className="mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-semibold text-slate-700 mb-1">No classes scheduled</h3>
          <p className="text-slate-500">No timetable data available for the selected period.</p>
        </div>
      ) : (
        <>
          {/* Desktop Grid View */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden max-md:hidden">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase border-b border-r border-gray-200 w-20">Time</th>
                    {DAYS.map(day => (
                      <th key={day} className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase border-b border-r border-gray-200 last:border-r-0">
                        {day}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {TIME_SLOTS.map((time, ti) => (
                    <tr key={time}>
                      <td className="py-2 px-3 text-xs font-medium text-slate-400 border-r border-b border-gray-100 text-center">
                        {time}
                      </td>
                      {DAYS.map(day => {
                        const slotsInCell = (timetable[day] || []).filter(s => {
                          const start = s.startTime || '';
                          return start >= time && start < (TIME_SLOTS[ti + 1] || '24:00');
                        });
                        return (
                          <td key={day} className="py-1 px-1.5 border-r border-b border-gray-100 last:border-r-0 align-top min-w-[140px]">
                            {slotsInCell.map((slot, i) => {
                              const colors = courseColorMap[slot.courseCode] || COLORS[0];
                              return (
                                <div key={i} className={`${colors.bg} ${colors.border} border rounded-lg p-2 mb-1`}>
                                  <p className={`text-xs font-bold ${colors.text} m-0`}>{slot.courseCode}</p>
                                  <p className="text-[10px] text-slate-500 m-0 mt-0.5">
                                    {slot.startTime}-{slot.endTime}
                                  </p>
                                  {slot.room && (
                                    <p className="text-[10px] text-slate-400 m-0 flex items-center gap-0.5">
                                      <MapPin size={8} /> {slot.room}
                                    </p>
                                  )}
                                </div>
                              );
                            })}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Day View */}
          <div className="md:hidden grid gap-4">
            {DAYS.map(day => {
              const daySlots = timetable[day] || [];
              if (daySlots.length === 0) return null;
              return (
                <div key={day} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <div className="py-3 px-5 bg-slate-50 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-slate-700 m-0">{day}</h3>
                  </div>
                  <div className="p-4 space-y-3">
                    {daySlots.map((slot, i) => {
                      const colors = courseColorMap[slot.courseCode] || COLORS[0];
                      return (
                        <div key={i} className={`${colors.bg} ${colors.border} border rounded-xl p-3`}>
                          <div className="flex items-center justify-between">
                            <p className={`text-sm font-bold ${colors.text} m-0`}>
                              {slot.courseCode}
                            </p>
                            <span className="text-xs text-slate-500">
                              {slot.startTime} - {slot.endTime}
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 m-0 mt-1">{slot.courseName}</p>
                          <div className="flex items-center gap-3 mt-1">
                            {slot.room && (
                              <span className="text-xs text-slate-400 flex items-center gap-1">
                                <MapPin size={10} /> {slot.room}
                              </span>
                            )}
                            {slot.teacher && (
                              <span className="text-xs text-slate-400">{slot.teacher}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Course Legend */}
          <div className="bg-white rounded-2xl shadow-sm p-5 mt-5">
            <h3 className="text-sm font-semibold text-slate-700 m-0 mb-3">Course Legend</h3>
            <div className="flex flex-wrap gap-3">
              {Object.entries(courseColorMap).map(([code, colors]) => (
                <div key={code} className={`${colors.bg} ${colors.border} border rounded-lg px-3 py-1.5 flex items-center gap-2`}>
                  <BookOpen size={14} className={colors.text} />
                  <span className={`text-sm font-medium ${colors.text}`}>{code}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Timetable;
