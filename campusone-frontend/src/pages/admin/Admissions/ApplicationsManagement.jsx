import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { useApplications } from './hooks/useApplications';
import ApplicationsList from './components/ApplicationsList';

const ApplicationsManagement = () => {
  const { status = 'all' } = useParams();
  const navigate = useNavigate();
  const {
    applications,
    loading,
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
    fetchApplications(status, currentPage, pageSize);
  }, [status, currentPage, pageSize]);

  const getPageTitle = () => {
    switch (status) {
      case 'pending':
        return 'Pending Applications';
      case 'under_review':
        return 'Under Review Applications';
      case 'accepted':
        return 'Accepted Applications';
      case 'rejected':
        return 'Rejected Applications';
      case 'waitlisted':
        return 'Waitlisted Applications';
      default:
        return 'All Applications';
    }
  };

  const getPageIcon = () => {
    switch (status) {
      case 'pending':
        return <Clock size={28} />;
      case 'under_review':
        return <AlertCircle size={28} />;
      case 'accepted':
        return <CheckCircle size={28} />;
      case 'rejected':
        return <Users size={28} />;
      case 'waitlisted':
        return <Clock size={28} />;
      default:
        return <Users size={28} />;
    }
  };

  const getPageColor = () => {
    switch (status) {
      case 'pending':
        return 'text-yellow-600';
      case 'under_review':
        return 'text-blue-600';
      case 'accepted':
        return 'text-green-600';
      case 'rejected':
        return 'text-red-600';
      case 'waitlisted':
        return 'text-orange-600';
      default:
        return 'text-primary-600';
    }
  };

  return (
    <div className="p-8 max-w-[1200px] mx-auto max-md:p-4">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => navigate('/admin/admissions')}
          className="flex items-center gap-2 text-primary-500 hover:text-primary-600 mb-4 font-semibold transition-colors"
        >
          <ArrowLeft size={20} />
          Back to Settings
        </button>

        <div className="flex items-center gap-3 mb-2">
          <div className={`${getPageColor()}`}>{getPageIcon()}</div>
          <h2 className="text-[2rem] font-bold text-slate-800 m-0">{getPageTitle()}</h2>
        </div>
        <p className="text-slate-500 text-base m-0 pl-10">
          Manage {status === 'all' ? 'all' : status.replace('_', ' ')} admission applications
        </p>
      </div>

      {/* Stats Summary */}
      <div className="bg-white rounded-xl p-6 mb-8 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-sm text-slate-500 m-0">Total Applications</p>
            <p className="text-3xl font-bold text-slate-800 m-0">{totalCount}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500 m-0">Page Size</p>
            <p className="text-lg font-semibold text-slate-800 m-0">{pageSize} per page</p>
          </div>
        </div>
      </div>

      {/* Applications List */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <ApplicationsList
          applications={applications}
          loading={loading}
          totalCount={totalCount}
          currentPage={currentPage}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          onAccept={acceptApplication}
          onReject={rejectApplication}
          onReview={putUnderReview}
          onRefresh={() => fetchApplications(status, currentPage, pageSize)}
        />
      </div>
    </div>
  );
};

export default ApplicationsManagement;
