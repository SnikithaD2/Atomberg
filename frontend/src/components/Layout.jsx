import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useAuth } from '../context/AuthContext';
import { Avatar, Toast } from './UI';

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/my-goals': 'My Goals',
  '/achievements': 'Achievements',
  '/team-goals': 'Team Goals',
  '/approvals': 'Approvals',
  '/check-ins': 'Check-ins',
  '/all-goals': 'All Goals',
  '/shared-goals': 'Shared Goals',
  '/reports': 'Reports',
  '/audit': 'Audit Trail',
  '/cycles': 'Cycle Config',
};

// Global toast state — simple singleton approach
let globalToastSetter = null;
export function showToast(msg) { globalToastSetter?.(msg); }

export default function Layout() {
  const { user } = useAuth();
  const location = useLocation();
  const [toast, setToast] = useState(null);
  globalToastSetter = setToast;

  return (
    <div className="app">
      <Sidebar />
      <div className="main">
        <header className="topbar">
          <div>
            <span className="font-semibold" style={{ fontSize: 15 }}>
              {PAGE_TITLES[location.pathname] || 'Dashboard'}
            </span>
            <span className="text-muted" style={{ marginLeft: 8, fontSize: 12 }}>FY 2025</span>
          </div>
          <div className="flex-center gap-12">
            <div className="chip">◷ Q2 Check-in Open</div>
            <Avatar name={user?.name} initials={user?.initials} />
          </div>
        </header>
        <div className="content">
          <Outlet context={{ showToast: setToast }} />
        </div>
      </div>
      {toast && <Toast message={toast} onClose={() => setToast(null)} />}
    </div>
  );
}
