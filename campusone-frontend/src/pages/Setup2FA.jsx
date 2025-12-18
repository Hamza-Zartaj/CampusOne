import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

const Setup2FA = () => {
  const { setup2FA, enable2FA } = useAuth();
  const navigate = useNavigate();
  
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [token, setToken] = useState('');
  const [step, setStep] = useState(1); // 1: Generate QR, 2: Verify token
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGenerateQR = async () => {
    setLoading(true);
    setError('');
    
    const result = await setup2FA();
    
    if (result.success) {
      setQrCode(result.data.qrCode);
      setSecret(result.data.secret);
      setStep(2);
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    const result = await enable2FA(token);
    
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-800">
            Setup Two-Factor Authentication
          </h2>
          <p className="mt-2 text-center text-sm text-slate-500">
            Add an extra layer of security to your account
          </p>
        </div>

        <div className="bg-white rounded-lg shadow p-8">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {step === 1 && (
            <div className="text-center">
              <p className="text-slate-600 mb-6">
                Click the button below to generate your unique QR code
              </p>
              <button
                onClick={handleGenerateQR}
                disabled={loading}
                className="px-6 py-3 bg-blue-900 text-white rounded hover:bg-blue-800 disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Generate QR Code'}
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">
                  Step 1: Scan QR Code
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
                </p>
                {qrCode && (
                  <img src={qrCode} alt="2FA QR Code" className="mx-auto border border-slate-200 rounded" />
                )}
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-slate-800 mb-2">
                  Step 2: Enter Code
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  Enter the 6-digit code from your authenticator app
                </p>
                <form onSubmit={handleVerify}>
                  <input
                    type="text"
                    maxLength="6"
                    placeholder="000000"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-center text-2xl tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    className="mt-4 w-full py-2 bg-blue-900 text-white rounded hover:bg-blue-800 disabled:opacity-50"
                  >
                    {loading ? 'Enabling...' : 'Enable 2FA'}
                  </button>
                </form>
              </div>

              <div className="bg-sky-50 border border-blue-500 rounded p-4">
                <p className="text-xs text-slate-600">
                  <strong>Manual Setup Key:</strong><br />
                  <code className="bg-white px-2 py-1 rounded text-xs">{secret}</code>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Setup2FA;
