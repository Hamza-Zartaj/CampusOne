import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  Search,
  Filter,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  ArrowRightLeft,
  Loader2
} from 'lucide-react';
import { studentPortalAPI } from '../../utils/api';
import toast from 'react-hot-toast';

const CourseRegistration = () => {
  const [offerings, setOfferings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(null);
  const [academicYear, setAcademicYear] = useState('');
  const [semesterNumber, setSemesterNumber] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAll, setShowAll] = useState(false);

  const currentYear = new Date().getFullYear();
  const yearOptions = [`${currentYear - 1}-${currentYear}`, `${currentYear}-${currentYear + 1}`];

  const fetchOfferings = useCallback(async () => {
    if (!academicYear || !semesterNumber) return;
    try {
      setLoading(true);
      const res = await studentPortalAPI.getAvailableOfferings({
        academicYear,
        semesterNumber,
        showAll: showAll ? 'true' : 'false'
      });
      if (res.data.success) {
        setOfferings(res.data.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error fetching offerings');
    } finally {
      setLoading(false);
    }
  }, [academicYear, semesterNumber, showAll]);

  useEffect(() => {
    if (academicYear && semesterNumber) {
      fetchOfferings();
    }
  }, [fetchOfferings]);

  const handleEnroll = async (offeringId) => {
    try {
      setEnrolling(offeringId);
      const res = await studentPortalAPI.enrollInCourse(offeringId);
      if (res.data.success) {
        toast.success(res.data.message);
        fetchOfferings();
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error enrolling');
    } finally {
      setEnrolling(null);
    }
  };

  const filteredOfferings = offerings.filter(o => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.course?.code?.toLowerCase().includes(q) ||
      o.course?.name?.toLowerCase().includes(q) ||
      o.teacher?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[28px] font-bold text-slate-800 m-0 max-md:text-2xl">Course Registration</h1>
        <p className="text-sm text-slate-500 m-0 mt-1">Browse and enroll in available course offerings</p>
      </div>

      {/* Semester Selection */}
      <div className="bg-white rounded-2xl shadow-sm p-5 mb-5">
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Academic Year</label>
            <select
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              className="w-full py-2.5 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-500"
            >
              <option value="">Select Year</option>
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
              <option value="">Select Semester</option>
              {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
              <input
                type="checkbox"
                checked={showAll}
                onChange={(e) => setShowAll(e.target.checked)}
                className="rounded"
              />
              Show all (inc. unavailable)
            </label>
          </div>
        </div>
      </div>

      {/* Search */}
      {academicYear && semesterNumber && (
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-5">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by course code, name, instructor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full py-2.5 pl-10 pr-4 border border-gray-200 rounded-lg text-[0.95rem] focus:outline-none focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10"
            />
          </div>
        </div>
      )}

      {/* Content */}
      {!academicYear || !semesterNumber ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <Filter size={48} className="mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-semibold text-slate-700 mb-1">Select Semester</h3>
          <p className="text-slate-500">Choose an academic year and semester to view available courses.</p>
        </div>
      ) : loading ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-slate-400">
          Loading available offerings...
        </div>
      ) : filteredOfferings.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <AlertCircle size={48} className="mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-semibold text-slate-700 mb-1">No offerings available</h3>
          <p className="text-slate-500">No course offerings found for this semester.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredOfferings.map((item) => (
            <div key={item.offeringId} className="bg-white rounded-2xl shadow-sm p-5">
              <div className="flex items-start justify-between max-sm:flex-col max-sm:gap-3">
                <div className="flex items-start gap-4 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                    <BookOpen size={22} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-[16px] font-semibold text-slate-800 m-0">
                      {item.course?.code} - {item.course?.name}
                    </h3>
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      <span className="text-sm text-slate-500">Section {item.section}</span>
                      <span className="text-slate-300">|</span>
                      <span className="text-sm text-slate-500">{item.course?.creditHours} CH</span>
                      <span className="text-slate-300">|</span>
                      <span className="text-sm text-slate-500 capitalize">{item.course?.type}</span>
                      {item.teacher && (
                        <>
                          <span className="text-slate-300">|</span>
                          <span className="text-sm text-slate-500">{item.teacher}</span>
                        </>
                      )}
                    </div>

                    {/* Capacity Bar */}
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <Users size={14} />
                        {item.capacity?.current}/{item.capacity?.max}
                      </div>
                      <div className="flex-1 max-w-[200px] h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            item.capacity?.available === 0 ? 'bg-red-400' :
                            item.capacity?.available <= 5 ? 'bg-amber-400' : 'bg-green-400'
                          }`}
                          style={{ width: `${Math.min((item.capacity?.current / item.capacity?.max) * 100, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-400">
                        {item.capacity?.available} seats left
                      </span>
                    </div>

                    {/* Prerequisites Warning */}
                    {!item.prerequisites?.satisfied && (
                      <div className="mt-2 flex items-start gap-2 text-sm text-red-600 bg-red-50 rounded-lg p-2.5">
                        <XCircle size={16} className="shrink-0 mt-0.5" />
                        <div>
                          <p className="m-0 font-medium">Prerequisites not met</p>
                          <p className="m-0 text-xs text-red-500">
                            Missing: {item.prerequisites?.missing?.map(p => p.code).join(', ')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  {item.alreadyEnrolled ? (
                    <span className="inline-flex items-center gap-1.5 py-2 px-4 bg-green-50 text-green-700 rounded-lg text-sm font-medium border border-green-200">
                      <CheckCircle2 size={16} /> Enrolled
                    </span>
                  ) : item.enrolledInOtherSection ? (
                    <span className="inline-flex items-center gap-1.5 py-2 px-4 bg-slate-50 text-slate-600 rounded-lg text-sm font-medium border border-slate-200">
                      <ArrowRightLeft size={16} /> In Another Section
                    </span>
                  ) : item.canEnroll ? (
                    <button
                      onClick={() => handleEnroll(item.offeringId)}
                      disabled={enrolling === item.offeringId}
                      className={`inline-flex items-center gap-2 py-2 px-5 rounded-lg text-sm font-medium border-none cursor-pointer transition-all disabled:opacity-50 ${
                        item.willWaitlist
                          ? 'bg-amber-500 text-white hover:bg-amber-600'
                          : 'bg-gradient-primary text-white hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(59,130,246,0.3)]'
                      }`}
                    >
                      {enrolling === item.offeringId ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : item.willWaitlist ? (
                        <>
                          <Clock size={16} /> Join Waitlist
                        </>
                      ) : (
                        'Enroll'
                      )}
                    </button>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 py-2 px-4 bg-slate-50 text-slate-400 rounded-lg text-sm font-medium border border-slate-200">
                      Unavailable
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CourseRegistration;
