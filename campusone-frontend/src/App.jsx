import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Login from './pages/auth/Login';
import Dashboard from './pages/Dashboard';
import AdmissionApplication from './pages/AdmissionApplication';
import Profile from './pages/Profile';
import DashboardLayout from './components/DashboardLayout';
import { Toaster } from 'react-hot-toast';

// Admin Pages
import UserManagement from './pages/admin/UserManagement';
import AdmissionSettings from './pages/admin/AdmissionSettings';
import CourseManagement from './pages/admin/CourseManagement';
import ProgramCurriculum from './pages/admin/ProgramCurriculum';
import SemesterView from './pages/admin/SemesterView';
import CourseOfferingManagement from './pages/admin/CourseOfferingManagement';
import StudentEnrollment from './pages/admin/StudentEnrollment';
import DepartmentManagement from './pages/admin/DepartmentManagement';
import ProgramManagement from './pages/admin/ProgramManagement';

// Teacher Pages
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import MyOfferings from './pages/teacher/MyOfferings';
import EnrolledStudents from './pages/teacher/EnrolledStudents';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import MyCourses from './pages/student/MyCourses';
import CourseRegistration from './pages/student/CourseRegistration';
import Timetable from './pages/student/Timetable';
import MyGrades from './pages/student/MyGrades';

function App() {
  return (
    <Router>
      <Toaster 
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            padding: '16px',
            fontSize: '14px',
          },
        }}
      />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/apply" element={<AdmissionApplication />} />
        
        {/* Protected Dashboard Routes */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />

          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={<Dashboard />} />
          <Route path="/admin/courses" element={<CourseManagement />} />
          <Route path="/admin/curriculum" element={<ProgramCurriculum />} />
          <Route path="/admin/semesters" element={<SemesterView />} />
          <Route path="/admin/offerings" element={<CourseOfferingManagement />} />
          <Route path="/admin/enrollment" element={<StudentEnrollment />} />
          <Route path="/admin/departments" element={<DepartmentManagement />} />
          <Route path="/admin/programs" element={<ProgramManagement />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/admissions" element={<AdmissionSettings />} />
          <Route path="/admin/reports" element={<div style={{ padding: '20px' }}>Reports Page - Coming Soon</div>} />
          <Route path="/admin/announcements" element={<div style={{ padding: '20px' }}>Announcements Page - Coming Soon</div>} />

          {/* Teacher Routes */}
          <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
          <Route path="/teacher/offerings" element={<MyOfferings />} />
          <Route path="/teacher/offerings/:offeringId/students" element={<EnrolledStudents />} />
          <Route path="/teacher/attendance" element={<div style={{ padding: '20px' }}>Attendance Management - Coming Soon</div>} />
          <Route path="/teacher/assignments" element={<div style={{ padding: '20px' }}>Assignments Management - Coming Soon</div>} />
          <Route path="/teacher/quizzes" element={<div style={{ padding: '20px' }}>Quiz Management - Coming Soon</div>} />
          <Route path="/teacher/qna" element={<div style={{ padding: '20px' }}>Q&A Forum - Coming Soon</div>} />

          {/* Student Routes */}
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/courses" element={<MyCourses />} />
          <Route path="/student/register" element={<CourseRegistration />} />
          <Route path="/student/timetable" element={<Timetable />} />
          <Route path="/student/grades" element={<MyGrades />} />
          <Route path="/student/attendance" element={<div style={{ padding: '20px' }}>My Attendance - Coming Soon</div>} />
          <Route path="/student/assignments" element={<div style={{ padding: '20px' }}>My Assignments - Coming Soon</div>} />
          <Route path="/student/quizzes" element={<div style={{ padding: '20px' }}>My Quizzes - Coming Soon</div>} />
          <Route path="/student/qna" element={<div style={{ padding: '20px' }}>Q&A Forum - Coming Soon</div>} />

          {/* Shared Coming Soon */}
          <Route path="/notifications" element={<div style={{ padding: '20px' }}>Notifications Page - Coming Soon</div>} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
