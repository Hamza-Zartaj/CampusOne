import React, { useEffect, useState } from 'react';
import { CalendarOff, Plus, Trash2, Repeat } from 'lucide-react';
import toast from 'react-hot-toast';
import { holidayAPI } from '../../../utils/api';

const inputClass = 'w-full py-2 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10';
const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5';
const btnPrimary = 'inline-flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50';

const HolidayManagement = () => {
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ date: '', name: '', isRecurring: false });
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await holidayAPI.getAll();
      setHolidays(res.data.data || []);
    } catch {
      toast.error('Failed to load holidays');
    } finally {
      setLoading(false);
    }
  };

  const add = async (e) => {
    e.preventDefault();
    if (!form.date || !form.name) return;
    setSaving(true);
    try {
      await holidayAPI.create(form);
      toast.success('Holiday added');
      setForm({ date: '', name: '', isRecurring: false });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (h) => {
    if (!confirm(`Remove "${h.name}"?`)) return;
    try {
      await holidayAPI.delete(h.id);
      toast.success('Removed');
      load();
    } catch {
      toast.error('Failed');
    }
  };

  // Group by year
  const grouped = {};
  for (const h of holidays) {
    const year = new Date(h.date).getFullYear();
    if (!grouped[year]) grouped[year] = [];
    grouped[year].push(h);
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <CalendarOff size={24} className="text-blue-600" />
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Holidays</h1>
          <p className="text-sm text-slate-500">Public holidays — no classes scheduled</p>
        </div>
      </div>

      <form onSubmit={add} className="bg-white rounded-xl border border-slate-200 p-5 mb-5">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
          <div className="md:col-span-1">
            <label className={labelClass}>Date</label>
            <input type="date" className={inputClass} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} required />
          </div>
          <div className="md:col-span-2">
            <label className={labelClass}>Name</label>
            <input className={inputClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Independence Day" required />
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-700 mt-5">
              <input type="checkbox" checked={form.isRecurring} onChange={(e) => setForm({ ...form, isRecurring: e.target.checked })} />
              Recurring yearly
            </label>
          </div>
          <div className="md:col-span-4 flex justify-end">
            <button type="submit" disabled={saving} className={btnPrimary}><Plus size={14} />{saving ? 'Saving…' : 'Add Holiday'}</button>
          </div>
        </div>
      </form>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading…</div>
      ) : holidays.length === 0 ? (
        <div className="text-center py-12 text-slate-400 bg-white rounded-xl border border-slate-200">No holidays yet.</div>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).sort(([a], [b]) => +b - +a).map(([year, items]) => (
            <div key={year} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 font-semibold text-slate-800">{year}</div>
              <div className="divide-y divide-slate-100">
                {items.map((h) => (
                  <div key={h.id} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-lg bg-blue-50 flex flex-col items-center justify-center border border-blue-100">
                        <div className="text-[10px] font-semibold text-blue-600 uppercase">{new Date(h.date).toLocaleString('default', { month: 'short' })}</div>
                        <div className="text-base font-bold text-blue-700 leading-none">{new Date(h.date).getDate()}</div>
                      </div>
                      <div>
                        <div className="font-medium text-slate-800 flex items-center gap-2">
                          {h.name}
                          {h.isRecurring && <Repeat size={12} className="text-amber-500" />}
                        </div>
                        <div className="text-xs text-slate-500">{new Date(h.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                      </div>
                    </div>
                    <button onClick={() => remove(h)} className="p-1.5 rounded text-red-600 hover:bg-red-50">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HolidayManagement;
