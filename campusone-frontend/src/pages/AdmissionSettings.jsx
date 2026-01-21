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
import '../styles/AdmissionSettings.css';

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
      
      // Fetch full settings for admin
      // Since the public endpoint returns limited data, we'll use default values
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
      
      // Prepare settings data with the new status
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
      
      // Refresh statistics
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
      
      // Prepare settings data
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
      
      // Refresh statistics
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
      <div className="admission-settings-loading">
        <RefreshCw className="spin" size={32} />
        <p>Loading admission settings...</p>
      </div>
    );
  }

  return (
    <div className="admission-settings">
      <div className="settings-header">
        <div className="header-title">
          <Settings size={28} />
          <h2>Admission Settings</h2>
        </div>
        <p className="header-subtitle">
          Control admission applications for your institution
        </p>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="stats-grid">
          <div className="stat-card">
            <Users size={24} />
            <div className="stat-content">
              <h3>{statistics.total}</h3>
              <p>Total Applications</p>
            </div>
          </div>
          <div className="stat-card pending">
            <div className="stat-content">
              <h3>{statistics.pending}</h3>
              <p>Pending</p>
            </div>
          </div>
          <div className="stat-card review">
            <div className="stat-content">
              <h3>{statistics.underReview}</h3>
              <p>Under Review</p>
            </div>
          </div>
          <div className="stat-card accepted">
            <CheckCircle size={24} />
            <div className="stat-content">
              <h3>{statistics.accepted}</h3>
              <p>Accepted</p>
            </div>
          </div>
        </div>
      )}

      {/* Admission Toggle */}
      <div className="settings-card main-toggle">
        <div className="toggle-header">
          <div>
            <h3>Admission Status</h3>
            <p>Enable or disable admission applications</p>
          </div>
          <button
            className={`toggle-btn ${settings.isOpen ? 'open' : 'closed'}`}
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
        <div className={`status-indicator ${settings.isOpen ? 'open' : 'closed'}`}>
          {settings.isOpen 
            ? '✅ Students can now submit admission applications'
            : '❌ Admission applications are currently closed'}
        </div>
      </div>

      <div className="settings-card">
        <h3>Application Settings</h3>
        <div className="form-group">
          <label>Instructions for Applicants</label>
          <textarea
            value={settings.instructions}
            onChange={(e) => handleChange('instructions', e.target.value)}
            className="form-textarea"
            rows="4"
            placeholder="Enter instructions for applicants..."
          />
        </div>
        
        <div className="form-group">
          <label>Maximum Applications (Optional)</label>
          <input
            type="number"
            value={settings.maxApplications}
            onChange={(e) => handleChange('maxApplications', e.target.value)}
            className="form-input"
            placeholder="Leave empty for unlimited"
            min="0"
          />
          <span className="input-hint">Set a limit on total applications</span>
        </div>

        <div className="form-group checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={settings.requiresDocuments}
              onChange={(e) => handleChange('requiresDocuments', e.target.checked)}
            />
            <span>Require document uploads</span>
          </label>
        </div>
      </div>

      {/* Save Button */}
      <div className="settings-actions">
        <button
          className="btn-save"
          onClick={handleSaveSettings}
          disabled={saving}
        >
          {saving ? (
            <>
              <RefreshCw className="spin" size={18} />
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
