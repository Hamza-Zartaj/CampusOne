import React from 'react';
import { X } from 'lucide-react';
import { ModalHeader, ErrorAlert, ModalFooter } from '../ModalComponents';
import { UI_CLASSES, AVAILABLE_PERMISSIONS, PERMISSION_PRESETS, TEACHER_DESIGNATIONS } from '../../config/userManagementConfig';

const CreateUserModal = ({
  show,
  onClose,
  form,
  onChange,
  onPermissionChange,
  onSubmit,
  error,
  onErrorClose,
  isSuperAdmin
}) => {
  if (!show) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-modal p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl max-w-175 w-full max-h-[90vh] overflow-y-auto shadow-xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <ModalHeader title="Create New User" onClose={onClose} />
        <ErrorAlert error={error} onClose={onErrorClose} />

        <form onSubmit={onSubmit} className="p-6">
          {/* Role Selection */}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-4">
            <div className="mb-4">
              <label className={UI_CLASSES.label} htmlFor="role">
                User Role *
              </label>
              <select
                id="role"
                name="role"
                value={form.role}
                onChange={onChange}
                required
                className={UI_CLASSES.input}
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                {isSuperAdmin && <option value="admin">Admin</option>}
              </select>
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-4">
            <div className="mb-4">
              <label className={UI_CLASSES.label} htmlFor="name">
                Full Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={form.name}
                onChange={onChange}
                required
                placeholder="Enter full name"
                className={UI_CLASSES.input}
              />
            </div>
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-4">
            <div className="mb-4">
              <label className={UI_CLASSES.label} htmlFor="email">
                Email *
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={form.email}
                onChange={onChange}
                required
                placeholder="user@example.com"
                className={UI_CLASSES.input}
              />
            </div>
            <div className="mb-4">
              <label className={UI_CLASSES.label} htmlFor="username">
                Username
              </label>
              <input
                type="text"
                id="username"
                name="username"
                value={form.username}
                onChange={onChange}
                placeholder="Leave blank to auto-generate"
                className={UI_CLASSES.input}
              />
            </div>
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-4">
            <div className="mb-4">
              <label className={UI_CLASSES.label} htmlFor="password">
                Password *
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={form.password}
                onChange={onChange}
                required
                minLength={6}
                placeholder="Minimum 6 characters"
                className={UI_CLASSES.input}
              />
            </div>
          </div>

          {/* Student Fields */}
          {form.role === 'student' && (
            <>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-4">
                <div className="mb-4">
                  <label className={UI_CLASSES.label} htmlFor="studentId">
                    Student ID *
                  </label>
                  <input
                    type="text"
                    id="studentId"
                    name="studentId"
                    value={form.studentId}
                    onChange={onChange}
                    required
                    placeholder="e.g., 2024-CS-001"
                    className={UI_CLASSES.input}
                  />
                </div>
                <div className="mb-4">
                  <label className={UI_CLASSES.label} htmlFor="enrollmentYear">
                    Enrollment Year *
                  </label>
                  <input
                    type="number"
                    id="enrollmentYear"
                    name="enrollmentYear"
                    value={form.enrollmentYear}
                    onChange={onChange}
                    required
                    min="2000"
                    max="2100"
                    className={UI_CLASSES.input}
                  />
                </div>
              </div>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-4">
                <div className="mb-4">
                  <label className={UI_CLASSES.label} htmlFor="department">
                    Department *
                  </label>
                  <input
                    type="text"
                    id="department"
                    name="department"
                    value={form.department}
                    onChange={onChange}
                    required
                    placeholder="e.g., Computer Science"
                    className={UI_CLASSES.input}
                  />
                </div>
                <div className="mb-4">
                  <label className={UI_CLASSES.label} htmlFor="batch">
                    Batch
                  </label>
                  <input
                    type="text"
                    id="batch"
                    name="batch"
                    value={form.batch}
                    onChange={onChange}
                    placeholder="e.g., 2024"
                    className={UI_CLASSES.input}
                  />
                </div>
              </div>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-4">
                <div className="mb-4">
                  <label className={UI_CLASSES.label} htmlFor="currentSemester">
                    Current Semester *
                  </label>
                  <input
                    type="number"
                    id="currentSemester"
                    name="currentSemester"
                    value={form.currentSemester}
                    onChange={onChange}
                    required
                    min="1"
                    max="8"
                    className={UI_CLASSES.input}
                  />
                </div>
              </div>
            </>
          )}

          {/* Teacher/Admin Fields */}
          {(form.role === 'teacher' || form.role === 'admin') && (
            <>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-4">
                <div className="mb-4">
                  <label className={UI_CLASSES.label} htmlFor="employeeId">
                    Employee ID *
                  </label>
                  <input
                    type="text"
                    id="employeeId"
                    name="employeeId"
                    value={form.employeeId}
                    onChange={onChange}
                    required
                    placeholder="e.g., EMP-001"
                    className={UI_CLASSES.input}
                  />
                </div>
                <div className="mb-4">
                  <label className={UI_CLASSES.label} htmlFor="department">
                    Department *
                  </label>
                  <input
                    type="text"
                    id="department"
                    name="department"
                    value={form.department}
                    onChange={onChange}
                    required
                    placeholder="e.g., Computer Science"
                    className={UI_CLASSES.input}
                  />
                </div>
              </div>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-4">
                <div className="mb-4">
                  <label className={UI_CLASSES.label} htmlFor="designation">
                    Designation
                  </label>
                  {form.role === 'teacher' ? (
                    <select
                      id="designation"
                      name="designation"
                      value={form.designation}
                      onChange={onChange}
                      className={UI_CLASSES.input}
                    >
                      <option value="">Select designation</option>
                      {TEACHER_DESIGNATIONS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      id="designation"
                      name="designation"
                      value={form.designation}
                      onChange={onChange}
                      placeholder="e.g., Administrator"
                      className={UI_CLASSES.input}
                    />
                  )}
                </div>
              </div>
            </>
          )}

          {/* Permissions for Admin */}
          {form.role === 'admin' && (
            <div className="mb-4">
              <label className={UI_CLASSES.label} htmlFor="preset">
                Permission Preset
              </label>
              <select
                id="preset"
                value={(() => {
                  const match = PERMISSION_PRESETS.find(p =>
                    p.id !== 'custom' &&
                    p.permissions.length === form.permissions.length &&
                    p.permissions.every(perm => form.permissions.includes(perm))
                  );
                  return match ? match.id : 'custom';
                })()}
                onChange={(e) => {
                  const preset = PERMISSION_PRESETS.find(p => p.id === e.target.value);
                  if (preset && preset.id !== 'custom') {
                    // Replace permissions with preset's
                    const current = new Set(form.permissions);
                    const next = new Set(preset.permissions);
                    // Toggle off everything not in preset, toggle on everything in preset
                    AVAILABLE_PERMISSIONS.forEach((p) => {
                      const hasIt = current.has(p.id);
                      const wantIt = next.has(p.id);
                      if (hasIt !== wantIt) onPermissionChange(p.id);
                    });
                  }
                }}
                className={UI_CLASSES.input}
              >
                {PERMISSION_PRESETS.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1 mb-3">
                Pick a preset to populate the checkboxes below, or check them individually.
              </p>

              <label className={UI_CLASSES.label}>Permissions</label>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3 mt-2">
                {AVAILABLE_PERMISSIONS.map((permission) => (
                  <label
                    key={permission.id}
                    className="flex items-center gap-2 py-2.5 px-3 border border-gray-200 rounded-md cursor-pointer transition-all hover:bg-slate-50 hover:border-primary-500"
                  >
                    <input
                      type="checkbox"
                      checked={form.permissions.includes(permission.id)}
                      onChange={() => onPermissionChange(permission.id)}
                      className="w-auto m-0 cursor-pointer"
                    />
                    <span className="text-[0.9rem] pl-2 text-slate-800">{permission.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <ModalFooter
            onCancel={onClose}
            onSubmit={onSubmit}
            submitText="Create User"
          />
        </form>
      </div>
    </div>
  );
};

export default CreateUserModal;
