import { useAuth } from '../context/AuthContext';

const StudentDashboard = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-blue-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold">Student Dashboard</h1>
          <p className="mt-2 text-sky-50">Welcome back, {user?.name}!</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-slate-500 text-sm font-medium">Enrolled Courses</h3>
            <p className="text-3xl font-bold text-blue-900 mt-2">
              {user?.roleData?.enrolledCourses?.length || 0}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-slate-500 text-sm font-medium">Pending Assignments</h3>
            <p className="text-3xl font-bold text-blue-900 mt-2">0</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-slate-500 text-sm font-medium">Attendance</h3>
            <p className="text-3xl font-bold text-blue-900 mt-2">--</p>
          </div>
        </div>

        {/* Enrolled Courses */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-800">My Courses</h2>
          </div>
          <div className="p-6">
            {user?.roleData?.enrolledCourses?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {user.roleData.enrolledCourses.map((course) => (
                  <div key={course._id} className="border border-slate-200 rounded-lg p-4 hover:border-blue-500 transition">
                    <h3 className="font-semibold text-slate-800">{course.courseId?.name || 'Course'}</h3>
                    <p className="text-sm text-slate-500 mt-1">{course.courseId?.code || ''}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-center py-8">No courses enrolled yet</p>
            )}
          </div>
        </div>

        {/* Recent Announcements */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-800">Recent Announcements</h2>
          </div>
          <div className="p-6">
            <p className="text-slate-500 text-center py-8">No announcements yet</p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;