import React, { useState, useEffect, useCallback } from 'react';
import { X, AlertCircle, Plus, Trash2, Search } from 'lucide-react';
import { courseAPI, departmentAPI, programAPI } from '../utils/api';

const inputClass = "w-full py-2.5 px-3.5 border border-gray-200 rounded-lg text-[0.95rem] transition-all focus:outline-none focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10";
const labelClass = "block text-[0.9rem] font-medium text-slate-800 mb-2";
const btnPrimaryClass = "inline-flex items-center gap-2 py-2.5 px-5 border-none rounded-lg text-[0.95rem] font-medium cursor-pointer transition-all bg-gradient-primary text-white hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(59,130,246,0.3)] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none";
const btnSecondaryClass = "inline-flex items-center gap-2 py-2.5 px-5 border border-gray-200 rounded-lg text-[0.95rem] font-medium cursor-pointer transition-all bg-white text-slate-800 hover:bg-slate-50 hover:border-gray-300";

const COURSE_TYPES = [
  { value: 'core', label: 'Core' },
  { value: 'elective', label: 'Elective' },
  { value: 'lab', label: 'Lab' },
  { value: 'project', label: 'Project' },
  { value: 'internship', label: 'Internship' },
  { value: 'thesis', label: 'Thesis' },
];

const emptyForm = {
  courseCode: '',
  courseName: '',
  description: '',
  department: '',
  program: '',
  creditHours: 3,
  lectureHours: 3,
  labHours: 0,
  tutorialHours: 0,
  courseType: 'core',
  domain: '',
  prerequisites: [],
  corequisites: [],
  pairCourse: '',
  syllabus: '',
  learningOutcomes: [''],
};

