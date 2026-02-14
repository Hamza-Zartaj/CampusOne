// Step definitions
export const STEPS = [
  { title: 'Personal Information', icon: 'UserPlus' },
  { title: 'Father/Guardian Info', icon: 'UserPlus' },
  { title: 'Previous Education', icon: 'FileText' },
  { title: 'Address & Nationality', icon: 'MapPin' },
  { title: 'Program Details', icon: 'FileText' },
  { title: 'Personal Statement', icon: 'FileText' },
  { title: 'Review & Submit', icon: 'CheckCircle' }
];

// Form data default state
export const INITIAL_FORM_DATA = {
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
};

// Education record default state
export const INITIAL_EDUCATION = {
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
};

// File upload configuration
export const FILE_CONFIG = {
  allowedTypes: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'],
  maxSize: 5 * 1024 * 1024, // 5MB
};

// Education levels
export const EDUCATION_LEVELS = [
  'Matric',
  'O-Level',
  'Intermediate',
  'A-Level',
  "Bachelor's",
  "Master's",
  'MPhil',
  'PhD'
];

// Below bachelor's levels (for determining result type)
export const BELOW_BACHELOR_LEVELS = ['Matric', 'O-Level', 'Intermediate', 'A-Level'];

// Result types
export const RESULT_TYPES = {
  PERCENTAGE: 'Percentage',
  MARKS: 'Marks',
  CGPA: 'CGPA'
};

// Gender options
export const GENDER_OPTIONS = [
  'Male',
  'Female',
  'Other',
  'Prefer not to say'
];

// Guardian relation options
export const GUARDIAN_RELATIONS = [
  { value: '', label: 'Select Relation' },
  { value: 'Father', label: 'Father' },
  { value: 'Mother', label: 'Mother' },
  { value: 'Guardian', label: 'Guardian' }
];

// Nationality options
export const NATIONALITY_OPTIONS = [
  'Pakistani',
  'Foreigner'
];

// Tailwind CSS classes
export const TAILWIND_CLASSES = {
  input: "w-full py-3 px-3 border-2 border-gray-200 rounded-lg text-base font-inherit transition-all focus:outline-none focus:border-primary-500 focus:ring-[3px] focus:ring-primary-500/10",
  inputError: "w-full py-3 px-3 border-2 border-red-500 rounded-lg text-base font-inherit transition-all focus:outline-none focus:border-red-500 focus:ring-[3px] focus:ring-red-500/10",
  label: "block font-semibold text-slate-800 mb-2 text-[0.95rem]",
  btnPrimary: "flex items-center gap-2 py-3.5 px-8 bg-gradient-primary text-white border-none rounded-lg font-semibold text-base cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-lg justify-center",
  btnSecondary: "flex items-center gap-2 py-3.5 px-8 bg-white text-slate-500 border-2 border-gray-300 rounded-lg font-semibold text-base cursor-pointer transition-all hover:bg-slate-50 hover:border-gray-400 justify-center"
};

// Programs list (mock data - can be replaced with API call)
export const MOCK_PROGRAMS = [
  { id: 1, name: 'Bachelor of Science in Computer Science' },
  { id: 2, name: 'Bachelor of Business Administration' },
  { id: 3, name: 'Bachelor of Arts in Psychology' },
  { id: 4, name: 'Bachelor of Engineering in Electrical Engineering' },
  { id: 5, name: 'Master of Science in Data Science' },
  { id: 6, name: 'Master of Business Administration' }
];
