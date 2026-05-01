import { useState } from 'react';
import { Shield, X, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { authAPI } from '../utils/api';
import toast from 'react-hot-toast';
import TwoFactorMethodSelection from '../pages/auth/components/TwoFactorMethodSelection';
import TwoFactorSetupVerification from '../pages/auth/components/TwoFactorSetupVerification';

export default function ManageTwoFactorModal({ user, onClose, onUpdated }) {
  const isEnabled = user?.twoFactorEnabled;
  const method = user?.twoFactorMethod;

  // Disable flow state
  const [disablePassword, setDisablePassword] = useState('');
  const [disableToken, setDisableToken] = useState('');
  const [showDisablePassword, setShowDisablePassword] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);

  // Enable flow state
  const [setupStep, setSetupStep] = useState('method'); // 'method' | 'verify'
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [twoFactorData, setTwoFactorData] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // --- Disable 2FA ---
  const handleDisable = async (e) => {
    e.preventDefault();
    setIsDisabling(true);
    try {
      await authAPI.disable2FA(disablePassword, disableToken || undefined);
      toast.success('Two-factor authentication disabled');
      onUpdated();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to disable 2FA');
    } finally {
      setIsDisabling(false);
    }
  };

  // --- Enable 2FA: method selection ---
  const handleSelectMethod = async (chosenMethod) => {
    setIsLoading(true);
    setSelectedMethod(chosenMethod);
    try {
      if (chosenMethod === 'email') {
        const res = await authAPI.setupEmail2FA();
        setTwoFactorData({ email: res.data.data?.email });
      } else {
        const res = await authAPI.setup2FA();
        setTwoFactorData(res.data.data);
      }
      setSetupStep('verify');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start 2FA setup');
      setSelectedMethod(null);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Enable 2FA: verify code ---
  const handleVerify = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (selectedMethod === 'email') {
        await authAPI.enableEmail2FA(verificationCode);
      } else {
        await authAPI.enable2FA(verificationCode);
      }
      toast.success('Two-factor authentication enabled successfully');
      onUpdated();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid verification code');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">
              {isEnabled ? 'Disable Two-Factor Authentication' : 'Enable Two-Factor Authentication'}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {isEnabled ? (
            /* --- Disable Flow --- */
            <form onSubmit={handleDisable} className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800">
                  Disabling 2FA will remove the extra layer of security from your account and clear all trusted devices.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Password</label>
                <div className="relative">
                  <input
                    type={showDisablePassword ? 'text' : 'password'}
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                    required
                    className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowDisablePassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showDisablePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {method === 'authenticator' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Authenticator Code
                  </label>
                  <input
                    type="text"
                    value={disableToken}
                    onChange={(e) => setDisableToken(e.target.value)}
                    required
                    maxLength={6}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-center tracking-widest font-mono"
                    placeholder="000000"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isDisabling}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isDisabling}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isDisabling ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                      Disabling...
                    </>
                  ) : (
                    'Disable 2FA'
                  )}
                </button>
              </div>
            </form>
          ) : setupStep === 'method' ? (
            /* --- Enable Flow: Method Selection --- */
            <TwoFactorMethodSelection
              isLoading={isLoading}
              onSelectMethod={handleSelectMethod}
              onSkip={onClose}
            />
          ) : (
            /* --- Enable Flow: Verification --- */
            <TwoFactorSetupVerification
              twoFactorMethod={selectedMethod}
              twoFactorData={twoFactorData}
              verificationCode={verificationCode}
              onCodeChange={(e) => setVerificationCode(e.target.value)}
              onVerify={handleVerify}
              onBack={() => { setSetupStep('method'); setVerificationCode(''); }}
              isLoading={isLoading}
            />
          )}
        </div>
      </div>
    </div>
  );
}
