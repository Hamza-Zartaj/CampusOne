import { useState } from 'react';
import { Shield, X, AlertTriangle, Eye, EyeOff, CheckCircle, Smartphone, Mail, ChevronLeft } from 'lucide-react';
import { authAPI } from '../utils/api';
import toast from 'react-hot-toast';

// ── Small reusable pieces ─────────────────────────────────────────────────────

function PasswordField({ value, onChange, disabled }) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          required
          disabled={disabled}
          className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm disabled:opacity-50"
          placeholder="Enter your password"
        />
        <button type="button" onClick={() => setShow(v => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          {show
            ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" /></svg>
            : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
          }
        </button>
      </div>
    </div>
  );
}

function OTPCodeField({ label, value, onChange, disabled, isEmail, isSending, onSend, otpSent }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-sm font-medium text-gray-700">{label}</label>
        {isEmail && (
          <button
            type="button"
            onClick={onSend}
            disabled={isSending || disabled}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
          >
            {isSending ? 'Sending...' : otpSent ? 'Resend OTP' : 'Send OTP to email'}
          </button>
        )}
      </div>
      <input
        type="text"
        value={value}
        onChange={onChange}
        required
        maxLength={6}
        disabled={disabled || (isEmail && !otpSent)}
        className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-center tracking-widest font-mono disabled:opacity-50 disabled:bg-gray-50"
        placeholder={isEmail ? 'Enter email OTP' : 'Enter 6-digit code'}
      />
      {isEmail && !otpSent && (
        <p className="text-xs text-gray-500 mt-1">Click "Send OTP to email" first</p>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ManageTwoFactorModal({ user, onClose, onUpdated }) {
  const isEnabled = user?.twoFactorEnabled;
  const currentMethod = user?.twoFactorMethod;
  const otherMethod = currentMethod === 'email' ? 'authenticator' : 'email';

  const [view, setView] = useState(isEnabled ? 'overview' : 'enable-select');

  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [isSendingOTP, setIsSendingOTP] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedMethod, setSelectedMethod] = useState(null);
  const [setupData, setSetupData] = useState(null);
  const [setupCode, setSetupCode] = useState('');
  const [isSettingUp, setIsSettingUp] = useState(false);

  const resetVerifyForm = () => { setPassword(''); setCode(''); setOtpSent(false); };

  const sendVerificationOTP = async () => {
    setIsSendingOTP(true);
    try {
      await authAPI.sendVerificationOTP();
      setOtpSent(true);
      toast.success('OTP sent to your email');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setIsSendingOTP(false);
    }
  };

  const handleDisable = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await authAPI.disable2FA(password, code);
      toast.success('Two-factor authentication disabled');
      onUpdated();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to disable 2FA');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSwitchVerify = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await authAPI.disable2FA(password, code);
      resetVerifyForm();
      await beginSetup(otherMethod);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const beginSetup = async (method) => {
    setIsSettingUp(true);
    setSelectedMethod(method);
    setSetupCode('');
    try {
      if (method === 'email') {
        const res = await authAPI.setupEmail2FA();
        setSetupData({ email: res.data.data?.email });
      } else {
        const res = await authAPI.setup2FA();
        setSetupData(res.data.data);
      }
      setView(isEnabled ? 'switch-setup' : 'enable-setup');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to start 2FA setup');
    } finally {
      setIsSettingUp(false);
    }
  };

  const resendSetupOTP = async () => {
    setIsSettingUp(true);
    try {
      const res = await authAPI.setupEmail2FA();
      setSetupData({ email: res.data.data?.email });
      toast.success('New OTP sent to your email');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to resend OTP');
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleSetupConfirm = async (e) => {
    e.preventDefault();
    setIsSettingUp(true);
    try {
      if (selectedMethod === 'email') {
        await authAPI.enableEmail2FA(setupCode);
      } else {
        await authAPI.enable2FA(setupCode);
      }
      toast.success(`Two-factor authentication ${isEnabled ? 'switched to' : 'enabled via'} ${selectedMethod === 'email' ? 'Email OTP' : 'Authenticator App'}`);
      onUpdated();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid verification code');
    } finally {
      setIsSettingUp(false);
    }
  };

  const methodLabel = (m) => m === 'email' ? 'Email OTP' : 'Authenticator App';

  const renderVerifyForm = ({ onSubmit, description, submitLabel, submitClass }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <p className="text-sm text-gray-600">{description}</p>
      <PasswordField value={password} onChange={e => setPassword(e.target.value)} disabled={isSubmitting} />
      <OTPCodeField
        label={currentMethod === 'email' ? 'Email OTP' : 'Authenticator Code'}
        value={code}
        onChange={e => setCode(e.target.value)}
        disabled={isSubmitting}
        isEmail={currentMethod === 'email'}
        isSending={isSendingOTP}
        onSend={sendVerificationOTP}
        otpSent={otpSent}
      />
      <div className="flex gap-3 pt-1">
        <button type="button" onClick={() => { setView('overview'); resetVerifyForm(); }}
          disabled={isSubmitting}
          className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm transition-colors disabled:opacity-50">
          Back
        </button>
        <button type="submit" disabled={isSubmitting}
          className={`flex-1 px-4 py-2.5 text-white rounded-lg font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 ${submitClass}`}>
          {isSubmitting
            ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />{submitLabel}...</>
            : submitLabel}
        </button>
      </div>
    </form>
  );

  const renderContent = () => {
    if (view === 'overview') return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">2FA is Active</p>
            <p className="text-xs text-green-700 mt-0.5">
              Currently secured via <span className="font-semibold">{methodLabel(currentMethod)}</span>
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <button onClick={() => { setView('switch-verify'); resetVerifyForm(); }}
            className="w-full flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all text-left group">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 group-hover:bg-blue-200">
                {currentMethod === 'email' ? <Smartphone className="w-4 h-4" /> : <Mail className="w-4 h-4" />}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Switch to {methodLabel(otherMethod)}</p>
                <p className="text-xs text-gray-500">Change your 2FA method</p>
              </div>
            </div>
            <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button onClick={() => { setView('disable'); resetVerifyForm(); }}
            className="w-full flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-red-400 hover:bg-red-50 transition-all text-left group">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-red-100 rounded-lg flex items-center justify-center text-red-600 group-hover:bg-red-200">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Disable 2FA</p>
                <p className="text-xs text-gray-500">Remove extra security layer</p>
              </div>
            </div>
            <svg className="w-4 h-4 text-gray-400 group-hover:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    );

    if (view === 'disable') return (
      <div>
        <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-4">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800">This will remove 2FA protection and clear all trusted devices.</p>
        </div>
        {renderVerifyForm({
          description: 'Enter your credentials to confirm.',
          onSubmit: handleDisable,
          submitLabel: 'Disable 2FA',
          submitClass: 'bg-red-600 hover:bg-red-700',
        })}
      </div>
    );

    if (view === 'switch-verify') return renderVerifyForm({
      description: `Verify your current ${methodLabel(currentMethod)} to proceed with switching to ${methodLabel(otherMethod)}.`,
      onSubmit: handleSwitchVerify,
      submitLabel: 'Continue',
      submitClass: 'bg-blue-600 hover:bg-blue-700',
    });

    if (view === 'switch-setup' || view === 'enable-setup') {
      const isSwitch = view === 'switch-setup';
      return (
        <form onSubmit={handleSetupConfirm} className="space-y-4">
          {selectedMethod === 'authenticator' ? (
            <>
              <p className="text-sm text-gray-600">Scan this QR code with your authenticator app, then enter the 6-digit code below.</p>
              <div className="flex flex-col items-center gap-3">
                {setupData?.qrCode && (
                  <div className="p-3 bg-white border-2 border-gray-200 rounded-lg">
                    <img src={setupData.qrCode} alt="2FA QR Code" className="w-44 h-44" />
                  </div>
                )}
                {setupData?.secret && (
                  <div className="w-full bg-gray-50 p-3 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1 font-medium">Manual entry code:</p>
                    <code className="text-xs font-mono break-all text-gray-800">{setupData.secret}</code>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Verification Code</label>
                <input type="text" value={setupCode} onChange={e => setSetupCode(e.target.value)}
                  required maxLength={6} disabled={isSettingUp}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-center tracking-widest font-mono disabled:opacity-50"
                  placeholder="000000" />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <Mail className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-blue-800">Check your email</p>
                  <p className="text-xs text-blue-700 mt-0.5">A 6-digit code was sent to <strong>{setupData?.email || 'your email'}</strong></p>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-gray-700">Email OTP</label>
                  <button type="button" onClick={resendSetupOTP} disabled={isSettingUp}
                    className="text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50">
                    Resend OTP
                  </button>
                </div>
                <input type="text" value={setupCode} onChange={e => setSetupCode(e.target.value)}
                  required maxLength={6} disabled={isSettingUp}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm text-center tracking-widest font-mono disabled:opacity-50"
                  placeholder="Enter 6-digit OTP" />
              </div>
            </>
          )}
          <div className="flex gap-3 pt-1">
            <button type="button"
              onClick={() => { setView(isSwitch ? 'switch-verify' : 'enable-select'); setSetupCode(''); }}
              disabled={isSettingUp}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-1">
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
            <button type="submit" disabled={isSettingUp || setupCode.length !== 6}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
              {isSettingUp
                ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Verifying...</>
                : isSwitch ? 'Confirm Switch' : 'Enable 2FA'}
            </button>
          </div>
        </form>
      );
    }

    if (view === 'enable-select') return (
      <div className="space-y-3">
        <p className="text-sm text-gray-600">Choose your preferred authentication method:</p>
        {[
          { method: 'authenticator', label: 'Authenticator App', desc: 'Use Google Authenticator, Authy or similar', Icon: Smartphone },
          { method: 'email', label: 'Email OTP', desc: 'Receive one-time codes via email', Icon: Mail },
        ].map(({ method, label, desc, Icon }) => (
          <button key={method} onClick={() => beginSetup(method)} disabled={isSettingUp}
            className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all text-left disabled:opacity-50 group">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 shrink-0 group-hover:bg-blue-200">
              <Icon className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900 group-hover:text-blue-700">{label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
            </div>
            {isSettingUp
              ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
              : <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
            }
          </button>
        ))}
        <button onClick={onClose} className="w-full mt-1 text-sm text-gray-500 hover:text-gray-700 py-2">Cancel</button>
      </div>
    );
  };

  const titles = {
    overview: 'Two-Factor Authentication',
    disable: 'Disable 2FA',
    'switch-verify': `Switch to ${methodLabel(otherMethod)}`,
    'switch-setup': `Set Up ${methodLabel(selectedMethod)}`,
    'enable-select': 'Enable 2FA',
    'enable-setup': `Set Up ${methodLabel(selectedMethod)}`,
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">{titles[view] || 'Two-Factor Authentication'}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">{renderContent()}</div>
      </div>
    </div>
  );
}
