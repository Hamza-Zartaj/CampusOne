import React from 'react';
import { Users, Clock, AlertCircle, CheckCircle, XCircle } from 'lucide-react';

const ApplicationsTabs = ({ statistics, isLoading, selectedTab, onTabChange }) => {
  const tabs = [
    { id: 'pending', label: 'Pending', icon: Clock, count: statistics?.pending, color: 'text-yellow-600', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' },
    { id: 'under_review', label: 'Under Review', icon: AlertCircle, count: statistics?.underReview, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
    { id: 'accepted', label: 'Accepted', icon: CheckCircle, count: statistics?.accepted, color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
    { id: 'rejected', label: 'Rejected', icon: XCircle, count: statistics?.rejected || 0, color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
    { id: 'all', label: 'All', icon: Users, count: statistics?.total, color: 'text-primary-600', bgColor: 'bg-primary-50', borderColor: 'border-primary-200' },
  ];

  if (isLoading) {
    return (
      <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 w-32 bg-gray-200 rounded-lg animate-pulse flex-shrink-0" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = selectedTab === tab.id;
        
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              flex items-center gap-2 px-4 py-3 rounded-lg font-semibold text-sm flex-shrink-0 transition-all whitespace-nowrap
              ${isActive 
                ? `${tab.bgColor} ${tab.color} border-2 ${tab.borderColor}` 
                : 'bg-white text-slate-700 border-2 border-gray-200 hover:bg-gray-50'
              }
            `}
          >
            <Icon size={18} />
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className={`ml-1 font-bold ${isActive ? tab.color : 'text-slate-500'}`}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default ApplicationsTabs;
