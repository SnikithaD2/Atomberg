import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const demoAccounts = [
    { label: 'Employee', email: 'priya@atomquest.com', password: 'Employee@123' },
    { label: 'Manager', email: 'manager@atomquest.com', password: 'Manager@123' },
    { label: 'Admin', email: 'admin@atomquest.com', password: 'Admin@123' },
  ];

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const user = await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  function quickLogin(acc) {
    setForm({ email: acc.email, password: acc.password });
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <div className="brand-logo"><span style={{ fontSize: 18 }}>⚛</span></div>
          <div>
            <div className="brand-name" style={{ fontSize: 18 }}>AtomQuest</div>
            <div className="brand-sub">Goal Setting & Tracking Portal</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              className="form-input"
              type="email"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="your@email.com"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              placeholder="••••••••"
              required
            />
          </div>
          {error && <div className="form-error" style={{ marginBottom: 12 }}>{error}</div>}
          <button className="btn btn-primary w-full" type="submit" disabled={loading} style={{ justifyContent: 'center' }}>
            {loading ? <div className="spinner" /> : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
          <div className="section-label" style={{ marginBottom: 10 }}>Quick Demo Login</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {demoAccounts.map(acc => (
              <button key={acc.label} className="btn btn-secondary btn-sm" onClick={() => quickLogin(acc)} style={{ flex: 1, justifyContent: 'center' }}>
                {acc.label}
              </button>
            ))}
          </div>
          <div className="form-hint" style={{ marginTop: 8 }}>Click a role then Sign In</div>
        </div>
      </div>
    </div>
  );
}
