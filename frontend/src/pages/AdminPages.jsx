import { useState, useEffect } from 'react';
import api from '../utils/api';
import { computeScore, THRUST_AREAS, UOM_TYPES } from '../utils/helpers';
import { StatusBadge, ProgressBar, Avatar } from '../components/UI';

// ── SHARED GOALS ─────────────────────────────────────────────────────────────
export function SharedGoalsPage() {
  const [goals, setGoals] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ thrustArea: '', title: '', description: '', uom: 'Numeric (Min)', target: '', defaultWeightage: '' });

  async function load() {
    const [goalsRes, usersRes] = await Promise.all([api.get('/goals'), api.get('/auth/users')]);
    setGoals(goalsRes.data.filter(g => g.sharedGoal));
    setAllEmployees(usersRes.data.filter(u => u.role === 'employee'));
  }
  useEffect(() => { load(); }, []);

  async function pushSharedGoal() {
    if (!form.title || !form.target || !form.defaultWeightage) return setToast('Fill all required fields');
    try {
      const employeeIds = allEmployees.map(e => e._id);
      await api.post('/goals/shared', { ...form, target: Number(form.target), defaultWeightage: Number(form.defaultWeightage), employeeIds });
      setToast('Shared goal pushed to team');
      setShowForm(false);
      load();
    } catch (err) { setToast(err.response?.data?.message || 'Error'); }
  }

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Shared Goals</div><div className="page-sub">Departmental KPIs pushed to employees</div></div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>⇄ Push Shared Goal</button>
      </div>

      {goals.length === 0 ? (
        <div className="card"><div className="empty-state"><div style={{ fontSize: 40 }}>⇄</div><div className="font-semibold">No shared goals yet</div><div className="text-sm text-muted mt-8">Push a departmental KPI to employees</div></div></div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table">
            <thead><tr><th>Goal Title</th><th>Thrust Area</th><th>Target</th><th>Shared with</th></tr></thead>
            <tbody>
              {goals.map(g => (
                <tr key={g._id}>
                  <td className="font-medium">{g.title}</td>
                  <td><span className="tag">{g.thrustArea}</span></td>
                  <td>{g.target}</td>
                  <td><span className="badge badge-blue">Team Members</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal">
            <div className="modal-header"><div className="modal-title">Push Shared Goal</div><button className="btn btn-secondary btn-sm btn-icon" onClick={() => setShowForm(false)}>✕</button></div>
            <div className="form-group">
              <label className="form-label">Thrust Area</label>
              <select className="form-input form-select" value={form.thrustArea} onChange={e => setForm(f => ({ ...f, thrustArea: e.target.value }))}>
                <option value="">Select...</option>{THRUST_AREAS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Goal Title</label><input className="form-input" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">UoM</label>
                <select className="form-input form-select" value={form.uom} onChange={e => setForm(f => ({ ...f, uom: e.target.value }))}>
                  {UOM_TYPES.map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Target</label><input className="form-input" type="number" value={form.target} onChange={e => setForm(f => ({ ...f, target: e.target.value }))} /></div>
            </div>
            <div className="form-group">
              <label className="form-label">Default Weightage (%)</label>
              <input className="form-input" type="number" min={10} value={form.defaultWeightage} onChange={e => setForm(f => ({ ...f, defaultWeightage: e.target.value }))} />
              <div className="form-hint">Will push to {allEmployees.length} employees</div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={pushSharedGoal}>⇄ Push to All Team Members</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className="toast" onClick={() => setToast(null)}>{toast}</div>}
    </div>
  );
}

// ── REPORTS ──────────────────────────────────────────────────────────────────
export function ReportsPage() {
  const [goals, setGoals] = useState([]);

  useEffect(() => { api.get('/goals').then(res => setGoals(res.data.filter(g => g.status === 'approved'))); }, []);

  function exportCSV() {
    const rows = [['Goal Title', 'Employee', 'Thrust Area', 'UoM', 'Target', 'Q1 Actual', 'Q2 Actual', 'Q1 Score', 'Q2 Score', 'Weightage']];
    goals.forEach(g => {
      const q1 = g.achievements?.Q1; const q2 = g.achievements?.Q2;
      rows.push([g.title, g.employeeId?.name || '', g.thrustArea, g.uom, g.target, q1?.actual ?? '', q2?.actual ?? '', q1 ? computeScore(g, q1).toFixed(0) + '%' : '', q2 ? computeScore(g, q2).toFixed(0) + '%' : '', g.weightage + '%']);
    });
    const csv = rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'achievement_report.csv'; a.click();
  }

  return (
    <div>
      <div className="page-header">
        <div><div className="page-title">Reports & Analytics</div><div className="page-sub">FY2025 performance overview</div></div>
        <button className="btn btn-primary" onClick={exportCSV}>↓ Export CSV</button>
      </div>
      <div className="stats-grid mb-24">
        {[['Goals Tracked', goals.length], ['Approved Goals', goals.length], ['Thrust Areas', new Set(goals.map(g => g.thrustArea)).size], ['Employees', new Set(goals.map(g => g.employeeId?._id)).size]].map(([label, val]) => (
          <div key={label} className="metric-card"><div className="text-xs text-muted" style={{ marginBottom: 6 }}>{label}</div><div style={{ fontSize: 28, fontWeight: 700 }}>{val}</div></div>
        ))}
      </div>
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}><div className="font-semibold">Achievement Report — Planned vs Actual</div></div>
        <table className="table">
          <thead><tr><th>Goal</th><th>Employee</th><th>Thrust Area</th><th>Target</th><th>Q1</th><th>Q1 Score</th><th>Q2</th><th>Q2 Score</th><th>Weight</th></tr></thead>
          <tbody>
            {goals.map(g => {
              const q1 = g.achievements?.Q1; const q2 = g.achievements?.Q2;
              return (
                <tr key={g._id}>
                  <td className="font-medium" style={{ fontSize: 13 }}>{g.title}</td>
                  <td className="text-sm">{g.employeeId?.name || '—'}</td>
                  <td><span className="tag">{g.thrustArea}</span></td>
                  <td>{g.target}</td>
                  <td>{q1?.actual ?? <span className="text-faint">—</span>}</td>
                  <td>{q1 ? <span style={{ color: computeScore(g, q1) >= 80 ? 'var(--success)' : 'var(--warning)', fontWeight: 600 }}>{computeScore(g, q1).toFixed(0)}%</span> : <span className="text-faint">—</span>}</td>
                  <td>{q2?.actual ?? <span className="text-faint">—</span>}</td>
                  <td>{q2 ? <span style={{ color: computeScore(g, q2) >= 80 ? 'var(--success)' : 'var(--warning)', fontWeight: 600 }}>{computeScore(g, q2).toFixed(0)}%</span> : <span className="text-faint">—</span>}</td>
                  <td>{g.weightage}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── AUDIT ────────────────────────────────────────────────────────────────────
export function AuditPage() {
  const [logs, setLogs] = useState([]);

  useEffect(() => { api.get('/audit').then(res => setLogs(res.data)); }, []);

  return (
    <div>
      <div className="page-header"><div><div className="page-title">Audit Trail</div><div className="page-sub">All changes after goal lock date</div></div></div>
      <div className="card">
        {logs.length === 0 && <div className="empty-state"><div style={{ fontSize: 40 }}>⛨</div>No audit entries yet</div>}
        {logs.map(entry => (
          <div key={entry._id} className="audit-item">
            <div className="audit-dot" />
            <div style={{ flex: 1 }}>
              <div className="flex-between">
                <div className="font-medium text-sm">{entry.action}</div>
                <div className="text-xs text-muted">{new Date(entry.createdAt).toLocaleDateString()}</div>
              </div>
              {entry.goalId && <div className="text-xs text-muted mt-4">Goal: {entry.goalId.title || entry.goalId}</div>}
              <div className="text-xs mt-4"><span className="text-muted">By:</span> {entry.performedBy?.name || 'System'}</div>
              {entry.note && <div className="text-xs text-muted mt-4 italic">"{entry.note}"</div>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── CYCLES ───────────────────────────────────────────────────────────────────
export function CyclesPage() {
  const cycles = [{
    id: 'c1', year: 'FY2025', status: 'active',
    windows: [
      { phase: 'Goal Setting', opens: '2025-05-01', status: 'closed' },
      { phase: 'Q1 Check-in', opens: '2025-07-01', status: 'closed' },
      { phase: 'Q2 Check-in', opens: '2025-10-01', status: 'active' },
      { phase: 'Q3 Check-in', opens: '2026-01-01', status: 'upcoming' },
      { phase: 'Q4 / Annual', opens: '2026-03-01', status: 'upcoming' },
    ],
  }];

  return (
    <div>
      <div className="page-header"><div><div className="page-title">Cycle Configuration</div><div className="page-sub">Manage appraisal cycle windows</div></div><button className="btn btn-primary">+ New Cycle</button></div>
      {cycles.map(cycle => (
        <div key={cycle.id} className="card mb-16">
          <div className="flex-between mb-20"><div className="font-semibold" style={{ fontSize: 16 }}>{cycle.year}</div><StatusBadge status={cycle.status} /></div>
          <table className="table">
            <thead><tr><th>Phase</th><th>Window Opens</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {cycle.windows.map((w, i) => (
                <tr key={i}>
                  <td className="font-medium">{w.phase}</td>
                  <td className="text-sm" style={{ fontFamily: 'monospace' }}>{w.opens}</td>
                  <td><StatusBadge status={w.status} /></td>
                  <td>
                    {w.status === 'upcoming' && <button className="btn btn-success btn-sm">▶ Open Now</button>}
                    {w.status === 'active' && <button className="btn btn-secondary btn-sm">⏸ Close</button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
      <div className="card">
        <div className="font-semibold mb-16">Escalation Rules</div>
        {[['Goal not submitted within', '5 days of cycle open', 'Notify employee + manager'], ['Manager approval pending', '3 days after submission', 'Notify manager + HR'], ['Check-in not done within', '7 days of window open', 'Escalate to HR']].map(([label, trigger, action], i) => (
          <div key={i} className="flex-between" style={{ padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
            <div><div className="font-medium text-sm">{label}</div><div className="text-xs text-muted mt-4">{trigger} → {action}</div></div>
            <span className="badge badge-green">Active</span>
          </div>
        ))}
      </div>
    </div>
  );
}
