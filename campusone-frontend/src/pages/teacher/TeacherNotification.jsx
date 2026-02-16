import { useState, useEffect } from 'react';
import api from '../../utils/api';
import toast from 'react-hot-toast';
import './../../styles/Notification.css';

export default function TeacherNotification() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await api.get('/announcements');
      setAnnouncements(response.data);
    } catch (error) {
      console.error('Error fetching announcements:', error);
      toast.error('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return '#dc3545';
      case 'medium':
        return '#ffc107';
      case 'low':
        return '#28a745';
      default:
        return '#6c757d';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const filteredAnnouncements = announcements.filter((ann) => {
    if (filter === 'high') return ann.priority === 'high';
    if (filter === 'course') return ann.targetAudience === 'specific_course';
    return true;
  });

  if (loading) {
    return (
      <div className="notification-container">
        <div className="notification-loading">Loading notifications...</div>
      </div>
    );
  }

  return (
    <div className="notification-container">
      <div className="notification-header">
        <h1>Notifications</h1>
      </div>

      <div className="notification-controls">
        <div className="filter-buttons">
          <button
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={`filter-btn ${filter === 'high' ? 'active' : ''}`}
            onClick={() => setFilter('high')}
          >
            High Priority
          </button>
          <button
            className={`filter-btn ${filter === 'course' ? 'active' : ''}`}
            onClick={() => setFilter('course')}
          >
            Course Announcements
          </button>
        </div>
      </div>

      <div className="notification-list">
        {filteredAnnouncements.length === 0 ? (
          <div className="notification-empty">
            <p>No notifications yet</p>
          </div>
        ) : (
          filteredAnnouncements.map((announcement) => (
            <div key={announcement._id} className="notification-card">
              <div className="notification-card-header">
                <div className="notification-card-title">
                  <h3>{announcement.title}</h3>
                  <span
                    className="priority-badge"
                    style={{ backgroundColor: getPriorityColor(announcement.priority) }}
                  >
                    {announcement.priority}
                  </span>
                </div>
                <span className="notification-time">{formatDate(announcement.createdAt)}</span>
              </div>

              <div className="notification-card-body">
                <p>{announcement.content}</p>
              </div>

              <div className="notification-card-footer">
                <span className="notification-sender">
                  From: {announcement.createdBy?.name}
                </span>
                {announcement.courseId && (
                  <span className="notification-course">
                    Course: {announcement.courseId.title}
                  </span>
                )}
                <span className="notification-audience">
                  Target: {announcement.targetAudience.replace('_', ' ')}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
