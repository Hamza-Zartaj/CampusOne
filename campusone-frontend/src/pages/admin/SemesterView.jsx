import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  GraduationCap,
  User,
  Mail,
  Phone,
  Calendar,
  Hash,
  Layers,
  AlertCircle,
  Search,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Briefcase,
} from 'lucide-react';
import { programAPI, semesterInchargeAPI, courseOfferingAPI } from '../../utils/api';

const inputClass = "w-full py-2.5 px-3.5 border border-gray-200 rounded-lg text-[0.95rem] transition-all focus:outline-none focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10";
const labelClass = "block text-[0.9rem] font-medium text-slate-800 mb-2";

const SemesterView = () => {
  // Selection state
  const [programs, setPrograms] = useState([]);
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [activeSemester, setActiveSemester] = useState(1);
  const [academicYear, setAcademicYear] = useState('');
  const [batch, setBatch] = useState('');

  // Data
  const [curriculum, setCurriculum] = useState([]);
  const [programInfo, setProgramInfo] = useState(null);
  const [incharge, setIncharge] = useState(null);
  const [offerings, setOfferings] = useState([]);

  // Loading
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [loadingIncharge, setLoadingIncharge] = useState(false);
  const [error, setError] = useState('');

  // Generate academic year options (last 3 years to next year)
  const currentYear = new Date().getFullYear();
  const academicYears = Array.from({ length: 5 }, (_, i) => {
    const start = currentYear - 2 + i;
    return `${start}-${start + 1}`;
  });

  // Generate batch year options
  const batchYears = Array.from({ length: 6 }, (_, i) => currentYear - 4 + i);

  // Load programs on mount
  useEffect(() => {
    const load = async () => {
      try {
        const res = await programAPI.getAllPrograms({ limit: 200 });
        if (res.data.success) setPrograms(res.data.data);
      } catch (err) {
        setError('Failed to load programs');
      } finally {
        setLoadingPrograms(false);
      }
    };
    load();
  }, []);

  // Load curriculum when program changes
  useEffect(() => {
    if (!selectedProgramId) {
      setProgramInfo(null);
      setCurriculum([]);
      setSelectedProgram(null);
      return;
    }
    const prog = programs.find(p => p._id === selectedProgramId);
    setSelectedProgram(prog);
    setActiveSemester(1);

    const fetchCurriculum = async () => {
      setLoadingData(true);
      setError('');
      try {
        const res = await programAPI.getCurriculum(selectedProgramId);
        if (res.data.success) {
          setProgramInfo({
            programCode: res.data.data.programCode,
            name: res.data.data.name,
            totalSemesters: res.data.data.totalSemesters,
            totalCredits: res.data.data.totalCredits,
          });
          setCurriculum(res.data.data.curriculum || []);
        }
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load curriculum');
      } finally {
        setLoadingData(false);
      }
    };
    fetchCurriculum();
  }, [selectedProgramId, programs]);

  // Load incharge when program, semester, academicYear, batch change
  useEffect(() => {
    if (!selectedProgramId || !academicYear || !batch) {
      setIncharge(null);
      return;
    }

    const fetchIncharge = async () => {
      setLoadingIncharge(true);
      try {
        const res = await semesterInchargeAPI.lookup({
          program: selectedProgramId,
          batch: parseInt(batch),
          academicYear,
          semesterNumber: activeSemester,
        });
        if (res.data.success) {
          setIncharge(res.data.data);
        } else {
          setIncharge(null);
        }
      } catch (err) {
        // 404 means no incharge assigned — not an error
        setIncharge(null);
      } finally {
        setLoadingIncharge(false);
      }
    };
    fetchIncharge();
  }, [selectedProgramId, activeSemester, academicYear, batch]);

  // Load offerings when program, semester, academicYear change
  useEffect(() => {
    if (!selectedProgramId || !academicYear) {
      setOfferings([]);
      return;
    }

    const fetchOfferings = async () => {
      try {
        const res = await courseOfferingAPI.getOfferingsByProgramSemester(selectedProgramId, {
          academicYear,
          semesterNumber: activeSemester,
        });
        if (res.data.success) {
          setOfferings(res.data.data || []);
        }
      } catch (err) {
        setOfferings([]);
      }
    };
    fetchOfferings();
  }, [selectedProgramId, activeSemester, academicYear]);

  // Get current semester data
  const semesterData = curriculum.find(s => s.semesterNumber === activeSemester) || {
    semesterNumber: activeSemester,
    semesterName: `Semester ${activeSemester}`,
    requiredCourses: [],
    electiveSlots: [],
    calculatedCredits: { required: 0, electiveMin: 0, electiveMax: 0, totalMin: 0, totalMax: 0 },
  };

  const totalSemesters = programInfo?.totalSemesters || 8;

  return (
    <div className="p-8 max-w-[1400px] mx-auto max-md:p-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[2rem] font-bold text-slate-800 m-0">Semester View</h1>
        <p className="text-[0.95rem] text-slate-500 mt-1">View semester courses, elective slots, and incharge details</p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 py-4 px-5 rounded-lg mb-6 text-[0.95rem] bg-red-50 text-red-800 border border-red-200">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="grid grid-cols-4 gap-4 max-lg:grid-cols-2 max-md:grid-cols-1">
          <div>
            <label className={labelClass}>Program</label>
            <select value={selectedProgramId} onChange={(e) => setSelectedProgramId(e.target.value)} className={inputClass}>
              <option value="">Select program</option>
              {programs.map(p => (
                <option key={p._id} value={p._id}>{p.programCode} - {p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Academic Year</label>
            <select value={academicYear} onChange={(e) => setAcademicYear(e.target.value)} className={inputClass}>
              <option value="">Select year</option>
              {academicYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Batch</label>
            <select value={batch} onChange={(e) => setBatch(e.target.value)} className={inputClass}>
              <option value="">Select batch</option>
              {batchYears.map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Semester</label>
            <select value={activeSemester} onChange={(e) => setActiveSemester(parseInt(e.target.value))} className={inputClass} disabled={!programInfo}>
              {Array.from({ length: totalSemesters }, (_, i) => i + 1).map(n => (
                <option key={n} value={n}>Semester {n}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* No program selected */}
      {!selectedProgramId && !loadingPrograms && (
        <div className="bg-white rounded-xl shadow-sm p-16 text-center">
          <GraduationCap size={56} className="mx-auto text-slate-300 mb-4" />
          <p className="text-lg text-slate-500 mb-2">Select a program to begin</p>
          <p className="text-sm text-slate-400">Choose a program, academic year, and batch to view semester details</p>
        </div>
      )}

      {/* Loading */}
      {loadingData && (
        <div className="flex justify-center items-center py-16 text-slate-500">
          <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-primary-500 rounded-full animate-spin mr-3"></div>
          Loading semester data...
        </div>
      )}

      {/* Semester Content */}
      {programInfo && !loadingData && (
        <div className="grid grid-cols-3 gap-6 max-lg:grid-cols-1">
          {/* Main — Courses (span 2 cols) */}
          <div className="col-span-2 max-lg:col-span-1">
            {/* Semester Navigation */}
            <div className="flex items-center gap-2 mb-5">
              <button
                disabled={activeSemester <= 1}
                onClick={() => setActiveSemester(prev => Math.max(1, prev - 1))}
                className="p-2 rounded-lg bg-white border border-gray-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <ChevronLeft size={18} />
              </button>
              <div className="flex gap-1.5 flex-wrap">
                {Array.from({ length: totalSemesters }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    onClick={() => setActiveSemester(n)}
                    className={`w-9 h-9 rounded-lg font-semibold text-sm border-none cursor-pointer transition-all ${
                      n === activeSemester
                        ? 'bg-gradient-to-br from-primary-500 to-cyan-500 text-white shadow-md'
                        : 'bg-white text-slate-600 hover:bg-slate-50 border border-gray-200'
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <button
                disabled={activeSemester >= totalSemesters}
                onClick={() => setActiveSemester(prev => Math.min(totalSemesters, prev + 1))}
                className="p-2 rounded-lg bg-white border border-gray-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              >
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Semester Summary */}
            <div className="bg-white rounded-xl shadow-sm mb-5">
              <div className="p-5 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-lg bg-gradient-to-br from-primary-500 to-cyan-500 text-white flex items-center justify-center font-bold text-lg shrink-0">
                    {activeSemester}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 m-0">
                      {semesterData.semesterName || `Semester ${activeSemester}`}
                    </h2>
                    <p className="text-sm text-slate-500 m-0 mt-0.5">
                      {programInfo.programCode} · {programInfo.name}
                    </p>
                  </div>
                </div>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-3 gap-0 divide-x divide-gray-100">
                <div className="p-4 text-center">
                  <p className="text-2xl font-bold text-slate-800 m-0">{semesterData.requiredCourses?.length || 0}</p>
                  <p className="text-xs text-slate-500 m-0 mt-0.5">Courses</p>
                </div>
                <div className="p-4 text-center">
                  <p className="text-2xl font-bold text-slate-800 m-0">{semesterData.calculatedCredits?.required || 0}</p>
                  <p className="text-xs text-slate-500 m-0 mt-0.5">Credits</p>
                </div>
                <div className="p-4 text-center">
                  <p className="text-2xl font-bold text-slate-800 m-0">{semesterData.electiveSlots?.length || 0}</p>
                  <p className="text-xs text-slate-500 m-0 mt-0.5">Elective Slots</p>
                </div>
              </div>
            </div>

            {/* Course List */}
            <div className="bg-white rounded-xl shadow-sm mb-5">
              <div className="p-5 border-b border-gray-100 flex items-center gap-2">
                <BookOpen size={18} className="text-blue-500" />
                <h3 className="text-base font-semibold text-slate-800 m-0">Required Courses</h3>
              </div>
              {semesterData.requiredCourses?.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Code</th>
                        <th className="text-left py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Course Name</th>
                        <th className="text-center py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Credits</th>
                        <th className="text-left py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wide">Type</th>
                        <th className="text-left py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wide max-md:hidden">Domain</th>
                        <th className="text-center py-3 px-5 text-xs font-semibold text-slate-500 uppercase tracking-wide max-sm:hidden">Compulsory</th>
                      </tr>
                    </thead>
                    <tbody>
                      {semesterData.requiredCourses.map((rc, idx) => {
                        const course = rc.course || {};
                        // Check if there's an offering for this course
                        const offering = offerings.find(o => {
                          const offeringCourseId = typeof o.course === 'object' ? o.course._id : o.course;
                          return offeringCourseId === course._id;
                        });
                        return (
                          <tr key={idx} className="border-b border-gray-50 hover:bg-slate-50/50 transition-colors">
                            <td className="py-3.5 px-5">
                              <span className="font-semibold text-slate-800 text-sm">{course.courseCode || 'N/A'}</span>
                            </td>
                            <td className="py-3.5 px-5">
                              <p className="text-sm text-slate-700 m-0">{course.courseName || 'N/A'}</p>
                              {offering && (
                                <p className="text-xs text-primary-500 m-0 mt-0.5 flex items-center gap-1">
                                  <User size={11} />
                                  {typeof offering.teacher === 'object'
                                    ? `${offering.teacher.firstName || ''} ${offering.teacher.lastName || ''}`.trim()
                                    : 'Instructor assigned'}
                                </p>
                              )}
                            </td>
                            <td className="py-3.5 px-5 text-center">
                              <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary-50 text-primary-700 font-bold text-sm">
                                {course.creditHours || 0}
                              </span>
                            </td>
                            <td className="py-3.5 px-5">
                              <span className="text-xs capitalize bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-medium">
                                {course.courseType || 'N/A'}
                              </span>
                            </td>
                            <td className="py-3.5 px-5 text-sm text-slate-500 max-md:hidden">{course.domain || '—'}</td>
                            <td className="py-3.5 px-5 text-center max-sm:hidden">
                              {rc.isCompulsory !== false ? (
                                <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded font-medium">Yes</span>
                              ) : (
                                <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded font-medium">No</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center">
                  <BookOpen size={36} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-sm text-slate-400">No required courses assigned to this semester</p>
                </div>
              )}
            </div>

            {/* Elective Slots */}
            {semesterData.electiveSlots?.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm">
                <div className="p-5 border-b border-gray-100 flex items-center gap-2">
                  <Layers size={18} className="text-purple-500" />
                  <h3 className="text-base font-semibold text-slate-800 m-0">Elective Slots</h3>
                </div>
                <div className="p-5 flex flex-col gap-3">
                  {semesterData.electiveSlots.map((slot, idx) => (
                    <div key={idx} className="p-4 bg-purple-50/40 border border-purple-100 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-sm text-slate-800">{slot.slotName || `Elective ${idx + 1}`}</span>
                        <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded font-medium capitalize">{slot.category}</span>
                      </div>
                      <p className="text-xs text-slate-500 m-0">
                        {slot.minCredits}–{slot.maxCredits} credits
                        {slot.domain && ` · Domain: ${slot.domain}`}
                      </p>
                      {slot.description && (
                        <p className="text-xs text-slate-400 m-0 mt-1">{slot.description}</p>
                      )}
                      {slot.allowedCourses?.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {slot.allowedCourses.map((ac, i) => (
                            <span key={i} className="text-xs bg-white text-purple-600 px-2 py-0.5 rounded border border-purple-200">
                              {typeof ac === 'object' ? ac.courseCode : ac}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar — Incharge Card */}
          <div className="col-span-1">
            <div className="bg-white rounded-xl shadow-sm sticky top-6">
              <div className="p-5 border-b border-gray-100 flex items-center gap-2">
                <User size={18} className="text-emerald-500" />
                <h3 className="text-base font-semibold text-slate-800 m-0">Semester Incharge</h3>
              </div>

              {!academicYear || !batch ? (
                <div className="p-6 text-center">
                  <Calendar size={36} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-sm text-slate-400 m-0">Select academic year and batch to view incharge</p>
                </div>
              ) : loadingIncharge ? (
                <div className="p-6 text-center">
                  <div className="inline-block w-6 h-6 border-3 border-slate-200 border-t-primary-500 rounded-full animate-spin mb-2"></div>
                  <p className="text-sm text-slate-400">Loading...</p>
                </div>
              ) : incharge ? (
                <div className="p-5">
                  {/* Teacher Info */}
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
                      {(incharge.teacher?.firstName?.[0] || '') + (incharge.teacher?.lastName?.[0] || '')}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 text-base m-0">
                        {incharge.teacher?.firstName || ''} {incharge.teacher?.lastName || ''}
                      </p>
                      <p className="text-xs text-slate-500 m-0 mt-0.5">
                        {incharge.teacher?.designation || 'Faculty'}
                      </p>
                    </div>
                  </div>

                  {/* Contact Details */}
                  <div className="flex flex-col gap-3 mb-5">
                    {incharge.teacher?.email && (
                      <div className="flex items-center gap-2.5">
                        <Mail size={15} className="text-slate-400 shrink-0" />
                        <span className="text-sm text-slate-600 break-all">{incharge.teacher.email}</span>
                      </div>
                    )}
                    {incharge.teacher?.phone && (
                      <div className="flex items-center gap-2.5">
                        <Phone size={15} className="text-slate-400 shrink-0" />
                        <span className="text-sm text-slate-600">{incharge.teacher.phone}</span>
                      </div>
                    )}
                    {incharge.teacher?.department && (
                      <div className="flex items-center gap-2.5">
                        <Briefcase size={15} className="text-slate-400 shrink-0" />
                        <span className="text-sm text-slate-600">
                          {typeof incharge.teacher.department === 'object' ? incharge.teacher.department.name : incharge.teacher.department}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Assignment Details */}
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide m-0 mb-3">Assignment Details</p>
                    <div className="flex flex-col gap-2.5">
                      <div className="flex justify-between">
                        <span className="text-xs text-slate-500">Academic Year</span>
                        <span className="text-xs font-medium text-slate-700">{incharge.academicYear}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-slate-500">Batch</span>
                        <span className="text-xs font-medium text-slate-700">{incharge.batch}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-slate-500">Semester</span>
                        <span className="text-xs font-medium text-slate-700">{incharge.semesterNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-xs text-slate-500">Status</span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                          incharge.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
                        }`}>
                          {incharge.status || 'active'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Responsibilities */}
                  {incharge.responsibilities?.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide m-0 mb-2">Responsibilities</p>
                      <div className="flex flex-wrap gap-1.5">
                        {incharge.responsibilities.map((r, i) => (
                          <span key={i} className="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded font-medium capitalize">
                            {r.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-6 text-center">
                  <User size={36} className="mx-auto text-slate-300 mb-3" />
                  <p className="text-sm text-slate-400 m-0">No incharge assigned for this semester</p>
                  <p className="text-xs text-slate-300 mt-1">
                    Semester {activeSemester} · {academicYear} · Batch {batch}
                  </p>
                </div>
              )}
            </div>

            {/* Offerings Summary */}
            {offerings.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm mt-5">
                <div className="p-5 border-b border-gray-100 flex items-center gap-2">
                  <Calendar size={18} className="text-amber-500" />
                  <h3 className="text-base font-semibold text-slate-800 m-0">Course Offerings</h3>
                </div>
                <div className="p-4 flex flex-col gap-2.5">
                  {offerings.map((o, idx) => {
                    const offeringCourse = typeof o.course === 'object' ? o.course : {};
                    const offeringTeacher = typeof o.teacher === 'object' ? o.teacher : {};
                    return (
                      <div key={idx} className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-lg">
                        <div className="w-8 h-8 rounded bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                          <BookOpen size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700 m-0 truncate">{offeringCourse.courseCode || 'N/A'}</p>
                          <p className="text-xs text-slate-500 m-0 mt-0.5 truncate">
                            {offeringTeacher.firstName ? `${offeringTeacher.firstName} ${offeringTeacher.lastName || ''}`.trim() : 'TBA'}
                          </p>
                        </div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded shrink-0 ${
                          o.status === 'active' ? 'bg-green-50 text-green-600' :
                          o.status === 'scheduled' ? 'bg-blue-50 text-blue-600' :
                          'bg-slate-100 text-slate-500'
                        }`}>
                          {o.status || 'N/A'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SemesterView;