const CourseModal = ({ isOpen, onClose, onSuccess, editCourse = null }) => {
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // Reference data
  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [allCourses, setAllCourses] = useState([]);

  // Prerequisite / corequisite search
  const [prereqSearch, setPrereqSearch] = useState('');
  const [coreqSearch, setCoreqSearch] = useState('');
  const [pairSearch, setPairSearch] = useState('');
  const [prereqResults, setPrereqResults] = useState([]);
  const [coreqResults, setCoreqResults] = useState([]);
  const [pairResults, setPairResults] = useState([]);

  const isEditMode = !!editCourse;

  // Load reference data on mount
  useEffect(() => {
    if (!isOpen) return;
    const load = async () => {
      try {
        const [deptRes, progRes, courseRes] = await Promise.all([
          departmentAPI.getAllDepartments({ limit: 200 }),
          programAPI.getAllPrograms({ limit: 200 }),
          courseAPI.getAllCourses({ limit: 500, isActive: true }),
        ]);
        if (deptRes.data.success) setDepartments(deptRes.data.data);
        if (progRes.data.success) setPrograms(progRes.data.data);
        if (courseRes.data.success) setAllCourses(courseRes.data.data);
      } catch (err) {
        console.error('Error loading reference data:', err);
      }
    };
    load();
  }, [isOpen]);

  // Populate form when editing
  useEffect(() => {
    if (editCourse) {
      setForm({
        courseCode: editCourse.courseCode || '',
        courseName: editCourse.courseName || '',
        description: editCourse.description || '',
        department: editCourse.department?._id || editCourse.department || '',
        program: editCourse.program?._id || editCourse.program || '',
        creditHours: editCourse.creditHours || 3,
        lectureHours: editCourse.lectureHours || 0,
        labHours: editCourse.labHours || 0,
        tutorialHours: editCourse.tutorialHours || 0,
        courseType: editCourse.courseType || 'core',
        domain: editCourse.domain || '',
        prerequisites: editCourse.prerequisites?.map(p => p._id || p) || [],
        corequisites: editCourse.corequisites?.map(c => c._id || c) || [],
        pairCourse: editCourse.pairCourse?._id || editCourse.pairCourse || '',
        syllabus: editCourse.syllabus || '',
        learningOutcomes: editCourse.learningOutcomes?.length > 0 ? editCourse.learningOutcomes : [''],
      });
    } else {
      setForm(emptyForm);
    }
    setError('');
  }, [editCourse, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleNumberChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
  };

  // Learning outcomes management
  const handleOutcomeChange = (index, value) => {
    setForm(prev => {
      const outcomes = [...prev.learningOutcomes];
      outcomes[index] = value;
      return { ...prev, learningOutcomes: outcomes };
    });
  };

  const addOutcome = () => {
    setForm(prev => ({ ...prev, learningOutcomes: [...prev.learningOutcomes, ''] }));
  };

  const removeOutcome = (index) => {
    setForm(prev => ({
      ...prev,
      learningOutcomes: prev.learningOutcomes.filter((_, i) => i !== index),
    }));
  };

  // Course search for prereqs, coreqs, pair
  const searchCourses = useCallback((query, excludeIds = []) => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return allCourses
      .filter(c =>
        !excludeIds.includes(c._id) &&
        c._id !== editCourse?._id &&
        (c.courseCode.toLowerCase().includes(q) || c.courseName.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [allCourses, editCourse]);

  const handlePrereqSearch = (q) => {
    setPrereqSearch(q);
    setPrereqResults(searchCourses(q, [...form.prerequisites, ...form.corequisites]));
  };

  const handleCoreqSearch = (q) => {
    setCoreqSearch(q);
    setCoreqResults(searchCourses(q, [...form.prerequisites, ...form.corequisites]));
  };

  const handlePairSearch = (q) => {
    setPairSearch(q);
    setPairResults(searchCourses(q, [...form.prerequisites, ...form.corequisites, form.pairCourse].filter(Boolean)));
  };

  const addPrerequisite = (courseId) => {
    setForm(prev => ({ ...prev, prerequisites: [...prev.prerequisites, courseId] }));
    setPrereqSearch('');
    setPrereqResults([]);
  };

  const removePrerequisite = (courseId) => {
    setForm(prev => ({ ...prev, prerequisites: prev.prerequisites.filter(id => id !== courseId) }));
  };

  const addCorequisite = (courseId) => {
    setForm(prev => ({ ...prev, corequisites: [...prev.corequisites, courseId] }));
    setCoreqSearch('');
    setCoreqResults([]);
  };

  const removeCorequisite = (courseId) => {
    setForm(prev => ({ ...prev, corequisites: prev.corequisites.filter(id => id !== courseId) }));
  };

  const setPairCourseId = (courseId) => {
    setForm(prev => ({ ...prev, pairCourse: courseId }));
    setPairSearch('');
    setPairResults([]);
  };

  const clearPairCourse = () => {
    setForm(prev => ({ ...prev, pairCourse: '' }));
  };

  // Get course display name by ID
  const getCourseName = (courseId) => {
    const c = allCourses.find(course => course._id === courseId);
    return c ? `${c.courseCode} - ${c.courseName}` : courseId;
  };

  // Submit handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.courseCode.trim()) {
      setError('Course code is required');
      return;
    }
    if (!form.courseName.trim()) {
      setError('Course name is required');
      return;
    }
    if (!form.department) {
      setError('Department is required');
      return;
    }
    if (form.creditHours < 1 || form.creditHours > 6) {
      setError('Credit hours must be between 1 and 6');
      return;
    }

    setSaving(true);

    try {
      const payload = {
        ...form,
        courseCode: form.courseCode.toUpperCase().trim(),
        courseName: form.courseName.trim(),
        learningOutcomes: form.learningOutcomes.filter(o => o.trim()),
      };

      // Remove empty optional fields
      if (!payload.program) delete payload.program;
      if (!payload.pairCourse) delete payload.pairCourse;
      if (!payload.description) delete payload.description;
      if (!payload.domain) delete payload.domain;
      if (!payload.syllabus) delete payload.syllabus;
      if (payload.prerequisites.length === 0) delete payload.prerequisites;
      if (payload.corequisites.length === 0) delete payload.corequisites;
      if (payload.learningOutcomes.length === 0) delete payload.learningOutcomes;

      let response;
      if (isEditMode) {
        response = await courseAPI.updateCourse(editCourse._id, payload);
      } else {
        response = await courseAPI.createCourse(payload);
      }

      if (response.data.success) {
        onSuccess(isEditMode ? 'updated' : 'created');
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${isEditMode ? 'update' : 'create'} course`);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[1000] p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-[800px] w-full max-h-[90vh] overflow-y-auto shadow-xl animate-slide-up" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-slate-800 m-0">
            {isEditMode ? 'Edit Course' : 'Add New Course'}
          </h2>
          <button className="bg-transparent border-none cursor-pointer text-slate-500 hover:text-slate-800 transition-colors p-1" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 py-4 px-5 rounded-lg mx-6 mt-4 text-[0.95rem] bg-red-50 text-red-800 border border-red-200">
            <AlertCircle size={18} />
            <span>{error}</span>
            <button onClick={() => setError('')} className="ml-auto bg-transparent border-none cursor-pointer text-inherit opacity-70 hover:opacity-100">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Basic Info */}
          <h3 className="text-base font-semibold text-slate-700 mb-4 pb-2 border-b border-gray-100">Basic Information</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4 max-md:grid-cols-1">
            <div className="mb-2">
              <label className={labelClass} htmlFor="courseCode">Course Code *</label>
              <input
                type="text"
                id="courseCode"
                name="courseCode"
                value={form.courseCode}
                onChange={handleChange}
                required
                placeholder="e.g., CS101"
                className={`${inputClass} uppercase`}
                disabled={isEditMode}
              />
              {isEditMode && <p className="text-xs text-slate-400 mt-1">Course code cannot be changed</p>}
            </div>
            <div className="mb-2">
              <label className={labelClass} htmlFor="courseName">Course Name *</label>
              <input
                type="text"
                id="courseName"
                name="courseName"
                value={form.courseName}
                onChange={handleChange}
                required
                placeholder="e.g., Introduction to Computer Science"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4 max-md:grid-cols-1">
            <div className="mb-2">
              <label className={labelClass} htmlFor="department">Department *</label>
              <select id="department" name="department" value={form.department} onChange={handleChange} required className={inputClass}>
                <option value="">Select department</option>
                {departments.map(dept => (
                  <option key={dept._id} value={dept._id}>
                    {dept.departmentCode ? `${dept.departmentCode} - ` : ''}{dept.departmentName || dept.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="mb-2">
              <label className={labelClass} htmlFor="program">Program</label>
              <select id="program" name="program" value={form.program} onChange={handleChange} className={inputClass}>
                <option value="">Select program (optional)</option>
                {programs.map(prog => (
                  <option key={prog._id} value={prog._id}>
                    {prog.programCode ? `${prog.programCode} - ` : ''}{prog.programName || prog.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className={labelClass} htmlFor="description">Description</label>
            <textarea
              id="description"
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
              placeholder="Brief course description..."
              className={`${inputClass} resize-y`}
            />
          </div>

          {/* Credit & Hours */}
          <h3 className="text-base font-semibold text-slate-700 mb-4 pb-2 border-b border-gray-100 mt-6">Credits & Hours</h3>
          
          <div className="grid grid-cols-4 gap-4 mb-4 max-md:grid-cols-2">
            <div className="mb-2">
              <label className={labelClass} htmlFor="creditHours">Credit Hours *</label>
              <input type="number" id="creditHours" name="creditHours" value={form.creditHours} onChange={handleNumberChange} required min={1} max={6} className={inputClass} />
            </div>
            <div className="mb-2">
              <label className={labelClass} htmlFor="lectureHours">Lecture Hrs</label>
              <input type="number" id="lectureHours" name="lectureHours" value={form.lectureHours} onChange={handleNumberChange} min={0} max={10} className={inputClass} />
            </div>
            <div className="mb-2">
              <label className={labelClass} htmlFor="labHours">Lab Hrs</label>
              <input type="number" id="labHours" name="labHours" value={form.labHours} onChange={handleNumberChange} min={0} max={10} className={inputClass} />
            </div>
            <div className="mb-2">
              <label className={labelClass} htmlFor="tutorialHours">Tutorial Hrs</label>
              <input type="number" id="tutorialHours" name="tutorialHours" value={form.tutorialHours} onChange={handleNumberChange} min={0} max={10} className={inputClass} />
            </div>
          </div>

          {/* Classification */}
          <h3 className="text-base font-semibold text-slate-700 mb-4 pb-2 border-b border-gray-100 mt-6">Classification</h3>
          
          <div className="grid grid-cols-2 gap-4 mb-4 max-md:grid-cols-1">
            <div className="mb-2">
              <label className={labelClass} htmlFor="courseType">Course Type</label>
              <select id="courseType" name="courseType" value={form.courseType} onChange={handleChange} className={inputClass}>
                {COURSE_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="mb-2">
              <label className={labelClass} htmlFor="domain">Domain</label>
              <input type="text" id="domain" name="domain" value={form.domain} onChange={handleChange} placeholder="e.g., Computer Science, Mathematics" className={inputClass} />
            </div>
          </div>

          {/* Prerequisites */}
          <h3 className="text-base font-semibold text-slate-700 mb-4 pb-2 border-b border-gray-100 mt-6">Prerequisites & Relations</h3>

          {/* Prerequisites */}
          <div className="mb-5">
            <label className={labelClass}>Prerequisites</label>
            {form.prerequisites.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {form.prerequisites.map(id => (
                  <span key={id} className="inline-flex items-center gap-1.5 py-1.5 px-3 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium border border-blue-200">
                    {getCourseName(id)}
                    <button type="button" onClick={() => removePrerequisite(id)} className="bg-transparent border-none cursor-pointer text-blue-400 hover:text-blue-700 p-0">
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={prereqSearch}
                onChange={(e) => handlePrereqSearch(e.target.value)}
                placeholder="Search courses to add as prerequisite..."
                className={`${inputClass} pl-9 text-sm`}
              />
              {prereqResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto mt-1">
                  {prereqResults.map(c => (
                    <button key={c._id} type="button" onClick={() => addPrerequisite(c._id)} className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 cursor-pointer border-none bg-transparent transition-colors border-b border-gray-50">
                      <span className="font-medium text-slate-800">{c.courseCode}</span>
                      <span className="text-slate-500 ml-2">{c.courseName}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Corequisites */}
          <div className="mb-5">
            <label className={labelClass}>Corequisites</label>
            {form.corequisites.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {form.corequisites.map(id => (
                  <span key={id} className="inline-flex items-center gap-1.5 py-1.5 px-3 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium border border-purple-200">
                    {getCourseName(id)}
                    <button type="button" onClick={() => removeCorequisite(id)} className="bg-transparent border-none cursor-pointer text-purple-400 hover:text-purple-700 p-0">
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={coreqSearch}
                onChange={(e) => handleCoreqSearch(e.target.value)}
                placeholder="Search courses to add as corequisite..."
                className={`${inputClass} pl-9 text-sm`}
              />
              {coreqResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto mt-1">
                  {coreqResults.map(c => (
                    <button key={c._id} type="button" onClick={() => addCorequisite(c._id)} className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 cursor-pointer border-none bg-transparent transition-colors border-b border-gray-50">
                      <span className="font-medium text-slate-800">{c.courseCode}</span>
                      <span className="text-slate-500 ml-2">{c.courseName}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Pair Course */}
          <div className="mb-5">
            <label className={labelClass}>Pair Course (Lab/Theory)</label>
            {form.pairCourse && (
              <div className="flex gap-2 mb-3">
                <span className="inline-flex items-center gap-1.5 py-1.5 px-3 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium border border-amber-200">
                  {getCourseName(form.pairCourse)}
                  <button type="button" onClick={clearPairCourse} className="bg-transparent border-none cursor-pointer text-amber-400 hover:text-amber-700 p-0">
                    <X size={14} />
                  </button>
                </span>
              </div>
            )}
            {!form.pairCourse && (
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={pairSearch}
                  onChange={(e) => handlePairSearch(e.target.value)}
                  placeholder="Search for pair course..."
                  className={`${inputClass} pl-9 text-sm`}
                />
                {pairResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto mt-1">
                    {pairResults.map(c => (
                      <button key={c._id} type="button" onClick={() => setPairCourseId(c._id)} className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 cursor-pointer border-none bg-transparent transition-colors border-b border-gray-50">
                        <span className="font-medium text-slate-800">{c.courseCode}</span>
                        <span className="text-slate-500 ml-2">{c.courseName}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Syllabus & Learning Outcomes */}
          <h3 className="text-base font-semibold text-slate-700 mb-4 pb-2 border-b border-gray-100 mt-6">Content</h3>

          <div className="mb-4">
            <label className={labelClass} htmlFor="syllabus">Syllabus</label>
            <textarea
              id="syllabus"
              name="syllabus"
              value={form.syllabus}
              onChange={handleChange}
              rows={4}
              placeholder="Course syllabus details..."
              className={`${inputClass} resize-y`}
            />
          </div>

          <div className="mb-4">
            <label className={labelClass}>Learning Outcomes</label>
            <div className="flex flex-col gap-2">
              {form.learningOutcomes.map((outcome, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium w-6 text-center shrink-0">{idx + 1}.</span>
                  <input
                    type="text"
                    value={outcome}
                    onChange={(e) => handleOutcomeChange(idx, e.target.value)}
                    placeholder={`Learning outcome ${idx + 1}`}
                    className={`${inputClass} text-sm`}
                  />
                  {form.learningOutcomes.length > 1 && (
                    <button type="button" onClick={() => removeOutcome(idx)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors bg-transparent border-none cursor-pointer shrink-0">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addOutcome}
              className="mt-2 inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium bg-transparent border-none cursor-pointer p-0"
            >
              <Plus size={16} />
              Add Outcome
            </button>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 mt-6">
            <button type="button" className={btnSecondaryClass} onClick={onClose}>Cancel</button>
            <button type="submit" className={btnPrimaryClass} disabled={saving}>
              {saving ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  {isEditMode ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                isEditMode ? 'Update Course' : 'Create Course'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CourseModal;
