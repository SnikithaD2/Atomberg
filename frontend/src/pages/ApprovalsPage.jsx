import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { Avatar } from '../components/UI';

export default function ApprovalsPage() {
  const { user } = useAuth();
  const { showToast } = useOutletContext();
  const [goals, setGoals] = useState([]);
  const [selected, setSelected] = useState(null);
  const [comment, setComment] = useState('');
  const [editTarget, setEditTarget] = useState({});

  async function load() {
    const res = await api.get('/goals');
    setGoals(res.data.filter(g => g.status === 'submitted'));
  }

  useEffect(() => { load(); }, []);

  async function approve(g) {
    try {
      await api.patch(`/goals/${g._id}/approve`, { note: comment || 'Approved', newTarget: editTarget[g._id] });
      showToast(`Goal approved: ${g.title}`);
      setSelected(null); setComment('');
      load();
    } catch (err) { showToast(err.response?.data?.message || 'Error'); }
  }

  async function rework(g) {
    if (!comment) return showToast('Please add a comment for rework');
    try {
      await api.patch(`/goals/${g._id}/rework`, { note: comment });
      showToast('Goal returned for rework');
      setSelected(null); setComment('');
      load();
    } catch (err) { showToast(err.response?.data?.message || 'Error'); }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Goal Approvals</div>
          <div className="page-sub">{goals.length} pending {goals.length === 1 ? 'goal' : 'goals'} for review</div>
        </div>
      </div>

      {goals.length === 0 ? (
        <div className="card"><div className="empty-state"><div style={{ fontSize: 40 }}>✓</div><div className="font-semibold">All caught up</div><div className="text-sm text-muted mt-8">No pending approvals</div></div></div>
      ) : goals.map(g => (
        <div key={g._id} className="card mb-16">
          <div className="flex-between mb-12">
            <div>
              <div className="font-semibold" style={{ fontSize: 15 }}>{g.title}</div>
              <div className="flex-center gap-8 mt-4">
                <span className="tag">{g.thrustArea}</span>
                <span className="text-xs text-muted">{g.uom}</span>
                {g.employeeId && (
                  <div className="flex-center gap-6">
                    <Avatar name={g.employeeId.name} initials={g.employeeId.initials} size={20} />
                    <span className="text-xs text-muted">{g.employeeId.name}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <div className="font-semibold">Target: {g.target}</div>
              <div className="text-sm text-muted">Weight: {g.weightage}%</div>
            </div>
          </div>

          <div className="text-sm text-muted mb-16">{g.description}</div>

          {selected === g._id ? (
            <div>
              <div className="form-group">
                <label className="form-label">Edit Target (optional)</label>
                <input className="form-input" type={g.uom === 'Timeline' ? 'date' : 'number'} defaultValue={g.target}
                  onChange={e => setEditTarget(t => ({ ...t, [g._id]: e.target.value }))} style={{ width: 200 }} />
              </div>
              <div className="form-group">
                <label className="form-label">Comment / Feedback</label>
                <textarea className="form-input" rows={2} value={comment} onChange={e => setComment(e.target.value)} placeholder="Add feedback or approval notes..." />
              </div>
              <div className="flex-center gap-10">
                <button className="btn btn-success" onClick={() => approve(g)}>✓ Approve</button>
                <button className="btn btn-danger" onClick={() => rework(g)}>↺ Return for Rework</button>
                <button className="btn btn-secondary" onClick={() => { setSelected(null); setComment(''); }}>Cancel</button>
              </div>
            </div>
          ) : (
            <button className="btn btn-secondary" onClick={() => setSelected(g._id)}>Review this Goal</button>
          )}
        </div>
      ))}
    </div>
  );
}
