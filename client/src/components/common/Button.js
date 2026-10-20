import React from 'react';

const sizeMap = {
  sm: { padding: '6px 14px', fontSize: '13px', iconSize: 14 },
  md: { padding: '10px 20px', fontSize: '14px', iconSize: 16 },
  lg: { padding: '13px 28px', fontSize: '15px', iconSize: 18 },
};

const variantMap = {
  primary: {
    background: 'var(--primary)',
    color: 'var(--white)',
    border: 'none',
    hover: { background: 'var(--primary-dark)' },
  },
  secondary: {
    background: 'var(--cream-dark)',
    color: 'var(--primary)',
    border: '1px solid var(--border)',
    hover: { background: 'var(--border)' },
  },
  gold: {
    background: 'var(--secondary)',
    color: 'var(--white)',
    border: 'none',
    hover: { background: 'var(--gold)' },
  },
  danger: {
    background: 'var(--danger)',
    color: 'var(--white)',
    border: 'none',
    hover: { background: '#6E1A20' },
  },
  ghost: {
    background: 'transparent',
    color: 'var(--primary)',
    border: '1px solid var(--primary)',
    hover: { background: 'var(--cream-dark)' },
  },
  success: {
    background: 'var(--success)',
    color: 'var(--white)',
    border: 'none',
    hover: { background: '#1E4D39' },
  },
};

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  onClick,
  type = 'button',
  style = {},
  className = '',
}) => {
  const s = sizeMap[size];
  const v = variantMap[variant];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: s.padding,
        fontSize: s.fontSize,
        fontFamily: 'Inter, sans-serif',
        fontWeight: 500,
        borderRadius: 'var(--radius)',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.6 : 1,
        transition: 'all var(--transition)',
        width: fullWidth ? '100%' : 'auto',
        whiteSpace: 'nowrap',
        background: v.background,
        color: v.color,
        border: v.border || 'none',
        boxShadow: 'var(--shadow-sm)',
        ...style,
      }}
    >
      {loading ? (
        <svg width={s.iconSize} height={s.iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83">
            <animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="0.8s" repeatCount="indefinite"/>
          </path>
        </svg>
      ) : (
        Icon && iconPosition === 'left' && <Icon size={s.iconSize} />
      )}
      {children}
      {!loading && Icon && iconPosition === 'right' && <Icon size={s.iconSize} />}
    </button>
  );
};

export default Button;
