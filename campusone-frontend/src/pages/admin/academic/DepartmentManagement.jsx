import React, { useState, useEffect } from 'react';
import { Building2, Plus, Edit, Trash2, RotateCcw, Users, BookOpen, GraduationCap } from 'lucide-react';
import toast from 'react-hot-toast';
import { departmentAPI, teacherAPI } from '../../../utils/api';

const inputClass = 'w-full py-2.5 px-3.5 border border-gray-200 rounded-lg text-sm transition-all focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10';
const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5';
const btnPrimary = 'inline-flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50';
const btnSecondary = 'inline-flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium border border-gray-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors';
const btnDanger = 'inline-flex items-center gap-2 py-1.5 px-3 rounded-lg text-xs font-medium border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors';
const btnGhost = 'inline-flex items-center gap-2 py-1.5 px-3 rounded-lg text-xs font-medium border border-gray-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors';

const emptyForm = { code: '', name: '', description: '', hodTeacherId: '' };

const DepartmentManagement = () => {
  const [departments, setDepartments] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  useEffect(() => { loadAll(); }, [showInactive]);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [deptRes, teacherRes] = await Promise.all([
        departmentAPI.getAll({ includeInactive: showInactive }),
        teacherAPI.getAllTeachers(),
      ]);
      setDepartments(deptRes.data.data || []);
      setTeachers(teacherRes.data.data || []);
    } catch {
      toast.error('Failed to load departments');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => { setEditId(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (dept) => {
    setEditId(dept.id);
    setForm({ code: dept.code, name: dept.name, description: dept.description || '', hodTeacherId: dept.hodTeacherId || '' });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (editId) {
        await departmentAPI.update(editId, { name: form.name, description: form.description, hodTeacherId: form.hodTeacherId || null });
        toast.success('Department updated');
      } else {
        await departmentAPI.create({ code: form.code, name: form.name, description: form.description, hodTeacherId: form.hodTeacherId || null });
        toast.success('Department created');
      }
      setShowForm(false);
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (dept) => {
    if (!confirm(`Deactivate "${dept.name}"?`)) return;
    try {
      await departmentAPI.delete(dept.id);
      toast.success('Department deactivated');
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const handleRestore = async (dept) => {
    try {
      await departmentAPI.restore(dept.id);
      toast.success('Department restored');
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Building2 size={24} className="text-blue-600" />
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Departments</h1>
            <p className="text-sm text-slate-500">Manage university departments</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
            <input type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} className="rounded" />
            Show inactive
          </label>
          <button onClick={openCreate} className={btnPrimary}><Plus size={16} />New Department</button>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="font-semibold text-slate-800">{editId ? 'Edit Department' : 'New Department'}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {!editId && (
                <div>
                  <label className={labelClass}>Department Code *</label>
                  <input className={inputClass} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="CS" required maxLength={10} />
                </div>
              )}
              <div>
                <label className={labelClass}>Department Name *</label>
                <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Computer Science" required />
              </div>
              <div>
                <label className={labelClass}>Description</label>
                <textarea className={inputClass} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>Head of Department (HOD)</label>
                <select className={inputClass} value={form.hodTeacherId} onChange={(e) => setForm({ ...form, hodTeacherId: e.target.value })}>
                  <option value="">— None —</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.user?.name} ({t.employeeId})</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className={btnSecondary}>Cancel</button>
                <button type="submit" disabled={saving} className={btnPrimary}>{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading…</div>
      ) : departments.length === 0 ? (
        <div className="text-center py-12 text-slate-400">No departments found. Create one to get started.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {departments.map((dept) => (
            <div key={dept.id} className={`bg-white rounded-xl border p-5 flex flex-col gap-3 ${!dept.isActive ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between">
                <div>
                  <span className="inline-block px-2 py-0.5 rounded text-xs font-mono font-semibold bg-blue-50 text-blue-700 mb-1">{dept.code}</span>
                  <h3 className="font-semibold text-slate-800">{dept.name}</h3>
                  {dept.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{dept.description}</p>}
                </div>
                {!dept.isActive && <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">Inactive</span>}
              </div>

              {dept.hod && (
                <p className="text-xs text-slate-600">HOD: <span className="font-medium">{dept.hod.user?.name}</span></p>
              )}

              <div className="flex gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1"><GraduationCap size={12} />{dept._count?.programs ?? 0} programs</span>
                <span className="flex items-center gap-1"><BookOpen size={12} />{dept._count?.courses ?? 0} courses</span>
                <span className="flex items-center gap-1"><Users size={12} />{dept._count?.students ?? 0} students</span>
              </div>

              <div className="flex gap-2 pt-1 border-t">
                <button onClick={() => openEdit(dept)} className={btnGhost}><Edit size={13} />Edit</button>
                {dept.isActive
                  ? <button onClick={() => handleDelete(dept)} className={btnDanger}><Trash2 size={13} />Deactivate</button>
                  : <button onClick={() => handleRestore(dept)} className={btnGhost}><RotateCcw size={13} />Restore</button>
                }
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DepartmentManagement;
