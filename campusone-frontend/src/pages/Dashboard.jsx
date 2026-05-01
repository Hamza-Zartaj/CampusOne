import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, GraduationCap, Briefcase, Shield, FileText, Building2,
  BookOpen, Layers, MessageSquare, Activity, TrendingUp, ArrowRight,
  Megaphone, AlertCircle, Loader2, ChevronRight,
} from 'lucide-react';
import { dashboardAPI } from '../utils/api';
import { hasPermission } from '../utils/permissions';
import toast from 'react-hot-toast';

const fmtRelative = (d) => {
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const StatCard = ({ icon: Icon, label, value, sub, color, link }) => {
  const card = (
    <div className={`bg-white rounded-xl shadow-sm border border-slate-200 p-5 ${link ? 'hover:shadow-md hover:border-blue-300 cursor-pointer transition-all' : ''}`}>
      <div className="flex items-start justify-between mb-2">
        <div className={`p-2 rounded-lg ${color}`}><Icon className="w-5 h-5 text-white" /></div>
        {link && <ChevronRight size={16} className="text-slate-300" />}
      </div>
      <div className="text-3xl font-bold text-slate-900">{value}</div>
      <div className="text-sm text-slate-600">{label}</div>
      {sub && <div className="text-xs text-slate-400 mt-1">{sub}</div>}
    </div>
  );
  return link ? <Link to={link}>{card}</Link> : card;
};

const PRIORITY_COLOR = {
  high: 'bg-red-100 text-red-700',
  medium: 'bg-blue-100 text-blue-700',
  low: 'bg-green-100 text-green-700',
};

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    dashboardAPI.admin()
      .then((r) => setData(r.data.data))
      .catch(() => toast.error('Failed to load dashboard'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin w-8 h-8 text-blue-600" /></div>;
  if (!data) return <div className="p-6 text-center text-slate-500">Failed to load dashboard</div>;

  const { stats, recentAdmissions, recentAnnouncements, recentAuditLogs } = data;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 m-0">Welcome back, {user.name?.split(' ')[0] || 'Admin'} 👋</h1>
          <p className="text-slate-600 m-0">Here's what's happening across CampusOne today</p>
        </div>

        {/* Stat cards — gated by permissions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {hasPermission('manage_users') && (
            <StatCard icon={Users} label="Total Users" value={stats.totalUsers} sub={`${stats.newSignupsThisWeek} new this week`} color="bg-blue-500" link="/admin/users" />
          )}
          {hasPermission('manage_admissions') && (
            <StatCard icon={FileText} label="Pending Admissions" value={stats.pendingAdmissions} sub="Awaiting review" color="bg-amber-500" link="/admin/admissions" />
          )}
          {hasPermission('manage_offerings') && (
            <StatCard icon={Layers} label="Active Offerings" value={stats.activeOfferings} sub="Course sections" color="bg-purple-500" link="/admin/offerings" />
          )}
          {hasPermission('view_reports') && (
            <StatCard icon={MessageSquare} label="Open Q&A" value={stats.openQna} sub="Threads needing replies" color="bg-cyan-500" />
          )}
        </div>

        {hasPermission('manage_users') && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard icon={GraduationCap} label="Students" value={stats.students} color="bg-green-500" />
            <StatCard icon={Briefcase} label="Teachers" value={stats.teachers} color="bg-blue-500" />
            <StatCard icon={Shield} label="Admins" value={stats.admins} color="bg-slate-600" />
            {hasPermission('view_audit_logs') && (
              <StatCard icon={Activity} label="Audit Activity (24h)" value={stats.auditLast24h} color="bg-indigo-500" link="/admin/audit-logs" />
            )}
          </div>
        )}

        {hasPermission('manage_academic') && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
            <StatCard icon={Building2} label="Departments" value={stats.departments} color="bg-orange-500" link="/admin/academic/departments" />
            <StatCard icon={TrendingUp} label="Programs" value={stats.programs} color="bg-pink-500" link="/admin/academic/programs" />
            <StatCard icon={BookOpen} label="Courses" value={stats.courses} color="bg-teal-500" link="/admin/academic/courses" />
          </div>
        )}

        {/* Two-column widgets */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Admissions */}
          {hasPermission('manage_admissions') && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800 m-0 flex items-center gap-2">
                <FileText size={18} className="text-amber-500" /> Recent Admissions
              </h2>
              <Link to="/admin/admissions" className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1">
                View all <ArrowRight size={14} />
              </Link>
            </div>
            {recentAdmissions.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6 m-0">No pending admissions</p>
            ) : (
              <div className="space-y-2">
                {recentAdmissions.map((a) => (
                  <Link
                    key={a.id} to="/admin/admissions"
                    className="block p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800 m-0">{a.fullName}</p>
                        <p className="text-xs text-slate-500 m-0">
                          {a.applicationNumber} · {a.program}
                        </p>
                      </div>
                      <span className="text-xs text-slate-400 flex-shrink-0">{fmtRelative(a.applicationDate)}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          )}

          {/* Recent Announcements */}
          {hasPermission('manage_announcements') && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800 m-0 flex items-center gap-2">
                <Megaphone size={18} className="text-blue-500" /> Recent Announcements
              </h2>
              <Link to="/admin/announcements" className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1">
                View all <ArrowRight size={14} />
              </Link>
            </div>
            {recentAnnouncements.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6 m-0">No announcements yet</p>
            ) : (
              <div className="space-y-2">
                {recentAnnouncements.map((a) => (
                  <div key={a.id} className="p-3 rounded-lg border border-slate-100">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-slate-800 m-0 flex-1">{a.title}</p>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${PRIORITY_COLOR[a.priority] || 'bg-slate-100'}`}>
                        {a.priority}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 m-0">
                      To {a.targetAudience} · {fmtRelative(a.createdAt)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
          )}

          {/* Audit Log */}
          {hasPermission('view_audit_logs') && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-slate-800 m-0 flex items-center gap-2">
                <Activity size={18} className="text-indigo-500" /> Recent Activity
              </h2>
              <Link to="/admin/audit-logs" className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1">
                View all <ArrowRight size={14} />
              </Link>
            </div>
            {recentAuditLogs.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6 m-0">No recent activity</p>
            ) : (
              <div className="space-y-1">
                {recentAuditLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-slate-50 rounded">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="text-xs px-2 py-0.5 rounded font-mono bg-slate-100 text-slate-600 flex-shrink-0">{log.category}</span>
                      <p className="text-sm text-slate-700 m-0 truncate">{log.description || log.action}</p>
                    </div>
                    <span className="text-xs text-slate-400 flex-shrink-0">{log.performedByRole} · {fmtRelative(log.createdAt)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
