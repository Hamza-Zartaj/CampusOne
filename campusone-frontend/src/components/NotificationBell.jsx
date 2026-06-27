import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bell, Check, Trash2, X } from 'lucide-react';
import { notificationAPI } from '../utils/api';
import { getSocket } from '../utils/socket';
import clientLogger from '../utils/clientLogger';

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

const fmtRelative = (d) => {
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(d).toLocaleDateString();
};

const NotificationBell = () => {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const role = user.role;
  const notifPath = role === 'admin' ? '/admin/notifications' : role === 'teacher' ? '/teacher/notifications' : '/student/notifications';

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await notificationAPI.getUnreadCount();
      setUnreadCount(res.data.count || 0);
    } catch (err) {
      clientLogger.warn('Failed to fetch unread notification count', err);
    }
  }, []);

  // Initial count + socket-driven live updates (with a 2-min safety poll for reconnect gaps)
  useEffect(() => {
    fetchUnreadCount();
    const socket = getSocket();
    const onNew = () => {
      setUnreadCount((c) => c + 1);
      if (open) loadNotifications();
    };
    if (socket) socket.on('notification:new', onNew);
    const t = setInterval(fetchUnreadCount, 120_000);
    return () => {
      if (socket) socket.off('notification:new', onNew);
      clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchUnreadCount, open]);

  // Load notifications when dropdown opens
  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await notificationAPI.getAll({ limit: 10 });
      setNotifications(res.data.data || []);
    } catch (err) {
      clientLogger.warn('Failed to load notifications', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) loadNotifications();
  }, [open, loadNotifications]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleClick = async (n) => {
    if (!n.isRead) {
      try {
        await notificationAPI.markRead(n.id);
        setUnreadCount((c) => Math.max(0, c - 1));
        setNotifications((arr) => arr.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)));
      } catch (err) {
        clientLogger.warn('Failed to mark notification as read', err);
      }
    }
    setOpen(false);
    if (n.linkUrl) navigate(n.linkUrl);
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllRead();
      setUnreadCount(0);
      setNotifications((arr) => arr.map((x) => ({ ...x, isRead: true })));
    } catch (err) {
      clientLogger.warn('Failed to mark all notifications as read', err);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      await notificationAPI.delete(id);
      setNotifications((arr) => arr.filter((x) => x.id !== id));
      fetchUnreadCount();
    } catch (err) {
      clientLogger.warn('Failed to delete notification', err);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="relative bg-transparent border-none text-white cursor-pointer p-2 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10"
        aria-label="Notifications"
      >
        <Bell size={22} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-4.5 h-4.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute top-[calc(100%+8px)] right-0 bg-white rounded-xl shadow-lg w-95 max-h-125 overflow-hidden z-100 flex flex-col">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-800 m-0">Notifications</h3>
              <p className="text-xs text-slate-500 m-0">{unreadCount} unread</p>
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button onClick={handleMarkAllRead} className="text-xs text-blue-600 hover:underline px-2">
                  Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-slate-100 text-slate-400"><X size={16} /></button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-6 text-center text-slate-500 text-sm">Loading…</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-500">
                <Bell className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="text-sm m-0">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`group p-3 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors flex gap-3 ${
                    !n.isRead ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <div className="text-2xl shrink-0 leading-none">{ICON[n.type] || '🔔'}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={`text-sm m-0 ${!n.isRead ? 'font-semibold text-slate-900' : 'text-slate-700'}`}>
                        {n.title}
                      </p>
                      <button
                        onClick={(e) => handleDelete(e, n.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition"
                        aria-label="Delete"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                    {n.body && <p className="text-xs text-slate-600 mt-1 m-0 line-clamp-2">{n.body}</p>}
                    <p className="text-[11px] text-slate-400 mt-1 m-0">{fmtRelative(n.createdAt)}</p>
                  </div>
                  {!n.isRead && <div className="w-2 h-2 bg-blue-500 rounded-full shrink-0 mt-2" />}
                </div>
              ))
            )}
          </div>

          <div className="p-3 border-t border-slate-100 text-center">
            <Link
              to={notifPath}
              onClick={() => setOpen(false)}
              className="text-sm text-blue-600 hover:underline"
            >
              View all
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
