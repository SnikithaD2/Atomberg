import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Avatar } from './UI';

const NAV_ITEMS = {
  employee: [
    { path: '/dashboard', icon: '⊞', label: 'Dashboard' },
    { path: '/my-goals', icon: '◎', label: 'My Goals' },
    { path: '/achievements', icon: '▦', label: 'Achievements' },
  ],
  manager: [
    { path: '/dashboard', icon: '⊞', label: 'Dashboard' },
    { path: '/team-goals', icon: '◈', label: 'Team Goals' },
    { path: '/approvals', icon: '✓', label: 'Approvals' },
    { path: '/check-ins', icon: '◷', label: 'Check-ins' },
  ],
  admin: [
    { path: '/dashboard', icon: '⊞', label: 'Dashboard' },
    { path: '/all-goals', icon: '≡', label: 'All Goals' },
    { path: '/shared-goals', icon: '⇄', label: 'Shared Goals' },
    { path: '/reports', icon: '▤', label: 'Reports' },
    { path: '/audit', icon: '⛨', label: 'Audit Trail' },
    { path: '/cycles', icon: '◉', label: 'Cycle Config' },
  ],
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const items = NAV_ITEMS[user?.role] || [];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="brand-logo">⚛</div>
        <div>
          <div className="brand-name">AtomQuest</div>
          <div className="brand-sub">Goal Portal 1.0</div>
        </div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">Navigation</div>
        {items.map(item => (
          <div
            key={item.path}
            className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <span style={{ fontSize: 16 }}>{item.icon}</span>
            {item.label}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="user-chip" onClick={logout} title="Click to logout">
          <Avatar name={user?.name} initials={user?.initials} />
          <div>
            <div className="user-info-name">{user?.name}</div>
            <div className="user-info-role">{user?.department} · {user?.role}</div>
          </div>
        </div>
        <div className="form-hint" style={{ paddingLeft: 10, marginTop: 4 }}>Click avatar to logout</div>
      </div>
    </aside>
  );
}
