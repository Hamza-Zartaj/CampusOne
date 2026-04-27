import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ClipboardList,
  MessageSquare,
  Bell,
  UserCheck,
  FileText
} from 'lucide-react';

const TeacherDashboard = () => {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(userData);
  }, []);

  const quickLinks = [
    { icon: UserCheck, label: 'Attendance', path: '/teacher/attendance', color: '#3b82f6' },
    { icon: ClipboardList, label: 'Assignments', path: '/teacher/assignments', color: '#10b981' },
    { icon: FileText, label: 'Quizzes', path: '/teacher/quizzes', color: '#f59e0b' },
    { icon: MessageSquare, label: 'Q&A Forum', path: '/teacher/qna', color: '#8b5cf6' },
    { icon: Bell, label: 'Announcements', path: '/teacher/announcements', color: '#ef4444' },
  ];

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[32px] font-bold text-slate-800 m-0 mb-2 max-md:text-2xl max-sm:text-xl">
          Welcome back, {user?.name || 'Teacher'}!
        </h1>
        <p className="text-base text-slate-500 m-0">
          Here's your teacher portal.
        </p>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-5 max-sm:grid-cols-1">
        {quickLinks.map((link, index) => (
          <div
            key={index}
            onClick={() => navigate(link.path)}
            className="bg-white rounded-2xl p-6 flex items-center gap-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md cursor-pointer"
          >
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${link.color}15`, color: link.color }}
            >
              <link.icon size={24} />
            </div>
            <div className="flex-1">
              <p className="text-base font-semibold text-slate-800 m-0">{link.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeacherDashboard;
