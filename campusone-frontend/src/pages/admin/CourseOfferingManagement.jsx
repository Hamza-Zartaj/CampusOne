import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  Search,
  Plus,
  Edit,
  Trash2,
  RotateCcw,
  X,
  AlertCircle,
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
  Hash,
} from 'lucide-react';
import { courseOfferingAPI, courseAPI, programAPI, departmentAPI, teacherAPI } from '../../utils/api';

const inputClass = "w-full py-2.5 px-3.5 border border-gray-200 rounded-lg text-[0.95rem] transition-all focus:outline-none focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10";
const labelClass = "block text-[0.9rem] font-medium text-slate-800 mb-2";
const btnPrimaryClass = "inline-flex items-center gap-2 py-2.5 px-5 border-none rounded-lg text-[0.95rem] font-medium cursor-pointer transition-all bg-gradient-primary text-white hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(59,130,246,0.3)] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none";
const btnSecondaryClass = "inline-flex items-center gap-2 py-2.5 px-5 border border-gray-200 rounded-lg text-[0.95rem] font-medium cursor-pointer transition-all bg-white text-slate-800 hover:bg-slate-50 hover:border-gray-300";

const STATUS_COLORS = {
  scheduled: { bg: 'bg-blue-50', text: 'text-blue-700' },
  ongoing: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
  completed: { bg: 'bg-slate-100', text: 'text-slate-600' },
  cancelled: { bg: 'bg-red-50', text: 'text-red-700' },
};

