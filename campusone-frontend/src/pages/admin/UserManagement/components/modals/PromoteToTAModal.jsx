import React from 'react';
import { Search, ChevronRight } from 'lucide-react';
import { ModalHeader, ErrorAlert, ModalFooter } from '../ModalComponents';
import { UI_CLASSES } from '../../config/userManagementConfig';

const PromoteToTAModal = ({
  show,
  onClose,
  studentSearch,
  onSearchChange,
  searchResults,
  selectedStudent,
  onSelectStudent,
  searching,
  onPromote,
  error,
  onErrorClose
}) => {
  if (!show) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl max-w-[700px] w-full max-h-[90vh] overflow-y-auto shadow-xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <ModalHeader title="Promote Student to TA" onClose={onClose} />
        <ErrorAlert error={error} onClose={onErrorClose} />

        <div className="p-6">
          {/* Search Input */}
          <div className="mb-4">
            <label className={UI_CLASSES.label} htmlFor="studentSearch">
              Search for Student
            </label>
            <div className="relative">
              <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                id="studentSearch"
                value={studentSearch}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="Search by name, email, or student ID..."
                className={`${UI_CLASSES.input} pl-11`}
              />
              {searching && (
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[0.85rem] text-slate-500">
                  Searching...
                </div>
              )}
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-4 max-h-[300px] overflow-y-auto border border-gray-200 rounded-lg">
              {searchResults.map((student) => (
                <div
                  key={student.userId}
                  className={`flex justify-between items-center p-4 cursor-pointer transition-all border-b border-gray-100 last:border-b-0 hover:bg-slate-50 ${
                    selectedStudent?.userId === student.userId ? 'bg-primary-50 border-primary-500' : ''
                  }`}
                  onClick={() => onSelectStudent(student)}
                >
                  <div>
                    <h4 className="text-base font-semibold text-slate-800 m-0 mb-1">{student.name}</h4>
                    <p className="text-[0.85rem] text-slate-500 m-0 mb-2">{student.email}</p>
                    <div className="flex gap-2 flex-wrap">
                      <span className="inline-block py-1 px-2.5 bg-gray-100 text-slate-500 rounded text-xs font-medium">
                        {student.studentId}
                      </span>
                      <span className="inline-block py-1 px-2.5 bg-gray-100 text-slate-500 rounded text-xs font-medium">
                        {student.department}
                      </span>
                      <span className="inline-block py-1 px-2.5 bg-gray-100 text-slate-500 rounded text-xs font-medium">
                        Semester {student.semester}
                      </span>
                    </div>
                  </div>
                  {selectedStudent?.userId === student.userId && (
                    <ChevronRight size={20} className="text-primary-500" />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Selected Student Display */}
          {selectedStudent && (
            <div className="mt-6 p-5 bg-slate-50 border border-gray-200 rounded-lg">
              <h3 className="text-base font-semibold text-slate-800 m-0 mb-4">Selected Student</h3>
              <div>
                <p className="text-[0.9rem] text-slate-800 my-2">
                  <strong className="text-slate-500">Name:</strong> {selectedStudent.name}
                </p>
                <p className="text-[0.9rem] text-slate-800 my-2">
                  <strong className="text-slate-500">Email:</strong> {selectedStudent.email}
                </p>
                <p className="text-[0.9rem] text-slate-800 my-2">
                  <strong className="text-slate-500">Student ID:</strong> {selectedStudent.studentId}
                </p>
                <p className="text-[0.9rem] text-slate-800 my-2">
                  <strong className="text-slate-500">Department:</strong> {selectedStudent.department}
                </p>
              </div>
            </div>
          )}

          <ModalFooter
            onCancel={onClose}
            onSubmit={onPromote}
            submitText="Promote to TA"
            isLoading={!selectedStudent}
          />
        </div>
      </div>
    </div>
  );
};

export default PromoteToTAModal;
