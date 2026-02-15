import React from 'react';
import { UserPlus, Upload, GraduationCap } from 'lucide-react';
import { UI_CLASSES } from '../config/userManagementConfig';

const PageHeader = ({
  onCreateUser,
  onBulkUpload,
  onPromoteTA
}) => {
  return (
    <div className="flex justify-between items-center mb-8 flex-wrap gap-4 max-md:flex-col max-md:items-start">
      <div>
        <h1 className="text-[2rem] font-bold text-slate-800 m-0">User Management</h1>
        <p className="text-[0.95rem] text-slate-500 mt-1">Manage users, roles, and permissions</p>
      </div>
      <div className="flex gap-3 max-md:w-full">
        <button
          className={`${UI_CLASSES.btnSecondary} max-md:flex-1 max-md:justify-center`}
          onClick={onPromoteTA}
        >
          <GraduationCap size={18} />
          Promote to TA
        </button>
        <button
          className={`${UI_CLASSES.btnSecondary} max-md:flex-1 max-md:justify-center`}
          onClick={onBulkUpload}
        >
          <Upload size={18} />
          Bulk Upload
        </button>
        <button
          className={`${UI_CLASSES.btnPrimary} max-md:flex-1 max-md:justify-center`}
          onClick={onCreateUser}
        >
          <UserPlus size={18} />
          Create User
        </button>
      </div>
    </div>
  );
};

export default PageHeader;
