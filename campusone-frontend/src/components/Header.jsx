import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Menu, 
  User, 
  LogOut, 
  ChevronDown 
} from 'lucide-react';
import '../styles/Header.css';

const Header = ({ toggleSidebar }) => {
  const navigate = useNavigate();
  const [showDropdown, setShowDropdown] = React.useState(false);
  
  // Get user data from localStorage or context
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userRole = user.role || 'Student';
  const userName = user.name || 'User Name';
  const userEmail = user.email || '';
  const profilePic = user.profilePicture || null;

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const getRoleDisplay = (role) => {
    const roleMap = {
      'admin': 'Administrator',
      'teacher': 'Teacher',
      'student': 'Student',
      'ta': 'Teaching Assistant'
    };
    return roleMap[role?.toLowerCase()] || role;
  };

  return (
    <header className="dashboard-header">
      <div className="header-left">
        <button className="menu-btn" onClick={toggleSidebar} aria-label="Toggle Sidebar">
          <Menu size={24} />
        </button>
        <div className="header-logo">
          <h1>CampusOne</h1>
        </div>
      </div>

      <div className="header-right">
        <div className="user-info-container">
          <div className="user-info" onClick={() => setShowDropdown(!showDropdown)}>
            <div className="user-avatar">
              {profilePic ? (
                <img src={profilePic} alt={userName} />
              ) : (
                <div className="avatar-placeholder">
                  {userName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="user-details">
              <span className="user-name">{userName}</span>
              <span className="user-role">{getRoleDisplay(userRole)}</span>
            </div>
            <ChevronDown size={20} className={`dropdown-icon ${showDropdown ? 'open' : ''}`} />
          </div>

          {showDropdown && (
            <div className="user-dropdown">
              <Link to="/profile" className="dropdown-item" onClick={() => setShowDropdown(false)}>
                <User size={18} />
                <span>Profile</span>
              </Link>
              <div className="dropdown-divider"></div>
              <button className="dropdown-item logout-btn" onClick={handleLogout}>
                <LogOut size={18} />
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
