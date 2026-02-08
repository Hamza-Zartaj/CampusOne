import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Users,
  Search,
  Filter,
  ChevronRight,
  Calendar,
  Lock,
  Unlock,
  BarChart3,
  AlertCircle,
  FileText
} from 'lucide-react';
import { teacherToolsAPI } from '../../utils/api';
import toast from 'react-hot-toast';

const statusColors = {
  active: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  open: { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
  completed: { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' },
  cancelled: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
};

const MyOfferings = () => {
  const [offerings, setOfferings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSemester, setFilterSemester] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const navigate = useNavigate();

  const fetchOfferings = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterStatus) params.status = filterStatus;
      if (filterSemester) params.semesterNumber = filterSemester;
      const res = await teacherToolsAPI.getMyOfferings(params);
      if (res.data.success) {
        setOfferings(res.data.data);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Error fetching offerings');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterSemester]);

  useEffect(() => {
    fetchOfferings();
  }, [fetchOfferings]);

  const filteredOfferings = offerings.filter(o => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.course?.courseCode?.toLowerCase().includes(q) ||
      o.course?.courseName?.toLowerCase().includes(q) ||
      o.program?.programCode?.toLowerCase().includes(q) ||
      o.section?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 max-sm:flex-col max-sm:items-start max-sm:gap-3">
        <div>
          <h1 className="text-[28px] font-bold text-slate-800 m-0 max-md:text-2xl">Courses</h1>
          <p className="text-sm text-slate-500 m-0 mt-1">Course offerings assigned to you</p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-5 flex items-center gap-3 max-sm:flex-col">
        <div className="flex-1 relative max-sm:w-full">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by course code, name, section..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full py-2.5 pl-10 pr-4 border border-gray-200 rounded-lg text-[0.95rem] focus:outline-none focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`inline-flex items-center gap-2 py-2.5 px-4 border rounded-lg text-[0.95rem] font-medium cursor-pointer transition-all ${
            showFilters ? 'bg-primary-50 border-primary-200 text-primary-600' : 'bg-white border-gray-200 text-slate-800 hover:bg-slate-50'
          }`}
        >
          <Filter size={18} /> Filters
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-2xl shadow-sm p-4 mb-5 grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full py-2 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-500"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="open">Open</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Semester</label>
            <select
              value={filterSemester}
              onChange={(e) => setFilterSemester(e.target.value)}
              className="w-full py-2 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-primary-500"
            >
              <option value="">All Semesters</option>
              {[1,2,3,4,5,6,7,8].map(s => (
                <option key={s} value={s}>Semester {s}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Offerings List */}
      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center text-slate-400">
          Loading offerings...
        </div>
      ) : filteredOfferings.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <AlertCircle size={48} className="mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-semibold text-slate-700 mb-1">No offerings found</h3>
          <p className="text-slate-500">
            {searchQuery || filterStatus || filterSemester
              ? 'Try adjusting your filters.'
              : 'You have no course offerings assigned.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredOfferings.map((offering) => {
            const colors = statusColors[offering.status] || statusColors.active;
            return (
              <div
                key={offering._id}
                className="bg-white rounded-2xl shadow-sm p-5 hover:shadow-md transition-all cursor-pointer"
                onClick={() => navigate(`/teacher/offerings/${offering._id}/students`)}
              >
                <div className="flex items-center justify-between max-sm:flex-col max-sm:items-start max-sm:gap-3">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                      <BookOpen size={22} />
                    </div>
                    <div>
                      <h3 className="text-[16px] font-semibold text-slate-800 m-0">
                        {offering.course?.courseCode} - {offering.course?.courseName}
                      </h3>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="text-sm text-slate-500">Section {offering.section}</span>
                        <span className="text-slate-300">|</span>
                        <span className="text-sm text-slate-500">{offering.program?.programCode}</span>
                        <span className="text-slate-300">|</span>
                        <span className="text-sm text-slate-500">Sem {offering.semesterNumber}, {offering.academicYear}</span>
                        <span className="text-slate-300">|</span>
                        <span className="text-sm text-slate-500">{offering.course?.creditHours} CH</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-5">
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <Users size={16} />
                      {offering.currentEnrollment || 0}/{offering.maxCapacity || '-'}
                    </div>
                    <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${colors.bg} ${colors.text} ${colors.border}`}>
                      {offering.status}
                    </span>
                    {offering.resultsLocked && (
                      <Lock size={16} className="text-green-600" title="Results Locked" />
                    )}
                    <ChevronRight size={18} className="text-slate-400" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyOfferings;
