export default function TwoFactorSetupVerification({
  twoFactorMethod,
  twoFactorData,
  verificationCode,
  onCodeChange,
  onVerify,
  onBack,
  isLoading,
}) {
  return (
    <div className="space-y-6">
      {twoFactorMethod === 'authenticator' ? (
        // Authenticator QR Code
        <form onSubmit={onVerify} className="space-y-4">
          <div className="text-center">
            <h3 className="font-semibold text-slate-800 mb-4">Scan QR Code</h3>
            <div className="bg-white p-4 rounded-lg inline-block border-2 border-slate-200">
              <img 
                src={twoFactorData?.qrCode} 
                alt="2FA QR Code" 
                className="w-48 h-48"
              />
            </div>
            <p className="text-sm text-slate-600 mt-4">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-lg">
            <p className="text-xs text-slate-600 mb-2 font-semibold">Manual Entry Code:</p>
            <code className="text-sm font-mono bg-white px-3 py-2 rounded border border-slate-200 block text-center select-all break-all">
              {twoFactorData?.secret}
            </code>
          </div>

          <div>
            <label htmlFor="verificationCode" className="block text-sm font-semibold text-slate-700 mb-2">
              Enter Verification Code
            </label>
            <input
              type="text"
              id="verificationCode"
              value={verificationCode}
              onChange={onCodeChange}
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-center text-lg tracking-widest font-mono"
              placeholder="000000"
              required
              maxLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || verificationCode.length !== 6}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-700 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Verifying...
              </div>
            ) : (
              'Verify & Complete Setup'
            )}
          </button>

          <button
            type="button"
            onClick={onBack}
            disabled={isLoading}
            className="w-full bg-slate-100 text-slate-700 font-semibold py-3 px-6 rounded-lg hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back
          </button>
        </form>
      ) : (
        // Email OTP Verification
        <form onSubmit={onVerify} className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start">
              <svg className="w-6 h-6 text-blue-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <div className="text-left">
                <h3 className="font-semibold text-blue-800 text-sm mb-1">Check Your Email</h3>
                <p className="text-blue-700 text-sm">
                  We've sent a 6-digit code to <strong>{twoFactorData?.email}</strong>
                </p>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="emailOtpCode" className="block text-sm font-semibold text-slate-700 mb-2">
              Enter Verification Code
            </label>
            <input
              type="text"
              id="emailOtpCode"
              value={verificationCode}
              onChange={onCodeChange}
              className="w-full px-4 py-3 bg-slate-50 border-2 border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-center text-lg tracking-widest font-mono"
              placeholder="000000"
              required
              maxLength={6}
              autoFocus
            />
            <p className="text-xs text-slate-500 mt-2 text-center">
              Code expires in 10 minutes
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading || verificationCode.length !== 6}
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-semibold py-3 px-6 rounded-lg hover:from-blue-700 hover:to-cyan-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Verifying...
              </div>
            ) : (
              'Verify & Complete Setup'
            )}
          </button>

          <button
            type="button"
            onClick={onBack}
            disabled={isLoading}
            className="w-full bg-slate-100 text-slate-700 font-semibold py-3 px-6 rounded-lg hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back
          </button>
        </form>
      )}
    </div>
  );
}
