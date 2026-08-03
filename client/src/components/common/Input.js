import React from 'react';

const Input = ({
  label, name, type = 'text', value, onChange, placeholder,
  error, required, disabled, icon: Icon, hint, style = {},
  ...props
}) => (
  <div style={{ marginBottom: '16px', ...style }}>
    {label && (
      <label style={{
        display: 'block', marginBottom: '6px',
        fontSize: '13px', fontWeight: 500,
        color: 'var(--text-secondary)',
      }}>
        {label} {required && <span style={{ color: 'var(--danger)' }}>*</span>}
      </label>
    )}
    <div style={{ position: 'relative' }}>
      {Icon && (
        <div style={{
          position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
          color: 'var(--text-muted)', pointerEvents: 'none',
          display: 'flex', alignItems: 'center',
        }}>
          <Icon size={16} />
        </div>
      )}
      <input
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        style={{
          width: '100%',
          padding: Icon ? '10px 14px 10px 40px' : '10px 14px',
          border: `1px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
          borderRadius: 'var(--radius)',
          fontSize: '14px',
          color: 'var(--text-primary)',
          background: disabled ? 'var(--cream)' : 'var(--white)',
          outline: 'none',
          transition: 'border-color var(--transition), box-shadow var(--transition)',
          fontFamily: 'Inter, sans-serif',
        }}
        onFocus={(e) => {
          e.target.style.borderColor = 'var(--primary)';
          e.target.style.boxShadow = '0 0 0 3px rgba(92,61,17,0.1)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = error ? 'var(--danger)' : 'var(--border)';
          e.target.style.boxShadow = 'none';
        }}
        {...props}
      />
    </div>
    {error && <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--danger)' }}>{error}</p>}
    {hint && !error && <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>{hint}</p>}
  </div>
);

export const Textarea = ({ label, name, value, onChange, placeholder, error, required, rows = 4, style = {} }) => (
  <div style={{ marginBottom: '16px', ...style }}>
    {label && (
      <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
        {label} {required && <span style={{ color: 'var(--danger)' }}>*</span>}
      </label>
    )}
    <textarea
      name={name} value={value} onChange={onChange} placeholder={placeholder} required={required} rows={rows}
      style={{
        width: '100%', padding: '10px 14px',
        border: `1px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
        borderRadius: 'var(--radius)', fontSize: '14px', color: 'var(--text-primary)',
        background: 'var(--white)', outline: 'none', resize: 'vertical',
        transition: 'border-color var(--transition)',
        fontFamily: 'Inter, sans-serif', lineHeight: 1.5,
      }}
      onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(92,61,17,0.1)'; }}
      onBlur={(e) => { e.target.style.borderColor = error ? 'var(--danger)' : 'var(--border)'; e.target.style.boxShadow = 'none'; }}
    />
    {error && <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--danger)' }}>{error}</p>}
  </div>
);

export const Select = ({ label, name, value, onChange, options = [], error, required, style = {} }) => (
  <div style={{ marginBottom: '16px', ...style }}>
    {label && (
      <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
        {label} {required && <span style={{ color: 'var(--danger)' }}>*</span>}
      </label>
    )}
    <select
      name={name} value={value} onChange={onChange} required={required}
      style={{
        width: '100%', padding: '10px 14px',
        border: `1px solid ${error ? 'var(--danger)' : 'var(--border)'}`,
        borderRadius: 'var(--radius)', fontSize: '14px', color: 'var(--text-primary)',
        background: 'var(--white)', outline: 'none', cursor: 'pointer',
        transition: 'border-color var(--transition)',
        fontFamily: 'Inter, sans-serif', appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236B5B45' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center',
        paddingRight: '36px',
      }}
      onFocus={(e) => { e.target.style.borderColor = 'var(--primary)'; }}
      onBlur={(e) => { e.target.style.borderColor = error ? 'var(--danger)' : 'var(--border)'; }}
    >
      {options.map(opt => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
    {error && <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--danger)' }}>{error}</p>}
  </div>
);

export default Input;
