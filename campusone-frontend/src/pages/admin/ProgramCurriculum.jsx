import React, { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  GraduationCap,
  Plus,
  Trash2,
  X,
  AlertCircle,
  Search,
  ChevronDown,
  ChevronUp,
  Layers,
  BookMarked,
  Settings,
  Check,
  Hash,
} from 'lucide-react';
import { programAPI, courseAPI, departmentAPI } from '../../utils/api';

const inputClass = "w-full py-2.5 px-3.5 border border-gray-200 rounded-lg text-[0.95rem] transition-all focus:outline-none focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10";
const labelClass = "block text-[0.9rem] font-medium text-slate-800 mb-2";
const btnPrimaryClass = "inline-flex items-center gap-2 py-2.5 px-5 border-none rounded-lg text-[0.95rem] font-medium cursor-pointer transition-all bg-gradient-primary text-white hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(59,130,246,0.3)] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none";
const btnSecondaryClass = "inline-flex items-center gap-2 py-2.5 px-5 border border-gray-200 rounded-lg text-[0.95rem] font-medium cursor-pointer transition-all bg-white text-slate-800 hover:bg-slate-50 hover:border-gray-300";

const ELECTIVE_CATEGORIES = [
  { value: 'program', label: 'Program Elective' },
  { value: 'department', label: 'Department Elective' },
  { value: 'open', label: 'Open Elective' },
  { value: 'discipline', label: 'Discipline Elective' },
];

