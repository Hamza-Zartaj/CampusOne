import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';

const MOBILE_SIDEBAR_QUERY = '(max-width: 767px)';

const isMobileSidebar = () => (
  typeof window !== 'undefined' && window.matchMedia(MOBILE_SIDEBAR_QUERY).matches
);

const DashboardLayout = () => {
  const location = useLocation();
  const initialPathRef = useRef(location.pathname);
  const [sidebarOpen, setSidebarOpen] = useState(() => !isMobileSidebar());

  const toggleSidebar = () => {
    setSidebarOpen((open) => !open);
  };

  const closeMobileSidebar = useCallback(() => {
    if (isMobileSidebar()) {
      setSidebarOpen(false);
    }
  }, []);

  useEffect(() => {
    if (location.pathname === initialPathRef.current) return;
    closeMobileSidebar();
  }, [closeMobileSidebar, location.pathname]);

  return (
    <div className="flex flex-col h-screen bg-slate-100">
      <Header toggleSidebar={toggleSidebar} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onNavigate={closeMobileSidebar} />
        <main className={`flex-1 overflow-y-auto p-6 transition-all duration-300 ease-in-out md:p-4 sm:p-3`}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
