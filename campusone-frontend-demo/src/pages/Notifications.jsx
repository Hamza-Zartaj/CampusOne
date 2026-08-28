import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Trash2, CheckCheck, Loader2, Filter, Eraser } from 'lucide-react';
import { notificationAPI } from '../utils/api';
import clientLogger from '../utils/clientLogger';
import toast from 'react-hot-toast';

const ICON = {
  ANNOUNCEMENT: '📢',
  ASSIGNMENT_NEW: '📝',
  ASSIGNMENT_GRADED: '✅',
  QUIZ_NEW: '❓',
  QUIZ_GRADED: '🎯',
  QNA_NEW: '💬',
  QNA_REPLY: '💬',
  ATTENDANCE_LOW: '⚠️',
  ADMISSION_STATUS: '🎓',
  GENERAL: '🔔',
};

const TYPE_LABEL = {
  ANNOUNCEMENT: 'Announcement',
  ASSIGNMENT_NEW: 'New Assignment',
  ASSIGNMENT_GRADED: 'Assignment Graded',
  QUIZ_NEW: 'New Quiz',
  QUIZ_GRADED: 'Quiz Graded',
  QNA_NEW: 'Q&A Question',
  QNA_REPLY: 'Q&A Reply',
  ATTENDANCE_LOW: 'Attendance Alert',
  ADMISSION_STATUS: 'Admission',
  GENERAL: 'General',
};

const fmtRelative = (d) => {
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(d).toLocaleDateString();
};

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all | unread | read
  const [typeFilter, setTypeFilter] = useState('');
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationAPI.getAll({ limit: 200 });
      setNotifications(res.data.data || []);
    } catch (err) {
      clientLogger.warn('Failed to load notifications page', err);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleClick = async (n) => {
    if (!n.isRead) {
      try {
        await notificationAPI.markRead(n.id);
        setNotifications((arr) => arr.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      } catch (err) {
        clientLogger.warn('Failed to mark notification as read', err);
      }
    }
    if (n.linkUrl) navigate(n.linkUrl);
  };

  const handleMarkRead = async (e, id) => {
    e.stopPropagation();
    try {
      await notificationAPI.markRead(id);
      setNotifications((arr) => arr.map((x) => (x.id === id ? { ...x, isRead: true } : x)));
    } catch (err) {
      clientLogger.warn('Failed to mark notification as read', err);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      await notificationAPI.delete(id);
      setNotifications((arr) => arr.filter((x) => x.id !== id));
    } catch (err) {
      clientLogger.warn('Failed to delete notification', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllRead();
      setNotifications((arr) => arr.map((x) => ({ ...x, isRead: true })));
      toast.success('All marked as read');
    } catch {
      toast.error('Failed');
    }
  };

  const handleClearRead = async () => {
    if (!window.confirm('Delete all read notifications?')) return;
    try {
      const res = await notificationAPI.clearRead();
      setNotifications((arr) => arr.filter((x) => !x.isRead));
      toast.success(`Cleared ${res.data.count} notifications`);
    } catch {
      toast.error('Failed');
    }
  };

  const filtered = notifications.filter((n) => {
    if (filter === 'unread' && n.isRead) return false;
    if (filter === 'read' && !n.isRead) return false;
    if (typeFilter && n.type !== typeFilter) return false;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.isRead).length;
  const types = [...new Set(notifications.map((n) => n.type))];

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-slate-900 m-0">Notifications</h1>
            <p className="text-slate-600 m-0">{unreadCount} unread of {notifications.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-6 flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-100 rounded-lg p-1">
            {['all', 'unread', 'read'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-sm rounded-md transition-colors ${filter === f ? 'bg-white text-blue-700 shadow-sm font-medium' : 'text-slate-600 hover:text-slate-800'}`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="py-2 px-3 border border-slate-200 rounded-lg text-sm">
            <option value="">All types</option>
            {types.map((t) => (
              <option key={t} value={t}>{TYPE_LABEL[t] || t}</option>
            ))}
          </select>

          <div className="flex-1" />

          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg">
              <CheckCheck size={14} /> Mark all read
            </button>
          )}
          {notifications.some((n) => n.isRead) && (
            <button onClick={handleClearRead} className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg">
              <Eraser size={14} /> Clear read
            </button>
          )}
        </div>

        {loading ? (
          <div className="text-center py-20"><Loader2 className="animate-spin inline w-8 h-8 text-blue-600" /></div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
            <Bell className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 m-0">No notifications</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((n) => (
              <div
                key={n.id}
                onClick={() => handleClick(n)}
                className={`group bg-white rounded-xl shadow-sm border p-4 cursor-pointer hover:shadow-md transition-all flex gap-3 ${
                  !n.isRead ? 'border-blue-200 bg-blue-50/30' : 'border-slate-200'
                }`}
              >
                <div className="text-3xl shrink-0 leading-none">{ICON[n.type] || '🔔'}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`m-0 ${!n.isRead ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                          {n.title}
                        </p>
                        <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded uppercase font-medium">
                          {TYPE_LABEL[n.type] || n.type}
                        </span>
                        {!n.isRead && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
                      </div>
                      {n.body && <p className="text-sm text-slate-600 mt-1 m-0">{n.body}</p>}
                      <p className="text-xs text-slate-400 mt-1.5 m-0">{fmtRelative(n.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {!n.isRead && (
                        <button onClick={(e) => handleMarkRead(e, n.id)} className="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded" title="Mark as read">
                          <Check size={14} />
                        </button>
                      )}
                      <button onClick={(e) => handleDelete(e, n.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Notifications;
