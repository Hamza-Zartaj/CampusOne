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
  Layers,
  Clock,
  GraduationCap,
  FlaskConical,
  BookMarked,
  Briefcase,
  FileText,
  GitBranch,
} from 'lucide-react';
import { courseAPI, departmentAPI, programAPI } from '../utils/api';
import CourseModal from '../components/CourseModal';

// Reuse same styling patterns from UserManagement
const inputClass = "w-full py-2.5 px-3.5 border border-gray-200 rounded-lg text-[0.95rem] transition-all focus:outline-none focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10";
const labelClass = "block text-[0.9rem] font-medium text-slate-800 mb-2";
const btnPrimaryClass = "inline-flex items-center gap-2 py-2.5 px-5 border-none rounded-lg text-[0.95rem] font-medium cursor-pointer transition-all bg-gradient-primary text-white hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(59,130,246,0.3)] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none";
const btnSecondaryClass = "inline-flex items-center gap-2 py-2.5 px-5 border border-gray-200 rounded-lg text-[0.95rem] font-medium cursor-pointer transition-all bg-white text-slate-800 hover:bg-slate-50 hover:border-gray-300";

const COURSE_TYPE_ICONS = {
  core: BookOpen,
  elective: Layers,
  lab: FlaskConical,
  project: Briefcase,
  internship: GraduationCap,
  thesis: FileText,
};

const COURSE_TYPE_COLORS = {
  core: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  elective: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  lab: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  project: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  internship: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
  thesis: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' },
};

