// TeamGoalsPage
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { computeScore } from '../utils/helpers';
import { StatusBadge, ProgressBar, Avatar } from '../components/UI';

export function TeamGoalsPage() {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    async function load() {
      const [goalsRes, usersRes] = await Promise.all([api.get('/goals'), api.get('/auth/users')]);
      setGoals(goalsRes.data);
      const team = usersRes.data.filter(u => u.managerId?.toString() === user._id || u.managerId === user._id);
      setTeamMembers(team);
      if (team.length > 0) setSelected(team[0]._id);
    }
    load();
  }, []);

  const memberGoals = goals.filter(g => (g.employeeId?._id || g.employeeId) === selected);

  return (
    <div>
      <div className="page-header"><div className="page-title">Team Goals</div></div>
      <div className="flex-center gap-10 mb-24" style={{ flexWrap: 'wrap' }}>
        {teamMembers.map(m => (
          <div key={m._id} className="card-sm flex-center gap-10"
            style={{ cursor: 'pointer', border: selected === m._id ? '2px solid var(--accent)' : '1px solid var(--border)', padding: '10px 16px' }}
            onClick={() => setSelected(m._id)}>
            <Avatar name={m.name} initials={m.initials} />
            <div><div className="font-medium text-sm">{m.name}</div><div className="text-xs text-muted">{goals.filter(g => (g.employeeId?._id || g.employeeId) === m._id).length} goals</div></div>
          </div>
        ))}
        {teamMembers.length === 0 && <div className="text-muted text-sm">No team members found.</div>}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table">
          <thead><tr><th>Goal</th><th>Thrust Area</th><th>Target</th><th>Weightage</th><th>Status</th><th>Q2 Progress</th></tr></thead>
          <tbody>
            {memberGoals.length === 0 && <tr><td colSpan={6}><div className="empty-state" style={{ padding: 40 }}>No goals found</div></td></tr>}
            {memberGoals.map(g => {
              const ach = g.achievements?.Q2;
              const score = ach ? computeScore(g, ach) : null;
              return (
                <tr key={g._id}>
                  <td><div className="font-medium">{g.title}</div><div className="text-xs text-muted mt-4">{g.description?.slice(0, 50)}</div></td>
                  <td><span className="tag">{g.thrustArea}</span></td>
                  <td>{g.target}</td>
                  <td>{g.weightage}%</td>
                  <td><StatusBadge status={g.status} /></td>
                  <td>
                    {score !== null ? (
                      <div className="flex-center gap-8"><ProgressBar value={score} width={60} /><span className="text-sm">{score.toFixed(0)}%</span></div>
                    ) : <span className="text-faint text-sm">—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// CheckInsPage
export function CheckInsPage() {
  const { showToast } = { showToast: () => {} };
  const [goals, setGoals] = useState([]);
  const [activeQ, setActiveQ] = useState('Q2');
  const [modalGoal, setModalGoal] = useState(null);
  const [ciComment, setCiComment] = useState('');
  const [toast, setToast] = useState(null);

  async function load() {
    const res = await api.get('/goals');
    setGoals(res.data.filter(g => g.status === 'approved'));
  }

  useEffect(() => { load(); }, []);

  async function saveCheckIn(g) {
    if (!ciComment.trim()) return setToast('Please enter a check-in comment');
    try {
      await api.patch(`/goals/${g._id}/checkin`, { quarter: activeQ, managerComment: ciComment });
      setToast(`Check-in saved for ${g.title}`);
      setModalGoal(null); setCiComment('');
      load();
    } catch (err) { setToast(err.response?.data?.message || 'Error'); }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Quarterly Check-ins</div>
        <div className="flex-center gap-8">
          {['Q1', 'Q2', 'Q3', 'Q4'].map(q => <button key={q} className={`btn btn-sm ${activeQ === q ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveQ(q)}>{q}</button>)}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table">
          <thead><tr><th>Goal</th><th>Employee</th><th>Planned vs Actual</th><th>Check-in</th><th>Action</th></tr></thead>
          <tbody>
            {goals.map(g => {
              const ach = g.achievements?.[activeQ];
              const ci = g.checkIns?.[activeQ];
              const score = ach ? computeScore(g, ach) : null;
              const emp = g.employeeId;
              return (
                <tr key={g._id}>
                  <td><div className="font-medium" style={{ fontSize: 13 }}>{g.title}</div><span className="tag">{g.thrustArea}</span></td>
                  <td><div className="flex-center gap-8"><Avatar name={emp?.name || '?'} initials={emp?.initials} size={28} /><span className="text-sm">{emp?.name || 'Unknown'}</span></div></td>
                  <td>
                    <div className="text-sm">Target: <b>{g.target}</b> → Actual: <b>{ach?.actual ?? '—'}</b></div>
                    {score !== null && <div className="flex-center gap-6 mt-4"><ProgressBar value={score} width={60} /><span className="text-xs">{score.toFixed(0)}%</span></div>}
                  </td>
                  <td>{ci ? <><span className="badge badge-green">Done</span><div className="text-xs text-muted mt-4">{ci.date ? new Date(ci.date).toLocaleDateString() : ''}</div></> : <span className="badge badge-gray">Pending</span>}</td>
                  <td><button className="btn btn-secondary btn-sm" onClick={() => { setModalGoal(g); setCiComment(ci?.managerComment || ''); }}>{ci ? 'Edit' : 'Add Check-in'}</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modalGoal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setModalGoal(null)}>
          <div className="modal">
            <div className="modal-header">
              <div><div className="modal-title">{activeQ} Check-in</div><div className="text-sm text-muted mt-4">{modalGoal.title}</div></div>
              <button className="btn btn-secondary btn-sm btn-icon" onClick={() => setModalGoal(null)}>✕</button>
            </div>
            <div className="card-sm" style={{ background: 'var(--surface2)', marginBottom: 20 }}>
              <div className="grid-3">
                <div><div className="text-xs text-muted">Target</div><div className="font-semibold mt-4">{modalGoal.target}</div></div>
                <div><div className="text-xs text-muted">{activeQ} Actual</div><div className="font-semibold mt-4">{modalGoal.achievements?.[activeQ]?.actual ?? '—'}</div></div>
                <div><div className="text-xs text-muted">Score</div><div className="font-semibold mt-4" style={{ color: 'var(--success)' }}>{modalGoal.achievements?.[activeQ] ? computeScore(modalGoal, modalGoal.achievements[activeQ]).toFixed(0) + '%' : '—'}</div></div>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Manager Check-in Comment</label>
              <textarea className="form-input" rows={4} value={ciComment} onChange={e => setCiComment(e.target.value)} placeholder="Document discussion, feedback, and next steps..." />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setModalGoal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={() => saveCheckIn(modalGoal)}>Save Check-in</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast" onClick={() => setToast(null)}>{toast}</div>}
    </div>
  );
}

// AllGoalsPage (Admin)
export function AllGoalsPage() {
  const [goals, setGoals] = useState([]);
  const [filter, setFilter] = useState('all');
  const [toast, setToast] = useState(null);

  async function load() {
    const res = await api.get('/goals');
    setGoals(res.data);
  }
  useEffect(() => { load(); }, []);

  async function unlockGoal(g) {
    if (!confirm(`Unlock "${g.title}" for editing?`)) return;
    try {
      await api.patch(`/goals/${g._id}/unlock`);
      setToast('Goal unlocked for editing');
      load();
    } catch (err) { setToast(err.response?.data?.message || 'Error'); }
  }

  const filtered = filter === 'all' ? goals : goals.filter(g => g.status === filter);

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">All Goals</div><div className="page-sub">{goals.length} goals across organisation</div></div>
        <div className="flex-center gap-8">
          {['all', 'draft', 'submitted', 'approved', 'rework'].map(s => (
            <button key={s} className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setFilter(s)}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table">
          <thead><tr><th>Goal</th><th>Employee</th><th>Thrust Area</th><th>Weightage</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {filtered.map(g => (
              <tr key={g._id}>
                <td><div className="font-medium">{g.title}</div>{g.sharedGoal && <span className="badge badge-blue" style={{ fontSize: 10, marginTop: 4 }}>Shared</span>}</td>
                <td>
                  {g.employeeId ? (
                    <div className="flex-center gap-8"><Avatar name={g.employeeId.name} initials={g.employeeId.initials} size={26} /><span className="text-sm">{g.employeeId.name}</span></div>
                  ) : '—'}
                </td>
                <td><span className="tag">{g.thrustArea}</span></td>
                <td>{g.weightage}%</td>
                <td><StatusBadge status={g.status} /></td>
                <td>{g.status === 'approved' && <button className="btn btn-secondary btn-sm" onClick={() => unlockGoal(g)}>🔓 Unlock</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {toast && <div className="toast" onClick={() => setToast(null)}>{toast}</div>}
    </div>
  );
}
