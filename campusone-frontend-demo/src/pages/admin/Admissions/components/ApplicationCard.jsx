import React from 'react';
import { ChevronRight, CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';

const ApplicationCard = ({ application, onClick }) => {
  const getStatusIcon = (status) => {
    switch (status) {
      case 'Pending':
        return <Clock size={20} className="text-yellow-500" />;
      case 'Under Review':
        return <AlertCircle size={20} className="text-blue-500" />;
      case 'Accepted':
        return <CheckCircle size={20} className="text-green-500" />;
      case 'Rejected':
        return <XCircle size={20} className="text-red-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Under Review':
        return 'bg-blue-100 text-blue-800';
      case 'Accepted':
        return 'bg-green-100 text-green-800';
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div
      onClick={onClick}
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
    >
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-slate-800">
              {application.fullName}
            </h3>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full inline-flex items-center gap-1 ${getStatusColor(application.status)}`}>
              {getStatusIcon(application.status)}
              {application.status}
            </span>
          </div>
          <p className="text-sm text-slate-600 mb-2">{application.email}</p>
          
          {application.program && (
            <div className="text-sm text-slate-500">
              <span className="font-medium">Applied for: </span>
              {application.program}
            </div>
          )}

          <div className="text-xs text-slate-400 mt-2">
            Applied on {new Date(application.submittedAt || application.createdAt).toLocaleDateString()}
          </div>
        </div>

        <div className="text-slate-400 hover:text-slate-600 transition-colors">
          <ChevronRight size={24} />
        </div>
      </div>
    </div>
  );
};

export default ApplicationCard;
