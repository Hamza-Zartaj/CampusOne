import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  GraduationCap, 
  BookOpen, 
  Shield,
  Search,
  X,
  ChevronRight,
  AlertCircle,
  Upload,
  Download,
  CheckCircle,
  XCircle,
  FileSpreadsheet
} from 'lucide-react';
import { userAPI } from '../utils/api';
import '../styles/UserManagement.css';

const UserManagement = () => {
  const [stats, setStats] = useState({
    admins: 0,
    teachers: 0,
    students: 0,
    tas: 0,
    total: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Modal states
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showPromoteTAModal, setShowPromoteTAModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  
  // Form states
  const [createUserForm, setCreateUserForm] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    role: 'student',
    // Student fields
    studentId: '',
    enrollmentYear: new Date().getFullYear(),
    department: '',
    batch: '',
    currentSemester: 1,
    // Teacher/Admin fields
    employeeId: '',
    designation: '',
    permissions: []
  });
  
  // TA Promotion states
  const [studentSearch, setStudentSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searching, setSearching] = useState(false);
  
  // Bulk Upload states
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResults, setUploadResults] = useState(null);
  
  // Get current user info
  const [currentUser, setCurrentUser] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentUser(userData);
    
    fetchAdminStatus(userData);
    fetchStats();
  }, []);

  const fetchAdminStatus = async (userData) => {
    try {
      // Check both _id and id fields
      const userId = userData._id || userData.id;
      
      console.log('Fetching admin status for user:', userId);
      
      if (userId) {
        // Fetch current user details including admin record
        const response = await userAPI.getUserById(userId);
        console.log('Admin status response:', response.data);
        
        if (response.data.success && response.data.data.roleData) {
          const adminData = response.data.data.roleData;
          console.log('Admin data:', adminData);
          console.log('Is Super Admin:', adminData.isSuperAdmin);
          setIsSuperAdmin(adminData.isSuperAdmin || false);
        }
      }
    } catch (err) {
      console.error('Error fetching admin status:', err);
      // If it fails, assume not super admin
      setIsSuperAdmin(false);
    }
  };

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await userAPI.getUserStatsByRole();
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to fetch user statistics');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUserChange = (e) => {
    const { name, value } = e.target;
    setCreateUserForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePermissionChange = (permission) => {
    setCreateUserForm(prev => {
      const permissions = prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission];
      return { ...prev, permissions };
    });
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      // Validate based on role
      if (createUserForm.role === 'student' && !createUserForm.studentId) {
        setError('Student ID is required');
        return;
      }
      if ((createUserForm.role === 'teacher' || createUserForm.role === 'admin') && !createUserForm.employeeId) {
        setError('Employee ID is required');
        return;
      }

      // Prepare data based on role
      const userData = {
        name: createUserForm.name,
        email: createUserForm.email,
        username: createUserForm.username,
        password: createUserForm.password,
        role: createUserForm.role
      };

      if (createUserForm.role === 'student') {
        userData.studentId = createUserForm.studentId;
        userData.enrollmentYear = parseInt(createUserForm.enrollmentYear);
        userData.department = createUserForm.department;
        userData.batch = createUserForm.batch;
        userData.currentSemester = parseInt(createUserForm.currentSemester);
      } else if (createUserForm.role === 'teacher') {
        userData.employeeId = createUserForm.employeeId;
        userData.department = createUserForm.department;
        userData.designation = createUserForm.designation || 'Lecturer';
      } else if (createUserForm.role === 'admin') {
        userData.employeeId = createUserForm.employeeId;
        userData.department = createUserForm.department;
        userData.designation = createUserForm.designation || 'Administrator';
        userData.permissions = createUserForm.permissions.length > 0 
          ? createUserForm.permissions 
          : ['manage_users', 'manage_courses'];
      }

      const response = await userAPI.createUser(userData);
      
      if (response.data.success) {
        setSuccess(`${createUserForm.role.charAt(0).toUpperCase() + createUserForm.role.slice(1)} created successfully!`);
        setShowCreateUserModal(false);
        fetchStats();
        // Reset form
        setCreateUserForm({
          name: '',
          email: '',
          username: '',
          password: '',
          role: 'student',
          studentId: '',
          enrollmentYear: new Date().getFullYear(),
          department: '',
          batch: '',
          currentSemester: 1,
          employeeId: '',
          designation: '',
          permissions: []
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user');
    }
  };

  const handleStudentSearch = async (query) => {
    setStudentSearch(query);
    
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      setSearching(true);
      const response = await userAPI.searchStudents(query);
      if (response.data.success) {
        setSearchResults(response.data.data);
      }
    } catch (err) {
      console.error('Search error:', err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handlePromoteToTA = async () => {
    if (!selectedStudent) {
      setError('Please select a student');
      return;
    }

    setError('');
    setSuccess('');

    try {
      const response = await userAPI.promoteStudentToTA(selectedStudent.userId);
      
      if (response.data.success) {
        setSuccess(`${selectedStudent.name} has been promoted to TA successfully!`);
        setShowPromoteTAModal(false);
        setSelectedStudent(null);
        setStudentSearch('');
        setSearchResults([]);
        fetchStats();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to promote student to TA');
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await userAPI.downloadBulkUploadTemplate();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'student_bulk_upload_template.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Failed to download template');
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];
      if (!validTypes.includes(file.type)) {
        setError('Please select a valid Excel file (.xlsx or .xls)');
        return;
      }
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }
      setSelectedFile(file);
      setError('');
    }
  };

  const handleBulkUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    setError('');
    setSuccess('');
    setUploading(true);
    setUploadResults(null);

    try {
      const response = await userAPI.bulkUploadStudents(selectedFile);
      
      if (response.data.success) {
        setUploadResults(response.data.results);
        if (response.data.results.successful.length > 0) {
          setSuccess(`Successfully uploaded ${response.data.results.successful.length} student(s)`);
          fetchStats();
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleCloseBulkUploadModal = () => {
    setShowBulkUploadModal(false);
    setSelectedFile(null);
    setUploadResults(null);
    setError('');
  };

  // Filter stats based on Super Admin status
  const allRoleStats = [
    {
      icon: Shield,
      label: 'Admins',
      value: stats.admins,
      color: '#ef4444',
      gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      superAdminOnly: true
    },
    {
      icon: BookOpen,
      label: 'Teachers',
      value: stats.teachers,
      color: '#3b82f6',
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
    },
    {
      icon: Users,
      label: 'Students',
      value: stats.students,
      color: '#10b981',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
    },
    {
      icon: GraduationCap,
      label: 'TAs',
      value: stats.tas,
      color: '#f59e0b',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
    }
  ];

  // Only show admin stats to Super Admins
  const roleStats = allRoleStats.filter(stat => 
    !stat.superAdminOnly || isSuperAdmin
  );

  const availablePermissions = [
    { id: 'manage_users', label: 'Manage Users' },
    { id: 'manage_courses', label: 'Manage Courses' },
    { id: 'manage_assignments', label: 'Manage Assignments' },
    { id: 'manage_attendance', label: 'Manage Attendance' },
    { id: 'manage_announcements', label: 'Manage Announcements' },
    { id: 'view_reports', label: 'View Reports' },
    { id: 'manage_ta_eligibility', label: 'Manage TA Eligibility' },
    { id: 'manage_quiz', label: 'Manage Quiz' }
  ];

  if (loading) {
    return (
      <div className="user-management-page">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  return (
    <div className="user-management-page">
      <div className="page-header">
        <div className="header-content">
          <h1>User Management</h1>
          <p className="header-subtitle">Manage users, roles, and permissions</p>
        </div>
        <div className="header-actions">
          <button 
            className="btn btn-secondary"
            onClick={() => {
              setShowPromoteTAModal(true);
              setError('');
            }}
          >
            <GraduationCap size={18} />
            Promote to TA
          </button>
          <button 
            className="btn btn-secondary"
            onClick={() => {
              setShowBulkUploadModal(true);
              setError('');
            }}
          >
            <Upload size={18} />
            Bulk Upload
          </button>
          <button 
            className="btn btn-primary"
            onClick={() => {
              setShowCreateUserModal(true);
              setError('');
            }}
          >
            <UserPlus size={18} />
            Create User
          </button>
        </div>
      </div>

      {/* Success Alert - Only show at page level */}
      {success && (
        <div className="alert alert-success">
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="alert-close">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="stats-grid">
        {roleStats.map((stat, index) => (
          <div key={index} className="stat-card" style={{ '--card-gradient': stat.gradient }}>
            <div className="stat-icon-wrapper">
              <div className="stat-icon" style={{ backgroundColor: `${stat.color}15`, color: stat.color }}>
                <stat.icon size={28} />
              </div>
            </div>
            <div className="stat-details">
              <p className="stat-label">{stat.label}</p>
              <h2 className="stat-value">{stat.value}</h2>
            </div>
            <div className="stat-background"></div>
          </div>
        ))}
      </div>

      {/* Create User Modal */}
      {showCreateUserModal && (
        <div className="modal-overlay" onClick={() => {
          setShowCreateUserModal(false);
          setError('');
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New User</h2>
              <button className="modal-close" onClick={() => {
                setShowCreateUserModal(false);
                setError('');
              }}>
                <X size={20} />
              </button>
            </div>
            
            {/* Error Alert inside modal */}
            {error && (
              <div className="alert alert-error" style={{ margin: '1rem 1.5rem 0' }}>
                <AlertCircle size={18} />
                <span>{error}</span>
                <button onClick={() => setError('')} className="alert-close">
                  <X size={16} />
                </button>
              </div>
            )}
            
            <form onSubmit={handleCreateUser} className="user-form">
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="role">User Role *</label>
                  <select
                    id="role"
                    name="role"
                    value={createUserForm.role}
                    onChange={handleCreateUserChange}
                    required
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    {isSuperAdmin && <option value="admin">Admin</option>}
                  </select>
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="name">Full Name *</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={createUserForm.name}
                    onChange={handleCreateUserChange}
                    required
                    placeholder="Enter full name"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="email">Email *</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={createUserForm.email}
                    onChange={handleCreateUserChange}
                    required
                    placeholder="user@example.com"
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="username">Username</label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={createUserForm.username}
                    onChange={handleCreateUserChange}
                    placeholder="Leave blank to auto-generate"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="password">Password *</label>
                  <input
                    type="password"
                    id="password"
                    name="password"
                    value={createUserForm.password}
                    onChange={handleCreateUserChange}
                    required
                    minLength={6}
                    placeholder="Minimum 6 characters"
                  />
                </div>
              </div>

              {/* Student-specific fields */}
              {createUserForm.role === 'student' && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="studentId">Student ID *</label>
                      <input
                        type="text"
                        id="studentId"
                        name="studentId"
                        value={createUserForm.studentId}
                        onChange={handleCreateUserChange}
                        required
                        placeholder="e.g., 2024-CS-001"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="enrollmentYear">Enrollment Year *</label>
                      <input
                        type="number"
                        id="enrollmentYear"
                        name="enrollmentYear"
                        value={createUserForm.enrollmentYear}
                        onChange={handleCreateUserChange}
                        required
                        min="2000"
                        max="2100"
                      />
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="department">Department *</label>
                      <input
                        type="text"
                        id="department"
                        name="department"
                        value={createUserForm.department}
                        onChange={handleCreateUserChange}
                        required
                        placeholder="e.g., Computer Science"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="batch">Batch</label>
                      <input
                        type="text"
                        id="batch"
                        name="batch"
                        value={createUserForm.batch}
                        onChange={handleCreateUserChange}
                        placeholder="e.g., 2024"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="currentSemester">Current Semester *</label>
                      <input
                        type="number"
                        id="currentSemester"
                        name="currentSemester"
                        value={createUserForm.currentSemester}
                        onChange={handleCreateUserChange}
                        required
                        min="1"
                        max="8"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Teacher/Admin-specific fields */}
              {(createUserForm.role === 'teacher' || createUserForm.role === 'admin') && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="employeeId">Employee ID *</label>
                      <input
                        type="text"
                        id="employeeId"
                        name="employeeId"
                        value={createUserForm.employeeId}
                        onChange={handleCreateUserChange}
                        required
                        placeholder="e.g., EMP-001"
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="department">Department *</label>
                      <input
                        type="text"
                        id="department"
                        name="department"
                        value={createUserForm.department}
                        onChange={handleCreateUserChange}
                        required
                        placeholder="e.g., Computer Science"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="designation">Designation</label>
                      {createUserForm.role === 'teacher' ? (
                        <select
                          id="designation"
                          name="designation"
                          value={createUserForm.designation}
                          onChange={handleCreateUserChange}
                        >
                          <option value="">Select designation</option>
                          <option value="Professor">Professor</option>
                          <option value="Associate Professor">Associate Professor</option>
                          <option value="Assistant Professor">Assistant Professor</option>
                          <option value="Lecturer">Lecturer</option>
                          <option value="Visiting Faculty">Visiting Faculty</option>
                        </select>
                      ) : (
                        <input
                          type="text"
                          id="designation"
                          name="designation"
                          value={createUserForm.designation}
                          onChange={handleCreateUserChange}
                          placeholder="e.g., Administrator"
                        />
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Admin permissions */}
              {createUserForm.role === 'admin' && (
                <div className="form-group">
                  <label>Permissions</label>
                  <div className="permissions-grid">
                    {availablePermissions.map(permission => (
                      <label key={permission.id} className="permission-checkbox">
                        <input
                          type="checkbox"
                          checked={createUserForm.permissions.includes(permission.id)}
                          onChange={() => handlePermissionChange(permission.id)}
                        />
                        <span>{permission.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowCreateUserModal(false);
                    setError('');
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Promote to TA Modal */}
      {showPromoteTAModal && (
        <div className="modal-overlay" onClick={() => {
          setShowPromoteTAModal(false);
          setError('');
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Promote Student to TA</h2>
              <button className="modal-close" onClick={() => {
                setShowPromoteTAModal(false);
                setError('');
              }}>
                <X size={20} />
              </button>
            </div>
            
            {/* Error Alert inside modal */}
            {error && (
              <div className="alert alert-error" style={{ margin: '1rem 1.5rem 0' }}>
                <AlertCircle size={18} />
                <span>{error}</span>
                <button onClick={() => setError('')} className="alert-close">
                  <X size={16} />
                </button>
              </div>
            )}
            
            <div className="ta-promotion-form">
              <div className="form-group">
                <label htmlFor="studentSearch">Search for Student</label>
                <div className="search-input-wrapper">
                  <Search size={18} className="search-icon" />
                  <input
                    type="text"
                    id="studentSearch"
                    value={studentSearch}
                    onChange={(e) => handleStudentSearch(e.target.value)}
                    placeholder="Search by name, email, or student ID..."
                    className="search-input"
                  />
                  {searching && <div className="search-loading">Searching...</div>}
                </div>
              </div>

              {searchResults.length > 0 && (
                <div className="search-results">
                  {searchResults.map(student => (
                    <div
                      key={student.userId}
                      className={`search-result-item ${selectedStudent?.userId === student.userId ? 'selected' : ''}`}
                      onClick={() => setSelectedStudent(student)}
                    >
                      <div className="student-info">
                        <h4>{student.name}</h4>
                        <p>{student.email}</p>
                        <div className="student-details">
                          <span className="badge">{student.studentId}</span>
                          <span className="badge">{student.department}</span>
                          <span className="badge">Semester {student.semester}</span>
                        </div>
                      </div>
                      {selectedStudent?.userId === student.userId && (
                        <ChevronRight size={20} className="selected-icon" />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {selectedStudent && (
                <div className="selected-student-card">
                  <h3>Selected Student</h3>
                  <div className="student-card-content">
                    <p><strong>Name:</strong> {selectedStudent.name}</p>
                    <p><strong>Email:</strong> {selectedStudent.email}</p>
                    <p><strong>Student ID:</strong> {selectedStudent.studentId}</p>
                    <p><strong>Department:</strong> {selectedStudent.department}</p>
                  </div>
                </div>
              )}

              <div className="form-actions">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowPromoteTAModal(false);
                    setSelectedStudent(null);
                    setStudentSearch('');
                    setSearchResults([]);
                    setError('');
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary"
                  onClick={handlePromoteToTA}
                  disabled={!selectedStudent}
                >
                  Promote to TA
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulkUploadModal && (
        <div className="modal-overlay" onClick={handleCloseBulkUploadModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Bulk Upload Students</h2>
              <button className="modal-close" onClick={handleCloseBulkUploadModal}>
                <X size={20} />
              </button>
            </div>
            
            {/* Error Alert inside modal */}
            {error && (
              <div className="alert alert-error" style={{ margin: '1rem 1.5rem 0' }}>
                <AlertCircle size={18} />
                <span>{error}</span>
                <button onClick={() => setError('')} className="alert-close">
                  <X size={16} />
                </button>
              </div>
            )}
            
            <div className="bulk-upload-form">
              {!uploadResults ? (
                <>
                  <div className="upload-instructions">
                    <h3>Upload Instructions:</h3>
                    <ol>
                      <li>Download the Excel template using the button below</li>
                      <li>Fill in the student information in the template</li>
                      <li>Save the file and upload it here</li>
                      <li>The system will validate and import the data</li>
                    </ol>
                  </div>

                  <button 
                    className="btn btn-secondary download-template-btn"
                    onClick={handleDownloadTemplate}
                  >
                    <Download size={18} />
                    Download Template
                  </button>

                  <div className="file-upload-section">
                    <label htmlFor="bulkUploadFile" className="file-upload-label">
                      <FileSpreadsheet size={48} />
                      <p className="upload-text">
                        {selectedFile ? selectedFile.name : 'Click to select Excel file or drag and drop'}
                      </p>
                      <p className="upload-subtext">
                        Supported: .xlsx, .xls (Max 5MB)
                      </p>
                    </label>
                    <input
                      type="file"
                      id="bulkUploadFile"
                      accept=".xlsx,.xls"
                      onChange={handleFileSelect}
                      style={{ display: 'none' }}
                    />
                  </div>

                  <div className="form-actions">
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={handleCloseBulkUploadModal}
                    >
                      Cancel
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-primary"
                      onClick={handleBulkUpload}
                      disabled={!selectedFile || uploading}
                    >
                      {uploading ? (
                        <>
                          <span className="spinner-small"></span>
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Upload size={18} />
                          Upload File
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="upload-results">
                    <div className="results-summary">
                      <h3>Upload Results</h3>
                      <div className="summary-stats">
                        <div className="summary-stat success">
                          <CheckCircle size={24} />
                          <div>
                            <p className="stat-label">Successful</p>
                            <p className="stat-value">{uploadResults.successful.length}</p>
                          </div>
                        </div>
                        <div className="summary-stat failed">
                          <XCircle size={24} />
                          <div>
                            <p className="stat-label">Failed</p>
                            <p className="stat-value">{uploadResults.failed.length}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {uploadResults.successful.length > 0 && (
                      <div className="results-section success-section">
                        <h4>✓ Successfully Added ({uploadResults.successful.length})</h4>
                        <div className="results-list">
                          {uploadResults.successful.map((item, index) => (
                            <div key={index} className="result-item success-item">
                              <span className="row-number">Row {item.row}</span>
                              <div className="student-info">
                                <p className="student-name">{item.data.name}</p>
                                <p className="student-details">
                                  {item.data.email} • {item.data.studentId}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {uploadResults.failed.length > 0 && (
                      <div className="results-section failed-section">
                        <h4>✗ Failed to Add ({uploadResults.failed.length})</h4>
                        <div className="results-list">
                          {uploadResults.failed.map((item, index) => (
                            <div key={index} className="result-item failed-item">
                              <span className="row-number">Row {item.row}</span>
                              <div className="error-info">
                                <p className="error-message">{item.error}</p>
                                <p className="error-details">
                                  {item.data['Full Name']} • {item.data['Email']}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="form-actions">
                    <button 
                      type="button" 
                      className="btn btn-primary"
                      onClick={handleCloseBulkUploadModal}
                    >
                      Close
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
