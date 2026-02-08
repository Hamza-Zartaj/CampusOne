import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  X,
  AlertCircle,
  AlertTriangle,
  Filter,
  ChevronLeft,
  ChevronRight,
  Eye,
  Users,
  Calendar,
  Clock,
  MapPin,
  GraduationCap,
  Check,
  UserCheck,
  ArrowRightLeft,
  LogOut,
  Loader2,
  Info,
  ShieldAlert,
  Hash,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { courseOfferingAPI, enrollmentAPI, programAPI } from '../../utils/api';

const inputClass = "w-full py-2.5 px-3.5 border border-gray-200 rounded-lg text-[0.95rem] transition-all focus:outline-none focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10";
const labelClass = "block text-[0.9rem] font-medium text-slate-800 mb-2";
const btnPrimaryClass = "inline-flex items-center gap-2 py-2.5 px-5 border-none rounded-lg text-[0.95rem] font-medium cursor-pointer transition-all bg-gradient-primary text-white hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(59,130,246,0.3)] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none";
const btnSecondaryClass = "inline-flex items-center gap-2 py-2.5 px-5 border border-gray-200 rounded-lg text-[0.95rem] font-medium cursor-pointer transition-all bg-white text-slate-800 hover:bg-slate-50 hover:border-gray-300";

const STATUS_BADGES = {
  enrolled: { bg: 'bg-blue-50', text: 'text-blue-700', icon: CheckCircle },
  active: { bg: 'bg-emerald-50', text: 'text-emerald-700', icon: CheckCircle },
  completed: { bg: 'bg-slate-100', text: 'text-slate-600', icon: Check },
  dropped: { bg: 'bg-red-50', text: 'text-red-700', icon: XCircle },
  withdrawn: { bg: 'bg-orange-50', text: 'text-orange-700', icon: LogOut },
  failed: { bg: 'bg-red-50', text: 'text-red-700', icon: XCircle },
  waitlisted: { bg: 'bg-amber-50', text: 'text-amber-700', icon: Clock },
  incomplete: { bg: 'bg-yellow-50', text: 'text-yellow-700', icon: AlertTriangle },
};

const ENROLLMENT_STATUS_COLORS = {
  open: { bg: 'bg-green-50', text: 'text-green-700' },
  closed: { bg: 'bg-red-50', text: 'text-red-700' },
  waitlist: { bg: 'bg-amber-50', text: 'text-amber-700' },
};

const currentYear = new Date().getFullYear();
const ACADEMIC_YEARS = Array.from({ length: 5 }, (_, i) => `${currentYear - 2 + i}-${currentYear - 1 + i}`);

