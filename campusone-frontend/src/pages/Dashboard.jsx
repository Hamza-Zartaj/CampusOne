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
    <div className="max-w-[1400px] mx-auto">
      {/* Header Section */}
      <div className="mb-8">
        <h1 className="text-[32px] font-bold text-slate-800 m-0 mb-2 max-md:text-2xl max-sm:text-xl">
          Welcome back, {user?.name || 'User'}!
        </h1>
        <p className="text-base text-slate-500 m-0">
          Here's what's happening with your account today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-5 mb-8 max-md:grid-cols-[repeat(auto-fit,minmax(200px,1fr))] max-md:gap-4 max-sm:grid-cols-1">
        {stats.map((stat, index) => (
          <div 
            key={index} 
            className="bg-white rounded-2xl p-6 flex items-center gap-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md max-md:p-5"
          >
            <div 
              className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${stat.color}15`, color: stat.color }}
            >
              <stat.icon size={24} />
            </div>
            <div className="flex-1">
              <p className="text-sm text-slate-500 m-0 mb-1 font-medium">{stat.label}</p>
              <h3 className="text-[28px] font-bold text-slate-800 m-0 max-md:text-2xl">
                {stat.value}
              </h3>
            </div>
          </div>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(400px,1fr))] gap-6 max-lg:grid-cols-1 max-md:gap-4">
        {/* Recent Activity Card */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="py-5 px-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-slate-800 m-0">Recent Activity</h2>
          </div>
          <div className="py-4 px-6 pb-6">
            {[
              { icon: BookOpen, title: 'New course material uploaded', time: '2 hours ago' },
              { icon: ClipboardList, title: 'Assignment deadline approaching', time: '5 hours ago' },
              { icon: Bell, title: 'New announcement posted', time: '1 day ago' }
            ].map((activity, index) => (
              <div 
                key={index} 
                className={`flex items-start gap-3 py-3 ${index !== 2 ? 'border-b border-slate-100' : ''}`}
              >
                <div className="w-9 h-9 rounded-lg bg-gradient-secondary text-white flex items-center justify-center shrink-0">
                  <activity.icon size={18} />
                </div>
                <div className="flex-1">
                  <p className="text-sm text-slate-800 font-medium m-0 mb-1">{activity.title}</p>
                  <p className="text-[13px] text-slate-400 m-0">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Events Card */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="py-5 px-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-slate-800 m-0">Upcoming Events</h2>
          </div>
          <div className="py-4 px-6 pb-6">
            {[
              { day: '15', month: 'JAN', title: 'Data Structures - Midterm Exam', time: '10:00 AM - 12:00 PM' },
              { day: '18', month: 'JAN', title: 'Web Development - Project Submission', time: '11:59 PM' },
              { day: '20', month: 'JAN', title: 'Database Systems - Quiz', time: '2:00 PM - 3:00 PM' }
            ].map((event, index) => (
              <div 
                key={index} 
                className={`flex items-center gap-4 py-4 ${index !== 2 ? 'border-b border-slate-100' : ''}`}
              >
                <div className="w-[60px] h-[60px] rounded-xl bg-gradient-secondary text-white flex flex-col items-center justify-center shrink-0">
                  <span className="text-2xl font-bold leading-none">{event.day}</span>
                  <span className="text-xs font-semibold mt-0.5">{event.month}</span>
                </div>
                <div className="flex-1">
                  <p className="text-[15px] text-slate-800 font-semibold m-0 mb-1">{event.title}</p>
                  <p className="text-[13px] text-slate-500 m-0">{event.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
