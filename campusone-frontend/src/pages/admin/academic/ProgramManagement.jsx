import React, { useState, useEffect } from 'react';
import { GraduationCap, Plus, Edit, Trash2, BookOpen, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { programAPI, departmentAPI } from '../../../utils/api';

const inputClass = 'w-full py-2.5 px-3.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10';
const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5';
const btnPrimary = 'inline-flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50';
const btnSecondary = 'inline-flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium border border-gray-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors';
const btnGhost = 'inline-flex items-center gap-2 py-1.5 px-3 rounded-lg text-xs font-medium border border-gray-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors';

const PROGRAM_TYPES = ['BACHELOR', 'MASTER', 'PHD', 'DIPLOMA'];
const emptyForm = { programCode: '', name: '', type: 'BACHELOR', totalSemesters: 8, totalCredits: 130, departmentId: '' };

const ProgramManagement = () => {
  const [programs, setPrograms] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterDept, setFilterDept] = useState('');

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    try {
      setLoading(true);
      const [progRes, deptRes] = await Promise.all([programAPI.getAll(), departmentAPI.getAll()]);
      setPrograms(progRes.data.data || []);
      setDepartments(deptRes.data.data || []);
    } catch {
      toast.error('Failed to load programs');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => { setEditId(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (p) => {
    setEditId(p.id);
    setForm({ programCode: p.programCode, name: p.name, type: p.type, totalSemesters: p.totalSemesters, totalCredits: p.totalCredits, departmentId: p.departmentId });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (editId) {
        await programAPI.update(editId, { name: form.name, type: form.type, totalSemesters: form.totalSemesters, totalCredits: form.totalCredits, departmentId: form.departmentId });
        toast.success('Program updated');
      } else {
        await programAPI.create(form);
        toast.success('Program created');
      }
      setShowForm(false);
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (p) => {
    if (!confirm(`Deactivate "${p.name}"?`)) return;
    try {
      await programAPI.delete(p.id);
      toast.success('Program deactivated');
      loadAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const displayed = filterDept ? programs.filter((p) => p.departmentId === filterDept) : programs;

  const typeColors = { BACHELOR: 'bg-blue-50 text-blue-700', MASTER: 'bg-purple-50 text-purple-700', PHD: 'bg-amber-50 text-amber-700', DIPLOMA: 'bg-green-50 text-green-700' };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <GraduationCap size={24} className="text-blue-600" />
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Programs</h1>
            <p className="text-sm text-slate-500">Manage degree programs</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select className="py-2 px-3 border border-gray-200 rounded-lg text-sm" value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
            <option value="">All Departments</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.code} – {d.name}</option>)}
          </select>
          <button onClick={openCreate} className={btnPrimary}><Plus size={16} />New Program</button>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="font-semibold text-slate-800">{editId ? 'Edit Program' : 'New Program'}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {!editId && (
                <div>
                  <label className={labelClass}>Program Code *</label>
                  <input className={inputClass} value={form.programCode} onChange={(e) => setForm({ ...form, programCode: e.target.value.toUpperCase() })} placeholder="BSCS" required />
                </div>
              )}
              <div>
                <label className={labelClass}>Program Name *</label>
                <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="BS Computer Science" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Type *</label>
                  <select className={inputClass} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} required>
                    {PROGRAM_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Department *</label>
                  <select className={inputClass} value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })} required>
                    <option value="">Select…</option>
                    {departments.map((d) => <option key={d.id} value={d.id}>{d.code} – {d.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Total Semesters *</label>
                  <input type="number" className={inputClass} min={1} max={12} value={form.totalSemesters} onChange={(e) => setForm({ ...form, totalSemesters: +e.target.value })} required />
                </div>
                <div>
                  <label className={labelClass}>Total Credits *</label>
                  <input type="number" className={inputClass} min={1} value={form.totalCredits} onChange={(e) => setForm({ ...form, totalCredits: +e.target.value })} required />
                </div>
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
      ) : displayed.length === 0 ? (
        <div className="text-center py-12 text-slate-400">No programs found.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayed.map((p) => (
            <div key={p.id} className={`bg-white rounded-xl border p-5 flex flex-col gap-3 ${!p.isActive ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between">
                <div>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-semibold ${typeColors[p.type] || 'bg-slate-100 text-slate-600'} mb-1`}>{p.type}</span>
                  <h3 className="font-semibold text-slate-800">{p.programCode}</h3>
                  <p className="text-sm text-slate-600">{p.name}</p>
                </div>
              </div>
              <p className="text-xs text-slate-500">{p.department?.code} – {p.department?.name}</p>
              <div className="flex gap-4 text-xs text-slate-500">
                <span>{p.totalSemesters} semesters</span>
                <span>{p.totalCredits} credits</span>
                <span className="flex items-center gap-1"><Users size={12} />{p._count?.students ?? 0}</span>
              </div>
              <div className="flex gap-2 pt-1 border-t">
                <button onClick={() => openEdit(p)} className={btnGhost}><Edit size={13} />Edit</button>
                {p.isActive && <button onClick={() => handleDelete(p)} className="inline-flex items-center gap-2 py-1.5 px-3 rounded-lg text-xs font-medium border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors"><Trash2 size={13} />Deactivate</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProgramManagement;
