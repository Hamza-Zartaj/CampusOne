import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authAPI } from '../utils/api';
import toast from 'react-hot-toast';
import FirstTimeSetup from '../components/FirstTimeSetup';
import TwoFactorVerification from '../components/TwoFactorVerification';
import ForgotPassword from '../components/ForgotPassword';
import PasswordReset from '../components/PasswordReset';

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showFirstTimeSetup, setShowFirstTimeSetup] = useState(false);
  const [show2FAVerification, setShow2FAVerification] = useState(false);
  const [twoFactorInfo, setTwoFactorInfo] = useState(null);
  const [userData, setUserData] = useState(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showPasswordReset, setShowPasswordReset] = useState(false);
  const [resetData, setResetData] = useState(null);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsLoading(true);

    try {
      const response = await authAPI.login(formData.username, formData.password);
      const data = response.data;

      console.log('Login response:', data);

      // Check if 2FA is required
      if (data.requires2FA) {
        setTwoFactorInfo({
          userId: data.userId,
          method: data.twoFactorMethod,
          email: data.email
        });
        setShow2FAVerification(true);
        
        toast.success(data.message || '2FA verification required', {
          duration: 3000,
          style: {
            background: '#3b82f6',
            color: '#fff',
            fontWeight: '600',
          },
        });
        setIsLoading(false);
        return;
      }

      // Check if this is first-time login
      if (data.isFirstLogin) {
        // Store token temporarily
        localStorage.setItem('token', data.token);
        
        // Show first-time setup modal
        setUserData(data.data);
        setShowFirstTimeSetup(true);

        toast.success('Please complete your account setup', {
          duration: 3000,
          style: {
            background: '#3b82f6',
            color: '#fff',
            fontWeight: '600',
          },
        });
        setIsLoading(false);
      } else {
        // Normal login flow
        localStorage.setItem('token', data.token);
        
        const userData = {
          id: data.data.user.id,
          email: data.data.user.email,
          name: data.data.user.name,
          role: data.data.user.role,
          profilePicture: data.data.user.profilePicture,
          authenticated: true
        };
        
        localStorage.setItem('user', JSON.stringify(userData));

        console.log('Stored user data:', userData);

        // Show success toast
        toast.success(`Welcome back, ${data.data.user.name}! Login successful.`, {
          duration: 2000,
          style: {
            background: '#10b981',
            color: '#fff',
            fontWeight: '600',
          },
        });

        // Clear form
        setFormData({ username: '', password: '' });
        
        // Navigate to dashboard immediately
        console.log('Navigating to dashboard...');
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Login error:', err);
      
      let errorMessage = 'Login failed. Please check your credentials.';
      
      // Handle different error types
      if (err.response) {
        // Server responded with error status
        errorMessage = err.response.data?.message || errorMessage;
      } else if (err.request) {
        // Request was made but no response
        errorMessage = 'Cannot connect to server. Please check your connection.';
      } else {
        // Something else happened
        errorMessage = err.message || errorMessage;
      }
      
      toast.error(errorMessage, {
        duration: 4000,
        style: {
          background: '#ef4444',
          color: '#fff',
          fontWeight: '600',
        },
      });
      
      setIsLoading(false);
    }
  };

  const handleFirstTimeSetupComplete = () => {
    setShowFirstTimeSetup(false);
    
    // Store user data
    if (userData) {
      localStorage.setItem('user', JSON.stringify({
        email: userData.user.email,
        name: userData.user.name,
        role: userData.user.role,
        userType: userData.user.role,
        authenticated: true
      }));

      toast.success(`Welcome, ${userData.user.name}! Your account is now secured.`, {
        duration: 4000,
        style: {
          background: '#10b981',
          color: '#fff',
          fontWeight: '600',
        },
      });

      // Clear form
      setFormData({ username: '', password: '' });
      
      // Navigate to dashboard
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    }
  };

  const handle2FAComplete = () => {
    setShow2FAVerification(false);
    setFormData({ username: '', password: '' });
    
    // Navigate to dashboard
    setTimeout(() => {
      navigate('/dashboard');
      window.location.href = '/'; // Redirect to dashboard or home
    }, 1000);
  };

  const handle2FACancel = () => {
    setShow2FAVerification(false);
    setTwoFactorInfo(null);
  };

  const handleForgotPasswordClick = (e) => {
    e.preventDefault();
    setShowForgotPassword(true);
  };

  const handleForgotPasswordClose = () => {
    setShowForgotPassword(false);
  };

  const handleVerificationNeeded = (data) => {
    setResetData(data);
    setShowPasswordReset(true);
  };

  const handlePasswordResetClose = () => {
    setShowPasswordReset(false);
    setResetData(null);
  };

  return (
    <>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-blue-500 to-cyan-400 p-4 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse delay-700"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Card with glass morphism effect */}
        <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 sm:p-10 border border-white/20 animate-fade-in">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-block group">
              <div className="inline-block p-3 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl mb-4 shadow-lg transition-transform group-hover:scale-105">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent mb-2 transition-opacity group-hover:opacity-80">
                CampusOne
              </h1>
            </Link>
            <p className="text-slate-600 text-sm">Welcome back! Please sign in to continue</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username Field */}
            <div className="group">
              <label htmlFor="username" className="block text-sm font-semibold text-slate-700 mb-2">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-slate-400 group-focus-within:text-indigo-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-900 placeholder-slate-400 hover:border-slate-300"
                  placeholder="Enter your username"
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="group">
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <svg className="w-5 h-5 text-slate-400 group-focus-within:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-slate-900 placeholder-slate-400 hover:border-slate-300"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Remember me & Forgot Password */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="remember"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded cursor-pointer"
                />
                <label htmlFor="remember" className="ml-2 block text-sm text-slate-600 cursor-pointer select-none">
                  Remember me
                </label>
              </div>
              <a 
                href="#" 
                onClick={handleForgotPasswordClick}
                className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
              >
                Forgot password?
              </a>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white py-3.5 rounded-xl font-semibold hover:from-blue-700 hover:to-cyan-600 focus:outline-none focus:ring-4 focus:ring-blue-300 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg hover:shadow-xl mt-6"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Signing in...
                </div>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-white/90 font-medium">
          © 2026 CampusOne. All rights reserved.
        </p>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }

        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }

        .delay-700 {
          animation-delay: 700ms;
        }

        .delay-1000 {
          animation-delay: 1000ms;
        }
      `}</style>
      </div>

      {/* First Time Setup Modal */}
      {showFirstTimeSetup && userData && (
        <FirstTimeSetup 
          user={userData.user}
          token={localStorage.getItem('token')}
          onComplete={handleFirstTimeSetupComplete}
        />
      )}

      {/* 2FA Verification Modal */}
      {show2FAVerification && twoFactorInfo && (
        <TwoFactorVerification
          userId={twoFactorInfo.userId}
          method={twoFactorInfo.method}
          email={twoFactorInfo.email}
          onComplete={handle2FAComplete}
          onCancel={handle2FACancel}
        />
      )}

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <ForgotPassword
          isOpen={showForgotPassword}
          onClose={handleForgotPasswordClose}
          onVerificationNeeded={handleVerificationNeeded}
        />
      )}

      {/* Password Reset Modal */}
      {showPasswordReset && resetData && (
        <PasswordReset
          isOpen={showPasswordReset}
          onClose={handlePasswordResetClose}
          resetData={resetData}
        />
      )}
    </>
  );
}
