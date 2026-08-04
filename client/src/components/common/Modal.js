import React, { useEffect } from 'react';

const Modal = ({ isOpen, onClose, title, children, width = '520px', footer }) => {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(26, 10, 0, 0.55)',
        backdropFilter: 'blur(4px)',
        padding: '16px',
        overflowY: 'auto',
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: 'var(--white)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xl)',
          width: '100%',
          maxWidth: width,
          display: 'flex',
          flexDirection: 'column',
          animation: 'modalIn 0.18s ease',
          position: 'relative',
          margin: 'auto',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px',
          borderBottom: '1px solid var(--border-light)',
          flexShrink: 0,
          borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
          background: 'var(--white)',
        }}>
          <h3 style={{
            fontFamily: 'Poppins', fontSize: '15px', fontWeight: 600,
            color: 'var(--primary-dark)', margin: 0,
          }}>
            {title}
          </h3>
          <button onClick={onClose} style={{
            background: 'var(--cream-dark)', border: 'none', cursor: 'pointer',
            width: '28px', height: '28px', borderRadius: '6px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--text-secondary)', flexShrink: 0,
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{
          padding: '16px 20px',
          overflowY: 'auto',
          maxHeight: 'calc(100vh - 160px)',
        }}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border-light)',
            display: 'flex', gap: '10px', justifyContent: 'flex-end',
            flexShrink: 0,
            background: 'var(--white)',
            borderRadius: '0 0 var(--radius-lg) var(--radius-lg)',
          }}>
            {footer}
          </div>
        )}
      </div>
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
};

export default Modal;
