import React from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Users, Award, CheckCircle, ArrowRight } from 'lucide-react';
import '../styles/Landing.css';

const Landing = () => {
  const navigate = useNavigate();

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
    <div className="landing-page">
      {/* Header/Navigation */}
      <nav className="landing-nav">
        <div className="nav-container">
          <div className="logo">
            <BookOpen size={32} />
            <h2>CampusOne</h2>
          </div>
          <button className="login-btn" onClick={() => navigate('/login')}>
            Login
            <ArrowRight size={18} />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="hero-title">
              Welcome to <span className="gradient-text">CampusOne</span>
            </h1>
            <p className="hero-subtitle">
              The all-in-one platform for modern education management. 
              Empowering students, teachers, and administrators.
            </p>
            <div className="hero-buttons">
              <button className="btn-primary" onClick={() => navigate('/login')}>
                Get Started
              </button>
              <button className="btn-secondary">
                Learn More
              </button>
            </div>
          </div>
          <div className="hero-visual">
            <div className="floating-card card-1">
              <BookOpen size={24} />
              <span>20+ Courses</span>
            </div>
            <div className="floating-card card-2">
              <Users size={24} />
              <span>500+ Students</span>
            </div>
            <div className="floating-card card-3">
              <Award size={24} />
              <span>95% Success Rate</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features-section">
        <div className="section-container">
          <h2 className="section-title">Everything You Need</h2>
          <p className="section-subtitle">
            Powerful features designed to enhance the learning experience
          </p>
          <div className="features-grid">
            {features.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="feature-icon">
                  {feature.icon}
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="benefits-section">
        <div className="section-container">
          <div className="benefits-content">
            <div className="benefits-text">
              <h2 className="section-title">Why Choose CampusOne?</h2>
              <p className="section-subtitle">
                Built for the modern educational ecosystem with cutting-edge technology
              </p>
              <ul className="benefits-list">
                {benefits.map((benefit, index) => (
                  <li key={index}>
                    <CheckCircle size={20} />
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
              <button className="btn-primary" onClick={() => navigate('/login')}>
                Start Your Journey
                <ArrowRight size={18} />
              </button>
            </div>
            <div className="benefits-visual">
              <div className="stats-card">
                <h3>10K+</h3>
                <p>Active Users</p>
              </div>
              <div className="stats-card">
                <h3>99.9%</h3>
                <p>Uptime</p>
              </div>
              <div className="stats-card">
                <h3>24/7</h3>
                <p>Support</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-container">
          <div className="footer-content">
            <div className="footer-brand">
              <BookOpen size={28} />
              <h3>CampusOne</h3>
            </div>
            <p>&copy; 2026 CampusOne. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
