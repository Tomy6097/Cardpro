import React from 'react';

const Card = ({ children, style = {}, className = '', padding = '24px', onClick }) => (
  <div
    onClick={onClick}
    className={className}
    style={{
      background: 'var(--white)',
      borderRadius: 'var(--radius)',
      boxShadow: 'var(--shadow-md)',
      border: '1px solid var(--border-light)',
      padding,
      cursor: onClick ? 'pointer' : 'default',
      transition: onClick ? 'box-shadow var(--transition), transform var(--transition)' : 'none',
      ...style,
    }}
    onMouseEnter={onClick ? (e) => {
      e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
      e.currentTarget.style.transform = 'translateY(-1px)';
    } : undefined}
    onMouseLeave={onClick ? (e) => {
      e.currentTarget.style.boxShadow = 'var(--shadow-md)';
      e.currentTarget.style.transform = 'translateY(0)';
    } : undefined}
  >
    {children}
  </div>
);

export const CardHeader = ({ title, subtitle, action, icon: Icon }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      {Icon && (
        <div style={{
          width: '40px', height: '40px', borderRadius: 'var(--radius-sm)',
          background: 'var(--cream-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--primary)',
        }}>
          <Icon size={20} />
        </div>
      )}
      <div>
        <h3 style={{ fontFamily: 'Poppins', fontSize: '16px', fontWeight: 600, color: 'var(--primary-dark)', margin: 0 }}>
          {title}
        </h3>
        {subtitle && <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>{subtitle}</p>}
      </div>
    </div>
    {action && <div>{action}</div>}
  </div>
);

export default Card;
