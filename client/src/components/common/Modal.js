import React, { useEffect } from 'react';

const Modal = ({ isOpen, onClose, title, children, width = '520px', footer }) => {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: 'rgba(26,10,0,0.55)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Modal wrapper — centered using transform */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 1000,
        width: `min(${width}, calc(100vw - 32px))`,
        maxHeight: 'calc(100vh - 32px)',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--white)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: '0 24px 60px rgba(26,10,0,0.3)',
        animation: 'modalIn 0.18s ease',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 20px',
          borderBottom: '1px solid var(--border-light)',
          flexShrink: 0,
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
            color: 'var(--text-secondary)',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div style={{
          padding: '16px 20px',
          overflowY: 'auto',
          flex: 1,
          minHeight: 0,
        }}>
          {children}
        </div>

        {/* Footer — always visible */}
        {footer && (
          <div style={{
            padding: '12px 20px',
            borderTop: '1px solid var(--border-light)',
            display: 'flex', gap: '10px', justifyContent: 'flex-end',
            flexShrink: 0,
            background: 'var(--white)',
          }}>
            {footer}
          </div>
        )}
      </div>

      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: translate(-50%, -48%) scale(0.97); }
          to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </>
  );
};

export default Modal;