const StudentEnrollment = () => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const studentProfile = user.profile || {};
  const studentId = studentProfile._id || '';

  // Tab state: 'my-courses' or 'browse'
  const [activeTab, setActiveTab] = useState('my-courses');

  // My enrollments
  const [enrollments, setEnrollments] = useState([]);
  const [loadingEnrollments, setLoadingEnrollments] = useState(true);
  const [enrollmentFilter, setEnrollmentFilter] = useState('');

  // Browse offerings
  const [offerings, setOfferings] = useState([]);
  const [loadingOfferings, setLoadingOfferings] = useState(false);
  const [offeringPage, setOfferingPage] = useState(1);
  const [offeringPagination, setOfferingPagination] = useState({ total: 0, totalPages: 1 });
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProgram, setFilterProgram] = useState('');
  const [filterYear, setFilterYear] = useState(`${currentYear}-${currentYear + 1}`);
  const [filterSemester, setFilterSemester] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Reference
  const [programs, setPrograms] = useState([]);

  // UI state
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Enroll modal
  const [enrollModal, setEnrollModal] = useState(null); // offering object
  const [prereqCheck, setPrereqCheck] = useState(null);
  const [checkingPrereq, setCheckingPrereq] = useState(false);
  const [enrolling, setEnrolling] = useState(false);

  // Drop modal
  const [dropModal, setDropModal] = useState(null); // enrollment object
  const [dropReason, setDropReason] = useState('');
  const [dropping, setDropping] = useState(false);

  // Swap modal
  const [swapModal, setSwapModal] = useState(null); // enrollment to swap FROM
  const [swapTarget, setSwapTarget] = useState(null); // offering to swap TO
  const [swapSearch, setSwapSearch] = useState('');
  const [swapResults, setSwapResults] = useState([]);
  const [swapping, setSwapping] = useState(false);
  const [swapPrereqCheck, setSwapPrereqCheck] = useState(null);

  // Detail modal
  const [detailEnrollment, setDetailEnrollment] = useState(null);

  // Load programs
  useEffect(() => {
    programAPI.getAllPrograms({ limit: 200 }).then(res => {
      if (res.data.success) setPrograms(res.data.data);
    }).catch(() => {});
  }, []);

  // Load enrollments
  const fetchEnrollments = useCallback(async () => {
    if (!studentId) return;
    setLoadingEnrollments(true);
    try {
      const params = {};
      if (enrollmentFilter) params.status = enrollmentFilter;
      const res = await enrollmentAPI.getStudentEnrollments(studentId, params);
      if (res.data.success) {
        setEnrollments(res.data.data || []);
      }
    } catch (err) {
      console.error('Error loading enrollments:', err);
    } finally {
      setLoadingEnrollments(false);
    }
  }, [studentId, enrollmentFilter]);

  useEffect(() => { fetchEnrollments(); }, [fetchEnrollments]);

  // Load offerings for browsing
  const fetchOfferings = useCallback(async () => {
    setLoadingOfferings(true);
    try {
      const params = { page: offeringPage, limit: 10, enrollmentStatus: 'open' };
      if (searchQuery) params.search = searchQuery;
      if (filterProgram) params.program = filterProgram;
      if (filterYear) params.academicYear = filterYear;
      if (filterSemester) params.semesterNumber = filterSemester;

      const res = await courseOfferingAPI.getAllOfferings(params);
      if (res.data.success) {
        setOfferings(res.data.data);
        setOfferingPagination(res.data.pagination || { total: res.data.count || 0, totalPages: 1 });
      }
    } catch (err) {
      console.error('Error loading offerings:', err);
    } finally {
      setLoadingOfferings(false);
    }
  }, [offeringPage, searchQuery, filterProgram, filterYear, filterSemester]);

  useEffect(() => {
    if (activeTab === 'browse') fetchOfferings();
  }, [activeTab, fetchOfferings]);

  // Check prerequisites when opening enroll modal
  const openEnrollModal = async (offering) => {
    setEnrollModal(offering);
    setPrereqCheck(null);
    const courseId = typeof offering.course === 'object' ? offering.course._id : offering.course;
    if (!studentId || !courseId) return;

    setCheckingPrereq(true);
    try {
      const res = await enrollmentAPI.checkPrerequisites(studentId, courseId);
      if (res.data.success) {
        setPrereqCheck(res.data.data);
      }
    } catch (err) {
      // Endpoint might not be available — just show warning
      setPrereqCheck({ satisfied: true, missing: [] });
    } finally {
      setCheckingPrereq(false);
    }
  };

  // Enroll
  const handleEnroll = async (forceEnroll = false) => {
    if (!enrollModal || !studentId) return;
    setEnrolling(true);
    setError('');
    try {
      const res = await enrollmentAPI.enroll(studentId, enrollModal._id, 'regular', forceEnroll);
      if (res.data.success) {
        setSuccess(res.data.message || 'Successfully enrolled');
        setEnrollModal(null);
        fetchEnrollments();
        if (activeTab === 'browse') fetchOfferings();
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Enrollment failed';
      // Check for prerequisite failure
      if (err.response?.data?.missingPrerequisites) {
        setPrereqCheck({ satisfied: false, missing: err.response.data.missingPrerequisites });
      }
      setError(msg);
    } finally {
      setEnrolling(false);
    }
  };

  // Drop
  const handleDrop = async () => {
    if (!dropModal) return;
    setDropping(true);
    setError('');
    try {
      const res = await enrollmentAPI.drop(dropModal._id, dropReason);
      if (res.data.success) {
        setSuccess('Course dropped successfully');
        setDropModal(null);
        setDropReason('');
        fetchEnrollments();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to drop course');
    } finally {
      setDropping(false);
    }
  };

  // Swap: drop old + enroll new
  const openSwapModal = (enrollment) => {
    setSwapModal(enrollment);
    setSwapTarget(null);
    setSwapSearch('');
    setSwapResults([]);
    setSwapPrereqCheck(null);
  };

  const searchSwapOfferings = async (q) => {
    setSwapSearch(q);
    if (!q.trim()) { setSwapResults([]); return; }
    try {
      const res = await courseOfferingAPI.getAllOfferings({ search: q, enrollmentStatus: 'open', limit: 8 });
      if (res.data.success) {
        // Exclude current enrollment's offering
        const currentOfferingId = typeof swapModal?.courseOffering === 'object' ? swapModal.courseOffering._id : swapModal?.courseOffering;
        setSwapResults((res.data.data || []).filter(o => o._id !== currentOfferingId));
      }
    } catch { setSwapResults([]); }
  };

  const selectSwapTarget = async (offering) => {
    setSwapTarget(offering);
    setSwapResults([]);
    setSwapSearch(typeof offering.course === 'object' ? `${offering.course.courseCode} - ${offering.course.courseName}` : '');
    setSwapPrereqCheck(null);

    // Check prerequisites for target
    const courseId = typeof offering.course === 'object' ? offering.course._id : offering.course;
    if (studentId && courseId) {
      try {
        const res = await enrollmentAPI.checkPrerequisites(studentId, courseId);
        if (res.data.success) setSwapPrereqCheck(res.data.data);
      } catch {
        setSwapPrereqCheck({ satisfied: true, missing: [] });
      }
    }
  };

  const handleSwap = async () => {
    if (!swapModal || !swapTarget || !studentId) return;
    setSwapping(true);
    setError('');
    try {
      // Step 1: Drop current enrollment
      await enrollmentAPI.drop(swapModal._id, 'Course swap');
      // Step 2: Enroll in new offering
      const res = await enrollmentAPI.enroll(studentId, swapTarget._id, 'regular', false);
      if (res.data.success) {
        setSuccess('Course swapped successfully');
        setSwapModal(null);
        setSwapTarget(null);
        fetchEnrollments();
        if (activeTab === 'browse') fetchOfferings();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Swap failed. The original course was dropped, please re-enroll manually if needed.');
      fetchEnrollments();
    } finally {
      setSwapping(false);
    }
  };

  // Helpers
  const getOfferingCourse = (o) => typeof o.course === 'object' ? o.course : {};
  const getOfferingTeacher = (o) => {
    const t = o.teacher;
    if (!t || typeof t !== 'object') return 'TBA';
    const u = t.userId || t;
    return `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'TBA';
  };

  // Enrollment stats
  const activeEnrollments = enrollments.filter(e => ['enrolled', 'active'].includes(e.status));
  const waitlistedEnrollments = enrollments.filter(e => e.status === 'waitlisted');
  const completedEnrollments = enrollments.filter(e => e.status === 'completed');
  const totalCredits = activeEnrollments.reduce((sum, e) => {
    const co = typeof e.courseOffering === 'object' ? e.courseOffering : {};
    const course = typeof co.course === 'object' ? co.course : {};
    return sum + (course.creditHours || 0);
  }, 0);

  return (
    <div className="p-8 max-w-[1400px] mx-auto max-md:p-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[2rem] font-bold text-slate-800 m-0">Enrollment</h1>
        <p className="text-[0.95rem] text-slate-500 mt-1">View your courses, browse offerings, and manage enrollment</p>
      </div>

      {/* Alerts */}
      {success && (
        <div className="flex items-center gap-3 py-4 px-5 rounded-lg mb-6 text-[0.95rem] bg-green-50 text-green-800 border border-green-200">
          <Check size={18} /><span>{success}</span>
          <button onClick={() => setSuccess('')} className="ml-auto bg-transparent border-none cursor-pointer text-inherit opacity-70 hover:opacity-100"><X size={16} /></button>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 py-4 px-5 rounded-lg mb-6 text-[0.95rem] bg-red-50 text-red-800 border border-red-200">
          <AlertCircle size={18} /><span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto bg-transparent border-none cursor-pointer text-inherit opacity-70 hover:opacity-100"><X size={16} /></button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6 max-md:grid-cols-2">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><BookOpen size={20} /></div>
            <p className="text-xs text-slate-500 font-medium">Enrolled</p>
          </div>
          <p className="text-2xl font-bold text-slate-800 m-0">{activeEnrollments.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"><Hash size={20} /></div>
            <p className="text-xs text-slate-500 font-medium">Credits</p>
          </div>
          <p className="text-2xl font-bold text-slate-800 m-0">{totalCredits}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center"><Clock size={20} /></div>
            <p className="text-xs text-slate-500 font-medium">Waitlisted</p>
          </div>
          <p className="text-2xl font-bold text-slate-800 m-0">{waitlistedEnrollments.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center"><GraduationCap size={20} /></div>
            <p className="text-xs text-slate-500 font-medium">Completed</p>
          </div>
          <p className="text-2xl font-bold text-slate-800 m-0">{completedEnrollments.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-slate-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => setActiveTab('my-courses')}
          className={`py-2.5 px-5 rounded-md text-sm font-medium transition-all border-none cursor-pointer ${
            activeTab === 'my-courses'
              ? 'bg-white text-primary-700 shadow-sm'
              : 'bg-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <BookOpen size={16} className="inline mr-2 -mt-0.5" />My Courses
        </button>
        <button
          onClick={() => setActiveTab('browse')}
          className={`py-2.5 px-5 rounded-md text-sm font-medium transition-all border-none cursor-pointer ${
            activeTab === 'browse'
              ? 'bg-white text-primary-700 shadow-sm'
              : 'bg-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Search size={16} className="inline mr-2 -mt-0.5" />Browse Offerings
        </button>
      </div>

      {/* ============ MY COURSES TAB ============ */}
      {activeTab === 'my-courses' && (
        <div>
          {/* Filter row */}
          <div className="flex gap-3 mb-5 max-md:flex-col">
            <select value={enrollmentFilter} onChange={(e) => setEnrollmentFilter(e.target.value)} className={`${inputClass} max-w-[200px] max-md:max-w-none`}>
              <option value="">All Statuses</option>
              <option value="enrolled">Enrolled</option>
              <option value="active">Active</option>
              <option value="waitlisted">Waitlisted</option>
              <option value="completed">Completed</option>
              <option value="dropped">Dropped</option>
              <option value="withdrawn">Withdrawn</option>
            </select>
          </div>

          {loadingEnrollments ? (
            <div className="flex justify-center items-center py-16 text-slate-500">
              <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-primary-500 rounded-full animate-spin mr-3"></div>
              Loading enrollments...
            </div>
          ) : enrollments.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <BookOpen size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-lg text-slate-500 mb-2">No enrollments found</p>
              <p className="text-sm text-slate-400 mb-4">Browse available offerings to enroll in courses</p>
              <button onClick={() => setActiveTab('browse')} className={btnPrimaryClass}>
                <Search size={18} /> Browse Offerings
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {enrollments.map(enrollment => {
                const co = typeof enrollment.courseOffering === 'object' ? enrollment.courseOffering : {};
                const course = typeof co.course === 'object' ? co.course : {};
                const teacher = co.teacher;
                const teacherName = teacher && typeof teacher === 'object'
                  ? `${(teacher.userId || teacher).firstName || ''} ${(teacher.userId || teacher).lastName || ''}`.trim()
                  : 'TBA';
                const badge = STATUS_BADGES[enrollment.status] || STATUS_BADGES.enrolled;
                const BadgeIcon = badge.icon;
                const canDrop = ['enrolled', 'active', 'waitlisted'].includes(enrollment.status);
                const canSwap = ['enrolled', 'active'].includes(enrollment.status);

                return (
                  <div key={enrollment._id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between p-5 max-md:flex-col max-md:items-start max-md:gap-3">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary-500 to-cyan-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
                          {course.courseCode?.slice(0, 3) || 'N/A'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-base font-semibold text-slate-800 m-0">{course.courseCode || 'N/A'}</h3>
                            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded capitalize ${badge.bg} ${badge.text}`}>
                              <BadgeIcon size={12} /> {enrollment.status}
                            </span>
                            {enrollment.status === 'waitlisted' && enrollment.waitlistPosition && (
                              <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-medium">
                                Position #{enrollment.waitlistPosition}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-500 m-0 mt-0.5 truncate">{course.courseName || 'N/A'}</p>
                          <div className="flex items-center gap-3 mt-1 flex-wrap">
                            <span className="text-xs text-slate-400">{course.creditHours || 0} Credits</span>
                            <span className="text-xs text-slate-400">Section {co.section || '—'}</span>
                            <span className="text-xs text-slate-400">{teacherName}</span>
                            <span className="text-xs text-slate-400">{enrollment.academicYear} Sem {enrollment.semesterNumber}</span>
                          </div>
                        </div>
                      </div>

                      {/* Schedule preview */}
                      {co.schedule?.length > 0 && (
                        <div className="flex flex-col gap-0.5 mr-4 max-md:mr-0 shrink-0">
                          {co.schedule.slice(0, 3).map((s, i) => (
                            <span key={i} className="text-xs text-slate-400">
                              {s.day?.slice(0, 3)} {s.startTime}–{s.endTime}
                              {s.room && <span className="ml-1 text-slate-300">({s.room})</span>}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Grade info */}
                      {enrollment.grade && (
                        <div className="text-center px-4 shrink-0">
                          <p className="text-2xl font-bold text-slate-800 m-0">{enrollment.grade}</p>
                          <p className="text-xs text-slate-400 m-0">Grade</p>
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => setDetailEnrollment(enrollment)} title="Details" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors bg-transparent border-none cursor-pointer">
                          <Eye size={18} />
                        </button>
                        {canSwap && (
                          <button onClick={() => openSwapModal(enrollment)} title="Swap" className="p-2 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors bg-transparent border-none cursor-pointer">
                            <ArrowRightLeft size={18} />
                          </button>
                        )}
                        {canDrop && (
                          <button onClick={() => { setDropModal(enrollment); setDropReason(''); }} title="Drop" className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors bg-transparent border-none cursor-pointer">
                            <LogOut size={18} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============ BROWSE OFFERINGS TAB ============ */}
      {activeTab === 'browse' && (
        <div>
          {/* Search */}
          <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
            <div className="flex gap-3 items-center max-md:flex-col max-md:items-stretch">
              <div className="flex-1 relative">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text" value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setOfferingPage(1); }}
                  placeholder="Search course code or name..."
                  className={`${inputClass} pl-11`}
                />
              </div>
              <button className={btnSecondaryClass} onClick={() => setShowFilters(!showFilters)}>
                <Filter size={18} /> Filters
              </button>
            </div>
            {showFilters && (
              <div className="grid grid-cols-3 gap-3 mt-4 max-md:grid-cols-1">
                <select value={filterProgram} onChange={(e) => { setFilterProgram(e.target.value); setOfferingPage(1); }} className={inputClass}>
                  <option value="">All Programs</option>
                  {programs.map(p => <option key={p._id} value={p._id}>{p.programCode} - {p.name}</option>)}
                </select>
                <select value={filterYear} onChange={(e) => { setFilterYear(e.target.value); setOfferingPage(1); }} className={inputClass}>
                  <option value="">All Years</option>
                  {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <select value={filterSemester} onChange={(e) => { setFilterSemester(e.target.value); setOfferingPage(1); }} className={inputClass}>
                  <option value="">All Semesters</option>
                  <option value="1">Semester 1</option><option value="2">Semester 2</option><option value="3">Summer</option>
                </select>
              </div>
            )}
          </div>

          {/* Offering Cards */}
          {loadingOfferings ? (
            <div className="flex justify-center items-center py-16 text-slate-500">
              <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-primary-500 rounded-full animate-spin mr-3"></div>
              Loading offerings...
            </div>
          ) : offerings.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm p-12 text-center">
              <Search size={48} className="mx-auto text-slate-300 mb-4" />
              <p className="text-lg text-slate-500 mb-2">No open offerings found</p>
              <p className="text-sm text-slate-400">Try adjusting your search or filters</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 mb-6 max-lg:grid-cols-1">
                {offerings.map(offering => {
                  const course = getOfferingCourse(offering);
                  const teacher = getOfferingTeacher(offering);
                  const capacity = offering.currentEnrollment || 0;
                  const max = offering.maxCapacity || 60;
                  const pct = Math.round((capacity / max) * 100);
                  const ec = ENROLLMENT_STATUS_COLORS[offering.enrollmentStatus] || ENROLLMENT_STATUS_COLORS.open;
                  const isAlreadyEnrolled = enrollments.some(e => {
                    const ecoId = typeof e.courseOffering === 'object' ? e.courseOffering._id : e.courseOffering;
                    return ecoId === offering._id && !['dropped', 'withdrawn'].includes(e.status);
                  });

                  return (
                    <div key={offering._id} className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-base font-bold text-slate-800 m-0">{course.courseCode || 'N/A'}</h3>
                              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-medium">Sec {offering.section}</span>
                              <span className={`text-xs font-medium px-2 py-0.5 rounded capitalize ${ec.bg} ${ec.text}`}>{offering.enrollmentStatus}</span>
                            </div>
                            <p className="text-sm text-slate-600 m-0">{course.courseName || ''}</p>
                          </div>
                          <span className="text-sm font-bold text-primary-600 bg-primary-50 px-2.5 py-1 rounded-lg shrink-0">
                            {course.creditHours || 0} CR
                          </span>
                        </div>

                        <div className="flex items-center gap-4 text-xs text-slate-500 mb-3 flex-wrap">
                          <span className="flex items-center gap-1"><Calendar size={13} />{offering.academicYear} Sem {offering.semesterNumber}</span>
                          <span className="flex items-center gap-1"><UserCheck size={13} />{teacher}</span>
                          <span className="flex items-center gap-1 capitalize"><BookOpen size={13} />{course.courseType || 'N/A'}</span>
                        </div>

                        {/* Schedule */}
                        {offering.schedule?.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {offering.schedule.map((s, i) => (
                              <span key={i} className="text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded flex items-center gap-1">
                                <Clock size={11} />{s.day?.slice(0, 3)} {s.startTime}–{s.endTime}
                                {s.room && <span className="text-purple-400 ml-0.5">({s.room})</span>}
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Capacity bar */}
                        <div className="mb-4">
                          <div className="flex justify-between text-xs mb-1">
                            <span className="text-slate-500">Capacity</span>
                            <span className="font-medium text-slate-700">{capacity}/{max} ({pct}%)</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-red-400' : pct >= 70 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Enroll button */}
                        {isAlreadyEnrolled ? (
                          <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 px-4 py-2.5 rounded-lg">
                            <CheckCircle size={16} /> Already enrolled
                          </div>
                        ) : (
                          <button
                            onClick={() => openEnrollModal(offering)}
                            className={`${btnPrimaryClass} w-full justify-center`}
                          >
                            <Plus size={18} /> Enroll
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {offeringPagination.totalPages > 1 && (
                <div className="flex items-center justify-center gap-3 mb-6">
                  <button disabled={offeringPage <= 1} onClick={() => setOfferingPage(p => p - 1)} className="p-2 rounded-lg border border-gray-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                    <ChevronLeft size={18} />
                  </button>
                  <span className="text-sm font-medium text-slate-700">{offeringPage} / {offeringPagination.totalPages}</span>
                  <button disabled={offeringPage >= offeringPagination.totalPages} onClick={() => setOfferingPage(p => p + 1)} className="p-2 rounded-lg border border-gray-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ============ ENROLL MODAL ============ */}
      {enrollModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4 animate-fade-in" onClick={() => setEnrollModal(null)}>
          <div className="bg-white rounded-xl max-w-[500px] w-full max-h-[80vh] overflow-y-auto shadow-xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-slate-800 m-0">Confirm Enrollment</h2>
              <button onClick={() => setEnrollModal(null)} className="bg-transparent border-none cursor-pointer text-slate-500 hover:text-slate-800 p-1"><X size={20} /></button>
            </div>
            <div className="p-6">
              <div className="mb-5">
                <h3 className="text-lg font-semibold text-slate-800 m-0">{getOfferingCourse(enrollModal).courseCode} — {getOfferingCourse(enrollModal).courseName}</h3>
                <p className="text-sm text-slate-500 mt-1 m-0">
                  Section {enrollModal.section} · {enrollModal.academicYear} Sem {enrollModal.semesterNumber} · {getOfferingTeacher(enrollModal)}
                </p>
                <p className="text-sm text-slate-500 m-0 mt-0.5">
                  {getOfferingCourse(enrollModal).creditHours || 0} Credits · {enrollModal.currentEnrollment || 0}/{enrollModal.maxCapacity} enrolled
                </p>
              </div>

              {/* Prerequisite Check */}
              {checkingPrereq ? (
                <div className="flex items-center gap-3 py-4 px-5 rounded-lg mb-4 bg-slate-50 text-slate-600">
                  <div className="w-5 h-5 border-2 border-slate-300 border-t-primary-500 rounded-full animate-spin"></div>
                  Checking prerequisites...
                </div>
              ) : prereqCheck && !prereqCheck.satisfied ? (
                <div className="py-4 px-5 rounded-lg mb-4 bg-amber-50 border border-amber-200">
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldAlert size={18} className="text-amber-600" />
                    <span className="font-semibold text-amber-800 text-sm">Prerequisite Warning</span>
                  </div>
                  <p className="text-sm text-amber-700 m-0 mb-2">You have not completed the following prerequisites:</p>
                  <div className="flex flex-col gap-1">
                    {prereqCheck.missing.map((m, i) => (
                      <span key={i} className="text-xs bg-white text-amber-700 px-2.5 py-1 rounded border border-amber-200 inline-flex items-center gap-1.5 w-fit">
                        <XCircle size={12} /> {m.code || m.courseCode} — {m.name || m.courseName}
                      </span>
                    ))}
                  </div>
                </div>
              ) : prereqCheck && prereqCheck.satisfied ? (
                <div className="flex items-center gap-3 py-3 px-5 rounded-lg mb-4 bg-green-50 text-green-700 border border-green-200">
                  <CheckCircle size={18} /> All prerequisites satisfied
                </div>
              ) : null}

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button className={btnSecondaryClass} onClick={() => setEnrollModal(null)}>Cancel</button>
                <button
                  onClick={() => handleEnroll(false)}
                  disabled={enrolling}
                  className={btnPrimaryClass}
                >
                  {enrolling ? 'Enrolling...' : <><Plus size={18} /> Enroll</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ DROP MODAL ============ */}
      {dropModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4 animate-fade-in" onClick={() => setDropModal(null)}>
          <div className="bg-white rounded-xl max-w-[450px] w-full shadow-xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-red-50 mx-auto mb-4 flex items-center justify-center">
                <LogOut size={24} className="text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Drop Course?</h3>
              <p className="text-sm text-slate-500 mb-4">
                {(() => {
                  const co = typeof dropModal.courseOffering === 'object' ? dropModal.courseOffering : {};
                  const c = typeof co.course === 'object' ? co.course : {};
                  return `${c.courseCode || 'N/A'} — ${c.courseName || ''}`;
                })()}
              </p>
              <div className="text-left mb-4">
                <label className={labelClass}>Reason (optional)</label>
                <textarea
                  value={dropReason} onChange={(e) => setDropReason(e.target.value)}
                  placeholder="Why are you dropping this course?"
                  rows={2} className={`${inputClass} resize-y`}
                />
              </div>
              <div className="flex gap-3 justify-center">
                <button className={btnSecondaryClass} onClick={() => setDropModal(null)}>Cancel</button>
                <button onClick={handleDrop} disabled={dropping} className="inline-flex items-center gap-2 py-2.5 px-5 border-none rounded-lg text-[0.95rem] font-medium cursor-pointer transition-all bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed">
                  {dropping ? 'Dropping...' : <><LogOut size={16} /> Drop Course</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ SWAP MODAL ============ */}
      {swapModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4 animate-fade-in" onClick={() => setSwapModal(null)}>
          <div className="bg-white rounded-xl max-w-[600px] w-full max-h-[85vh] overflow-y-auto shadow-xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-slate-800 m-0">Swap Course</h2>
              <button onClick={() => setSwapModal(null)} className="bg-transparent border-none cursor-pointer text-slate-500 hover:text-slate-800 p-1"><X size={20} /></button>
            </div>
            <div className="p-6">
              {/* Current */}
              <div className="mb-5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Currently Enrolled</p>
                <div className="bg-red-50/50 border border-red-100 rounded-lg p-4">
                  {(() => {
                    const co = typeof swapModal.courseOffering === 'object' ? swapModal.courseOffering : {};
                    const c = typeof co.course === 'object' ? co.course : {};
                    return (
                      <>
                        <p className="font-semibold text-slate-800 text-sm m-0">{c.courseCode} — {c.courseName}</p>
                        <p className="text-xs text-slate-500 m-0 mt-0.5">Section {co.section} · {co.academicYear} Sem {co.semesterNumber}</p>
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="flex items-center justify-center my-3">
                <ArrowRightLeft size={24} className="text-slate-300" />
              </div>

              {/* Target search */}
              <div className="mb-5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Swap To</p>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text" value={swapSearch}
                    onChange={(e) => searchSwapOfferings(e.target.value)}
                    placeholder="Search course to swap to..."
                    className={`${inputClass} pl-9`}
                  />
                  {swapResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-52 overflow-y-auto mt-1">
                      {swapResults.map(o => {
                        const oc = getOfferingCourse(o);
                        return (
                          <button key={o._id} onClick={() => selectSwapTarget(o)} className="w-full text-left px-4 py-3 hover:bg-slate-50 cursor-pointer border-none bg-transparent border-b border-gray-50">
                            <div className="flex justify-between items-center">
                              <div>
                                <span className="font-semibold text-slate-800 text-sm">{oc.courseCode}</span>
                                <span className="text-slate-500 ml-2 text-sm">{oc.courseName}</span>
                              </div>
                              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded">Sec {o.section}</span>
                            </div>
                            <p className="text-xs text-slate-400 m-0 mt-0.5">{o.academicYear} · {o.currentEnrollment}/{o.maxCapacity} enrolled</p>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {swapTarget && (
                  <div className="bg-green-50/50 border border-green-100 rounded-lg p-4 mt-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-slate-800 text-sm m-0">{getOfferingCourse(swapTarget).courseCode} — {getOfferingCourse(swapTarget).courseName}</p>
                        <p className="text-xs text-slate-500 m-0 mt-0.5">Section {swapTarget.section} · {swapTarget.currentEnrollment}/{swapTarget.maxCapacity} enrolled</p>
                      </div>
                      <button onClick={() => { setSwapTarget(null); setSwapSearch(''); setSwapPrereqCheck(null); }} className="text-slate-400 hover:text-slate-700 bg-transparent border-none cursor-pointer p-1"><X size={16} /></button>
                    </div>

                    {/* Prereq for swap target */}
                    {swapPrereqCheck && !swapPrereqCheck.satisfied && (
                      <div className="mt-3 py-2 px-3 rounded bg-amber-50 border border-amber-200">
                        <div className="flex items-center gap-1.5 mb-1">
                          <ShieldAlert size={14} className="text-amber-600" />
                          <span className="text-xs font-semibold text-amber-700">Missing prerequisites</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {swapPrereqCheck.missing.map((m, i) => (
                            <span key={i} className="text-xs bg-white text-amber-700 px-2 py-0.5 rounded border border-amber-200">
                              {m.code || m.courseCode}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {swapPrereqCheck && swapPrereqCheck.satisfied && (
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-green-600">
                        <CheckCircle size={13} /> Prerequisites met
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button className={btnSecondaryClass} onClick={() => setSwapModal(null)}>Cancel</button>
                <button
                  onClick={handleSwap}
                  disabled={!swapTarget || swapping}
                  className="inline-flex items-center gap-2 py-2.5 px-5 border-none rounded-lg text-[0.95rem] font-medium cursor-pointer transition-all bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {swapping ? 'Swapping...' : <><ArrowRightLeft size={16} /> Swap Course</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ DETAIL MODAL ============ */}
      {detailEnrollment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4 animate-fade-in" onClick={() => setDetailEnrollment(null)}>
          <div className="bg-white rounded-xl max-w-[550px] w-full max-h-[85vh] overflow-y-auto shadow-xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-slate-800 m-0">Enrollment Details</h2>
              <button onClick={() => setDetailEnrollment(null)} className="bg-transparent border-none cursor-pointer text-slate-500 hover:text-slate-800 p-1"><X size={20} /></button>
            </div>
            <div className="p-6">
              {(() => {
                const co = typeof detailEnrollment.courseOffering === 'object' ? detailEnrollment.courseOffering : {};
                const course = typeof co.course === 'object' ? co.course : {};
                const badge = STATUS_BADGES[detailEnrollment.status] || STATUS_BADGES.enrolled;

                return (
                  <>
                    <div className="mb-5">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-bold text-slate-800 m-0">{course.courseCode} — {course.courseName}</h3>
                      </div>
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded capitalize ${badge.bg} ${badge.text}`}>
                        {detailEnrollment.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-5">
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs text-slate-500 m-0 mb-0.5">Academic Year</p>
                        <p className="text-sm font-medium text-slate-700 m-0">{detailEnrollment.academicYear} Sem {detailEnrollment.semesterNumber}</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs text-slate-500 m-0 mb-0.5">Section</p>
                        <p className="text-sm font-medium text-slate-700 m-0">{co.section || '—'}</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs text-slate-500 m-0 mb-0.5">Credits</p>
                        <p className="text-sm font-medium text-slate-700 m-0">{course.creditHours || 0}</p>
                      </div>
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs text-slate-500 m-0 mb-0.5">Enrollment Type</p>
                        <p className="text-sm font-medium text-slate-700 m-0 capitalize">{detailEnrollment.enrollmentType || 'regular'}</p>
                      </div>
                    </div>

                    {/* Marks */}
                    {(detailEnrollment.grade || detailEnrollment.totalMarks !== undefined) && (
                      <div className="mb-5">
                        <h4 className="text-sm font-semibold text-slate-700 mb-2">Academic Performance</h4>
                        <div className="grid grid-cols-3 gap-2">
                          {detailEnrollment.midtermMarks !== undefined && detailEnrollment.midtermMarks !== null && (
                            <div className="text-center bg-blue-50/50 rounded p-2">
                              <p className="text-lg font-bold text-slate-800 m-0">{detailEnrollment.midtermMarks}</p>
                              <p className="text-xs text-slate-400 m-0">Midterm</p>
                            </div>
                          )}
                          {detailEnrollment.finalMarks !== undefined && detailEnrollment.finalMarks !== null && (
                            <div className="text-center bg-blue-50/50 rounded p-2">
                              <p className="text-lg font-bold text-slate-800 m-0">{detailEnrollment.finalMarks}</p>
                              <p className="text-xs text-slate-400 m-0">Final</p>
                            </div>
                          )}
                          {detailEnrollment.totalMarks !== undefined && detailEnrollment.totalMarks !== null && (
                            <div className="text-center bg-emerald-50/50 rounded p-2">
                              <p className="text-lg font-bold text-slate-800 m-0">{detailEnrollment.totalMarks}</p>
                              <p className="text-xs text-slate-400 m-0">Total</p>
                            </div>
                          )}
                        </div>
                        {detailEnrollment.grade && (
                          <div className="flex items-center gap-2 mt-3">
                            <span className="text-xs text-slate-500">Grade:</span>
                            <span className="text-lg font-bold text-primary-700">{detailEnrollment.grade}</span>
                            {detailEnrollment.gradePoints !== undefined && (
                              <span className="text-xs text-slate-400 ml-2">({detailEnrollment.gradePoints} GP)</span>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Schedule */}
                    {co.schedule?.length > 0 && (
                      <div className="mb-5">
                        <h4 className="text-sm font-semibold text-slate-700 mb-2">Schedule</h4>
                        <div className="flex flex-col gap-2">
                          {co.schedule.map((s, i) => (
                            <div key={i} className="flex items-center gap-3 bg-purple-50/40 border border-purple-100 rounded p-2.5 text-sm">
                              <span className="font-medium text-slate-700 w-20">{s.day}</span>
                              <span className="text-slate-600">{s.startTime} – {s.endTime}</span>
                              {s.room && <span className="text-xs text-slate-400 ml-auto flex items-center gap-1"><MapPin size={12} />{s.room}</span>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {detailEnrollment.remarks && (
                      <div className="bg-slate-50 rounded-lg p-3">
                        <p className="text-xs text-slate-500 m-0 mb-0.5">Remarks</p>
                        <p className="text-sm text-slate-700 m-0">{detailEnrollment.remarks}</p>
                      </div>
                    )}

                    <p className="text-xs text-slate-400 mt-4 mb-0">
                      Enrolled: {detailEnrollment.enrolledAt ? new Date(detailEnrollment.enrolledAt).toLocaleDateString() : '—'}
                      {detailEnrollment.droppedAt && ` · Dropped: ${new Date(detailEnrollment.droppedAt).toLocaleDateString()}`}
                      {detailEnrollment.completedAt && ` · Completed: ${new Date(detailEnrollment.completedAt).toLocaleDateString()}`}
                    </p>
                  </>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentEnrollment;
