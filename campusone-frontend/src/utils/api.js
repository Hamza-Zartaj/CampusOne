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
  
  promoteStudentToTA: (studentUserId, courseIds = []) => 
    api.post('/users/promote-to-ta', { studentUserId, courseIds }),
  
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

// Course API
export const courseAPI = {
  getAllCourses: (params = {}) =>
    api.get('/courses', { params }),

  getCourseById: (id) =>
    api.get(`/courses/${id}`),

  getCourseByCode: (code) =>
    api.get(`/courses/code/${code}`),

  createCourse: (courseData) =>
    api.post('/courses', courseData),

  updateCourse: (id, courseData) =>
    api.put(`/courses/${id}`, courseData),

  deleteCourse: (id) =>
    api.delete(`/courses/${id}`),

  restoreCourse: (id) =>
    api.post(`/courses/${id}/restore`),

  permanentDeleteCourse: (id) =>
    api.delete(`/courses/${id}/permanent`),

  getDomains: () =>
    api.get('/courses/domains'),

  getPrereqTree: (id) =>
    api.get(`/courses/${id}/prereq-tree`),

  getCoursesByDepartment: (departmentId, params = {}) =>
    api.get(`/courses/department/${departmentId}`, { params }),

  getCoursesByProgram: (programId, params = {}) =>
    api.get(`/courses/program/${programId}`, { params }),
};

// Department API
export const departmentAPI = {
  getAllDepartments: (params = {}) =>
    api.get('/departments', { params }),

  getDepartmentById: (id) =>
    api.get(`/departments/${id}`),

  createDepartment: (data) =>
    api.post('/departments', data),

  updateDepartment: (id, data) =>
    api.put(`/departments/${id}`, data),

  deleteDepartment: (id) =>
    api.delete(`/departments/${id}`),

  restoreDepartment: (id) =>
    api.post(`/departments/${id}/restore`),

  permanentDeleteDepartment: (id) =>
    api.delete(`/departments/${id}/permanent`),
};

// Program API
export const programAPI = {
  getAllPrograms: (params = {}) =>
    api.get('/programs', { params }),

  getProgramById: (id) =>
    api.get(`/programs/${id}`),

  getProgramsByDepartment: (departmentId, params = {}) =>
    api.get(`/programs/department/${departmentId}`, { params }),

  createProgram: (data) =>
    api.post('/programs', data),

  updateProgram: (id, data) =>
    api.put(`/programs/${id}`, data),

  deleteProgram: (id) =>
    api.delete(`/programs/${id}`),

  restoreProgram: (id) =>
    api.post(`/programs/${id}/restore`),

  permanentDeleteProgram: (id) =>
    api.delete(`/programs/${id}/permanent`),

  // Curriculum
  getCurriculum: (programId) =>
    api.get(`/programs/${programId}/curriculum`),

  getCurriculumBySemester: (programId, semesterNumber) =>
    api.get(`/programs/${programId}/curriculum/semester/${semesterNumber}`),

  updateCurriculum: (programId, curriculum) =>
    api.put(`/programs/${programId}/curriculum`, { curriculum }),

  updateSemesterCurriculum: (programId, semesterNumber, data) =>
    api.put(`/programs/${programId}/curriculum/semester/${semesterNumber}`, data),

  addCourseToSemester: (programId, semesterNumber, courseId, isCompulsory = true) =>
    api.post(`/programs/${programId}/curriculum/semester/${semesterNumber}/course`, { courseId, isCompulsory }),

  removeCourseFromSemester: (programId, semesterNumber, courseId) =>
    api.delete(`/programs/${programId}/curriculum/semester/${semesterNumber}/course/${courseId}`),

  addElectiveSlot: (programId, semesterNumber, slotData) =>
    api.post(`/programs/${programId}/curriculum/semester/${semesterNumber}/elective`, slotData),

  removeElectiveSlot: (programId, semesterNumber, slotIndex) =>
    api.delete(`/programs/${programId}/curriculum/semester/${semesterNumber}/elective/${slotIndex}`),
};

// Course Offering API
export const courseOfferingAPI = {
  getAllOfferings: (params = {}) =>
    api.get('/course-offerings', { params }),

  getOfferingById: (id) =>
    api.get(`/course-offerings/${id}`),

  getOfferingsByProgramSemester: (programId, params = {}) =>
    api.get(`/course-offerings/program/${programId}/semester`, { params }),

  getOfferingsByTeacher: (teacherId, params = {}) =>
    api.get(`/course-offerings/teacher/${teacherId}`, { params }),

  getOfferingsByCourse: (courseId, params = {}) =>
    api.get(`/course-offerings/course/${courseId}`, { params }),

  createOffering: (data) =>
    api.post('/course-offerings', data),

  updateOffering: (id, data) =>
    api.put(`/course-offerings/${id}`, data),

  deleteOffering: (id) =>
    api.delete(`/course-offerings/${id}`),

  restoreOffering: (id) =>
    api.post(`/course-offerings/${id}/restore`),

  bulkCreateOfferings: (offerings) =>
    api.post('/course-offerings/bulk', { offerings }),

  assignInstructor: (id, teacherId) =>
    api.put(`/course-offerings/${id}/instructor`, { teacherId }),

  assignTAs: (id, taIds) =>
    api.put(`/course-offerings/${id}/tas`, { taIds }),

  updateSchedule: (id, schedule) =>
    api.put(`/course-offerings/${id}/schedule`, { schedule }),

  updateCapacity: (id, maxCapacity) =>
    api.put(`/course-offerings/${id}/capacity`, { maxCapacity }),
};

