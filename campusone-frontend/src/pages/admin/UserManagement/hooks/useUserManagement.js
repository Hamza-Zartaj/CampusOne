import { useState, useEffect } from 'react';
import { userAPI } from '../../../../utils/api';
import clientLogger from '../../../../utils/clientLogger';

export const useUserManagement = () => {
  // Stats states
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

  // Modal visibility states
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [showPromoteTAModal, setShowPromoteTAModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);

  // Create User form states
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

  // User List Management states
  const [selectedRole, setSelectedRole] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);

  // Edit User states
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    studentId: '',
    enrollmentYear: '',
    department: '',
    batch: '',
    currentSemester: '',
    employeeId: '',
    designation: '',
    permissions: []
  });

  // Delete/Deactivate states
  const [deletingUser, setDeletingUser] = useState(null);

  // Reset Settings states
  const [resettingUser, setResettingUser] = useState(null);

  // Get current user info
  const [currentUser, setCurrentUser] = useState(null);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem('user') || '{}');
    setCurrentUser(userData);
    setIsSuperAdmin(userData.isSuperAdmin === true);
    fetchStats();
  }, []);

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
      clientLogger.error('Search error', err);
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

  const fetchUsersByRole = async (role) => {
    if (selectedRole === role) {
      setSelectedRole(null);
      setUsersList([]);
      setFilteredUsers([]);
      setUserSearchQuery('');
      return;
    }
    
    setSelectedRole(role);
    setLoadingUsers(true);
    setError('');
    setUserSearchQuery('');
    
    try {
      const response = await userAPI.getAllUsers({ role, page: 1, limit: 100, isActive: '' });
      if (response.data.success) {
        setUsersList(response.data.data);
        setFilteredUsers(response.data.data);
      }
    } catch (err) {
      clientLogger.error('Error fetching users', err);
      setError(err.response?.data?.message || `Failed to fetch ${role}s`);
      setUsersList([]);
      setFilteredUsers([]);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleUserSearch = (query) => {
    setUserSearchQuery(query);
    if (!query.trim()) {
      setFilteredUsers(usersList);
      return;
    }
    
    const filtered = usersList.filter(user => 
      user.name.toLowerCase().includes(query.toLowerCase()) ||
      user.email.toLowerCase().includes(query.toLowerCase()) ||
      (user.roleData?.studentId && user.roleData.studentId.toLowerCase().includes(query.toLowerCase())) ||
      (user.roleData?.employeeId && user.roleData.employeeId.toLowerCase().includes(query.toLowerCase()))
    );
    setFilteredUsers(filtered);
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      studentId: user.roleData?.studentId || '',
      enrollmentYear: user.roleData?.enrollmentYear || '',
      department: user.roleData?.department || '',
      batch: user.roleData?.batch || '',
      currentSemester: user.roleData?.currentSemester || '',
      employeeId: user.roleData?.employeeId || '',
      designation: user.roleData?.designation || '',
      permissions: user.roleData?.permissions || []
    });
    setShowEditModal(true);
    setError('');
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const handleEditPermissionChange = (permission) => {
    setEditForm(prev => {
      const permissions = prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission];
      return { ...prev, permissions };
    });
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    try {
      const updateData = {
        name: editForm.name,
        email: editForm.email
      };
      
      if (editingUser.role === 'student') {
        updateData.studentId = editForm.studentId;
        updateData.enrollmentYear = parseInt(editForm.enrollmentYear);
        updateData.department = editForm.department;
        updateData.batch = editForm.batch;
        updateData.currentSemester = parseInt(editForm.currentSemester);
      } else if (editingUser.role === 'teacher') {
        updateData.employeeId = editForm.employeeId;
        updateData.department = editForm.department;
        updateData.designation = editForm.designation;
      } else if (editingUser.role === 'admin') {
        updateData.employeeId = editForm.employeeId;
        updateData.department = editForm.department;
        updateData.designation = editForm.designation;
        updateData.permissions = editForm.permissions;
      }
      
      const response = await userAPI.updateUser(editingUser.id, updateData);
      
      if (response.data.success) {
        setSuccess(`User updated successfully!`);
        setShowEditModal(false);
        if (selectedRole) {
          fetchUsersByRole(selectedRole);
        }
        fetchStats();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update user');
    }
  };

  const handleToggleUserStatus = async (user) => {
    setError('');
    setSuccess('');
    
    try {
      if (user.isActive) {
        await userAPI.deactivateUser(user.id);
        setSuccess(`${user.name}'s account has been deactivated`);
      } else {
        await userAPI.activateUser(user.id);
        setSuccess(`${user.name}'s account has been activated`);
      }
      
      if (selectedRole) {
        fetchUsersByRole(selectedRole);
      }
      fetchStats();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to toggle user status');
    }
  };

  const handleDeleteUser = (user) => {
    setDeletingUser(user);
    setShowDeleteModal(true);
    setError('');
  };

  const confirmDeleteUser = async () => {
    setError('');
    setSuccess('');
    
    try {
      await userAPI.deleteUser(deletingUser.id);
      setSuccess(`${deletingUser.name} has been permanently deleted from the system`);
      setShowDeleteModal(false);
      setDeletingUser(null);
      
      if (selectedRole) {
        fetchUsersByRole(selectedRole);
      }
      fetchStats();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete user');
      setShowDeleteModal(false);
    }
  };

  const handleResetSettings = (user) => {
    setResettingUser(user);
    setShowResetModal(true);
    setError('');
  };

  const handleUnlockAccount = async () => {
    setError('');
    setSuccess('');
    
    try {
      await userAPI.unlockUser(resettingUser.id);
      setSuccess(`${resettingUser.name}'s account has been unlocked`);
      setShowResetModal(false);
      
      if (selectedRole) {
        fetchUsersByRole(selectedRole);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to unlock account');
    }
  };

  return {
    // States
    stats, loading, error, success, currentUser, isSuperAdmin,
    showCreateUserModal, setShowCreateUserModal,
    showBulkUploadModal, setShowBulkUploadModal,
    showEditModal, setShowEditModal,
    showDeleteModal, setShowDeleteModal,
    showResetModal, setShowResetModal,
    
    // Create User
    createUserForm, setCreateUserForm,
    handleCreateUserChange, handlePermissionChange, handleCreateUser,
    
    // Bulk Upload
    selectedFile, setSelectedFile,
    uploading, uploadResults, setUploadResults,
    handleFileSelect, handleBulkUpload, handleDownloadTemplate, handleCloseBulkUploadModal,
    
    // User List
    selectedRole, setSelectedRole,
    usersList, setUsersList,
    loadingUsers, userSearchQuery, setUserSearchQuery,
    filteredUsers, setFilteredUsers,
    fetchUsersByRole, handleUserSearch,
    
    // Edit User
    editingUser, setEditingUser,
    editForm, setEditForm,
    handleEditUser, handleEditFormChange, handleEditPermissionChange, handleUpdateUser,
    
    // Delete/Actions
    deletingUser, setDeletingUser,
    resettingUser, setResettingUser,
    handleToggleUserStatus, handleDeleteUser, confirmDeleteUser,
    handleResetSettings, handleUnlockAccount,
    
    // Utils
    setError, setSuccess, fetchStats
  };
};
