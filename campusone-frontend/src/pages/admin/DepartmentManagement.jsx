import React, { useState, useEffect, useCallback } from 'react';
import {
  Building2,
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
  User,
} from 'lucide-react';
import { departmentAPI, teacherAPI } from '../../utils/api';

const inputClass = "w-full py-2.5 px-3.5 border border-gray-200 rounded-lg text-[0.95rem] transition-all focus:outline-none focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10";
const labelClass = "block text-[0.9rem] font-medium text-slate-800 mb-2";
const btnPrimaryClass = "inline-flex items-center gap-2 py-2.5 px-5 border-none rounded-lg text-[0.95rem] font-medium cursor-pointer transition-all bg-gradient-primary text-white hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(59,130,246,0.3)] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none";
const btnSecondaryClass = "inline-flex items-center gap-2 py-2.5 px-5 border border-gray-200 rounded-lg text-[0.95rem] font-medium cursor-pointer transition-all bg-white text-slate-800 hover:bg-slate-50 hover:border-gray-300";

const DepartmentManagement = () => {
  // List state
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const limit = 12;

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Teachers for HOD picker
  const [teachers, setTeachers] = useState([]);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [teacherResults, setTeacherResults] = useState([]);
  const [selectedTeacher, setSelectedTeacher] = useState(null);

  // Modal state
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingDept, setDeletingDept] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [detailDept, setDetailDept] = useState(null);

  // Form
  const [form, setForm] = useState({
    name: '',
    description: '',
    headOfDepartment: '',
  });
  const [formLoading, setFormLoading] = useState(false);

  // Load teachers for HOD search
  useEffect(() => {
    teacherAPI.getAllTeachers({ isActive: true, limit: 500 })
      .then(res => {
        if (res.data.success) setTeachers(res.data.data || []);
      })
      .catch((err) => {
        console.error('Failed to load teachers:', err);
        // Don't block the page if teachers fail to load
        setTeachers([]);
      });
  }, []);

  // Fetch departments
  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit };
      if (searchQuery) params.search = searchQuery;
      if (filterActive) params.isActive = filterActive;

      const res = await departmentAPI.getAllDepartments(params);
      if (res.data.success) {
        setDepartments(res.data.data);
        setPagination(res.data.pagination || { total: res.data.count || 0, totalPages: 1 });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load departments');
    } finally {
      setLoading(false);
    }
  }, [page, searchQuery, filterActive]);

  useEffect(() => { fetchDepartments(); }, [fetchDepartments]);

  // Teacher search helper
  const searchTeachers = (q) => {
    if (!q.trim()) return [];
    const lq = q.toLowerCase();
    return teachers.filter(t => {
      const name = `${t.name || ''} ${t.designation || ''} ${t.username || ''}`.toLowerCase();
      return name.includes(lq) || (t.email || '').toLowerCase().includes(lq);
    }).slice(0, 8);
  };

  // Form handlers
  const openCreateModal = () => {
    setEditingDept(null);
    setForm({ name: '', description: '', headOfDepartment: '' });
    setSelectedTeacher(null);
    setTeacherSearch('');
    setShowFormModal(true);
  };

  const openEditModal = (dept) => {
    setEditingDept(dept);
    const hod = dept.headOfDepartment;
    const hodUser = hod && typeof hod === 'object' ? hod : null;
    const hodName = hodUser ? (hodUser.name || '').trim() : '';

    setForm({
      name: dept.name || '',
      description: dept.description || '',
      headOfDepartment: hod && typeof hod === 'object' ? hod._id : (hod || ''),
    });
    setSelectedTeacher(hodUser);
    setTeacherSearch(hodName);
    setShowFormModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Department name is required');
      return;
    }
    setFormLoading(true);
    setError('');
    try {
      const payload = { ...form };
      if (!payload.headOfDepartment) delete payload.headOfDepartment;
      if (!payload.description) delete payload.description;

      if (editingDept) {
        await departmentAPI.updateDepartment(editingDept._id, payload);
        setSuccess('Department updated successfully');
      } else {
        await departmentAPI.createDepartment(payload);
        setSuccess('Department created successfully');
      }
      setShowFormModal(false);
      fetchDepartments();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save department');
    } finally {
      setFormLoading(false);
    }
  };

  // Detail
  const openDetailModal = async (dept) => {
    try {
      const res = await departmentAPI.getDepartmentById(dept._id);
      if (res.data.success) { setDetailDept(res.data.data); }
      else { setDetailDept(dept); }
    } catch {
      setDetailDept(dept);
    }
    setShowDetailModal(true);
  };

  // Delete
  const handleDelete = async () => {
    if (!deletingDept) return;
    try {
      await departmentAPI.deleteDepartment(deletingDept._id);
      setSuccess('Department deleted');
      setShowDeleteModal(false);
      setDeletingDept(null);
      fetchDepartments();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete');
    }
  };

  const handleRestore = async (dept) => {
    try {
      await departmentAPI.restoreDepartment(dept._id);
      setSuccess('Department restored');
      fetchDepartments();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to restore');
    }
  };

  // Helpers
  const getHodName = (dept) => {
    const hod = dept.headOfDepartment;
    if (!hod || typeof hod !== 'object') return '—';
    return (hod.name || '').trim() || '—';
  };

  const getHodDesignation = (dept) => {
    const hod = dept.headOfDepartment;
    if (!hod || typeof hod !== 'object') return '';
    return (hod.designation || 'Lecturer').trim();
  };

  // Stats
  const totalDepts = pagination.total || departments.length;
  const activeDepts = departments.filter(d => d.isActive !== false).length;
  const withHodCount = departments.filter(d => d.headOfDepartment).length;

  return (
    <div className="p-8 max-w-[1400px] mx-auto max-md:p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4 max-md:flex-col max-md:items-start">
        <div>
          <h1 className="text-[2rem] font-bold text-slate-800 m-0">Departments</h1>
          <p className="text-[0.95rem] text-slate-500 mt-1">Manage academic departments</p>
        </div>
        <button className={btnPrimaryClass} onClick={openCreateModal}>
          <Plus size={18} /> New Department
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
      <div className="grid grid-cols-3 gap-4 mb-6 max-md:grid-cols-1">
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center"><Building2 size={20} /></div>
            <p className="text-xs text-slate-500 font-medium">Total Departments</p>
          </div>
          <p className="text-2xl font-bold text-slate-800 m-0">{totalDepts}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center"><Check size={20} /></div>
            <p className="text-xs text-slate-500 font-medium">Active</p>
          </div>
          <p className="text-2xl font-bold text-slate-800 m-0">{activeDepts}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center"><User size={20} /></div>
            <p className="text-xs text-slate-500 font-medium">With HOD Assigned</p>
          </div>
          <p className="text-2xl font-bold text-slate-800 m-0">{withHodCount}</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl shadow-sm p-5 mb-6">
        <div className="flex gap-3 items-center max-md:flex-col max-md:items-stretch">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text" value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder="Search by name, code, or description..."
              className={`${inputClass} pl-11`}
            />
          </div>
          <button className={btnSecondaryClass} onClick={() => setShowFilters(!showFilters)}>
            <Filter size={18} /> Filters {showFilters ? '▲' : '▼'}
          </button>
        </div>
        {showFilters && (
          <div className="mt-4">
            <select value={filterActive} onChange={(e) => { setFilterActive(e.target.value); setPage(1); }} className={`${inputClass} max-w-[200px]`}>
              <option value="">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </div>
        )}
      </div>

      {/* Department Cards Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-16 text-slate-500">
          <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-primary-500 rounded-full animate-spin mr-3"></div>
          Loading departments...
        </div>
      ) : departments.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-12 text-center">
          <Building2 size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-lg text-slate-500 mb-2">No departments found</p>
          <p className="text-sm text-slate-400">Create a new department or adjust your search</p>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-5 mb-6 max-lg:grid-cols-2 max-md:grid-cols-1">
          {departments.map((dept) => (
            <div key={dept._id} className="bg-white rounded-xl shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              {/* Card header */}
              <div className="p-5 border-b border-gray-100">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-primary-500 to-cyan-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
                      {dept.departmentCode?.slice(0, 3) || 'N/A'}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-800 m-0">{dept.name}</h3>
                      <p className="text-xs text-slate-500 m-0 mt-0.5 font-medium">{dept.departmentCode}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded shrink-0 ${
                    dept.isActive !== false ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                  }`}>
                    {dept.isActive !== false ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {dept.description && (
                  <p className="text-sm text-slate-500 m-0 mt-2 line-clamp-2">{dept.description}</p>
                )}
              </div>

              {/* Card body */}
              <div className="p-4 flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <User size={14} className="text-slate-400 shrink-0" />
                  <span className="truncate">HOD: {getHodName(dept)}</span>
                </div>
              </div>

              {/* Card actions */}
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-end gap-1">
                <button onClick={() => openDetailModal(dept)} title="View" className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors bg-transparent border-none cursor-pointer">
                  <Eye size={16} />
                </button>
                <button onClick={() => openEditModal(dept)} title="Edit" className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors bg-transparent border-none cursor-pointer">
                  <Edit size={16} />
                </button>
                {dept.isDeleted ? (
                  <button onClick={() => handleRestore(dept)} title="Restore" className="p-2 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors bg-transparent border-none cursor-pointer">
                    <RotateCcw size={16} />
                  </button>
                ) : (
                  <button onClick={() => { setDeletingDept(dept); setShowDeleteModal(true); }} title="Delete" className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors bg-transparent border-none cursor-pointer">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between bg-white rounded-xl shadow-sm px-5 py-4">
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

      {/* ============ CREATE / EDIT MODAL ============ */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4 animate-fade-in" onClick={() => setShowFormModal(false)}>
          <div className="bg-white rounded-xl max-w-[600px] w-full max-h-[90vh] overflow-y-auto shadow-xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-slate-800 m-0">{editingDept ? 'Edit Department' : 'Create Department'}</h2>
              <button onClick={() => setShowFormModal(false)} className="bg-transparent border-none cursor-pointer text-slate-500 hover:text-slate-800 p-1"><X size={20} /></button>
            </div>
            <form onSubmit={handleFormSubmit} className="p-6">
              <div className="mb-4">
                <label className={labelClass}>Department Name *</label>
                <input
                  type="text" value={form.name}
                  onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g. Computer Science & Engineering"
                  className={inputClass} required
                />
              </div>

              <div className="mb-4">
                <label className={labelClass}>Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the department..."
                  rows={2} className={`${inputClass} resize-y`}
                />
              </div>

              {/* HOD picker */}
              <div className="mb-4">
                <label className={labelClass}>Head of Department</label>
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text" value={teacherSearch}
                    onChange={(e) => { setTeacherSearch(e.target.value); setTeacherResults(searchTeachers(e.target.value)); }}
                    placeholder="Search teacher by name or email..."
                    className={`${inputClass} pl-9`}
                  />
                  {teacherResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto mt-1">
                      {teacherResults.map(t => (
                        <button key={t._id} type="button" onClick={() => {
                          setForm(prev => ({ ...prev, headOfDepartment: t._id }));
                          setSelectedTeacher(t);
                          setTeacherSearch(t.name || '');
                          setTeacherResults([]);
                        }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 cursor-pointer border-none bg-transparent border-b border-gray-50">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-slate-800">{t.name}</span>
                            <span className="text-slate-500 text-xs bg-slate-100 px-2 py-0.5 rounded">{t.designation || 'Lecturer'}</span>
                          </div>
                          <span className="text-slate-400 text-xs">{t.email}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {selectedTeacher && (
                  <div className="mt-2 flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-lg text-sm text-green-700">
                    <Check size={14} /> 
                    <div className="flex-1">
                      <span className="font-medium">{selectedTeacher.name || ''}</span>
                      <span className="text-slate-500 text-xs ml-1">({selectedTeacher.designation || 'Lecturer'})</span>
                    </div>
                    <button type="button" onClick={() => { setSelectedTeacher(null); setForm(prev => ({ ...prev, headOfDepartment: '' })); setTeacherSearch(''); }} className="ml-auto bg-transparent border-none text-green-400 hover:text-green-700 cursor-pointer p-0"><X size={14} /></button>
                  </div>
                )}
              </div>



              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
                <button type="button" className={btnSecondaryClass} onClick={() => setShowFormModal(false)}>Cancel</button>
                <button type="submit" className={btnPrimaryClass} disabled={formLoading}>
                  {formLoading ? 'Saving...' : (editingDept ? 'Update Department' : 'Create Department')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============ DETAIL MODAL ============ */}
      {showDetailModal && detailDept && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4 animate-fade-in" onClick={() => setShowDetailModal(false)}>
          <div className="bg-white rounded-xl max-w-[550px] w-full max-h-[85vh] overflow-y-auto shadow-xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-slate-800 m-0">Department Details</h2>
              <button onClick={() => setShowDetailModal(false)} className="bg-transparent border-none cursor-pointer text-slate-500 hover:text-slate-800 p-1"><X size={20} /></button>
            </div>
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center gap-4 mb-5">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary-500 to-cyan-500 text-white flex items-center justify-center font-bold text-lg shrink-0">
                  {detailDept.departmentCode?.slice(0, 3)}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 m-0">{detailDept.name}</h3>
                  <p className="text-sm text-slate-500 m-0 mt-0.5">{detailDept.departmentCode}</p>
                </div>
                <span className={`ml-auto text-xs font-medium px-2.5 py-1 rounded ${
                  detailDept.isActive !== false ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                }`}>
                  {detailDept.isActive !== false ? 'Active' : 'Inactive'}
                </span>
              </div>

              {detailDept.description && (
                <p className="text-sm text-slate-600 mb-5 m-0">{detailDept.description}</p>
              )}

              {/* Info grid */}
              <div className="flex flex-col gap-3 mb-5">
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <User size={16} className="text-slate-400 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-500 m-0">Head of Department</p>
                    <p className="text-sm font-medium text-slate-700 m-0">
                      {getHodName(detailDept)}
                      {getHodName(detailDept) !== '—' && getHodDesignation(detailDept) && (
                        <span className="text-slate-500 text-xs ml-2">({getHodDesignation(detailDept)})</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-400 m-0">
                Created: {detailDept.createdAt ? new Date(detailDept.createdAt).toLocaleDateString() : '—'}
                {detailDept.updatedAt && ` · Updated: ${new Date(detailDept.updatedAt).toLocaleDateString()}`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ============ DELETE MODAL ============ */}
      {showDeleteModal && deletingDept && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4 animate-fade-in" onClick={() => { setShowDeleteModal(false); setDeletingDept(null); }}>
          <div className="bg-white rounded-xl max-w-[450px] w-full shadow-xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-red-50 mx-auto mb-4 flex items-center justify-center">
                <Trash2 size={24} className="text-red-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Delete Department?</h3>
              <p className="text-sm text-slate-500 mb-6">
                This will soft-delete <strong>{deletingDept.departmentCode} — {deletingDept.name}</strong>. It can be restored later.
              </p>
              <div className="flex gap-3 justify-center">
                <button className={btnSecondaryClass} onClick={() => { setShowDeleteModal(false); setDeletingDept(null); }}>Cancel</button>
                <button onClick={handleDelete} className="inline-flex items-center gap-2 py-2.5 px-5 border-none rounded-lg text-[0.95rem] font-medium cursor-pointer transition-all bg-red-500 text-white hover:bg-red-600">
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

export default DepartmentManagement;
