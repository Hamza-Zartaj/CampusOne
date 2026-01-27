import React, { useState, useEffect } from 'react';
import { admissionAPI } from '../utils/api';
import toast from 'react-hot-toast';
import { 
  Settings, 
  Users, 
  CheckCircle, 
  XCircle,
  Save,
  RefreshCw
} from 'lucide-react';

const AdmissionSettings = () => {
  const [settings, setSettings] = useState({
    isOpen: false,
    startDate: '',
    endDate: '',
    instructions: '',
    maxApplications: '',
    requiresDocuments: true,
    requiredDocuments: ['transcript', 'idProof', 'photo'],
    notificationEmails: []
  });
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
    fetchStatistics();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await admissionAPI.getSettings();
      setSettings(prev => ({
        ...prev,
        ...response.data.data
      }));
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Failed to fetch admission settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await admissionAPI.getStatistics();
      setStatistics(response.data.data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const handleToggleAdmissions = async () => {
    try {
      setSaving(true);
      const newIsOpen = !settings.isOpen;
      
      const settingsData = {
        ...settings,
        isOpen: newIsOpen,
        maxApplications: settings.maxApplications ? parseInt(settings.maxApplications) : null
      };
      
      await admissionAPI.updateSettings(settingsData);
      setSettings(prev => ({ ...prev, isOpen: newIsOpen }));
      
      toast.success(
        newIsOpen 
          ? '✅ Admissions are now OPEN' 
          : '❌ Admissions are now CLOSED'
      );
      
      fetchStatistics();
    } catch (error) {
      console.error('Error toggling admissions:', error);
      toast.error('Failed to update admission status');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      
      const settingsData = {
        ...settings,
        maxApplications: settings.maxApplications ? parseInt(settings.maxApplications) : null
      };
      
      await admissionAPI.updateSettings(settingsData);
      
      toast.success(
        settings.isOpen 
          ? '✅ Settings saved - Admissions are OPEN' 
          : '❌ Settings saved - Admissions are CLOSED'
      );
      
      fetchStatistics();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 text-slate-500">
        <RefreshCw className="animate-spin" size={32} />
        <p>Loading admission settings...</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1200px] mx-auto max-md:p-4">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 text-slate-800 mb-2">
          <Settings size={28} />
          <h2 className="text-[2rem] font-bold m-0">Admission Settings</h2>
        </div>
        <p className="text-slate-500 text-base m-0 pl-10">
          Control admission applications for your institution
        </p>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-8">
          <div className="bg-white rounded-xl p-6 flex items-center gap-4 shadow-sm border border-gray-200 transition-all hover:shadow-md hover:-translate-y-0.5">
            <Users size={24} className="text-primary-500 shrink-0" />
            <div>
              <h3 className="text-[2rem] font-bold text-slate-800 m-0">{statistics.total}</h3>
              <p className="text-sm text-slate-500 m-0">Total Applications</p>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 flex items-center gap-4 shadow-sm border border-gray-200 transition-all hover:shadow-md hover:-translate-y-0.5">
            <div className="text-warning">
              <div>
                <h3 className="text-[2rem] font-bold text-slate-800 m-0">{statistics.pending}</h3>
                <p className="text-sm text-slate-500 m-0">Pending</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 flex items-center gap-4 shadow-sm border border-gray-200 transition-all hover:shadow-md hover:-translate-y-0.5">
            <div className="text-info">
              <div>
                <h3 className="text-[2rem] font-bold text-slate-800 m-0">{statistics.underReview}</h3>
                <p className="text-sm text-slate-500 m-0">Under Review</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-6 flex items-center gap-4 shadow-sm border border-gray-200 transition-all hover:shadow-md hover:-translate-y-0.5">
            <CheckCircle size={24} className="text-success shrink-0" />
            <div>
              <h3 className="text-[2rem] font-bold text-slate-800 m-0">{statistics.accepted}</h3>
              <p className="text-sm text-slate-500 m-0">Accepted</p>
            </div>
          </div>
        </div>
      )}

      {/* Admission Toggle */}
      <div className="bg-white rounded-xl p-8 mb-6 shadow-sm border-2 border-gray-200">
        <div className="flex justify-between items-center gap-4 mb-4 flex-wrap max-md:flex-col max-md:items-start">
          <div>
            <h3 className="text-2xl font-semibold text-slate-800 m-0 mb-2">Admission Status</h3>
            <p className="text-slate-500 m-0">Enable or disable admission applications</p>
          </div>
          <button
            className={`flex items-center gap-2 py-3 px-6 border-none rounded-full font-semibold text-base cursor-pointer transition-all max-md:w-full max-md:justify-center ${
              settings.isOpen 
                ? 'bg-success text-white hover:bg-green-600 hover:scale-105' 
                : 'bg-danger text-white hover:bg-red-600 hover:scale-105'
            } disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none`}
            onClick={handleToggleAdmissions}
            disabled={saving}
          >
            {settings.isOpen ? (
              <>
                <CheckCircle size={20} />
                OPEN
              </>
            ) : (
              <>
                <XCircle size={20} />
                CLOSED
              </>
            )}
          </button>
        </div>
        <div className={`p-4 rounded-lg font-medium text-center ${
          settings.isOpen 
            ? 'bg-green-100 text-green-800 border border-green-200' 
            : 'bg-red-100 text-red-800 border border-red-200'
        }`}>
          {settings.isOpen 
            ? '✅ Students can now submit admission applications'
            : '❌ Admission applications are currently closed'}
        </div>
      </div>

      {/* Application Settings */}
      <div className="bg-white rounded-xl p-8 mb-6 shadow-sm border border-gray-200">
        <h3 className="text-xl font-semibold text-slate-800 m-0 mb-6 flex items-center gap-2">
          Application Settings
        </h3>
        
        <div className="mb-6">
          <label className="block font-semibold text-slate-800 mb-2 text-[0.95rem]">
            Instructions for Applicants
          </label>
          <textarea
            value={settings.instructions}
            onChange={(e) => handleChange('instructions', e.target.value)}
            className="w-full p-3 border-2 border-gray-200 rounded-lg text-base transition-all focus:outline-none focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10 resize-y min-h-[100px] font-inherit"
            rows="4"
            placeholder="Enter instructions for applicants..."
          />
        </div>
        
        <div className="mb-6">
          <label className="block font-semibold text-slate-800 mb-2 text-[0.95rem]">
            Maximum Applications (Optional)
          </label>
          <input
            type="number"
            value={settings.maxApplications}
            onChange={(e) => handleChange('maxApplications', e.target.value)}
            className="w-full p-3 border-2 border-gray-200 rounded-lg text-base transition-all focus:outline-none focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10"
            placeholder="Leave empty for unlimited"
            min="0"
          />
          <span className="block text-sm text-slate-400 mt-1.5">Set a limit on total applications</span>
        </div>

        <div className="mt-4">
          <label className="flex items-center gap-3 cursor-pointer font-medium">
            <input
              type="checkbox"
              checked={settings.requiresDocuments}
              onChange={(e) => handleChange('requiresDocuments', e.target.checked)}
              className="w-5 h-5 cursor-pointer accent-primary-500"
            />
            <span>Require document uploads</span>
          </label>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-4 mt-8 max-md:flex-col">
        <button
          className="flex items-center gap-2 py-3.5 px-8 bg-gradient-primary text-white border-none rounded-lg font-semibold text-base cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed max-md:w-full max-md:justify-center"
          onClick={handleSaveSettings}
          disabled={saving}
        >
          {saving ? (
            <>
              <RefreshCw className="animate-spin" size={18} />
              Saving...
            </>
          ) : (
            <>
              <Save size={18} />
              Save Settings
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default AdmissionSettings;