const ProgramCurriculum = () => {
  // Program selection
  const [programs, setPrograms] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [filterDepartment, setFilterDepartment] = useState('');
  const [loadingPrograms, setLoadingPrograms] = useState(true);

  // Curriculum data
  const [curriculum, setCurriculum] = useState([]);
  const [programInfo, setProgramInfo] = useState(null);
  const [loadingCurriculum, setLoadingCurriculum] = useState(false);

  // UI state
  const [expandedSemesters, setExpandedSemesters] = useState({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Add course modal
  const [showAddCourse, setShowAddCourse] = useState(null); // semester number or null
  const [courseSearch, setCourseSearch] = useState('');
  const [courseResults, setCourseResults] = useState([]);
  const [allCourses, setAllCourses] = useState([]);

  // Add elective modal
  const [showAddElective, setShowAddElective] = useState(null); // semester number or null
  const [electiveForm, setElectiveForm] = useState({
    slotName: '',
    domain: '',
    category: 'program',
    minCredits: 3,
    maxCredits: 4,
    description: '',
    allowedCourses: [],
  });
  const [electiveSearch, setElectiveSearch] = useState('');
  const [electiveSearchResults, setElectiveSearchResults] = useState([]);

  // Load programs and departments
  useEffect(() => {
    const load = async () => {
      try {
        const [progRes, deptRes] = await Promise.all([
          programAPI.getAllPrograms({ limit: 200 }),
          departmentAPI.getAllDepartments({ limit: 200 }),
        ]);
        if (progRes.data.success) setPrograms(progRes.data.data);
        if (deptRes.data.success) setDepartments(deptRes.data.data);
      } catch (err) {
        setError('Failed to load programs');
      } finally {
        setLoadingPrograms(false);
      }
    };
    load();
  }, []);

  // Load all courses for search
  useEffect(() => {
    const load = async () => {
      try {
        const res = await courseAPI.getAllCourses({ limit: 500, isActive: true });
        if (res.data.success) setAllCourses(res.data.data);
      } catch (err) {
        console.error('Error loading courses:', err);
      }
    };
    load();
  }, []);

  // Load curriculum when program is selected
  const fetchCurriculum = useCallback(async (programId) => {
    setLoadingCurriculum(true);
    setError('');
    try {
      const res = await programAPI.getCurriculum(programId);
      if (res.data.success) {
        setProgramInfo({
          programCode: res.data.data.programCode,
          name: res.data.data.name,
          totalSemesters: res.data.data.totalSemesters,
          totalCredits: res.data.data.totalCredits,
        });
        setCurriculum(res.data.data.curriculum || []);
        
        // Expand first semester by default
        const expanded = {};
        for (let i = 1; i <= res.data.data.totalSemesters; i++) {
          expanded[i] = i === 1;
        }
        setExpandedSemesters(expanded);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load curriculum');
    } finally {
      setLoadingCurriculum(false);
    }
  }, []);

  const handleProgramSelect = (programId) => {
    const prog = programs.find(p => p._id === programId);
    setSelectedProgram(prog);
    if (prog) fetchCurriculum(prog._id);
    else {
      setCurriculum([]);
      setProgramInfo(null);
    }
  };

  const toggleSemester = (semNum) => {
    setExpandedSemesters(prev => ({ ...prev, [semNum]: !prev[semNum] }));
  };

  // Get semester data (even if not yet defined in backend)
  const getSemesterData = (semNum) => {
    return curriculum.find(s => s.semesterNumber === semNum) || {
      semesterNumber: semNum,
      semesterName: `Semester ${semNum}`,
      requiredCourses: [],
      electiveSlots: [],
      calculatedCredits: { required: 0, electiveMin: 0, electiveMax: 0, totalMin: 0, totalMax: 0 },
    };
  };

  // Course search
  const searchCourses = (query, excludeIds = []) => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return allCourses
      .filter(c => !excludeIds.includes(c._id) && (c.courseCode.toLowerCase().includes(q) || c.courseName.toLowerCase().includes(q)))
      .slice(0, 10);
  };

  // Add course to semester
  const handleAddCourseToSemester = async (courseId) => {
    if (!selectedProgram || !showAddCourse) return;
    setError('');
    try {
      await programAPI.addCourseToSemester(selectedProgram._id, showAddCourse, courseId, true);
      setSuccess('Course added to semester');
      setCourseSearch('');
      setCourseResults([]);
      await fetchCurriculum(selectedProgram._id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add course');
    }
  };

  // Remove course from semester
  const handleRemoveCourse = async (semNum, courseId) => {
    if (!selectedProgram) return;
    setError('');
    try {
      await programAPI.removeCourseFromSemester(selectedProgram._id, semNum, courseId);
      setSuccess('Course removed from semester');
      await fetchCurriculum(selectedProgram._id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove course');
    }
  };

  // Add elective slot
  const handleAddElectiveSlot = async (e) => {
    e.preventDefault();
    if (!selectedProgram || !showAddElective) return;
    setError('');
    
    if (!electiveForm.slotName.trim()) {
      setError('Elective slot name is required');
      return;
    }

    try {
      await programAPI.addElectiveSlot(selectedProgram._id, showAddElective, {
        ...electiveForm,
        minCredits: parseInt(electiveForm.minCredits) || 3,
        maxCredits: parseInt(electiveForm.maxCredits) || 4,
      });
      setSuccess('Elective slot added');
      setShowAddElective(null);
      setElectiveForm({ slotName: '', domain: '', category: 'program', minCredits: 3, maxCredits: 4, description: '', allowedCourses: [] });
      await fetchCurriculum(selectedProgram._id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add elective slot');
    }
  };

  // Remove elective slot
  const handleRemoveElective = async (semNum, slotIndex) => {
    if (!selectedProgram) return;
    setError('');
    try {
      await programAPI.removeElectiveSlot(selectedProgram._id, semNum, slotIndex);
      setSuccess('Elective slot removed');
      await fetchCurriculum(selectedProgram._id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove elective slot');
    }
  };

  // Elective allowed courses management
  const handleElectiveAllowedSearch = (q) => {
    setElectiveSearch(q);
    if (!q.trim()) { setElectiveSearchResults([]); return; }
    setElectiveSearchResults(searchCourses(q, electiveForm.allowedCourses));
  };

  const addAllowedCourse = (courseId) => {
    setElectiveForm(prev => ({ ...prev, allowedCourses: [...prev.allowedCourses, courseId] }));
    setElectiveSearch('');
    setElectiveSearchResults([]);
  };

  const removeAllowedCourse = (courseId) => {
    setElectiveForm(prev => ({ ...prev, allowedCourses: prev.allowedCourses.filter(id => id !== courseId) }));
  };

  const getCourseName = (courseId) => {
    const c = allCourses.find(course => course._id === courseId);
    return c ? `${c.courseCode} - ${c.courseName}` : courseId;
  };

  // Filter programs by department
  const filteredPrograms = filterDepartment
    ? programs.filter(p => {
        const deptId = typeof p.department === 'object' ? p.department._id : p.department;
        return deptId === filterDepartment;
      })
    : programs;

  // Calculate total curriculum credits
  const totalCurriculumCredits = curriculum.reduce((sum, sem) => {
    return sum + (sem.calculatedCredits?.required || 0);
  }, 0);

  return (
    <div className="p-8 max-w-[1400px] mx-auto max-md:p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 flex-wrap gap-4 max-md:flex-col max-md:items-start">
        <div>
          <h1 className="text-[2rem] font-bold text-slate-800 m-0">Program Curriculum</h1>
          <p className="text-[0.95rem] text-slate-500 mt-1">Assign courses to semesters and configure elective slots</p>
        </div>
      </div>

      {/* Alerts */}
      {success && (
        <div className="flex items-center gap-3 py-4 px-5 rounded-lg mb-6 text-[0.95rem] bg-green-50 text-green-800 border border-green-200">
          <Check size={18} />
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="ml-auto bg-transparent border-none cursor-pointer text-inherit opacity-70 hover:opacity-100">
            <X size={16} />
          </button>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 py-4 px-5 rounded-lg mb-6 text-[0.95rem] bg-red-50 text-red-800 border border-red-200">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto bg-transparent border-none cursor-pointer text-inherit opacity-70 hover:opacity-100">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Program Selector */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h3 className="text-base font-semibold text-slate-700 mb-4">Select Program</h3>
        <div className="grid grid-cols-3 gap-4 max-md:grid-cols-1">
          <div>
            <label className={labelClass}>Department</label>
            <select value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)} className={inputClass}>
              <option value="">All Departments</option>
              {departments.map(d => (
                <option key={d._id} value={d._id}>{d.departmentCode} - {d.name}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2 max-md:col-span-1">
            <label className={labelClass}>Program</label>
            <select
              value={selectedProgram?._id || ''}
              onChange={(e) => handleProgramSelect(e.target.value)}
              className={inputClass}
            >
              <option value="">Select a program</option>
              {filteredPrograms.map(p => (
                <option key={p._id} value={p._id}>
                  {p.programCode} - {p.name} ({p.type}, {p.totalSemesters} semesters)
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Program Info Card */}
      {programInfo && (
        <div className="grid grid-cols-4 gap-4 mb-6 max-md:grid-cols-2">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <GraduationCap size={20} />
              </div>
              <p className="text-xs text-slate-500 font-medium">Program</p>
            </div>
            <p className="text-lg font-bold text-slate-800 m-0">{programInfo.programCode}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Hash size={20} />
              </div>
              <p className="text-xs text-slate-500 font-medium">Total Semesters</p>
            </div>
            <p className="text-lg font-bold text-slate-800 m-0">{programInfo.totalSemesters}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <BookOpen size={20} />
              </div>
              <p className="text-xs text-slate-500 font-medium">Target Credits</p>
            </div>
            <p className="text-lg font-bold text-slate-800 m-0">{programInfo.totalCredits}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <BookMarked size={20} />
              </div>
              <p className="text-xs text-slate-500 font-medium">Assigned Credits</p>
            </div>
            <p className="text-lg font-bold text-slate-800 m-0">
              {totalCurriculumCredits}
              <span className="text-sm font-normal text-slate-400 ml-1">/ {programInfo.totalCredits}</span>
            </p>
          </div>
        </div>
      )}

      {/* Loading */}
      {loadingCurriculum && (
        <div className="flex justify-center items-center py-16 text-slate-500">
          <div className="inline-block w-8 h-8 border-4 border-slate-200 border-t-primary-500 rounded-full animate-spin mr-3"></div>
          Loading curriculum...
        </div>
      )}

      {/* Semester Accordion */}
      {programInfo && !loadingCurriculum && (
        <div className="flex flex-col gap-4">
          {Array.from({ length: programInfo.totalSemesters }, (_, i) => i + 1).map((semNum) => {
            const sem = getSemesterData(semNum);
            const isExpanded = expandedSemesters[semNum];
            const reqCredits = sem.calculatedCredits?.required || 0;
            const electiveCount = sem.electiveSlots?.length || 0;
            const courseCount = sem.requiredCourses?.length || 0;

            return (
              <div key={semNum} className="bg-white rounded-xl shadow-sm overflow-hidden">
                {/* Semester Header */}
                <button
                  onClick={() => toggleSemester(semNum)}
                  className="w-full flex items-center justify-between p-5 bg-transparent border-none cursor-pointer text-left hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-cyan-500 text-white flex items-center justify-center font-bold text-lg">
                      {semNum}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-slate-800 m-0">
                        {sem.semesterName || `Semester ${semNum}`}
                      </h3>
                      <p className="text-xs text-slate-500 m-0 mt-0.5">
                        {courseCount} course{courseCount !== 1 ? 's' : ''} · {reqCredits} credits · {electiveCount} elective slot{electiveCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {reqCredits > 0 && (
                      <span className="text-sm font-semibold text-primary-600 bg-primary-50 px-3 py-1 rounded-full">
                        {reqCredits} CR
                      </span>
                    )}
                    {isExpanded ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
                  </div>
                </button>

                {/* Semester Content */}
                {isExpanded && (
                  <div className="border-t border-gray-100 p-5">
                    {/* Required Courses */}
                    <div className="mb-6">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-slate-700 m-0 flex items-center gap-2">
                          <BookOpen size={16} className="text-blue-500" />
                          Required Courses
                        </h4>
                        <button
                          onClick={() => { setShowAddCourse(semNum); setCourseSearch(''); setCourseResults([]); }}
                          className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium bg-transparent border-none cursor-pointer"
                        >
                          <Plus size={16} />
                          Add Course
                        </button>
                      </div>

                      {sem.requiredCourses?.length > 0 ? (
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">Code</th>
                                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">Course Name</th>
                                <th className="text-center py-2 px-3 text-xs font-semibold text-slate-500">Credits</th>
                                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500">Type</th>
                                <th className="text-left py-2 px-3 text-xs font-semibold text-slate-500 max-md:hidden">Domain</th>
                                <th className="text-right py-2 px-3 text-xs font-semibold text-slate-500 w-16"></th>
                              </tr>
                            </thead>
                            <tbody>
                              {sem.requiredCourses.map((rc, idx) => {
                                const course = rc.course || {};
                                return (
                                  <tr key={idx} className="border-b border-gray-50 hover:bg-slate-50 transition-colors">
                                    <td className="py-2.5 px-3">
                                      <span className="font-semibold text-slate-800 text-sm">{course.courseCode || 'N/A'}</span>
                                    </td>
                                    <td className="py-2.5 px-3 text-sm text-slate-700">{course.courseName || 'N/A'}</td>
                                    <td className="py-2.5 px-3 text-center">
                                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold text-xs">
                                        {course.creditHours || 0}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3">
                                      <span className="text-xs capitalize bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-medium">
                                        {course.courseType || 'N/A'}
                                      </span>
                                    </td>
                                    <td className="py-2.5 px-3 text-xs text-slate-500 max-md:hidden">{course.domain || '—'}</td>
                                    <td className="py-2.5 px-3 text-right">
                                      <button
                                        onClick={() => handleRemoveCourse(semNum, course._id || rc.course)}
                                        className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors bg-transparent border-none cursor-pointer"
                                        title="Remove"
                                      >
                                        <Trash2 size={15} />
                                      </button>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400 italic m-0 py-3">No required courses assigned yet</p>
                      )}
                    </div>

                    {/* Elective Slots */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-slate-700 m-0 flex items-center gap-2">
                          <Layers size={16} className="text-purple-500" />
                          Elective Slots
                        </h4>
                        <button
                          onClick={() => {
                            setShowAddElective(semNum);
                            setElectiveForm({ slotName: '', domain: '', category: 'program', minCredits: 3, maxCredits: 4, description: '', allowedCourses: [] });
                          }}
                          className="inline-flex items-center gap-1.5 text-sm text-purple-600 hover:text-purple-700 font-medium bg-transparent border-none cursor-pointer"
                        >
                          <Plus size={16} />
                          Add Elective Slot
                        </button>
                      </div>

                      {sem.electiveSlots?.length > 0 ? (
                        <div className="flex flex-col gap-3">
                          {sem.electiveSlots.map((slot, idx) => (
                            <div key={idx} className="flex items-start justify-between p-4 bg-purple-50/50 border border-purple-100 rounded-lg">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-semibold text-sm text-slate-800">{slot.slotName || `Elective ${idx + 1}`}</span>
                                  <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded font-medium capitalize">{slot.category}</span>
                                </div>
                                <p className="text-xs text-slate-500 m-0">
                                  {slot.minCredits}–{slot.maxCredits} credits
                                  {slot.domain && ` · ${slot.domain}`}
                                  {slot.allowedCourses?.length > 0 && ` · ${slot.allowedCourses.length} allowed course${slot.allowedCourses.length > 1 ? 's' : ''}`}
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
                              <button
                                onClick={() => handleRemoveElective(semNum, idx)}
                                className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors bg-transparent border-none cursor-pointer shrink-0 ml-3"
                                title="Remove"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-slate-400 italic m-0 py-3">No elective slots defined</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* No program selected */}
      {!selectedProgram && !loadingPrograms && (
        <div className="bg-white rounded-xl shadow-sm p-16 text-center">
          <GraduationCap size={56} className="mx-auto text-slate-300 mb-4" />
          <p className="text-lg text-slate-500 mb-2">Select a program to manage its curriculum</p>
          <p className="text-sm text-slate-400">Choose a department and program above to get started</p>
        </div>
      )}

      {/* Add Course Modal */}
      {showAddCourse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4 animate-fade-in" onClick={() => setShowAddCourse(null)}>
          <div className="bg-white rounded-xl max-w-[550px] w-full max-h-[80vh] overflow-y-auto shadow-xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-slate-800 m-0">Add Course to Semester {showAddCourse}</h2>
              <button className="bg-transparent border-none cursor-pointer text-slate-500 hover:text-slate-800 transition-colors p-1" onClick={() => setShowAddCourse(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="relative">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={courseSearch}
                  onChange={(e) => {
                    setCourseSearch(e.target.value);
                    const sem = getSemesterData(showAddCourse);
                    const existingIds = sem.requiredCourses?.map(rc => rc.course?._id || rc.course) || [];
                    setCourseResults(searchCourses(e.target.value, existingIds));
                  }}
                  placeholder="Search by course code or name..."
                  className={`${inputClass} pl-11`}
                  autoFocus
                />
              </div>
              {courseResults.length > 0 && (
                <div className="mt-3 border border-gray-200 rounded-lg max-h-[400px] overflow-y-auto">
                  {courseResults.map(c => (
                    <button
                      key={c._id}
                      onClick={() => handleAddCourseToSemester(c._id)}
                      className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50 cursor-pointer border-none bg-transparent transition-colors border-b border-gray-100 last:border-b-0"
                    >
                      <div>
                        <p className="font-semibold text-slate-800 text-sm m-0">{c.courseCode}</p>
                        <p className="text-xs text-slate-500 m-0 mt-0.5">{c.courseName}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-medium">{c.creditHours} CR</span>
                        <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded font-medium capitalize">{c.courseType}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {courseSearch.trim() && courseResults.length === 0 && (
                <p className="text-sm text-slate-400 text-center mt-4">No matching courses found</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Elective Slot Modal */}
      {showAddElective && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4 animate-fade-in" onClick={() => setShowAddElective(null)}>
          <div className="bg-white rounded-xl max-w-[600px] w-full max-h-[90vh] overflow-y-auto shadow-xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-slate-800 m-0">Add Elective Slot — Semester {showAddElective}</h2>
              <button className="bg-transparent border-none cursor-pointer text-slate-500 hover:text-slate-800 transition-colors p-1" onClick={() => setShowAddElective(null)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddElectiveSlot} className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-4 max-md:grid-cols-1">
                <div>
                  <label className={labelClass}>Slot Name *</label>
                  <input
                    type="text"
                    value={electiveForm.slotName}
                    onChange={(e) => setElectiveForm(prev => ({ ...prev, slotName: e.target.value }))}
                    placeholder="e.g., Program Elective I"
                    className={inputClass}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Category</label>
                  <select
                    value={electiveForm.category}
                    onChange={(e) => setElectiveForm(prev => ({ ...prev, category: e.target.value }))}
                    className={inputClass}
                  >
                    {ELECTIVE_CATEGORIES.map(c => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4 max-md:grid-cols-1">
                <div>
                  <label className={labelClass}>Domain</label>
                  <input
                    type="text"
                    value={electiveForm.domain}
                    onChange={(e) => setElectiveForm(prev => ({ ...prev, domain: e.target.value }))}
                    placeholder="e.g., Artificial Intelligence"
                    className={inputClass}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Min Credits</label>
                    <input type="number" value={electiveForm.minCredits} onChange={(e) => setElectiveForm(prev => ({ ...prev, minCredits: e.target.value }))} min={0} max={10} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Max Credits</label>
                    <input type="number" value={electiveForm.maxCredits} onChange={(e) => setElectiveForm(prev => ({ ...prev, maxCredits: e.target.value }))} min={0} max={10} className={inputClass} />
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className={labelClass}>Description</label>
                <textarea
                  value={electiveForm.description}
                  onChange={(e) => setElectiveForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Optional description for this elective slot..."
                  rows={2}
                  className={`${inputClass} resize-y`}
                />
              </div>

              {/* Allowed Courses */}
              <div className="mb-4">
                <label className={labelClass}>Allowed Courses (optional)</label>
                {electiveForm.allowedCourses.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {electiveForm.allowedCourses.map(id => (
                      <span key={id} className="inline-flex items-center gap-1.5 py-1 px-2.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium border border-purple-200">
                        {getCourseName(id)}
                        <button type="button" onClick={() => removeAllowedCourse(id)} className="bg-transparent border-none cursor-pointer text-purple-400 hover:text-purple-700 p-0">
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={electiveSearch}
                    onChange={(e) => handleElectiveAllowedSearch(e.target.value)}
                    placeholder="Search courses to restrict this slot..."
                    className={`${inputClass} pl-9 text-sm`}
                  />
                  {electiveSearchResults.length > 0 && (
                    <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-40 overflow-y-auto mt-1">
                      {electiveSearchResults.map(c => (
                        <button key={c._id} type="button" onClick={() => addAllowedCourse(c._id)} className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 cursor-pointer border-none bg-transparent border-b border-gray-50">
                          <span className="font-medium text-slate-800">{c.courseCode}</span>
                          <span className="text-slate-500 ml-2">{c.courseName}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 mt-4">
                <button type="button" className={btnSecondaryClass} onClick={() => setShowAddElective(null)}>Cancel</button>
                <button type="submit" className={btnPrimaryClass}>
                  <Plus size={18} />
                  Add Elective Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgramCurriculum;
