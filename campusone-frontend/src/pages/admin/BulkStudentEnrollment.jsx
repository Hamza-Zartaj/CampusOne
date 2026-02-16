import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  Users,
  Plus,
  X,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  ChevronDown,
  Calendar,
  MapPin,
  User,
  Mail,
  Filter,
  Download,
} from 'lucide-react';
import { courseOfferingAPI, enrollmentAPI, userAPI } from '../../utils/api';
import toast from 'react-hot-toast';

const inputClass = "w-full py-2.5 px-3.5 border border-gray-200 rounded-lg text-[0.95rem] transition-all focus:outline-none focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10";
const labelClass = "block text-[0.9rem] font-medium text-slate-800 mb-2";
const btnPrimaryClass = "inline-flex items-center gap-2 py-2.5 px-5 border-none rounded-lg text-[0.95rem] font-medium cursor-pointer transition-all bg-gradient-primary text-white hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(59,130,246,0.3)] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none";
const btnSecondaryClass = "inline-flex items-center gap-2 py-2.5 px-5 border border-gray-200 rounded-lg text-[0.95rem] font-medium cursor-pointer transition-all bg-white text-slate-800 hover:bg-slate-50 hover:border-gray-300";

const currentYear = new Date().getFullYear();
const ACADEMIC_YEARS = Array.from({ length: 5 }, (_, i) => `${currentYear - 2 + i}-${currentYear - 1 + i}`);

