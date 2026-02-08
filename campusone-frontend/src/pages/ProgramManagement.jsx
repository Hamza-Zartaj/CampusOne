import React, { useState, useEffect, useCallback } from 'react';
import {
  GraduationCap,
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
  Check,
  Clock,
  BookOpen,
  Building2,
  Layers,
  Hash,
} from 'lucide-react';
import { programAPI, departmentAPI } from '../utils/api';

const inputClass =
  'w-full py-2.5 px-3.5 border border-gray-200 rounded-lg text-[0.95rem] transition-all focus:outline-none focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10';
const labelClass = 'block text-[0.9rem] font-medium text-slate-800 mb-2';
const btnPrimaryClass =
  'inline-flex items-center gap-2 py-2.5 px-5 border-none rounded-lg text-[0.95rem] font-medium cursor-pointer transition-all bg-gradient-primary text-white hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(59,130,246,0.3)] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none';
const btnSecondaryClass =
  'inline-flex items-center gap-2 py-2.5 px-5 border border-gray-200 rounded-lg text-[0.95rem] font-medium cursor-pointer transition-all bg-white text-slate-800 hover:bg-slate-50 hover:border-gray-300';

const PROGRAM_TYPES = [
  'Certificate',
  'Diploma',
  'Associate',
  'Bachelor',
  'Master',
  'Doctorate',
  'PostDoc',
];

const TYPE_COLORS = {
  Certificate: 'bg-teal-50 text-teal-700',
  Diploma: 'bg-sky-50 text-sky-700',
  Associate: 'bg-indigo-50 text-indigo-700',
  Bachelor: 'bg-blue-50 text-blue-700',
  Master: 'bg-purple-50 text-purple-700',
  Doctorate: 'bg-amber-50 text-amber-700',
  PostDoc: 'bg-rose-50 text-rose-700',
};

