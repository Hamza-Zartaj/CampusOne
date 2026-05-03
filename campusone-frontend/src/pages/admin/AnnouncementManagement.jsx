import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  Send,
  Trash2,
  AlertCircle,
  CheckCircle,
  Loader,
  Users,
  GraduationCap,
  Briefcase,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { announcementAPI, departmentAPI, programAPI } from '../../utils/api';

const inputClass =
  'w-full py-2.5 px-3.5 border border-gray-200 rounded-lg text-[0.95rem] transition-all focus:outline-none focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/10';
const labelClass = 'block text-[0.9rem] font-medium text-slate-800 mb-2';
const btnPrimaryClass =
  'inline-flex items-center gap-2 py-2.5 px-5 border-none rounded-lg text-[0.95rem] font-medium cursor-pointer transition-all bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed';
const btnSecondaryClass =
  'inline-flex items-center gap-2 py-2.5 px-5 border border-gray-200 rounded-lg text-[0.95rem] font-medium cursor-pointer transition-all bg-white text-slate-800 hover:bg-slate-50';

const PRIORITY_COLORS = {
  low: 'bg-green-50 border-green-200 text-green-700',
  medium: 'bg-blue-50 border-blue-200 text-blue-700',
  high: 'bg-red-50 border-red-200 text-red-700',
};

const PRIORITY_BADGES = {
  low: 'bg-green-100 text-green-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-red-100 text-red-700',
};

