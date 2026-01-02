import { useState } from 'react';
import { authAPI } from '../utils/api';
import toast from 'react-hot-toast';

export default function TwoFactorVerification({ userId, method, email, onComplete, onCancel }) {
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      let response;
      if (method === 'email') {
        response = await authAPI.verifyEmailOTP(userId, code);
      } else {
        response = await authAPI.verify2FA(userId, code);
      }

      const data = response.data;

      // Store auth data
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({
        email: data.data.user.email,
        name: data.data.user.name,
        userType: data.data.user.role,
        authenticated: true
      }));

      toast.success('Login successful!', {
        duration: 3000,
        style: {
          background: '#10b981',
          color: '#fff',
          fontWeight: '600',
        },
      });

      onComplete();
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Invalid verification code';
      toast.error(errorMessage, {
        duration: 4000,
        style: {
          background: '#ef4444',
          color: '#fff',
          fontWeight: '600',
        },
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (method !== 'email') return;

    setIsResending(true);
    try {
      await authAPI.sendLoginOTP(userId);
      toast.success('New code sent to your email!', {
        duration: 3000,
        style: {
          background: '#10b981',
          color: '#fff',
          fontWeight: '600',
        },
      });
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Failed to resend code';
      toast.error(errorMessage);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-cyan-500 p-6 text-white">
          <h2 className="text-2xl font-bold mb-2">
            Two-Factor Authentication
          </h2>
          <p className="text-blue-100 text-sm">
            {method === 'email' 
              ? 'Enter the code sent to your email'
              : 'Enter the code from your authenticator app'}
          </p>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {method === 'email' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <svg className="w-6 h-6 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <div className="text-left flex-1">
                    <h3 className="font-semibold text-blue-800 text-sm mb-1">Check Your Email</h3>
                    <p className="text-blue-700 text-sm">
                      We sent a 6-digit code to <strong>{email}</strong>
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <label htmlFor="verificationCode" className="block text-sm font-semibold text-slate-700 mb-2">
                Verification Code
              </label>
              <input
                type="text"
                id="verificationCode"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-center text-lg tracking-widest font-mono"
                placeholder="000000"
                required
                maxLength={6}
                autoFocus
              />
              {method === 'email' && (
                <p className="text-xs text-slate-500 mt-2 text-center">
                  Code expires in 10 minutes
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 bg-slate-100 text-slate-700 font-semibold py-3 px-6 rounded-lg hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || code.length !== 6}
                className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-700 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </div>
                ) : (
                  'Verify'
                )}
              </button>
            </div>

            {method === 'email' && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleResendOTP}
                  disabled={isResending}
                  className="text-sm text-blue-600 hover:text-blue-700 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isResending ? 'Sending...' : 'Resend Code'}
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
