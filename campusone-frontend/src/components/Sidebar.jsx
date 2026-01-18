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
import '../styles/Sidebar.css';

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
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <nav className="sidebar-nav">
        <ul className="nav-list">
          {navigationItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) => 
                  `nav-item ${isActive ? 'active' : ''}`
                }
              >
                <item.icon size={20} className="nav-icon" />
                <span className="nav-label">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
