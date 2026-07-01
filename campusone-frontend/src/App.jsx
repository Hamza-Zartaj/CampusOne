import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './components/DashboardLayout';
import { Toaster } from 'react-hot-toast';

const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/auth/Login'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AdmissionApplication = lazy(() => import('./pages/AdmissionApplication'));
const Profile = lazy(() => import('./pages/Profile'));
const Notifications = lazy(() => import('./pages/Notifications'));

const UserManagement = lazy(() => import('./pages/admin/UserManagement'));
const AdmissionSettings = lazy(() => import('./pages/admin/Admissions/AdmissionSettings'));
const ApplicationsManagement = lazy(() => import('./pages/admin/Admissions/ApplicationsManagement'));
const AnnouncementManagement = lazy(() => import('./pages/admin/AnnouncementManagement'));
const Reports = lazy(() => import('./pages/admin/Reports'));
const AuditLogs = lazy(() => import('./pages/admin/AuditLogs'));
const TAOversight = lazy(() => import('./pages/admin/TAOversight'));

const DepartmentManagement = lazy(() => import('./pages/admin/academic/DepartmentManagement'));
const ProgramManagement = lazy(() => import('./pages/admin/academic/ProgramManagement'));
const CourseManagement = lazy(() => import('./pages/admin/academic/CourseManagement'));
const AttendancePolicySettings = lazy(() => import('./pages/admin/academic/AttendancePolicySettings'));
const TermManagement = lazy(() => import('./pages/admin/academic/TermManagement'));
const CourseOfferingManagement = lazy(() => import('./pages/admin/academic/CourseOfferingManagement'));
const EnrollmentManagement = lazy(() => import('./pages/admin/academic/EnrollmentManagement'));
const ScheduleConfigPage = lazy(() => import('./pages/admin/schedule/ScheduleConfigPage'));
const RoomManagement = lazy(() => import('./pages/admin/schedule/RoomManagement'));
const HolidayManagement = lazy(() => import('./pages/admin/schedule/HolidayManagement'));

const TeacherDashboard = lazy(() => import('./pages/teacher/TeacherDashboard'));
const TeacherAnnouncement = lazy(() => import('./pages/teacher/TeacherAnnouncement'));
const TeacherAttendance = lazy(() => import('./pages/teacher/TeacherAttendance'));
const TeacherAssignments = lazy(() => import('./pages/teacher/TeacherAssignments'));
const TeacherQuizzes = lazy(() => import('./pages/teacher/TeacherQuizzes'));
const TeacherQnA = lazy(() => import('./pages/teacher/TeacherQnA'));
const TeacherLeaveApplications = lazy(() => import('./pages/teacher/TeacherLeaveApplications'));
const TeacherTAApplications = lazy(() => import('./pages/teacher/TeacherTAApplications'));
const MyOfferings = lazy(() => import('./pages/teacher/academic/MyOfferings'));
const MarksUpload = lazy(() => import('./pages/teacher/academic/MarksUpload'));
const TeacherLectures = lazy(() => import('./pages/teacher/academic/TeacherLectures'));

const StudentDashboard = lazy(() => import('./pages/student/StudentDashboard'));
const StudentAttendance = lazy(() => import('./pages/student/StudentAttendance'));
const StudentAssignments = lazy(() => import('./pages/student/StudentAssignments'));
const StudentQuizzes = lazy(() => import('./pages/student/StudentQuizzes'));
const StudentQnA = lazy(() => import('./pages/student/StudentQnA'));
const StudentLeaveStatus = lazy(() => import('./pages/student/StudentLeaveStatus'));
const MyTAAssignments = lazy(() => import('./pages/student/MyTAAssignments'));
const MyCourses = lazy(() => import('./pages/student/academic/MyCourses'));
const MyGrades = lazy(() => import('./pages/student/academic/MyGrades'));
const Transcript = lazy(() => import('./pages/student/academic/Transcript'));
const CourseRegistration = lazy(() => import('./pages/student/academic/CourseRegistration'));
const MyTimetable = lazy(() => import('./pages/student/academic/MyTimetable'));

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
      <Suspense fallback={<div className="p-10 text-center text-slate-400 text-sm">Loading...</div>}>
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
          <Route path="/admin/academic/attendance-policy" element={<AttendancePolicySettings />} />
          <Route path="/admin/academic/terms" element={<TermManagement />} />
          <Route path="/admin/academic/offerings" element={<CourseOfferingManagement />} />
          <Route path="/admin/academic/enrollments" element={<EnrollmentManagement />} />
          <Route path="/admin/schedule/config" element={<ScheduleConfigPage />} />
          <Route path="/admin/schedule/rooms" element={<RoomManagement />} />
          <Route path="/admin/schedule/holidays" element={<HolidayManagement />} />
          <Route path="/admin/audit-logs" element={<AuditLogs />} />
          <Route path="/admin/ta-oversight" element={<TAOversight />} />
          <Route path="/admin/notifications" element={<Notifications />} />

          {/* Teacher Routes */}
          <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
          <Route path="/teacher/attendance" element={<TeacherAttendance />} />
          <Route path="/teacher/assignments" element={<TeacherAssignments />} />
          <Route path="/teacher/quizzes" element={<TeacherQuizzes />} />
          <Route path="/teacher/qna" element={<TeacherQnA />} />
          <Route path="/teacher/announcements" element={<TeacherAnnouncement />} />
          <Route path="/teacher/notification" element={<Notifications />} />
          <Route path="/teacher/notifications" element={<Notifications />} />
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
          <Route path="/student/notification" element={<Notifications />} />
          <Route path="/student/notifications" element={<Notifications />} />
          <Route path="/student/courses" element={<MyCourses />} />
          <Route path="/student/registration" element={<CourseRegistration />} />
          <Route path="/student/grades" element={<MyGrades />} />
          <Route path="/student/transcript" element={<Transcript />} />
          <Route path="/student/timetable" element={<MyTimetable />} />
          <Route path="/student/leave-status" element={<StudentLeaveStatus />} />
          <Route path="/student/ta" element={<MyTAAssignments />} />
        </Route>
      </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
