import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard,
  BookOpen,
  Users,
  Calendar,
  ClipboardList,
  MessageSquare,
  Bell,
  Settings,
  FileText,
  GraduationCap,
  UserCheck,
  BarChart,
  UserPlus
} from 'lucide-react';

const Sidebar = ({ isOpen }) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = user.role?.toLowerCase() || 'student';

  // Navigation items based on user role
  const getNavigationItems = () => {
    const commonItems = [
      { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { path: '/notifications', icon: Bell, label: 'Notifications' },
      { path: '/settings', icon: Settings, label: 'Settings' }
    ];

    const roleSpecificItems = {
      admin: [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/users', icon: Users, label: 'Users' },
        { path: '/admissions', icon: UserPlus, label: 'Admissions' },
        { path: '/courses', icon: BookOpen, label: 'Courses' },
        { path: '/announcements', icon: Bell, label: 'Announcements' },
        { path: '/reports', icon: BarChart, label: 'Reports' },
        { path: '/settings', icon: Settings, label: 'Settings' }
      ],
      teacher: [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/courses', icon: BookOpen, label: 'My Courses' },
        { path: '/attendance', icon: UserCheck, label: 'Attendance' },
        { path: '/assignments', icon: ClipboardList, label: 'Assignments' },
        { path: '/quizzes', icon: FileText, label: 'Quizzes' },
        { path: '/qna', icon: MessageSquare, label: 'Q&A Forum' },
        { path: '/notifications', icon: Bell, label: 'Notifications' },
        { path: '/settings', icon: Settings, label: 'Settings' }
      ],
      student: [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/courses', icon: BookOpen, label: 'My Courses' },
        { path: '/attendance', icon: Calendar, label: 'Attendance' },
        { path: '/assignments', icon: ClipboardList, label: 'Assignments' },
        { path: '/quizzes', icon: FileText, label: 'Quizzes' },
        { path: '/qna', icon: MessageSquare, label: 'Q&A Forum' },
        { path: '/notifications', icon: Bell, label: 'Notifications' },
        { path: '/settings', icon: Settings, label: 'Settings' }
      ],
      ta: [
        { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { path: '/courses', icon: BookOpen, label: 'Courses' },
        { path: '/attendance', icon: UserCheck, label: 'Attendance' },
        { path: '/assignments', icon: ClipboardList, label: 'Assignments' },
        { path: '/qna', icon: MessageSquare, label: 'Q&A Forum' },
        { path: '/notifications', icon: Bell, label: 'Notifications' },
        { path: '/settings', icon: Settings, label: 'Settings' }
      ]
    };

    return roleSpecificItems[userRole] || commonItems;
  };

  const navigationItems = getNavigationItems();

  return (
    <aside 
      className={`
        w-[260px] bg-white shadow-sm transition-all duration-300 overflow-hidden z-50
        max-md:fixed max-md:left-0 max-md:top-[60px] max-md:bottom-0 max-md:z-[999]
        ${isOpen ? 'translate-x-0' : 'max-md:-translate-x-full md:w-[70px]'}
      `}
    >
      <nav className="py-5">
        <ul className="list-none p-0 m-0">
          {navigationItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) => `
                  flex items-center gap-3 py-3.5 px-6 text-slate-500 no-underline transition-colors text-[15px] font-medium relative
                  before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-gradient-secondary before:scale-y-0 before:transition-transform
                  hover:bg-slate-50 hover:text-primary-500
                  ${isActive ? 'text-primary-500 bg-primary-50 before:scale-y-100' : ''}
                `}
              >
                <item.icon size={20} className="shrink-0 transition-colors" />
                <span className={`whitespace-nowrap transition-all ${!isOpen ? 'md:opacity-0 md:w-0 md:overflow-hidden' : ''}`}>
                  {item.label}
                </span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
