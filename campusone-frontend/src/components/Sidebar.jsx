import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { taAPI } from '../utils/api';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  MessageSquare,
  Bell,
  FileText,
  UserCheck,
  UserPlus,
  BookOpen,
  GraduationCap,
  Calendar,
  Award,
  BookMarked,
  Building2,
  Layers,
  CalendarDays,
  ScrollText,
  PenLine,
  ShieldCheck,
  CalendarOff,
  GraduationCap as GradCapIcon,
  Settings2,
  DoorOpen,
  CalendarX,
} from 'lucide-react';

const NAV_LABEL_CLASS = 'text-[10px] font-semibold uppercase tracking-wider text-slate-400 px-6 pt-4 pb-1 select-none';

const Sidebar = ({ isOpen }) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = user.role?.toLowerCase() || 'student';
  const isSuperAdmin = !!user.isSuperAdmin;
  const userPerms = Array.isArray(user.permissions) ? user.permissions : [];
  const can = (perm) => isSuperAdmin || userPerms.includes(perm);

  const [taActive, setTaActive] = useState([]);
  useEffect(() => {
    if (userRole !== 'student') return;
    taAPI.getMyActive()
      .then((r) => setTaActive(r.data.data || []))
      .catch(() => setTaActive([]));
  }, [userRole]);
  const hasActiveTA = taActive.length > 0;

  const adminItemsRaw = [
    { path: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/admin/users', icon: Users, label: 'Users', perm: 'manage_users' },
    { path: '/admin/admissions', icon: UserPlus, label: 'Admissions', perm: 'manage_admissions' },
    { path: '/admin/announcements', icon: Bell, label: 'Announcements', perm: 'manage_announcements' },
    { label: null, group: 'Academic Setup', anyPerm: ['manage_academic', 'manage_offerings'] },
    { path: '/admin/academic/departments', icon: Building2, label: 'Departments', perm: 'manage_academic' },
    { path: '/admin/academic/programs', icon: GraduationCap, label: 'Programs', perm: 'manage_academic' },
    { path: '/admin/academic/courses', icon: BookMarked, label: 'Courses', perm: 'manage_academic' },
    { path: '/admin/academic/terms', icon: Calendar, label: 'Terms', perm: 'manage_academic' },
    { path: '/admin/academic/offerings', icon: Layers, label: 'Offerings', perm: 'manage_offerings' },
    { path: '/admin/academic/enrollments', icon: ClipboardList, label: 'Enrollments', perm: 'manage_offerings' },
    { path: '/admin/ta-oversight', icon: GradCapIcon, label: 'TA Oversight', perm: 'manage_offerings' },
    { label: null, group: 'Schedule', anyPerm: ['manage_academic'] },
    { path: '/admin/schedule/config', icon: Settings2, label: 'Master Schedule', perm: 'manage_academic' },
    { path: '/admin/schedule/rooms', icon: DoorOpen, label: 'Rooms', perm: 'manage_academic' },
    { path: '/admin/schedule/holidays', icon: CalendarX, label: 'Holidays', perm: 'manage_academic' },
    { label: null, group: 'System', anyPerm: ['view_audit_logs'] },
    { path: '/admin/audit-logs', icon: ShieldCheck, label: 'Audit Logs', perm: 'view_audit_logs' },
  ];

  // Filter out items the admin doesn't have permission for, and drop section headers
  // whose section has no remaining visible items.
  const adminItems = (() => {
    const visible = adminItemsRaw.filter((item) => !item.perm || can(item.perm));
    return visible.filter((item, idx) => {
      if (item.label !== null) return true;
      // section header: keep only if at least one following non-header has a visible link before next header
      for (let j = idx + 1; j < visible.length; j++) {
        if (visible[j].label === null) return false;
        if (visible[j].path) return true;
      }
      return false;
    });
  })();

  const teacherItems = [
    { path: '/teacher/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { label: null, group: 'Teaching' },
    { path: '/teacher/offerings', icon: BookOpen, label: 'My Offerings' },
    { path: '/teacher/attendance', icon: UserCheck, label: 'Attendance' },
    { path: '/teacher/assignments', icon: ClipboardList, label: 'Assignments' },
    { path: '/teacher/quizzes', icon: FileText, label: 'Quizzes' },
    { path: '/teacher/qna', icon: MessageSquare, label: 'Q&A Forum' },
    { path: '/teacher/leave-applications', icon: CalendarOff, label: 'Leave Applications' },
    { path: '/teacher/ta-applications', icon: GradCapIcon, label: 'TA Applications' },
    { label: null, group: 'Other' },
    { path: '/teacher/announcements', icon: Bell, label: 'Announcements' },
    { path: '/teacher/notification', icon: Bell, label: 'Notifications' },
  ];

  const studentItems = [
    { path: '/student/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { label: null, group: 'Academic' },
    { path: '/student/courses', icon: BookOpen, label: 'My Courses' },
    { path: '/student/registration', icon: PenLine, label: 'Registration' },
    { path: '/student/timetable', icon: CalendarDays, label: 'Timetable' },
    { path: '/student/transcript', icon: ScrollText, label: 'Transcript' },
    ...(hasActiveTA
      ? [{ label: null, group: 'TA Duties' }, { path: '/student/ta', icon: GradCapIcon, label: 'My TA Assignments' }]
      : []),
    { label: null, group: 'To Do' },
    { path: '/student/assignments', icon: ClipboardList, label: 'Assignments' },
    { path: '/student/quizzes', icon: FileText, label: 'Quizzes' },
    { path: '/student/qna', icon: MessageSquare, label: 'Q&A Forum' },
    { path: '/student/leave-status', icon: CalendarOff, label: 'Leave Status' },
    ...(hasActiveTA ? [] : [{ path: '/student/ta', icon: GradCapIcon, label: 'TA Program' }]),
    { path: '/student/notification', icon: Bell, label: 'Notifications' },
  ];

  const items = { admin: adminItems, teacher: teacherItems, student: studentItems }[userRole] || studentItems;

  return (
    <aside
      className={`
        w-sidebar-width bg-white shadow-sm transition-all duration-300 overflow-hidden z-50
        max-md:fixed max-md:left-0 max-md:top-15 max-md:bottom-0 max-md:z-999
        ${isOpen ? 'translate-x-0' : 'max-md:-translate-x-full md:w-[70px]'}
      `}
    >
      <nav className="py-5 overflow-y-auto h-full">
        <ul className="list-none p-0 m-0">
          {items.map((item, idx) => {
            if (item.label === null) {
              return isOpen ? (
                <li key={idx} className={NAV_LABEL_CLASS}>{item.group}</li>
              ) : null;
            }
            const Icon = item.icon;
            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  className={({ isActive }) => `
                    flex items-center gap-3 py-3 px-6 text-slate-500 no-underline transition-colors text-[14px] font-medium relative
                    before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-gradient-secondary before:scale-y-0 before:transition-transform
                    hover:bg-slate-50 hover:text-primary-500
                    ${isActive ? 'text-primary-500 bg-primary-50 before:scale-y-100' : ''}
                  `}
                >
                  <Icon size={19} className="shrink-0 transition-colors" />
                  <span className={`whitespace-nowrap transition-all ${!isOpen ? 'md:opacity-0 md:w-0 md:overflow-hidden' : ''}`}>
                    {item.label}
                  </span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;
