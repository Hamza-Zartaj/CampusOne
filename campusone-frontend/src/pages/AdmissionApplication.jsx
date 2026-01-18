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
  AlertCircle
} from 'lucide-react';
import '../styles/AdmissionApplication.css';

const AdmissionApplication = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [applicationNumber, setApplicationNumber] = useState('');
  const [programs, setPrograms] = useState([]);
  
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
    previousEducation: {
      highSchool: {
        name: '',
        graduationYear: '',
        gpa: ''
      },
      college: {
        name: '',
        degree: '',
        graduationYear: '',
        gpa: ''
      }
    },
    program: '',
    personalStatement: ''
  });

  useEffect(() => {
    checkAdmissionStatus();
    fetchPrograms();
  }, []);

  const fetchPrograms = async () => {
    // TODO: Replace with actual API call to fetch programs
    // For now, using dummy data
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

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only PDF, JPG, and PNG files are allowed');
      return;
    }

    // Validate file size (max 5MB)
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.fullName || !formData.email || !formData.phone || !formData.cnic || !formData.dateOfBirth || !formData.program) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate Pakistani nationality requires domicile
    if (formData.address.nationality === 'Pakistani' && !formData.address.domicileUpload) {
      toast.error('Domicile upload is required for Pakistani nationals');
      return;
    }
    
    try {
      setSubmitting(true);
      const response = await admissionAPI.submitApplication(formData);
      
      setApplicationNumber(response.data.data.applicationNumber);
      setSubmitted(true);
      toast.success('Application submitted successfully!');
      
      // Scroll to top to show success message
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
      <div className="application-loading">
        <div className="spinner"></div>
        <p>Loading admission form...</p>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="application-success">
        <div className="success-card">
          <CheckCircle size={64} className="success-icon" />
          <h2>Application Submitted Successfully!</h2>
          <p className="application-number">
            Your Application Number: <strong>{applicationNumber}</strong>
          </p>
          <p className="success-message">
            Thank you for applying! We have received your application and will review it shortly. 
            You will receive updates via email at <strong>{formData.email}</strong>.
          </p>
          <p className="next-steps">
            Please save your application number for future reference.
          </p>
          <button className="btn-primary" onClick={() => navigate('/')}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="admission-application">
      <div className="application-header">
        <button className="btn-back" onClick={() => navigate('/')}>
          ← Back to Home
        </button>
        <div className="header-content">
          <UserPlus size={32} />
          <div>
            <h1>Admission Application</h1>
            <p className="header-subtitle">{settings?.instructions}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="application-form">
        {/* Personal Information */}
        <section className="form-section">
          <h2>Personal Information</h2>
          <div className="form-row">
            <div className="form-group required">
              <label>Full Name</label>
              <input
                type="text"
                name="fullName"
                value={formData.fullName}
                onChange={handleChange}
                required
                placeholder="Enter your full name"
              />
            </div>
            <div className="form-group required">
              <label>Date of Birth</label>
              <input
                type="date"
                name="dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group required">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                placeholder="your.email@example.com"
              />
            </div>
            <div className="form-group required">
              <label>Phone Number (Pakistani Format)</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
                placeholder="03XX-XXXXXXX or +92-3XX-XXXXXXX"
                pattern="^(\+92|0)?3[0-9]{2}-?[0-9]{7}$"
                title="Please enter a valid Pakistani phone number (e.g., 0300-1234567)"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group required">
              <label>CNIC Number</label>
              <input
                type="text"
                name="cnic"
                value={formData.cnic}
                onChange={handleChange}
                required
                placeholder="XXXXX-XXXXXXX-X"
                pattern="^[0-9]{5}-[0-9]{7}-[0-9]$"
                title="Please enter CNIC in format: XXXXX-XXXXXXX-X"
              />
            </div>
            <div className="form-group">
              <label>Gender</label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>CNIC Front (PDF, JPG, PNG - Max 5MB)</label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileChange(e, 'cnicFront')}
                className="file-input"
              />
              {formData.cnicFront && (
                <span className="file-name">{formData.cnicFront.name}</span>
              )}
            </div>
            <div className="form-group">
              <label>CNIC Back (PDF, JPG, PNG - Max 5MB)</label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileChange(e, 'cnicBack')}
                className="file-input"
              />
              {formData.cnicBack && (
                <span className="file-name">{formData.cnicBack.name}</span>
              )}
            </div>
          </div>
        </section>

        {/* Father/Guardian Information */}
        <section className="form-section">
          <h2>Father / Guardian Information (Optional)</h2>
          <div className="form-row">
            <div className="form-group">
              <label>Relation</label>
              <select
                name="relation"
                value={formData.fatherGuardian.relation}
                onChange={(e) => handleChange(e, 'fatherGuardian')}
              >
                <option value="">Select Relation</option>
                <option value="Father">Father</option>
                <option value="Mother">Mother</option>
                <option value="Guardian">Guardian</option>
              </select>
            </div>
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                name="name"
                value={formData.fatherGuardian.name}
                onChange={(e) => handleChange(e, 'fatherGuardian')}
                placeholder="Enter name"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                name="phone"
                value={formData.fatherGuardian.phone}
                onChange={(e) => handleChange(e, 'fatherGuardian')}
                placeholder="03XX-XXXXXXX"
                pattern="^(\+92|0)?3[0-9]{2}-?[0-9]{7}$"
              />
            </div>
            <div className="form-group">
              <label>CNIC Number</label>
              <input
                type="text"
                name="cnic"
                value={formData.fatherGuardian.cnic}
                onChange={(e) => handleChange(e, 'fatherGuardian')}
                placeholder="XXXXX-XXXXXXX-X"
                pattern="^[0-9]{5}-[0-9]{7}-[0-9]$"
              />
            </div>
          </div>

          <div className="form-group">
            <label>CNIC Upload (PDF, JPG, PNG - Max 5MB)</label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => handleFileChange(e, 'cnicUpload', 'fatherGuardian')}
              className="file-input"
            />
            {formData.fatherGuardian.cnicUpload && (
              <span className="file-name">{formData.fatherGuardian.cnicUpload.name}</span>
            )}
          </div>
        </section>

        {/* Address */}
        <section className="form-section">
          <h2>
            <MapPin size={20} />
            Address
          </h2>
          <div className="form-group">
            <label className="required-label">Nationality</label>
            <select
              name="nationality"
              value={formData.address.nationality}
              onChange={(e) => handleChange(e, 'address')}
              required
            >
              <option value="Pakistani">Pakistani</option>
              <option value="Foreigner">Foreigner</option>
            </select>
          </div>

          {formData.address.nationality === 'Pakistani' && (
            <div className="form-group required">
              <label>Domicile Upload (PDF, JPG, PNG - Max 5MB)</label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => handleFileChange(e, 'domicileUpload', 'address')}
                className="file-input"
                required
              />
              {formData.address.domicileUpload && (
                <span className="file-name">{formData.address.domicileUpload.name}</span>
              )}
            </div>
          )}

          <div className="form-group">
            <label>Street Address</label>
            <input
              type="text"
              name="street"
              value={formData.address.street}
              onChange={(e) => handleChange(e, 'address')}
              placeholder="123 Main Street"
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>City</label>
              <input
                type="text"
                name="city"
                value={formData.address.city}
                onChange={(e) => handleChange(e, 'address')}
              />
            </div>
            <div className="form-group">
              <label>State/Province</label>
              <input
                type="text"
                name="state"
                value={formData.address.state}
                onChange={(e) => handleChange(e, 'address')}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Country</label>
              <input
                type="text"
                name="country"
                value={formData.address.country}
                onChange={(e) => handleChange(e, 'address')}
              />
            </div>
            <div className="form-group">
              <label>Zip/Postal Code</label>
              <input
                type="text"
                name="zipCode"
                value={formData.address.zipCode}
                onChange={(e) => handleChange(e, 'address')}
              />
            </div>
          </div>
        </section>

        {/* Address */}
        <section className="form-section">
          <h2>
            <MapPin size={20} />
            Address
          </h2>
          <div className="form-group">
            <label>Street Address</label>
            <input
              type="text"
              name="street"
              value={formData.address.street}
              onChange={(e) => handleChange(e, 'address')}
              placeholder="123 Main Street"
            />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>City</label>
              <input
                type="text"
                name="city"
                value={formData.address.city}
                onChange={(e) => handleChange(e, 'address')}
              />
            </div>
            <div className="form-group">
              <label>State/Province</label>
              <input
                type="text"
                name="state"
                value={formData.address.state}
                onChange={(e) => handleChange(e, 'address')}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Country</label>
              <input
                type="text"
                name="country"
                value={formData.address.country}
                onChange={(e) => handleChange(e, 'address')}
              />
            </div>
            <div className="form-group">
              <label>Zip/Postal Code</label>
              <input
                type="text"
                name="zipCode"
                value={formData.address.zipCode}
                onChange={(e) => handleChange(e, 'address')}
              />
            </div>
          </div>
        </section>

        {/* Previous Education */}
        <section className="form-section">
          <h2>Previous Education</h2>
          <h3>High School</h3>
          <div className="form-row">
            <div className="form-group">
              <label>School Name</label>
              <input
                type="text"
                name="name"
                value={formData.previousEducation.highSchool.name}
                onChange={(e) => handleChange(e, 'previousEducation', 'highSchool')}
              />
            </div>
            <div className="form-group">
              <label>Graduation Year</label>
              <input
                type="number"
                name="graduationYear"
                value={formData.previousEducation.highSchool.graduationYear}
                onChange={(e) => handleChange(e, 'previousEducation', 'highSchool')}
                min="1950"
                max="2050"
              />
            </div>
            <div className="form-group">
              <label>GPA</label>
              <input
                type="number"
                name="gpa"
                value={formData.previousEducation.highSchool.gpa}
                onChange={(e) => handleChange(e, 'previousEducation', 'highSchool')}
                step="0.01"
                min="0"
                max="4"
              />
            </div>
          </div>

          <h3>College/University (if applicable)</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Institution Name</label>
              <input
                type="text"
                name="name"
                value={formData.previousEducation.college.name}
                onChange={(e) => handleChange(e, 'previousEducation', 'college')}
              />
            </div>
            <div className="form-group">
              <label>Degree</label>
              <input
                type="text"
                name="degree"
                value={formData.previousEducation.college.degree}
                onChange={(e) => handleChange(e, 'previousEducation', 'college')}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Graduation Year</label>
              <input
                type="number"
                name="graduationYear"
                value={formData.previousEducation.college.graduationYear}
                onChange={(e) => handleChange(e, 'previousEducation', 'college')}
                min="1950"
                max="2050"
              />
            </div>
            <div className="form-group">
              <label>GPA</label>
              <input
                type="number"
                name="gpa"
                value={formData.previousEducation.college.gpa}
                onChange={(e) => handleChange(e, 'previousEducation', 'college')}
                step="0.01"
                min="0"
                max="4"
              />
            </div>
          </div>
        </section>

        {/* Program Selection */}
        <section className="form-section">
          <h2>Program Details</h2>
          <div className="form-group required">
            <label>Desired Program</label>
            <select
              name="program"
              value={formData.program}
              onChange={handleChange}
              required
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

        {/* Personal Statement */}
        <section className="form-section">
          <h2>
            <FileText size={20} />
            Personal Statement
          </h2>
          <div className="form-group">
            <label>Tell us about yourself and why you want to join our institution (max 2000 characters)</label>
            <textarea
              name="personalStatement"
              value={formData.personalStatement}
              onChange={handleChange}
              rows="8"
              maxLength="2000"
              placeholder="Share your goals, interests, and what makes you a great fit..."
            />
            <span className="char-count">{formData.personalStatement.length}/2000</span>
          </div>
        </section>

        {/* Submit Button */}
        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={() => navigate('/')}>
            Cancel
          </button>
          <button type="submit" className="btn-submit" disabled={submitting}>
            {submitting ? (
              <>
                <div className="spinner-small"></div>
                Submitting...
              </>
            ) : (
              <>
                <Send size={18} />
                Submit Application
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default AdmissionApplication;
