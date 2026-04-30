import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Search, Filter, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { auditLogAPI } from '../../utils/api';

const CATEGORY_COLORS = {
  USER_MANAGEMENT: 'bg-blue-50 text-blue-700 border-blue-200',
  ACADEMIC:        'bg-purple-50 text-purple-700 border-purple-200',
  ADMISSION:       'bg-amber-50 text-amber-700 border-amber-200',
  ANNOUNCEMENT:    'bg-green-50 text-green-700 border-green-200',
};

const ACTION_COLORS = {
  CREATE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  UPDATE: 'bg-sky-50 text-sky-700 border-sky-200',
  DELETE: 'bg-red-50 text-red-700 border-red-200',
  DEACTIVATE: 'bg-orange-50 text-orange-700 border-orange-200',
  ACTIVATE: 'bg-green-50 text-green-700 border-green-200',
  UNLOCK: 'bg-teal-50 text-teal-700 border-teal-200',
  RESTORE: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  SEND: 'bg-violet-50 text-violet-700 border-violet-200',
  BULK: 'bg-slate-100 text-slate-700 border-slate-300',
};

const actionColor = (action) => {
  const prefix = Object.keys(ACTION_COLORS).find((k) => action.startsWith(k));
  return prefix ? ACTION_COLORS[prefix] : 'bg-slate-100 text-slate-600 border-slate-200';
};

const Badge = ({ text, colorClass }) => (
  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${colorClass}`}>
    {text}
  </span>
);

const ExpandedDetail = ({ label, value }) => {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 mb-1">{label}</p>
      <pre className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap break-all">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
};

const AuditLogs = () => {
  const [logs, setLogs]         = useState([]);
  const [loading, setLoading]   = useState(true);
  const [categories, setCategories] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, totalPages: 1 });

  const [filters, setFilters] = useState({
    category: '',
    search: '',
    from: '',
    to: '',
  });
  const [applied, setApplied] = useState(filters);

  const fetchLogs = useCallback(async (page = 1, f = applied) => {
    setLoading(true);
    try {
      const params = { page, limit: 50 };
      if (f.category) params.category = f.category;
      if (f.search)   params.search   = f.search;
      if (f.from)     params.from     = f.from;
      if (f.to)       params.to       = f.to;

      const res = await auditLogAPI.getLogs(params);
      setLogs(res.data.data);
      setPagination(res.data.pagination);
    } catch {
      toast.error('Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [applied]);

  useEffect(() => {
    auditLogAPI.getCategories()
      .then((r) => setCategories(r.data.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchLogs(1, applied);
  }, [applied]);

  const applyFilters = () => {
    setApplied({ ...filters });
  };

  const clearFilters = () => {
    const empty = { category: '', search: '', from: '', to: '' };
    setFilters(empty);
    setApplied(empty);
  };

  const hasActiveFilters = applied.category || applied.search || applied.from || applied.to;

  return (
    <div className="max-w-350 mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center">
            <Shield size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-[28px] font-bold text-slate-800 m-0 max-md:text-2xl">Audit Logs</h1>
            <p className="text-sm text-slate-500 m-0 mt-0.5">Track all admin actions across the system</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm p-5 mb-5">
        <div className="grid grid-cols-[1fr_1fr_auto_auto_auto_auto] gap-3 items-end max-lg:grid-cols-2 max-sm:grid-cols-1">
          {/* Search */}
          <div className="relative col-span-2 max-lg:col-span-2">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search action or description…"
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>

          {/* Category */}
          <div>
            <label className="text-xs text-slate-500 font-medium block mb-1">Category</label>
            <select
              value={filters.category}
              onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              <option value="">All categories</option>
              {categories.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
            </select>
          </div>

          {/* From */}
          <div>
            <label className="text-xs text-slate-500 font-medium block mb-1">From</label>
            <input
              type="date"
              value={filters.from}
              onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>

          {/* To */}
          <div>
            <label className="text-xs text-slate-500 font-medium block mb-1">To</label>
            <input
              type="date"
              value={filters.to}
              onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-slate-300"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-2 items-end">
            <button
              onClick={applyFilters}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 text-white rounded-xl text-sm font-medium hover:bg-slate-700 transition-colors"
            >
              <Filter size={14} /> Apply
            </button>
            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="px-3 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Clear
              </button>
            )}
            <button
              onClick={() => fetchLogs(pagination.page)}
              className="px-3 py-2 border border-slate-200 rounded-xl text-slate-500 hover:bg-slate-50 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {hasActiveFilters && (
          <p className="text-xs text-slate-400 mt-3">
            Showing filtered results — {pagination.total} record{pagination.total !== 1 ? 's' : ''} found
          </p>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-10 text-center text-slate-400 text-sm">Loading…</div>
        ) : logs.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">No audit logs found.</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider w-[160px]">Timestamp</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Category</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Performed By</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Target</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.map((log) => {
                    const expanded = expandedId === log.id;
                    const hasExtra = log.previousValue || log.newValue;
                    const ts = new Date(log.createdAt);
                    return (
                      <React.Fragment key={log.id}>
                        <tr
                          className={`hover:bg-slate-50/50 transition-colors ${expanded ? 'bg-slate-50/70' : ''} ${hasExtra ? 'cursor-pointer' : ''}`}
                          onClick={() => hasExtra && setExpandedId(expanded ? null : log.id)}
                        >
                          <td className="px-5 py-3 text-xs text-slate-500 whitespace-nowrap">
                            {ts.toLocaleDateString('en-PK', { day: '2-digit', month: 'short', year: 'numeric' })}
                            <br />
                            <span className="text-slate-400">{ts.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                          </td>
                          <td className="px-4 py-3">
                            <Badge text={log.action.replace(/_/g, ' ')} colorClass={actionColor(log.action)} />
                          </td>
                          <td className="px-4 py-3">
                            <Badge
                              text={log.category.replace(/_/g, ' ')}
                              colorClass={CATEGORY_COLORS[log.category] || 'bg-slate-100 text-slate-600 border-slate-200'}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-slate-800 font-medium leading-snug">{log.performer?.name || '—'}</p>
                            <p className="text-xs text-slate-400 capitalize">{log.performedByRole}</p>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-500">
                            <span className="font-medium text-slate-700">{log.targetModel}</span>
                            <br />
                            <span className="font-mono text-[10px] text-slate-400 truncate max-w-[100px] block">{log.targetId}</span>
                          </td>
                          <td className="px-4 py-3 text-xs text-slate-600 max-w-[260px]">
                            {log.description || '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-400">
                            {hasExtra && (expanded
                              ? <ChevronUp size={16} />
                              : <ChevronDown size={16} />
                            )}
                          </td>
                        </tr>
                        {expanded && hasExtra && (
                          <tr className="bg-slate-50/80">
                            <td colSpan={7} className="px-8 py-4">
                              <div className="grid grid-cols-2 gap-4 max-sm:grid-cols-1">
                                <ExpandedDetail label="Previous Value" value={log.previousValue} />
                                <ExpandedDetail label="New Value" value={log.newValue} />
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-5 py-3 border-t border-slate-100">
                <p className="text-xs text-slate-500">
                  Page {pagination.page} of {pagination.totalPages} &mdash; {pagination.total} total records
                </p>
                <div className="flex gap-2">
                  <button
                    disabled={!pagination.hasPrev}
                    onClick={() => fetchLogs(pagination.page - 1)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={14} /> Prev
                  </button>
                  <button
                    disabled={!pagination.hasNext}
                    onClick={() => fetchLogs(pagination.page + 1)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Next <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AuditLogs;
