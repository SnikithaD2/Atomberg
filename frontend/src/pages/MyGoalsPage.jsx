import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import { THRUST_AREAS, UOM_TYPES } from '../utils/helpers';
import { StatusBadge, Modal } from '../components/UI';

export default function MyGoalsPage() {
  const { user } = useAuth();
  const { showToast } = useOutletContext();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editGoal, setEditGoal] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [redistribution, setRedistribution] = useState({});
  const [showRedistribute, setShowRedistribute] = useState(false);

  const emptyForm = { thrustArea: '', title: '', description: '', uom: 'Numeric (Min)', target: '', weightage: '' };
  const [form, setForm] = useState(emptyForm);

  async function loadGoals() {
    try {
      const res = await api.get('/goals');
      setGoals(res.data.filter(g => (g.employeeId?._id || g.employeeId) === user._id));
    } catch {}
    setLoading(false);
  }

  useEffect(() => { loadGoals(); }, []);

  const totalWeight = goals.reduce((s, g) => s + g.weightage, 0);
  const canAdd = goals.length < 8;

  // Goals that can be redistributed: not approved, not shared, not the goal being edited
  const editableGoals = goals.filter(g =>
    g.status !== 'approved' && !g.sharedGoal && (!editGoal || g._id !== editGoal._id)
  );

  function openAdd() {
    setForm(emptyForm); setEditGoal(null); setErrors({});
    setShowRedistribute(false); setRedistribution({});
    setShowForm(true);
  }

  function openEdit(g) {
    if (g.status === 'approved') return showToast('Approved goals are locked. Contact admin to unlock.');
    setForm({ thrustArea: g.thrustArea, title: g.title, description: g.description, uom: g.uom, target: String(g.target), weightage: String(g.weightage) });
    setEditGoal(g); setErrors({});
    setShowRedistribute(false); setRedistribution({});
    setShowForm(true);
  }

  // How much headroom remains after redistribution + new goal
  function redisBalance() {
    const newW = Number(form.weightage) || 0;
    const otherW = goals.reduce((sum, g) => {
      if (editGoal && g._id === editGoal._id) return sum;
      const override = redistribution[g._id];
      return sum + (override !== undefined ? Number(override) : g.weightage);
    }, 0);
    return 100 - otherW - newW;
  }

  function validate() {
    const e = {};
    if (!form.thrustArea) e.thrustArea = 'Required';
    if (!form.title.trim()) e.title = 'Required';
    if (!form.target) e.target = 'Required';
    const w = Number(form.weightage);
    if (!w || w < 10) e.weightage = 'Min 10%';
    else if (w > 90) e.weightage = 'Max 90%';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function autoDistribute() {
    const needed = Number(form.weightage) || 0;
    const newWeights = {};
    let toFree = needed;
    // Sort by highest weightage first to cut from the fattest goals
    const sorted = [...editableGoals].sort((a, b) => b.weightage - a.weightage);
    sorted.forEach((g, i) => {
      const maxCut = g.weightage - 10;
      const cut = i === sorted.length - 1
        ? Math.min(toFree, maxCut)
        : Math.min(Math.ceil(toFree / (sorted.length - i)), maxCut);
      newWeights[g._id] = String(g.weightage - cut);
      toFree -= cut;
    });
    setRedistribution(newWeights);
  }

  async function handleSubmit(asDraft) {
    if (!validate()) return;

    const balance = redisBalance();
    const needsRedistribution = balance < 0;

    // If over capacity and redistribution panel not shown yet — open it
    if (needsRedistribution && !showRedistribute) {
      const prefill = {};
      editableGoals.forEach(g => { prefill[g._id] = String(g.weightage); });
      setRedistribution(prefill);
      setShowRedistribute(true);
      return;
    }

    // If redistribution panel is showing — validate it before proceeding
    if (showRedistribute) {
      const b = redisBalance();
      if (b < 0) return showToast(`Still over by ${Math.abs(b)}% — reduce existing goals further`);
      if (b > 0) return showToast(`${b}% still unallocated — must reach exactly 100%`);
      for (const val of Object.values(redistribution)) {
        if (Number(val) < 10) return showToast('Each goal must keep at least 10% weightage');
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        target: form.uom === 'Timeline' ? form.target : Number(form.target),
        weightage: Number(form.weightage),
        status: asDraft ? 'draft' : 'submitted',
        redistribution: showRedistribute ? redistribution : {},
      };
      if (editGoal) {
        await api.put(`/goals/${editGoal._id}`, payload);
      } else {
        await api.post('/goals', payload);
      }
      showToast(asDraft ? 'Draft saved' : 'Goal submitted for approval');
      setShowForm(false);
      loadGoals();
    } catch (err) {
      showToast(err.response?.data?.message || 'Error saving goal');
    }
    setSubmitting(false);
  }

  async function handleDelete(g) {
    if (g.status === 'approved') return showToast('Cannot delete approved goals.');
    if (!confirm('Delete this goal?')) return;
    try {
      await api.delete(`/goals/${g._id}`);
      showToast('Goal deleted');
      loadGoals();
    } catch (err) {
      showToast(err.response?.data?.message || 'Error deleting goal');
    }
  }

  const available = 100 - goals
    .filter(g => !editGoal || g._id !== editGoal._id)
    .reduce((s, g) => s + g.weightage, 0);

  const balance = redisBalance();

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">My Goals</div>
          <div className="page-sub">FY2025 · {goals.length}/8 goals · {totalWeight}% weightage used</div>
        </div>
        {canAdd && <button className="btn btn-primary" onClick={openAdd}>+ New Goal</button>}
      </div>

      {/* Weightage bar */}
      <div className="weightage-meter">
        <span style={{ fontSize: 16 }}>⚖</span>
        <div style={{ flex: 1 }}>
          <div className="flex-between mb-4">
            <span className="text-xs text-muted">Total Weightage</span>
            <span className="text-xs font-semibold" style={{
              color: totalWeight === 100 ? 'var(--success)' : totalWeight > 100 ? 'var(--danger)' : 'var(--warning)'
            }}>{totalWeight}% / 100%</span>
          </div>
          <div className="progress-bar" style={{ height: 8 }}>
            <div className="progress-fill" style={{
              width: `${Math.min(totalWeight, 100)}%`,
              background: totalWeight === 100 ? 'var(--success)' : totalWeight > 100 ? 'var(--danger)' : 'var(--accent)'
            }} />
          </div>
        </div>
        {totalWeight === 100 && <span style={{ color: 'var(--success)', fontSize: 18 }}>✓</span>}
      </div>

      {/* Info banner: at 100% but slots remain */}
      {totalWeight >= 100 && goals.length < 8 && (
        <div style={{
          background: 'var(--accent-bg)', border: '1px solid rgba(24,95,165,0.2)',
          borderRadius: 'var(--r-sm)', padding: '12px 16px', marginBottom: 16,
          display: 'flex', gap: 10, alignItems: 'flex-start'
        }}>
          <span style={{ fontSize: 16 }}>ℹ️</span>
          <div>
            <div className="font-medium text-sm" style={{ color: 'var(--accent-text)' }}>
              Weightage is full — you can still add more goals
            </div>
            <div className="text-xs text-muted mt-4">
              You have {8 - goals.length} slot{8 - goals.length !== 1 ? 's' : ''} left. Click "+ New Goal" and you'll
              be guided to redistribute weightage from your existing goals to make room.
            </div>
          </div>
        </div>
      )}

      {/* Goals table */}
      {loading ? (
        <div className="text-muted">Loading goals...</div>
      ) : goals.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div style={{ fontSize: 40 }}>◎</div>
            <div className="font-semibold">No goals yet</div>
            <div className="text-sm text-muted mt-8">Create your first goal for FY2025</div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table className="table">
            <thead>
              <tr>
                <th>Goal</th><th>Thrust Area</th><th>UoM</th><th>Target</th>
                <th>Weightage</th><th>Status</th><th style={{ width: 80 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {goals.map(g => (
                <tr key={g._id}>
                  <td>
                    <div className="font-medium" style={{ fontSize: 13.5 }}>{g.title}</div>
                    <div className="text-xs text-muted mt-4">
                      {g.description?.slice(0, 60)}{g.description?.length > 60 ? '...' : ''}
                    </div>
                    {g.sharedGoal && <span className="badge badge-blue" style={{ marginTop: 4, fontSize: 10 }}>Shared</span>}
                  </td>
                  <td><span className="tag">{g.thrustArea}</span></td>
                  <td className="text-muted text-sm">{g.uom}</td>
                  <td className="font-medium">{g.target}{g.uom?.includes('%') ? ' %' : ''}</td>
                  <td><span className="font-semibold">{g.weightage}%</span></td>
                  <td><StatusBadge status={g.status} /></td>
                  <td>
                    <div className="flex-center gap-8">
                      <button className="btn btn-secondary btn-sm btn-icon" onClick={() => openEdit(g)} title="Edit">✎</button>
                      {g.status !== 'approved' && (
                        <button className="btn btn-danger btn-sm btn-icon" onClick={() => handleDelete(g)} title="Delete">✕</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <Modal title={editGoal ? 'Edit Goal' : 'New Goal'} onClose={() => setShowForm(false)}>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">Thrust Area</label>
              <select className="form-input form-select" value={form.thrustArea}
                onChange={e => setForm(f => ({ ...f, thrustArea: e.target.value }))}>
                <option value="">Select...</option>
                {THRUST_AREAS.map(t => <option key={t}>{t}</option>)}
              </select>
              {errors.thrustArea && <div className="form-error">{errors.thrustArea}</div>}
            </div>
            <div className="form-group">
              <label className="form-label">Unit of Measurement</label>
              <select className="form-input form-select" value={form.uom}
                onChange={e => setForm(f => ({ ...f, uom: e.target.value }))}>
                {UOM_TYPES.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Goal Title</label>
            <input className="form-input" value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Increase API throughput by 40%" />
            {errors.title && <div className="form-error">{errors.title}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-input" rows={2} value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Brief description..." />
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">
                Target {form.uom === 'Timeline' ? '(Date)' : form.uom.includes('%') ? '(%)' : ''}
              </label>
              <input className="form-input"
                type={form.uom === 'Timeline' ? 'date' : 'number'}
                value={form.target}
                onChange={e => setForm(f => ({ ...f, target: e.target.value }))} min={0} />
              {errors.target && <div className="form-error">{errors.target}</div>}
              <div className="form-hint">
                {form.uom === 'Numeric (Max)' ? 'Lower = better (TAT, Cost)'
                  : form.uom === 'Zero-based' ? 'Zero = 100% success'
                  : form.uom === 'Timeline' ? 'Completion deadline' : ''}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Weightage (%)</label>
              <input className="form-input" type="number" min={10} max={90} value={form.weightage}
                onChange={e => {
                  setForm(f => ({ ...f, weightage: e.target.value }));
                  if (showRedistribute) setShowRedistribute(false);
                }} />
              {errors.weightage && <div className="form-error">{errors.weightage}</div>}
              <div className="form-hint">
                {showRedistribute ? "Adjust existing goals below to free up room" : `Min 10%, available: ${available}%`}
              </div>
            </div>
          </div>

          {/* ── Redistribution panel ── */}
          {showRedistribute && (
            <div style={{ marginBottom: 8 }}>
              {/* Status banner */}
              <div style={{
                background: balance === 0 ? 'var(--success-bg)' : balance < 0 ? 'var(--danger-bg)' : 'var(--warning-bg)',
                border: `1px solid ${balance === 0 ? 'rgba(59,109,17,0.25)' : balance < 0 ? 'rgba(163,45,45,0.25)' : 'rgba(133,79,11,0.25)'}`,
                borderRadius: 'var(--r-sm)', padding: '10px 14px', marginBottom: 14,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <div className="font-semibold text-sm" style={{
                    color: balance === 0 ? 'var(--success)' : balance < 0 ? 'var(--danger)' : 'var(--warning)'
                  }}>
                    {balance === 0
                      ? '✓ Total equals 100% — ready to save'
                      : balance > 0
                      ? `Reduce existing goals by ${balance}% more`
                      : `Over by ${Math.abs(balance)}% — reduce more`}
                  </div>
                  <div className="text-xs text-muted mt-4">
                    New goal needs {form.weightage || 0}% · Adjust below so everything sums to 100%
                  </div>
                </div>
                <div style={{
                  fontSize: 22, fontWeight: 700,
                  color: balance === 0 ? 'var(--success)' : balance < 0 ? 'var(--danger)' : 'var(--warning)'
                }}>
                  {100 - balance}%
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div className="form-label" style={{ margin: 0 }}>Adjust existing goal weightages</div>
                {editableGoals.length > 0 && (
                  <button className="btn btn-secondary btn-sm" onClick={autoDistribute} type="button">
                    ✦ Auto-distribute
                  </button>
                )}
              </div>

              {editableGoals.length === 0 ? (
                <div style={{
                  background: 'var(--warning-bg)', borderRadius: 'var(--r-sm)',
                  padding: '12px 14px', fontSize: 13, color: 'var(--warning)'
                }}>
                  All your existing goals are <b>approved</b> or <b>shared</b> and cannot be adjusted.
                  Ask your manager to unlock a goal first, or delete a non-approved goal to free up space.
                </div>
              ) : (
                <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', overflow: 'hidden' }}>
                  {editableGoals.map((g, i) => (
                    <div key={g._id} style={{
                      display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                      borderBottom: i < editableGoals.length - 1 ? '1px solid var(--border)' : 'none',
                      background: 'var(--surface)',
                    }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="text-sm font-medium" style={{ lineHeight: 1.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {g.title}
                        </div>
                        <div className="text-xs text-muted mt-4">
                          {g.thrustArea} · was <b>{g.weightage}%</b>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <input
                          type="number" min={10} max={90}
                          value={redistribution[g._id] ?? g.weightage}
                          onChange={e => setRedistribution(r => ({ ...r, [g._id]: e.target.value }))}
                          style={{
                            width: 68, padding: '6px 8px', textAlign: 'center',
                            border: '1px solid var(--border-md)', borderRadius: 'var(--r-sm)',
                            fontSize: 13, fontFamily: 'DM Mono, monospace',
                          }}
                        />
                        <span className="text-xs text-muted">%</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="modal-footer">
            <button className="btn btn-secondary" onClick={() => handleSubmit(true)} disabled={submitting}>
              Save Draft
            </button>
            <button className="btn btn-primary" onClick={() => handleSubmit(false)} disabled={submitting}>
              {showRedistribute
                ? balance === 0 ? 'Confirm & Submit' : balance > 0 ? `Free ${balance}% more` : `Over by ${Math.abs(balance)}%`
                : 'Submit for Approval'}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}