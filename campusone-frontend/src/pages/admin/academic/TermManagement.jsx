import React, { useState, useEffect } from 'react';
import {
  Calendar, Plus, Edit, CheckCircle, ChevronDown, ChevronRight,
  Users, GraduationCap, BookOpen, Clock, History, Sparkles,
} from 'lucide-react';
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
const seasonColors = { FALL: 'bg-amber-50 text-amber-700 border-amber-200', SPRING: 'bg-green-50 text-green-700 border-green-200', SUMMER: 'bg-orange-50 text-orange-700 border-orange-200' };

const getStatus = (t) => {
  const now = new Date();
  const start = new Date(t.startDate);
  const end = new Date(t.endDate);
  if (t.isActive) return 'ACTIVE';
  if (now < start) return 'UPCOMING';
  if (now > end) return 'ENDED';
  return 'CURRENT';
};

const statusBadge = {
  ACTIVE:   'bg-blue-100 text-blue-700 border-blue-200',
  UPCOMING: 'bg-violet-50 text-violet-700 border-violet-200',
  CURRENT:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  ENDED:    'bg-slate-100 text-slate-600 border-slate-200',
};

const BatchTable = ({ batches, loading }) => {
  if (loading) return <div className="p-6 text-center text-sm text-slate-400">Loading batches…</div>;
  if (!batches || batches.length === 0) {
    return <div className="p-6 text-center text-sm text-slate-400">No enrolled batches in this term.</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="text-left px-4 py-2.5 font-semibold">Batch</th>
            <th className="text-left px-4 py-2.5 font-semibold">Program</th>
            <th className="text-left px-4 py-2.5 font-semibold">Department</th>
            <th className="text-left px-4 py-2.5 font-semibold">Semester</th>
            <th className="text-right px-4 py-2.5 font-semibold">Students</th>
            <th className="text-right px-4 py-2.5 font-semibold">Offerings</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {batches.map((b, i) => (
            <tr key={`${b.batch}-${b.program.id}-${i}`} className="hover:bg-slate-50">
              <td className="px-4 py-2.5">
                <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                  {b.batch}
                </span>
              </td>
              <td className="px-4 py-2.5">
                <div className="font-medium text-slate-800">{b.program.programCode}</div>
                <div className="text-xs text-slate-500">{b.program.name}</div>
              </td>
              <td className="px-4 py-2.5 text-xs text-slate-600">{b.department?.code || '—'}</td>
              <td className="px-4 py-2.5 text-xs text-slate-600">Sem {b.semester}</td>
              <td className="px-4 py-2.5 text-right">
                <span className="inline-flex items-center gap-1 text-sm font-semibold text-slate-800">
                  <Users size={13} className="text-slate-400" />
                  {b.studentCount}
                </span>
              </td>
              <td className="px-4 py-2.5 text-right text-sm text-slate-600">{b.offeringCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const TermRow = ({ term, expanded, onToggle, batchData, batchLoading, onEdit, onActivate, canActivate }) => {
  const status = getStatus(term);
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div
        onClick={onToggle}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggle(); } }}
        className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors text-left cursor-pointer"
      >
        {expanded ? <ChevronDown size={18} className="text-slate-400 shrink-0" /> : <ChevronRight size={18} className="text-slate-400 shrink-0" />}
        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold border ${seasonColors[term.season] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
          {term.season}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-slate-800">{term.code}</h3>
            <span className="text-xs text-slate-500">· {term.academicYear}</span>
            <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold border ${statusBadge[status]}`}>
              {status}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{fmt(term.startDate)} – {fmt(term.endDate)} · {term._count?.offerings ?? 0} offerings</p>
        </div>
        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={onEdit} className={btnGhost}><Edit size={13} />Edit</button>
          {canActivate && !term.isActive && (
            <button type="button" onClick={onActivate} className="inline-flex items-center gap-2 py-1.5 px-3 rounded-lg text-xs font-medium border border-blue-200 bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors">
              <CheckCircle size={13} />Set Active
            </button>
          )}
        </div>
      </div>
      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50/30">
          <BatchTable batches={batchData} loading={batchLoading} />
        </div>
      )}
    </div>
  );
};

const TermManagement = () => {
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  // Batch expansion state: { [termId]: { loading, data } }
  const [expanded, setExpanded] = useState({});
  const [batches, setBatches] = useState({});

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

  const loadBatches = async (termId) => {
    if (batches[termId]?.data) return; // already loaded
    setBatches((prev) => ({ ...prev, [termId]: { loading: true, data: null } }));
    try {
      const res = await termAPI.getBatches(termId);
      setBatches((prev) => ({ ...prev, [termId]: { loading: false, data: res.data.data || [] } }));
    } catch {
      toast.error('Failed to load batches');
      setBatches((prev) => ({ ...prev, [termId]: { loading: false, data: [] } }));
    }
  };

  const toggleExpand = (termId) => {
    const isOpen = !expanded[termId];
    setExpanded((prev) => ({ ...prev, [termId]: isOpen }));
    if (isOpen) loadBatches(termId);
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

  const activeTerm = terms.find((t) => t.isActive);
  const upcomingTerms = terms.filter((t) => !t.isActive && getStatus(t) === 'UPCOMING');
  const currentNotActive = terms.filter((t) => !t.isActive && getStatus(t) === 'CURRENT');
  const pastTerms = terms.filter((t) => !t.isActive && getStatus(t) === 'ENDED');

  // Auto-expand active term on first load
  useEffect(() => {
    if (activeTerm && !(activeTerm.id in expanded)) {
      setExpanded((prev) => ({ ...prev, [activeTerm.id]: true }));
      loadBatches(activeTerm.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTerm?.id]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Calendar size={24} className="text-blue-600" />
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Academic Terms</h1>
            <p className="text-sm text-slate-500">Active term and historical batch records</p>
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
        <div className="space-y-8">
          {/* Active Term Hero */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-blue-600" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-600">Active Term</h2>
            </div>
            {activeTerm ? (
              <div className="bg-linear-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 p-6">
                <div className="flex items-start justify-between mb-4 flex-wrap gap-3">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                      <GraduationCap size={24} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold border ${seasonColors[activeTerm.season]}`}>
                          {activeTerm.season}
                        </span>
                        <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-blue-100 text-blue-700 border-blue-200">
                          ACTIVE
                        </span>
                      </div>
                      <h3 className="text-2xl font-bold text-slate-800">{activeTerm.code}</h3>
                      <p className="text-sm text-slate-600">{activeTerm.academicYear}</p>
                    </div>
                  </div>
                  <div className="text-right text-xs text-slate-600 space-y-1">
                    <div className="flex items-center gap-1.5 justify-end"><Clock size={12} />{fmt(activeTerm.startDate)} – {fmt(activeTerm.endDate)}</div>
                    {activeTerm.registrationOpenAt && (
                      <div className="text-slate-500">Reg: {fmt(activeTerm.registrationOpenAt)} – {fmt(activeTerm.registrationCloseAt)}</div>
                    )}
                    <div className="flex items-center gap-1.5 justify-end text-slate-500"><BookOpen size={12} />{activeTerm._count?.offerings ?? 0} offerings</div>
                  </div>
                </div>
                <div className="flex gap-2 mb-4">
                  <button onClick={() => openEdit(activeTerm)} className={btnGhost}><Edit size={13} />Edit Term</button>
                  <button onClick={() => toggleExpand(activeTerm.id)} className={btnGhost}>
                    {expanded[activeTerm.id] ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                    {expanded[activeTerm.id] ? 'Hide Batches' : 'Show Batches'}
                  </button>
                </div>
                {expanded[activeTerm.id] && (
                  <div className="bg-white rounded-lg border border-blue-100 overflow-hidden">
                    <BatchTable
                      batches={batches[activeTerm.id]?.data}
                      loading={batches[activeTerm.id]?.loading}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
                No active term set. Activate a current or upcoming term below.
              </div>
            )}
          </section>

          {/* Upcoming + Current (not active) */}
          {(upcomingTerms.length > 0 || currentNotActive.length > 0) && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Clock size={16} className="text-violet-600" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-600">Upcoming &amp; Current</h2>
              </div>
              <div className="space-y-2">
                {[...currentNotActive, ...upcomingTerms].map((t) => (
                  <TermRow
                    key={t.id}
                    term={t}
                    expanded={!!expanded[t.id]}
                    onToggle={() => toggleExpand(t.id)}
                    batchData={batches[t.id]?.data}
                    batchLoading={batches[t.id]?.loading}
                    onEdit={() => openEdit(t)}
                    onActivate={() => handleActivate(t)}
                    canActivate={true}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Past Terms */}
          {pastTerms.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <History size={16} className="text-slate-500" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-600">Past Terms ({pastTerms.length})</h2>
              </div>
              <div className="space-y-2">
                {pastTerms.map((t) => (
                  <TermRow
                    key={t.id}
                    term={t}
                    expanded={!!expanded[t.id]}
                    onToggle={() => toggleExpand(t.id)}
                    batchData={batches[t.id]?.data}
                    batchLoading={batches[t.id]?.loading}
                    onEdit={() => openEdit(t)}
                    onActivate={() => {}}
                    canActivate={false}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
};

export default TermManagement;
