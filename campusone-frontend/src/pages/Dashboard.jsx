import React, { useEffect, useState } from 'react';
import { 
  BookOpen, 
  Users, 
  ClipboardList, 
  TrendingUp,
  Calendar,
  Bell,
  Award,
  Clock
} from 'lucide-react';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(userData);
  }, []);

  const userRole = user?.role?.toLowerCase() || 'student';

  // Dashboard stats based on role
  const getDashboardStats = () => {
    const statsMap = {
      admin: [
        { icon: Users, label: 'Total Users', value: '1,234', color: '#3b82f6' },
        { icon: BookOpen, label: 'Active Courses', value: '56', color: '#06b6d4' },
        { icon: TrendingUp, label: 'Enrollment Rate', value: '89%', color: '#10b981' },
        { icon: Bell, label: 'Pending Issues', value: '12', color: '#f59e0b' }
      ],
      teacher: [
        { icon: BookOpen, label: 'My Courses', value: '4', color: '#3b82f6' },
        { icon: Users, label: 'Total Students', value: '156', color: '#06b6d4' },
        { icon: ClipboardList, label: 'Pending Grading', value: '23', color: '#f59e0b' },
        { icon: Calendar, label: 'Classes This Week', value: '12', color: '#10b981' }
      ],
      student: [
        { icon: BookOpen, label: 'Enrolled Courses', value: '5', color: '#3b82f6' },
        { icon: ClipboardList, label: 'Pending Assignments', value: '3', color: '#f59e0b' },
        { icon: Award, label: 'Average Grade', value: '85%', color: '#10b981' },
        { icon: Clock, label: 'Upcoming Classes', value: '8', color: '#06b6d4' }
      ],
      ta: [
        { icon: BookOpen, label: 'Assigned Courses', value: '2', color: '#3b82f6' },
        { icon: Users, label: 'Students to Assist', value: '78', color: '#06b6d4' },
        { icon: ClipboardList, label: 'Tasks Pending', value: '5', color: '#f59e0b' },
        { icon: Calendar, label: 'Sessions This Week', value: '6', color: '#10b981' }
      ]
    };

    return statsMap[userRole] || statsMap.student;
  };

  const stats = getDashboardStats();

  return (
    <div className="dashboard-page">
      <div className="dashboard-header-section">
        <h1>Welcome back, {user?.name || 'User'}!</h1>
        <p className="dashboard-subtitle">Here's what's happening with your account today.</p>
      </div>

      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className="stat-card">
            <div className="stat-icon" style={{ backgroundColor: `${stat.color}15`, color: stat.color }}>
              <stat.icon size={24} />
            </div>
            <div className="stat-content">
              <p className="stat-label">{stat.label}</p>
              <h3 className="stat-value">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      <div className="dashboard-content-grid">
        <div className="dashboard-card">
          <div className="card-header">
            <h2>Recent Activity</h2>
          </div>
          <div className="card-content">
            <div className="activity-item">
              <div className="activity-icon">
                <BookOpen size={18} />
              </div>
              <div className="activity-details">
                <p className="activity-title">New course material uploaded</p>
                <p className="activity-time">2 hours ago</p>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-icon">
                <ClipboardList size={18} />
              </div>
              <div className="activity-details">
                <p className="activity-title">Assignment deadline approaching</p>
                <p className="activity-time">5 hours ago</p>
              </div>
            </div>
            <div className="activity-item">
              <div className="activity-icon">
                <Bell size={18} />
              </div>
              <div className="activity-details">
                <p className="activity-title">New announcement posted</p>
                <p className="activity-time">1 day ago</p>
              </div>
            </div>
          </div>
        </div>

        <div className="dashboard-card">
          <div className="card-header">
            <h2>Upcoming Events</h2>
          </div>
          <div className="card-content">
            <div className="event-item">
              <div className="event-date">
                <span className="event-day">15</span>
                <span className="event-month">JAN</span>
              </div>
              <div className="event-details">
                <p className="event-title">Data Structures - Midterm Exam</p>
                <p className="event-time">10:00 AM - 12:00 PM</p>
              </div>
            </div>
            <div className="event-item">
              <div className="event-date">
                <span className="event-day">18</span>
                <span className="event-month">JAN</span>
              </div>
              <div className="event-details">
                <p className="event-title">Web Development - Project Submission</p>
                <p className="event-time">11:59 PM</p>
              </div>
            </div>
            <div className="event-item">
              <div className="event-date">
                <span className="event-day">20</span>
                <span className="event-month">JAN</span>
              </div>
              <div className="event-details">
                <p className="event-title">Database Systems - Quiz</p>
                <p className="event-time">2:00 PM - 3:00 PM</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
