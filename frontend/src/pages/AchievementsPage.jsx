import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { computeScore, QUARTERS } from '../utils/helpers';
import { StatusBadge, ProgressBar, Modal } from '../components/UI';

export default function AchievementsPage() {
  const { user } = useAuth();
  const { showToast } = useOutletContext();
  const [goals, setGoals] = useState([]);
  const [activeQ, setActiveQ] = useState('Q2');
  const [editingGoal, setEditingGoal] = useState(null);
  const [form, setForm] = useState({ actual: '', status: 'On Track', comment: '' });

  async function load() {
    const res = await api.get('/goals');
    setGoals(res.data.filter(g => (g.employeeId?._id || g.employeeId) === user._id && g.status === 'approved'));
  }

  useEffect(() => { load(); }, []);

  function openUpdate(g) {
    setEditingGoal(g);
    setForm({ actual: g.achievements?.[activeQ]?.actual ?? '', status: g.achievements?.[activeQ]?.status ?? 'On Track', comment: g.achievements?.[activeQ]?.comment ?? '' });
  }

  async function saveUpdate() {
    if (form.actual === '') return showToast('Please enter actual achievement');
    try {
      await api.patch(`/goals/${editingGoal._id}/achievement`, { quarter: activeQ, actual: parseFloat(form.actual) || form.actual, status: form.status, comment: form.comment });
      showToast(`${activeQ} achievement saved`);
      setEditingGoal(null);
      load();
    } catch (err) {
      showToast(err.response?.data?.message || 'Error saving');
    }
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Achievement Tracking</div>
        <div className="flex-center gap-8">
          {QUARTERS.map(q => <button key={q} className={`btn btn-sm ${activeQ === q ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveQ(q)}>{q}</button>)}
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table className="table">
          <thead><tr><th>Goal</th><th>UoM</th><th>Target</th><th>{activeQ} Actual</th><th>Score</th><th>Status</th><th>Action</th></tr></thead>
          <tbody>
            {goals.length === 0 && <tr><td colSpan={7}><div className="empty-state" style={{ padding: 40 }}>No approved goals yet</div></td></tr>}
            {goals.map(g => {
              const ach = g.achievements?.[activeQ];
              const score = ach ? computeScore(g, ach) : null;
              return (
                <tr key={g._id}>
                  <td><div className="font-medium" style={{ fontSize: 13.5 }}>{g.title}</div><div className="text-xs text-muted mt-4">{g.thrustArea}</div></td>
                  <td className="text-sm text-muted">{g.uom}</td>
                  <td className="font-medium">{g.target}</td>
                  <td className="font-semibold" style={{ color: ach ? 'var(--text)' : 'var(--text-faint)' }}>{ach?.actual ?? '—'}</td>
                  <td>
                    {score !== null ? (
                      <div>
                        <div className="font-semibold" style={{ color: score >= 80 ? 'var(--success)' : score >= 50 ? 'var(--warning)' : 'var(--danger)' }}>{score.toFixed(0)}%</div>
                        <ProgressBar value={score} width={60} />
                      </div>
                    ) : <span className="text-faint">—</span>}
                  </td>
                  <td>{ach ? <StatusBadge status={ach.status} /> : <span className="text-faint text-sm">Not updated</span>}</td>
                  <td><button className="btn btn-secondary btn-sm" onClick={() => openUpdate(g)}>{ach ? 'Update' : 'Add'}</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editingGoal && (
        <Modal title={`${activeQ} Achievement Update`} onClose={() => setEditingGoal(null)}>
          <div className="text-sm text-muted mb-16">{editingGoal.title}</div>
          <div className="card-sm" style={{ background: 'var(--surface2)', marginBottom: 20 }}>
            <div className="grid-3">
              <div><div className="text-xs text-muted">UoM</div><div className="font-medium text-sm mt-4">{editingGoal.uom}</div></div>
              <div><div className="text-xs text-muted">Target</div><div className="font-medium text-sm mt-4">{editingGoal.target}</div></div>
              <div><div className="text-xs text-muted">Weightage</div><div className="font-medium text-sm mt-4">{editingGoal.weightage}%</div></div>
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Actual Achievement</label>
              <input className="form-input" type={editingGoal.uom === 'Timeline' ? 'date' : 'number'} value={form.actual} onChange={e => setForm(f => ({ ...f, actual: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-input form-select" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {['Not Started', 'On Track', 'Completed'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Comments (optional)</label>
            <textarea className="form-input" rows={2} value={form.comment} onChange={e => setForm(f => ({ ...f, comment: e.target.value }))} placeholder="Any context or blockers..." />
          </div>
          {form.actual !== '' && (
            <div style={{ background: 'var(--success-bg)', padding: '10px 14px', borderRadius: 'var(--r-sm)', marginBottom: 16 }}>
              <div className="text-xs text-muted" style={{ marginBottom: 4 }}>Computed Score</div>
              <div className="font-semibold" style={{ color: 'var(--success)', fontSize: 18 }}>{computeScore(editingGoal, { actual: parseFloat(form.actual) || 0 }).toFixed(0)}%</div>
            </div>
          )}
          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => setEditingGoal(null)}>Cancel</button>
            <button className="btn btn-primary" onClick={saveUpdate}>Save Achievement</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
