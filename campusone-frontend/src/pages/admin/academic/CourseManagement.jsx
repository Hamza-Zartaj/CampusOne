import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Edit, Trash2, Link, Unlink } from 'lucide-react';
import toast from 'react-hot-toast';
import { courseAPI, departmentAPI } from '../../../utils/api';

const inputClass = 'w-full py-2.5 px-3.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10';
const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5';
const btnPrimary = 'inline-flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50';
const btnSecondary = 'inline-flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium border border-gray-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors';
const btnGhost = 'inline-flex items-center gap-2 py-1.5 px-3 rounded-lg text-xs font-medium border border-gray-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors';

const emptyForm = { code: '', title: '', description: '', creditHours: 3, departmentId: '', prerequisiteIds: [] };

const CourseManagement = () => {
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterDept, setFilterDept] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [courseRes, deptRes] = await Promise.all([courseAPI.getAll(), departmentAPI.getAll()]);
      setCourses(courseRes.data.data || []);
      setDepartments(deptRes.data.data || []);
    } catch {
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => { setEditId(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (c) => {
    setEditId(c.id);
    setForm({ code: c.code, title: c.title, description: c.description || '', creditHours: c.creditHours, departmentId: c.departmentId, prerequisiteIds: c.prerequisites?.map((p) => p.id) || [] });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (editId) {
        await courseAPI.update(editId, { title: form.title, description: form.description, creditHours: form.creditHours, departmentId: form.departmentId });
        toast.success('Course updated');
      } else {
        await courseAPI.create(form);
        toast.success('Course created');
      }
      setShowForm(false);
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (c) => {
    if (!confirm(`Deactivate "${c.title}"?`)) return;
    try {
      await courseAPI.delete(c.id);
      toast.success('Course deactivated');
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const togglePrereq = (id) => {
    setForm((f) => ({
      ...f,
      prerequisiteIds: f.prerequisiteIds.includes(id) ? f.prerequisiteIds.filter((x) => x !== id) : [...f.prerequisiteIds, id],
    }));
  };

  const displayed = courses.filter((c) => {
    if (filterDept && c.departmentId !== filterDept) return false;
    if (search && !c.code.toLowerCase().includes(search.toLowerCase()) && !c.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BookOpen size={24} className="text-blue-600" />
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Course Catalog</h1>
            <p className="text-sm text-slate-500">Manage courses and prerequisites</p>
          </div>
        </div>
        <button onClick={openCreate} className={btnPrimary}><Plus size={16} />New Course</button>
      </div>

      <div className="flex gap-3 mb-5">
        <input className="py-2 px-3.5 border border-gray-200 rounded-lg text-sm w-64 focus:outline-none focus:border-blue-500" placeholder="Search code or title…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="py-2 px-3 border border-gray-200 rounded-lg text-sm" value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
          <option value="">All Departments</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.code}</option>)}
        </select>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg my-8">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="font-semibold text-slate-800">{editId ? 'Edit Course' : 'New Course'}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {!editId && (
                <div>
                  <label className={labelClass}>Course Code *</label>
                  <input className={inputClass} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="CS-101" required />
                </div>
              )}
              <div>
                <label className={labelClass}>Title *</label>
                <input className={inputClass} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Programming Fundamentals" required />
              </div>
              <div>
                <label className={labelClass}>Description</label>
                <textarea className={inputClass} rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Credit Hours *</label>
                  <input type="number" className={inputClass} min={1} max={6} value={form.creditHours} onChange={(e) => setForm({ ...form, creditHours: +e.target.value })} required />
                </div>
                <div>
                  <label className={labelClass}>Department *</label>
                  <select className={inputClass} value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })} required>
                    <option value="">Select…</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.code} – {d.name}</option>)}
                  </select>
                </div>
              </div>

              {!editId && courses.length > 0 && (
                <div>
                  <label className={labelClass}>Prerequisites (optional)</label>
                  <div className="border border-gray-200 rounded-lg max-h-36 overflow-y-auto p-2 space-y-1">
                    {courses.filter((c) => c.departmentId === form.departmentId || !form.departmentId).map((c) => (
                      <label key={c.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 px-2 py-1 rounded">
                        <input type="checkbox" checked={form.prerequisiteIds.includes(c.id)} onChange={() => togglePrereq(c.id)} />
                        <span className="font-mono text-xs text-blue-700">{c.code}</span>
                        <span className="text-slate-600">{c.title}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

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
      ) : displayed.length === 0 ? (
        <div className="text-center py-12 text-slate-400">No courses found.</div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Code</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Title</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Dept</th>
                <th className="text-center py-3 px-4 font-medium text-slate-600">Credits</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Prerequisites</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayed.map((c) => (
                <tr key={c.id} className={`hover:bg-slate-50 ${!c.isActive ? 'opacity-50' : ''}`}>
                  <td className="py-3 px-4 font-mono text-xs font-semibold text-blue-700">{c.code}</td>
                  <td className="py-3 px-4 font-medium text-slate-800">{c.title}</td>
                  <td className="py-3 px-4 text-slate-500">{c.department?.code}</td>
                  <td className="py-3 px-4 text-center text-slate-600">{c.creditHours}</td>
                  <td className="py-3 px-4">
                    {c.prerequisites?.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {c.prerequisites.map((p) => (
                          <span key={p.id} className="px-1.5 py-0.5 rounded text-xs bg-slate-100 text-slate-600 font-mono">{p.code}</span>
                        ))}
                      </div>
                    ) : <span className="text-slate-400 text-xs">—</span>}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => openEdit(c)} className={btnGhost}><Edit size={13} /></button>
                      {c.isActive && <button onClick={() => handleDelete(c)} className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50"><Trash2 size={13} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CourseManagement;