// Enrollment API
export const enrollmentAPI = {
  getAll: (params = {}) =>
    api.get('/enrollments', { params }),

  getById: (id) =>
    api.get(`/enrollments/${id}`),

  getStudentEnrollments: (studentId, params = {}) =>
    api.get(`/enrollments/student/${studentId}`, { params }),

  getOfferingEnrollments: (courseOfferingId, params = {}) =>
    api.get(`/enrollments/offering/${courseOfferingId}`, { params }),

  enroll: (studentId, courseOfferingId, enrollmentType = 'regular', forceEnroll = false) =>
    api.post('/enrollments', { studentId, courseOfferingId, enrollmentType, forceEnroll }),

  bulkEnroll: (studentIds, courseOfferingId, enrollmentType = 'regular', skipPrerequisites = false) =>
    api.post('/enrollments/bulk', { studentIds, courseOfferingId, enrollmentType, skipPrerequisites }),

  drop: (id, reason = '') =>
    api.put(`/enrollments/${id}/drop`, { reason }),

  withdraw: (id, reason = '') =>
    api.put(`/enrollments/${id}/withdraw`, { reason }),

  activate: (id) =>
    api.put(`/enrollments/${id}/activate`),

  deleteEnrollment: (id) =>
    api.delete(`/enrollments/${id}`),

  restoreEnrollment: (id) =>
    api.put(`/enrollments/${id}/restore`),

  updateGrade: (id, gradeData) =>
    api.put(`/enrollments/${id}/grade`, gradeData),

  checkPrerequisites: (studentId, courseId) =>
    api.get('/enrollments/check-prerequisites', { params: { studentId, courseId } }),

  getWaitlist: (courseOfferingId) =>
    api.get(`/enrollments/waitlist/${courseOfferingId}`),

  getWaitlistPosition: (enrollmentId) =>
    api.get(`/enrollments/waitlist-position/${enrollmentId}`),

  getTranscript: (studentId) =>
    api.get(`/enrollments/transcript/${studentId}`),

  calculateCGPA: (studentId) =>
    api.get(`/enrollments/cgpa/${studentId}`),

  getSemesterSummary: (studentId, academicYear, semesterNumber) =>
    api.get(`/enrollments/semester-summary/${studentId}/${academicYear}/${semesterNumber}`),
};

// Semester Incharge API
export const semesterInchargeAPI = {
  getAll: (params = {}) =>
    api.get('/semester-incharges', { params }),

  getById: (id) =>
    api.get(`/semester-incharges/${id}`),

  lookup: (params) =>
    api.get('/semester-incharges/lookup', { params }),

  getByTeacher: (teacherId, params = {}) =>
    api.get(`/semester-incharges/teacher/${teacherId}`, { params }),

  assign: (data) =>
    api.post('/semester-incharges', data),

  replace: (data) =>
    api.put('/semester-incharges/replace', data),

  update: (id, data) =>
    api.put(`/semester-incharges/${id}`, data),

  relieve: (id, remarks) =>
    api.put(`/semester-incharges/${id}/relieve`, { remarks }),
};

// Teacher Tools API
export const teacherToolsAPI = {
  getMyOfferings: (params = {}) =>
    api.get('/teacher-tools/my-offerings', { params }),

  getEnrolledStudents: (offeringId, params = {}) =>
    api.get(`/teacher-tools/offerings/${offeringId}/students`, { params }),

  getMarksTemplate: (offeringId) =>
    api.get(`/teacher-tools/offerings/${offeringId}/marks-template`),

  uploadStudentMarks: (enrollmentId, marks) =>
    api.put(`/teacher-tools/enrollments/${enrollmentId}/marks`, marks),

  bulkUploadMarks: (offeringId, marks) =>
    api.put(`/teacher-tools/offerings/${offeringId}/bulk-marks`, { marks }),

  submitStudentGrade: (enrollmentId, gradeData) =>
    api.put(`/teacher-tools/enrollments/${enrollmentId}/grade`, gradeData),

  submitFinalGrades: (offeringId, data) =>
    api.put(`/teacher-tools/offerings/${offeringId}/submit-grades`, data),

  getGradeSummary: (offeringId) =>
    api.get(`/teacher-tools/offerings/${offeringId}/grade-summary`),

  exportGrades: (offeringId, format = 'json') =>
    api.get(`/teacher-tools/offerings/${offeringId}/export-grades`, { params: { format } }),

  lockResults: (offeringId) =>
    api.put(`/teacher-tools/offerings/${offeringId}/lock-results`),

  unlockResults: (offeringId, reason) =>
    api.put(`/teacher-tools/offerings/${offeringId}/unlock-results`, { reason }),
};

// Student Portal API
export const studentPortalAPI = {
  getMyProfile: () =>
    api.get('/student/profile'),

  getCurrentCourses: (params = {}) =>
    api.get('/student/current-courses', { params }),

  getMyTimetable: (params = {}) =>
    api.get('/student/timetable', { params }),

  getAvailableOfferings: (params = {}) =>
    api.get('/student/available-offerings', { params }),

  enrollInCourse: (courseOfferingId, enrollmentType = 'regular') =>
    api.post('/student/enroll', { courseOfferingId, enrollmentType }),

  dropCourse: (enrollmentId, reason = '') =>
    api.put(`/student/drop/${enrollmentId}`, { reason }),

  swapSection: (currentEnrollmentId, newOfferingId) =>
    api.put('/student/swap', { currentEnrollmentId, newOfferingId }),

  getMyWaitlist: () =>
    api.get('/student/waitlist'),

  getMyGrades: (params = {}) =>
    api.get('/student/grades', { params }),

  getMyTranscript: () =>
    api.get('/student/transcript'),

  getMyCGPA: () =>
    api.get('/student/cgpa'),

  checkMyPrerequisites: (courseId) =>
    api.get(`/student/check-prerequisites/${courseId}`),
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

export default api;
