import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const TrustedDevices = () => {
  const { api } = useAuth();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDevices();
  }, []);

  const fetchDevices = async () => {
    try {
      const response = await api.get('/auth/trusted-devices');
      setDevices(response.data.trustedDevices || []);
    } catch (err) {
      setError('Failed to fetch trusted devices');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveDevice = async (deviceId) => {
    if (!confirm('Are you sure you want to remove this device?')) return;

    try {
      await api.delete(`/auth/trusted-devices/${deviceId}`);
      setDevices(devices.filter(d => d.deviceId !== deviceId));
    } catch (err) {
      setError('Failed to remove device');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-blue-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold">Trusted Devices</h1>
          <p className="mt-2 text-sky-50">Manage devices that can skip 2FA</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-xl font-bold text-slate-800">Your Trusted Devices</h2>
          </div>
          
          <div className="p-6">
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {loading ? (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-900"></div>
              </div>
            ) : devices.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {devices.map((device) => (
                  <div key={device.deviceId} className="border border-slate-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-slate-800">{device.deviceName}</h3>
                        <p className="text-sm text-slate-500 mt-1">IP: {device.ipAddress}</p>
                        <p className="text-sm text-slate-500">
                          Last used: {new Date(device.lastUsed).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleRemoveDevice(device.deviceId)}
                        className="px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-slate-500 text-center py-8">No trusted devices</p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default TrustedDevices;
