import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';

const MOBILE_SIDEBAR_QUERY = '(max-width: 767px)';

const isMobileSidebar = () => (
  typeof window !== 'undefined' && window.matchMedia(MOBILE_SIDEBAR_QUERY).matches
);

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
};

const DashboardLayout = () => {
  const location = useLocation();
  const initialPathRef = useRef(location.pathname);
  const [sidebarOpen, setSidebarOpen] = useState(() => !isMobileSidebar());
  const user = getStoredUser();

  if (!localStorage.getItem('token') || !user.authenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

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
    <div className="flex h-dvh min-w-0 flex-col overflow-hidden bg-slate-100">
      <Header toggleSidebar={toggleSidebar} />
      <div className="flex min-w-0 flex-1 overflow-hidden">
        <Sidebar isOpen={sidebarOpen} onNavigate={closeMobileSidebar} />
        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 transition-all duration-300 ease-in-out max-sm:p-3 md:p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
