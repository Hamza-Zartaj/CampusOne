import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Users, Award, CheckCircle, ArrowRight, UserPlus } from 'lucide-react';
import { admissionAPI } from '../utils/api';
import toast from 'react-hot-toast';

const Landing = () => {
  const navigate = useNavigate();
  const [admissionsOpen, setAdmissionsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAdmissionStatus();
  }, []);

  const checkAdmissionStatus = async () => {
    try {
      const response = await admissionAPI.getSettings();
      setAdmissionsOpen(response.data.data.isOpen);
    } catch (error) {
      console.error('Error checking admission status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApplyClick = async () => {
    // Re-check admission status before navigating
    try {
      const response = await admissionAPI.getSettings();
      if (response.data.data.isOpen) {
        navigate('/apply');
      } else {
        toast.error('Admissions are currently closed. Please check back later.');
        setAdmissionsOpen(false);
      }
    } catch (error) {
      console.error('Error checking admission status:', error);
      toast.error('Unable to check admission status. Please try again.');
    }
  };

  const features = [
    {
      icon: <BookOpen size={40} />,
      title: 'Course Management',
      description: 'Seamlessly manage courses, assignments, and quizzes all in one place'
    },
    {
      icon: <Users size={40} />,
      title: 'Collaborative Learning',
      description: 'Connect with peers, participate in Q&A forums, and engage with TAs'
    },
    {
      icon: <Award size={40} />,
      title: 'Track Progress',
      description: 'Monitor attendance, grades, and academic performance in real-time'
    }
  ];

  const benefits = [
    'Real-time notifications and updates',
    'Intuitive dashboard for all roles',
    'Secure authentication with 2FA',
    'Mobile-responsive design',
    'Advanced reporting and analytics',
    'Seamless communication tools'
  ];

  return (
    <div className="min-h-screen bg-gradient-main relative overflow-x-hidden">
      {/* Header/Navigation */}
      <nav className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md shadow-[0_2px_10px_rgba(0,0,0,0.1)] z-[1000] py-4">
        <div className="max-w-[1200px] mx-auto px-8 flex justify-between items-center max-md:px-4">
          <div className="flex items-center gap-3 text-primary-500 font-bold text-2xl max-md:text-xl">
            <BookOpen size={32} strokeWidth={2.5} />
            <h2 className="m-0">CampusOne</h2>
          </div>
          <div className="flex items-center gap-4 max-md:gap-2 max-md:flex-wrap">
            {!loading && admissionsOpen && (
              <button 
                className="bg-white text-primary-500 border-2 border-white py-3 px-6 rounded-full font-semibold cursor-pointer flex items-center gap-2 transition-all duration-300 text-base hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(255,255,255,0.3)] hover:bg-white/95 max-md:text-sm max-md:py-2.5 max-md:px-5"
                onClick={handleApplyClick}
              >
                <UserPlus size={18} />
                Apply Now
              </button>
            )}
            <button 
              className="bg-gradient-primary text-white border-none py-3 px-6 rounded-full font-semibold cursor-pointer flex items-center gap-2 transition-all duration-300 text-base hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(59,130,246,0.4)] max-md:text-sm max-md:py-2.5 max-md:px-5"
              onClick={() => navigate('/login')}
            >
              Login
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-24 px-8 min-h-screen flex items-center relative max-md:pt-24 max-md:pb-16 max-md:px-4">
        {/* Background decorative elements */}
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_50%,rgba(255,255,255,0.1)_0%,transparent_50%),radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.1)_0%,transparent_50%)]"></div>
        
        <div className="max-w-[1200px] mx-auto grid grid-cols-2 gap-16 items-center relative z-[1] max-lg:grid-cols-1 max-lg:text-center">
          <div className="text-white">
            <h1 className="text-[3.5rem] font-extrabold leading-[1.2] mb-6 max-md:text-[2.5rem] max-sm:text-[2rem]">
              Welcome to <span className="bg-gradient-to-r from-white to-[#f0f0ff] bg-clip-text text-transparent">CampusOne</span>
            </h1>
            <p className="text-xl leading-relaxed mb-10 opacity-95 max-md:text-base">
              The all-in-one platform for modern education management. 
              Empowering students, teachers, and administrators.
            </p>
            <div className="flex gap-4 flex-wrap max-lg:justify-center">
              {!loading && admissionsOpen && (
                <button 
                  className="bg-white text-primary-500 border-none py-4 px-8 rounded-full font-bold text-lg cursor-pointer transition-all duration-300 flex items-center gap-2 shadow-[0_4px_20px_rgba(255,255,255,0.3)] hover:-translate-y-[3px] hover:scale-105 hover:shadow-[0_8px_30px_rgba(255,255,255,0.5)] max-md:w-full max-md:justify-center"
                  onClick={handleApplyClick}
                >
                  <UserPlus size={20} />
                  Apply for Admission
                </button>
              )}
              <button 
                className="bg-white text-primary-500 border-none py-4 px-8 rounded-full font-semibold text-lg cursor-pointer transition-all duration-300 flex items-center gap-2 hover:-translate-y-[3px] hover:shadow-lg"
                onClick={() => navigate('/login')}
              >
                Get Started
              </button>
            </div>
          </div>
          
          {/* Floating Cards - Hidden on mobile */}
          <div className="relative h-[400px] max-lg:hidden">
            <div className="absolute bg-white py-6 px-8 rounded-2xl shadow-lg flex items-center gap-4 animate-float top-[10%] left-[10%]">
              <BookOpen size={24} className="text-primary-500" />
              <span className="font-semibold text-slate-800 text-lg">20+ Courses</span>
            </div>
            <div className="absolute bg-white py-6 px-8 rounded-2xl shadow-lg flex items-center gap-4 animate-float top-[40%] right-[10%]" style={{ animationDelay: '1s' }}>
              <Users size={24} className="text-primary-500" />
              <span className="font-semibold text-slate-800 text-lg">500+ Students</span>
            </div>
            <div className="absolute bg-white py-6 px-8 rounded-2xl shadow-lg flex items-center gap-4 animate-float bottom-[10%] left-[20%]" style={{ animationDelay: '2s' }}>
              <Award size={24} className="text-primary-500" />
              <span className="font-semibold text-slate-800 text-lg">95% Success Rate</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white py-24 px-8 max-md:py-16">
        <div className="max-w-[1200px] mx-auto">
          <h2 className="text-[2.5rem] font-bold text-center text-slate-800 mb-4 max-md:text-[2rem]">
            Everything You Need
          </h2>
          <p className="text-center text-slate-500 text-lg mb-16">
            Powerful features designed to enhance the learning experience
          </p>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-8 max-md:grid-cols-1">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className="bg-slate-50 p-10 rounded-2xl text-center transition-all duration-300 border-2 border-transparent hover:-translate-y-2.5 hover:border-primary-500 hover:shadow-[0_15px_40px_rgba(59,130,246,0.2)]"
              >
                <div className="w-20 h-20 bg-gradient-primary text-white rounded-2xl flex items-center justify-center mx-auto mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-2xl text-slate-800 mb-4">{feature.title}</h3>
                <p className="text-slate-500 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="bg-slate-100 py-24 px-8 max-md:py-16">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-2 gap-16 items-center max-lg:grid-cols-1">
            <div className="text-left max-lg:text-center">
              <h2 className="text-[2.5rem] font-bold text-slate-800 mb-4 max-lg:text-center max-md:text-[2rem]">
                Why Choose CampusOne?
              </h2>
              <p className="text-slate-500 text-lg mb-0 max-lg:text-center">
                Built for the modern educational ecosystem with cutting-edge technology
              </p>
              <ul className="list-none p-0 my-8 max-lg:max-w-[500px] max-lg:mx-auto">
                {benefits.map((benefit, index) => (
                  <li key={index} className="flex items-center gap-4 py-3 text-slate-800 text-lg">
                    <CheckCircle size={20} className="text-primary-500 shrink-0" />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
              <button 
                className="bg-white text-primary-500 border-none py-4 px-8 rounded-full font-semibold text-lg cursor-pointer transition-all duration-300 flex items-center gap-2 hover:-translate-y-[3px] hover:shadow-lg"
                onClick={() => navigate('/login')}
              >
                Start Your Journey
                <ArrowRight size={18} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-6 max-lg:grid-cols-1">
              {[
                { value: '10K+', label: 'Active Users' },
                { value: '99.9%', label: 'Uptime' },
                { value: '24/7', label: 'Support' }
              ].map((stat, index) => (
                <div 
                  key={index}
                  className={`bg-white p-8 rounded-2xl text-center shadow-md transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_10px_30px_rgba(59,130,246,0.2)] ${index === 2 ? 'col-span-full max-lg:col-auto' : ''}`}
                >
                  <h3 className="text-[3rem] text-primary-500 mb-2 font-bold">{stat.value}</h3>
                  <p className="text-slate-500 text-lg">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-[#1a1a2e] text-white py-12 px-8">
        <div className="max-w-[1200px] mx-auto">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <BookOpen size={28} />
              <h3 className="text-2xl font-bold m-0">CampusOne</h3>
            </div>
            <p className="text-white/70">&copy; 2026 CampusOne. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
