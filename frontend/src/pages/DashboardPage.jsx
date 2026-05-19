import { useState, useEffect } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { computeScore, THRUST_AREAS } from '../utils/helpers';
import { StatusBadge, ProgressBar, Avatar } from '../components/UI';

export default function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [goals, setGoals] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [goalsRes, usersRes] = await Promise.all([api.get('/goals'), api.get('/auth/users')]);
        setGoals(goalsRes.data);
        setAllUsers(usersRes.data);
      } catch {}
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Loading...</div>;

  const myGoals = goals.filter(g => g.employeeId?._id === user._id || g.employeeId === user._id);
  const approved = myGoals.filter(g => g.status === 'approved').length;
  const totalWeight = myGoals.reduce((s, g) => s + g.weightage, 0);
  const q2complete = myGoals.filter(g => g.achievements?.Q2?.actual != null).length;

  const cycleSteps = [
    { label: 'Goal Setting', period: '1 May', status: 'done' },
    { label: 'Q1 Check-in', period: 'July', status: 'done' },
    { label: 'Q2 Check-in', period: 'October', status: 'active' },
    { label: 'Q3 Check-in', period: 'January', status: 'upcoming' },
    { label: 'Q4 / Annual', period: 'Mar–Apr', status: 'upcoming' },
  ];

  if (user.role === 'employee') return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Welcome back, {user.name.split(' ')[0]}</div>
          <div className="page-sub">FY2025 · Q2 Check-in period is open</div>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/my-goals')}>+ Add Goal</button>
      </div>

      <div className="stats-grid">
        {[
          ['Total Goals', myGoals.length, 'Max 8 allowed', null],
          ['Approved', approved, `of ${myGoals.length} goals`, 'var(--success)'],
          ['Total Weightage', `${totalWeight}%`, 'Target: 100%', totalWeight === 100 ? 'var(--success)' : 'var(--danger)'],
          ['Q2 Updates', `${q2complete}/${myGoals.length}`, 'goals updated', null],
        ].map(([label, val, sub, color]) => (
          <div key={label} className="metric-card">
            <div className="text-xs text-muted" style={{ marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: color || 'var(--text)' }}>{val}</div>
            <div className="text-xs text-muted mt-4">{sub}</div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ gap: 20 }}>
        <div className="card">
          <div className="flex-between mb-16">
            <div className="font-semibold">My Goals</div>
            <button className="btn btn-secondary btn-sm" onClick={() => navigate('/my-goals')}>View all</button>
          </div>
          {myGoals.slice(0, 4).map(g => (
            <div key={g._id} className="flex-between" style={{ padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div className="font-medium" style={{ fontSize: 13.5 }}>{g.title}</div>
                <div className="text-xs text-muted mt-4">{g.thrustArea} · {g.weightage}%</div>
              </div>
              <StatusBadge status={g.status} />
            </div>
          ))}
          {myGoals.length === 0 && <div className="text-muted text-sm">No goals yet. Create your first goal!</div>}
        </div>

        <div className="card">
          <div className="font-semibold mb-16">FY2025 Cycle Timeline</div>
          {cycleSteps.map((s, i) => (
            <div key={i} className="flex-center gap-12" style={{ padding: '8px 0' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                background: s.status === 'done' ? 'var(--success)' : s.status === 'active' ? 'var(--accent)' : 'var(--border-md)' }} />
              <div style={{ flex: 1 }} className="flex-between">
                <span className="font-medium" style={{ fontSize: 13, color: s.status === 'upcoming' ? 'var(--text-faint)' : 'var(--text)' }}>{s.label}</span>
                <span className="text-xs text-muted">{s.period}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (user.role === 'manager') {
    const teamEmployees = allUsers.filter(u => u.managerId?.toString() === user._id || u.managerId === user._id);
    const teamGoals = goals.filter(g => teamEmployees.some(e => e._id === (g.employeeId?._id || g.employeeId)));
    const pendingApprovals = teamGoals.filter(g => g.status === 'submitted').length;

    return (
      <div>
        <div className="page-header">
          <div>
            <div className="page-title">Manager Dashboard</div>
            <div className="page-sub">{user.department} team · {teamEmployees.length} members</div>
          </div>
        </div>
        <div className="stats-grid stats-grid-3">
          <div className="metric-card"><div className="text-xs text-muted" style={{ marginBottom: 6 }}>Team Members</div><div style={{ fontSize: 28, fontWeight: 700 }}>{teamEmployees.length}</div></div>
          <div className="metric-card"><div className="text-xs text-muted" style={{ marginBottom: 6 }}>Pending Approvals</div><div style={{ fontSize: 28, fontWeight: 700, color: 'var(--warning)' }}>{pendingApprovals}</div></div>
          <div className="metric-card"><div className="text-xs text-muted" style={{ marginBottom: 6 }}>Total Team Goals</div><div style={{ fontSize: 28, fontWeight: 700 }}>{teamGoals.length}</div></div>
        </div>
        <div className="card">
          <div className="font-semibold mb-16">Team Members</div>
          {teamEmployees.map(emp => {
            const empGoals = goals.filter(g => (g.employeeId?._id || g.employeeId) === emp._id);
            const hasSubmitted = empGoals.some(g => g.status === 'submitted');
            const hasApproved = empGoals.every(g => g.status === 'approved') && empGoals.length > 0;
            return (
              <div key={emp._id} className="flex-between" style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                <div className="flex-center gap-12">
                  <Avatar name={emp.name} initials={emp.initials} />
                  <div><div className="font-medium">{emp.name}</div><div className="text-xs text-muted">{emp.department}</div></div>
                </div>
                <StatusBadge status={hasApproved ? 'approved' : hasSubmitted ? 'submitted' : 'draft'} />
              </div>
            );
          })}
          {teamEmployees.length === 0 && <div className="text-muted text-sm">No team members found.</div>}
        </div>
      </div>
    );
  }

  // Admin dashboard
  const submitted = goals.filter(g => g.status === 'submitted').length;
  const approvedAll = goals.filter(g => g.status === 'approved').length;

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Admin Dashboard</div><div className="page-sub">Organisation overview · FY2025</div></div>
      </div>
      <div className="stats-grid">
        {[
          ['Total Employees', allUsers.filter(u => u.role === 'employee').length, null, null],
          ['Goals Submitted', submitted, null, null],
          ['Goals Approved', approvedAll, null, 'var(--success)'],
          ['Total Goals', goals.length, 'across all employees', null],
        ].map(([label, val, sub, color]) => (
          <div key={label} className="metric-card">
            <div className="text-xs text-muted" style={{ marginBottom: 6 }}>{label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: color || 'var(--text)' }}>{val}</div>
            {sub && <div className="text-xs text-muted mt-4">{sub}</div>}
          </div>
        ))}
      </div>
      <div className="grid-2" style={{ gap: 20 }}>
        <div className="card">
          <div className="font-semibold mb-16">Goals by Thrust Area</div>
          {THRUST_AREAS.map(ta => {
            const count = goals.filter(g => g.thrustArea === ta).length;
            if (!count) return null;
            return (
              <div key={ta} className="flex-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                <span className="text-sm">{ta}</span>
                <span className="tag">{count} goals</span>
              </div>
            );
          })}
        </div>
        <div className="card">
          <div className="font-semibold mb-16">Status Breakdown</div>
          {['draft', 'submitted', 'approved', 'rework'].map(s => {
            const count = goals.filter(g => g.status === s).length;
            return (
              <div key={s} style={{ marginBottom: 12 }}>
                <div className="flex-between mb-4"><span className="text-sm capitalize">{s}</span><span className="text-sm font-medium">{count}</span></div>
                <ProgressBar value={goals.length ? (count / goals.length) * 100 : 0} color="var(--accent)" />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
