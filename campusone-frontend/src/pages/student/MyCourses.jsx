import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  Search,
  AlertCircle,
  Clock,
  MapPin,
  User,
  ChevronDown,
  ChevronUp,
  GraduationCap
} from 'lucide-react';
import { studentPortalAPI } from '../../utils/api';
import toast from 'react-hot-toast';

const statusColors = {
  enrolled: { bg: 'bg-green-50', text: 'text-green-700' },
  active: { bg: 'bg-blue-50', text: 'text-blue-700' },
  waitlisted: { bg: 'bg-amber-50', text: 'text-amber-700' },
};

const MyCourses = () => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [totalCredits, setTotalCredits] = useState(0);
  const [dropping, setDropping] = useState(null);

  const fetchCourses = useCallback(async () => {
    try {
      setLoading(true);
      const res = await studentPortalAPI.getCurrentCourses();
      if (res.data.success) {
        setCourses(res.data.data);
        setTotalCredits(res.data.totalCredits || 0);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error fetching courses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  const handleDrop = async (enrollmentId, courseName) => {
    const reason = prompt(`Reason for dropping ${courseName}? (optional)`);
    if (reason === null) return; // cancelled
    try {
      setDropping(enrollmentId);
      const res = await studentPortalAPI.dropCourse(enrollmentId, reason);
      if (res.data.success) {
        toast.success('Course dropped successfully');
        fetchCourses();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error dropping course');
    } finally {
      setDropping(null);
    }
  };

  const filteredCourses = courses.filter(c => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.course?.courseCode?.toLowerCase().includes(q) ||
      c.course?.courseName?.toLowerCase().includes(q) ||
      c.offering?.teacher?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 max-sm:flex-col max-sm:items-start max-sm:gap-3">
        <div>
          <h1 className="text-[28px] font-bold text-slate-800 m-0 max-md:text-2xl">My Courses</h1>
          <p className="text-sm text-slate-500 m-0 mt-1">
            {courses.length} course{courses.length !== 1 ? 's' : ''} &middot; {totalCredits} credit hours
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-5">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by course code, name, or teacher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full py-2.5 pl-10 pr-4 border border-gray-200 rounded-lg text-[0.95rem] focus:outline-none focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10"
          />
        </div>
      </div>

      {/* Courses List */}
      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-slate-400">Loading courses...</div>
      ) : filteredCourses.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <AlertCircle size={48} className="mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-semibold text-slate-700 mb-1">No courses found</h3>
          <p className="text-slate-500">
            {searchQuery ? 'Try a different search term.' : 'You are not enrolled in any courses yet.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredCourses.map((item) => {
            const colors = statusColors[item.status] || statusColors.enrolled;
            const isExpanded = expandedId === item.enrollmentId;
            return (
              <div key={item.enrollmentId} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                <div
                  className="p-5 flex items-center justify-between cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : item.enrollmentId)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <BookOpen size={22} />
                    </div>
                    <div>
                      <h3 className="text-[16px] font-semibold text-slate-800 m-0">
                        {item.course?.courseCode} - {item.course?.courseName}
                      </h3>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-sm text-slate-500">Section {item.offering?.section}</span>
                        <span className="text-slate-300">|</span>
                        <span className="text-sm text-slate-500">{item.course?.creditHours} Credit Hours</span>
                        {item.offering?.teacher && (
                          <>
                            <span className="text-slate-300">|</span>
                            <span className="text-sm text-slate-500 flex items-center gap-1">
                              <User size={13} /> {item.offering.teacher}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${colors.bg} ${colors.text}`}>
                      {item.status}
                    </span>
                    {item.status === 'waitlisted' && item.waitlistPosition && (
                      <span className="text-xs text-amber-600 font-medium">#{item.waitlistPosition}</span>
                    )}
                    {isExpanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-5 pb-5 border-t border-gray-100">
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mt-4">
                      {/* Schedule */}
                      {item.offering?.schedule && item.offering.schedule.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Schedule</p>
                          {item.offering.schedule.map((slot, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm text-slate-600 mb-1">
                              <Clock size={14} className="text-slate-400" />
                              {slot.day} {slot.startTime}-{slot.endTime}
                              {slot.room && (
                                <span className="flex items-center gap-1 text-slate-400">
                                  <MapPin size={12} /> {slot.room}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Marks */}
                      {item.marks && (item.marks.midterm != null || item.marks.final != null || item.marks.total != null) && (
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Marks</p>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { label: 'Midterm', val: item.marks.midterm },
                              { label: 'Final', val: item.marks.final },
                              { label: 'Assignment', val: item.marks.assignment },
                              { label: 'Quiz', val: item.marks.quiz },
                              { label: 'Lab', val: item.marks.lab },
                              { label: 'Total', val: item.marks.total },
                            ].map(m => (
                              <div key={m.label} className="bg-slate-50 rounded-lg px-3 py-2 text-center">
                                <p className="text-xs text-slate-400 m-0">{m.label}</p>
                                <p className="text-sm font-bold text-slate-700 m-0">{m.val ?? '-'}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Info */}
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-2">Details</p>
                        <div className="text-sm text-slate-600 space-y-1">
                          <p className="m-0">Type: <span className="font-medium capitalize">{item.course?.courseType || item.enrollmentType}</span></p>
                          <p className="m-0">Semester: {item.offering?.semesterNumber}, {item.offering?.academicYear}</p>
                          {item.enrolledAt && <p className="m-0">Enrolled: {new Date(item.enrolledAt).toLocaleDateString()}</p>}
                        </div>
                      </div>
                    </div>

                    {/* Drop Button */}
                    {['enrolled', 'active', 'waitlisted'].includes(item.status) && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDrop(item.enrollmentId, `${item.course?.courseCode} - ${item.course?.courseName}`);
                          }}
                          disabled={dropping === item.enrollmentId}
                          className="inline-flex items-center gap-2 py-2 px-4 bg-red-50 text-red-600 rounded-lg text-sm font-medium border border-red-200 hover:bg-red-100 cursor-pointer transition-all disabled:opacity-50"
                        >
                          {dropping === item.enrollmentId ? 'Dropping...' : 'Drop Course'}
                        </button>
                      </div>
                    )}
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
