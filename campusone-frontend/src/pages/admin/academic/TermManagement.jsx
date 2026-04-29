import React, { useState, useEffect } from 'react';
import { Calendar, Plus, Edit, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { termAPI } from '../../../utils/api';

const inputClass = 'w-full py-2.5 px-3.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10';
const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5';
const btnPrimary = 'inline-flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50';
const btnSecondary = 'inline-flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium border border-gray-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors';
const btnGhost = 'inline-flex items-center gap-2 py-1.5 px-3 rounded-lg text-xs font-medium border border-gray-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors';

const SEASONS = ['FALL', 'SPRING', 'SUMMER'];
const emptyForm = { code: '', season: 'FALL', academicYear: '', startDate: '', endDate: '', registrationOpenAt: '', registrationCloseAt: '' };

const fmt = (d) => (d ? new Date(d).toLocaleDateString() : '—');
const toInputDate = (d) => (d ? new Date(d).toISOString().split('T')[0] : '');
const seasonColors = { FALL: 'bg-amber-50 text-amber-700', SPRING: 'bg-green-50 text-green-700', SUMMER: 'bg-orange-50 text-orange-700' };

const TermManagement = () => {
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      setLoading(true);
      const res = await termAPI.getAll();
      setTerms(res.data.data || []);
    } catch {
      toast.error('Failed to load terms');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => { setEditId(null); setForm(emptyForm); setShowForm(true); };
  const openEdit = (t) => {
    setEditId(t.id);
    setForm({ code: t.code, season: t.season, academicYear: t.academicYear, startDate: toInputDate(t.startDate), endDate: toInputDate(t.endDate), registrationOpenAt: toInputDate(t.registrationOpenAt), registrationCloseAt: toInputDate(t.registrationCloseAt) });
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const payload = { ...form, registrationOpenAt: form.registrationOpenAt || null, registrationCloseAt: form.registrationCloseAt || null };
      if (editId) { await termAPI.update(editId, payload); toast.success('Term updated'); }
      else { await termAPI.create(payload); toast.success('Term created'); }
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (t) => {
    if (!confirm(`Set "${t.code}" as the active term? All other terms will be deactivated.`)) return;
    try {
      await termAPI.activate(t.id);
      toast.success(`${t.code} is now the active term`);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calendar size={24} className="text-blue-600" />
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Academic Terms</h1>
            <p className="text-sm text-slate-500">Manage semesters and registration windows</p>
          </div>
        </div>
        <button onClick={openCreate} className={btnPrimary}><Plus size={16} />New Term</button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="font-semibold text-slate-800">{editId ? 'Edit Term' : 'New Term'}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 text-xl">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Term Code *</label>
                  <input className={inputClass} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="FA26" required disabled={!!editId} />
                </div>
                <div>
                  <label className={labelClass}>Season *</label>
                  <select className={inputClass} value={form.season} onChange={(e) => setForm({ ...form, season: e.target.value })} required disabled={!!editId}>
                    {SEASONS.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>Academic Year * (e.g. 2026-2027)</label>
                <input className={inputClass} value={form.academicYear} onChange={(e) => setForm({ ...form, academicYear: e.target.value })} placeholder="2026-2027" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>Start Date *</label><input type="date" className={inputClass} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} required /></div>
                <div><label className={labelClass}>End Date *</label><input type="date" className={inputClass} value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} required /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className={labelClass}>Registration Opens</label><input type="date" className={inputClass} value={form.registrationOpenAt} onChange={(e) => setForm({ ...form, registrationOpenAt: e.target.value })} /></div>
                <div><label className={labelClass}>Registration Closes</label><input type="date" className={inputClass} value={form.registrationCloseAt} onChange={(e) => setForm({ ...form, registrationCloseAt: e.target.value })} /></div>
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
      ) : terms.length === 0 ? (
        <div className="text-center py-12 text-slate-400">No terms found. Create one to get started.</div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {terms.map((t) => (
            <div key={t.id} className={`bg-white rounded-xl border p-5 flex flex-col gap-3 ${t.isActive ? 'border-blue-300 ring-2 ring-blue-100' : ''}`}>
              <div className="flex items-start justify-between">
                <div>
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold mb-1 ${seasonColors[t.season] || 'bg-slate-100 text-slate-600'}`}>{t.season}</span>
                  {t.isActive && <span className="ml-2 inline-block px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-700">ACTIVE</span>}
                  <h3 className="font-semibold text-slate-800">{t.code}</h3>
                  <p className="text-xs text-slate-500">{t.academicYear}</p>
                </div>
              </div>
              <div className="text-xs text-slate-500 space-y-0.5">
                <p>{fmt(t.startDate)} – {fmt(t.endDate)}</p>
                {t.registrationOpenAt && <p>Registration: {fmt(t.registrationOpenAt)} – {fmt(t.registrationCloseAt)}</p>}
                <p>{t._count?.offerings ?? 0} offerings</p>
              </div>
              <div className="flex gap-2 pt-1 border-t">
                <button onClick={() => openEdit(t)} className={btnGhost}><Edit size={13} />Edit</button>
                {!t.isActive && <button onClick={() => handleActivate(t)} className="inline-flex items-center gap-2 py-1.5 px-3 rounded-lg text-xs font-medium border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"><CheckCircle size={13} />Set Active</button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TermManagement;
