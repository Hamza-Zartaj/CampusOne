import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Menu,
  User,
  LogOut,
  ChevronDown
} from 'lucide-react';
import NotificationBell from './NotificationBell';
import { clearAllApiCache } from '../utils/api';
import { disconnectSocket } from '../utils/socket';

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
    clearAllApiCache();
    disconnectSocket();
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
    <header className="sticky top-0 z-100 flex h-[70px] min-w-0 items-center justify-between bg-gradient-primary px-6 text-white shadow-sm max-sm:px-3">
      <div className="flex min-w-0 items-center gap-5 max-sm:gap-2">
        <button 
          className="flex shrink-0 cursor-pointer items-center justify-center rounded-lg border-none bg-transparent p-2 text-white transition-colors hover:bg-white/10 max-sm:p-1.5" 
          onClick={toggleSidebar} 
          aria-label="Toggle Sidebar"
        >
          <Menu size={24} className="max-sm:h-6 max-sm:w-6" />
        </button>
        <div className="min-w-0">
          <h1 className="m-0 truncate text-2xl font-bold tracking-tight max-[380px]:text-xl">CampusOne</h1>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-4 max-sm:gap-1.5">
        <NotificationBell />
        <div className="relative">
          <div 
            className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 transition-colors hover:bg-white/10 max-sm:gap-1.5 max-sm:px-1.5"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/30 bg-gradient-secondary max-sm:h-10 max-sm:w-10">
              {profilePic ? (
                <img src={profilePic} alt={userName} className="w-full h-full object-cover" />
              ) : (
                <div className="text-xl font-semibold text-white max-sm:text-lg">
                  {userName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-0.5 max-md:hidden">
              <span className="text-[15px] font-semibold text-white leading-tight">{userName}</span>
              <span className="text-[13px] text-white/80 leading-tight">{getRoleDisplay(userRole)}</span>
            </div>
            <ChevronDown
              size={20}
              className={`text-white/80 transition-transform duration-300 max-[360px]:hidden ${showDropdown ? 'rotate-180' : ''}`}
            />
          </div>

          {showDropdown && (
            <div className="absolute right-0 top-[calc(100%+8px)] z-100 min-w-50 overflow-hidden rounded-xl bg-white shadow-lg animate-dropdown max-sm:min-w-44">
              <Link 
                to="/profile" 
                className="flex items-center gap-3 py-3 px-4 text-slate-800 no-underline transition-colors hover:bg-slate-100 text-sm"
                onClick={() => setShowDropdown(false)}
              >
                <User size={18} className="text-primary-500" />
                <span>Profile</span>
              </Link>
              <div className="h-px bg-gray-200 my-1"></div>
              <button 
                className="flex items-center gap-3 py-3 px-4 text-slate-800 no-underline transition-colors hover:bg-slate-100 border-none bg-transparent w-full cursor-pointer text-sm"
                onClick={handleLogout}
              >
                <LogOut size={18} className="text-danger" />
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
