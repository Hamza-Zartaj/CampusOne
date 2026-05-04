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
import AdmissionSettings from './pages/admin/Admissions/AdmissionSettings';
import ApplicationsManagement from './pages/admin/Admissions/ApplicationsManagement';
import AnnouncementManagement from './pages/admin/AnnouncementManagement';
import Reports from './pages/admin/Reports';
import AuditLogs from './pages/admin/AuditLogs';
import TAOversight from './pages/admin/TAOversight';

// Admin Academic Pages
import DepartmentManagement from './pages/admin/academic/DepartmentManagement';
import ProgramManagement from './pages/admin/academic/ProgramManagement';
import CourseManagement from './pages/admin/academic/CourseManagement';
import TermManagement from './pages/admin/academic/TermManagement';
import CourseOfferingManagement from './pages/admin/academic/CourseOfferingManagement';
import EnrollmentManagement from './pages/admin/academic/EnrollmentManagement';
import ScheduleConfigPage from './pages/admin/schedule/ScheduleConfigPage';
import RoomManagement from './pages/admin/schedule/RoomManagement';
import HolidayManagement from './pages/admin/schedule/HolidayManagement';

// Teacher Pages
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import TeacherAnnouncement from './pages/teacher/TeacherAnnouncement';
import TeacherNotification from './pages/teacher/TeacherNotification';
import TeacherAttendance from './pages/teacher/TeacherAttendance';
import TeacherAssignments from './pages/teacher/TeacherAssignments';
import TeacherQuizzes from './pages/teacher/TeacherQuizzes';
import TeacherQnA from './pages/teacher/TeacherQnA';
import TeacherLeaveApplications from './pages/teacher/TeacherLeaveApplications';
import TeacherTAApplications from './pages/teacher/TeacherTAApplications';

// Teacher Academic Pages
import MyOfferings from './pages/teacher/academic/MyOfferings';
import MarksUpload from './pages/teacher/academic/MarksUpload';
import TeacherLectures from './pages/teacher/academic/TeacherLectures';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import StudentNotification from './pages/student/StudentNotification';
import StudentAttendance from './pages/student/StudentAttendance';
import StudentAssignments from './pages/student/StudentAssignments';
import StudentQuizzes from './pages/student/StudentQuizzes';
import StudentQnA from './pages/student/StudentQnA';
import StudentLeaveStatus from './pages/student/StudentLeaveStatus';
import MyTAAssignments from './pages/student/MyTAAssignments';

// Student Academic Pages
import MyCourses from './pages/student/academic/MyCourses';
import MyGrades from './pages/student/academic/MyGrades';
import Transcript from './pages/student/academic/Transcript';
import CourseRegistration from './pages/student/academic/CourseRegistration';
import MyTimetable from './pages/student/academic/MyTimetable';

function getDashboardPathForRole(role) {
  const normalizedRole = String(role || '').toLowerCase();

  if (normalizedRole === 'teacher') return '/teacher/dashboard';
  if (normalizedRole === 'student') return '/student/dashboard';
  return '/admin/dashboard';
}

function RoleBasedRedirect() {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  return <Navigate to={getDashboardPathForRole(user.role)} replace />;
}

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
          <Route path="/dashboard" element={<RoleBasedRedirect />} />
          <Route path="/profile" element={<Profile />} />

          {/* Admin Routes */}
          <Route path="/admin/dashboard" element={<Dashboard />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/admissions" element={<AdmissionSettings />} />
          <Route path="/admin/admissions/applications/:status" element={<ApplicationsManagement />} />
          <Route path="/admin/reports" element={<Reports />} />
          <Route path="/admin/announcements" element={<AnnouncementManagement />} />
          <Route path="/admin/academic/departments" element={<DepartmentManagement />} />
          <Route path="/admin/academic/programs" element={<ProgramManagement />} />
          <Route path="/admin/academic/courses" element={<CourseManagement />} />
          <Route path="/admin/academic/terms" element={<TermManagement />} />
          <Route path="/admin/academic/offerings" element={<CourseOfferingManagement />} />
          <Route path="/admin/academic/enrollments" element={<EnrollmentManagement />} />
          <Route path="/admin/schedule/config" element={<ScheduleConfigPage />} />
          <Route path="/admin/schedule/rooms" element={<RoomManagement />} />
          <Route path="/admin/schedule/holidays" element={<HolidayManagement />} />
          <Route path="/admin/audit-logs" element={<AuditLogs />} />
          <Route path="/admin/ta-oversight" element={<TAOversight />} />

          {/* Teacher Routes */}
          <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
          <Route path="/teacher/attendance" element={<TeacherAttendance />} />
          <Route path="/teacher/assignments" element={<TeacherAssignments />} />
          <Route path="/teacher/quizzes" element={<TeacherQuizzes />} />
          <Route path="/teacher/qna" element={<TeacherQnA />} />
          <Route path="/teacher/announcements" element={<TeacherAnnouncement />} />
          <Route path="/teacher/notification" element={<TeacherNotification />} />
          <Route path="/teacher/offerings" element={<MyOfferings />} />
          <Route path="/teacher/offerings/:offeringId/marks" element={<MarksUpload />} />
          <Route path="/teacher/offerings/:offeringId/lectures" element={<TeacherLectures />} />
          <Route path="/teacher/leave-applications" element={<TeacherLeaveApplications />} />
          <Route path="/teacher/ta-applications" element={<TeacherTAApplications />} />

          {/* Student Routes */}
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/attendance" element={<StudentAttendance />} />
          <Route path="/student/assignments" element={<StudentAssignments />} />
          <Route path="/student/quizzes" element={<StudentQuizzes />} />
          <Route path="/student/qna" element={<StudentQnA />} />
          <Route path="/student/notification" element={<StudentNotification />} />
          <Route path="/student/courses" element={<MyCourses />} />
          <Route path="/student/registration" element={<CourseRegistration />} />
          <Route path="/student/grades" element={<MyGrades />} />
          <Route path="/student/transcript" element={<Transcript />} />
          <Route path="/student/timetable" element={<MyTimetable />} />
          <Route path="/student/leave-status" element={<StudentLeaveStatus />} />
          <Route path="/student/ta" element={<MyTAAssignments />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
