import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  ClipboardList,
  Award,
  Clock,
  Calendar,
  TrendingUp,
  ChevronRight,
  AlertCircle,
  GraduationCap
} from 'lucide-react';
import { studentPortalAPI } from '../../utils/api';
import toast from 'react-hot-toast';

const StudentDashboard = () => {
  const [user, setUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [cgpaData, setCgpaData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(userData);
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [coursesRes, cgpaRes] = await Promise.allSettled([
        studentPortalAPI.getCurrentCourses(),
        studentPortalAPI.getMyCGPA()
      ]);

      if (coursesRes.status === 'fulfilled' && coursesRes.value.data.success) {
        setCourses(coursesRes.value.data.data);
      }
      if (cgpaRes.status === 'fulfilled' && cgpaRes.value.data.success) {
        setCgpaData(cgpaRes.value.data.data);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const enrolledCourses = courses.filter(c => c.status === 'enrolled' || c.status === 'active');
  const totalCredits = enrolledCourses.reduce((sum, c) => sum + (c.course?.creditHours || 0), 0);
  const waitlistedCount = courses.filter(c => c.status === 'waitlisted').length;

  const stats = [
    { icon: BookOpen, label: 'Enrolled Courses', value: enrolledCourses.length, color: '#3b82f6' },
    { icon: GraduationCap, label: 'Credit Hours', value: totalCredits, color: '#06b6d4' },
    { icon: Award, label: 'CGPA', value: cgpaData?.cgpa?.toFixed(2) || '-', color: '#10b981' },
    { icon: Clock, label: 'Waitlisted', value: waitlistedCount, color: '#f59e0b' },
  ];

  return (
    <div className="max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[32px] font-bold text-slate-800 m-0 mb-2 max-md:text-2xl max-sm:text-xl">
          Welcome back, {user?.name || 'Student'}!
        </h1>
        <p className="text-base text-slate-500 m-0">
          Here's your academic overview.
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

      {/* Current Courses Quick View */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
        <div className="py-5 px-6 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800 m-0">Current Courses</h2>
          <button
            onClick={() => navigate('/student/courses')}
            className="text-sm text-primary-500 font-medium flex items-center gap-1 hover:underline bg-transparent border-none cursor-pointer"
          >
            View All <ChevronRight size={16} />
          </button>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8 text-slate-400">Loading courses...</div>
          ) : enrolledCourses.length === 0 ? (
            <div className="text-center py-8">
              <AlertCircle size={40} className="mx-auto mb-3 text-slate-300" />
              <p className="text-slate-500 mb-3">No enrolled courses. Register for courses to get started.</p>
              <button
                onClick={() => navigate('/student/register')}
                className="inline-flex items-center gap-2 py-2 px-4 bg-gradient-primary text-white rounded-lg text-sm font-medium border-none cursor-pointer hover:-translate-y-0.5 transition-all"
              >
                Register for Courses
              </button>
            </div>
          ) : (
            <div className="grid gap-3">
              {enrolledCourses.slice(0, 5).map((item) => (
                <div
                  key={item.enrollmentId}
                  className="flex items-center justify-between py-3.5 px-4 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                      <BookOpen size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 m-0">
                        {item.course?.courseCode} - {item.course?.courseName}
                      </p>
                      <p className="text-xs text-slate-500 m-0 mt-0.5">
                        Section {item.offering?.section} &middot; {item.course?.creditHours} CH
                        {item.offering?.teacher && ` &middot; ${item.offering.teacher}`}
                      </p>
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                    item.status === 'enrolled' ? 'bg-green-100 text-green-700' :
                    item.status === 'active' ? 'bg-blue-100 text-blue-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-5 max-sm:grid-cols-1">
        <div
          className="bg-white rounded-2xl shadow-sm p-6 flex items-center gap-4 cursor-pointer hover:shadow-md transition-all"
          onClick={() => navigate('/student/register')}
        >
          <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
            <ClipboardList size={22} />
          </div>
          <div className="flex-1">
            <h3 className="text-[15px] font-semibold text-slate-800 m-0">Course Registration</h3>
            <p className="text-sm text-slate-500 m-0 mt-0.5">Browse & enroll in available courses</p>
          </div>
          <ChevronRight size={18} className="text-slate-400" />
        </div>
        <div
          className="bg-white rounded-2xl shadow-sm p-6 flex items-center gap-4 cursor-pointer hover:shadow-md transition-all"
          onClick={() => navigate('/student/grades')}
        >
          <div className="w-12 h-12 rounded-xl bg-green-100 text-green-600 flex items-center justify-center">
            <Award size={22} />
          </div>
          <div className="flex-1">
            <h3 className="text-[15px] font-semibold text-slate-800 m-0">My Grades & Transcript</h3>
            <p className="text-sm text-slate-500 m-0 mt-0.5">View grades, CGPA & transcript</p>
          </div>
          <ChevronRight size={18} className="text-slate-400" />
        </div>
        <div
          className="bg-white rounded-2xl shadow-sm p-6 flex items-center gap-4 cursor-pointer hover:shadow-md transition-all"
          onClick={() => navigate('/student/timetable')}
        >
          <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
            <Calendar size={22} />
          </div>
          <div className="flex-1">
            <h3 className="text-[15px] font-semibold text-slate-800 m-0">Weekly Timetable</h3>
            <p className="text-sm text-slate-500 m-0 mt-0.5">View your class schedule</p>
          </div>
          <ChevronRight size={18} className="text-slate-400" />
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
