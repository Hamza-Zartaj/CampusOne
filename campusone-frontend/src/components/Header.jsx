import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Menu, 
  User, 
  LogOut, 
  ChevronDown 
} from 'lucide-react';

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
    <header className="flex justify-between items-center h-[70px] bg-gradient-primary text-white px-6 shadow-sm sticky top-0 z-[100]">
      <div className="flex items-center gap-5">
        <button 
          className="bg-transparent border-none text-white cursor-pointer p-2 rounded-lg flex items-center justify-center transition-colors hover:bg-white/10" 
          onClick={toggleSidebar} 
          aria-label="Toggle Sidebar"
        >
          <Menu size={24} />
        </button>
        <div>
          <h1 className="text-2xl font-bold m-0 tracking-tight">CampusOne</h1>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <div 
            className="flex items-center gap-3 cursor-pointer py-2 px-3 rounded-xl transition-colors hover:bg-white/10"
            onClick={() => setShowDropdown(!showDropdown)}
          >
            <div className="w-[45px] h-[45px] rounded-full overflow-hidden border-2 border-white/30 flex items-center justify-center bg-gradient-secondary">
              {profilePic ? (
                <img src={profilePic} alt={userName} className="w-full h-full object-cover" />
              ) : (
                <div className="text-xl font-semibold text-white">
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
              className={`transition-transform duration-300 text-white/80 ${showDropdown ? 'rotate-180' : ''}`} 
            />
          </div>

          {showDropdown && (
            <div className="absolute top-[calc(100%+8px)] right-0 bg-white rounded-xl shadow-lg min-w-[200px] overflow-hidden animate-dropdown z-[100]">
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
