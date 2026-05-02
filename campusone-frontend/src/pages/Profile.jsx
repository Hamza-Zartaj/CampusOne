import React, { useState, useEffect, useRef } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin, 
  Edit2, 
  Save, 
  X, 
  Camera,
  Lock,
  Shield,
  AlertCircle,
  CheckCircle,
  Briefcase,
  GraduationCap,
  BookOpen,
  Award,
  Clock,
  Building
} from 'lucide-react';
import { authAPI, userAPI } from '../utils/api';
import toast from 'react-hot-toast';
import ChangePasswordModal from '../components/ChangePasswordModal';
import ManageTwoFactorModal from '../components/ManageTwoFactorModal';

const Profile = () => {
  const [user, setUser] = useState(null);
  const [roleData, setRoleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showManage2FA, setShowManage2FA] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Email-change OTP flow (only triggered when user has email-2FA enabled)
  const [emailOtpModal, setEmailOtpModal] = useState({ open: false, otp: '', sending: false, verifying: false });

  const fileInputRef = useRef(null);
  const [uploadingPic, setUploadingPic] = useState(false);

  const handlePickProfilePicture = () => fileInputRef.current?.click();

  const handleProfilePictureSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be 5 MB or smaller');
      return;
    }
    setUploadingPic(true);
    try {
      const res = await authAPI.uploadProfilePicture(file);
      const url = res.data?.data?.profilePicture;
      toast.success('Profile picture updated');
      // Mirror to localStorage so the header avatar refreshes immediately
      try {
        const stored = JSON.parse(localStorage.getItem('user') || '{}');
        stored.profilePicture = url;
        localStorage.setItem('user', JSON.stringify(stored));
      } catch {}
      await fetchUserProfile();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to upload picture');
    } finally {
      setUploadingPic(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };
  
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    address: '',
    // Role-specific fields will be added dynamically
  });

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await authAPI.getCurrentUser();
      const userData = response.data.data;
      
      setUser(userData);
      setRoleData(userData.roleData);
      
      // Initialize edit form
      initializeEditForm(userData);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      toast.error(error.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const initializeEditForm = (userData) => {
    const baseForm = {
      name: userData.name || '',
      email: userData.email || '',
    };

    // Add role-specific fields
    if (userData.roleData) {
      switch (userData.role) {
        case 'student':
          setEditForm({
            ...baseForm,
            phone: userData.roleData.phone || '',
            dateOfBirth: userData.roleData.dateOfBirth ? 
              new Date(userData.roleData.dateOfBirth).toISOString().split('T')[0] : '',
            address: userData.roleData.address || '',
            guardianContact: userData.roleData.guardianContact || '',
          });
          break;
        case 'teacher':
          setEditForm({
            ...baseForm,
            phone: userData.roleData.phone || '',
            officeRoom: userData.roleData.officeRoom || '',
            officeHours: userData.roleData.officeHours || '',
            qualification: userData.roleData.qualification || '',
            specialization: userData.roleData.specialization?.join(', ') || '',
            researchInterests: userData.roleData.researchInterests?.join(', ') || '',
          });
          break;
        case 'ta':
          setEditForm({
            ...baseForm,
            phone: userData.roleData.studentId?.phone || '',
          });
          break;
        default:
          setEditForm(baseForm);
      }
    } else {
      setEditForm(baseForm);
    }
  };

  const handleEditToggle = () => {
    if (isEditMode) {
      // Cancel edit - reset form
      initializeEditForm(user);
    }
    setIsEditMode(!isEditMode);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const emailChanged = () =>
    editForm.email && user?.email && editForm.email.trim().toLowerCase() !== user.email.toLowerCase();

  const requiresOtpForEmail = () =>
    !!(user?.twoFactorEnabled && user?.twoFactorMethod === 'email');

  const handleSave = async () => {
    try {
      setIsSaving(true);

      // 1) Email change with email-2FA → requires OTP. Open the OTP modal,
      // send the code, and stop here. The modal completion will retry save.
      if (emailChanged() && requiresOtpForEmail()) {
        await openEmailOtpModal();
        setIsSaving(false);
        return;
      }

      // 2) Email change with no 2FA-email → call dedicated self-service endpoint
      if (emailChanged()) {
        await authAPI.updateMyEmail(editForm.email.trim());
      }

      // 3) Other fields (name + role-specific) — keep existing behaviour
      const updateData = { name: editForm.name };
      switch (user.role) {
        case 'student':
          updateData.phone = editForm.phone;
          updateData.dateOfBirth = editForm.dateOfBirth;
          updateData.address = editForm.address;
          updateData.guardianContact = editForm.guardianContact;
          break;
        case 'teacher':
          updateData.phone = editForm.phone;
          updateData.officeRoom = editForm.officeRoom;
          updateData.officeHours = editForm.officeHours;
          updateData.qualification = editForm.qualification;
          updateData.specialization = editForm.specialization?.split(',').map(s => s.trim()).filter(Boolean);
          updateData.researchInterests = editForm.researchInterests?.split(',').map(s => s.trim()).filter(Boolean);
          break;
      }
      await userAPI.updateUser(user.id, updateData);

      toast.success('Profile updated successfully');
      setIsEditMode(false);
      await fetchUserProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const openEmailOtpModal = async () => {
    setEmailOtpModal({ open: true, otp: '', sending: true, verifying: false });
    try {
      await authAPI.sendVerificationOTP();
      toast.success(`OTP sent to ${user.email}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setEmailOtpModal((m) => ({ ...m, sending: false }));
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (!emailOtpModal.otp) return;
    setEmailOtpModal((m) => ({ ...m, verifying: true }));
    try {
      await authAPI.updateMyEmail(editForm.email.trim(), emailOtpModal.otp);
      toast.success('Email updated');

      // Now save the rest of the profile fields (name + role-specific)
      const updateData = { name: editForm.name };
      switch (user.role) {
        case 'student':
          updateData.phone = editForm.phone;
          updateData.dateOfBirth = editForm.dateOfBirth;
          updateData.address = editForm.address;
          updateData.guardianContact = editForm.guardianContact;
          break;
        case 'teacher':
          updateData.phone = editForm.phone;
          updateData.officeRoom = editForm.officeRoom;
          updateData.officeHours = editForm.officeHours;
          updateData.qualification = editForm.qualification;
          updateData.specialization = editForm.specialization?.split(',').map(s => s.trim()).filter(Boolean);
          updateData.researchInterests = editForm.researchInterests?.split(',').map(s => s.trim()).filter(Boolean);
          break;
      }
      await userAPI.updateUser(user.id, updateData);

      setEmailOtpModal({ open: false, otp: '', sending: false, verifying: false });
      setIsEditMode(false);
      await fetchUserProfile();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid or expired OTP');
      setEmailOtpModal((m) => ({ ...m, verifying: false }));
    }
  };

  const getRoleBadgeColor = (role) => {
    const colors = {
      admin: 'bg-red-100 text-red-700',
      teacher: 'bg-blue-100 text-blue-700',
      ta: 'bg-purple-100 text-purple-700',
      student: 'bg-green-100 text-green-700',
    };
    return colors[role] || 'bg-gray-100 text-gray-700';
  };

  const getRoleIcon = (role) => {
    const icons = {
      admin: Shield,
      teacher: Briefcase,
      ta: GraduationCap,
      student: BookOpen,
    };
    const Icon = icons[role] || User;
    return <Icon className="w-4 h-4" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Failed to load profile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
            <p className="text-gray-600 mt-1">Manage your personal information</p>
          </div>
          <button
            onClick={handleEditToggle}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              isEditMode
                ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isEditMode ? (
              <>
                <X className="w-4 h-4" />
                Cancel
              </>
            ) : (
              <>
                <Edit2 className="w-4 h-4" />
                Edit Profile
              </>
            )}
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Profile Card */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6">
              {/* Profile Picture */}
              <div className="text-center mb-6">
                <div className="relative inline-block">
                  {user?.profilePicture ? (
                    <img
                      src={user.profilePicture}
                      alt={user.name}
                      className="w-32 h-32 rounded-full object-cover mx-auto border-2 border-white shadow"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-4xl font-bold mx-auto">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                  {isEditMode && (
                    <>
                      <button
                        type="button"
                        onClick={handlePickProfilePicture}
                        disabled={uploadingPic}
                        title="Upload or take a picture"
                        className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 disabled:opacity-50 transition-colors shadow"
                      >
                        {uploadingPic ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        ) : (
                          <Camera className="w-4 h-4" />
                        )}
                      </button>
                      <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        capture="environment"
                        onChange={handleProfilePictureSelected}
                        className="hidden"
                      />
                    </>
                  )}
                </div>
                
                <h2 className="text-2xl font-bold text-gray-900 mt-4">{user?.name || 'User'}</h2>
                <p className="text-gray-600">@{user?.username || 'username'}</p>
                
                {/* Role Badge */}
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium">
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full ${getRoleBadgeColor(user?.role || 'student')}`}>
                    {getRoleIcon(user?.role || 'student')}
                    {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Student'}
                  </span>
                </div>
              </div>

              {/* Account Status */}
              <div className="space-y-3 pt-6 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 text-sm">Account Status</span>
                  {user?.isActive ? (
                    <span className="inline-flex items-center gap-1 text-green-600 text-sm font-medium">
                      <CheckCircle className="w-4 h-4" />
                      Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-red-600 text-sm font-medium">
                      <AlertCircle className="w-4 h-4" />
                      Inactive
                    </span>
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 text-sm">2FA Status</span>
                  {user?.twoFactorEnabled ? (
                    <span className="inline-flex items-center gap-1 text-green-600 text-sm font-medium">
                      <Shield className="w-4 h-4" />
                      Enabled
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-gray-600 text-sm font-medium">
                      <Shield className="w-4 h-4" />
                      Disabled
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600 text-sm">Last Login</span>
                  <span className="text-gray-900 text-sm">
                    {user?.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'N/A'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-600 text-sm">Member Since</span>
                  <span className="text-gray-900 text-sm">
                    {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Basic Information</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="w-4 h-4 inline mr-2" />
                    Full Name
                  </label>
                  {isEditMode ? (
                    <input
                      type="text"
                      name="name"
                      value={editForm.name}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900 font-medium">{user?.name || 'N/A'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Mail className="w-4 h-4 inline mr-2" />
                    Email Address
                  </label>
                  {isEditMode ? (
                    <input
                      type="email"
                      name="email"
                      value={editForm.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900 font-medium">{user?.email || 'N/A'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Username
                  </label>
                  <p className="text-gray-900 font-medium">@{user?.username || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Role-Specific Information */}
            {roleData && user?.role === 'student' && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5" />
                  Student Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Student ID
                    </label>
                    <p className="text-gray-900 font-medium">{roleData.studentId}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Enrollment Year
                    </label>
                    <p className="text-gray-900 font-medium">{roleData.enrollmentYear}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Building className="w-4 h-4 inline mr-2" />
                      Department
                    </label>
                    <p className="text-gray-900 font-medium">{roleData.department}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Batch
                    </label>
                    <p className="text-gray-900 font-medium">{roleData.batch || 'N/A'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Semester
                    </label>
                    <p className="text-gray-900 font-medium">Semester {roleData.currentSemester}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Award className="w-4 h-4 inline mr-2" />
                      CGPA
                    </label>
                    <p className="text-gray-900 font-medium">{roleData.cgpa?.toFixed(2) || 'N/A'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Phone className="w-4 h-4 inline mr-2" />
                      Phone Number
                    </label>
                    {isEditMode ? (
                      <input
                        type="tel"
                        name="phone"
                        value={editForm.phone}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900 font-medium">{roleData.phone || 'Not provided'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Calendar className="w-4 h-4 inline mr-2" />
                      Date of Birth
                    </label>
                    {isEditMode ? (
                      <input
                        type="date"
                        name="dateOfBirth"
                        value={editForm.dateOfBirth}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900 font-medium">
                        {roleData.dateOfBirth ? new Date(roleData.dateOfBirth).toLocaleDateString() : 'Not provided'}
                      </p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <MapPin className="w-4 h-4 inline mr-2" />
                      Address
                    </label>
                    {isEditMode ? (
                      <textarea
                        name="address"
                        value={editForm.address}
                        onChange={handleInputChange}
                        rows="2"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900 font-medium">{roleData.address || 'Not provided'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Guardian Contact
                    </label>
                    {isEditMode ? (
                      <input
                        type="tel"
                        name="guardianContact"
                        value={editForm.guardianContact}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900 font-medium">{roleData.guardianContact || 'Not provided'}</p>
                    )}
                  </div>
                </div>

                {/* Enrolled Courses */}
                {roleData.enrolledCourses && roleData.enrolledCourses.length > 0 && (
                  <div className="mt-6 pt-6 border-t">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Enrolled Courses</h4>
                    <div className="space-y-2">
                      {roleData.enrolledCourses.map((course, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium text-gray-900">
                            {course.courseId?.name || 'Course Name'}
                          </span>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            course.status === 'active' ? 'bg-green-100 text-green-700' :
                            course.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {course.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Teacher Information */}
            {roleData && user?.role === 'teacher' && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                  <Briefcase className="w-5 h-5" />
                  Teacher Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Employee ID
                    </label>
                    <p className="text-gray-900 font-medium">{roleData.employeeId}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Building className="w-4 h-4 inline mr-2" />
                      Department
                    </label>
                    <p className="text-gray-900 font-medium">{roleData.department}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Designation
                    </label>
                    <p className="text-gray-900 font-medium">{roleData.designation}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Phone className="w-4 h-4 inline mr-2" />
                      Phone Number
                    </label>
                    {isEditMode ? (
                      <input
                        type="tel"
                        name="phone"
                        value={editForm.phone}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900 font-medium">{roleData.phone || 'Not provided'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Office Room
                    </label>
                    {isEditMode ? (
                      <input
                        type="text"
                        name="officeRoom"
                        value={editForm.officeRoom}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900 font-medium">{roleData.officeRoom || 'Not provided'}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Clock className="w-4 h-4 inline mr-2" />
                      Office Hours
                    </label>
                    {isEditMode ? (
                      <input
                        type="text"
                        name="officeHours"
                        value={editForm.officeHours}
                        onChange={handleInputChange}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900 font-medium">{roleData.officeHours || 'Not provided'}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Qualification
                    </label>
                    {isEditMode ? (
                      <input
                        type="text"
                        name="qualification"
                        value={editForm.qualification}
                        onChange={handleInputChange}
                        placeholder="e.g., Ph.D. in Computer Science"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <p className="text-gray-900 font-medium">{roleData.qualification || 'Not provided'}</p>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Specialization
                    </label>
                    {isEditMode ? (
                      <input
                        type="text"
                        name="specialization"
                        value={editForm.specialization}
                        onChange={handleInputChange}
                        placeholder="e.g., Machine Learning, AI (comma-separated)"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {roleData.specialization && roleData.specialization.length > 0 ? (
                          roleData.specialization.map((spec, index) => (
                            <span key={index} className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                              {spec}
                            </span>
                          ))
                        ) : (
                          <p className="text-gray-900 font-medium">Not provided</p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Research Interests
                    </label>
                    {isEditMode ? (
                      <textarea
                        name="researchInterests"
                        value={editForm.researchInterests}
                        onChange={handleInputChange}
                        placeholder="e.g., Deep Learning, NLP (comma-separated)"
                        rows="2"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {roleData.researchInterests && roleData.researchInterests.length > 0 ? (
                          roleData.researchInterests.map((interest, index) => (
                            <span key={index} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                              {interest}
                            </span>
                          ))
                        ) : (
                          <p className="text-gray-900 font-medium">Not provided</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Teaching Courses */}
                {roleData.teachingCourses && roleData.teachingCourses.length > 0 && (
                  <div className="mt-6 pt-6 border-t">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Teaching Courses</h4>
                    <div className="space-y-2">
                      {roleData.teachingCourses.map((course, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium text-gray-900">
                            {course.courseId?.name || 'Course Name'}
                          </span>
                          <span className="text-sm text-gray-600">
                            {course.semester} {course.year}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TA Information */}
            {roleData && user?.role === 'ta' && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5" />
                  Teaching Assistant Information
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Student ID
                    </label>
                    <p className="text-gray-900 font-medium">{roleData.studentId?.studentId || 'N/A'}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Building className="w-4 h-4 inline mr-2" />
                      Department
                    </label>
                    <p className="text-gray-900 font-medium">{roleData.studentId?.department || 'N/A'}</p>
                  </div>
                </div>

                {/* Assigned Courses */}
                {roleData.assignedCourses && roleData.assignedCourses.length > 0 && (
                  <div className="mt-6 pt-6 border-t">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Assigned Courses</h4>
                    <div className="space-y-2">
                      {roleData.assignedCourses.map((course, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="font-medium text-gray-900">
                            {course.courseId?.name || 'Course Name'}
                          </span>
                          <span className="text-sm text-gray-600">
                            {course.semester}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Security Section */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Security
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Two-Factor Authentication</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {user?.twoFactorEnabled 
                        ? `Enabled via ${user.twoFactorMethod}`
                        : 'Add an extra layer of security to your account'}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowManage2FA(true)}
                    className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors">
                    {user?.twoFactorEnabled ? 'Manage' : 'Enable'}
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium text-gray-900">Password</h4>
                    <p className="text-sm text-gray-600 mt-1">
                      Last changed: {user?.passwordChangedAt 
                        ? new Date(user.passwordChangedAt).toLocaleDateString()
                        : 'Never'}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowChangePassword(true)}
                    className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors">
                    Change Password
                  </button>
                </div>

                {user?.trustedDevices && user.trustedDevices.length > 0 && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-3">Trusted Devices</h4>
                    <div className="space-y-2">
                      {user.trustedDevices.slice(0, 3).map((device, index) => (
                        <div key={index} className="flex items-center justify-between text-sm">
                          <span className="text-gray-900">{device.deviceName}</span>
                          <span className="text-gray-600">
                            {new Date(device.lastUsed).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                    {user.trustedDevices.length > 3 && (
                      <button className="mt-2 text-sm text-blue-600 hover:text-blue-700">
                        View all devices ({user.trustedDevices.length})
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Save Button (when in edit mode) */}
            {isEditMode && (
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleEditToggle}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} onSuccess={fetchUserProfile} />
      )}

      {showManage2FA && (
        <ManageTwoFactorModal
          user={user}
          onClose={() => setShowManage2FA(false)}
          onUpdated={fetchUserProfile}
        />
      )}

      {emailOtpModal.open && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900 m-0">Verify Email Change</h3>
                <p className="text-sm text-slate-500 m-0 mt-1">
                  Enter the OTP sent to <span className="font-mono">{user?.email}</span> to change
                  your email to <span className="font-mono">{editForm.email}</span>.
                </p>
              </div>
              <button
                onClick={() => setEmailOtpModal({ open: false, otp: '', sending: false, verifying: false })}
                className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
              >×</button>
            </div>

            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={emailOtpModal.otp}
              onChange={(e) => setEmailOtpModal((m) => ({ ...m, otp: e.target.value.replace(/\D/g, '') }))}
              className="w-full px-4 py-3 mt-2 bg-slate-50 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-lg tracking-widest font-mono"
              placeholder="000000"
              autoFocus
            />

            <div className="flex gap-3 mt-5">
              <button
                onClick={openEmailOtpModal}
                disabled={emailOtpModal.sending}
                className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 disabled:opacity-50"
              >
                {emailOtpModal.sending ? 'Sending…' : 'Resend OTP'}
              </button>
              <button
                onClick={handleVerifyEmailOtp}
                disabled={emailOtpModal.verifying || emailOtpModal.otp.length !== 6}
                className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50"
              >
                {emailOtpModal.verifying ? 'Verifying…' : 'Verify & Change'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
