import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../utils/api';

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [qrCode, setQrCode] = useState(null);
  const [secret, setSecret] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [disable2FAModal, setDisable2FAModal] = useState(false);
  const [disablePassword, setDisablePassword] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    // Fetch current user from backend
    const fetchUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        const response = await authAPI.getCurrentUser();
        const userData = response.data.data;
        
        // Update local storage with fresh data
        const userInfo = {
          email: userData.user.email,
          name: userData.user.name,
          userType: userData.user.role,
          authenticated: true,
          twoFactorEnabled: userData.user.twoFactorEnabled,
          lastLogin: userData.user.lastLogin
        };
        
        localStorage.setItem('user', JSON.stringify(userInfo));
        setUser(userInfo);
      } catch (err) {
        console.error('Failed to fetch user:', err);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        navigate('/login');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      navigate('/login');
    }
  };

  const handleSetup2FA = async () => {
    setProcessing(true);
    setError('');
    try {
      const response = await authAPI.setup2FA();
      setQrCode(response.data.data.qrCode);
      setSecret(response.data.data.secret);
      setShow2FAModal(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to setup 2FA');
    } finally {
      setProcessing(false);
    }
  };

  const handleEnable2FA = async (e) => {
    e.preventDefault();
    if (verificationCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    setProcessing(true);
    setError('');
    try {
      await authAPI.enable2FA(verificationCode);
      setSuccess('2FA has been enabled successfully!');
      setShow2FAModal(false);
      setVerificationCode('');
      
      // Refresh user data
      const response = await authAPI.getCurrentUser();
      const userData = response.data.data;
      const userInfo = {
        email: userData.user.email,
        name: userData.user.name,
        userType: userData.user.role,
        authenticated: true,
        twoFactorEnabled: userData.user.twoFactorEnabled,
        lastLogin: userData.user.lastLogin
      };
      localStorage.setItem('user', JSON.stringify(userInfo));
      setUser(userInfo);
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to enable 2FA');
    } finally {
      setProcessing(false);
    }
  };

  const handleDisable2FA = async (e) => {
    e.preventDefault();
    if (!disablePassword || disableCode.length !== 6) {
      setError('Please enter your password and 6-digit code');
      return;
    }

    setProcessing(true);
    setError('');
    try {
      await authAPI.disable2FA(disablePassword, disableCode);
      setSuccess('2FA has been disabled successfully!');
      setDisable2FAModal(false);
      setDisablePassword('');
      setDisableCode('');
      
      // Refresh user data
      const response = await authAPI.getCurrentUser();
      const userData = response.data.data;
      const userInfo = {
        email: userData.user.email,
        name: userData.user.name,
        userType: userData.user.role,
        authenticated: true,
        twoFactorEnabled: userData.user.twoFactorEnabled,
        lastLogin: userData.user.lastLogin
      };
      localStorage.setItem('user', JSON.stringify(userInfo));
      setUser(userInfo);
      
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to disable 2FA');
    } finally {
      setProcessing(false);
    }
  };

  const getUserTypeColor = (userType) => {
    switch (userType) {
      case 'admin':
        return 'bg-[#EF4444] text-white';
      case 'teacher':
        return 'bg-[#F59E0B] text-white';
      case 'student':
        return 'bg-[#22C55E] text-white';
      default:
        return 'bg-[#64748B] text-white';
    }
  };

  const getUserTypeIcon = (userType) => {
    switch (userType) {
      case 'admin':
        return (
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      case 'teacher':
        return (
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        );
      case 'student':
        return (
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
          </svg>
        );
      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F1F5F9]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#1E40AF] mb-4"></div>
          <p className="text-[#64748B]">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      {/* Navigation Bar */}
      <nav className="bg-[#1E40AF] shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-white">CampusOne</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-white text-sm">Welcome, {user.name}</span>
              <button
                onClick={handleLogout}
                className="bg-white text-[#1E40AF] px-4 py-2 rounded-lg font-medium hover:bg-[#F1F5F9] transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-600">{success}</p>
          </div>
        )}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Welcome Card */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-3xl font-bold text-[#1F2937] mb-2">
                Welcome back, {user.name}!
              </h2>
              <p className="text-[#64748B] text-lg">
                You're signed in as a{user.userType === 'admin' ? 'n' : ''} {user.userType}.
              </p>
            </div>
            <div className={`${getUserTypeColor(user.userType)} p-4 rounded-full`}>
              {getUserTypeIcon(user.userType)}
            </div>
          </div>
        </div>

        {/* User Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* User Type Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-[#7DD3FC] rounded-full flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-[#1E40AF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-[#64748B]">User Type</p>
                <p className="text-xl font-bold text-[#1F2937] capitalize">{user.userType}</p>
              </div>
            </div>
            <div className={`${getUserTypeColor(user.userType)} text-xs px-3 py-1 rounded-full inline-block`}>
              {user.userType.toUpperCase()}
            </div>
          </div>

          {/* Email Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-[#7DD3FC] rounded-full flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-[#1E40AF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-[#64748B]">Email</p>
                <p className="text-lg font-semibold text-[#1F2937] break-all">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Status Card */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-[#22C55E] rounded-full flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-sm text-[#64748B]">Account Status</p>
                <p className="text-xl font-bold text-[#1F2937]">Active</p>
              </div>
            </div>
            <div className="bg-[#22C55E] text-white text-xs px-3 py-1 rounded-full inline-block">
              VERIFIED
            </div>
          </div>
        </div>

        {/* 2FA Security Card */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-[#1F2937] mb-2">Security Settings</h3>
              <p className="text-[#64748B]">Manage your two-factor authentication</p>
            </div>
            <div className={`p-3 rounded-full ${user.twoFactorEnabled ? 'bg-[#22C55E]' : 'bg-[#F59E0B]'}`}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-[#F1F5F9] rounded-lg">
            <div className="flex items-center gap-4">
              <div>
                <p className="font-semibold text-[#1F2937]">Two-Factor Authentication (2FA)</p>
                <p className="text-sm text-[#64748B]">
                  {user.twoFactorEnabled 
                    ? 'Your account is protected with 2FA' 
                    : 'Add an extra layer of security to your account'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                user.twoFactorEnabled 
                  ? 'bg-[#22C55E] text-white' 
                  : 'bg-[#F59E0B] text-white'
              }`}>
                {user.twoFactorEnabled ? 'ENABLED' : 'DISABLED'}
              </span>
              {user.twoFactorEnabled ? (
                <button
                  onClick={() => setDisable2FAModal(true)}
                  className="px-4 py-2 bg-[#EF4444] text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors"
                >
                  Disable
                </button>
              ) : (
                <button
                  onClick={handleSetup2FA}
                  disabled={processing}
                  className="px-4 py-2 bg-[#1E40AF] text-white rounded-lg text-sm font-medium hover:bg-[#1E3A8A] transition-colors disabled:opacity-50"
                >
                  {processing ? 'Loading...' : 'Enable 2FA'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-md p-8">
          <h3 className="text-2xl font-bold text-[#1F2937] mb-6">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button className="p-6 bg-[#F1F5F9] rounded-lg hover:bg-[#E5E7EB] transition-colors text-left">
              <div className="w-10 h-10 bg-[#1E40AF] rounded-full flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <p className="font-semibold text-[#1F2937]">Dashboard</p>
              <p className="text-sm text-[#64748B] mt-1">View overview</p>
            </button>

            <button className="p-6 bg-[#F1F5F9] rounded-lg hover:bg-[#E5E7EB] transition-colors text-left">
              <div className="w-10 h-10 bg-[#7DD3FC] rounded-full flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-[#1F2937]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <p className="font-semibold text-[#1F2937]">Profile</p>
              <p className="text-sm text-[#64748B] mt-1">Edit settings</p>
            </button>

            <button className="p-6 bg-[#F1F5F9] rounded-lg hover:bg-[#E5E7EB] transition-colors text-left">
              <div className="w-10 h-10 bg-[#F59E0B] rounded-full flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <p className="font-semibold text-[#1F2937]">Courses</p>
              <p className="text-sm text-[#64748B] mt-1">View all courses</p>
            </button>

            <button className="p-6 bg-[#F1F5F9] rounded-lg hover:bg-[#E5E7EB] transition-colors text-left">
              <div className="w-10 h-10 bg-[#22C55E] rounded-full flex items-center justify-center mb-3">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="font-semibold text-[#1F2937]">Schedule</p>
              <p className="text-sm text-[#64748B] mt-1">View calendar</p>
            </button>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-[#64748B]">
          <p className="text-sm">
            This is a demonstration dashboard. Full functionality will be available soon.
          </p>
        </div>
      </div>

      {/* Enable 2FA Modal */}
      {show2FAModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-8">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-[#1F2937] mb-2">Enable Two-Factor Authentication</h3>
              <p className="text-[#64748B] text-sm">Scan the QR code with your authenticator app</p>
            </div>

            {qrCode && (
              <div className="mb-6">
                <div className="flex justify-center mb-4">
                  <img src={qrCode} alt="QR Code" className="border-4 border-[#E5E7EB] rounded-lg" />
                </div>
                <div className="bg-[#F1F5F9] p-3 rounded-lg mb-4">
                  <p className="text-xs text-[#64748B] mb-1">Or enter this code manually:</p>
                  <p className="text-sm font-mono text-[#1F2937] break-all">{secret}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleEnable2FA}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#1F2937] mb-2">
                  Enter verification code
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  className="w-full px-4 py-3 bg-[#F1F5F9] border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7DD3FC] text-center text-xl font-mono tracking-widest text-[#1F2937]"
                  maxLength={6}
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShow2FAModal(false);
                    setVerificationCode('');
                    setError('');
                  }}
                  className="flex-1 px-4 py-3 bg-[#F1F5F9] text-[#1F2937] rounded-lg font-medium hover:bg-[#E5E7EB] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing || verificationCode.length !== 6}
                  className="flex-1 px-4 py-3 bg-[#1E40AF] text-white rounded-lg font-medium hover:bg-[#1E3A8A] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? 'Verifying...' : 'Enable 2FA'}
                </button>
              </div>
            </form>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-600">
                <strong>Tip:</strong> Use Google Authenticator, Authy, or any TOTP-compatible app
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Disable 2FA Modal */}
      {disable2FAModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-8">
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
                <svg className="w-8 h-8 text-[#EF4444]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-[#1F2937] mb-2">Disable Two-Factor Authentication</h3>
              <p className="text-[#64748B] text-sm">This will make your account less secure</p>
            </div>

            <form onSubmit={handleDisable2FA}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-[#1F2937] mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-3 bg-[#F1F5F9] border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7DD3FC] text-[#1F2937] placeholder-[#9CA3AF]"
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-[#1F2937] mb-2">
                  Current 2FA Code
                </label>
                <input
                  type="text"
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  className="w-full px-4 py-3 bg-[#F1F5F9] border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7DD3FC] text-center text-xl font-mono tracking-widest text-[#1F2937]"
                  maxLength={6}
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setDisable2FAModal(false);
                    setDisablePassword('');
                    setDisableCode('');
                    setError('');
                  }}
                  className="flex-1 px-4 py-3 bg-[#F1F5F9] text-[#1F2937] rounded-lg font-medium hover:bg-[#E5E7EB] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processing || !disablePassword || disableCode.length !== 6}
                  className="flex-1 px-4 py-3 bg-[#EF4444] text-white rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {processing ? 'Disabling...' : 'Disable 2FA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
