import React from 'react';
import { Unlock, Lock, RotateCcw } from 'lucide-react';
import { ModalHeader, ModalFooter } from '../ModalComponents';
import { UI_CLASSES } from '../../config/userManagementConfig';

const ResetSettingsModal = ({
  show,
  onClose,
  resettingUser,
  onUnlockAccount
}) => {
  if (!show || !resettingUser) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl max-w-[600px] w-full max-h-[90vh] overflow-y-auto shadow-xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <ModalHeader title="Reset User Settings" onClose={onClose} />

        <div className="p-6">
          {/* User Info */}
          <div className="mb-6 p-4 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-600 mb-1">
              <strong>User:</strong> {resettingUser.name}
            </p>
            <p className="text-sm text-slate-600 mb-1">
              <strong>Email:</strong> {resettingUser.email}
            </p>
            <p className="text-sm text-slate-600 m-0">
              <strong>Role:</strong> {resettingUser.role.charAt(0).toUpperCase() + resettingUser.role.slice(1)}
            </p>
          </div>

          <h3 className="text-lg font-semibold text-slate-800 mb-4">Available Reset Options</h3>

          <div className="flex flex-col gap-4">
            {/* Unlock Account Option */}
            <div className="border border-gray-200 rounded-lg p-4 hover:border-primary-500 transition-all">
              <div className="flex items-start gap-3">
                <Unlock size={24} className="text-blue-600 shrink-0 mt-1" />
                <div className="flex-1">
                  <h4 className="text-base font-semibold text-slate-800 m-0 mb-2">Unlock Account</h4>
                  <p className="text-sm text-slate-600 mb-3">
                    Remove account lock caused by failed login attempts and reset login counter.
                  </p>
                  <button
                    type="button"
                    className={`${UI_CLASSES.btnSecondary} text-sm`}
                    onClick={onUnlockAccount}
                  >
                    <Unlock size={16} />
                    Unlock Account
                  </button>
                </div>
              </div>
            </div>

            {/* Reset 2FA Option (Coming Soon) */}
            <div className="border border-gray-200 rounded-lg p-4 hover:border-primary-500 transition-all opacity-50">
              <div className="flex items-start gap-3">
                <Lock size={24} className="text-purple-600 shrink-0 mt-1" />
                <div className="flex-1">
                  <h4 className="text-base font-semibold text-slate-800 m-0 mb-2">Reset 2FA</h4>
                  <p className="text-sm text-slate-600 mb-3">
                    Disable two-factor authentication for this user. They will need to set it up again.
                  </p>
                  <button type="button" className={`${UI_CLASSES.btnSecondary} text-sm`} disabled>
                    <Lock size={16} />
                    Reset 2FA (Coming Soon)
                  </button>
                </div>
              </div>
            </div>

            {/* Force Password Reset Option (Coming Soon) */}
            <div className="border border-gray-200 rounded-lg p-4 hover:border-primary-500 transition-all opacity-50">
              <div className="flex items-start gap-3">
                <RotateCcw size={24} className="text-orange-600 shrink-0 mt-1" />
                <div className="flex-1">
                  <h4 className="text-base font-semibold text-slate-800 m-0 mb-2">Force Password Reset</h4>
                  <p className="text-sm text-slate-600 mb-3">
                    Require user to reset their password on next login.
                  </p>
                  <button type="button" className={`${UI_CLASSES.btnSecondary} text-sm`} disabled>
                    <RotateCcw size={16} />
                    Force Reset (Coming Soon)
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 mt-6">
            <button type="button" className={UI_CLASSES.btnPrimary} onClick={onClose}>
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetSettingsModal;
