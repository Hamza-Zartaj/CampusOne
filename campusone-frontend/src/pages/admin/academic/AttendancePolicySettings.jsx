import React, { useEffect, useState } from 'react';
import { CalendarOff, Save, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { leaveAPI } from '../../../utils/api';

const DEFAULT_POLICY = {
  freeQuota: 4,
  fineQuota: 6,
  finePerAbsent: 500,
  lateWeight: 0.5,
  excusedAbsenceReducesTotal: true,
};

const numberFields = ['freeQuota', 'fineQuota', 'finePerAbsent', 'lateWeight'];

const inputClass = 'w-full py-2.5 px-3.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10';
const labelClass = 'block text-sm font-medium text-slate-700 mb-1.5';

const AttendancePolicySettings = () => {
  const [policy, setPolicy] = useState(DEFAULT_POLICY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      setLoading(true);
      const response = await leaveAPI.getPolicy();
      setPolicy({ ...DEFAULT_POLICY, ...(response.data.data || {}) });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load policy');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const setField = (field, value) => {
    setPolicy((current) => ({ ...current, [field]: value }));
  };

  const save = async (event) => {
    event.preventDefault();
    const payload = {
      ...policy,
      ...Object.fromEntries(numberFields.map((field) => [field, Number(policy[field])])),
      excusedAbsenceReducesTotal: !!policy.excusedAbsenceReducesTotal,
    };
    setSaving(true);
    try {
      const response = await leaveAPI.updatePolicy(payload);
      setPolicy({ ...DEFAULT_POLICY, ...(response.data.data || {}) });
      toast.success('Attendance policy saved');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save policy');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <CalendarOff size={24} className="text-blue-600" />
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Attendance Policy</h1>
            <p className="text-sm text-slate-500">Leave quotas, fines, and attendance counters</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setPolicy(DEFAULT_POLICY)}
          className="inline-flex items-center gap-2 py-2 px-3 rounded-lg text-sm font-medium border border-gray-200 bg-white text-slate-700 hover:bg-slate-50"
        >
          <RotateCcw size={15} />Defaults
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400">Loading...</div>
      ) : (
        <form onSubmit={save} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 p-6">
            <label>
              <span className={labelClass}>Free Leave Units</span>
              <input
                type="number"
                min="0"
                step="0.5"
                className={inputClass}
                value={policy.freeQuota}
                onChange={(event) => setField('freeQuota', event.target.value)}
                required
              />
            </label>
            <label>
              <span className={labelClass}>Drop Threshold</span>
              <input
                type="number"
                min="0"
                step="0.5"
                className={inputClass}
                value={policy.fineQuota}
                onChange={(event) => setField('fineQuota', event.target.value)}
                required
              />
            </label>
            <label>
              <span className={labelClass}>Fine Per Unit</span>
              <input
                type="number"
                min="0"
                step="1"
                className={inputClass}
                value={policy.finePerAbsent}
                onChange={(event) => setField('finePerAbsent', event.target.value)}
                required
              />
            </label>
            <label>
              <span className={labelClass}>Late Weight</span>
              <input
                type="number"
                min="0"
                max="1"
                step="0.25"
                className={inputClass}
                value={policy.lateWeight}
                onChange={(event) => setField('lateWeight', event.target.value)}
                required
              />
            </label>
            <label className="md:col-span-2 flex items-center justify-between gap-4 rounded-lg border border-slate-200 px-4 py-3">
              <span>
                <span className="block text-sm font-medium text-slate-700">Approved leave reduces counted classes</span>
                <span className="block text-xs text-slate-500 mt-0.5">Excused absences are removed from the attendance percentage denominator.</span>
              </span>
              <input
                type="checkbox"
                checked={!!policy.excusedAbsenceReducesTotal}
                onChange={(event) => setField('excusedAbsenceReducesTotal', event.target.checked)}
                className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
            </label>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-slate-100 bg-slate-50 px-6 py-4">
            <div className="text-xs text-slate-500">
              Current: free up to {policy.freeQuota}, fined until {policy.fineQuota}, drop after {policy.fineQuota}.
            </div>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 py-2 px-4 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Save size={16} />{saving ? 'Saving...' : 'Save Policy'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default AttendancePolicySettings;
