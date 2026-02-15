import React from 'react';
import { AlertCircle, Trash2 } from 'lucide-react';
import { ModalHeader, ModalFooter } from '../ModalComponents';
import { UI_CLASSES } from '../../config/userManagementConfig';

const DeleteConfirmationModal = ({
  show,
  onClose,
  deletingUser,
  onConfirmDelete
}) => {
  if (!show || !deletingUser) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl max-w-[500px] w-full shadow-xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <ModalHeader title="Delete User" onClose={onClose} />

        <div className="p-6">
          <div className="flex items-start gap-4 mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <AlertCircle size={24} className="text-red-600 shrink-0 mt-1" />
            <div>
              <p className="text-slate-800 font-semibold mb-2">Permanently Delete User?</p>
              <p className="text-sm text-slate-600 mb-3">
                ⚠️ This will <strong>permanently remove</strong> the user and all associated data from the
                system. This action <strong>cannot be undone</strong>.
              </p>
              <p className="text-sm text-slate-600 mb-2">
                💡 Tip: If you want to temporarily disable the user, use the <strong>deactivate</strong>{' '}
                button instead (orange icon).
              </p>
              <div className="mt-4 p-3 bg-white rounded border border-red-200">
                <p className="text-sm text-slate-600 mb-1">
                  <strong>Name:</strong> {deletingUser.name}
                </p>
                <p className="text-sm text-slate-600 mb-1">
                  <strong>Email:</strong> {deletingUser.email}
                </p>
                <p className="text-sm text-slate-600 m-0">
                  <strong>Role:</strong>{' '}
                  {deletingUser.role.charAt(0).toUpperCase() + deletingUser.role.slice(1)}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" className={UI_CLASSES.btnSecondary} onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className={`${UI_CLASSES.btnPrimary} bg-red-600 hover:bg-red-700`}
              onClick={onConfirmDelete}
            >
              <Trash2 size={18} />
              Delete User
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmationModal;
