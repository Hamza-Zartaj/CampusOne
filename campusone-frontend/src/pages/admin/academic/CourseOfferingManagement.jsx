import React, { useState, useEffect } from 'react';
import { Layers, Plus, Edit, Trash2, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { offeringAPI, courseAPI, termAPI, teacherAPI } from '../../../utils/api';

const inputClass = 'w-full py-2.5 px-3.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10';
const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5';
const btnPrimary = 'inline-flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50';
const btnSecondary = 'inline-flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium border border-gray-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors';
const btnGhost = 'inline-flex items-center gap-2 py-1.5 px-3 rounded-lg text-xs font-medium border border-gray-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors';

const emptyForm = { courseId: '', termId: '', teacherId: '', section: 'A', capacity: 40, schedule: '' };

const CourseOfferingManagement = () => {
  const [offerings, setOfferings] = useState([]);
  const [courses, setCourses] = useState([]);
  const [terms, setTerms] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [filterTerm, setFilterTerm] = useState('');

  useEffect(() => { loadMeta(); }, []);
  useEffect(() => { loadOfferings(); }, [filterTerm]);

  const loadMeta = async () => {
    try {
      const [courseRes, termRes, teacherRes] = await Promise.all([courseAPI.getAll(), termAPI.getAll(), teacherAPI.getAllTeachers()]);
      setCourses(courseRes.data.data || []);
      setTerms(termRes.data.data || []);
      setTeachers(teacherRes.data.data || []);
      const active = (termRes.data.data || []).find((t) => t.isActive);
      if (active) setFilterTerm(active.id);
    } catch {
      toast.error('Failed to load metadata');
    }
  };

  const loadOfferings = async () => {
    try {
      setLoading(true);
      const params = filterTerm ? { termId: filterTerm } : {};
      const res = await offeringAPI.getAll(params);
      setOfferings(res.data.data || []);
    } catch {
      toast.error('Failed to load offerings');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => { setEditId(null); setForm({ ...emptyForm, termId: filterTerm }); setShowForm(true); };
  const openEdit = (o) => {
    setEditId(o.id);
    setForm({ courseId: o.courseId, termId: o.termId, teacherId: o.teacherId, section: o.section, capacity: o.capacity, schedule: JSON.stringify(o.schedule || []) });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      let schedule = [];
      try { schedule = form.schedule ? JSON.parse(form.schedule) : []; } catch { toast.error('Schedule must be valid JSON'); return; }
      if (editId) {
        await offeringAPI.update(editId, { teacherId: form.teacherId, capacity: form.capacity, schedule });
        toast.success('Offering updated');
      } else {
        await offeringAPI.create({ ...form, schedule });
        toast.success('Offering created');
      }
      setShowForm(false);
      loadOfferings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (o) => {
    if (!confirm(`Deactivate offering ${o.course?.code} sec ${o.section}?`)) return;
    try {
      await offeringAPI.delete(o.id);
      toast.success('Offering deactivated');
      loadOfferings();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Layers size={24} className="text-blue-600" />
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Course Offerings</h1>
            <p className="text-sm text-slate-500">Assign courses to teachers by term and section</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select className="py-2 px-3 border border-gray-200 rounded-lg text-sm" value={filterTerm} onChange={(e) => setFilterTerm(e.target.value)}>
            <option value="">All Terms</option>
            {terms.map((t) => <option key={t.id} value={t.id}>{t.code} {t.isActive ? '(active)' : ''}</option>)}
          </select>
          <button onClick={openCreate} className={btnPrimary}><Plus size={16} />New Offering</button>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="font-semibold text-slate-800">{editId ? 'Edit Offering' : 'New Offering'}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {!editId && (
                <>
                  <div>
                    <label className={labelClass}>Course *</label>
                    <select className={inputClass} value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })} required>
                      <option value="">Select course…</option>
                      {courses.map((c) => <option key={c.id} value={c.id}>{c.code} – {c.title}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Term *</label>
                    <select className={inputClass} value={form.termId} onChange={(e) => setForm({ ...form, termId: e.target.value })} required>
                      <option value="">Select term…</option>
                      {terms.map((t) => <option key={t.id} value={t.id}>{t.code} – {t.academicYear}</option>)}
                    </select>
                  </div>
                </>
              )}
              <div>
                <label className={labelClass}>Teacher *</label>
                <select className={inputClass} value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })} required>
                  <option value="">Select teacher…</option>
                  {teachers.map((t) => <option key={t.id} value={t.id}>{t.user?.name} ({t.employeeId})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Section *</label>
                  <input className={inputClass} value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value.toUpperCase() })} placeholder="A" required maxLength={5} disabled={!!editId} />
                </div>
                <div>
                  <label className={labelClass}>Capacity</label>
                  <input type="number" className={inputClass} min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: +e.target.value })} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Schedule (JSON array)</label>
                <textarea className={`${inputClass} font-mono text-xs`} rows={3} value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} placeholder='[{"day":"MON","start":"09:00","end":"10:30","room":"CR-12"}]' />
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
      ) : offerings.length === 0 ? (
        <div className="text-center py-12 text-slate-400">No offerings found for this term.</div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Course</th>
                <th className="text-left py-3 px-4 font-medium text-slate-600">Teacher</th>
                <th className="text-center py-3 px-4 font-medium text-slate-600">Sec</th>
                <th className="text-center py-3 px-4 font-medium text-slate-600">Enrolled</th>
                <th className="text-center py-3 px-4 font-medium text-slate-600">Capacity</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {offerings.map((o) => (
                <tr key={o.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4">
                    <span className="font-mono text-xs font-semibold text-blue-700">{o.course?.code}</span>
                    <p className="text-slate-600 text-xs">{o.course?.title}</p>
                  </td>
                  <td className="py-3 px-4 text-slate-700">{o.teacher?.user?.name}</td>
                  <td className="py-3 px-4 text-center font-semibold">{o.section}</td>
                  <td className="py-3 px-4 text-center">
                    <span className={`${(o._count?.enrollments ?? 0) >= o.capacity ? 'text-red-600 font-semibold' : 'text-slate-600'}`}>{o._count?.enrollments ?? 0}</span>
                  </td>
                  <td className="py-3 px-4 text-center text-slate-500">{o.capacity}</td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => openEdit(o)} className={btnGhost}><Edit size={13} /></button>
                      <button onClick={() => handleDelete(o)} className="p-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50"><Trash2 size={13} /></button>
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

export default CourseOfferingManagement;
