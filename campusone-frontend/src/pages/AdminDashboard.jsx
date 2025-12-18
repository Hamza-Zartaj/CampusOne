import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-blue-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="mt-2 text-sky-50">Welcome back, {user?.name}!</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-slate-500 text-sm font-medium">Total Users</h3>
            <p className="text-3xl font-bold text-blue-900 mt-2">0</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-slate-500 text-sm font-medium">Total Courses</h3>
            <p className="text-3xl font-bold text-blue-900 mt-2">0</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-slate-500 text-sm font-medium">Active Students</h3>
            <p className="text-3xl font-bold text-blue-900 mt-2">0</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-slate-500 text-sm font-medium">Active Teachers</h3>
            <p className="text-3xl font-bold text-blue-900 mt-2">0</p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link
            to="/admin/users"
            className="bg-white border-2 border-slate-200 rounded-lg p-6 hover:border-blue-500 hover:shadow-lg transition"
          >
            <h3 className="font-semibold text-slate-800 text-lg mb-2">User Management</h3>
            <p className="text-sm text-slate-500">Manage students, teachers, TAs, and admins</p>
          </Link>
          <Link
            to="/admin/courses"
            className="bg-white border-2 border-slate-200 rounded-lg p-6 hover:border-blue-500 hover:shadow-lg transition"
          >
            <h3 className="font-semibold text-slate-800 text-lg mb-2">Course Management</h3>
            <p className="text-sm text-slate-500">Create and manage courses</p>
          </Link>
          <Link
            to="/admin/reports"
            className="bg-white border-2 border-slate-200 rounded-lg p-6 hover:border-blue-500 hover:shadow-lg transition"
          >
            <h3 className="font-semibold text-slate-800 text-lg mb-2">Reports</h3>
            <p className="text-sm text-slate-500">View system analytics and reports</p>
          </Link>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-800">Recent Activity</h2>
          </div>
          <div className="p-6">
            <p className="text-slate-500 text-center py-8">No recent activity</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
