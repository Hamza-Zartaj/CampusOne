import React from 'react';
import { X } from 'lucide-react';
import { useUserManagement } from './UserManagement/hooks/useUserManagement';
import { getRoleStats } from './UserManagement/config/userManagementConfig';
import PageHeader from './UserManagement/components/PageHeader';
import StatsGrid from './UserManagement/components/StatsGrid';
import UserTable from './UserManagement/components/UserTable';
import CreateUserModal from './UserManagement/components/modals/CreateUserModal';
import PromoteToTAModal from './UserManagement/components/modals/PromoteToTAModal';
import BulkUploadModal from './UserManagement/components/modals/BulkUploadModal';
import EditUserModal from './UserManagement/components/modals/EditUserModal';
import DeleteConfirmationModal from './UserManagement/components/modals/DeleteConfirmationModal';
import ResetSettingsModal from './UserManagement/components/modals/ResetSettingsModal';

const UserManagement = () => {
  const {
    // States
    stats,
    loading,
    error,
    success,
    isSuperAdmin,
    showCreateUserModal,
    setShowCreateUserModal,
    showPromoteTAModal,
    setShowPromoteTAModal,
    showBulkUploadModal,
    setShowBulkUploadModal,
    showEditModal,
    setShowEditModal,
    showDeleteModal,
    setShowDeleteModal,
    showResetModal,
    setShowResetModal,

    // Create User
    createUserForm,
    handleCreateUserChange,
    handlePermissionChange,
    handleCreateUser,

    // Promote TA
    studentSearch,
    setStudentSearch,
    searchResults,
    selectedStudent,
    setSelectedStudent,
    searching,
    handleStudentSearch,
    handlePromoteToTA,

    // Bulk Upload
    selectedFile,
    uploading,
    uploadResults,
    handleFileSelect,
    handleBulkUpload,
    handleDownloadTemplate,
    handleCloseBulkUploadModal,

    // User List
    selectedRole,
    loadingUsers,
    userSearchQuery,
    filteredUsers,
    fetchUsersByRole,
    handleUserSearch,

    // Edit User
    editingUser,
    editForm,
    handleEditUser,
    handleEditFormChange,
    handleEditPermissionChange,
    handleUpdateUser,

    // Delete/Actions
    deletingUser,
    resettingUser,
    handleToggleUserStatus,
    handleDeleteUser,
    confirmDeleteUser,
    handleResetSettings,
    handleUnlockAccount,

    // Utils
    setError,
    setSuccess,
  } = useUserManagement();

  const roleStats = getRoleStats(stats, isSuperAdmin);

  if (loading) {
    return (
      <div className="p-8 max-w-[1400px] mx-auto max-md:p-4">
        <div className="flex justify-center items-center min-h-[400px] text-lg text-slate-500">
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1400px] mx-auto max-md:p-4">
      {/* Page Header */}
      <PageHeader
        onCreateUser={() => {
          setShowCreateUserModal(true);
          setError('');
        }}
        onBulkUpload={() => {
          setShowBulkUploadModal(true);
          setError('');
        }}
        onPromoteTA={() => {
          setShowPromoteTAModal(true);
          setError('');
        }}
      />

      {/* Success Alert */}
      {success && (
        <div className="flex items-center gap-3 py-4 px-5 rounded-lg mb-6 text-[0.95rem] bg-green-50 text-green-800 border border-green-200">
          <span>{success}</span>
          <button
            onClick={() => setSuccess('')}
            className="ml-auto bg-transparent border-none cursor-pointer text-inherit opacity-70 hover:opacity-100 transition-opacity"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Error Alert */}
      {error && (
        <div className="flex items-center gap-3 py-4 px-5 rounded-lg mb-6 text-[0.95rem] bg-red-50 text-red-800 border border-red-200">
          <span>{error}</span>
          <button
            onClick={() => setError('')}
            className="ml-auto bg-transparent border-none cursor-pointer text-inherit opacity-70 hover:opacity-100 transition-opacity"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Stats Grid */}
      <StatsGrid
        stats={roleStats}
        selectedRole={selectedRole}
        onSelectRole={fetchUsersByRole}
      />

      {/* User List Section */}
      <UserTable
        selectedRole={selectedRole}
        filteredUsers={filteredUsers}
        loadingUsers={loadingUsers}
        userSearchQuery={userSearchQuery}
        onSearchChange={handleUserSearch}
        onEditUser={handleEditUser}
        onToggleStatus={handleToggleUserStatus}
        onResetSettings={handleResetSettings}
        onDeleteUser={handleDeleteUser}
      />

      {/* Create User Modal */}
      <CreateUserModal
        show={showCreateUserModal}
        onClose={() => {
          setShowCreateUserModal(false);
          setError('');
        }}
        form={createUserForm}
        onChange={handleCreateUserChange}
        onPermissionChange={handlePermissionChange}
        onSubmit={handleCreateUser}
        error={error}
        onErrorClose={() => setError('')}
        isSuperAdmin={isSuperAdmin}
      />

      {/* Promote to TA Modal */}
      <PromoteToTAModal
        show={showPromoteTAModal}
        onClose={() => {
          setShowPromoteTAModal(false);
          setSelectedStudent(null);
          setStudentSearch('');
          setError('');
        }}
        studentSearch={studentSearch}
        onSearchChange={handleStudentSearch}
        searchResults={searchResults}
        selectedStudent={selectedStudent}
        onSelectStudent={setSelectedStudent}
        searching={searching}
        onPromote={handlePromoteToTA}
        error={error}
        onErrorClose={() => setError('')}
      />

      {/* Bulk Upload Modal */}
      <BulkUploadModal
        show={showBulkUploadModal}
        onClose={handleCloseBulkUploadModal}
        selectedFile={selectedFile}
        onFileSelect={handleFileSelect}
        uploadResults={uploadResults}
        uploading={uploading}
        onUpload={handleBulkUpload}
        onDownloadTemplate={handleDownloadTemplate}
        error={error}
        onErrorClose={() => setError('')}
      />

      {/* Edit User Modal */}
      <EditUserModal
        show={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setError('');
        }}
        editingUser={editingUser}
        form={editForm}
        onChange={handleEditFormChange}
        onPermissionChange={handleEditPermissionChange}
        onSubmit={handleUpdateUser}
        error={error}
        onErrorClose={() => setError('')}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmationModal
        show={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        deletingUser={deletingUser}
        onConfirmDelete={confirmDeleteUser}
      />

      {/* Reset Settings Modal */}
      <ResetSettingsModal
        show={showResetModal}
        onClose={() => setShowResetModal(false)}
        resettingUser={resettingUser}
        onUnlockAccount={handleUnlockAccount}
      />
    </div>
  );
};

export default UserManagement;
