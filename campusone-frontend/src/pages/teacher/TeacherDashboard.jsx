import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Users,
  ClipboardList,
  Calendar,
  TrendingUp,
  ChevronRight,
  AlertCircle,
  Lock,
  BarChart3
} from 'lucide-react';
import { teacherToolsAPI } from '../../utils/api';
import toast from 'react-hot-toast';

const TeacherDashboard = () => {
  const [user, setUser] = useState(null);
  const [offerings, setOfferings] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(userData);
    fetchOfferings();
  }, []);

  const fetchOfferings = async () => {
    try {
      setLoading(true);
      const res = await teacherToolsAPI.getMyOfferings();
      if (res.data.success) {
        setOfferings(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching offerings:', err);
    } finally {
      setLoading(false);
    }
  };

  const activeOfferings = offerings.filter(o => o.status === 'active' || o.status === 'open');
  const completedOfferings = offerings.filter(o => o.status === 'completed');
  const totalStudents = activeOfferings.reduce((sum, o) => sum + (o.currentEnrollment || 0), 0);
  const lockedCount = offerings.filter(o => o.resultsLocked).length;

  const stats = [
    { icon: BookOpen, label: 'Active Offerings', value: activeOfferings.length, color: '#3b82f6' },
    { icon: Users, label: 'Total Students', value: totalStudents, color: '#06b6d4' },
    { icon: Lock, label: 'Results Locked', value: lockedCount, color: '#10b981' },
    { icon: BarChart3, label: 'Completed', value: completedOfferings.length, color: '#f59e0b' },
  ];

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[32px] font-bold text-slate-800 m-0 mb-2 max-md:text-2xl max-sm:text-xl">
          Welcome back, {user?.name || 'Teacher'}!
        </h1>
        <p className="text-base text-slate-500 m-0">
          Here's an overview of your teaching assignments.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(250px,1fr))] gap-5 mb-8 max-sm:grid-cols-1">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-2xl p-6 flex items-center gap-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: `${stat.color}15`, color: stat.color }}>
              <stat.icon size={24} />
            </div>
            <div className="flex-1">
              <p className="text-sm text-slate-500 m-0 mb-1 font-medium">{stat.label}</p>
              <h3 className="text-[28px] font-bold text-slate-800 m-0">{loading ? '...' : stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Active Offerings Quick View */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
        <div className="py-5 px-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800 m-0">Your Courses</h2>
          <button
            onClick={() => navigate('/teacher/offerings')}
            className="text-sm text-primary-500 font-medium flex items-center gap-1 hover:underline bg-transparent border-none cursor-pointer"
          >
            View All <ChevronRight size={16} />
          </button>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8 text-slate-400">Loading offerings...</div>
          ) : activeOfferings.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle size={40} className="mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500">No active offerings at the moment.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {activeOfferings.slice(0, 5).map((offering) => (
                <div
                  key={offering._id}
                  className="flex items-center justify-between py-4 px-5 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
                  onClick={() => navigate(`/teacher/offerings/${offering._id}/students`)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                      <BookOpen size={20} />
                    </div>
                    <div>
                      <p className="text-[15px] font-semibold text-slate-800 m-0">
                        {offering.course?.courseCode} - {offering.course?.courseName}
                      </p>
                      <p className="text-sm text-slate-500 m-0 mt-0.5">
                        Section {offering.section} &middot; {offering.program?.programCode} &middot; Sem {offering.semesterNumber}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 max-sm:hidden">
                    <div className="text-center">
                      <p className="text-xs text-slate-400 m-0">Students</p>
                      <p className="text-lg font-bold text-slate-700 m-0">{offering.currentEnrollment || 0}</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-slate-400 m-0">Status</p>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        offering.resultsLocked 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {offering.resultsLocked ? 'Locked' : 'Active'}
                      </span>
                    </div>
                    <ChevronRight size={18} className="text-slate-400" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
