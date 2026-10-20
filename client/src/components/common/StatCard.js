import React from 'react';

const StatCard = ({ title, value, subtitle, icon: Icon, color = 'var(--primary)', trend, style = {} }) => (
  <div style={{
    background: 'var(--white)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow-md)',
    border: '1px solid var(--border-light)',
    padding: '20px 24px',
    display: 'flex', alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: '16px',
    ...style,
  }}>
    <div style={{ flex: 1, minWidth: 0 }}>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 8px', fontWeight: 500 }}>{title}</p>
      <h2 style={{
        fontFamily: 'Poppins', fontSize: '28px', fontWeight: 700,
        color: 'var(--primary-dark)', margin: '0 0 4px', lineHeight: 1,
      }}>
        {value?.toLocaleString() ?? '—'}
      </h2>
      {subtitle && <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>{subtitle}</p>}
      {trend !== undefined && (
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '4px',
          marginTop: '8px', fontSize: '12px', fontWeight: 500,
          color: trend >= 0 ? 'var(--success)' : 'var(--danger)',
        }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            {trend >= 0
              ? <path d="M12 4l8 8H4l8-8z"/>
              : <path d="M12 20l-8-8h16l-8 8z"/>}
          </svg>
          {Math.abs(trend)}% from last period
        </div>
      )}
    </div>
    {Icon && (
      <div style={{
        width: '48px', height: '48px', flexShrink: 0,
        borderRadius: 'var(--radius)',
        background: color + '15',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color,
      }}>
        <Icon size={24} />
      </div>
    )}
  </div>
);

export default StatCard;
