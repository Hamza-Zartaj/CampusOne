import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DashboardLayout from './components/DashboardLayout';
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <Router>
      <Toaster position="top-center" />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        
        {/* Protected Dashboard Routes */}
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<div style={{ padding: '20px' }}>Profile Page - Coming Soon</div>} />
          <Route path="/courses" element={<div style={{ padding: '20px' }}>Courses Page - Coming Soon</div>} />
          <Route path="/attendance" element={<div style={{ padding: '20px' }}>Attendance Page - Coming Soon</div>} />
          <Route path="/assignments" element={<div style={{ padding: '20px' }}>Assignments Page - Coming Soon</div>} />
          <Route path="/quizzes" element={<div style={{ padding: '20px' }}>Quizzes Page - Coming Soon</div>} />
          <Route path="/qna" element={<div style={{ padding: '20px' }}>Q&A Forum - Coming Soon</div>} />
          <Route path="/notifications" element={<div style={{ padding: '20px' }}>Notifications Page - Coming Soon</div>} />
          <Route path="/settings" element={<div style={{ padding: '20px' }}>Settings Page - Coming Soon</div>} />
          <Route path="/users" element={<div style={{ padding: '20px' }}>Users Management - Coming Soon</div>} />
          <Route path="/reports" element={<div style={{ padding: '20px' }}>Reports Page - Coming Soon</div>} />
          <Route path="/announcements" element={<div style={{ padding: '20px' }}>Announcements Page - Coming Soon</div>} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
