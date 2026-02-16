import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  Send,
  Trash2,
  AlertCircle,
  CheckCircle,
  Loader,
  BookOpen,
  Clock,
} from 'lucide-react';
import { announcementAPI, teacherToolsAPI } from '../../utils/api';

const inputClass =
  'w-full py-2.5 px-3.5 border border-gray-200 rounded-lg text-[0.95rem] transition-all focus:outline-none focus:border-blue-500 focus:ring-[3px] focus:ring-blue-500/10';
const labelClass = 'block text-[0.9rem] font-medium text-slate-800 mb-2';
const btnPrimaryClass =
  'inline-flex items-center gap-2 py-2.5 px-5 border-none rounded-lg text-[0.95rem] font-medium cursor-pointer transition-all bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed';

const PRIORITY_BADGES = {
  low: { bg: 'bg-green-100', text: 'text-green-700' },
  medium: { bg: 'bg-blue-100', text: 'text-blue-700' },
  high: { bg: 'bg-red-100', text: 'text-red-700' },
};

const TeacherAnnouncement = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [courseOfferings, setCourseOfferings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form states
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState('medium');
  const [courseId, setCourseId] = useState('');
  const [sending, setSending] = useState(false);

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Get teacher's course offerings
      const offeringRes = await teacherToolsAPI.getMyOfferings();
      setCourseOfferings(offeringRes.data.data || []);

      // Get announcements
      const announcRes = await announcementAPI.getMyAnnouncements();
      setAnnouncements(announcRes.data);

      setError('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load data');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();

    if (!title.trim() || !content.trim() || !courseId) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setSending(true);
      setError('');

      const data = {
        title: title.trim(),
        content: content.trim(),
        priority,
        courseId,
      };

      const res = await announcementAPI.sendCourseAnnouncement(data);

      setSuccess(`✓ Announcement sent to ${res.data.recipientCount} students`);
      setTitle('');
      setContent('');
      setPriority('medium');
      setCourseId('');

      // Reload announcements
      loadData();

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
      loadData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete announcement');
      console.error('Error deleting announcement:', err);
    }
  };

  // Filter announcements created by current teacher
  const myAnnouncements = announcements.filter(
    (ann) => ann.targetAudience === 'specific_course'
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Megaphone className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-slate-900">Announce to Students</h1>
          </div>
          <p className="text-slate-600">Send announcements to your course students</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Send className="w-5 h-5 text-blue-600" />
                New Announcement
              </h2>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-red-700 text-sm">{error}</p>
                </div>
              )}

              {success && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-green-700 text-sm">{success}</p>
                </div>
              )}

              <form onSubmit={handleSend} className="space-y-4">
                <div>
                  <label className={labelClass}>Select Course *</label>
                  <select
                    value={courseId}
                    onChange={(e) => setCourseId(e.target.value)}
                    className={inputClass}
                    disabled={sending || courseOfferings.length === 0}
                  >
                    <option value="">Choose a course</option>
                    {courseOfferings.map((offering) => (
                      <option key={offering._id} value={offering._id}>
                        {offering.courseId?.title || 'Unknown Course'}
                      </option>
                    ))}
                  </select>
                  {courseOfferings.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      You are not teaching any courses this semester
                    </p>
                  )}
                </div>

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

                <button
                  type="submit"
                  className={btnPrimaryClass}
                  disabled={sending || courseOfferings.length === 0}
                >
                  {sending ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Send to Class
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
                <h2 className="text-lg font-semibold text-slate-900">My Announcements</h2>
                <p className="text-sm text-slate-600 mt-1">
                  {myAnnouncements.length} announcement{myAnnouncements.length !== 1 ? 's' : ''}
                </p>
              </div>

              {loading ? (
                <div className="p-8 flex justify-center">
                  <Loader className="w-6 h-6 animate-spin text-blue-600" />
                </div>
              ) : myAnnouncements.length === 0 ? (
                <div className="p-8 text-center">
                  <Megaphone className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No announcements yet</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Create an announcement to send to your students
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 max-h-[800px] overflow-y-auto">
                  {myAnnouncements.map((announcement) => (
                    <div key={announcement._id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 truncate pr-2">
                            {announcement.title}
                          </h3>
                          <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                            {announcement.content}
                          </p>
                          <div className="flex items-center gap-4 mt-3 flex-wrap">
                            {announcement.courseId && (
                              <div className="flex items-center gap-1 text-xs text-slate-500">
                                <BookOpen className="w-4 h-4" />
                                <span>{announcement.courseId.title}</span>
                              </div>
                            )}
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
                              {announcement.priority.charAt(0).toUpperCase() +
                                announcement.priority.slice(1)}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => handleDelete(announcement._id)}
                          className="p-2 hover:bg-red-50 rounded-lg text-red-600 transition-colors flex-shrink-0"
                          title="Delete announcement"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherAnnouncement;
