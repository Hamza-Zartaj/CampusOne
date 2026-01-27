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
    studentId: '',
    enrollmentYear: new Date().getFullYear(),
    department: '',
    batch: '',
    currentSemester: 1,
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
      const userId = userData._id || userData.id;
      if (userId) {
        const response = await userAPI.getUserById(userId);
        if (response.data.success && response.data.data.roleData) {
          setIsSuperAdmin(response.data.data.roleData.isSuperAdmin || false);
        }
      }
    } catch (err) {
      console.error('Error fetching admin status:', err);
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
    setCreateUserForm(prev => ({ ...prev, [name]: value }));
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
      if (createUserForm.role === 'student' && !createUserForm.studentId) {
        setError('Student ID is required');
        return;
      }
      if ((createUserForm.role === 'teacher' || createUserForm.role === 'admin') && !createUserForm.employeeId) {
        setError('Employee ID is required');
        return;
      }

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
        setCreateUserForm({
          name: '', email: '', username: '', password: '', role: 'student',
          studentId: '', enrollmentYear: new Date().getFullYear(), department: '',
          batch: '', currentSemester: 1, employeeId: '', designation: '', permissions: []
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
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-excel'
      ];
      if (!validTypes.includes(file.type)) {
        setError('Please select a valid Excel file (.xlsx or .xls)');
        return;
      }
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

  const allRoleStats = [
    { icon: Shield, label: 'Admins', value: stats.admins, color: '#ef4444', gradient: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', superAdminOnly: true },
    { icon: BookOpen, label: 'Teachers', value: stats.teachers, color: '#3b82f6', gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' },
    { icon: Users, label: 'Students', value: stats.students, color: '#10b981', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' },
    { icon: GraduationCap, label: 'TAs', value: stats.tas, color: '#f59e0b', gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }
  ];

  const roleStats = allRoleStats.filter(stat => !stat.superAdminOnly || isSuperAdmin);

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

  // Reusable classes
  const inputClass = "w-full py-2.5 px-3.5 border border-gray-200 rounded-lg text-[0.95rem] transition-all focus:outline-none focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10";
  const labelClass = "block text-[0.9rem] font-medium text-slate-800 mb-2";
  const btnPrimaryClass = "inline-flex items-center gap-2 py-2.5 px-5 border-none rounded-lg text-[0.95rem] font-medium cursor-pointer transition-all bg-gradient-primary text-white hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(59,130,246,0.3)] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none";
  const btnSecondaryClass = "inline-flex items-center gap-2 py-2.5 px-5 border border-gray-200 rounded-lg text-[0.95rem] font-medium cursor-pointer transition-all bg-white text-slate-800 hover:bg-slate-50 hover:border-gray-300";

  if (loading) {
    return (
      <div className="p-8 max-w-[1400px] mx-auto max-md:p-4">
        <div className="flex justify-center items-center min-h-[400px] text-lg text-slate-500">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto max-md:p-4">
      {/* Page Header */}
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4 max-md:flex-col max-md:items-start">
        <div>
          <h1 className="text-[2rem] font-bold text-slate-800 m-0">User Management</h1>
          <p className="text-[0.95rem] text-slate-500 mt-1">Manage users, roles, and permissions</p>
        </div>
        <div className="flex gap-3 max-md:w-full">
          <button className={`${btnSecondaryClass} max-md:flex-1 max-md:justify-center`} onClick={() => { setShowPromoteTAModal(true); setError(''); }}>
            <GraduationCap size={18} />
            Promote to TA
          </button>
          <button className={`${btnSecondaryClass} max-md:flex-1 max-md:justify-center`} onClick={() => { setShowBulkUploadModal(true); setError(''); }}>
            <Upload size={18} />
            Bulk Upload
          </button>
          <button className={`${btnPrimaryClass} max-md:flex-1 max-md:justify-center`} onClick={() => { setShowCreateUserModal(true); setError(''); }}>
            <UserPlus size={18} />
            Create User
          </button>
        </div>
      </div>

      {/* Success Alert */}
      {success && (
        <div className="flex items-center gap-3 py-4 px-5 rounded-lg mb-6 text-[0.95rem] bg-green-50 text-green-800 border border-green-200">
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="ml-auto bg-transparent border-none cursor-pointer text-inherit opacity-70 hover:opacity-100 transition-opacity">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-6 mb-8 max-md:grid-cols-1">
        {roleStats.map((stat, index) => (
          <div key={index} className="relative bg-white rounded-xl p-7 shadow-sm overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-md">
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: stat.gradient }}></div>
            <div className="absolute top-0 right-0 w-[120px] h-[120px] opacity-5 rounded-full translate-x-[30%] -translate-y-[30%]" style={{ background: stat.gradient }}></div>
            <div className="mb-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl" style={{ backgroundColor: `${stat.color}15`, color: stat.color }}>
                <stat.icon size={28} />
              </div>
            </div>
            <div className="relative z-[1]">
              <p className="text-[0.9rem] text-slate-500 m-0 mb-2 font-medium">{stat.label}</p>
              <h2 className="text-4xl font-bold text-slate-800 m-0">{stat.value}</h2>
            </div>
          </div>
        ))}
      </div>

      {/* Create User Modal */}
      {showCreateUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4 animate-fade-in" onClick={() => { setShowCreateUserModal(false); setError(''); }}>
          <div className="bg-white rounded-xl max-w-[700px] w-full max-h-[90vh] overflow-y-auto shadow-xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-slate-800 m-0">Create New User</h2>
              <button className="bg-transparent border-none cursor-pointer text-slate-500 hover:text-slate-800 transition-colors p-1" onClick={() => { setShowCreateUserModal(false); setError(''); }}>
                <X size={20} />
              </button>
            </div>
            
            {error && (
              <div className="flex items-center gap-3 py-4 px-5 rounded-lg mx-6 mt-4 text-[0.95rem] bg-red-50 text-red-800 border border-red-200">
                <AlertCircle size={18} />
                <span>{error}</span>
                <button onClick={() => setError('')} className="ml-auto bg-transparent border-none cursor-pointer text-inherit opacity-70 hover:opacity-100"><X size={16} /></button>
              </div>
            )}
            
            <form onSubmit={handleCreateUser} className="p-6">
              <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-4">
                <div className="mb-4">
                  <label className={labelClass} htmlFor="role">User Role *</label>
                  <select id="role" name="role" value={createUserForm.role} onChange={handleCreateUserChange} required className={inputClass}>
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    {isSuperAdmin && <option value="admin">Admin</option>}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-4">
                <div className="mb-4">
                  <label className={labelClass} htmlFor="name">Full Name *</label>
                  <input type="text" id="name" name="name" value={createUserForm.name} onChange={handleCreateUserChange} required placeholder="Enter full name" className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-4">
                <div className="mb-4">
                  <label className={labelClass} htmlFor="email">Email *</label>
                  <input type="email" id="email" name="email" value={createUserForm.email} onChange={handleCreateUserChange} required placeholder="user@example.com" className={inputClass} />
                </div>
                <div className="mb-4">
                  <label className={labelClass} htmlFor="username">Username</label>
                  <input type="text" id="username" name="username" value={createUserForm.username} onChange={handleCreateUserChange} placeholder="Leave blank to auto-generate" className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-4">
                <div className="mb-4">
                  <label className={labelClass} htmlFor="password">Password *</label>
                  <input type="password" id="password" name="password" value={createUserForm.password} onChange={handleCreateUserChange} required minLength={6} placeholder="Minimum 6 characters" className={inputClass} />
                </div>
              </div>

              {createUserForm.role === 'student' && (
                <>
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-4">
                    <div className="mb-4">
                      <label className={labelClass} htmlFor="studentId">Student ID *</label>
                      <input type="text" id="studentId" name="studentId" value={createUserForm.studentId} onChange={handleCreateUserChange} required placeholder="e.g., 2024-CS-001" className={inputClass} />
                    </div>
                    <div className="mb-4">
                      <label className={labelClass} htmlFor="enrollmentYear">Enrollment Year *</label>
                      <input type="number" id="enrollmentYear" name="enrollmentYear" value={createUserForm.enrollmentYear} onChange={handleCreateUserChange} required min="2000" max="2100" className={inputClass} />
                    </div>
                  </div>
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-4">
                    <div className="mb-4">
                      <label className={labelClass} htmlFor="department">Department *</label>
                      <input type="text" id="department" name="department" value={createUserForm.department} onChange={handleCreateUserChange} required placeholder="e.g., Computer Science" className={inputClass} />
                    </div>
                    <div className="mb-4">
                      <label className={labelClass} htmlFor="batch">Batch</label>
                      <input type="text" id="batch" name="batch" value={createUserForm.batch} onChange={handleCreateUserChange} placeholder="e.g., 2024" className={inputClass} />
                    </div>
                  </div>
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-4">
                    <div className="mb-4">
                      <label className={labelClass} htmlFor="currentSemester">Current Semester *</label>
                      <input type="number" id="currentSemester" name="currentSemester" value={createUserForm.currentSemester} onChange={handleCreateUserChange} required min="1" max="8" className={inputClass} />
                    </div>
                  </div>
                </>
              )}

              {(createUserForm.role === 'teacher' || createUserForm.role === 'admin') && (
                <>
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-4">
                    <div className="mb-4">
                      <label className={labelClass} htmlFor="employeeId">Employee ID *</label>
                      <input type="text" id="employeeId" name="employeeId" value={createUserForm.employeeId} onChange={handleCreateUserChange} required placeholder="e.g., EMP-001" className={inputClass} />
                    </div>
                    <div className="mb-4">
                      <label className={labelClass} htmlFor="department">Department *</label>
                      <input type="text" id="department" name="department" value={createUserForm.department} onChange={handleCreateUserChange} required placeholder="e.g., Computer Science" className={inputClass} />
                    </div>
                  </div>
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-4">
                    <div className="mb-4">
                      <label className={labelClass} htmlFor="designation">Designation</label>
                      {createUserForm.role === 'teacher' ? (
                        <select id="designation" name="designation" value={createUserForm.designation} onChange={handleCreateUserChange} className={inputClass}>
                          <option value="">Select designation</option>
                          <option value="Professor">Professor</option>
                          <option value="Associate Professor">Associate Professor</option>
                          <option value="Assistant Professor">Assistant Professor</option>
                          <option value="Lecturer">Lecturer</option>
                          <option value="Visiting Faculty">Visiting Faculty</option>
                        </select>
                      ) : (
                        <input type="text" id="designation" name="designation" value={createUserForm.designation} onChange={handleCreateUserChange} placeholder="e.g., Administrator" className={inputClass} />
                      )}
                    </div>
                  </div>
                </>
              )}

              {createUserForm.role === 'admin' && (
                <div className="mb-4">
                  <label className={labelClass}>Permissions</label>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3 mt-2">
                    {availablePermissions.map(permission => (
                      <label key={permission.id} className="flex items-center gap-2 py-2.5 px-3 border border-gray-200 rounded-md cursor-pointer transition-all hover:bg-slate-50 hover:border-primary-500">
                        <input type="checkbox" checked={createUserForm.permissions.includes(permission.id)} onChange={() => handlePermissionChange(permission.id)} className="w-auto m-0 cursor-pointer" />
                        <span className="text-[0.9rem] pl-2 text-slate-800">{permission.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 mt-6">
                <button type="button" className={btnSecondaryClass} onClick={() => { setShowCreateUserModal(false); setError(''); }}>Cancel</button>
                <button type="submit" className={btnPrimaryClass}>Create User</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Promote to TA Modal */}
      {showPromoteTAModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4 animate-fade-in" onClick={() => { setShowPromoteTAModal(false); setError(''); }}>
          <div className="bg-white rounded-xl max-w-[700px] w-full max-h-[90vh] overflow-y-auto shadow-xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-slate-800 m-0">Promote Student to TA</h2>
              <button className="bg-transparent border-none cursor-pointer text-slate-500 hover:text-slate-800 transition-colors p-1" onClick={() => { setShowPromoteTAModal(false); setError(''); }}>
                <X size={20} />
              </button>
            </div>
            
            {error && (
              <div className="flex items-center gap-3 py-4 px-5 rounded-lg mx-6 mt-4 text-[0.95rem] bg-red-50 text-red-800 border border-red-200">
                <AlertCircle size={18} />
                <span>{error}</span>
                <button onClick={() => setError('')} className="ml-auto bg-transparent border-none cursor-pointer text-inherit opacity-70 hover:opacity-100"><X size={16} /></button>
              </div>
            )}
            
            <div className="p-6">
              <div className="mb-4">
                <label className={labelClass} htmlFor="studentSearch">Search for Student</label>
                <div className="relative">
                  <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input type="text" id="studentSearch" value={studentSearch} onChange={(e) => handleStudentSearch(e.target.value)} placeholder="Search by name, email, or student ID..." className={`${inputClass} pl-11`} />
                  {searching && <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[0.85rem] text-slate-500">Searching...</div>}
                </div>
              </div>

              {searchResults.length > 0 && (
                <div className="mt-4 max-h-[300px] overflow-y-auto border border-gray-200 rounded-lg">
                  {searchResults.map(student => (
                    <div key={student.userId} className={`flex justify-between items-center p-4 cursor-pointer transition-all border-b border-gray-100 last:border-b-0 hover:bg-slate-50 ${selectedStudent?.userId === student.userId ? 'bg-primary-50 border-primary-500' : ''}`} onClick={() => setSelectedStudent(student)}>
                      <div>
                        <h4 className="text-base font-semibold text-slate-800 m-0 mb-1">{student.name}</h4>
                        <p className="text-[0.85rem] text-slate-500 m-0 mb-2">{student.email}</p>
                        <div className="flex gap-2 flex-wrap">
                          <span className="inline-block py-1 px-2.5 bg-gray-100 text-slate-500 rounded text-xs font-medium">{student.studentId}</span>
                          <span className="inline-block py-1 px-2.5 bg-gray-100 text-slate-500 rounded text-xs font-medium">{student.department}</span>
                          <span className="inline-block py-1 px-2.5 bg-gray-100 text-slate-500 rounded text-xs font-medium">Semester {student.semester}</span>
                        </div>
                      </div>
                      {selectedStudent?.userId === student.userId && <ChevronRight size={20} className="text-primary-500" />}
                    </div>
                  ))}
                </div>
              )}

              {selectedStudent && (
                <div className="mt-6 p-5 bg-slate-50 border border-gray-200 rounded-lg">
                  <h3 className="text-base font-semibold text-slate-800 m-0 mb-4">Selected Student</h3>
                  <div>
                    <p className="text-[0.9rem] text-slate-800 my-2"><strong className="text-slate-500">Name:</strong> {selectedStudent.name}</p>
                    <p className="text-[0.9rem] text-slate-800 my-2"><strong className="text-slate-500">Email:</strong> {selectedStudent.email}</p>
                    <p className="text-[0.9rem] text-slate-800 my-2"><strong className="text-slate-500">Student ID:</strong> {selectedStudent.studentId}</p>
                    <p className="text-[0.9rem] text-slate-800 my-2"><strong className="text-slate-500">Department:</strong> {selectedStudent.department}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 mt-6">
                <button type="button" className={btnSecondaryClass} onClick={() => { setShowPromoteTAModal(false); setSelectedStudent(null); setStudentSearch(''); setSearchResults([]); setError(''); }}>Cancel</button>
                <button type="button" className={btnPrimaryClass} onClick={handlePromoteToTA} disabled={!selectedStudent}>Promote to TA</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Upload Modal */}
      {showBulkUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4 animate-fade-in" onClick={handleCloseBulkUploadModal}>
          <div className="bg-white rounded-xl max-w-[700px] w-full max-h-[90vh] overflow-y-auto shadow-xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-2xl font-bold text-slate-800 m-0">Bulk Upload Students</h2>
              <button className="bg-transparent border-none cursor-pointer text-slate-500 hover:text-slate-800 transition-colors p-1" onClick={handleCloseBulkUploadModal}>
                <X size={20} />
              </button>
            </div>
            
            {error && (
              <div className="flex items-center gap-3 py-4 px-5 rounded-lg mx-6 mt-4 text-[0.95rem] bg-red-50 text-red-800 border border-red-200">
                <AlertCircle size={18} />
                <span>{error}</span>
                <button onClick={() => setError('')} className="ml-auto bg-transparent border-none cursor-pointer text-inherit opacity-70 hover:opacity-100"><X size={16} /></button>
              </div>
            )}
            
            <div className="p-6">
              {!uploadResults ? (
                <>
                  <div className="bg-slate-50 p-5 rounded-lg mb-6">
                    <h3 className="text-base font-semibold text-slate-800 m-0 mb-3">Upload Instructions:</h3>
                    <ol className="m-0 pl-6 text-slate-500">
                      <li className="mb-2 leading-relaxed">Download the Excel template using the button below</li>
                      <li className="mb-2 leading-relaxed">Fill in the student information in the template</li>
                      <li className="mb-2 leading-relaxed">Save the file and upload it here</li>
                      <li className="mb-2 leading-relaxed">The system will validate and import the data</li>
                    </ol>
                  </div>

                  <button className={`${btnSecondaryClass} w-full justify-center mb-6`} onClick={handleDownloadTemplate}>
                    <Download size={18} />
                    Download Template
                  </button>

                  <div className="mb-6">
                    <label htmlFor="bulkUploadFile" className="flex flex-col items-center justify-center py-10 px-6 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 cursor-pointer transition-all hover:border-primary-500 hover:bg-primary-50">
                      <FileSpreadsheet size={48} className="text-slate-500 mb-4" />
                      <p className="text-base font-medium text-slate-800 m-0 mb-1 text-center">
                        {selectedFile ? selectedFile.name : 'Click to select Excel file or drag and drop'}
                      </p>
                      <p className="text-sm text-slate-500 m-0">Supported: .xlsx, .xls (Max 5MB)</p>
                    </label>
                    <input type="file" id="bulkUploadFile" accept=".xlsx,.xls" onChange={handleFileSelect} className="hidden" />
                  </div>

                  <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 mt-6">
                    <button type="button" className={btnSecondaryClass} onClick={handleCloseBulkUploadModal}>Cancel</button>
                    <button type="button" className={btnPrimaryClass} onClick={handleBulkUpload} disabled={!selectedFile || uploading}>
                      {uploading ? (
                        <>
                          <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
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
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold text-slate-800 m-0 mb-4">Upload Results</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center gap-4 p-4 rounded-lg bg-green-100 text-green-800">
                        <CheckCircle size={24} className="shrink-0" />
                        <div>
                          <p className="text-sm font-medium m-0 mb-1">Successful</p>
                          <p className="text-2xl font-bold m-0">{uploadResults.successful.length}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 p-4 rounded-lg bg-red-100 text-red-800">
                        <XCircle size={24} className="shrink-0" />
                        <div>
                          <p className="text-sm font-medium m-0 mb-1">Failed</p>
                          <p className="text-2xl font-bold m-0">{uploadResults.failed.length}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {uploadResults.successful.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-base font-semibold m-0 mb-4 text-green-800">✓ Successfully Added ({uploadResults.successful.length})</h4>
                      <div className="max-h-[300px] overflow-y-auto flex flex-col gap-3">
                        {uploadResults.successful.map((item, index) => (
                          <div key={index} className="flex items-start gap-4 p-4 rounded-md bg-green-100 border-l-[3px] border-green-500 text-sm">
                            <span className="inline-block py-1 px-2 bg-black/10 rounded text-xs font-semibold shrink-0">Row {item.row}</span>
                            <div className="flex-1">
                              <p className="font-semibold text-slate-800 m-0 mb-1">{item.data.name}</p>
                              <p className="text-[0.8rem] text-slate-500 m-0">{item.data.email} • {item.data.studentId}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {uploadResults.failed.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-base font-semibold m-0 mb-4 text-red-800">✗ Failed to Add ({uploadResults.failed.length})</h4>
                      <div className="max-h-[300px] overflow-y-auto flex flex-col gap-3">
                        {uploadResults.failed.map((item, index) => (
                          <div key={index} className="flex items-start gap-4 p-4 rounded-md bg-red-100 border-l-[3px] border-red-500 text-sm">
                            <span className="inline-block py-1 px-2 bg-black/10 rounded text-xs font-semibold shrink-0">Row {item.row}</span>
                            <div className="flex-1">
                              <p className="font-semibold text-red-800 m-0 mb-1">{item.error}</p>
                              <p className="text-[0.8rem] text-slate-500 m-0">{item.data['Full Name']} • {item.data['Email']}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 mt-6">
                    <button type="button" className={btnPrimaryClass} onClick={handleCloseBulkUploadModal}>Close</button>
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
