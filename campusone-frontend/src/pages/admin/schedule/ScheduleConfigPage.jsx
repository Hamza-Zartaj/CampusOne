import React, { useEffect, useState } from 'react';
import { Clock, Save, RotateCcw, Settings2, Coffee } from 'lucide-react';
import toast from 'react-hot-toast';
import { scheduleAPI } from '../../../utils/api';

const inputClass = 'w-full py-2 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10';
const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5';
const btnPrimary = 'inline-flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50';
const btnGhost = 'inline-flex items-center gap-2 py-2 px-3 rounded-lg text-sm font-medium border border-gray-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors';

const ALL_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

const parseTime = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
const fmt = (mins) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

const computeSlots = (cfg) => {
  if (!cfg) return {};
  const overrides = cfg.dayOverrides || {};
  const days = cfg.workingDays || [];
  const start = parseTime(cfg.dayStartTime || '09:00');
  const lec = cfg.lectureDurationMin;
  const brk = cfg.breakDurationMin;
  const out = {};
  for (const day of days) {
    const ov = overrides[day];
    const lectures = ov?.lecturesPerDay ?? cfg.regularLecturesPerDay;
    const slots = [];
    let cursor = start;
    for (let i = 1; i <= lectures; i++) {
      const sStart = cursor;
      const sEnd = sStart + lec;
      slots.push({ index: i, start: fmt(sStart), end: fmt(sEnd) });
      cursor = sEnd + brk;
      if (ov && ov.jummahAfterSlot === i && ov.jummahMin) {
        cursor = cursor - brk + ov.jummahMin;
      }
    }
    out[day] = slots;
  }
  return out;
};

const ScheduleConfigPage = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const res = await scheduleAPI.getConfig();
      const cfg = res.data.data;
      cfg.workingDays = Array.isArray(cfg.workingDays) ? cfg.workingDays : JSON.parse(cfg.workingDays || '[]');
      cfg.dayOverrides = typeof cfg.dayOverrides === 'object' ? cfg.dayOverrides : JSON.parse(cfg.dayOverrides || '{}');
      setConfig(cfg);
    } catch {
      toast.error('Failed to load config');
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await scheduleAPI.updateConfig({
        lectureDurationMin: +config.lectureDurationMin,
        breakDurationMin: +config.breakDurationMin,
        dayStartTime: config.dayStartTime,
        workingDays: config.workingDays,
        regularLecturesPerDay: +config.regularLecturesPerDay,
        maxTeacherLecturesPerDay: +config.maxTeacherLecturesPerDay,
        defaultSessionsPerCourse: +config.defaultSessionsPerCourse,
        dayOverrides: config.dayOverrides,
      });
      toast.success('Schedule configuration saved');
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day) => {
    const d = config.workingDays.includes(day)
      ? config.workingDays.filter((x) => x !== day)
      : [...config.workingDays, day];
    setConfig({ ...config, workingDays: d });
  };

  const updateFridayOverride = (key, value) => {
    const o = { ...(config.dayOverrides || {}) };
    o.FRI = { ...(o.FRI || {}), [key]: value };
    setConfig({ ...config, dayOverrides: o });
  };

  if (loading || !config) return <div className="p-8 text-center text-slate-400">Loading…</div>;

  const slots = computeSlots(config);
  const friOverride = config.dayOverrides?.FRI || {};

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Settings2 size={24} className="text-blue-600" />
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Master Schedule</h1>
            <p className="text-sm text-slate-500">Institution-wide timetable rules</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className={btnGhost}><RotateCcw size={14} />Reset</button>
          <button onClick={save} disabled={saving} className={btnPrimary}><Save size={14} />{saving ? 'Saving…' : 'Save'}</button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Left: settings */}
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2"><Clock size={16} className="text-blue-600" />Time &amp; Duration</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Lecture duration (min)</label>
                <input type="number" className={inputClass} value={config.lectureDurationMin} onChange={(e) => setConfig({ ...config, lectureDurationMin: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>Break duration (min)</label>
                <input type="number" className={inputClass} value={config.breakDurationMin} onChange={(e) => setConfig({ ...config, breakDurationMin: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>Day start time</label>
                <input type="time" className={inputClass} value={config.dayStartTime} onChange={(e) => setConfig({ ...config, dayStartTime: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>Lectures / day</label>
                <input type="number" className={inputClass} value={config.regularLecturesPerDay} onChange={(e) => setConfig({ ...config, regularLecturesPerDay: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>Max teacher lectures / day</label>
                <input type="number" className={inputClass} value={config.maxTeacherLecturesPerDay} onChange={(e) => setConfig({ ...config, maxTeacherLecturesPerDay: e.target.value })} />
              </div>
              <div>
                <label className={labelClass}>Sessions per course</label>
                <input type="number" className={inputClass} value={config.defaultSessionsPerCourse} onChange={(e) => setConfig({ ...config, defaultSessionsPerCourse: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-800 mb-3">Working Days</h2>
            <div className="flex flex-wrap gap-2">
              {ALL_DAYS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${config.workingDays.includes(d) ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-800 mb-3 flex items-center gap-2"><Coffee size={16} className="text-amber-600" />Friday Override (Jummah)</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Lectures on Fri</label>
                <input type="number" className={inputClass} value={friOverride.lecturesPerDay ?? ''} placeholder="3" onChange={(e) => updateFridayOverride('lecturesPerDay', e.target.value ? +e.target.value : undefined)} />
              </div>
              <div>
                <label className={labelClass}>Jummah after slot</label>
                <input type="number" className={inputClass} value={friOverride.jummahAfterSlot ?? ''} placeholder="2" onChange={(e) => updateFridayOverride('jummahAfterSlot', e.target.value ? +e.target.value : undefined)} />
              </div>
              <div>
                <label className={labelClass}>Jummah duration (min)</label>
                <input type="number" className={inputClass} value={friOverride.jummahMin ?? ''} placeholder="60" onChange={(e) => updateFridayOverride('jummahMin', e.target.value ? +e.target.value : undefined)} />
              </div>
            </div>
          </div>
        </div>

        {/* Right: live preview */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-800 mb-3">Computed Slots (preview)</h2>
          <div className="space-y-3">
            {(config.workingDays || []).map((day) => (
              <div key={day} className="border border-slate-100 rounded-lg p-3">
                <div className="text-xs font-bold text-slate-500 uppercase mb-2">{day}</div>
                <div className="flex flex-wrap gap-2">
                  {(slots[day] || []).map((s) => (
                    <span key={s.index} className="px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                      {s.index}. {s.start}–{s.end}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScheduleConfigPage;
