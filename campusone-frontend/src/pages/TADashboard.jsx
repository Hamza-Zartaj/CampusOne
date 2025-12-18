import { useAuth } from '../context/AuthContext';

const TADashboard = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-blue-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold">Teaching Assistant Dashboard</h1>
          <p className="mt-2 text-sky-50">Welcome back, {user?.name}!</p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-slate-500 text-sm font-medium">Assigned Courses</h3>
            <p className="text-3xl font-bold text-blue-900 mt-2">
              {user?.roleData?.assignedCourses?.length || 0}
            </p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-slate-500 text-sm font-medium">Grading Queue</h3>
            <p className="text-3xl font-bold text-blue-900 mt-2">0</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-slate-500 text-sm font-medium">Questions to Answer</h3>
            <p className="text-3xl font-bold text-blue-900 mt-2">0</p>
          </div>
        </div>

        {/* Assigned Courses */}
        <div className="bg-white rounded-lg shadow mb-8">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-800">My Assigned Courses</h2>
          </div>
          <div className="p-6">
            {user?.roleData?.assignedCourses?.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {user.roleData.assignedCourses.map((course) => (
                  <div key={course._id} className="border border-slate-200 rounded-lg p-4 hover:border-blue-500 transition">
                    <h3 className="font-semibold text-slate-800">{course.name || 'Course'}</h3>
                    <p className="text-sm text-slate-500 mt-1">{course.code || ''}</p>
                    <div className="mt-3">
                      <button className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-400">
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-center py-8">No courses assigned yet</p>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-sky-50 border border-blue-500 rounded-lg p-6">
            <h3 className="font-semibold text-slate-800 mb-2">Grade Submissions</h3>
            <p className="text-sm text-slate-500 mb-4">Review and grade pending submissions</p>
            <button className="px-4 py-2 bg-blue-900 text-white rounded hover:bg-blue-800">
              Start Grading
            </button>
          </div>
          <div className="bg-sky-50 border border-blue-500 rounded-lg p-6">
            <h3 className="font-semibold text-slate-800 mb-2">Answer Questions</h3>
            <p className="text-sm text-slate-500 mb-4">Help students with their queries</p>
            <button className="px-4 py-2 bg-blue-900 text-white rounded hover:bg-blue-800">
              View Q&A
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TADashboard;
