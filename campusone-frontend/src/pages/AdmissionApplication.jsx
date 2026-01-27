import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { admissionAPI } from '../utils/api';
import toast from 'react-hot-toast';
import { 
  UserPlus, 
  Calendar, 
  Mail, 
  Phone, 
  MapPin,
  FileText,
  Send,
  CheckCircle,
  AlertCircle,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

const AdmissionApplication = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [applicationNumber, setApplicationNumber] = useState('');
  const [programs, setPrograms] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [maxStepReached, setMaxStepReached] = useState(0);

  const steps = [
    { title: 'Personal Information', icon: UserPlus },
    { title: 'Father/Guardian Info', icon: UserPlus },
    { title: 'Previous Education', icon: FileText },
    { title: 'Address & Nationality', icon: MapPin },
    { title: 'Program Details', icon: FileText },
    { title: 'Personal Statement', icon: FileText },
    { title: 'Review & Submit', icon: CheckCircle }
  ];
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    cnic: '',
    dateOfBirth: '',
    gender: 'Prefer not to say',
    cnicFront: null,
    cnicBack: null,
    fatherGuardian: {
      relation: '',
      name: '',
      phone: '',
      cnic: '',
      cnicUpload: null
    },
    address: {
      street: '',
      city: '',
      state: '',
      country: '',
      zipCode: '',
      nationality: 'Pakistani',
      domicileUpload: null
    },
    educationRecords: [],
    program: '',
    personalStatement: ''
  });

  const [currentEducation, setCurrentEducation] = useState({
    level: '',
    degreeName: '',
    institution: '',
    board: '',
    completionYear: '',
    resultType: '',
    result: '',
    transcript: null,
    country: '',
    remarks: ''
  });

  const [editingIndex, setEditingIndex] = useState(null);
  const [educationErrors, setEducationErrors] = useState({});

  // Reusable Tailwind classes
  const inputClass = "w-full py-3 px-3 border-2 border-gray-200 rounded-lg text-base font-inherit transition-all focus:outline-none focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10";
  const inputErrorClass = "w-full py-3 px-3 border-2 border-red-500 rounded-lg text-base font-inherit transition-all focus:outline-none focus:border-red-500 focus:ring-[3px] focus:ring-red-500/10";
  const labelClass = "block font-semibold text-slate-800 mb-2 text-[0.95rem]";
  const btnPrimaryClass = "flex items-center gap-2 py-3.5 px-8 bg-gradient-primary text-white border-none rounded-lg font-semibold text-base cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg justify-center";
  const btnSecondaryClass = "flex items-center gap-2 py-3.5 px-8 bg-white text-slate-500 border-2 border-gray-300 rounded-lg font-semibold text-base cursor-pointer transition-all hover:bg-slate-50 hover:border-gray-400 justify-center";

  useEffect(() => {
    checkAdmissionStatus();
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    setPrograms([
      { id: 1, name: 'Bachelor of Science in Computer Science' },
      { id: 2, name: 'Bachelor of Business Administration' },
      { id: 3, name: 'Bachelor of Arts in Psychology' },
      { id: 4, name: 'Bachelor of Engineering in Electrical Engineering' },
      { id: 5, name: 'Master of Science in Data Science' },
      { id: 6, name: 'Master of Business Administration' }
    ]);
  };

  const checkAdmissionStatus = async () => {
    try {
      setLoading(true);
      const response = await admissionAPI.getSettings();
      const settingsData = response.data.data;
      
      if (!settingsData.isOpen) {
        toast.error('Admissions are currently closed');
        navigate('/');
        return;
      }
      
      setSettings(settingsData);
    } catch (error) {
      console.error('Error checking admission status:', error);
      toast.error('Unable to load admission information');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e, section = null, subsection = null) => {
    const { name, value } = e.target;
    
    if (section && subsection) {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [subsection]: {
            ...prev[section][subsection],
            [name]: value
          }
        }
      }));
    } else if (section) {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [name]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleFileChange = (e, fieldName, section = null) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only PDF, JPG, and PNG files are allowed');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    if (section) {
      setFormData(prev => ({
        ...prev,
        [section]: {
          ...prev[section],
          [fieldName]: file
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [fieldName]: file
      }));
    }
  };

  const handleEducationChange = (e) => {
    const { name, value } = e.target;
    setCurrentEducation(prev => ({
      ...prev,
      [name]: value
    }));

    if (educationErrors[name]) {
      setEducationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }

    if (name === 'level') {
      const belowBachelors = ['Matric', 'O-Level', 'Intermediate', 'A-Level'];
      if (belowBachelors.includes(value)) {
        setCurrentEducation(prev => ({ ...prev, resultType: 'Percentage' }));
      } else if (value) {
        setCurrentEducation(prev => ({ ...prev, resultType: 'CGPA' }));
      }
    }
  };

  const handleEducationFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only PDF, JPG, and PNG files are allowed');
      e.target.value = '';
      return;
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('File size must be less than 5MB');
      e.target.value = '';
      return;
    }

    setCurrentEducation(prev => ({ ...prev, transcript: file }));
  };

  const validateEducation = () => {
    const errors = {};
    if (!currentEducation.level) errors.level = 'Education level is required';
    if (!currentEducation.degreeName) errors.degreeName = 'Degree/Program name is required';
    if (!currentEducation.institution) errors.institution = 'Institution name is required';
    if (!currentEducation.board) errors.board = 'Board/University is required';
    if (!currentEducation.completionYear) errors.completionYear = 'Completion year is required';
    if (!currentEducation.resultType) errors.resultType = 'Result type is required';
    if (!currentEducation.result) errors.result = 'Result is required';
    if (!currentEducation.transcript) errors.transcript = 'Transcript upload is required';

    setEducationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const addEducation = () => {
    if (!validateEducation()) {
      toast.error('Please fill in all required education fields');
      return;
    }

    if (editingIndex !== null) {
      const updated = [...formData.educationRecords];
      updated[editingIndex] = currentEducation;
      setFormData(prev => ({ ...prev, educationRecords: updated }));
      toast.success('Education record updated');
      setEditingIndex(null);
    } else {
      setFormData(prev => ({
        ...prev,
        educationRecords: [...prev.educationRecords, currentEducation]
      }));
      toast.success('Education record added');
    }

    setCurrentEducation({
      level: '',
      degreeName: '',
      institution: '',
      board: '',
      completionYear: '',
      resultType: '',
      result: '',
      transcript: null,
      country: '',
      remarks: ''
    });
    setEducationErrors({});
  };

  const editEducation = (index) => {
    setCurrentEducation(formData.educationRecords[index]);
    setEditingIndex(index);
    const section = document.getElementById('education-form-section');
    if (section) {
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const deleteEducation = (index) => {
    if (window.confirm('Are you sure you want to delete this education record?')) {
      const updated = formData.educationRecords.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, educationRecords: updated }));
      toast.success('Education record deleted');
      
      if (editingIndex === index) {
        setCurrentEducation({
          level: '',
          degreeName: '',
          institution: '',
          board: '',
          completionYear: '',
          resultType: '',
          result: '',
          transcript: null,
          country: '',
          remarks: ''
        });
        setEditingIndex(null);
      }
    }
  };

  const cancelEditEducation = () => {
    setCurrentEducation({
      level: '',
      degreeName: '',
      institution: '',
      board: '',
      completionYear: '',
      resultType: '',
      result: '',
      transcript: null,
      country: '',
      remarks: ''
    });
    setEditingIndex(null);
    setEducationErrors({});
  };

  const validateStep = (step) => {
    switch (step) {
      case 0:
        if (!formData.fullName || !formData.email || !formData.phone || !formData.cnic || !formData.dateOfBirth) {
          toast.error('Please fill in all required personal information fields');
          return false;
        }
        return true;
      case 1:
        return true;
      case 2:
        if (formData.educationRecords.length === 0) {
          toast.error('Please add at least one education record');
          return false;
        }
        return true;
      case 3:
        if (formData.address.nationality === 'Pakistani' && !formData.address.domicileUpload) {
          toast.error('Domicile upload is required for Pakistani nationals');
          return false;
        }
        return true;
      case 4:
        if (!formData.program) {
          toast.error('Please select a program');
          return false;
        }
        return true;
      case 5:
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      const newStep = Math.min(currentStep + 1, steps.length - 1);
      setCurrentStep(newStep);
      setMaxStepReached(prev => Math.max(prev, newStep));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToStep = (stepIndex) => {
    if (stepIndex <= maxStepReached) {
      setCurrentStep(stepIndex);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleSubmit = async () => {
    if (!formData.fullName || !formData.email || !formData.phone || !formData.cnic || !formData.dateOfBirth || !formData.program) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (formData.address.nationality === 'Pakistani' && !formData.address.domicileUpload) {
      toast.error('Domicile upload is required for Pakistani nationals');
      return;
    }

    if (formData.educationRecords.length === 0) {
      toast.error('Please add at least one education record');
      return;
    }
    
    try {
      setSubmitting(true);
      const response = await admissionAPI.submitApplication(formData);
      
      setApplicationNumber(response.data.data.applicationNumber);
      setSubmitted(true);
      toast.success('Application submitted successfully!');
      
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      console.error('Error submitting application:', error);
      toast.error(error.response?.data?.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <div className="w-12 h-12 border-4 border-gray-200 border-t-primary-500 rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-500">Loading admission form...</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8">
        <div className="bg-white rounded-xl p-12 shadow-lg max-w-[600px] mx-auto max-md:p-6">
          <CheckCircle size={64} className="text-success mb-6 mx-auto" />
          <h2 className="text-slate-800 mb-4 text-[2rem] font-bold max-md:text-2xl">Application Submitted Successfully!</h2>
          <p className="bg-slate-100 p-4 rounded-lg my-6 text-lg">
            Your Application Number: <strong className="text-primary-500 text-xl">{applicationNumber}</strong>
          </p>
          <p className="text-slate-500 leading-relaxed mb-4">
            Thank you for applying! We have received your application and will review it shortly. 
            You will receive updates via email at <strong>{formData.email}</strong>.
          </p>
          <p className="text-slate-400 text-sm mb-8">
            Please save your application number for future reference.
          </p>
          <button className={btnPrimaryClass} onClick={() => navigate('/')}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto p-8 max-md:p-4">
      {/* Header */}
      <div className="mb-8">
        <button 
          className="bg-transparent border-none text-primary-500 text-base font-semibold cursor-pointer py-2 mb-4 inline-flex items-center gap-2 transition-all hover:text-primary-700 hover:-translate-x-1"
          onClick={() => navigate('/')}
        >
          ← Back to Home
        </button>
        <div className="flex items-center gap-4 pb-6 border-b-2 border-gray-200">
          <UserPlus size={32} className="text-primary-500 shrink-0" />
          <div>
            <h1 className="m-0 text-[2rem] text-slate-800 font-bold max-md:text-2xl">Admission Application</h1>
            <p className="text-slate-500 mt-2 mb-0 text-base">{settings?.instructions}</p>
          </div>
        </div>
      </div>

      {/* Step Indicator */}
      <div className="flex justify-between my-8 px-4 relative max-md:overflow-x-auto max-md:pb-4">
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-gray-200 z-0"></div>
        {steps.map((step, index) => (
          <div 
            key={index} 
            className={`flex flex-col items-center gap-2 relative z-10 flex-1 transition-all max-md:min-w-[80px] ${
              index <= maxStepReached ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
            }`}
            onClick={() => goToStep(index)}
          >
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all max-md:w-[35px] max-md:h-[35px] ${
              index === currentStep 
                ? 'bg-gradient-primary border-2 border-primary-500 text-white scale-110' 
                : index < currentStep 
                  ? 'bg-primary-500 border-2 border-primary-500 text-white'
                  : 'bg-white border-2 border-gray-300 text-slate-500'
            }`}>
              {index < currentStep ? <CheckCircle size={20} /> : index + 1}
            </div>
            <div className={`text-xs font-medium text-center max-w-[100px] max-md:text-[0.65rem] max-md:max-w-[80px] ${
              index === currentStep 
                ? 'text-primary-500 font-semibold' 
                : index < currentStep 
                  ? 'text-primary-500'
                  : 'text-slate-500'
            }`}>
              {step.title}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl p-8 shadow-md max-md:p-6">
        {/* Step 0: Personal Information */}
        {currentStep === 0 && (
          <section className="mb-8 pb-6 border-b border-gray-200">
            <h2 className="text-slate-800 text-2xl m-0 mb-6 flex items-center gap-2">Personal Information</h2>
            <div className="grid grid-cols-3 gap-6 mb-6 max-md:grid-cols-1">
              <div className="flex flex-col">
                <label className={labelClass}>Full Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  placeholder="Enter your full name"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col">
                <label className={labelClass}>Date of Birth <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  name="dateOfBirth"
                  value={formData.dateOfBirth}
                  onChange={handleChange}
                  required
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col">
                <label className={labelClass}>Gender</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className={inputClass}
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6 mb-6">
              <div className="flex flex-col">
                <label className={labelClass}>Email <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="your.email@example.com"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col">
                <label className={labelClass}>Phone Number <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  placeholder="03XX-XXXXXXX"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col">
                <label className={labelClass}>CNIC Number <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  name="cnic"
                  value={formData.cnic}
                  onChange={handleChange}
                  required
                  placeholder="XXXXX-XXXXXXX-X"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6">
              <div className="flex flex-col">
                <label className={labelClass}>CNIC Front (PDF, JPG, PNG - Max 5MB)</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange(e, 'cnicFront')}
                  className={`${inputClass} cursor-pointer p-2.5`}
                />
                {formData.cnicFront && (
                  <span className="block mt-2 text-sm text-slate-500 italic">{formData.cnicFront.name}</span>
                )}
              </div>
              <div className="flex flex-col">
                <label className={labelClass}>CNIC Back (PDF, JPG, PNG - Max 5MB)</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => handleFileChange(e, 'cnicBack')}
                  className={`${inputClass} cursor-pointer p-2.5`}
                />
                {formData.cnicBack && (
                  <span className="block mt-2 text-sm text-slate-500 italic">{formData.cnicBack.name}</span>
                )}
              </div>
            </div>
          </section>
        )}

        {/* Step 1: Father/Guardian Information */}
        {currentStep === 1 && (
          <section className="mb-8 pb-6 border-b border-gray-200">
            <h2 className="text-slate-800 text-2xl m-0 mb-6 flex items-center gap-2">Father / Guardian Information</h2>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6 mb-6">
              <div className="flex flex-col">
                <label className={labelClass}>Relation</label>
                <select
                  name="relation"
                  value={formData.fatherGuardian.relation}
                  onChange={(e) => handleChange(e, 'fatherGuardian')}
                  className={inputClass}
                >
                  <option value="">Select Relation</option>
                  <option value="Father">Father</option>
                  <option value="Mother">Mother</option>
                  <option value="Guardian">Guardian</option>
                </select>
              </div>
              <div className="flex flex-col">
                <label className={labelClass}>Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.fatherGuardian.name}
                  onChange={(e) => handleChange(e, 'fatherGuardian')}
                  placeholder="Enter name"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6 mb-6">
              <div className="flex flex-col">
                <label className={labelClass}>Phone Number</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.fatherGuardian.phone}
                  onChange={(e) => handleChange(e, 'fatherGuardian')}
                  placeholder="03XX-XXXXXXX"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col">
                <label className={labelClass}>CNIC Number</label>
                <input
                  type="text"
                  name="cnic"
                  value={formData.fatherGuardian.cnic}
                  onChange={(e) => handleChange(e, 'fatherGuardian')}
                  placeholder="XXXXX-XXXXXXX-X"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="flex flex-col">
              <label className={labelClass}>CNIC Upload (PDF, JPG, PNG - Max 5MB)</label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileChange(e, 'cnicUpload', 'fatherGuardian')}
                className={`${inputClass} cursor-pointer p-2.5`}
              />
              {formData.fatherGuardian.cnicUpload && (
                <span className="block mt-2 text-sm text-slate-500 italic">{formData.fatherGuardian.cnicUpload.name}</span>
              )}
            </div>
          </section>
        )}

        {/* Step 2: Previous Education */}
        {currentStep === 2 && (
          <section className="mb-8 pb-6 border-b border-gray-200" id="education-form-section">
            <h2 className="text-slate-800 text-2xl m-0 mb-6 flex items-center gap-2">Previous Education</h2>
            <p className="text-slate-500 mb-6 text-[0.95rem]">
              Add your academic history below. You can add multiple education records (Matric, Intermediate, Bachelor's, Master's, etc.)
            </p>

            {/* Education Entry Form */}
            <div className="p-6 rounded-lg mb-8 border border-gray-200">
              <h3 className="m-0 mb-6 text-slate-800 text-lg font-semibold">
                {editingIndex !== null ? 'Edit Education Record' : 'Add Education Record'}
              </h3>
              
              <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6 mb-6">
                <div className="flex flex-col">
                  <label className={labelClass}>Education Level <span className="text-red-500">*</span></label>
                  <select
                    name="level"
                    value={currentEducation.level}
                    onChange={handleEducationChange}
                    className={educationErrors.level ? inputErrorClass : inputClass}
                  >
                    <option value="">Select Level</option>
                    <option value="Matric">Matric</option>
                    <option value="O-Level">O-Level</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="A-Level">A-Level</option>
                    <option value="Bachelor's">Bachelor's</option>
                    <option value="Master's">Master's</option>
                    <option value="MPhil">MPhil</option>
                    <option value="PhD">PhD</option>
                  </select>
                  {educationErrors.level && <span className="block text-red-500 text-sm mt-1">{educationErrors.level}</span>}
                </div>

                <div className="flex flex-col">
                  <label className={labelClass}>Degree / Program Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="degreeName"
                    value={currentEducation.degreeName}
                    onChange={handleEducationChange}
                    placeholder="e.g., BS Computer Science, SSC Science"
                    className={educationErrors.degreeName ? inputErrorClass : inputClass}
                  />
                  {educationErrors.degreeName && <span className="block text-red-500 text-sm mt-1">{educationErrors.degreeName}</span>}
                </div>
              </div>

              <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6 mb-6">
                <div className="flex flex-col">
                  <label className={labelClass}>School / Institute / College / University Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="institution"
                    value={currentEducation.institution}
                    onChange={handleEducationChange}
                    placeholder="Institution name"
                    className={educationErrors.institution ? inputErrorClass : inputClass}
                  />
                  {educationErrors.institution && <span className="block text-red-500 text-sm mt-1">{educationErrors.institution}</span>}
                </div>

                <div className="flex flex-col">
                  <label className={labelClass}>Board / University <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="board"
                    value={currentEducation.board}
                    onChange={handleEducationChange}
                    placeholder="e.g., FBISE, University of Punjab"
                    className={educationErrors.board ? inputErrorClass : inputClass}
                  />
                  {educationErrors.board && <span className="block text-red-500 text-sm mt-1">{educationErrors.board}</span>}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-6 mb-6 max-md:grid-cols-1">
                <div className="flex flex-col">
                  <label className={labelClass}>Graduation / Completion Year <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    name="completionYear"
                    value={currentEducation.completionYear}
                    onChange={handleEducationChange}
                    placeholder="2020"
                    min="1950"
                    max="2050"
                    className={educationErrors.completionYear ? inputErrorClass : inputClass}
                  />
                  {educationErrors.completionYear && <span className="block text-red-500 text-sm mt-1">{educationErrors.completionYear}</span>}
                </div>

                <div className="flex flex-col">
                  <label className={labelClass}>Result Type <span className="text-red-500">*</span></label>
                  <select
                    name="resultType"
                    value={currentEducation.resultType}
                    onChange={handleEducationChange}
                    disabled={!currentEducation.level}
                    className={educationErrors.resultType ? inputErrorClass : inputClass}
                  >
                    <option value="">Select Result Type</option>
                    {['Matric', 'O-Level', 'Intermediate', 'A-Level'].includes(currentEducation.level) ? (
                      <>
                        <option value="Percentage">Percentage</option>
                        <option value="Marks">Marks</option>
                      </>
                    ) : (
                      <option value="CGPA">CGPA</option>
                    )}
                  </select>
                  {educationErrors.resultType && <span className="block text-red-500 text-sm mt-1">{educationErrors.resultType}</span>}
                </div>

                <div className="flex flex-col">
                  <label className={labelClass}>Result <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="result"
                    value={currentEducation.result}
                    onChange={handleEducationChange}
                    placeholder={
                      currentEducation.resultType === 'CGPA' ? 'e.g., 3.5' :
                      currentEducation.resultType === 'Percentage' ? 'e.g., 85%' :
                      currentEducation.resultType === 'Marks' ? 'e.g., 850/1100' :
                      'Enter result'
                    }
                    className={educationErrors.result ? inputErrorClass : inputClass}
                  />
                  {educationErrors.result && <span className="block text-red-500 text-sm mt-1">{educationErrors.result}</span>}
                </div>
              </div>

              <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6 mb-6">
                <div className="flex flex-col">
                  <label className={labelClass}>Transcript Upload <span className="text-red-500">*</span></label>
                  <input
                    type="file"
                    name="transcript"
                    onChange={handleEducationFileChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                    className={`${educationErrors.transcript ? inputErrorClass : inputClass} cursor-pointer p-2.5`}
                  />
                  {currentEducation.transcript && (
                    <span className="block mt-2 text-sm text-slate-500 italic">Selected: {currentEducation.transcript.name}</span>
                  )}
                  {educationErrors.transcript && <span className="block text-red-500 text-sm mt-1">{educationErrors.transcript}</span>}
                </div>
              </div>

              <div className="flex gap-4 justify-end mt-6 max-md:flex-col">
                {editingIndex !== null && (
                  <button 
                    type="button" 
                    className={`${btnSecondaryClass} max-md:w-full`}
                    onClick={cancelEditEducation}
                  >
                    Cancel Edit
                  </button>
                )}
                <button 
                  type="button" 
                  className={`${btnPrimaryClass} max-md:w-full`}
                  onClick={addEducation}
                >
                  {editingIndex !== null ? 'Update Education' : 'Add Education'}
                </button>
              </div>
            </div>

            {/* Education Records Table */}
            {formData.educationRecords.length > 0 && (
              <div className="mt-8">
                <h3 className="m-0 mb-4 text-slate-800 text-lg font-semibold">
                  Added Education Records ({formData.educationRecords.length})
                </h3>
                <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
                  <table className="w-full border-collapse min-w-[800px]">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="py-3.5 px-4 text-left font-semibold text-slate-800 text-sm border-b-2 border-gray-300">Level</th>
                        <th className="py-3.5 px-4 text-left font-semibold text-slate-800 text-sm border-b-2 border-gray-300">Degree/Program</th>
                        <th className="py-3.5 px-4 text-left font-semibold text-slate-800 text-sm border-b-2 border-gray-300">Institution</th>
                        <th className="py-3.5 px-4 text-left font-semibold text-slate-800 text-sm border-b-2 border-gray-300">Board/University</th>
                        <th className="py-3.5 px-4 text-left font-semibold text-slate-800 text-sm border-b-2 border-gray-300">Year</th>
                        <th className="py-3.5 px-4 text-left font-semibold text-slate-800 text-sm border-b-2 border-gray-300">Result</th>
                        <th className="py-3.5 px-4 text-left font-semibold text-slate-800 text-sm border-b-2 border-gray-300">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formData.educationRecords.map((edu, index) => (
                        <tr key={index} className="hover:bg-slate-50 transition-colors">
                          <td className="py-4 px-4 border-b border-gray-200 text-slate-500 text-sm">{edu.level}</td>
                          <td className="py-4 px-4 border-b border-gray-200 text-slate-500 text-sm">{edu.degreeName}</td>
                          <td className="py-4 px-4 border-b border-gray-200 text-slate-500 text-sm">{edu.institution}</td>
                          <td className="py-4 px-4 border-b border-gray-200 text-slate-500 text-sm">{edu.board}</td>
                          <td className="py-4 px-4 border-b border-gray-200 text-slate-500 text-sm">{edu.completionYear}</td>
                          <td className="py-4 px-4 border-b border-gray-200 text-slate-500 text-sm">{edu.result} ({edu.resultType})</td>
                          <td className="py-4 px-4 border-b border-gray-200 text-slate-500 text-sm">
                            <div className="flex gap-2 max-md:flex-col max-md:gap-1">
                              <button
                                type="button"
                                className="py-2 px-4 border-none rounded-lg text-sm font-medium cursor-pointer transition-all bg-primary-500 text-white hover:bg-primary-700 max-md:w-full max-md:py-2"
                                onClick={() => editEducation(index)}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="py-2 px-4 border-none rounded-lg text-sm font-medium cursor-pointer transition-all bg-red-500 text-white hover:opacity-90 max-md:w-full max-md:py-2"
                                onClick={() => deleteEducation(index)}
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Step 3: Address & Nationality */}
        {currentStep === 3 && (
          <section className="mb-8 pb-6 border-b border-gray-200">
            <h2 className="text-slate-800 text-2xl m-0 mb-6 flex items-center gap-2">
              <MapPin size={20} />
              Address
            </h2>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6 mb-6">
              <div className="flex flex-col">
                <label className={labelClass}>Nationality <span className="text-red-500">*</span></label>
                <select
                  name="nationality"
                  value={formData.address.nationality}
                  onChange={(e) => handleChange(e, 'address')}
                  required
                  className={inputClass}
                >
                  <option value="Pakistani">Pakistani</option>
                  <option value="Foreigner">Foreigner</option>
                </select>
              </div>

              {formData.address.nationality === 'Pakistani' && (
                <div className="flex flex-col">
                  <label className={labelClass}>Domicile Upload (PDF, JPG, PNG - Max 5MB) <span className="text-red-500">*</span></label>
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => handleFileChange(e, 'domicileUpload', 'address')}
                    className={`${inputClass} cursor-pointer p-2.5`}
                    required
                  />
                  {formData.address.domicileUpload && (
                    <span className="block mt-2 text-sm text-slate-500 italic">{formData.address.domicileUpload.name}</span>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6 mb-6">
              <div className="flex flex-col">
                <label className={labelClass}>Street Address</label>
                <input
                  type="text"
                  name="street"
                  value={formData.address.street}
                  onChange={(e) => handleChange(e, 'address')}
                  placeholder="123 Main Street"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col">
                <label className={labelClass}>Zip/Postal Code</label>
                <input
                  type="text"
                  name="zipCode"
                  value={formData.address.zipCode}
                  onChange={(e) => handleChange(e, 'address')}
                  className={inputClass}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-6 max-md:grid-cols-1">
              <div className="flex flex-col">
                <label className={labelClass}>City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.address.city}
                  onChange={(e) => handleChange(e, 'address')}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col">
                <label className={labelClass}>State/Province</label>
                <input
                  type="text"
                  name="state"
                  value={formData.address.state}
                  onChange={(e) => handleChange(e, 'address')}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col">
                <label className={labelClass}>Country</label>
                <input
                  type="text"
                  name="country"
                  value={formData.address.country}
                  onChange={(e) => handleChange(e, 'address')}
                  className={inputClass}
                />
              </div>
            </div>
          </section>
        )}

        {/* Step 4: Program Selection */}
        {currentStep === 4 && (
          <section className="mb-8 pb-6 border-b border-gray-200">
            <h2 className="text-slate-800 text-2xl m-0 mb-6 flex items-center gap-2">Program Details</h2>
            <div className="flex flex-col">
              <label className={labelClass}>Desired Program <span className="text-red-500">*</span></label>
              <select
                name="program"
                value={formData.program}
                onChange={handleChange}
                required
                className={inputClass}
              >
                <option value="">Select a Program</option>
                {programs.map((program) => (
                  <option key={program.id} value={program.name}>
                    {program.name}
                  </option>
                ))}
              </select>
            </div>
          </section>
        )}

        {/* Step 5: Personal Statement */}
        {currentStep === 5 && (
          <section className="mb-8 pb-6 border-b border-gray-200">
            <h2 className="text-slate-800 text-2xl m-0 mb-6 flex items-center gap-2">
              <FileText size={20} />
              Personal Statement
            </h2>
            <div className="flex flex-col">
              <label className={labelClass}>Tell us about yourself and why you want to join our institution (max 2000 characters)</label>
              <textarea
                name="personalStatement"
                value={formData.personalStatement}
                onChange={handleChange}
                rows="4"
                maxLength="2000"
                placeholder="Share your goals, interests, and what makes you a great fit..."
                className={`${inputClass} resize-y min-h-[120px]`}
              />
              <span className="text-sm text-slate-400 text-right mt-1">{formData.personalStatement.length}/2000</span>
            </div>
          </section>
        )}

        {/* Step 6: Review & Submit */}
        {currentStep === 6 && (
          <section className="mb-8 pb-6 border-b border-gray-200">
            <h2 className="text-slate-800 text-2xl m-0 mb-6 flex items-center gap-2">Review Your Application</h2>
            
            <div className="mb-8 p-6 bg-slate-50 rounded-lg border border-gray-200">
              <h3 className="text-slate-800 text-xl m-0 mb-4 pb-3 border-b-2 border-gray-300">Personal Information</h3>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
                <div className="p-3 bg-white rounded-lg text-[0.95rem] text-slate-500"><strong className="text-slate-800 block mb-1 text-sm">Full Name:</strong> {formData.fullName}</div>
                <div className="p-3 bg-white rounded-lg text-[0.95rem] text-slate-500"><strong className="text-slate-800 block mb-1 text-sm">Date of Birth:</strong> {formData.dateOfBirth}</div>
                <div className="p-3 bg-white rounded-lg text-[0.95rem] text-slate-500"><strong className="text-slate-800 block mb-1 text-sm">Gender:</strong> {formData.gender}</div>
                <div className="p-3 bg-white rounded-lg text-[0.95rem] text-slate-500"><strong className="text-slate-800 block mb-1 text-sm">Email:</strong> {formData.email}</div>
                <div className="p-3 bg-white rounded-lg text-[0.95rem] text-slate-500"><strong className="text-slate-800 block mb-1 text-sm">Phone:</strong> {formData.phone}</div>
                <div className="p-3 bg-white rounded-lg text-[0.95rem] text-slate-500"><strong className="text-slate-800 block mb-1 text-sm">CNIC:</strong> {formData.cnic}</div>
                <div className="p-3 bg-white rounded-lg text-[0.95rem] text-slate-500"><strong className="text-slate-800 block mb-1 text-sm">CNIC Front:</strong> {formData.cnicFront?.name || 'Not uploaded'}</div>
                <div className="p-3 bg-white rounded-lg text-[0.95rem] text-slate-500"><strong className="text-slate-800 block mb-1 text-sm">CNIC Back:</strong> {formData.cnicBack?.name || 'Not uploaded'}</div>
              </div>
            </div>

            {(formData.fatherGuardian.name || formData.fatherGuardian.relation) && (
              <div className="mb-8 p-6 bg-slate-50 rounded-lg border border-gray-200">
                <h3 className="text-slate-800 text-xl m-0 mb-4 pb-3 border-b-2 border-gray-300">Father/Guardian Information</h3>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
                  {formData.fatherGuardian.relation && <div className="p-3 bg-white rounded-lg text-[0.95rem] text-slate-500"><strong className="text-slate-800 block mb-1 text-sm">Relation:</strong> {formData.fatherGuardian.relation}</div>}
                  {formData.fatherGuardian.name && <div className="p-3 bg-white rounded-lg text-[0.95rem] text-slate-500"><strong className="text-slate-800 block mb-1 text-sm">Name:</strong> {formData.fatherGuardian.name}</div>}
                  {formData.fatherGuardian.phone && <div className="p-3 bg-white rounded-lg text-[0.95rem] text-slate-500"><strong className="text-slate-800 block mb-1 text-sm">Phone:</strong> {formData.fatherGuardian.phone}</div>}
                  {formData.fatherGuardian.cnic && <div className="p-3 bg-white rounded-lg text-[0.95rem] text-slate-500"><strong className="text-slate-800 block mb-1 text-sm">CNIC:</strong> {formData.fatherGuardian.cnic}</div>}
                </div>
              </div>
            )}

            <div className="mb-8 p-6 bg-slate-50 rounded-lg border border-gray-200">
              <h3 className="text-slate-800 text-xl m-0 mb-4 pb-3 border-b-2 border-gray-300">Previous Education</h3>
              {formData.educationRecords.map((edu, index) => (
                <div key={index} className="mb-6 p-4 bg-white rounded-lg border border-gray-200 last:mb-0">
                  <h4 className="text-primary-500 text-base m-0 mb-3 font-semibold">{edu.level} - {edu.degreeName}</h4>
                  <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
                    <div className="p-3 bg-white rounded-lg text-[0.95rem] text-slate-500"><strong className="text-slate-800 block mb-1 text-sm">Institution:</strong> {edu.institution}</div>
                    <div className="p-3 bg-white rounded-lg text-[0.95rem] text-slate-500"><strong className="text-slate-800 block mb-1 text-sm">Board/University:</strong> {edu.board}</div>
                    <div className="p-3 bg-white rounded-lg text-[0.95rem] text-slate-500"><strong className="text-slate-800 block mb-1 text-sm">Year:</strong> {edu.completionYear}</div>
                    <div className="p-3 bg-white rounded-lg text-[0.95rem] text-slate-500"><strong className="text-slate-800 block mb-1 text-sm">Result:</strong> {edu.result} ({edu.resultType})</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mb-8 p-6 bg-slate-50 rounded-lg border border-gray-200">
              <h3 className="text-slate-800 text-xl m-0 mb-4 pb-3 border-b-2 border-gray-300">Address & Nationality</h3>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
                <div className="p-3 bg-white rounded-lg text-[0.95rem] text-slate-500"><strong className="text-slate-800 block mb-1 text-sm">Nationality:</strong> {formData.address.nationality}</div>
                {formData.address.street && <div className="p-3 bg-white rounded-lg text-[0.95rem] text-slate-500"><strong className="text-slate-800 block mb-1 text-sm">Street:</strong> {formData.address.street}</div>}
                {formData.address.city && <div className="p-3 bg-white rounded-lg text-[0.95rem] text-slate-500"><strong className="text-slate-800 block mb-1 text-sm">City:</strong> {formData.address.city}</div>}
                {formData.address.state && <div className="p-3 bg-white rounded-lg text-[0.95rem] text-slate-500"><strong className="text-slate-800 block mb-1 text-sm">State/Province:</strong> {formData.address.state}</div>}
                {formData.address.country && <div className="p-3 bg-white rounded-lg text-[0.95rem] text-slate-500"><strong className="text-slate-800 block mb-1 text-sm">Country:</strong> {formData.address.country}</div>}
                {formData.address.zipCode && <div className="p-3 bg-white rounded-lg text-[0.95rem] text-slate-500"><strong className="text-slate-800 block mb-1 text-sm">Zip Code:</strong> {formData.address.zipCode}</div>}
              </div>
            </div>

            <div className="mb-8 p-6 bg-slate-50 rounded-lg border border-gray-200">
              <h3 className="text-slate-800 text-xl m-0 mb-4 pb-3 border-b-2 border-gray-300">Program Details</h3>
              <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-4">
                <div className="p-3 bg-white rounded-lg text-[0.95rem] text-slate-500"><strong className="text-slate-800 block mb-1 text-sm">Selected Program:</strong> {formData.program}</div>
              </div>
            </div>

            {formData.personalStatement && (
              <div className="mb-8 p-6 bg-slate-50 rounded-lg border border-gray-200">
                <h3 className="text-slate-800 text-xl m-0 mb-4 pb-3 border-b-2 border-gray-300">Personal Statement</h3>
                <p className="p-4 bg-white rounded-lg text-slate-500 leading-relaxed whitespace-pre-wrap">{formData.personalStatement}</p>
              </div>
            )}
          </section>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between gap-4 mt-8 pt-8 border-t-2 border-gray-200 max-md:flex-col">
          {currentStep > 0 && (
            <button type="button" className={`${btnSecondaryClass} max-md:w-full`} onClick={prevStep}>
              <ChevronLeft size={18} />
              Previous
            </button>
          )}
          
          {currentStep < steps.length - 1 ? (
            <button 
              type="button" 
              className={`${btnPrimaryClass} ${currentStep === 0 ? 'ml-auto' : ''} max-md:w-full`}
              onClick={nextStep}
            >
              Next
              <ChevronRight size={18} />
            </button>
          ) : (
            <button 
              type="button" 
              className={`${btnPrimaryClass} min-w-[200px] max-md:w-full disabled:opacity-60 disabled:cursor-not-allowed`}
              disabled={submitting} 
              onClick={handleSubmit}
            >
              {submitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <Send size={18} />
                  Submit Application
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdmissionApplication;
