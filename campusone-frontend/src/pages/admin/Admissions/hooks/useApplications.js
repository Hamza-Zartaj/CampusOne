import { useState, useCallback } from 'react';
import { admissionAPI } from '../../../../utils/api';
import toast from 'react-hot-toast';

export const useApplications = () => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filteredApplications, setFilteredApplications] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // Map frontend status to backend status
  const mapStatusToBackend = (status) => {
    const statusMap = {
      'all': null,
      'pending': 'Pending',
      'under_review': 'Under Review',
      'accepted': 'Accepted',
      'rejected': 'Rejected',
      'waitlisted': 'Waitlisted'
    };
    return statusMap[status] || null;
  };

  // Map backend status to frontend status
  const mapStatusToFrontend = (status) => {
    const statusMap = {
      'Pending': 'pending',
      'Under Review': 'under_review',
      'Accepted': 'accepted',
      'Rejected': 'rejected',
      'Waitlisted': 'waitlisted'
    };
    return statusMap[status] || status;
  };

  const fetchApplications = useCallback(async (status = null, page = 1, size = 10) => {
    try {
      setLoading(true);
      const backendStatus = mapStatusToBackend(status);
      const params = {
        page,
        limit: size,
      };

      if (backendStatus) {
        params.status = backendStatus;
      }

      const response = await admissionAPI.getAllApplications(params);
      const data = response.data.data;

      // Handle both array and paginated response structures
      const appList = Array.isArray(data) ? data : data.applications || [];
      const total = Array.isArray(data) ? appList.length : data.total || appList.length;

      setApplications(appList);
      setTotalCount(total);
      setCurrentPage(page);
      setPageSize(size);
      
      return appList;
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to fetch applications');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const updateApplicationStatus = useCallback(async (applicationId, status, reason = '') => {
    try {
      setLoading(true);
      // Convert frontend status to backend status
      const backendStatus = mapStatusToBackend(status);
      
      await admissionAPI.updateApplicationStatus(applicationId, backendStatus, reason);
      toast.success(`Application ${status.replace('_', ' ')} successfully`);
      
      // Refresh the list
      await fetchApplications(null, currentPage, pageSize);
      return true;
    } catch (error) {
      console.error('Error updating application:', error);
      toast.error('Failed to update application status');
      return false;
    } finally {
      setLoading(false);
    }
  }, [fetchApplications, currentPage, pageSize]);

  const acceptApplication = useCallback(
    async (applicationId) => {
      return updateApplicationStatus(applicationId, 'accepted');
    },
    [updateApplicationStatus]
  );

  const rejectApplication = useCallback(
    async (applicationId, reason = '') => {
      return updateApplicationStatus(applicationId, 'rejected', reason);
    },
    [updateApplicationStatus]
  );

  const putUnderReview = useCallback(
    async (applicationId, reason = '') => {
      return updateApplicationStatus(applicationId, 'under_review', reason);
    },
    [updateApplicationStatus]
  );

  return {
    applications,
    loading,
    currentPage,
    pageSize,
    totalCount,
    fetchApplications,
    updateApplicationStatus,
    acceptApplication,
    rejectApplication,
    putUnderReview,
    setCurrentPage,
    setPageSize,
    mapStatusToFrontend,
  };
};
