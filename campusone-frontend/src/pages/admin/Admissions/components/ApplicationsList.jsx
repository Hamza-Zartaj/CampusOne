import React, { useState } from 'react';
import { RefreshCw, Search } from 'lucide-react';
import ApplicationCard from './ApplicationCard';
import ApplicationDetail from './ApplicationDetail';

const ApplicationsList = ({
  applications,
  loading,
  onAccept,
  onReject,
  onReview,
  onRefresh,
  totalCount,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
}) => {
  const [selectedApp, setSelectedApp] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredApps = applications.filter(
    (app) =>
      (app.fullName && app.fullName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (app.email && app.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="space-y-4">
      {/* Search and Refresh */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="flex-1 min-w-[250px] relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary-500"
          />
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-2 py-2 px-4 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-all disabled:opacity-50"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
          <RefreshCw className="animate-spin mb-2" size={32} />
          <p>Loading applications...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredApps.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <p className="text-lg">No applications found</p>
          {searchTerm && <p className="text-sm">Try adjusting your search criteria</p>}
        </div>
      )}

      {/* Applications List */}
      {!loading && filteredApps.length > 0 && (
        <div className="space-y-3">
          {filteredApps.map((app) => (
            <ApplicationCard
              key={app._id}
              application={app}
              onClick={() => setSelectedApp(app)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 flex-wrap gap-4">
          <div className="text-sm text-slate-500">
            Showing page {currentPage} of {totalPages} ({totalCount} total)
          </div>
          <div className="flex gap-2 items-center">
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(parseInt(e.target.value))}
              className="py-1 px-3 border border-gray-200 rounded-lg text-sm"
            >
              <option value={10}>10 per page</option>
              <option value={25}>25 per page</option>
              <option value={50}>50 per page</option>
            </select>
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="py-1 px-3 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="py-1 px-3 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedApp && (
        <ApplicationDetail
          application={selectedApp}
          onClose={() => setSelectedApp(null)}
          onAccept={onAccept}
          onReject={onReject}
          onReview={onReview}
          loading={loading}
        />
      )}
    </div>
  );
};

export default ApplicationsList;