const CourseManagement = () => {
  // Course list state
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const limit = 15;

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterDomain, setFilterDomain] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Reference data
  const [departments, setDepartments] = useState([]);
  const [domains, setDomains] = useState([]);

  // Modal states
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingCourse, setDeletingCourse] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailCourse, setDetailCourse] = useState(null);
  const [prereqTree, setPrereqTree] = useState(null);
  const [loadingTree, setLoadingTree] = useState(false);

  // Stats
  const [stats, setStats] = useState({ total: 0, core: 0, elective: 0, lab: 0, inactive: 0 });

  // Load reference data
  useEffect(() => {
    const loadRefs = async () => {
      try {
        const [deptRes, domainRes] = await Promise.all([
          departmentAPI.getAllDepartments({ limit: 200 }),
          courseAPI.getDomains(),
        ]);
        if (deptRes.data.success) setDepartments(deptRes.data.data);
        if (domainRes.data.success) setDomains(domainRes.data.data);
      } catch (err) {
        console.error('Error loading reference data:', err);
      }
    };
    loadRefs();
  }, []);

  // Fetch courses
  const fetchCourses = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit };
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (filterType) params.courseType = filterType;
      if (filterDepartment) params.department = filterDepartment;
      if (filterDomain) params.domain = filterDomain;
      if (filterActive !== '') params.isActive = filterActive;

      const response = await courseAPI.getAllCourses(params);
      if (response.data.success) {
        setCourses(response.data.data);
        setPagination(response.data.pagination || { total: response.data.count || 0, totalPages: 1 });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch courses');
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, filterType, filterDepartment, filterDomain, filterActive]);

  useEffect(() => {
    fetchCourses();
  }, [fetchCourses]);

  // Fetch stats (all courses unfiltered)
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await courseAPI.getAllCourses({ limit: 1000 });
        if (res.data.success) {
          const allCourses = res.data.data;
          setStats({
            total: allCourses.length,
            core: allCourses.filter(c => c.courseType === 'core').length,
            elective: allCourses.filter(c => c.courseType === 'elective').length,
            lab: allCourses.filter(c => c.courseType === 'lab').length,
            inactive: allCourses.filter(c => !c.isActive).length,
          });
        }
      } catch (err) {
        console.error('Error fetching stats:', err);
      }
    };
    fetchStats();
  }, [courses]); // Re-fetch when courses change

  // Search debounce
  const [searchTimeout, setSearchTimeout] = useState(null);
  const handleSearch = (value) => {
    setSearchQuery(value);
    if (searchTimeout) clearTimeout(searchTimeout);
    setSearchTimeout(setTimeout(() => setPage(1), 400));
  };

  // Course CRUD handlers
  const handleAddCourse = () => {
    setEditingCourse(null);
    setShowCourseModal(true);
  };

  const handleEditCourse = (course) => {
    setEditingCourse(course);
    setShowCourseModal(true);
  };

  const handleDeleteClick = (course) => {
    setDeletingCourse(course);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deletingCourse) return;
    try {
      await courseAPI.deleteCourse(deletingCourse._id);
      setSuccess(`"${deletingCourse.courseCode}" has been deleted`);
      setShowDeleteModal(false);
      setDeletingCourse(null);
      fetchCourses();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete course');
      setShowDeleteModal(false);
    }
  };

  const handleRestore = async (course) => {
    try {
      await courseAPI.restoreCourse(course._id);
      setSuccess(`"${course.courseCode}" has been restored`);
      fetchCourses();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to restore course');
    }
  };

  const handleModalSuccess = (action) => {
    setSuccess(`Course ${action} successfully!`);
    fetchCourses();
  };

  // View course details
  const handleViewDetails = async (course) => {
    setDetailCourse(course);
    setShowDetailModal(true);
    setPrereqTree(null);

    if (course.prerequisites?.length > 0) {
      setLoadingTree(true);
      try {
        const res = await courseAPI.getPrereqTree(course._id);
        if (res.data.success) setPrereqTree(res.data.data);
      } catch (err) {
        console.error('Error loading prereq tree:', err);
      } finally {
        setLoadingTree(false);
      }
    }
  };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery('');
    setFilterType('');
    setFilterDepartment('');
    setFilterDomain('');
    setFilterActive('');
    setPage(1);
  };

  const hasActiveFilters = filterType || filterDepartment || filterDomain || filterActive !== '';

  const getDepartmentName = (dept) => {
    if (!dept) return 'N/A';
    if (typeof dept === 'object') return dept.departmentCode || dept.departmentName || dept.name || 'N/A';
    const found = departments.find(d => d._id === dept);
    return found ? (found.departmentCode || found.departmentName || found.name) : 'N/A';
  };

  const statCards = [
    { icon: BookOpen, label: 'Total Courses', value: stats.total, color: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' },
    { icon: BookMarked, label: 'Core', value: stats.core, color: '#2563eb', gradient: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' },
    { icon: Layers, label: 'Elective', value: stats.elective, color: '#8b5cf6', gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)' },
    { icon: FlaskConical, label: 'Lab', value: stats.lab, color: '#10b981', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' },
    { icon: Clock, label: 'Inactive', value: stats.inactive, color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' },
  ];

  return (
    <div className="p-8 max-w-[1400px] mx-auto max-md:p-4">
      {/* Page Header */}
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4 max-md:flex-col max-md:items-start">
        <div>
          <h1 className="text-[2rem] font-bold text-slate-800 m-0">Course Catalog</h1>
          <p className="text-[0.95rem] text-slate-500 mt-1">Manage courses, prerequisites, and classifications</p>
        </div>
        <div className="flex gap-3 max-md:w-full">
          <button className={`${btnSecondaryClass} max-md:flex-1 max-md:justify-center`} onClick={() => setShowFilters(!showFilters)}>
            <Filter size={18} />
            Filters
            {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-primary-500"></span>}
          </button>
          <button className={`${btnPrimaryClass} max-md:flex-1 max-md:justify-center`} onClick={handleAddCourse}>
            <Plus size={18} />
            Add Course
          </button>
        </div>
      </div>

      {/* Success/Error Alerts */}
      {success && (
        <div className="flex items-center gap-3 py-4 px-5 rounded-lg mb-6 text-[0.95rem] bg-green-50 text-green-800 border border-green-200">
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="ml-auto bg-transparent border-none cursor-pointer text-inherit opacity-70 hover:opacity-100 transition-opacity">
            <X size={16} />
          </button>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 py-4 px-5 rounded-lg mb-6 text-[0.95rem] bg-red-50 text-red-800 border border-red-200">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto bg-transparent border-none cursor-pointer text-inherit opacity-70 hover:opacity-100 transition-opacity">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-5 gap-5 mb-8 max-lg:grid-cols-3 max-md:grid-cols-2 max-sm:grid-cols-1">
        {statCards.map((stat, index) => (
          <div key={index} className="relative bg-white rounded-xl p-5 shadow-sm overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: stat.gradient }}></div>
            <div className="absolute top-0 right-0 w-[100px] h-[100px] opacity-5 rounded-full translate-x-[30%] -translate-y-[30%]" style={{ background: stat.gradient }}></div>
            <div className="mb-3">
              <div className="inline-flex items-center justify-center w-11 h-11 rounded-xl" style={{ backgroundColor: `${stat.color}15`, color: stat.color }}>
                <stat.icon size={22} />
              </div>
            </div>
            <p className="text-[0.82rem] text-slate-500 m-0 mb-1 font-medium">{stat.label}</p>
            <h2 className="text-2xl font-bold text-slate-800 m-0">{stat.value}</h2>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex gap-4 items-center max-md:flex-col">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search by code, name, description, or domain..."
              className={`${inputClass} pl-11`}
            />
          </div>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="text-sm text-primary-600 hover:text-primary-700 font-medium bg-transparent border-none cursor-pointer whitespace-nowrap">
              Clear all filters
            </button>
          )}
        </div>

        {/* Expandable Filters */}
        {showFilters && (
          <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100 max-lg:grid-cols-2 max-md:grid-cols-1">
            <div>
              <label className={labelClass}>Course Type</label>
              <select value={filterType} onChange={(e) => { setFilterType(e.target.value); setPage(1); }} className={inputClass}>
                <option value="">All Types</option>
                <option value="core">Core</option>
                <option value="elective">Elective</option>
                <option value="lab">Lab</option>
                <option value="project">Project</option>
                <option value="internship">Internship</option>
                <option value="thesis">Thesis</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Department</label>
              <select value={filterDepartment} onChange={(e) => { setFilterDepartment(e.target.value); setPage(1); }} className={inputClass}>
                <option value="">All Departments</option>
                {departments.map(d => (
                  <option key={d._id} value={d._id}>{d.departmentCode || d.departmentName || d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Domain</label>
              <select value={filterDomain} onChange={(e) => { setFilterDomain(e.target.value); setPage(1); }} className={inputClass}>
                <option value="">All Domains</option>
                {domains.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select value={filterActive} onChange={(e) => { setFilterActive(e.target.value); setPage(1); }} className={inputClass}>
                <option value="">All</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Course Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-16 text-slate-500">
            <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-primary-500 rounded-full animate-spin mr-3"></div>
            Loading courses...
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-lg text-slate-500 mb-2">No courses found</p>
            <p className="text-sm text-slate-400">
              {hasActiveFilters || searchQuery ? 'Try adjusting your filters or search query' : 'Get started by adding your first course'}
            </p>
            {!hasActiveFilters && !searchQuery && (
              <button className={`${btnPrimaryClass} mt-4`} onClick={handleAddCourse}>
                <Plus size={18} />
                Add Course
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-200">
                    <th className="text-left py-3.5 px-5 text-sm font-semibold text-slate-700">Course Code</th>
                    <th className="text-left py-3.5 px-5 text-sm font-semibold text-slate-700">Course Name</th>
                    <th className="text-left py-3.5 px-5 text-sm font-semibold text-slate-700 max-lg:hidden">Department</th>
                    <th className="text-left py-3.5 px-5 text-sm font-semibold text-slate-700">Type</th>
                    <th className="text-center py-3.5 px-5 text-sm font-semibold text-slate-700">Credits</th>
                    <th className="text-left py-3.5 px-5 text-sm font-semibold text-slate-700 max-lg:hidden">Prerequisites</th>
                    <th className="text-left py-3.5 px-5 text-sm font-semibold text-slate-700">Status</th>
                    <th className="text-right py-3.5 px-5 text-sm font-semibold text-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {courses.map((course) => {
                    const typeColor = COURSE_TYPE_COLORS[course.courseType] || COURSE_TYPE_COLORS.core;
                    const TypeIcon = COURSE_TYPE_ICONS[course.courseType] || BookOpen;
                    return (
                      <tr key={course._id} className={`border-b transition-colors ${course.isActive !== false ? 'border-gray-100 hover:bg-slate-50' : 'border-gray-200 bg-gray-50/50 opacity-75'}`}>
                        <td className="py-3.5 px-5">
                          <span className="font-semibold text-slate-800 text-[0.95rem]">{course.courseCode}</span>
                        </td>
                        <td className="py-3.5 px-5">
                          <div>
                            <p className="font-medium text-slate-700 m-0 text-[0.92rem]">{course.courseName}</p>
                            {course.domain && (
                              <p className="text-xs text-slate-400 m-0 mt-0.5">{course.domain}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-5 text-slate-600 text-sm max-lg:hidden">
                          {getDepartmentName(course.department)}
                        </td>
                        <td className="py-3.5 px-5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${typeColor.bg} ${typeColor.text} border ${typeColor.border}`}>
                            <TypeIcon size={12} />
                            {course.courseType?.charAt(0).toUpperCase() + course.courseType?.slice(1)}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 text-center">
                          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-700 font-bold text-sm">
                            {course.creditHours}
                          </span>
                        </td>
                        <td className="py-3.5 px-5 max-lg:hidden">
                          {course.prerequisites?.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {course.prerequisites.slice(0, 3).map((p, i) => (
                                <span key={i} className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-medium">
                                  {typeof p === 'object' ? p.courseCode : p}
                                </span>
                              ))}
                              {course.prerequisites.length > 3 && (
                                <span className="text-xs text-slate-400 font-medium">+{course.prerequisites.length - 3} more</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">None</span>
                          )}
                        </td>
                        <td className="py-3.5 px-5">
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${course.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                            {course.isActive !== false ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3.5 px-5">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleViewDetails(course)}
                              className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
                              title="View Details"
                            >
                              <Eye size={17} />
                            </button>
                            <button
                              onClick={() => handleEditCourse(course)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit Course"
                            >
                              <Edit size={17} />
                            </button>
                            {course.isActive === false ? (
                              <button
                                onClick={() => handleRestore(course)}
                                className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Restore Course"
                              >
                                <RotateCcw size={17} />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleDeleteClick(course)}
                                className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete Course"
                              >
                                <Trash2 size={17} />
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

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-4 border-t border-gray-100">
                <p className="text-sm text-slate-500 m-0">
                  Showing {(page - 1) * limit + 1}–{Math.min(page * limit, pagination.total)} of {pagination.total} courses
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="p-2 rounded-lg border border-gray-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  {Array.from({ length: Math.min(pagination.totalPages, 5) }, (_, i) => {
                    let pageNum;
                    if (pagination.totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (page <= 3) {
                      pageNum = i + 1;
                    } else if (page >= pagination.totalPages - 2) {
                      pageNum = pagination.totalPages - 4 + i;
                    } else {
                      pageNum = page - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                          page === pageNum
                            ? 'bg-primary-500 text-white'
                            : 'border border-gray-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                    disabled={page >= pagination.totalPages}
                    className="p-2 rounded-lg border border-gray-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add/Edit Course Modal */}
      <CourseModal
        isOpen={showCourseModal}
        onClose={() => { setShowCourseModal(false); setEditingCourse(null); }}
        onSuccess={handleModalSuccess}
        editCourse={editingCourse}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingCourse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4 animate-fade-in" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-white rounded-xl max-w-[500px] w-full shadow-xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-slate-800 m-0">Delete Course</h2>
              <button className="bg-transparent border-none cursor-pointer text-slate-500 hover:text-slate-800 transition-colors p-1" onClick={() => setShowDeleteModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-start gap-4 mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle size={24} className="text-red-600 shrink-0 mt-1" />
                <div>
                  <p className="text-slate-800 font-semibold mb-2">Delete this course?</p>
                  <p className="text-sm text-slate-600 mb-3">This will soft-delete the course. It can be restored later if needed.</p>
                  <div className="mt-3 p-3 bg-white rounded border border-red-200">
                    <p className="text-sm text-slate-600 mb-1"><strong>Code:</strong> {deletingCourse.courseCode}</p>
                    <p className="text-sm text-slate-600 mb-1"><strong>Name:</strong> {deletingCourse.courseName}</p>
                    <p className="text-sm text-slate-600 m-0"><strong>Credits:</strong> {deletingCourse.creditHours}</p>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" className={btnSecondaryClass} onClick={() => setShowDeleteModal(false)}>Cancel</button>
                <button type="button" className="inline-flex items-center gap-2 py-2.5 px-5 border-none rounded-lg text-[0.95rem] font-medium cursor-pointer transition-all bg-red-600 text-white hover:bg-red-700" onClick={confirmDelete}>
                  <Trash2 size={18} />
                  Delete Course
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Course Detail Modal */}
      {showDetailModal && detailCourse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4 animate-fade-in" onClick={() => setShowDetailModal(false)}>
          <div className="bg-white rounded-xl max-w-[750px] w-full max-h-[90vh] overflow-y-auto shadow-xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 m-0">{detailCourse.courseCode}</h2>
                <p className="text-[0.95rem] text-slate-500 m-0 mt-1">{detailCourse.courseName}</p>
              </div>
              <button className="bg-transparent border-none cursor-pointer text-slate-500 hover:text-slate-800 transition-colors p-1" onClick={() => setShowDetailModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="p-6">
              {/* Info Grid */}
              <div className="grid grid-cols-3 gap-4 mb-6 max-md:grid-cols-2">
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-xs text-slate-500 mb-1 font-medium">Credit Hours</p>
                  <p className="text-xl font-bold text-slate-800 m-0">{detailCourse.creditHours}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-xs text-slate-500 mb-1 font-medium">Type</p>
                  <p className="text-base font-semibold text-slate-800 m-0 capitalize">{detailCourse.courseType}</p>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-xs text-slate-500 mb-1 font-medium">Status</p>
                  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${detailCourse.isActive !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {detailCourse.isActive !== false ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </div>

              {/* Hours breakdown */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-xs text-blue-600 mb-1 font-medium">Lecture</p>
                  <p className="text-lg font-bold text-blue-800 m-0">{detailCourse.lectureHours || 0}h</p>
                </div>
                <div className="text-center p-3 bg-emerald-50 rounded-lg">
                  <p className="text-xs text-emerald-600 mb-1 font-medium">Lab</p>
                  <p className="text-lg font-bold text-emerald-800 m-0">{detailCourse.labHours || 0}h</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <p className="text-xs text-purple-600 mb-1 font-medium">Tutorial</p>
                  <p className="text-lg font-bold text-purple-800 m-0">{detailCourse.tutorialHours || 0}h</p>
                </div>
              </div>

              {/* Department & Domain */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-xs text-slate-500 mb-1 font-medium">Department</p>
                  <p className="text-sm text-slate-800 font-medium m-0">{getDepartmentName(detailCourse.department)}</p>
                </div>
                {detailCourse.domain && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1 font-medium">Domain</p>
                    <p className="text-sm text-slate-800 font-medium m-0">{detailCourse.domain}</p>
                  </div>
                )}
              </div>

              {/* Description */}
              {detailCourse.description && (
                <div className="mb-6">
                  <p className="text-xs text-slate-500 mb-2 font-medium">Description</p>
                  <p className="text-sm text-slate-700 leading-relaxed m-0 bg-slate-50 p-4 rounded-lg">{detailCourse.description}</p>
                </div>
              )}

              {/* Prerequisites */}
              {detailCourse.prerequisites?.length > 0 && (
                <div className="mb-6">
                  <p className="text-xs text-slate-500 mb-2 font-medium flex items-center gap-1.5">
                    <GitBranch size={14} />
                    Prerequisites
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {detailCourse.prerequisites.map((p, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium border border-blue-200">
                        {typeof p === 'object' ? `${p.courseCode} - ${p.courseName}` : p}
                      </span>
                    ))}
                  </div>
                  {/* Prereq Tree */}
                  {loadingTree && <p className="text-xs text-slate-400 mt-2">Loading prerequisite tree...</p>}
                  {prereqTree && (
                    <div className="mt-3 p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 mb-1">Prerequisite chain: {prereqTree.totalPrereqs} total, depth {prereqTree.maxDepth}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Corequisites */}
              {detailCourse.corequisites?.length > 0 && (
                <div className="mb-6">
                  <p className="text-xs text-slate-500 mb-2 font-medium">Corequisites</p>
                  <div className="flex flex-wrap gap-2">
                    {detailCourse.corequisites.map((c, i) => (
                      <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium border border-purple-200">
                        {typeof c === 'object' ? `${c.courseCode} - ${c.courseName}` : c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Pair Course */}
              {detailCourse.pairCourse && (
                <div className="mb-6">
                  <p className="text-xs text-slate-500 mb-2 font-medium">Pair Course</p>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium border border-amber-200">
                    {typeof detailCourse.pairCourse === 'object' ? `${detailCourse.pairCourse.courseCode} - ${detailCourse.pairCourse.courseName}` : detailCourse.pairCourse}
                  </span>
                </div>
              )}

              {/* Learning Outcomes */}
              {detailCourse.learningOutcomes?.length > 0 && (
                <div className="mb-6">
                  <p className="text-xs text-slate-500 mb-2 font-medium">Learning Outcomes</p>
                  <ol className="m-0 pl-5 text-sm text-slate-700 space-y-1">
                    {detailCourse.learningOutcomes.map((outcome, i) => (
                      <li key={i} className="leading-relaxed">{outcome}</li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Syllabus */}
              {detailCourse.syllabus && (
                <div className="mb-4">
                  <p className="text-xs text-slate-500 mb-2 font-medium">Syllabus</p>
                  <div className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-lg whitespace-pre-line">
                    {detailCourse.syllabus}
                  </div>
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 mt-6">
                <button type="button" className={btnSecondaryClass} onClick={() => { setShowDetailModal(false); handleEditCourse(detailCourse); }}>
                  <Edit size={16} />
                  Edit
                </button>
                <button type="button" className={btnPrimaryClass} onClick={() => setShowDetailModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseManagement;
