import React from 'react';
import { Save, RefreshCw } from 'lucide-react';

const ApplicationSettings = ({ settings, onSettingsChange, onSave, saving, isLoading }) => {
  const handleChange = (field, value) => {
    onSettingsChange(field, value);
  };

  return (
    <div className="bg-white rounded-xl p-8 mb-6 shadow-sm border border-gray-200">
      <h3 className="text-xl font-semibold text-slate-800 m-0 mb-6 flex items-center gap-2">
        Application Settings
      </h3>

      <div className="mb-6">
        <label className="block font-semibold text-slate-800 mb-2 text-[0.95rem]">
          Instructions for Applicants
        </label>
        <textarea
          value={settings.instructions || ''}
          onChange={(e) => handleChange('instructions', e.target.value)}
          className="w-full p-3 border-2 border-gray-200 rounded-lg text-base transition-all focus:outline-none focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10 resize-y min-h-25 font-inherit"
          rows="4"
          placeholder="Enter instructions for applicants..."
          disabled={isLoading}
        />
      </div>

      <div className="mb-6">
        <label className="block font-semibold text-slate-800 mb-2 text-[0.95rem]">
          Maximum Applications (Optional)
        </label>
        <input
          type="number"
          value={settings.maxApplications || ''}
          onChange={(e) => handleChange('maxApplications', e.target.value)}
          className="w-full p-3 border-2 border-gray-200 rounded-lg text-base transition-all focus:outline-none focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10"
          placeholder="Leave empty for unlimited"
          min="0"
          disabled={isLoading}
        />
        <span className="block text-sm text-slate-400 mt-1.5">Set a limit on total applications</span>
      </div>

      <div className="mt-4">
        <label className="flex items-center gap-3 cursor-pointer font-medium">
          <input
            type="checkbox"
            checked={settings.requiresDocuments || false}
            onChange={(e) => handleChange('requiresDocuments', e.target.checked)}
            className="w-5 h-5 cursor-pointer accent-primary-500"
            disabled={isLoading}
          />
          <span>Require document uploads</span>
        </label>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-4 mt-8">
        <button
          className="flex items-center gap-2 py-3.5 px-8 bg-gradient-primary text-white border-none rounded-lg font-semibold text-base cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
          onClick={onSave}
          disabled={saving || isLoading}
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

export default ApplicationSettings;
