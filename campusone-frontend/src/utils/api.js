import axios from 'axios';
import { attachCacheInterceptors, clearAllApiCache } from './apiCache';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '/api').replace(/\/$/, '');

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach the GET-cache layer (transparent — components don't need to change).
attachCacheInterceptors(api);
export { clearAllApiCache };

// Add token to requests if it exists
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const currentPath = window.location.pathname;
      const url = error.config?.url || '';
      // These endpoints return 401 for wrong credentials, not expired tokens
      const isCredentialCheck = url.includes('/auth/login')
        || url.includes('/auth/disable-2fa')
        || url.includes('/auth/change-password')
        || url.includes('/auth/verify-2fa')
        || url.includes('/auth/verify-email-otp');

      if (currentPath !== '/login' && !isCredentialCheck) {
        // Truly unauthorized (expired/invalid token) — clear session and redirect
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        clearAllApiCache();
        import('./socket').then((m) => m.disconnectSocket());
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth endpoints
export const authAPI = {
  login: (username, password) => 
    api.post('/auth/login', { username, password }),
  
  verify2FA: (userId, token, rememberDevice = true) => 
    api.post('/auth/verify-2fa', { userId, token, rememberDevice }),
  
  getCurrentUser: () => 
    api.get('/auth/me'),
  
  logout: () => 
    api.post('/auth/logout'),
  
  setup2FA: () => 
    api.post('/auth/setup-2fa'),
  
  enable2FA: (token) => 
    api.post('/auth/enable-2fa', { token }),
  
  disable2FA: (password, token) => 
    api.post('/auth/disable-2fa', { password, token }),
  
  completeFirstTimeSetup: (data) => 
    api.post('/auth/first-time-setup', data),
  
  skip2FASetup: () => 
    api.post('/auth/skip-2fa-setup'),
  
  setupEmail2FA: () => 
    api.post('/auth/setup-email-2fa'),
  
  enableEmail2FA: (otp) => 
    api.post('/auth/enable-email-2fa', { otp }),
  
  sendLoginOTP: (userId) => 
    api.post('/auth/send-login-otp', { userId }),
  
  verifyEmailOTP: (userId, otp, rememberDevice = true) => 
    api.post('/auth/verify-email-otp', { userId, otp, rememberDevice }),
  
  forgotPassword: (email) => 
    api.post('/auth/forgot-password', { email }),
  
  verifyResetCode: (userId, code) => 
    api.post('/auth/verify-reset-code', { userId, code }),
  
  resetPassword: (resetToken, newPassword) => 
    api.post('/auth/reset-password', { resetToken, newPassword }),

  changePassword: (currentPassword, newPassword) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),

  sendVerificationOTP: () =>
    api.post('/auth/send-verification-otp'),

  recoverSuperAdmin: (username, recoveryKey) =>
    api.post('/auth/recover-super-admin', { username, recoveryKey }),

  updateMyEmail: (newEmail, otp) =>
    api.put('/auth/my-email', otp ? { newEmail, otp } : { newEmail }),

  updateMyProfile: (data) =>
    api.put('/auth/my-profile', data),

  uploadProfilePicture: (file) => {
    const fd = new FormData();
    fd.append('image', file);
    return api.post('/auth/profile-picture', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  removeProfilePicture: () =>
    api.delete('/auth/profile-picture'),
};

// User Management endpoints
export const userAPI = {
  getUserStatsByRole: () => 
    api.get('/users/stats/by-role'),
  
  searchStudents: (query) => 
    api.get(`/users/search-students?query=${encodeURIComponent(query)}`),
  
  createUser: (userData) => 
    api.post('/users', userData),
  
  downloadBulkUploadTemplate: () => 
    api.get('/users/bulk-upload/template', { 
      responseType: 'blob' 
    }),
  
  bulkUploadStudents: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/users/bulk-upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  
  getAllUsers: (params = {}) => 
    api.get('/users', { params }),
  
  getUserById: (userId) => 
    api.get(`/users/${userId}`),
  
  updateUser: (userId, userData) => 
    api.put(`/users/${userId}`, userData),
  
  deactivateUser: (userId) => 
    api.put(`/users/${userId}/deactivate`),
  
  activateUser: (userId) => 
    api.put(`/users/${userId}/activate`),
  
  unlockUser: (userId) => 
    api.put(`/users/${userId}/unlock`),
  
  deleteUser: (userId) => 
    api.delete(`/users/${userId}`),

  // Get teachers with designation info
  getTeachers: (params = {}) => 
    api.get('/teachers', { params })
};

// Teacher API
export const teacherAPI = {
  getAllTeachers: (params = {}) => 
    api.get('/teachers', { params }),

  getTeacherById: (id) => 
    api.get(`/teachers/${id}`),

  getTeacherByUserId: (userId) => 
    api.get(`/teachers/user/${userId}`)
};

// Admission API
export const admissionAPI = {
  // Get admission settings (public)
  getSettings: () => 
    api.get('/admissions/settings'),
  
  // Update admission settings (admin only)
  updateSettings: (settings) => 
    api.put('/admissions/settings', settings),
  
  // Submit admission application (public)
  submitApplication: (applicationData) => 
    api.post('/admissions/apply', applicationData),
  
  // Check for duplicate email
  checkDuplicateEmail: (email) =>
    api.get(`/admissions/check-email/${email}`),
  
  // Check for duplicate CNIC
  checkDuplicateCNIC: (cnic) =>
    api.get(`/admissions/check-cnic/${cnic}`),
  
  // Check for duplicate phone
  checkDuplicatePhone: (phone) =>
    api.get(`/admissions/check-phone/${phone}`),
  
  // Get all applications (admin only)
  getAllApplications: (params = {}) => 
    api.get('/admissions/applications', { params }),
  
  // Get single application
  getApplication: (id) => 
    api.get(`/admissions/applications/${id}`),
  
  // Update application status (admin only)
  updateApplicationStatus: (id, status, reviewNotes) => 
    api.put(`/admissions/applications/${id}/status`, { status, reviewNotes }),
  
  // Get application statistics (admin only)
  getStatistics: () => 
    api.get('/admissions/statistics'),

  // Upload documents for an application
  uploadApplicationDocuments: (applicationId, formData) => {
    return api.post(`/admissions/applications/${applicationId}/documents`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Get application documents
  getApplicationDocuments: (applicationId) =>
    api.get(`/admissions/applications/${applicationId}/documents`),

  // Delete application document
  deleteApplicationDocument: (applicationId, docIndex) =>
    api.delete(`/admissions/applications/${applicationId}/documents/${docIndex}`)
};

// Announcement endpoints
export const announcementAPI = {
  // Get all announcements (admin)
  getAllAnnouncements: () =>
    api.get('/announcements/all'),

  // Get my announcements (current user)
  getMyAnnouncements: () =>
    api.get('/announcements'),

  // Send announcement (admin)
  sendAnnouncement: (data) =>
    api.post('/announcements/send', data),

  // Send course announcement (teacher)
  sendCourseAnnouncement: (data) =>
    api.post('/announcements/course', data),

  // Delete announcement
  deleteAnnouncement: (id) =>
    api.delete(`/announcements/${id}`)
};

// Department API
export const departmentAPI = {
  getAll: (params = {}) => api.get('/departments', { params }),
  getById: (id) => api.get(`/departments/${id}`),
  create: (data) => api.post('/departments', data),
  update: (id, data) => api.put(`/departments/${id}`, data),
  delete: (id) => api.delete(`/departments/${id}`),
  restore: (id) => api.put(`/departments/${id}/restore`),
};

// Program API
export const programAPI = {
  getAll: (params = {}) => api.get('/programs', { params }),
  getById: (id) => api.get(`/programs/${id}`),
  getCurriculum: (id, params = {}) => api.get(`/programs/${id}/curriculum`, { params }),
  create: (data) => api.post('/programs', data),
  update: (id, data) => api.put(`/programs/${id}`, data),
  delete: (id) => api.delete(`/programs/${id}`),
};

// Curriculum API
export const curriculumAPI = {
  getByProgram: (programId) => api.get('/curricula', { params: { programId } }),
  getById: (id) => api.get(`/curricula/${id}`),
  create: (data) => api.post('/curricula', data),
  update: (id, data) => api.put(`/curricula/${id}`, data),
  clone: (id, data) => api.post(`/curricula/${id}/clone`, data),
  addCourse: (id, data) => api.post(`/curricula/${id}/courses`, data),
  updateCourse: (id, courseId, data) => api.put(`/curricula/${id}/courses/${courseId}`, data),
  removeCourse: (id, courseId) => api.delete(`/curricula/${id}/courses/${courseId}`),
};

// Term API
export const termAPI = {
  getAll: (params = {}) => api.get('/terms', { params }),
  getActive: () => api.get('/terms/active'),
  getById: (id) => api.get(`/terms/${id}`),
  create: (data) => api.post('/terms', data),
  update: (id, data) => api.put(`/terms/${id}`, data),
  activate: (id) => api.put(`/terms/${id}/activate`),
  getBatches: (id) => api.get(`/terms/${id}/batches`),
};

// Course API
export const courseAPI = {
  getAll: (params = {}) => api.get('/courses', { params }),
  getById: (id) => api.get(`/courses/${id}`),
  create: (data) => api.post('/courses', data),
  update: (id, data) => api.put(`/courses/${id}`, data),
  delete: (id) => api.delete(`/courses/${id}`),
  addPrerequisite: (id, prerequisiteId) => api.post(`/courses/${id}/prerequisites`, { prerequisiteId }),
  removePrerequisite: (id, prereqId) => api.delete(`/courses/${id}/prerequisites/${prereqId}`),
};

// Course Offering API
export const offeringAPI = {
  getAll: (params = {}) => api.get('/offerings', { params }),
  getMy: (params = {}) => api.get('/offerings/my', { params }),
  getById: (id) => api.get(`/offerings/${id}`),
  getStudents: (id) => api.get(`/offerings/${id}/students`),
  create: (data) => api.post('/offerings', data),
  update: (id, data) => api.put(`/offerings/${id}`, data),
  delete: (id) => api.delete(`/offerings/${id}`),
};

// Enrollment API
export const enrollmentAPI = {
  getAll: (params = {}) => api.get('/enrollments', { params }),
  getById: (id) => api.get(`/enrollments/${id}`),
  enroll: (data) => api.post('/enrollments', data),
  drop: (id) => api.delete(`/enrollments/${id}`),
  updateGrade: (id, data) => api.put(`/enrollments/${id}/grade`, data),
  bulkGrade: (data) => api.post('/enrollments/bulk-grade', data),
  transferSection: (id, newOfferingId) => api.put(`/enrollments/${id}/transfer-section`, { newOfferingId }),
  getTranscript: (studentId) => api.get(`/enrollments/students/${studentId}/transcript`),
  getCGPA: (studentId) => api.get(`/enrollments/students/${studentId}/cgpa`),
  getCurrent: (studentId) => api.get(`/enrollments/students/${studentId}/current`),
  bulkImportTemplate: () => api.get('/enrollments/bulk-import/template', { responseType: 'blob' }),
  bulkImport: (offeringId, file) => {
    const fd = new FormData();
    fd.append('offeringId', offeringId);
    fd.append('file', file);
    return api.post('/enrollments/bulk-import', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
};

// Semester Incharge API
export const semesterInchargeAPI = {
  getAll: (params = {}) => api.get('/semester-incharges', { params }),
  getMy: () => api.get('/semester-incharges/my'),
  assign: (data) => api.post('/semester-incharges', data),
  relieve: (id) => api.put(`/semester-incharges/${id}/relieve`),
  delete: (id) => api.delete(`/semester-incharges/${id}`),
};

// Assignment API
export const assignmentAPI = {
  // Teacher
  getAll: (params = {}) => api.get('/assignments', { params }),
  getById: (id) => api.get(`/assignments/${id}`),
  create: (formData) => api.post('/assignments', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update: (id, formData) => api.put(`/assignments/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete: (id) => api.delete(`/assignments/${id}`),
  getSubmissions: (id) => api.get(`/assignments/${id}/submissions`),
  runSimilarityScan: (id) => api.post(`/assignments/${id}/similarity/scan`),
  getLatestSimilarityReport: (id) => api.get(`/assignments/${id}/similarity/latest`),
  gradeSubmission: (submissionId, data) => api.put(`/assignments/submissions/${submissionId}/grade`, data),
  // Student
  getMy: () => api.get('/assignments/my'),
  submit: (id, formData) => api.post(`/assignments/${id}/submit`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getMySubmission: (id) => api.get(`/assignments/${id}/my-submission`),
};

// Audit Log API
export const auditLogAPI = {
  getLogs: (params = {}) => api.get('/audit-logs', { params }),
  getCategories: () => api.get('/audit-logs/categories'),
};

// Quiz API
export const quizAPI = {
  // Teacher
  getAll: (params = {}) => api.get('/quizzes', { params }),
  getById: (id) => api.get(`/quizzes/${id}`),
  create: (data) => api.post('/quizzes', data),
  update: (id, data) => api.put(`/quizzes/${id}`, data),
  delete: (id) => api.delete(`/quizzes/${id}`),
  generateWithAI: (data) => api.post('/quizzes/ai/generate', data),
  downloadImportTemplate: () => api.get('/quizzes/import-excel/template', { responseType: 'blob' }),
  importExcel: (formData) => api.post('/quizzes/import-excel', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  getAttempts: (id) => api.get(`/quizzes/${id}/attempts`),
  getAttemptDetail: (attemptId) => api.get(`/quizzes/teacher/attempts/${attemptId}`),
  gradeAnswer: (answerId, data) => api.put(`/quizzes/answers/${answerId}/grade`, data),
  // Student
  getMy: () => api.get('/quizzes/my'),
  start: (id) => api.post(`/quizzes/${id}/start`),
  saveAnswer: (attemptId, data) => api.put(`/quizzes/attempts/${attemptId}/answer`, data),
  logViolation: (attemptId, data) => api.post(`/quizzes/attempts/${attemptId}/violation`, data),
  submit: (attemptId, data) => api.post(`/quizzes/attempts/${attemptId}/submit`, data),
  getMyResult: (attemptId) => api.get(`/quizzes/attempts/${attemptId}/result`),
};

// Dashboard API
export const dashboardAPI = {
  admin: () => api.get('/dashboard/admin'),
  teacher: () => api.get('/dashboard/teacher'),
  student: () => api.get('/dashboard/student'),
};

// Notification API
export const notificationAPI = {
  getAll: (params = {}) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
  clearRead: () => api.delete('/notifications/clear-read'),
};

// Q&A API
export const qnaAPI = {
  getThreads: (params = {}) => api.get('/qna', { params }),
  getThread: (id) => api.get(`/qna/${id}`),
  createThread: (data) => api.post('/qna', data),
  reply: (id, data) => api.post(`/qna/${id}/replies`, data),
  setStatus: (id, status) => api.put(`/qna/${id}/status`, { status }),
  deleteThread: (id) => api.delete(`/qna/${id}`),
  deleteReply: (replyId) => api.delete(`/qna/replies/${replyId}`),
};

// TA API
export const taAPI = {
  getEligibility: () => api.get('/ta/eligibility'),
  getMy: () => api.get('/ta/my'),
  getMyActive: () => api.get('/ta/my/active'),
  apply: (data) => api.post('/ta/applications', data),
  // Teacher
  getTeacherApplications: () => api.get('/ta/teacher/applications'),
  approve: (id, data) => api.put(`/ta/applications/${id}/approve`, data),
  reject: (id, reviewNotes) => api.put(`/ta/applications/${id}/reject`, { reviewNotes }),
  relieve: (id, reviewNotes) => api.put(`/ta/applications/${id}/relieve`, { reviewNotes }),
  // Admin
  getAll: (params = {}) => api.get('/ta', { params }),
};

// Reports API
export const reportsAPI = {
  overview: () => api.get('/reports/overview'),
  enrollmentByProgram: () => api.get('/reports/enrollment-by-program'),
  gradeDistribution: (termId) => api.get('/reports/grade-distribution', { params: termId ? { termId } : {} }),
  coursePerformance: (termId) => api.get('/reports/course-performance', { params: termId ? { termId } : {} }),
  termTrends: () => api.get('/reports/term-trends'),
  admissionFunnel: () => api.get('/reports/admission-funnel'),
  attendanceSummary: (termId) => api.get('/reports/attendance-summary', { params: termId ? { termId } : {} }),
};

// Leave Management API
export const leaveAPI = {
  // Student
  getMy: () => api.get('/leave/my'),
  getMyFines: () => api.get('/leave/my/fines'),
  submitApplication: (data) => api.post('/leave/applications', data),
  // Teacher / Admin
  getOfferingStatus: (offeringId) => api.get(`/leave/offering/${offeringId}`),
  getPendingForTeacher: () => api.get('/leave/applications/teacher/pending'),
  approve: (id, reviewNotes) => api.put(`/leave/applications/${id}/approve`, { reviewNotes }),
  reject: (id, reviewNotes) => api.put(`/leave/applications/${id}/reject`, { reviewNotes }),
  // Shared
  getApplication: (id) => api.get(`/leave/applications/${id}`),
};

// Attendance API
export const attendanceAPI = {
  mark: (data) => api.post('/attendance', data),
  getSessions: (offeringId) => api.get(`/attendance/offering/${offeringId}/sessions`),
  getSessionDetail: (offeringId, date) => api.get(`/attendance/offering/${offeringId}/sessions/${date}`),
  getStudentSummary: (offeringId) => api.get(`/attendance/offering/${offeringId}/students`),
  getMy: () => api.get('/attendance/my'),
};

// Schedule API
export const scheduleAPI = {
  getConfig: () => api.get('/schedule/config'),
  updateConfig: (data) => api.put('/schedule/config', data),
  getSlots: () => api.get('/schedule/slots'),
  getAvailability: (params) => api.get('/schedule/availability', { params }),
  getOfferingSessions: (offeringId) => api.get(`/offerings/${offeringId}/sessions`),
  setOfferingSessions: (offeringId, sessions) => api.post(`/offerings/${offeringId}/sessions`, { sessions }),
};

// Room API
export const roomAPI = {
  getAll: (params = {}) => api.get('/rooms', { params }),
  create: (data) => api.post('/rooms', data),
  update: (id, data) => api.put(`/rooms/${id}`, data),
  delete: (id) => api.delete(`/rooms/${id}`),
};

// Holiday API
export const holidayAPI = {
  getAll: (params = {}) => api.get('/holidays', { params }),
  create: (data) => api.post('/holidays', data),
  delete: (id) => api.delete(`/holidays/${id}`),
};

// Grade-component API (course-level config)
export const gradeComponentAPI = {
  getTemplates:   () => api.get('/courses/templates'),
  listForCourse:  (courseId) => api.get(`/courses/${courseId}/grade-components`),
  replace:        (courseId, components) => api.post(`/courses/${courseId}/grade-components`, { components }),
  applyTemplate:  (courseId) => api.post(`/courses/${courseId}/grade-components/apply-template`),
};

// Mark-component API (per-student per-component scores)
export const markComponentAPI = {
  listForOffering: (offeringId) => api.get(`/offerings/${offeringId}/mark-components`),
  init:            (offeringId) => api.post(`/offerings/${offeringId}/mark-components/init`),
  update:          (id, data)   => api.put(`/mark-components/${id}`, data),
  setReleased:     (courseId, kind, released) =>
    api.put(`/courses/${courseId}/grade-components/${kind}/release`, { released }),
};

// Lecture API
export const lectureAPI = {
  list:    (offeringId) => api.get('/lectures', { params: { offeringId } }),
  create:  (formData)   => api.post('/lectures', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  update:  (id, formData) => api.put(`/lectures/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  delete:  (id) => api.delete(`/lectures/${id}`),
};

// Student-scoped API (course-centric view)
export const studentAPI = {
  myCourses:         () => api.get('/students/me/courses'),
  myTranscript:      () => api.get('/students/me/transcript'),
  courseDetail:      (offeringId) => api.get(`/students/me/course-detail/${offeringId}`),
  activeAssignments: () => api.get('/students/me/active-assignments'),
  activeQuizzes:     () => api.get('/students/me/active-quizzes'),
};

export default api;
