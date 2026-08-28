export default function TwoFactorMethodSelection({ isLoading, onSelectMethod, onSkip }) {
  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <svg className="w-6 h-6 text-blue-600 mt-0.5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          <div className="text-left">
            <h3 className="font-semibold text-blue-800 text-sm mb-1">Recommended: Enable 2FA</h3>
            <p className="text-blue-700 text-sm">
              Choose your preferred authentication method to add an extra layer of security.
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3">
        {/* Authenticator App Option */}
        <button
          onClick={() => onSelectMethod('authenticator')}
          disabled={isLoading}
          className="w-full p-4 border-2 border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          <div className="flex items-start">
            <div className="shrink-0 w-12 h-12 bg-linear-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors">
                Authenticator App
              </h4>
              <p className="text-sm text-slate-600">
                Use Google Authenticator, Authy, or similar apps to generate verification codes
              </p>
            </div>
            <svg className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>

        {/* Email OTP Option */}
        <button
          onClick={() => onSelectMethod('email')}
          disabled={isLoading}
          className="w-full p-4 border-2 border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed group"
        >
          <div className="flex items-start">
            <div className="shrink-0 w-12 h-12 bg-linear-to-br from-blue-500 to-cyan-600 rounded-lg flex items-center justify-center mr-4">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors">
                Email OTP
              </h4>
              <p className="text-sm text-slate-600">
                Receive one-time passwords via email for verification
              </p>
            </div>
            <svg className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition-colors shrink-0 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </button>
      </div>

      <button
        onClick={onSkip}
        disabled={isLoading}
        className="w-full bg-slate-100 text-slate-700 font-semibold py-3 px-6 rounded-lg hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Skip for Now
      </button>

      <p className="text-xs text-slate-500 text-center mt-4">
        You can enable 2FA later from your account settings
      </p>
    </div>
  );
}
