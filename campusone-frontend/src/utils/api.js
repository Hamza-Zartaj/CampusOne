import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
      // Only redirect to login if we're not already on the login page
      // and if the error is due to an invalid/expired token (not wrong credentials)
      const currentPath = window.location.pathname;
      const isLoginError = error.config?.url?.includes('/auth/login');
      
      if (currentPath !== '/login' && !isLoginError) {
        // Unauthorized - clear token and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
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
  getTranscript: (studentId) => api.get(`/enrollments/students/${studentId}/transcript`),
  getCGPA: (studentId) => api.get(`/enrollments/students/${studentId}/cgpa`),
  getCurrent: (studentId) => api.get(`/enrollments/students/${studentId}/current`),
};

// Semester Incharge API
export const semesterInchargeAPI = {
  getAll: (params = {}) => api.get('/semester-incharges', { params }),
  getMy: () => api.get('/semester-incharges/my'),
  assign: (data) => api.post('/semester-incharges', data),
  relieve: (id) => api.put(`/semester-incharges/${id}/relieve`),
  delete: (id) => api.delete(`/semester-incharges/${id}`),
};

export default api;