const AnnouncementManagement = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState('medium');
  const [audience, setAudience] = useState('all');
  const [sending, setSending] = useState(false);

  // Filter metadata + selections
  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filterDepartments, setFilterDepartments] = useState([]);
  const [filterPrograms, setFilterPrograms] = useState([]);
  const [filterBatches, setFilterBatches] = useState([]);
  const [filterSemesters, setFilterSemesters] = useState([]);

  const ALL_BATCHES = ['FA22', 'FA23', 'FA24', 'FA25'];
  const ALL_SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

  // Load data
  useEffect(() => {
    loadAnnouncements();
    loadFilterMeta();
  }, []);

  const loadFilterMeta = async () => {
    try {
      const [d, p] = await Promise.all([departmentAPI.getAll(), programAPI.getAll()]);
      setDepartments(d.data.data || []);
      setPrograms(p.data.data || []);
    } catch {}
  };

  const toggle = (arr, setArr, val) => {
    setArr(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  };

  const resetFilters = () => {
    setFilterDepartments([]); setFilterPrograms([]); setFilterBatches([]); setFilterSemesters([]);
  };

  const loadAnnouncements = async () => {
    try {
      setLoading(true);
      const res = await announcementAPI.getAllAnnouncements();
      setAnnouncements(res.data);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load announcements');
      console.error('Error loading announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      setError('Please fill in all required fields');
      return;
    }

    if (audience === 'specific_course' && !courseId) {
      setError('Please select a course');
      return;
    }

    try {
      setSending(true);
      setError('');

      const filters = {};
      if (filterDepartments.length) filters.departmentIds = filterDepartments;
      if (filterPrograms.length)    filters.programIds    = filterPrograms;
      if (filterBatches.length)     filters.batches       = filterBatches;
      if (filterSemesters.length)   filters.semesters     = filterSemesters;

      const data = {
        title: title.trim(),
        content: content.trim(),
        priority,
        targetAudience: audience,
        filters: Object.keys(filters).length ? filters : undefined,
      };

      const res = await announcementAPI.sendAnnouncement(data);

      setSuccess(`✓ Announcement sent to ${res.data.recipientCount} recipients`);
      setTitle('');
      setContent('');
      setPriority('medium');
      setAudience('all');
      resetFilters();
      setShowFilters(false);

      // Reload announcements
      loadAnnouncements();

      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send announcement');
      console.error('Error sending announcement:', err);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) {
      return;
    }

    try {
      await announcementAPI.deleteAnnouncement(id);
      setSuccess('Announcement deleted successfully');
      loadAnnouncements();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete announcement');
      console.error('Error deleting announcement:', err);
    }
  };

  const getAudienceIcon = (audience) => {
    const icons = {
      all: Users,
      teachers: Briefcase,
      students: GraduationCap,
      filtered: Users,
      course: GraduationCap,
    };
    return icons[audience] || Users;
  };

  const getAudienceLabel = (announcement) => {
    if (typeof announcement === 'string') {
      const labels = {
        all: 'All Users',
        teachers: 'Teachers & Admins',
        students: 'All Students',
        course: 'Course Students',
        filtered: 'Filtered Group',
      };
      return labels[announcement] || announcement;
    }
    if (announcement.targetAudience !== 'filtered') {
      return getAudienceLabel(announcement.targetAudience);
    }
    const f = announcement.audienceFilters || {};
    const parts = [];
    if (f.baseAudience) parts.push(f.baseAudience === 'students' ? 'Students' : f.baseAudience === 'teachers' ? 'Staff' : 'All');
    if (f.batches?.length) parts.push(`batch ${f.batches.join(', ')}`);
    if (f.semesters?.length) parts.push(`sem ${f.semesters.join(', ')}`);
    if (f.programIds?.length) parts.push(`${f.programIds.length} prog`);
    if (f.departmentIds?.length) parts.push(`${f.departmentIds.length} dept`);
    return parts.join(' · ') || 'Filtered Group';
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Megaphone className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-slate-900">Announcements</h1>
          </div>
          <p className="text-slate-600">Send announcements to users with filtered audience groups</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Send className="w-5 h-5 text-blue-600" />
                Send Announcement
              </h2>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {success && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  <p className="text-green-700 text-sm">{success}</p>
                </div>
              )}

              <form onSubmit={handleSend} className="space-y-4">
                <div>
                  <label className={labelClass}>Title *</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Announcement title"
                    className={inputClass}
                    disabled={sending}
                  />
                </div>

                <div>
                  <label className={labelClass}>Content *</label>
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Announcement content"
                    rows="5"
                    className={`${inputClass} resize-none`}
                    disabled={sending}
                  />
                </div>

                <div>
                  <label className={labelClass}>Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className={inputClass}
                    disabled={sending}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Send To *</label>
                  <select
                    value={audience}
                    onChange={(e) => setAudience(e.target.value)}
                    className={inputClass}
                    disabled={sending}
                  >
                    <option value="all">All Users</option>
                    <option value="teachers">Teachers & Admins</option>
                    <option value="students">All Students</option>
                  </select>
                </div>

                {/* Advanced filters */}
                <div className="border-t border-gray-100 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowFilters((v) => !v)}
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    {showFilters ? '▾' : '▸'} Advanced filters
                    {(filterDepartments.length + filterPrograms.length + filterBatches.length + filterSemesters.length) > 0 && (
                      <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-semibold">
                        {filterDepartments.length + filterPrograms.length + filterBatches.length + filterSemesters.length} active
                      </span>
                    )}
                  </button>
                  {showFilters && (
                    <div className="mt-3 space-y-3 bg-slate-50 rounded-lg p-3">
                      <div>
                        <p className="text-xs font-semibold text-slate-700 mb-1.5">Departments</p>
                        <div className="flex flex-wrap gap-1.5">
                          {departments.map((d) => (
                            <button
                              key={d.id}
                              type="button"
                              onClick={() => toggle(filterDepartments, setFilterDepartments, d.id)}
                              className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                                filterDepartments.includes(d.id)
                                  ? 'bg-blue-600 text-white border-blue-600'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                            >{d.code}</button>
                          ))}
                          {departments.length === 0 && <span className="text-xs text-slate-400">No departments</span>}
                        </div>
                      </div>
                      {audience !== 'teachers' && (
                        <>
                          <div>
                            <p className="text-xs font-semibold text-slate-700 mb-1.5">Programs</p>
                            <div className="flex flex-wrap gap-1.5">
                              {programs.map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => toggle(filterPrograms, setFilterPrograms, p.id)}
                                  className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                                    filterPrograms.includes(p.id)
                                      ? 'bg-blue-600 text-white border-blue-600'
                                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                  }`}
                                >{p.programCode}</button>
                              ))}
                              {programs.length === 0 && <span className="text-xs text-slate-400">No programs</span>}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-700 mb-1.5">Batches</p>
                            <div className="flex flex-wrap gap-1.5">
                              {ALL_BATCHES.map((b) => (
                                <button
                                  key={b}
                                  type="button"
                                  onClick={() => toggle(filterBatches, setFilterBatches, b)}
                                  className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                                    filterBatches.includes(b)
                                      ? 'bg-blue-600 text-white border-blue-600'
                                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                  }`}
                                >{b}</button>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-slate-700 mb-1.5">Current Semester</p>
                            <div className="flex flex-wrap gap-1.5">
                              {ALL_SEMESTERS.map((s) => (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => toggle(filterSemesters, setFilterSemesters, s)}
                                  className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                                    filterSemesters.includes(s)
                                      ? 'bg-blue-600 text-white border-blue-600'
                                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                                  }`}
                                >Sem {s}</button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                      {(filterDepartments.length + filterPrograms.length + filterBatches.length + filterSemesters.length) > 0 && (
                        <button type="button" onClick={resetFilters} className="text-xs text-slate-500 hover:text-slate-700">
                          Clear filters
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <button type="submit" className={btnPrimaryClass} disabled={sending}>
                  {sending ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send Announcement
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>

          {/* Announcements List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-slate-900">Recent Announcements</h2>
                <p className="text-sm text-slate-600 mt-1">
                  {announcements.length} announcement{announcements.length !== 1 ? 's' : ''}
                </p>
              </div>

              {loading ? (
                <div className="p-8 flex justify-center">
                  <Loader className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : announcements.length === 0 ? (
                <div className="p-8 text-center">
                  <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No announcements yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 max-h-200 overflow-y-auto">
                  {announcements.map((announcement) => {
                    const AudienceIcon = getAudienceIcon(announcement.targetAudience);
                    return (
                      <div
                        key={announcement.id}
                        className={`p-4 hover:bg-gray-50 transition-colors border-l-4 ${
                          PRIORITY_COLORS[announcement.priority]
                        }`}
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-slate-900 truncate pr-2">
                              {announcement.title}
                            </h3>
                            <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                              {announcement.content}
                            </p>
                            <div className="flex items-center gap-4 mt-3">
                              <div className="flex items-center gap-1 text-xs text-slate-500">
                                <AudienceIcon className="w-4 h-4" />
                                <span>{getAudienceLabel(announcement)}</span>
                              </div>
                              <div className="flex items-center gap-1 text-xs text-slate-500">
                                <Clock className="w-4 h-4" />
                                <span>
                                  {new Date(announcement.createdAt).toLocaleDateString()} at{' '}
                                  {new Date(announcement.createdAt).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </span>
                              </div>
                              <span
                                className={`px-2 py-1 rounded text-xs font-medium ${
                                  PRIORITY_BADGES[announcement.priority]
                                }`}
                              >
                                {announcement.priority.charAt(0).toUpperCase() + announcement.priority.slice(1)}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDelete(announcement.id)}
                            className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors shrink-0"
                            title="Delete announcement"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementManagement;
