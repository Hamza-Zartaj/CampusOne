import React, { useEffect, useState } from 'react';
import { Building2, Plus, Edit, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { roomAPI } from '../../../utils/api';

const inputClass = 'w-full py-2 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10';
const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5';
const btnPrimary = 'inline-flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50';
const btnSecondary = 'inline-flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium border border-gray-200 bg-white text-slate-700 hover:bg-slate-50';
const btnGhost = 'inline-flex items-center gap-1.5 py-1 px-2 rounded text-xs font-medium border border-gray-200 bg-white text-slate-600 hover:bg-slate-50';

const TYPES = ['LECTURE', 'LAB', 'SEMINAR'];
const TYPE_BADGE = {
  LECTURE: 'bg-blue-50 text-blue-700 border-blue-200',
  LAB:     'bg-purple-50 text-purple-700 border-purple-200',
  SEMINAR: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};
const FLOOR_LABEL = { 0: 'Ground', 1: '1st', 2: '2nd', 3: '3rd' };

const empty = { code: '', name: '', type: 'LECTURE', capacity: 40, building: '', floor: 0, isActive: true };

const RoomManagement = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(empty);
  const [filterType, setFilterType] = useState('');
  const [filterBuilding, setFilterBuilding] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await roomAPI.getAll();
      setRooms(res.data.data || []);
    } catch {
      toast.error('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => { setEditId(null); setForm(empty); setShowForm(true); };
  const openEdit = (r) => {
    setEditId(r.id);
    setForm({ code: r.code, name: r.name || '', type: r.type, capacity: r.capacity, building: r.building || '', floor: r.floor ?? 0, isActive: r.isActive });
    setShowForm(true);
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        code: form.code.toUpperCase(),
        name: form.name || null,
        type: form.type,
        capacity: +form.capacity,
        building: form.building || null,
        floor: form.floor === '' ? null : +form.floor,
        isActive: form.isActive,
      };
      if (editId) { await roomAPI.update(editId, payload); toast.success('Room updated'); }
      else { await roomAPI.create(payload); toast.success('Room created'); }
      setShowForm(false);
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (r) => {
    if (!confirm(`Delete room ${r.code}?`)) return;
    try {
      await roomAPI.delete(r.id);
      toast.success('Deleted');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    }
  };

  const buildings = [...new Set(rooms.map((r) => r.building).filter(Boolean))].sort();
  const filtered = rooms.filter((r) =>
    (!filterType || r.type === filterType) && (!filterBuilding || r.building === filterBuilding),
  );

  // Group by building → floor
  const grouped = {};
  for (const r of filtered) {
    const b = r.building || '— Other —';
    if (!grouped[b]) grouped[b] = {};
    const f = r.floor ?? 'unknown';
    if (!grouped[b][f]) grouped[b][f] = [];
    grouped[b][f].push(r);
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Building2 size={24} className="text-blue-600" />
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Rooms</h1>
            <p className="text-sm text-slate-500">Lecture halls, labs and seminar rooms</p>
          </div>
        </div>
        <button onClick={openCreate} className={btnPrimary}><Plus size={16} />New Room</button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 mb-4 flex flex-wrap gap-2">
        <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className="py-2 px-3 rounded-lg border border-slate-200 text-sm">
          <option value="">All types</option>
          {TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
        <select value={filterBuilding} onChange={(e) => setFilterBuilding(e.target.value)} className="py-2 px-3 rounded-lg border border-slate-200 text-sm">
          <option value="">All buildings</option>
          {buildings.map((b) => <option key={b}>{b}</option>)}
        </select>
        <span className="ml-auto text-sm text-slate-500 self-center">{filtered.length} rooms</span>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400">No rooms.</div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([building, floors]) => (
            <div key={building} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 font-semibold text-slate-800">{building}</div>
              {Object.entries(floors).sort(([a], [b]) => +a - +b).map(([floor, items]) => (
                <div key={floor} className="px-5 py-3 border-b border-slate-100 last:border-b-0">
                  <div className="text-xs font-semibold uppercase text-slate-500 mb-2">{FLOOR_LABEL[floor] || `Floor ${floor}`} Floor</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    {items.map((r) => (
                      <div key={r.id} className={`flex items-center gap-3 p-3 rounded-lg border ${r.isActive ? 'border-slate-200' : 'border-slate-200 bg-slate-50 opacity-60'}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800">{r.code}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${TYPE_BADGE[r.type]}`}>{r.type}</span>
                            {!r.isActive && <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500">INACTIVE</span>}
                          </div>
                          <div className="text-xs text-slate-500 truncate">{r.name || '—'} · cap {r.capacity}</div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEdit(r)} className={btnGhost}><Edit size={12} /></button>
                          <button onClick={() => remove(r)} className="inline-flex items-center gap-1.5 py-1 px-2 rounded text-xs font-medium border border-red-200 bg-white text-red-600 hover:bg-red-50">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-modal p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="font-semibold text-slate-800">{editId ? 'Edit Room' : 'New Room'}</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <form onSubmit={submit} className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Code *</label>
                  <input className={inputClass} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="R125" required disabled={!!editId} />
                </div>
                <div>
                  <label className={labelClass}>Type *</label>
                  <select className={inputClass} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    {TYPES.map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelClass}>Name (optional)</label>
                <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Programming Lab" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>Capacity</label>
                  <input type="number" className={inputClass} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className={labelClass}>Building</label>
                  <input className={inputClass} value={form.building} onChange={(e) => setForm({ ...form, building: e.target.value })} placeholder="Commerce Block" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Floor</label>
                <select className={inputClass} value={form.floor} onChange={(e) => setForm({ ...form, floor: e.target.value })}>
                  <option value={0}>Ground</option>
                  <option value={1}>1st</option>
                  <option value={2}>2nd</option>
                  <option value={3}>3rd</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                Active
              </label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className={btnSecondary}>Cancel</button>
                <button type="submit" disabled={saving} className={btnPrimary}>{saving ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomManagement;
