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
import CourseManagement from './pages/admin/CourseManagement';
import ProgramCurriculum from './pages/admin/ProgramCurriculum';
import SemesterView from './pages/admin/SemesterView';
import CourseOfferingManagement from './pages/admin/CourseOfferingManagement';
import BulkStudentEnrollment from './pages/admin/BulkStudentEnrollment';
import DepartmentManagement from './pages/admin/DepartmentManagement';
import ProgramManagement from './pages/admin/ProgramManagement';
import AnnouncementManagement from './pages/admin/AnnouncementManagement';
import Reports from './pages/admin/Reports';

// Teacher Pages
import TeacherDashboard from './pages/teacher/TeacherDashboard';
import MyOfferings from './pages/teacher/MyOfferings';
import EnrolledStudents from './pages/teacher/EnrolledStudents';
import TeacherAnnouncement from './pages/teacher/TeacherAnnouncement';
import TeacherNotification from './pages/teacher/TeacherNotification';
import TeacherAttendance from './pages/teacher/TeacherAttendance';
import TeacherAssignments from './pages/teacher/TeacherAssignments';
import TeacherQuizzes from './pages/teacher/TeacherQuizzes';
import TeacherQnA from './pages/teacher/TeacherQnA';

// Student Pages
import StudentDashboard from './pages/student/StudentDashboard';
import MyCourses from './pages/student/MyCourses';
import Timetable from './pages/student/Timetable';
import MyGrades from './pages/student/MyGrades';
import StudentNotification from './pages/student/StudentNotification';
import StudentAttendance from './pages/student/StudentAttendance';
import StudentAssignments from './pages/student/StudentAssignments';
import StudentQuizzes from './pages/student/StudentQuizzes';
import StudentQnA from './pages/student/StudentQnA';

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
          <Route path="/admin/enroll-students" element={<BulkStudentEnrollment />} />
          <Route path="/admin/departments" element={<DepartmentManagement />} />
          <Route path="/admin/programs" element={<ProgramManagement />} />
          <Route path="/admin/users" element={<UserManagement />} />
          <Route path="/admin/admissions" element={<AdmissionSettings />} />
          <Route path="/admin/admissions/applications/:status" element={<ApplicationsManagement />} />
          <Route path="/admin/reports" element={<Reports />} />
          <Route path="/admin/announcements" element={<AnnouncementManagement />} />

          {/* Teacher Routes */}
          <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
          <Route path="/teacher/offerings" element={<MyOfferings />} />
          <Route path="/teacher/offerings/:offeringId/students" element={<EnrolledStudents />} />
          <Route path="/teacher/attendance" element={<TeacherAttendance />} />
          <Route path="/teacher/assignments" element={<TeacherAssignments />} />
          <Route path="/teacher/quizzes" element={<TeacherQuizzes />} />
          <Route path="/teacher/qna" element={<TeacherQnA />} />
          <Route path="/teacher/announcements" element={<TeacherAnnouncement />} />
          <Route path="/teacher/notification" element={<TeacherNotification />} />

          {/* Student Routes */}
          <Route path="/student/dashboard" element={<StudentDashboard />} />
          <Route path="/student/courses" element={<MyCourses />} />
          <Route path="/student/timetable" element={<Timetable />} />
          <Route path="/student/grades" element={<MyGrades />} />
          <Route path="/student/attendance" element={<StudentAttendance />} />
          <Route path="/student/assignments" element={<StudentAssignments />} />
          <Route path="/student/quizzes" element={<StudentQuizzes />} />
          <Route path="/student/qna" element={<StudentQnA />} />
          <Route path="/student/notification" element={<StudentNotification />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
