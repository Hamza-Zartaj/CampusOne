import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../utils/api';

export default function Login() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await authAPI.login(formData.email, formData.password);
      const data = response.data;

      // Check if 2FA is required
      if (data.requires2FA) {
        localStorage.setItem('tempUser', JSON.stringify({
          email: formData.email,
          userId: data.userId,
          requires2FA: true
        }));
        navigate('/verify-2fa');
      } else {
        // No 2FA required, login successful
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify({
          email: data.data.user.email,
          name: data.data.user.name,
          userType: data.data.user.role,
          authenticated: true
        }));
        navigate('/dashboard');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || 'Login failed. Please check your credentials.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1E40AF] to-[#7DD3FC] p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-lg shadow-2xl p-12">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[#1E40AF] mb-2">CampusOne</h1>
            <p className="text-[#64748B]">Sign in to your account</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[#1F2937] mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-[#F1F5F9] border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7DD3FC] focus:border-transparent transition-all text-[#1F2937] placeholder-[#9CA3AF]"
                placeholder="student@campusone.edu"
                required
              />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[#1F2937] mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-[#F1F5F9] border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7DD3FC] focus:border-transparent transition-all text-[#1F2937] placeholder-[#9CA3AF]"
                placeholder="Enter your password"
                required
              />
            </div>

            {/* Forgot Password Link */}
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="remember"
                  className="h-4 w-4 text-[#1E40AF] focus:ring-[#7DD3FC] border-[#E5E7EB] rounded"
                />
                <label htmlFor="remember" className="ml-2 block text-sm text-[#64748B]">
                  Remember me
                </label>
              </div>
              <a href="#" className="text-sm text-[#1E40AF] hover:text-[#7DD3FC] transition-colors">
                Forgot password?
              </a>
            </div>

            {/* Submit Button */}
            <div className="flex justify-center">
              <button
                type="submit"
                disabled={isLoading}
                className="bg-[#1E40AF] text-white py-3 px-16 rounded-lg font-medium hover:bg-[#1E3A8A] focus:outline-none focus:ring-2 focus:ring-[#7DD3FC] focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </div>
          </form>

          {/* Divider */}
          <div className="mt-6 relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#E5E7EB]"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-[#64748B]">New to CampusOne?</span>
            </div>
          </div>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <a href="#" className="text-[#1E40AF] hover:text-[#7DD3FC] font-medium transition-colors">
              Contact your administrator for access
            </a>
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
