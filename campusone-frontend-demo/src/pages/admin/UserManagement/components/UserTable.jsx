import React from 'react';
import { Search, Edit, Trash2, UserX, UserCheck, RotateCcw } from 'lucide-react';
import { UI_CLASSES } from '../config/userManagementConfig';

const UserTable = ({
  selectedRole,
  filteredUsers,
  loadingUsers,
  userSearchQuery,
  onSearchChange,
  onEditUser,
  onToggleStatus,
  onResetSettings,
  onDeleteUser
}) => {
  if (!selectedRole) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 mb-8 animate-slide-up">
      <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
        <h2 className="text-xl font-bold text-slate-800 m-0">
          {selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)} List
        </h2>
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={userSearchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by name, email, or ID..."
            className={`${UI_CLASSES.input} pl-11`}
          />
        </div>
      </div>

      {loadingUsers ? (
        <div className="flex justify-center items-center py-12 text-slate-500">
          <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-primary-500 rounded-full animate-spin mr-3"></div>
          Loading users...
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          No {selectedRole}s found
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-800">Name</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-800">Email</th>
                {selectedRole === 'student' && (
                  <>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-800">Student ID</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-800">Department</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-800">Semester</th>
                  </>
                )}
                {(selectedRole === 'teacher' || selectedRole === 'admin') && (
                  <>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-800">Employee ID</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-800">Department</th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-slate-800">Designation</th>
                  </>
                )}
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-800">Status</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-800">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr
                  key={user.id}
                  className={`border-b transition-colors ${
                    user.isActive ? 'border-gray-100 hover:bg-slate-50' : 'border-gray-200 bg-gray-50 hover:bg-gray-100 opacity-75'
                  }`}
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${
                          user.isActive ? 'bg-gradient-primary' : 'bg-gray-400'
                        }`}
                      >
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <span className={`font-medium ${user.isActive ? 'text-slate-800' : 'text-gray-600'}`}>
                        {user.name}
                      </span>
                    </div>
                  </td>
                  <td className={`py-3 px-4 ${user.isActive ? 'text-slate-600' : 'text-gray-600'}`}>{user.email}</td>
                  {selectedRole === 'student' && (
                    <>
                      <td className="py-3 px-4 text-slate-600">{user.roleData?.studentId || 'N/A'}</td>
                      <td className="py-3 px-4 text-slate-600">{user.roleData?.department || 'N/A'}</td>
                      <td className="py-3 px-4 text-slate-600">{user.roleData?.currentSemester || 'N/A'}</td>
                    </>
                  )}
                  {(selectedRole === 'teacher' || selectedRole === 'admin') && (
                    <>
                      <td className="py-3 px-4 text-slate-600">{user.roleData?.employeeId || 'N/A'}</td>
                      <td className="py-3 px-4 text-slate-600">{user.roleData?.department || 'N/A'}</td>
                      <td className="py-3 px-4 text-slate-600">{user.roleData?.designation || 'N/A'}</td>
                    </>
                  )}
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                        user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onEditUser(user)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit User"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => onToggleStatus(user)}
                        className={`p-2 rounded-lg transition-colors ${
                          user.isActive ? 'text-orange-600 hover:bg-orange-50' : 'text-green-600 hover:bg-green-50'
                        }`}
                        title={user.isActive ? 'Deactivate User' : 'Activate User'}
                      >
                        {user.isActive ? <UserX size={18} /> : <UserCheck size={18} />}
                      </button>
                      <button
                        onClick={() => onResetSettings(user)}
                        className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="Reset Settings"
                      >
                        <RotateCcw size={18} />
                      </button>
                      <button
                        onClick={() => onDeleteUser(user)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete User"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default UserTable;
