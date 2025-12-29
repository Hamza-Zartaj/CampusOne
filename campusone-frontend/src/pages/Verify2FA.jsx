import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../utils/api';

export default function Verify2FA() {
  const navigate = useNavigate();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tempUser, setTempUser] = useState(null);
  const inputRefs = useRef([]);

  useEffect(() => {
    // Check if user came from login
    const tempUserData = localStorage.getItem('tempUser');
    if (!tempUserData) {
      navigate('/login');
    } else {
      setTempUser(JSON.parse(tempUserData));
    }
  }, [navigate]);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return; // Only allow digits

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    // Handle backspace
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    const newCode = pastedData.split('').concat(Array(6).fill('')).slice(0, 6);
    setCode(newCode);
    
    // Focus the next empty input or last input
    const nextEmptyIndex = newCode.findIndex(digit => !digit);
    const focusIndex = nextEmptyIndex === -1 ? 5 : nextEmptyIndex;
    inputRefs.current[focusIndex]?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const verificationCode = code.join('');
    
    if (verificationCode.length !== 6) {
      setError('Please enter a 6-digit code');
      return;
    }

    if (!tempUser?.userId) {
      setError('Session expired. Please login again.');
      setTimeout(() => navigate('/login'), 2000);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await authAPI.verify2FA(tempUser.userId, verificationCode, true);
      const data = response.data;

      // Store authentication data
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({
        email: data.data.user.email,
        name: data.data.user.name,
        userType: data.data.user.role,
        authenticated: true
      }));
      
      // Clear temp data
      localStorage.removeItem('tempUser');
      
      navigate('/dashboard');
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Invalid verification code. Please try again.';
      setError(errorMessage);
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = () => {
    setCode(['', '', '', '', '', '']);
    setError('');
    // Simulate resending code
    alert('A new verification code has been sent to your email');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1E40AF] to-[#7DD3FC] p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-lg shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[#7DD3FC] rounded-full mb-4">
              <svg className="w-8 h-8 text-[#1E40AF]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[#1E40AF] mb-2">Two-Factor Authentication</h1>
            <p className="text-[#64748B]">
              Enter the 6-digit code sent to your email
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* 2FA Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Code Input */}
            <div className="flex justify-center gap-2 mb-6">
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={handlePaste}
                  className="w-12 h-14 text-center text-xl font-semibold bg-[#F1F5F9] border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7DD3FC] focus:border-transparent transition-all text-[#1F2937]"
                  required
                />
              ))}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-[#1E40AF] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#7DD3FC] focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Verifying...' : 'Verify Code'}
            </button>
          </form>

          {/* Resend Code */}
          <div className="mt-6 text-center">
            <p className="text-sm text-[#64748B] mb-2">
              Didn't receive a code?
            </p>
            <button
              onClick={handleResend}
              className="text-sm text-[#1E40AF] hover:text-[#7DD3FC] font-medium transition-colors"
            >
              Resend Code
            </button>
          </div>

          {/* Back to Login */}
          <div className="mt-6 text-center">
            <button
              onClick={() => navigate('/login')}
              className="text-sm text-[#64748B] hover:text-[#1F2937] transition-colors"
            >
              ← Back to Login
            </button>
          </div>

          {/* Info */}
          <div className="mt-6 p-4 bg-[#F1F5F9] rounded-lg">
            <p className="text-xs text-[#64748B] text-center">
              Enter the 6-digit code from your authenticator app
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-8 text-center text-sm text-white">
          © 2025 CampusOne. All rights reserved.
        </p>
      </div>
    </div>
  );
}