const ProgramManagement = () => {
  // List state
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Departments for filter and form
  const [departments, setDepartments] = useState([]);

  // Pagination
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const limit = 12;

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingProgram, setEditingProgram] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingProgram, setDeletingProgram] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailProgram, setDetailProgram] = useState(null);

  // Form
  const [form, setForm] = useState({
    programCode: '',
    name: '',
    description: '',
    department: '',
    type: 'Bachelor',
    durationYears: 4,
    totalSemesters: 8,
    totalCredits: 160,
    eligibilityCriteria: '',
  });
  const [formLoading, setFormLoading] = useState(false);

  // Auto-dismiss alerts
  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 4000);
      return () => clearTimeout(t);
    }
  }, [success]);

  // Load departments
  useEffect(() => {
    departmentAPI
      .getAllDepartments({ limit: 200, isActive: true })
      .then((res) => {
        if (res.data.success) setDepartments(res.data.data || []);
      })
      .catch(() => {});
  }, []);

  // Fetch programs
  const fetchPrograms = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit };
      if (searchQuery) params.search = searchQuery;
      if (filterDepartment) params.department = filterDepartment;
      if (filterType) params.type = filterType;
      if (filterActive) params.isActive = filterActive;

      const res = await programAPI.getAllPrograms(params);
      if (res.data.success) {
        setPrograms(res.data.data);
        setPagination(
          res.data.pagination || { total: res.data.count || 0, totalPages: 1 }
        );
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load programs');
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, filterDepartment, filterType, filterActive]);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  // Form handlers
  const openCreateModal = () => {
    setEditingProgram(null);
    setForm({
      programCode: '',
      name: '',
      description: '',
      department: '',
      type: 'Bachelor',
      durationYears: 4,
      totalSemesters: 8,
      totalCredits: 160,
      eligibilityCriteria: '',
    });
    setShowFormModal(true);
  };

  const openEditModal = (prog) => {
    setEditingProgram(prog);
    setForm({
      programCode: prog.programCode || '',
      name: prog.name || '',
      description: prog.description || '',
      department:
        typeof prog.department === 'object'
          ? prog.department._id
          : prog.department || '',
      type: prog.type || 'Bachelor',
      durationYears: prog.durationYears || 4,
      totalSemesters: prog.totalSemesters || 8,
      totalCredits: prog.totalCredits || 160,
      eligibilityCriteria: prog.eligibilityCriteria || '',
    });
    setShowFormModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (
      !form.programCode.trim() ||
      !form.name.trim() ||
      !form.department
    ) {
      setError('Program code, name, and department are required');
      return;
    }
    setFormLoading(true);
    setError('');
    try {
      const payload = { ...form };
      if (!payload.description) delete payload.description;
      if (!payload.eligibilityCriteria) delete payload.eligibilityCriteria;

      if (editingProgram) {
        await programAPI.updateProgram(editingProgram._id, payload);
        setSuccess('Program updated successfully');
      } else {
        await programAPI.createProgram(payload);
        setSuccess('Program created successfully');
      }
      setShowFormModal(false);
      fetchPrograms();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save program');
    } finally {
      setFormLoading(false);
    }
  };

  // Detail
  const openDetailModal = async (prog) => {
    try {
      const res = await programAPI.getProgramById(prog._id);
      if (res.data.success) {
        setDetailProgram(res.data.data);
      } else {
        setDetailProgram(prog);
      }
    } catch {
      setDetailProgram(prog);
    }
    setShowDetailModal(true);
  };

  // Delete
  const handleDelete = async () => {
    if (!deletingProgram) return;
    try {
      await programAPI.deleteProgram(deletingProgram._id);
      setSuccess('Program deleted');
      setShowDeleteModal(false);
      setDeletingProgram(null);
      fetchPrograms();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete');
    }
  };

  const handleRestore = async (prog) => {
    try {
      await programAPI.restoreProgram(prog._id);
      setSuccess('Program restored');
      fetchPrograms();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to restore');
    }
  };

  // Helpers
  const getDeptName = (prog) => {
    const d = prog.department;
    if (!d) return '—';
    if (typeof d === 'object') return d.name || d.departmentCode || '—';
    const found = departments.find((dep) => dep._id === d);
    return found ? found.name : d;
  };

  const getDeptCode = (prog) => {
    const d = prog.department;
    if (!d) return '';
    if (typeof d === 'object') return d.departmentCode || '';
    const found = departments.find((dep) => dep._id === d);
    return found ? found.departmentCode : '';
  };

  // Clear filters
  const clearFilters = () => {
    setSearchQuery('');
    setFilterDepartment('');
    setFilterType('');
    setFilterActive('');
    setPage(1);
  };

  const hasActiveFilters = filterDepartment || filterType || filterActive;

  // Stats
  const totalPrograms = pagination.total || programs.length;
  const activeCount = programs.filter((p) => p.isActive !== false).length;

  // Group by department for the list
  const groupedByDept = programs.reduce((acc, prog) => {
    const deptName = getDeptName(prog);
    if (!acc[deptName]) acc[deptName] = [];
    acc[deptName].push(prog);
    return acc;
  }, {});

  return (
    <div className="p-8 max-w-[1400px] mx-auto max-md:p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4 max-md:flex-col max-md:items-start">
        <div>
          <h1 className="text-[2rem] font-bold text-slate-800 m-0">
            Programs
          </h1>
          <p className="text-[0.95rem] text-slate-500 mt-1">
            Manage academic programs and degrees
          </p>
        </div>
        <button className={btnPrimaryClass} onClick={openCreateModal}>
          <Plus size={18} /> New Program
        </button>
      </div>

      {/* Alerts */}
      {success && (
        <div className="flex items-center gap-3 py-4 px-5 rounded-lg mb-6 text-[0.95rem] bg-green-50 text-green-800 border border-green-200">
          <Check size={18} />
          <span>{success}</span>
          <button
            onClick={() => setSuccess('')}
            className="ml-auto bg-transparent border-none cursor-pointer text-inherit opacity-70 hover:opacity-100"
          >
            <X size={16} />
          </button>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 py-4 px-5 rounded-lg mb-6 text-[0.95rem] bg-red-50 text-red-800 border border-red-200">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button
            onClick={() => setError('')}
            className="ml-auto bg-transparent border-none cursor-pointer text-inherit opacity-70 hover:opacity-100"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6 max-lg:grid-cols-2 max-md:grid-cols-1">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <GraduationCap size={20} />
            </div>
            <p className="text-xs text-slate-500 font-medium">
              Total Programs
            </p>
          </div>
          <p className="text-2xl font-bold text-slate-800 m-0">
            {totalPrograms}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Check size={20} />
            </div>
            <p className="text-xs text-slate-500 font-medium">Active</p>
          </div>
          <p className="text-2xl font-bold text-slate-800 m-0">
            {activeCount}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Building2 size={20} />
            </div>
            <p className="text-xs text-slate-500 font-medium">Departments</p>
          </div>
          <p className="text-2xl font-bold text-slate-800 m-0">
            {Object.keys(groupedByDept).length}
          </p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Layers size={20} />
            </div>
            <p className="text-xs text-slate-500 font-medium">Program Types</p>
          </div>
          <p className="text-2xl font-bold text-slate-800 m-0">
            {new Set(programs.map((p) => p.type)).size}
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
        <div className="flex gap-3 items-center max-md:flex-col max-md:items-stretch">
          <div className="flex-1 relative">
            <Search
              size={18}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search by name, code, or description..."
              className={`${inputClass} pl-11`}
            />
          </div>
          <button
            className={btnSecondaryClass}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={18} /> Filters {showFilters ? '▲' : '▼'}
          </button>
        </div>
        {showFilters && (
          <div className="mt-4 flex gap-3 items-end flex-wrap">
            <div className="min-w-[180px]">
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Department
              </label>
              <select
                value={filterDepartment}
                onChange={(e) => {
                  setFilterDepartment(e.target.value);
                  setPage(1);
                }}
                className={inputClass}
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.departmentCode} — {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[160px]">
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Type
              </label>
              <select
                value={filterType}
                onChange={(e) => {
                  setFilterType(e.target.value);
                  setPage(1);
                }}
                className={inputClass}
              >
                <option value="">All Types</option>
                {PROGRAM_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[140px]">
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Status
              </label>
              <select
                value={filterActive}
                onChange={(e) => {
                  setFilterActive(e.target.value);
                  setPage(1);
                }}
                className={inputClass}
              >
                <option value="">All Status</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-primary-500 hover:text-primary-700 bg-transparent border-none cursor-pointer font-medium py-2"
              >
                Clear all
              </button>
            )}
          </div>
        )}
      </div>

      {/* Programs grouped by department */}
      {loading ? (
        <div className="flex justify-center items-center py-16 text-slate-500">
          <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-primary-500 rounded-full animate-spin mr-3"></div>
          Loading programs...
        </div>
      ) : programs.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <GraduationCap size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-lg text-slate-500 mb-2">No programs found</p>
          <p className="text-sm text-slate-400">
            Create a new program or adjust your search
          </p>
        </div>
      ) : (
        Object.entries(groupedByDept).map(([deptName, progs]) => (
          <div key={deptName} className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Building2 size={18} className="text-slate-400" />
              <h2 className="text-lg font-semibold text-slate-700 m-0">
                {deptName}
              </h2>
              <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-medium">
                {progs.length} program{progs.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-5 max-lg:grid-cols-2 max-md:grid-cols-1">
              {progs.map((prog) => (
                <div
                  key={prog._id}
                  className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow"
                >
                  {/* Card header */}
                  <div className="p-5 border-b border-gray-100">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-primary-500 to-cyan-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
                          {prog.programCode?.slice(0, 3) || 'N/A'}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base font-semibold text-slate-800 m-0 truncate">
                            {prog.name}
                          </h3>
                          <p className="text-xs text-slate-500 m-0 mt-0.5 font-medium">
                            {prog.programCode}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded shrink-0 ml-2 ${
                          prog.isActive !== false
                            ? 'bg-green-50 text-green-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {prog.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {/* Type badge */}
                    <span
                      className={`inline-block text-xs font-medium px-2 py-0.5 rounded mt-1 ${
                        TYPE_COLORS[prog.type] || 'bg-gray-50 text-gray-600'
                      }`}
                    >
                      {prog.type}
                    </span>
                  </div>

                  {/* Card body */}
                  <div className="p-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Clock size={14} className="text-slate-400 shrink-0" />
                      <span>
                        {prog.durationYears} year{prog.durationYears !== 1 ? 's' : ''}{' '}
                        · {prog.totalSemesters} semester
                        {prog.totalSemesters !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <BookOpen size={14} className="text-slate-400 shrink-0" />
                      <span>{prog.totalCredits} total credits</span>
                    </div>
                    {getDeptCode(prog) && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <Building2
                          size={14}
                          className="text-slate-400 shrink-0"
                        />
                        <span className="truncate">{getDeptCode(prog)}</span>
                      </div>
                    )}
                    {prog.description && (
                      <p className="text-xs text-slate-400 m-0 mt-1 line-clamp-2">
                        {prog.description}
                      </p>
                    )}
                  </div>

                  {/* Card actions */}
                  <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-end gap-1">
                    <button
                      onClick={() => openDetailModal(prog)}
                      title="View"
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors bg-transparent border-none cursor-pointer"
                    >
                      <Eye size={16} />
                    </button>
                    <button
                      onClick={() => openEditModal(prog)}
                      title="Edit"
                      className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors bg-transparent border-none cursor-pointer"
                    >
                      <Edit size={16} />
                    </button>
                    {prog.isDeleted ? (
                      <button
                        onClick={() => handleRestore(prog)}
                        title="Restore"
                        className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors bg-transparent border-none cursor-pointer"
                      >
                        <RotateCcw size={16} />
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setDeletingProgram(prog);
                          setShowDeleteModal(true);
                        }}
                        title="Delete"
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors bg-transparent border-none cursor-pointer"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-xl shadow-sm px-5 py-4">
          <p className="text-sm text-slate-500 m-0">
            Showing {(page - 1) * limit + 1}–
            {Math.min(page * limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="p-2 rounded-lg border border-gray-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-medium text-slate-700 px-3">
              {page} / {pagination.totalPages}
            </span>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="p-2 rounded-lg border border-gray-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}

      {/* ============ CREATE / EDIT MODAL ============ */}
      {showFormModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4 animate-fade-in"
          onClick={() => setShowFormModal(false)}
        >
          <div
            className="bg-white rounded-xl max-w-[640px] w-full max-h-[90vh] overflow-y-auto shadow-xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-slate-800 m-0">
                {editingProgram ? 'Edit Program' : 'Create Program'}
              </h2>
              <button
                onClick={() => setShowFormModal(false)}
                className="bg-transparent border-none cursor-pointer text-slate-500 hover:text-slate-800 p-1"
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleFormSubmit} className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-4 max-md:grid-cols-1">
                <div>
                  <label className={labelClass}>Program Code *</label>
                  <input
                    type="text"
                    value={form.programCode}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        programCode: e.target.value.toUpperCase(),
                      }))
                    }
                    placeholder="e.g. BTECH-CSE"
                    className={inputClass}
                    maxLength={20}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Program Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="e.g. B.Tech Computer Science"
                    className={inputClass}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4 max-md:grid-cols-1">
                <div>
                  <label className={labelClass}>Department *</label>
                  <select
                    value={form.department}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        department: e.target.value,
                      }))
                    }
                    className={inputClass}
                    required
                  >
                    <option value="">Select Department</option>
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>
                        {d.departmentCode} — {d.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Program Type *</label>
                  <select
                    value={form.type}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, type: e.target.value }))
                    }
                    className={inputClass}
                    required
                  >
                    {PROGRAM_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mb-4 max-md:grid-cols-1">
                <div>
                  <label className={labelClass}>Duration (Years) *</label>
                  <input
                    type="number"
                    value={form.durationYears}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        durationYears: parseInt(e.target.value) || 1,
                      }))
                    }
                    min={1}
                    max={10}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Total Semesters *</label>
                  <input
                    type="number"
                    value={form.totalSemesters}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        totalSemesters: parseInt(e.target.value) || 1,
                      }))
                    }
                    min={1}
                    max={20}
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Total Credits *</label>
                  <input
                    type="number"
                    value={form.totalCredits}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        totalCredits: parseInt(e.target.value) || 1,
                      }))
                    }
                    min={1}
                    className={inputClass}
                    required
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className={labelClass}>Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="Brief description of the program..."
                  rows={2}
                  className={`${inputClass} resize-y`}
                />
              </div>

              <div className="mb-6">
                <label className={labelClass}>Eligibility Criteria</label>
                <textarea
                  value={form.eligibilityCriteria}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      eligibilityCriteria: e.target.value,
                    }))
                  }
                  placeholder="e.g. 10+2 with Physics, Chemistry, Maths..."
                  rows={2}
                  className={`${inputClass} resize-y`}
                />
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  className={btnSecondaryClass}
                  onClick={() => setShowFormModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={btnPrimaryClass}
                  disabled={formLoading}
                >
                  {formLoading
                    ? 'Saving...'
                    : editingProgram
                    ? 'Update Program'
                    : 'Create Program'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============ DETAIL MODAL ============ */}
      {showDetailModal && detailProgram && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4 animate-fade-in"
          onClick={() => setShowDetailModal(false)}
        >
          <div
            className="bg-white rounded-xl max-w-[580px] w-full max-h-[85vh] overflow-y-auto shadow-xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-slate-800 m-0">
                Program Details
              </h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="bg-transparent border-none cursor-pointer text-slate-500 hover:text-slate-800 p-1"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              {/* Header badge */}
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-500 to-cyan-500 text-white flex items-center justify-center font-bold text-lg shrink-0">
                  {detailProgram.programCode?.slice(0, 3)}
                </div>
                <div className="min-w-0">
                  <h3 className="text-lg font-bold text-slate-800 m-0">
                    {detailProgram.name}
                  </h3>
                  <p className="text-sm text-slate-500 m-0 mt-0.5">
                    {detailProgram.programCode}
                  </p>
                </div>
                <div className="ml-auto flex flex-col items-end gap-1 shrink-0">
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded ${
                      detailProgram.isActive !== false
                        ? 'bg-green-50 text-green-700'
                        : 'bg-red-50 text-red-700'
                    }`}
                  >
                    {detailProgram.isActive !== false ? 'Active' : 'Inactive'}
                  </span>
                  <span
                    className={`text-xs font-medium px-2.5 py-1 rounded ${
                      TYPE_COLORS[detailProgram.type] ||
                      'bg-gray-50 text-gray-600'
                    }`}
                  >
                    {detailProgram.type}
                  </span>
                </div>
              </div>

              {detailProgram.description && (
                <p className="text-sm text-slate-600 mb-5 m-0">
                  {detailProgram.description}
                </p>
              )}

              {/* Info cards */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="p-3 bg-slate-50 rounded-lg text-center">
                  <p className="text-xs text-slate-500 m-0 mb-1">Duration</p>
                  <p className="text-base font-bold text-slate-700 m-0">
                    {detailProgram.durationYears} yr
                    {detailProgram.durationYears !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg text-center">
                  <p className="text-xs text-slate-500 m-0 mb-1">Semesters</p>
                  <p className="text-base font-bold text-slate-700 m-0">
                    {detailProgram.totalSemesters}
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg text-center">
                  <p className="text-xs text-slate-500 m-0 mb-1">Credits</p>
                  <p className="text-base font-bold text-slate-700 m-0">
                    {detailProgram.totalCredits}
                  </p>
                </div>
              </div>

              {/* Additional info */}
              <div className="flex flex-col gap-3 mb-5">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <Building2
                    size={16}
                    className="text-slate-400 shrink-0"
                  />
                  <div>
                    <p className="text-xs text-slate-500 m-0">Department</p>
                    <p className="text-sm font-medium text-slate-700 m-0">
                      {getDeptName(detailProgram)}
                    </p>
                  </div>
                </div>
                {detailProgram.eligibilityCriteria && (
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <Hash
                      size={16}
                      className="text-slate-400 shrink-0 mt-0.5"
                    />
                    <div>
                      <p className="text-xs text-slate-500 m-0">
                        Eligibility
                      </p>
                      <p className="text-sm font-medium text-slate-700 m-0">
                        {detailProgram.eligibilityCriteria}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Curriculum summary */}
              {detailProgram.curriculum &&
                detailProgram.curriculum.length > 0 && (
                  <div className="mb-5">
                    <p className="text-sm font-semibold text-slate-700 mb-2">
                      Curriculum ({detailProgram.curriculum.length} semester
                      {detailProgram.curriculum.length !== 1 ? 's' : ''}{' '}
                      defined)
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {detailProgram.curriculum
                        .sort(
                          (a, b) => a.semesterNumber - b.semesterNumber
                        )
                        .map((sem) => (
                          <span
                            key={sem.semesterNumber}
                            className="text-xs bg-primary-50 text-primary-700 px-2.5 py-1 rounded-full font-medium"
                          >
                            Sem {sem.semesterNumber}
                            {sem.requiredCourses?.length
                              ? ` · ${sem.requiredCourses.length} courses`
                              : ''}
                          </span>
                        ))}
                    </div>
                  </div>
                )}

              <p className="text-xs text-slate-400 m-0">
                Created:{' '}
                {detailProgram.createdAt
                  ? new Date(detailProgram.createdAt).toLocaleDateString()
                  : '—'}
                {detailProgram.updatedAt &&
                  ` · Updated: ${new Date(
                    detailProgram.updatedAt
                  ).toLocaleDateString()}`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============ DELETE MODAL ============ */}
      {showDeleteModal && deletingProgram && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4 animate-fade-in"
          onClick={() => {
            setShowDeleteModal(false);
            setDeletingProgram(null);
          }}
        >
          <div
            className="bg-white rounded-xl max-w-[450px] w-full shadow-xl animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-red-50 mx-auto mb-4 flex items-center justify-center">
                <Trash2 size={24} className="text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">
                Delete Program?
              </h3>
              <p className="text-sm text-slate-500 mb-6">
                This will soft-delete{' '}
                <strong>
                  {deletingProgram.programCode} — {deletingProgram.name}
                </strong>
                . It can be restored later.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  className={btnSecondaryClass}
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletingProgram(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center gap-2 py-2.5 px-5 border-none rounded-lg text-[0.95rem] font-medium cursor-pointer transition-all bg-red-500 text-white hover:bg-red-600"
                >
                  <Trash2 size={16} /> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgramManagement;
