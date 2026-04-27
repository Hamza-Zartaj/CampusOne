import { Users, BookOpen, Shield } from 'lucide-react';

export const AVAILABLE_PERMISSIONS = [
  { id: 'manage_users', label: 'Manage Users' },
  { id: 'manage_courses', label: 'Manage Courses' },
  { id: 'manage_attendance', label: 'Manage Attendance' },
  { id: 'manage_announcements', label: 'Manage Announcements' }
];

export const TEACHER_DESIGNATIONS = [
  'Professor',
  'Assistant Professor',
  'Lecturer'
];

export const UI_CLASSES = {
  input: "w-full py-2.5 px-3.5 border border-gray-200 rounded-lg text-[0.95rem] transition-all focus:outline-none focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10",
  label: "block text-[0.9rem] font-medium text-slate-800 mb-2",
  btnPrimary: "inline-flex items-center gap-2 py-2.5 px-5 border-none rounded-lg text-[0.95rem] font-medium cursor-pointer transition-all bg-gradient-primary text-white hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(59,130,246,0.3)] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none",
  btnSecondary: "inline-flex items-center gap-2 py-2.5 px-5 border border-gray-200 rounded-lg text-[0.95rem] font-medium cursor-pointer transition-all bg-white text-slate-800 hover:bg-slate-50 hover:border-gray-300"
};

export const getRoleStats = (stats, isSuperAdmin) => {
  const allRoleStats = [
    {
      icon: Shield,
      label: 'Admins',
      value: stats.admins,
      color: '#ef4444',
      gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      superAdminOnly: true,
      role: 'admin'
    },
    {
      icon: BookOpen,
      label: 'Teachers',
      value: stats.teachers,
      color: '#3b82f6',
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      role: 'teacher'
    },
    {
      icon: Users,
      label: 'Students',
      value: stats.students,
      color: '#10b981',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
      role: 'student'
     }
  ];

  return allRoleStats.filter(stat => !stat.superAdminOnly || isSuperAdmin);
};
