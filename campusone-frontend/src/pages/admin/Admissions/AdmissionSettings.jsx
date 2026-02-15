import React, { useState, useEffect } from 'react';
import { admissionAPI } from '../../../utils/api';
import toast from 'react-hot-toast';
import { Settings, RefreshCw } from 'lucide-react';
import AdmissionStatusToggle from './components/AdmissionStatusToggle';
import ApplicationsTabs from './components/StatisticsCards';
import ApplicationSettings from './components/ApplicationSettings';
import { useApplications } from './hooks/useApplications';
import ApplicationsList from './components/ApplicationsList';

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
  const [selectedTab, setSelectedTab] = useState('pending');
  const [filterProgram, setFilterProgram] = useState('');

  const {
    applications,
    loading: appsLoading,
    currentPage,
    pageSize,
    totalCount,
    fetchApplications,
    acceptApplication,
    rejectApplication,
    putUnderReview,
    setCurrentPage,
    setPageSize,
  } = useApplications();

  useEffect(() => {
    fetchSettings();
    fetchStatistics();
  }, []);

  useEffect(() => {
    fetchApplications(selectedTab, currentPage, pageSize);
  }, [selectedTab, currentPage, pageSize]);

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

      {/* Admission Status Toggle */}
      <AdmissionStatusToggle
        isOpen={settings.isOpen}
        onToggle={handleToggleAdmissions}
        saving={saving}
        isLoading={loading}
      />

      {/* Applications Tabs */}
      <div className="mb-8">
        <ApplicationsTabs 
          statistics={statistics} 
          isLoading={loading}
          selectedTab={selectedTab}
          onTabChange={(tab) => {
            setSelectedTab(tab);
            setCurrentPage(1);
          }}
        />
      </div>

      {/* Applications List */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 mb-8">
        <div className="mb-4 flex gap-4 items-end flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Filter by Program
            </label>
            <input
              type="text"
              placeholder="Search program name..."
              value={filterProgram}
              onChange={(e) => setFilterProgram(e.target.value)}
              className="w-full p-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary-500"
            />
          </div>
        </div>

        <ApplicationsList
          applications={applications.filter(app => 
            !filterProgram || (app.program && app.program.toLowerCase().includes(filterProgram.toLowerCase()))
          )}
          loading={appsLoading}
          totalCount={totalCount}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          onAccept={acceptApplication}
          onReject={rejectApplication}
          onReview={putUnderReview}
          onRefresh={() => fetchApplications(selectedTab, currentPage, pageSize)}
        />
      </div>

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
