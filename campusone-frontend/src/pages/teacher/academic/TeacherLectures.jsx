import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Trash2, Edit, Download, X, BookOpen, Calendar } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { lectureAPI, offeringAPI } from '../../../utils/api';

const inputClass = 'w-full py-2 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10';
const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5';

const fmtDate = (d) => new Date(d).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' });

const LectureForm = ({ offeringId, existing, onClose, onSaved }) => {
  const [date, setDate] = useState(existing?.date ? new Date(existing.date).toISOString().split('T')[0] : '');
  const [title, setTitle] = useState(existing?.title || '');
  const [description, setDescription] = useState(existing?.description || '');
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!date || !title) { toast.error('Date and title required'); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('offeringId', offeringId);
      fd.append('date', date);
      fd.append('title', title);
      if (description) fd.append('description', description);
      if (file) fd.append('material', file);
      if (existing) await lectureAPI.update(existing.id, fd);
      else await lectureAPI.create(fd);
      toast.success(existing ? 'Updated' : 'Created');
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <h3 className="font-semibold text-slate-800">{existing ? 'Edit Lecture' : 'New Lecture'}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="p-5 space-y-3">
          <div>
            <label className={labelClass}>Date *</label>
            <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div>
            <label className={labelClass}>Title *</label>
            <input className={inputClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Variables and Types" required />
          </div>
          <div>
            <label className={labelClass}>Description (optional)</label>
            <textarea className={inputClass} rows={2} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Material (optional)</label>
            <input type="file" onChange={(e) => setFile(e.target.files[0])} className="w-full text-sm" />
            {existing?.materialName && <p className="text-xs text-slate-500 mt-1">Current: {existing.materialName}</p>}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="inline-flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium border border-gray-200 bg-white text-slate-700 hover:bg-slate-50">Cancel</button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const TeacherLectures = () => {
  const { offeringId } = useParams();
  const navigate = useNavigate();
  const [offering, setOffering] = useState(null);
  const [lectures, setLectures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  useEffect(() => { load(); }, [offeringId]);

  const load = async () => {
    try {
      setLoading(true);
      const [offRes, lecRes] = await Promise.all([
        offeringAPI.getById(offeringId),
        lectureAPI.list(offeringId),
      ]);
      setOffering(offRes.data.data);
      setLectures(lecRes.data.data || []);
    } catch {
      toast.error('Failed to load lectures');
    } finally {
      setLoading(false);
    }
  };

  const remove = async (l) => {
    if (!confirm(`Delete lecture "${l.title}"?`)) return;
    try {
      await lectureAPI.delete(l.id);
      toast.success('Deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700 mb-3">
        <ArrowLeft size={14} />Back
      </button>

      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <BookOpen size={24} className="text-blue-600" />
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Lectures</h1>
            {offering && <p className="text-sm text-slate-500">{offering.course.code} — {offering.course.title} · Sec {offering.section}</p>}
          </div>
        </div>
        <button onClick={() => { setEditing(null); setShowForm(true); }} className="inline-flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700">
          <Plus size={16} />New Lecture
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading…</div>
      ) : lectures.length === 0 ? (
        <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-slate-200">
          No lectures yet. Click <span className="font-semibold">New Lecture</span> to add one.
        </div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold">Date</th>
                <th className="text-left px-4 py-2.5 font-semibold">Title</th>
                <th className="text-left px-4 py-2.5 font-semibold">Material</th>
                <th className="px-4 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lectures.map((l) => (
                <tr key={l.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 text-slate-700">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={13} className="text-slate-400" />
                      {fmtDate(l.date)}
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="font-medium text-slate-800">{l.title}</div>
                    {l.description && <div className="text-xs text-slate-500 mt-0.5">{l.description}</div>}
                  </td>
                  <td className="px-4 py-2.5">
                    {l.materialUrl ? (
                      <a href={l.materialUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-xs">
                        <Download size={13} />{l.materialName || 'download'}
                      </a>
                    ) : <span className="text-xs text-slate-400">—</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => { setEditing(l); setShowForm(true); }} className="p-1.5 rounded text-slate-600 hover:bg-slate-100 mr-1"><Edit size={13} /></button>
                    <button onClick={() => remove(l)} className="p-1.5 rounded text-red-500 hover:bg-red-50"><Trash2 size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <LectureForm
          offeringId={offeringId}
          existing={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); load(); }}
        />
      )}
    </div>
  );
};

export default TeacherLectures;
