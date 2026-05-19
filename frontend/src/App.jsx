import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import MyGoalsPage from './pages/MyGoalsPage';
import AchievementsPage from './pages/AchievementsPage';
import ApprovalsPage from './pages/ApprovalsPage';
import { TeamGoalsPage, CheckInsPage, AllGoalsPage } from './pages/ManagerAdminPages';
import { SharedGoalsPage, ReportsPage, AuditPage, CyclesPage } from './pages/AdminPages';

function RequireAuth({ children, roles }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: 'var(--text-muted)' }}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
      <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardPage />} />
        {/* Employee */}
        <Route path="my-goals" element={<RequireAuth roles={['employee']}><MyGoalsPage /></RequireAuth>} />
        <Route path="achievements" element={<RequireAuth roles={['employee']}><AchievementsPage /></RequireAuth>} />
        {/* Manager */}
        <Route path="team-goals" element={<RequireAuth roles={['manager', 'admin']}><TeamGoalsPage /></RequireAuth>} />
        <Route path="approvals" element={<RequireAuth roles={['manager', 'admin']}><ApprovalsPage /></RequireAuth>} />
        <Route path="check-ins" element={<RequireAuth roles={['manager', 'admin']}><CheckInsPage /></RequireAuth>} />
        {/* Admin */}
        <Route path="all-goals" element={<RequireAuth roles={['admin']}><AllGoalsPage /></RequireAuth>} />
        <Route path="shared-goals" element={<RequireAuth roles={['admin']}><SharedGoalsPage /></RequireAuth>} />
        <Route path="reports" element={<RequireAuth roles={['admin', 'manager']}><ReportsPage /></RequireAuth>} />
        <Route path="audit" element={<RequireAuth roles={['admin', 'manager']}><AuditPage /></RequireAuth>} />
        <Route path="cycles" element={<RequireAuth roles={['admin']}><CyclesPage /></RequireAuth>} />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
