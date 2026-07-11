import React, { useState } from 'react';
import { X, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import clientLogger from '../../../../utils/clientLogger';
import { API_SERVER_URL } from '../../../../utils/env';

const ApplicationDetail = ({
  application,
  onClose,
  onAccept,
  onReject,
  onReview,
  loading = false,
}) => {
  const [modalOpen, setModalOpen] = useState(true);
  const [actionType, setActionType] = useState(null);
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [selectedDocTab, setSelectedDocTab] = useState('personal');

  // Helper function to get proper file URL
  const getFileUrl = (filePath) => {
    if (!filePath) return '#';
    if (filePath.startsWith('http')) return filePath;
    return `${API_SERVER_URL}${filePath.startsWith('/') ? filePath : '/' + filePath}`;
  };

  const handleAction = async () => {
    if (actionType === 'reject' && !reason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    if (actionType === 'review' && !reason.trim()) {
      toast.error('Please provide a reason for putting under review');
      return;
    }

    setProcessing(true);
    try {
      if (actionType === 'accept') {
        await onAccept(application.id);
      } else if (actionType === 'reject') {
        await onReject(application.id, reason);
      } else if (actionType === 'review') {
        await onReview(application.id, reason);
      }
      setModalOpen(false);
      onClose();
    } catch (error) {
      clientLogger.error('Error performing admission action', error);
    } finally {
      setProcessing(false);
    }
  };

  if (!modalOpen) return null;

  const getStatusColor = (status) => {
    switch (status) {
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Under Review':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Accepted':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'Rejected':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Document organization helper
  const documentTabs = [
    { id: 'personal', label: 'Personal', icon: '👤' },
    { id: 'education', label: 'Education', icon: '📚' },
    { id: 'address', label: 'Address', icon: '🏠' },
    { id: 'guardian', label: 'Guardian', icon: '👨‍👩‍👧' },
    { id: 'other', label: 'Other', icon: '📄' }
  ];

  const categorizeDocument = (docName) => {
    const nameLower = docName.toLowerCase();
    if (nameLower.includes('cnic') || nameLower.includes('id') || nameLower.includes('nid')) return 'personal';
    if (nameLower.includes('transcript') || nameLower.includes('certificate') || nameLower.includes('result')) return 'education';
    if (nameLower.includes('domicile') || nameLower.includes('address')) return 'address';
    if (nameLower.includes('guardian')) return 'guardian';
    return 'other';
  };

  const getDocumentsByTab = (tab) => {
    const docs = [];
    
    if (tab === 'personal') {
      if (application.cnicFront) {
        docs.push({ name: 'CNIC Front', url: application.cnicFront, type: 'image' });
      }
      if (application.cnicBack) {
        docs.push({ name: 'CNIC Back', url: application.cnicBack, type: 'image' });
      }
    } else if (tab === 'education') {
      if (application.educationRecords && application.educationRecords.length > 0) {
        application.educationRecords.forEach((record, idx) => {
          if (record.transcript) {
            docs.push({ 
              name: `${record.level} - ${record.degreeName}`, 
              url: record.transcript, 
              type: 'document' 
            });
          }
        });
      }
    } else if (tab === 'address') {
      if (application.address?.domicileUpload) {
        docs.push({ name: 'Domicile Certificate', url: application.address.domicileUpload, type: 'document' });
      }
    } else if (tab === 'guardian') {
      if (application.guardian?.cnicUpload) {
        docs.push({ name: 'Guardian CNIC', url: application.guardian.cnicUpload, type: 'image' });
      }
    }
    
    // Add documents from generic documents array, categorized by filename
    if (application.documents && application.documents.length > 0) {
      application.documents.forEach(doc => {
        const docCategory = categorizeDocument(doc.fileName || doc.type || '');
        if (docCategory === tab) {
          docs.push({
            name: doc.fileName || doc.type,
            url: doc.url,
            type: 'document'
          });
        }
      });
    }
    
    return docs;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-modal p-4">
      <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 m-0">Application Details</h2>
            <p className="text-sm text-slate-500 mt-1">
              ID: {application.id?.substring(0, 12)}...
            </p>
          </div>
          <button
            onClick={() => {
              setModalOpen(false);
              onClose();
            }}
            className="p-2 hover:bg-gray-100 rounded-lg transition-all"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Status Badge */}
          <div className={`inline-block px-4 py-2 rounded-lg border mb-6 font-semibold ${getStatusColor(application.status)}`}>
            {application.status}
          </div>

          {/* Applicant Information */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Applicant Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-slate-500 block mb-1">Full Name</label>
                <p className="text-slate-800 font-medium">{application.fullName}</p>
              </div>
              <div>
                <label className="text-sm text-slate-500 block mb-1">Email</label>
                <p className="text-slate-800 font-medium">{application.email}</p>
              </div>
              <div>
                <label className="text-sm text-slate-500 block mb-1">Phone</label>
                <p className="text-slate-800 font-medium">{application.phone}</p>
              </div>
              <div>
                <label className="text-sm text-slate-500 block mb-1">CNIC</label>
                <p className="text-slate-800 font-medium">{application.cnic}</p>
              </div>
              {application.dateOfBirth && (
                <div>
                  <label className="text-sm text-slate-500 block mb-1">Date of Birth</label>
                  <p className="text-slate-800 font-medium">
                    {new Date(application.dateOfBirth).toLocaleDateString()}
                  </p>
                </div>
              )}
              {application.gender && (
                <div>
                  <label className="text-sm text-slate-500 block mb-1">Gender</label>
                  <p className="text-slate-800 font-medium">{application.gender}</p>
                </div>
              )}
            </div>
          </div>

          {/* Program */}
          {application.program && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Applied Program</h3>
              <p className="text-slate-700">{application.program}</p>
            </div>
          )}

          {/* Address */}
          {application.address && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Address</h3>
              <div className="text-slate-700">
                <p>{application.address.street}</p>
                <p>{application.address.city}, {application.address.state} {application.address.zipCode}</p>
                <p>{application.address.country}</p>
              </div>
            </div>
          )}

          {/* Documents Section */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Documents</h3>
            
            {/* Document Tabs */}
            <div className="flex gap-2 mb-4 border-b border-gray-200 overflow-x-auto">
              {documentTabs.map((tab) => {
                const docCount = getDocumentsByTab(tab.id).length;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedDocTab(tab.id)}
                    className={`px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-all ${
                      selectedDocTab === tab.id
                        ? 'border-primary-500 text-primary-600'
                        : 'border-transparent text-slate-600 hover:text-slate-800'
                    }`}
                  >
                    {tab.icon} {tab.label} {docCount > 0 && <span className="ml-1 text-xs bg-gray-200 px-2 py-0.5 rounded-full">{docCount}</span>}
                  </button>
                );
              })}
            </div>

            {/* Document List */}
            <div className="space-y-2">
              {getDocumentsByTab(selectedDocTab).length > 0 ? (
                getDocumentsByTab(selectedDocTab).map((doc, idx) => (
                  <a
                    key={idx}
                    href={getFileUrl(doc.url)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">{doc.type === 'image' ? '🖼️' : '📄'}</span>
                      <span className="text-slate-700 font-medium group-hover:text-primary-600">{doc.name}</span>
                    </div>
                    <span className="text-sm text-slate-500">View ↗</span>
                  </a>
                ))
              ) : (
                <div className="p-4 bg-gray-50 rounded-lg text-center text-slate-500">
                  No documents available in this category
                </div>
              )}
            </div>
          </div>

          {/* Review Notes */}
          {application.reviewNotes && (
            <div className="mb-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-lg font-semibold text-slate-800 mb-2">Review Notes</h3>
              <p className="text-slate-700">{application.reviewNotes}</p>
            </div>
          )}

          {/* Action Section */}
          {application.status === 'Accepted' ? (
            <div className="border-t pt-6 mt-8 p-6 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle size={24} className="text-green-600" />
                <div>
                  <h3 className="text-lg font-semibold text-green-800">Application Accepted</h3>
                </div>
              </div>
            </div>
          ) : application.status === 'Rejected' ? (
            <div className="border-t pt-6 mt-8 p-6 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-3">
                <XCircle size={24} className="text-red-600" />
                <div>
                  <h3 className="text-lg font-semibold text-red-800">Application Rejected</h3>
                  {application.reviewNotes && (
                    <p className="text-sm text-red-700 mt-2">Reason: {application.reviewNotes}</p>
                  )}
                  
                </div>
              </div>
            </div>
          ) : !actionType ? (
            <div className="border-t border-gray-200 pt-6 mt-8">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">Actions</h3>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setActionType('accept')}
                  className="flex items-center justify-center gap-2 py-2 px-4 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-all font-semibold"
                  disabled={loading || processing}
                >
                  <CheckCircle size={18} />
                  Accept
                </button>
                <button
                  onClick={() => setActionType('review')}
                  className="flex items-center justify-center gap-2 py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all font-semibold"
                  disabled={loading || processing}
                >
                  <AlertCircle size={18} />
                  Under Review
                </button>
                <button
                  onClick={() => setActionType('reject')}
                  className="flex items-center justify-center gap-2 py-2 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all font-semibold"
                  disabled={loading || processing}
                >
                  <XCircle size={18} />
                  Reject
                </button>
              </div>
            </div>
          ) : (
            <div className="border-t border-gray-200 pt-6 mt-8">
              <h3 className="text-lg font-semibold text-slate-800 mb-4">
                {actionType === 'accept'
                  ? 'Accept Application'
                  : actionType === 'reject'
                  ? 'Reject Application'
                  : 'Put Under Review'}
              </h3>

              {(actionType === 'reject' || actionType === 'review') && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-800 mb-2">
                    {actionType === 'reject' ? 'Rejection Reason *' : 'Review Notes *'}
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full p-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:border-primary-500"
                    rows="4"
                    placeholder={
                      actionType === 'reject'
                        ? 'Provide reason for rejection...'
                        : 'Add review notes...'
                    }
                  />
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleAction}
                  className="flex-1 py-2 px-4 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-all font-semibold disabled:opacity-60"
                  disabled={processing}
                >
                  {processing ? 'Processing...' : 'Confirm'}
                </button>
                <button
                  onClick={() => setActionType(null)}
                  className="flex-1 py-2 px-4 bg-gray-200 text-slate-800 rounded-lg hover:bg-gray-300 transition-all font-semibold"
                  disabled={processing}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApplicationDetail;
