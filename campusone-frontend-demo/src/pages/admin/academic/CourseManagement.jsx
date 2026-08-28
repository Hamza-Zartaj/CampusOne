import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Edit, Trash2, Link, Unlink, Sliders, X, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { courseAPI, departmentAPI, gradeComponentAPI } from '../../../utils/api';

const KIND_OPTIONS = ['ASSIGNMENT', 'QUIZ', 'MID', 'FINAL', 'PROJECT_PRESENTATION', 'PARTICIPATION', 'LAB_WORK'];

const GradeComponentEditor = ({ course, onClose }) => {
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await gradeComponentAPI.listForCourse(course.id);
        setComponents(r.data.data || []);
      } catch {
        toast.error('Failed to load components');
      } finally {
        setLoading(false);
      }
    })();
  }, [course.id]);

  const updateRow = (idx, field, value) => {
    setComponents((prev) => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c));
  };
  const removeRow = (idx) => setComponents((prev) => prev.filter((_, i) => i !== idx));
  const addRow = () => setComponents((prev) => [...prev, {
    kind: 'ASSIGNMENT', label: 'Assignment', count: 1, totalPerInstance: 10, weightPercent: 0, aggregation: 'AVERAGE', orderIndex: prev.length,
  }]);

  const resetTemplate = async () => {
    if (!confirm(`Reset to default ${course.sessionType} template? This will replace current components.`)) return;
    try {
      const r = await gradeComponentAPI.applyTemplate(course.id);
      setComponents(r.data.data || []);
      toast.success('Template applied');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const totalWeight = components.reduce((s, c) => s + Number(c.weightPercent || 0), 0);
  const weightOk = Math.abs(totalWeight - 100) < 0.01;

  const save = async () => {
    if (!weightOk) { toast.error(`Weights must sum to 100 (got ${totalWeight})`); return; }
    setSaving(true);
    try {
      await gradeComponentAPI.replace(course.id, components);
      toast.success('Saved');
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-modal p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b">
          <div>
            <h2 className="font-semibold text-slate-800">Grade Components — {course.code}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{course.title} · {course.sessionType}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <div className="p-5 overflow-y-auto flex-1">
          {loading ? (
            <div className="text-center py-12 text-slate-400">Loading…</div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <button type="button" onClick={resetTemplate} className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium border border-gray-200 bg-white text-slate-600 hover:bg-slate-50">
                  <RotateCcw size={13} />Reset to {course.sessionType} template
                </button>
                <button type="button" onClick={addRow} className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-medium border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100">
                  <Plus size={13} />Add row
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="text-left px-2 py-2 font-semibold">Kind</th>
                      <th className="text-left px-2 py-2 font-semibold">Label</th>
                      <th className="text-right px-2 py-2 font-semibold">Count</th>
                      <th className="text-right px-2 py-2 font-semibold">Total / each</th>
                      <th className="text-right px-2 py-2 font-semibold">Weight %</th>
                      <th className="text-left px-2 py-2 font-semibold">Aggregation</th>
                      <th className="px-2 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {components.map((c, i) => (
                      <tr key={i}>
                        <td className="px-2 py-1.5">
                          <select value={c.kind} onChange={(e) => updateRow(i, 'kind', e.target.value)} className="py-1 px-2 border border-slate-200 rounded text-xs">
                            {KIND_OPTIONS.map((k) => <option key={k}>{k}</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="text" value={c.label} onChange={(e) => updateRow(i, 'label', e.target.value)} className="w-full py-1 px-2 border border-slate-200 rounded text-xs" />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="number" value={c.count} onChange={(e) => updateRow(i, 'count', +e.target.value)} className="w-16 py-1 px-2 border border-slate-200 rounded text-xs text-right" />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="number" step="0.5" value={c.totalPerInstance} onChange={(e) => updateRow(i, 'totalPerInstance', +e.target.value)} className="w-20 py-1 px-2 border border-slate-200 rounded text-xs text-right" />
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="number" step="0.5" value={c.weightPercent} onChange={(e) => updateRow(i, 'weightPercent', +e.target.value)} className="w-20 py-1 px-2 border border-slate-200 rounded text-xs text-right" />
                        </td>
                        <td className="px-2 py-1.5">
                          <select value={c.aggregation} onChange={(e) => updateRow(i, 'aggregation', e.target.value)} className="py-1 px-2 border border-slate-200 rounded text-xs">
                            <option value="AVERAGE">AVERAGE</option>
                            <option value="SINGLE">SINGLE</option>
                          </select>
                        </td>
                        <td className="px-2 py-1.5 text-right">
                          <button onClick={() => removeRow(i)} className="p-1 rounded text-red-500 hover:bg-red-50"><Trash2 size={13} /></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className={`mt-4 p-3 rounded-lg text-sm ${weightOk ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                Total weight: <span className="font-bold">{totalWeight.toFixed(1)}%</span>
                {!weightOk && <> — must equal 100%</>}
              </div>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 p-5 border-t">
          <button onClick={onClose} className="inline-flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium border border-gray-200 bg-white text-slate-700 hover:bg-slate-50">Cancel</button>
          <button onClick={save} disabled={!weightOk || saving} className="inline-flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
};

const inputClass = 'w-full py-2.5 px-3.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10';
const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5';
const btnPrimary = 'inline-flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50';
const btnSecondary = 'inline-flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium border border-gray-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors';
const btnGhost = 'inline-flex items-center gap-2 py-1.5 px-3 rounded-lg text-xs font-medium border border-gray-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors';

const emptyForm = { code: '', title: '', description: '', creditHours: 3, expectedLectureCount: '', departmentId: '', prerequisiteIds: [] };

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
  const [gradesFor, setGradesFor] = useState(null);

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
    setForm({
      code: c.code,
      title: c.title,
      description: c.description || '',
      creditHours: c.creditHours,
      expectedLectureCount: c.expectedLectureCount ?? '',
      departmentId: c.departmentId,
      prerequisiteIds: c.prerequisites?.map((p) => p.id) || [],
    });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      if (editId) {
        await courseAPI.update(editId, {
          title: form.title,
          description: form.description,
          creditHours: form.creditHours,
          expectedLectureCount: form.expectedLectureCount,
          departmentId: form.departmentId,
        });
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-modal p-4 overflow-y-auto">
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
                  <label className={labelClass}>Planned Lectures</label>
                  <input type="number" className={inputClass} min={0} value={form.expectedLectureCount} onChange={(e) => setForm({ ...form, expectedLectureCount: e.target.value })} placeholder="e.g. 32" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Department *</label>
                <select className={inputClass} value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })} required>
                  <option value="">Select...</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.code} - {d.name}</option>)}
                </select>
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
                <th className="text-center py-3 px-4 font-medium text-slate-600">Lectures</th>
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
                  <td className="py-3 px-4 text-center text-slate-600">{c.expectedLectureCount ?? '-'}</td>
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
                      <button onClick={() => setGradesFor(c)} className={btnGhost} title="Grade Components"><Sliders size={13} /></button>
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

      {gradesFor && <GradeComponentEditor course={gradesFor} onClose={() => setGradesFor(null)} />}
    </div>
  );
};

export default CourseManagement;
