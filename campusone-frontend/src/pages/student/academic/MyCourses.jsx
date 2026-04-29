import React, { useState, useEffect } from 'react';
import { BookOpen, Clock, User } from 'lucide-react';
import toast from 'react-hot-toast';
import { enrollmentAPI } from '../../../utils/api';

const DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

const MyCourses = () => {
  const [enrollments, setEnrollments] = useState([]);
  const [term, setTerm] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user?.roleData?.id) load(user.roleData.id);
  }, []);

  const load = async (studentId) => {
    try {
      setLoading(true);
      const res = await enrollmentAPI.getCurrent(studentId);
      setEnrollments(res.data.data || []);
      setTerm(res.data.term);
    } catch {
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const totalCredits = enrollments.reduce((s, e) => s + (e.offering?.course?.creditHours ?? 0), 0);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <BookOpen size={24} className="text-blue-600" />
        <div>
          <h1 className="text-xl font-semibold text-slate-800">My Courses</h1>
          {term && <p className="text-sm text-slate-500">{term.code} — {term.academicYear} · {totalCredits} credit hours enrolled</p>}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading…</div>
      ) : enrollments.length === 0 ? (
        <div className="text-center py-12 text-slate-400">You are not enrolled in any courses this term.</div>
      ) : (
        <div className="grid gap-4">
          {enrollments.map((e) => {
            const offering = e.offering;
            const course = offering?.course;
            const schedule = Array.isArray(offering?.schedule) ? offering.schedule : [];
            return (
              <div key={e.id} className="bg-white rounded-xl border p-5 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded mr-2">{course?.code}</span>
                    <span className="text-xs text-slate-500">Sec {offering?.section}</span>
                    <h3 className="text-base font-semibold text-slate-800 mt-1">{course?.title}</h3>
                  </div>
                  <span className="text-sm font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">{course?.creditHours} cr</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <User size={14} className="text-slate-400" />
                  <span>{offering?.teacher?.user?.name}</span>
                </div>
                {schedule.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {schedule.map((s, i) => (
                      <span key={i} className="flex items-center gap-1 text-xs bg-slate-50 border border-slate-200 px-2 py-1 rounded-lg text-slate-600">
                        <Clock size={11} />{s.day} {s.start}–{s.end} {s.room && `· ${s.room}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyCourses;
