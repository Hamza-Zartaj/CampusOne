import React from 'react';
import { Download, Upload, FileSpreadsheet, CheckCircle, XCircle } from 'lucide-react';
import { ModalHeader, ErrorAlert, ModalFooter } from '../ModalComponents';
import { UI_CLASSES } from '../../config/userManagementConfig';

const BulkUploadModal = ({
  show,
  onClose,
  selectedFile,
  onFileSelect,
  uploadResults,
  uploading,
  onUpload,
  onDownloadTemplate,
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
        <ModalHeader title="Bulk Upload Students" onClose={onClose} />
        <ErrorAlert error={error} onClose={onErrorClose} />

        <div className="p-6">
          {!uploadResults ? (
            <>
              {/* Instructions */}
              <div className="bg-slate-50 p-5 rounded-lg mb-6">
                <h3 className="text-base font-semibold text-slate-800 m-0 mb-3">Upload Instructions:</h3>
                <ol className="m-0 pl-6 text-slate-500">
                  <li className="mb-2 leading-relaxed">Download the Excel template using the button below</li>
                  <li className="mb-2 leading-relaxed">Fill in the student information in the template</li>
                  <li className="mb-2 leading-relaxed">Save the file and upload it here</li>
                  <li className="mb-2 leading-relaxed">The system will validate and import the data</li>
                </ol>
              </div>

              {/* Download Template Button */}
              <button
                className={`${UI_CLASSES.btnSecondary} w-full justify-center mb-6`}
                onClick={onDownloadTemplate}
              >
                <Download size={18} />
                Download Template
              </button>

              {/* File Upload Area */}
              <div className="mb-6">
                <label
                  htmlFor="bulkUploadFile"
                  className="flex flex-col items-center justify-center py-10 px-6 border-2 border-dashed border-slate-300 rounded-lg bg-slate-50 cursor-pointer transition-all hover:border-primary-500 hover:bg-primary-50"
                >
                  <FileSpreadsheet size={48} className="text-slate-500 mb-4" />
                  <p className="text-base font-medium text-slate-800 m-0 mb-1 text-center">
                    {selectedFile ? selectedFile.name : 'Click to select Excel file or drag and drop'}
                  </p>
                  <p className="text-sm text-slate-500 m-0">Supported: .xlsx, .xls (Max 5MB)</p>
                </label>
                <input
                  type="file"
                  id="bulkUploadFile"
                  accept=".xlsx,.xls"
                  onChange={onFileSelect}
                  className="hidden"
                />
              </div>

              <ModalFooter
                onCancel={onClose}
                onSubmit={onUpload}
                submitText={uploading ? 'Uploading...' : 'Upload File'}
                isLoading={!selectedFile || uploading}
              />
            </>
          ) : (
            <>
              {/* Results */}
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-slate-800 m-0 mb-4">Upload Results</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-green-100 text-green-800">
                    <CheckCircle size={24} className="shrink-0" />
                    <div>
                      <p className="text-sm font-medium m-0 mb-1">Successful</p>
                      <p className="text-2xl font-bold m-0">{uploadResults.successful.length}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-red-100 text-red-800">
                    <XCircle size={24} className="shrink-0" />
                    <div>
                      <p className="text-sm font-medium m-0 mb-1">Failed</p>
                      <p className="text-2xl font-bold m-0">{uploadResults.failed.length}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Successful Records */}
              {uploadResults.successful.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-base font-semibold m-0 mb-4 text-green-800">
                    ✓ Successfully Added ({uploadResults.successful.length})
                  </h4>
                  <div className="max-h-[300px] overflow-y-auto flex flex-col gap-3">
                    {uploadResults.successful.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-4 p-4 rounded-md bg-green-100 border-l-[3px] border-green-500 text-sm"
                      >
                        <span className="inline-block py-1 px-2 bg-black/10 rounded text-xs font-semibold shrink-0">
                          Row {item.row}
                        </span>
                        <div className="flex-1">
                          <p className="font-semibold text-slate-800 m-0 mb-1">{item.data.name}</p>
                          <p className="text-[0.8rem] text-slate-500 m-0">
                            {item.data.email} • {item.data.studentId}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Failed Records */}
              {uploadResults.failed.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-base font-semibold m-0 mb-4 text-red-800">
                    ✗ Failed to Add ({uploadResults.failed.length})
                  </h4>
                  <div className="max-h-[300px] overflow-y-auto flex flex-col gap-3">
                    {uploadResults.failed.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-start gap-4 p-4 rounded-md bg-red-100 border-l-[3px] border-red-500 text-sm"
                      >
                        <span className="inline-block py-1 px-2 bg-black/10 rounded text-xs font-semibold shrink-0">
                          Row {item.row}
                        </span>
                        <div className="flex-1">
                          <p className="font-semibold text-red-800 m-0 mb-1">{item.error}</p>
                          <p className="text-[0.8rem] text-slate-500 m-0">
                            {item.data['Full Name']} • {item.data['Email']}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 mt-6">
                <button type="button" className={UI_CLASSES.btnPrimary} onClick={onClose}>
                  Close
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default BulkUploadModal;
