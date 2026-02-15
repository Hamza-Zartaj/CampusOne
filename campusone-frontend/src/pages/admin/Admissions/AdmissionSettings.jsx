import React, { useState, useEffect } from 'react';
import { admissionAPI } from '../../../utils/api';
import toast from 'react-hot-toast';
import { Settings, RefreshCw } from 'lucide-react';
import AdmissionStatusToggle from './components/AdmissionStatusToggle';
import StatisticsCards from './components/StatisticsCards';
import ApplicationSettings from './components/ApplicationSettings';

const AdmissionSettingsPage = () => {
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

  const handleSettingsChange = (field, value) => {
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
          <h2 className="text-[2rem] font-bold m-0">Admissions</h2>
        </div>
        <p className="text-slate-500 text-base m-0 pl-10">
          Control admission applications for your institution
        </p>
      </div>

      {/* Statistics Cards */}
      <StatisticsCards statistics={statistics} isLoading={loading} />

      {/* Admission Status Toggle */}
      <AdmissionStatusToggle
        isOpen={settings.isOpen}
        onToggle={handleToggleAdmissions}
        saving={saving}
        isLoading={loading}
      />

      

      {/* Application Settings */}
      <ApplicationSettings
        settings={settings}
        onSettingsChange={handleSettingsChange}
        onSave={handleSaveSettings}
        saving={saving}
        isLoading={loading}
      />
    </div>
  );
};

export default AdmissionSettingsPage;
