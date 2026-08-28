import { useState } from 'react';
import { authAPI } from '../../../utils/api';
import toast from 'react-hot-toast';

export default function SuperAdminRecovery({ isOpen, onClose, onRecovered }) {
  const [username, setUsername] = useState('');
  const [recoveryKey, setRecoveryKey] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState('verify'); // 'verify' | 'reset'
  const [resetToken, setResetToken] = useState(null);
  const [keysRemaining, setKeysRemaining] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!username.trim() || !recoveryKey.trim()) return;
    setIsLoading(true);
    try {
      const res = await authAPI.recoverSuperAdmin(username.trim(), recoveryKey.trim());
      setResetToken(res.data.data.resetToken);
      setKeysRemaining(res.data.data.keysRemaining);
      setStep('reset');
      toast.success('Recovery key accepted. Set a new password.');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Recovery failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setIsLoading(true);
    try {
      await authAPI.resetPassword(resetToken, newPassword);
      toast.success('Password reset. You can now log in.');
      onRecovered?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-modal flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 sm:p-8">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 m-0">Super Admin Recovery</h2>
            <p className="text-sm text-slate-500 m-0 mt-1">
              {step === 'verify'
                ? 'Use one of your one-time recovery keys to unlock your account.'
                : 'Set a new password to complete recovery.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {step === 'verify' && (
          <form onSubmit={handleVerify} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Username or Email</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Super admin username or email"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Recovery Key</label>
              <input
                type="text"
                value={recoveryKey}
                onChange={(e) => setRecoveryKey(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono tracking-wide"
                placeholder="XXXX-XXXX-XXXX-XXXX"
                required
              />
              <p className="text-xs text-slate-400 mt-1">
                Each key works only once. Treat them like passwords.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? 'Verifying…' : 'Verify Key'}
              </button>
            </div>
          </form>
        )}

        {step === 'reset' && (
          <form onSubmit={handleReset} className="space-y-4">
            {keysRemaining !== null && (
              <div className="text-xs px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800">
                {keysRemaining} recovery {keysRemaining === 1 ? 'key' : 'keys'} remaining.
                {keysRemaining <= 2 && ' Consider regenerating from createSuperAdmin.'}
              </div>
            )}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="At least 8 characters"
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Re-enter new password"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'Resetting…' : 'Reset Password & Unlock'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