const ENROLLMENT_STATUS_COLORS = {
  open: { bg: 'bg-green-50', text: 'text-green-700' },
  closed: { bg: 'bg-red-50', text: 'text-red-700' },
  waitlist: { bg: 'bg-amber-50', text: 'text-amber-700' },
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const SLOT_TYPES = ['lecture', 'lab', 'tutorial'];

const currentYear = new Date().getFullYear();
const ACADEMIC_YEARS = Array.from({ length: 5 }, (_, i) => `${currentYear - 2 + i}-${currentYear - 1 + i}`);

const CourseOfferingManagement = () => {
  // List state
  const [offerings, setOfferings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const limit = 12;

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProgram, setFilterProgram] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterSemester, setFilterSemester] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterEnrollStatus, setFilterEnrollStatus] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Reference data
  const [programs, setPrograms] = useState([]);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);

  // Modal states
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingOffering, setEditingOffering] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailOffering, setDetailOffering] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingOffering, setDeletingOffering] = useState(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [schedulingOffering, setSchedulingOffering] = useState(null);

  // Form state
  const [form, setForm] = useState({
    course: '',
    program: '',
    academicYear: `${currentYear}-${currentYear + 1}`,
    semesterNumber: '1',
    semesterName: '',
    section: 'A',
    teacher: '',
    maxCapacity: 60,
    enrollmentStatus: 'open',
    status: 'scheduled',
    startDate: '',
    endDate: '',
  });
  const [formLoading, setFormLoading] = useState(false);

  // Schedule form
  const [scheduleForm, setScheduleForm] = useState([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  // Course search
  const [courseSearch, setCourseSearch] = useState('');
  const [courseResults, setCourseResults] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState(null);

  // Teacher search
  const [teacherSearch, setTeacherSearch] = useState('');
  const [teacherResults, setTeacherResults] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState(null);

  // Load reference data
  useEffect(() => {
    const loadRefs = async () => {
      try {
        const [progRes, courseRes, teacherRes] = await Promise.all([
          programAPI.getAllPrograms({ limit: 200 }),
          courseAPI.getAllCourses({ limit: 500, isActive: true }),
          teacherAPI.getAllTeachers({ limit: 500 }),
        ]);
        if (progRes.data.success) setPrograms(progRes.data.data);
        if (courseRes.data.success) setCourses(courseRes.data.data);
        if (teacherRes.data.success) setTeachers(teacherRes.data.data);
      } catch (err) {
        console.error('Error loading reference data:', err);
      }
    };
    loadRefs();
  }, []);

  // Fetch offerings
  const fetchOfferings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit };
      if (searchQuery) params.search = searchQuery;
      if (filterProgram) params.program = filterProgram;
      if (filterYear) params.academicYear = filterYear;
      if (filterSemester) params.semesterNumber = filterSemester;
      if (filterStatus) params.status = filterStatus;
      if (filterEnrollStatus) params.enrollmentStatus = filterEnrollStatus;

      const res = await courseOfferingAPI.getAllOfferings(params);
      if (res.data.success) {
        setOfferings(res.data.data);
        setPagination(res.data.pagination || { total: res.data.count || 0, totalPages: 1 });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load offerings');
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, filterProgram, filterYear, filterSemester, filterStatus, filterEnrollStatus]);

  useEffect(() => { fetchOfferings(); }, [fetchOfferings]);

  // Search helpers
  const searchCourses = (q) => {
    if (!q.trim()) return [];
    const lq = q.toLowerCase();
    return courses.filter(c => c.courseCode?.toLowerCase().includes(lq) || c.courseName?.toLowerCase().includes(lq)).slice(0, 8);
  };

  const searchTeachers = (q) => {
    if (!q.trim()) return [];
    const lq = q.toLowerCase();
    return teachers.filter(t => {
      const name = `${t.name || ''} ${t.username || ''}`.toLowerCase();
      return name.includes(lq) || (t.email || '').toLowerCase().includes(lq);
    }).slice(0, 8);
  };

  // Form handlers
  const openCreateModal = () => {
    setEditingOffering(null);
    setForm({
      course: '', program: '',
      academicYear: `${currentYear}-${currentYear + 1}`,
      semesterNumber: '1', semesterName: '', section: 'A', teacher: '',
      maxCapacity: 60, enrollmentStatus: 'open', status: 'scheduled',
      startDate: '', endDate: '',
    });
    setSelectedCourse(null);
    setSelectedTeacher(null);
    setCourseSearch('');
    setTeacherSearch('');
    setShowFormModal(true);
  };

  const openEditModal = (offering) => {
    setEditingOffering(offering);
    const courseName = typeof offering.course === 'object'
      ? `${offering.course.courseCode} - ${offering.course.courseName}` : '';
    const teacherObj = typeof offering.teacher === 'object' ? offering.teacher : null;
    const teacherName = teacherObj
      ? `${teacherObj.userId?.name || teacherObj.name || ''}`.trim()
      : '';

    setForm({
      course: typeof offering.course === 'object' ? offering.course._id : offering.course,
      program: typeof offering.program === 'object' ? offering.program._id : offering.program,
      academicYear: offering.academicYear || '',
      semesterNumber: String(offering.semesterNumber || '1'),
      semesterName: offering.semesterName || '',
      section: offering.section || 'A',
      teacher: typeof offering.teacher === 'object' ? offering.teacher._id : offering.teacher,
      maxCapacity: offering.maxCapacity || 60,
      enrollmentStatus: offering.enrollmentStatus || 'open',
      status: offering.status || 'scheduled',
      startDate: offering.startDate ? offering.startDate.slice(0, 10) : '',
      endDate: offering.endDate ? offering.endDate.slice(0, 10) : '',
    });
    setSelectedCourse(typeof offering.course === 'object' ? offering.course : null);
    setCourseSearch(courseName);
    setSelectedTeacher(teacherObj);
    setTeacherSearch(teacherName);
    setShowFormModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!form.course || !form.program || !form.teacher) {
      setError('Course, program, and instructor are required');
      return;
    }
    setFormLoading(true);
    setError('');
    try {
      const payload = {
        ...form,
        semesterNumber: parseInt(form.semesterNumber),
        maxCapacity: parseInt(form.maxCapacity),
      };
      if (!payload.semesterName) delete payload.semesterName;
      if (!payload.startDate) delete payload.startDate;
      if (!payload.endDate) delete payload.endDate;

      if (editingOffering) {
        await courseOfferingAPI.updateOffering(editingOffering._id, payload);
        setSuccess('Course offering updated successfully');
      } else {
        await courseOfferingAPI.createOffering(payload);
        setSuccess('Course offering created successfully');
      }
      setShowFormModal(false);
      fetchOfferings();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save offering');
    } finally {
      setFormLoading(false);
    }
  };

  // Detail view
  const openDetailModal = async (offering) => {
    try {
      const res = await courseOfferingAPI.getOfferingById(offering._id);
      if (res.data.success) setDetailOffering(res.data.data);
    } catch {
      setDetailOffering(offering);
    }
    setShowDetailModal(true);
  };

  // Delete
  const handleDelete = async () => {
    if (!deletingOffering) return;
    try {
      await courseOfferingAPI.deleteOffering(deletingOffering._id);
      setSuccess('Offering deleted');
      setShowDeleteModal(false);
      setDeletingOffering(null);
      fetchOfferings();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete');
    }
  };

  const handleRestore = async (offering) => {
    try {
      await courseOfferingAPI.restoreOffering(offering._id);
      setSuccess('Offering restored');
      fetchOfferings();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to restore');
    }
  };

  // Schedule
  const openScheduleModal = (offering) => {
    setSchedulingOffering(offering);
    setScheduleForm(offering.schedule?.length > 0 ? offering.schedule.map(s => ({ ...s })) : [{ day: 'Monday', startTime: '09:00', endTime: '10:00', room: '', type: 'lecture' }]);
    setShowScheduleModal(true);
  };

  const addScheduleSlot = () => {
    setScheduleForm(prev => [...prev, { day: 'Monday', startTime: '09:00', endTime: '10:00', room: '', type: 'lecture' }]);
  };

  const removeScheduleSlot = (idx) => {
    setScheduleForm(prev => prev.filter((_, i) => i !== idx));
  };

  const updateScheduleSlot = (idx, field, value) => {
    setScheduleForm(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const handleScheduleSubmit = async () => {
    if (!schedulingOffering) return;
    setScheduleLoading(true);
    try {
      await courseOfferingAPI.updateSchedule(schedulingOffering._id, scheduleForm);
      setSuccess('Schedule updated');
      setShowScheduleModal(false);
      fetchOfferings();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update schedule');
    } finally {
      setScheduleLoading(false);
    }
  };

  // Helpers
  const getTeacherName = (offering) => {
    const t = offering.teacher;
    if (!t) return 'TBA';
    if (typeof t === 'object') {
      const u = t.userId || t;
      return `${u.name || ''}`.trim() || 'TBA';
    }
    return 'TBA';
  };

  const getCourseName = (offering) => {
    const c = offering.course;
    if (!c || typeof c !== 'object') return 'N/A';
    return c.courseCode || 'N/A';
  };

  const getProgramCode = (offering) => {
    const p = offering.program;
    if (!p || typeof p !== 'object') return '';
    return p.programCode || '';
  };

  // Stats
  const totalOfferings = pagination.total || offerings.length;
  const openCount = offerings.filter(o => o.enrollmentStatus === 'open').length;
  const ongoingCount = offerings.filter(o => o.status === 'ongoing').length;

  return (
    <div className="p-8 max-w-[1400px] mx-auto max-md:p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4 max-md:flex-col max-md:items-start">
        <div>
          <h1 className="text-[2rem] font-bold text-slate-800 m-0">Course Offerings</h1>
          <p className="text-[0.95rem] text-slate-500 mt-1">Manage course sections, instructors, schedules, and capacity</p>
        </div>
        <button className={btnPrimaryClass} onClick={openCreateModal}>
          <Plus size={18} /> New Offering
        </button>
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
            <p className="text-xs text-slate-500 font-medium">Total Offerings</p>
          </div>
          <p className="text-2xl font-bold text-slate-800 m-0">{totalOfferings}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-green-50 text-green-600 flex items-center justify-center"><UserCheck size={20} /></div>
            <p className="text-xs text-slate-500 font-medium">Open for Enrollment</p>
          </div>
          <p className="text-2xl font-bold text-slate-800 m-0">{openCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"><Clock size={20} /></div>
            <p className="text-xs text-slate-500 font-medium">Ongoing</p>
          </div>
          <p className="text-2xl font-bold text-slate-800 m-0">{ongoingCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center"><GraduationCap size={20} /></div>
            <p className="text-xs text-slate-500 font-medium">Programs</p>
          </div>
          <p className="text-2xl font-bold text-slate-800 m-0">{programs.length}</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
        <div className="flex gap-3 items-center mb-0 max-md:flex-col max-md:items-stretch">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text" value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder="Search by course code or name..."
              className={`${inputClass} pl-11`}
            />
          </div>
          <button className={btnSecondaryClass} onClick={() => setShowFilters(!showFilters)}>
            <Filter size={18} /> Filters {showFilters ? '▲' : '▼'}
          </button>
        </div>
        {showFilters && (
          <div className="grid grid-cols-5 gap-3 mt-4 max-lg:grid-cols-3 max-md:grid-cols-1">
            <select value={filterProgram} onChange={(e) => { setFilterProgram(e.target.value); setPage(1); }} className={inputClass}>
              <option value="">All Programs</option>
              {programs.map(p => <option key={p._id} value={p._id}>{p.programCode}</option>)}
            </select>
            <select value={filterYear} onChange={(e) => { setFilterYear(e.target.value); setPage(1); }} className={inputClass}>
              <option value="">All Years</option>
              {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            <select value={filterSemester} onChange={(e) => { setFilterSemester(e.target.value); setPage(1); }} className={inputClass}>
              <option value="">All Semesters</option>
              <option value="1">Semester 1</option><option value="2">Semester 2</option><option value="3">Summer</option>
            </select>
            <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }} className={inputClass}>
              <option value="">All Status</option>
              <option value="scheduled">Scheduled</option><option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option><option value="cancelled">Cancelled</option>
            </select>
            <select value={filterEnrollStatus} onChange={(e) => { setFilterEnrollStatus(e.target.value); setPage(1); }} className={inputClass}>
              <option value="">Enrollment Status</option>
              <option value="open">Open</option><option value="closed">Closed</option><option value="waitlist">Waitlist</option>
            </select>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6">
        {loading ? (
          <div className="flex justify-center items-center py-16 text-slate-500">
            <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-primary-500 rounded-full animate-spin mr-3"></div>
            Loading offerings...
          </div>
        ) : offerings.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-lg text-slate-500 mb-2">No course offerings found</p>
            <p className="text-sm text-slate-400">Create a new offering or adjust your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Course</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide max-md:hidden">Program</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Year / Sem</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Section</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide max-lg:hidden">Instructor</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Capacity</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide max-lg:hidden">Schedule</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide">Status</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wide w-32">Actions</th>
                </tr>
              </thead>
              <tbody>
                {offerings.map((o) => {
                  const courseObj = typeof o.course === 'object' ? o.course : {};
                  const sc = STATUS_COLORS[o.status] || STATUS_COLORS.scheduled;
                  const ec = ENROLLMENT_STATUS_COLORS[o.enrollmentStatus] || ENROLLMENT_STATUS_COLORS.open;
                  return (
                    <tr key={o._id} className="border-b border-gray-50 hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-800 text-sm m-0">{courseObj.courseCode || 'N/A'}</p>
                        <p className="text-xs text-slate-500 m-0 mt-0.5 max-w-[200px] truncate">{courseObj.courseName || ''}</p>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600 max-md:hidden">{getProgramCode(o)}</td>
                      <td className="py-3 px-4">
                        <p className="text-sm text-slate-700 m-0">{o.academicYear}</p>
                        <p className="text-xs text-slate-400 m-0 mt-0.5">Sem {o.semesterNumber}</p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded bg-slate-100 text-slate-700 font-bold text-sm">{o.section}</span>
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600 max-lg:hidden">{getTeacherName(o)}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-sm font-medium text-slate-700">{o.currentEnrollment || 0}</span>
                        <span className="text-xs text-slate-400">/{o.maxCapacity}</span>
                      </td>
                      <td className="py-3 px-4 text-center max-lg:hidden">
                        {o.schedule?.length > 0 ? (
                          <span className="text-xs text-slate-500">{o.schedule.length} slot{o.schedule.length > 1 ? 's' : ''}</span>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex flex-col items-center gap-1">
                          <span className={`text-xs font-medium px-2 py-0.5 rounded capitalize ${sc.bg} ${sc.text}`}>{o.status}</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded capitalize ${ec.bg} ${ec.text}`}>{o.enrollmentStatus}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openDetailModal(o)} title="View" className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors bg-transparent border-none cursor-pointer">
                            <Eye size={16} />
                          </button>
                          <button onClick={() => openScheduleModal(o)} title="Schedule" className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded transition-colors bg-transparent border-none cursor-pointer">
                            <Clock size={16} />
                          </button>
                          <button onClick={() => openEditModal(o)} title="Edit" className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors bg-transparent border-none cursor-pointer">
                            <Edit size={16} />
                          </button>
                          {o.isDeleted ? (
                            <button onClick={() => handleRestore(o)} title="Restore" className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded transition-colors bg-transparent border-none cursor-pointer">
                              <RotateCcw size={16} />
                            </button>
                          ) : (
                            <button onClick={() => { setDeletingOffering(o); setShowDeleteModal(true); }} title="Delete" className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors bg-transparent border-none cursor-pointer">
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
            <p className="text-sm text-slate-500 m-0">
              Showing {(page - 1) * limit + 1}–{Math.min(page * limit, pagination.total)} of {pagination.total}
            </p>
            <div className="flex items-center gap-2">
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="p-2 rounded-lg border border-gray-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors">
                <ChevronLeft size={18} />
              </button>
              <span className="text-sm font-medium text-slate-700 px-3">{page} / {pagination.totalPages}</span>
              <button disabled={page >= pagination.totalPages} onClick={() => setPage(p => p + 1)} className="p-2 rounded-lg border border-gray-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors">
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ============ CREATE / EDIT MODAL ============ */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4 animate-fade-in" onClick={() => setShowFormModal(false)}>
          <div className="bg-white rounded-xl max-w-[700px] w-full max-h-[90vh] overflow-y-auto shadow-xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-slate-800 m-0">{editingOffering ? 'Edit Offering' : 'Create Course Offering'}</h2>
              <button onClick={() => setShowFormModal(false)} className="bg-transparent border-none cursor-pointer text-slate-500 hover:text-slate-800 p-1"><X size={20} /></button>
            </div>
            <form onSubmit={handleFormSubmit} className="p-6">
              {/* Course Search */}
              <div className="mb-4">
                <label className={labelClass}>Course *</label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text" value={courseSearch}
                    onChange={(e) => { setCourseSearch(e.target.value); setCourseResults(searchCourses(e.target.value)); }}
                    placeholder="Search course code or name..."
                    className={`${inputClass} pl-9`}
                  />
                  {courseResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto mt-1">
                      {courseResults.map(c => (
                        <button key={c._id} type="button" onClick={() => {
                          setForm(prev => ({ ...prev, course: c._id }));
                          setSelectedCourse(c);
                          setCourseSearch(`${c.courseCode} - ${c.courseName}`);
                          setCourseResults([]);
                        }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 cursor-pointer border-none bg-transparent border-b border-gray-50">
                          <span className="font-semibold text-slate-800">{c.courseCode}</span>
                          <span className="text-slate-500 ml-2">{c.courseName}</span>
                          <span className="text-xs text-slate-400 ml-2">{c.creditHours} CR</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedCourse && (
                  <div className="mt-2 flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-lg text-sm text-blue-700">
                    <Check size={14} /> {selectedCourse.courseCode} — {selectedCourse.courseName} ({selectedCourse.creditHours} CR)
                    <button type="button" onClick={() => { setSelectedCourse(null); setForm(prev => ({ ...prev, course: '' })); setCourseSearch(''); }} className="ml-auto bg-transparent border-none text-blue-400 hover:text-blue-700 cursor-pointer p-0"><X size={14} /></button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4 max-md:grid-cols-1">
                <div>
                  <label className={labelClass}>Program *</label>
                  <select value={form.program} onChange={(e) => setForm(prev => ({ ...prev, program: e.target.value }))} className={inputClass} required>
                    <option value="">Select program</option>
                    {programs.map(p => <option key={p._id} value={p._id}>{p.programCode} - {p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Section</label>
                  <input type="text" value={form.section} onChange={(e) => setForm(prev => ({ ...prev, section: e.target.value.toUpperCase() }))} maxLength={3} className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4 max-md:grid-cols-1">
                <div>
                  <label className={labelClass}>Academic Year *</label>
                  <select value={form.academicYear} onChange={(e) => setForm(prev => ({ ...prev, academicYear: e.target.value }))} className={inputClass} required>
                    {ACADEMIC_YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Semester *</label>
                  <select value={form.semesterNumber} onChange={(e) => setForm(prev => ({ ...prev, semesterNumber: e.target.value }))} className={inputClass} required>
                    <option value="1">Semester 1 (Fall/Odd)</option>
                    <option value="2">Semester 2 (Spring/Even)</option>
                    <option value="3">Summer</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Semester Name</label>
                  <select value={form.semesterName} onChange={(e) => setForm(prev => ({ ...prev, semesterName: e.target.value }))} className={inputClass}>
                    <option value="">Auto</option>
                    <option value="Fall">Fall</option><option value="Spring">Spring</option>
                    <option value="Summer">Summer</option><option value="Winter">Winter</option>
                    <option value="Odd">Odd</option><option value="Even">Even</option>
                  </select>
                </div>
              </div>

              {/* Instructor Search */}
              <div className="mb-4">
                <label className={labelClass}>Instructor *</label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text" value={teacherSearch}
                    onChange={(e) => { setTeacherSearch(e.target.value); setTeacherResults(searchTeachers(e.target.value)); }}
                    placeholder="Search instructor name or email..."
                    className={`${inputClass} pl-9`}
                  />
                  {teacherResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto mt-1">
                      {teacherResults.map(t => (
                        <button key={t._id} type="button" onClick={() => {
                          // teacher record — using Teacher document _id
                          // The teacherAPI returns Teacher docs with the correct _id for course offerings
                          setForm(prev => ({ ...prev, teacher: t._id }));
                          setSelectedTeacher(t);
                          setTeacherSearch(`${t.name || ''}`.trim());
                          setTeacherResults([]);
                        }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 cursor-pointer border-none bg-transparent border-b border-gray-50">
                          <span className="font-semibold text-slate-800">{t.name}</span>
                          <span className="text-slate-400 ml-2 text-xs">{t.email}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedTeacher && (
                  <div className="mt-2 flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-lg text-sm text-green-700">
                    <Check size={14} /> {selectedTeacher.name || selectedTeacher.userId?.name}
                    <button type="button" onClick={() => { setSelectedTeacher(null); setForm(prev => ({ ...prev, teacher: '' })); setTeacherSearch(''); }} className="ml-auto bg-transparent border-none text-green-400 hover:text-green-700 cursor-pointer p-0"><X size={14} /></button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4 max-md:grid-cols-1">
                <div>
                  <label className={labelClass}>Max Capacity</label>
                  <input type="number" value={form.maxCapacity} onChange={(e) => setForm(prev => ({ ...prev, maxCapacity: e.target.value }))} min={1} max={500} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Enrollment Status</label>
                  <select value={form.enrollmentStatus} onChange={(e) => setForm(prev => ({ ...prev, enrollmentStatus: e.target.value }))} className={inputClass}>
                    <option value="open">Open</option><option value="closed">Closed</option><option value="waitlist">Waitlist</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Status</label>
                  <select value={form.status} onChange={(e) => setForm(prev => ({ ...prev, status: e.target.value }))} className={inputClass}>
                    <option value="scheduled">Scheduled</option><option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option><option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-6 max-md:grid-cols-1">
                <div>
                  <label className={labelClass}>Start Date</label>
                  <input type="date" value={form.startDate} onChange={(e) => setForm(prev => ({ ...prev, startDate: e.target.value }))} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>End Date</label>
                  <input type="date" value={form.endDate} onChange={(e) => setForm(prev => ({ ...prev, endDate: e.target.value }))} className={inputClass} />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                <button type="button" className={btnSecondaryClass} onClick={() => setShowFormModal(false)}>Cancel</button>
                <button type="submit" className={btnPrimaryClass} disabled={formLoading}>
                  {formLoading ? 'Saving...' : (editingOffering ? 'Update Offering' : 'Create Offering')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============ DETAIL MODAL ============ */}
      {showDetailModal && detailOffering && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4 animate-fade-in" onClick={() => setShowDetailModal(false)}>
          <div className="bg-white rounded-xl max-w-[650px] w-full max-h-[90vh] overflow-y-auto shadow-xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-slate-800 m-0">Offering Details</h2>
              <button onClick={() => setShowDetailModal(false)} className="bg-transparent border-none cursor-pointer text-slate-500 hover:text-slate-800 p-1"><X size={20} /></button>
            </div>
            <div className="p-6">
              {/* Course info */}
              <div className="mb-5">
                <h3 className="text-lg font-bold text-slate-800 m-0">
                  {detailOffering.course?.courseCode} — {detailOffering.course?.courseName}
                </h3>
                <p className="text-sm text-slate-500 mt-1 m-0">
                  {detailOffering.course?.creditHours} Credits · {detailOffering.course?.courseType}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-5">
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-xs text-slate-500 font-medium m-0 mb-1">Program</p>
                  <p className="text-sm font-semibold text-slate-700 m-0">{detailOffering.program?.programCode} - {detailOffering.program?.name}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-xs text-slate-500 font-medium m-0 mb-1">Academic Year / Semester</p>
                  <p className="text-sm font-semibold text-slate-700 m-0">{detailOffering.academicYear} — Sem {detailOffering.semesterNumber} {detailOffering.semesterName && `(${detailOffering.semesterName})`}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-xs text-slate-500 font-medium m-0 mb-1">Section / Instructor</p>
                  <p className="text-sm font-semibold text-slate-700 m-0">
                    Section {detailOffering.section} · {getTeacherName(detailOffering)}
                  </p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-xs text-slate-500 font-medium m-0 mb-1">Enrollment</p>
                  <p className="text-sm font-semibold text-slate-700 m-0">
                    {detailOffering.currentEnrollment || 0} / {detailOffering.maxCapacity}
                    <span className={`ml-2 text-xs font-medium px-2 py-0.5 rounded capitalize ${(ENROLLMENT_STATUS_COLORS[detailOffering.enrollmentStatus] || {}).bg || ''} ${(ENROLLMENT_STATUS_COLORS[detailOffering.enrollmentStatus] || {}).text || ''}`}>{detailOffering.enrollmentStatus}</span>
                  </p>
                </div>
              </div>

              {/* Schedule */}
              {detailOffering.schedule?.length > 0 && (
                <div className="mb-5">
                  <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2"><Clock size={16} className="text-purple-500" /> Schedule</h4>
                  <div className="flex flex-col gap-2">
                    {detailOffering.schedule.map((s, i) => (
                      <div key={i} className="flex items-center gap-3 bg-purple-50/40 border border-purple-100 rounded-lg p-3">
                        <span className="text-sm font-medium text-slate-700 w-24">{s.day}</span>
                        <span className="text-sm text-slate-600">{s.startTime} – {s.endTime}</span>
                        {s.room && <span className="text-xs text-slate-500 ml-auto flex items-center gap-1"><MapPin size={12} />{s.room}</span>}
                        <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded capitalize">{s.type}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status */}
              <div className="flex items-center gap-3">
                <span className={`text-xs font-medium px-2 py-1 rounded capitalize ${(STATUS_COLORS[detailOffering.status] || {}).bg || ''} ${(STATUS_COLORS[detailOffering.status] || {}).text || ''}`}>
                  {detailOffering.status}
                </span>
                {detailOffering.startDate && <span className="text-xs text-slate-500">Starts: {new Date(detailOffering.startDate).toLocaleDateString()}</span>}
                {detailOffering.endDate && <span className="text-xs text-slate-500">Ends: {new Date(detailOffering.endDate).toLocaleDateString()}</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ DELETE MODAL ============ */}
      {showDeleteModal && deletingOffering && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4 animate-fade-in" onClick={() => { setShowDeleteModal(false); setDeletingOffering(null); }}>
          <div className="bg-white rounded-xl max-w-[450px] w-full shadow-xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-red-50 mx-auto mb-4 flex items-center justify-center">
                <Trash2 size={24} className="text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Delete Offering?</h3>
              <p className="text-sm text-slate-500 mb-6">
                This will soft-delete <strong>{getCourseName(deletingOffering)} Sec-{deletingOffering.section}</strong> ({deletingOffering.academicYear}).
                {(deletingOffering.currentEnrollment || 0) > 0 && (
                  <span className="block mt-2 text-red-500 font-medium">Warning: This offering has {deletingOffering.currentEnrollment} enrolled students and cannot be deleted.</span>
                )}
              </p>
              <div className="flex gap-3 justify-center">
                <button className={btnSecondaryClass} onClick={() => { setShowDeleteModal(false); setDeletingOffering(null); }}>Cancel</button>
                <button onClick={handleDelete} disabled={(deletingOffering.currentEnrollment || 0) > 0} className="inline-flex items-center gap-2 py-2.5 px-5 border-none rounded-lg text-[0.95rem] font-medium cursor-pointer transition-all bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed">
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ SCHEDULE MODAL ============ */}
      {showScheduleModal && schedulingOffering && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4 animate-fade-in" onClick={() => setShowScheduleModal(false)}>
          <div className="bg-white rounded-xl max-w-[700px] w-full max-h-[90vh] overflow-y-auto shadow-xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-slate-800 m-0">Edit Schedule</h2>
                <p className="text-sm text-slate-500 mt-0.5 m-0">{getCourseName(schedulingOffering)} — Section {schedulingOffering.section}</p>
              </div>
              <button onClick={() => setShowScheduleModal(false)} className="bg-transparent border-none cursor-pointer text-slate-500 hover:text-slate-800 p-1"><X size={20} /></button>
            </div>
            <div className="p-6">
              {scheduleForm.map((slot, idx) => (
                <div key={idx} className="grid grid-cols-[1fr_0.7fr_0.7fr_0.8fr_0.6fr_auto] gap-2 items-end mb-3 max-md:grid-cols-2 max-md:gap-3">
                  <div>
                    {idx === 0 && <label className="text-xs font-medium text-slate-500 mb-1 block">Day</label>}
                    <select value={slot.day} onChange={(e) => updateScheduleSlot(idx, 'day', e.target.value)} className={inputClass}>
                      {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    {idx === 0 && <label className="text-xs font-medium text-slate-500 mb-1 block">Start</label>}
                    <input type="time" value={slot.startTime} onChange={(e) => updateScheduleSlot(idx, 'startTime', e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    {idx === 0 && <label className="text-xs font-medium text-slate-500 mb-1 block">End</label>}
                    <input type="time" value={slot.endTime} onChange={(e) => updateScheduleSlot(idx, 'endTime', e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    {idx === 0 && <label className="text-xs font-medium text-slate-500 mb-1 block">Room</label>}
                    <input type="text" value={slot.room || ''} onChange={(e) => updateScheduleSlot(idx, 'room', e.target.value)} placeholder="e.g. LH-201" className={inputClass} />
                  </div>
                  <div>
                    {idx === 0 && <label className="text-xs font-medium text-slate-500 mb-1 block">Type</label>}
                    <select value={slot.type} onChange={(e) => updateScheduleSlot(idx, 'type', e.target.value)} className={inputClass}>
                      {SLOT_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                    </select>
                  </div>
                  <button type="button" onClick={() => removeScheduleSlot(idx)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded bg-transparent border-none cursor-pointer" title="Remove">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}

              <button type="button" onClick={addScheduleSlot} className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium bg-transparent border-none cursor-pointer mt-2">
                <Plus size={16} /> Add Time Slot
              </button>

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 mt-6">
                <button type="button" className={btnSecondaryClass} onClick={() => setShowScheduleModal(false)}>Cancel</button>
                <button onClick={handleScheduleSubmit} className={btnPrimaryClass} disabled={scheduleLoading}>
                  {scheduleLoading ? 'Saving...' : 'Save Schedule'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseOfferingManagement;