const BulkStudentEnrollment = () => {
  // Filters
  const [academicYear, setAcademicYear] = useState(`${currentYear}-${currentYear + 1}`);
  const [semesterNumber, setSemesterNumber] = useState('');
  const [searchCourse, setSearchCourse] = useState('');
  const [searchStudent, setSearchStudent] = useState('');

  // Course offerings
  const [offerings, setOfferings] = useState([]);
  const [selectedOffering, setSelectedOffering] = useState(null);
  const [loadingOfferings, setLoadingOfferings] = useState(false);

  // Students
  const [allStudents, setAllStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState(new Set());
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [enrolledStudentIds, setEnrolledStudentIds] = useState(new Set());

  // Options
  const [skipPrerequisites, setSkipPrerequisites] = useState(false);

  // Submit
  const [enrolling, setEnrolling] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  // Load course offerings
  useEffect(() => {
    const fetchOfferings = async () => {
      try {
        setLoadingOfferings(true);
        const res = await courseOfferingAPI.getAllOfferings({
          academicYear,
          semesterNumber: semesterNumber || undefined,
          limit: 1000
        });
        if (res.data.success) {
          setOfferings(res.data.data || []);
        }
      } catch (err) {
        toast.error('Failed to load course offerings');
      } finally {
        setLoadingOfferings(false);
      }
    };

    if (academicYear && semesterNumber) {
      fetchOfferings();
    }
  }, [academicYear, semesterNumber]);

  // Load all students
  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoadingStudents(true);
        const res = await userAPI.getAllUsers({ role: 'student', limit: 1000 });
        if (res.data.success) {
          setAllStudents(res.data.data || []);
        }
      } catch (err) {
        toast.error('Failed to load students');
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchStudents();
  }, []);

  // Load enrolled students for selected offering
  useEffect(() => {
    const fetchEnrolledStudents = async () => {
      if (!selectedOffering) {
        setEnrolledStudentIds(new Set());
        setSelectedStudents(new Set());
        return;
      }

      try {
        // Fetch all enrollments without status filter first
        const res = await enrollmentAPI.getOfferingEnrollments(selectedOffering._id, { limit: 1000 });
        
        console.log('Enrollment API response:', res.data);
        
        if (res.data.success && res.data.data && Array.isArray(res.data.data)) {
          // Extract User IDs from enrolled students
          const enrolledIds = new Set();
          
          res.data.data.forEach((enrollment, index) => {
            console.log(`Enrollment ${index}:`, enrollment);
            
            // Get the User ID - handle different response structures
            let userId = null;
            
            if (enrollment.student?.userId?._id) {
              userId = enrollment.student.userId._id;
            } else if (enrollment.student?.userId) {
              userId = enrollment.student.userId;
            } else if (enrollment.student?._id) {
              userId = enrollment.student._id;
            }
            
            console.log(`Extracted userId for enrollment ${index}:`, userId);
            
            if (userId) {
              enrolledIds.add(userId);
            }
          });

          console.log('Final enrolled IDs set:', enrolledIds);
          setEnrolledStudentIds(enrolledIds);
          setSelectedStudents(new Set());
        }
      } catch (err) {
        console.error('Error loading enrolled students:', err);
        setEnrolledStudentIds(new Set());
      }
    };

    fetchEnrolledStudents();
  }, [selectedOffering]);

  // Filter students
  const filteredStudents = allStudents.filter(student => {
    // Exclude already enrolled students
    if (enrolledStudentIds.has(student._id)) {
      return false;
    }

    if (!searchStudent) return true;
    const q = searchStudent.toLowerCase();
    return (
      student.roleData?.studentId?.toLowerCase().includes(q) ||
      student.firstName?.toLowerCase().includes(q) ||
      student.lastName?.toLowerCase().includes(q) ||
      student.email?.toLowerCase().includes(q)
    );
  });

  // Debug: Log student filtering info
  React.useEffect(() => {
    if (selectedOffering && allStudents.length > 0) {
      console.log('Debugging Filter:');
      console.log('Total students:', allStudents.length);
      console.log('Enrolled IDs:', Array.from(enrolledStudentIds));
      console.log('Sample student:', allStudents[0]);
      console.log('Filtered students:', filteredStudents.length);
    }
  }, [selectedOffering, allStudents, enrolledStudentIds, filteredStudents]);

  // Filter offerings
  const filteredOfferings = offerings.filter(offering => {
    if (!searchCourse) return true;
    const q = searchCourse.toLowerCase();
    return (
      offering.course?.courseCode?.toLowerCase().includes(q) ||
      offering.course?.courseName?.toLowerCase().includes(q)
    );
  });

  // Handle student selection
  const handleSelectStudent = (studentId) => {
    const newSelected = new Set(selectedStudents);
    if (newSelected.has(studentId)) {
      newSelected.delete(studentId);
    } else {
      newSelected.add(studentId);
    }
    setSelectedStudents(newSelected);
  };

  // Select all visible students
  const handleSelectAll = () => {
    if (selectedStudents.size === filteredStudents.length) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(filteredStudents.map(s => s._id)));
    }
  };

  // Handle bulk enrollment
  const handleBulkEnroll = async () => {
    if (!selectedOffering) {
      setError('Please select a course offering');
      return;
    }
    if (selectedStudents.size === 0) {
      setError('Please select at least one student');
      return;
    }

    try {
      setEnrolling(true);
      setError('');
      const res = await enrollmentAPI.bulkEnroll(
        Array.from(selectedStudents),
        selectedOffering._id,
        'regular',
        skipPrerequisites
      );

      if (res.data.success) {
        setResults(res.data.data);
        setSelectedStudents(new Set());
        toast.success(`Enrolled ${res.data.data.successful.length} students successfully`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error in bulk enrollment');
      toast.error(err.response?.data?.message || 'Error in bulk enrollment');
    } finally {
      setEnrolling(false);
    }
  };

  const selectedStudentsData = allStudents.filter(s => selectedStudents.has(s._id));

  return (
    <div className="max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-[28px] font-bold text-slate-800 m-0 max-md:text-2xl">Bulk Student Enrollment</h1>
        <p className="text-sm text-slate-500 m-0 mt-1">Enroll multiple students to a course offering at once</p>
      </div>

      <div className="grid grid-cols-3 gap-6 max-lg:grid-cols-1">
        {/* Left: Course Selection */}
        <div className="col-span-1 max-lg:col-span-3">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-5">Step 1: Select Course Offering</h2>

            {/* Filters */}
            <div className="space-y-4 mb-5">
              <div>
                <label className={labelClass}>Academic Year</label>
                <select
                  value={academicYear}
                  onChange={(e) => {
                    setAcademicYear(e.target.value);
                    setSemesterNumber('');
                    setSelectedOffering(null);
                  }}
                  className={inputClass}
                >
                  {ACADEMIC_YEARS.map(year => <option key={year} value={year}>{year}</option>)}
                </select>
              </div>

              <div>
                <label className={labelClass}>Semester</label>
                <select
                  value={semesterNumber}
                  onChange={(e) => {
                    setSemesterNumber(e.target.value);
                    setSelectedOffering(null);
                  }}
                  className={inputClass}
                >
                  <option value="">Select Semester</option>
                  <option value="1">Semester 1</option>
                  <option value="2">Semester 2</option>
                  <option value="3">Semester 3</option>
                </select>
              </div>

              <div>
                <label className={labelClass}>Search Course</label>
                <div className="relative">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Course code or name..."
                    value={searchCourse}
                    onChange={(e) => setSearchCourse(e.target.value)}
                    className={`${inputClass} pl-10`}
                  />
                </div>
              </div>
            </div>

            {/* Course Offerings List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {loadingOfferings ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin text-primary-500" size={24} />
                </div>
              ) : filteredOfferings.length === 0 ? (
                <div className="py-6 text-center text-slate-500">
                  <AlertCircle size={20} className="mx-auto mb-2 opacity-50" />
                  <p>No course offerings found</p>
                </div>
              ) : (
                filteredOfferings.map(offering => (
                  <button
                    key={offering._id}
                    onClick={() => setSelectedOffering(offering)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      selectedOffering?._id === offering._id
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200 bg-white hover:border-primary-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-semibold text-slate-800">{offering.course?.courseCode}</p>
                        <p className="text-sm text-slate-600">{offering.course?.courseName}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <User size={14} /> {offering.teacher?.userId?.firstName}
                          </span>
                          <span className="flex items-center gap-1">
                            <Users size={14} /> {offering.currentEnrollment}/{offering.maxCapacity}
                          </span>
                        </div>
                      </div>
                      {selectedOffering?._id === offering._id && (
                        <CheckCircle className="text-primary-500 shrink-0 mt-1" size={20} />
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Middle: Student Selection */}
        <div className="col-span-1 max-lg:col-span-3">
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-5">Step 2: Select Students</h2>

            {/* Info message */}
            {selectedOffering && enrolledStudentIds.size > 0 && (
              <div className="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
                <p className="text-sm text-blue-700">
                  <span className="font-medium">{enrolledStudentIds.size}</span> student(s) already enrolled in this course
                </p>
              </div>
            )}

            {/* Search & Select All */}
            <div className="space-y-3 mb-4">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={searchStudent}
                  onChange={(e) => setSearchStudent(e.target.value)}
                  className={`${inputClass} pl-10`}
                />
              </div>

              <button
                onClick={handleSelectAll}
                className={`w-full py-2 px-3 rounded-lg text-sm font-medium border transition-all ${
                  selectedStudents.size === filteredStudents.length && filteredStudents.length > 0
                    ? 'bg-slate-100 text-slate-800 border-slate-300'
                    : 'bg-white text-slate-600 border-gray-200 hover:bg-slate-50'
                }`}
              >
                {selectedStudents.size === filteredStudents.length && filteredStudents.length > 0
                  ? `Deselect All (${filteredStudents.length})`
                  : `Select All (${filteredStudents.length})`}
              </button>
            </div>

            {/* Students List */}
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {loadingStudents ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin text-primary-500" size={24} />
                </div>
              ) : filteredStudents.length === 0 ? (
                <div className="py-6 text-center text-slate-500">
                  <AlertCircle size={20} className="mx-auto mb-2 opacity-50" />
                  <p>
                    {!selectedOffering 
                      ? 'Select a course offering to see available students'
                      : enrolledStudentIds.size > 0
                      ? 'All students are already enrolled in this course'
                      : 'No students found'}
                  </p>
                </div>
              ) : (
                filteredStudents.map(student => (
                  <label
                    key={student._id}
                    className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-slate-50 transition-all"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStudents.has(student._id)}
                      onChange={() => handleSelectStudent(student._id)}
                      className="mt-0.5 w-4 h-4 rounded cursor-pointer"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-slate-800 text-sm">{student.firstName} {student.lastName}</p>
                      <p className="text-xs text-slate-500">{student.roleData?.studentId}</p>
                      <p className="text-xs text-slate-400">{student.email}</p>
                    </div>
                  </label>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right: Summary & Submit */}
        <div className="col-span-1 max-lg:col-span-3">
          <div className="bg-white rounded-2xl shadow-sm p-6 sticky top-6">
            <h2 className="text-lg font-semibold text-slate-800 mb-5">Step 3: Review & Submit</h2>

            {/* Selected Offering */}
            <div className="mb-5 p-4 rounded-lg bg-slate-50 border border-gray-200">
              <p className="text-xs text-slate-500 mb-1">Selected Course Offering</p>
              {selectedOffering ? (
                <>
                  <p className="font-semibold text-slate-800">{selectedOffering.course?.courseCode}</p>
                  <p className="text-sm text-slate-600 mb-2">{selectedOffering.course?.courseName}</p>
                  <div className="space-y-1 text-xs text-slate-600">
                    <p><span className="font-medium">Teacher:</span> {selectedOffering.teacher?.userId?.firstName}</p>
                    <p><span className="font-medium">Capacity:</span> {selectedOffering.currentEnrollment}/{selectedOffering.maxCapacity}</p>
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-400">No course selected</p>
              )}
            </div>

            {/* Selected Students Count */}
            <div className="mb-5 p-4 rounded-lg bg-primary-50 border border-primary-200">
              <p className="text-xs text-primary-600 mb-1">Students to Enroll</p>
              <p className="text-3xl font-bold text-primary-600">{selectedStudents.size}</p>
            </div>

            {/* Options */}
            <div className="mb-5 p-4 rounded-lg bg-slate-50 border border-gray-200">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={skipPrerequisites}
                  onChange={(e) => setSkipPrerequisites(e.target.checked)}
                  className="w-4 h-4 rounded cursor-pointer"
                />
                <span className="text-sm text-slate-700">
                  <span className="font-medium">Skip Prerequisites</span>
                  <p className="text-xs text-slate-500 mt-0.5">Force enroll even if prerequisites not met</p>
                </span>
              </label>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2">
                <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Enroll Button */}
            <button
              onClick={handleBulkEnroll}
              disabled={!selectedOffering || selectedStudents.size === 0 || enrolling}
              className={btnPrimaryClass + ' w-full'}
            >
              {enrolling ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  Enrolling...
                </>
              ) : (
                <>
                  <Plus size={18} />
                  Bulk Enroll
                </>
              )}
            </button>

            {/* Results */}
            {results && (
              <div className="mt-5 p-4 rounded-lg bg-slate-50 border border-gray-200">
                <p className="text-sm font-semibold text-slate-800 mb-3">Enrollment Results</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Successful:</span>
                    <span className="font-semibold text-emerald-600">{results.successful.length}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Failed:</span>
                    <span className="font-semibold text-red-600">{results.failed.length}</span>
                  </div>
                </div>

                {results.failed.length > 0 && (
                  <div className="mt-3 max-h-32 overflow-y-auto">
                    <p className="text-xs font-medium text-slate-700 mb-2">Failed Enrollments:</p>
                    <div className="space-y-1 text-xs text-slate-600">
                      {results.failed.map((item, idx) => (
                        <p key={idx}><span className="font-medium">{item.studentId}:</span> {item.reason}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BulkStudentEnrollment;
