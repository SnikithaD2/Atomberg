import { useEffect } from 'react';

export function Avatar({ name, initials, size = 32 }) {
  const letters = initials || name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '?';
  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {letters}
    </div>
  );
}

export function Toast({ message, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 3200); return () => clearTimeout(t); }, []);
  return (
    <div className="toast">
      <span style={{ color: '#C0DD97', fontSize: 16 }}>✓</span>
      {message}
    </div>
  );
}

export function StatusBadge({ status }) {
  const map = {
    draft: ['gray', 'Draft'],
    submitted: ['amber', 'Submitted'],
    approved: ['green', 'Approved'],
    rework: ['red', 'Needs Rework'],
    'Not Started': ['gray', 'Not Started'],
    'On Track': ['blue', 'On Track'],
    Completed: ['green', 'Completed'],
    active: ['green', 'Active'],
    closed: ['gray', 'Closed'],
    upcoming: ['amber', 'Upcoming'],
  };
  const [color, label] = map[status] || ['gray', status];
  return <span className={`badge badge-${color}`}>{label}</span>;
}

export function ProgressBar({ value, color, width = '100%', height = 6 }) {
  const bg = color || (value >= 80 ? 'var(--success)' : value >= 50 ? 'var(--warning)' : 'var(--danger)');
  return (
    <div className="progress-bar" style={{ width, height }}>
      <div className="progress-fill" style={{ width: `${Math.min(value, 100)}%`, background: bg }} />
    </div>
  );
}

export function Spinner() {
  return <div className="spinner" />;
}

export function Modal({ title, onClose, children, footer }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="btn btn-secondary btn-sm btn-icon" onClick={onClose}>✕</button>
        </div>
        {children}
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, subtitle }) {
  return (
    <div className="empty-state">
      <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
      <div className="font-semibold">{title}</div>
      {subtitle && <div className="text-sm text-muted mt-8">{subtitle}</div>}
    </div>
  );
}
