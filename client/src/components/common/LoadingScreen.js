import React from 'react';

const LoadingScreen = () => (
  <div style={{
    position: 'fixed', inset: 0,
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    background: 'var(--cream)',
    zIndex: 9999,
  }}>
    <div style={{ marginBottom: '24px' }}>
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect width="48" height="48" rx="12" fill="#5C3D11"/>
        <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
          style={{ fontFamily: 'Poppins, sans-serif', fontSize: '20px', fontWeight: 700, fill: '#C9A84C' }}>
          C
        </text>
      </svg>
    </div>
    <div style={{ fontFamily: 'Poppins', fontSize: '20px', fontWeight: 700, color: '#5C3D11', marginBottom: '16px' }}>
      Cardpro
    </div>
    <div style={{ display: 'flex', gap: '8px' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: '8px', height: '8px',
          borderRadius: '50%', backgroundColor: '#C9A84C',
          animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
        }} />
      ))}
    </div>
    <style>{`
      @keyframes bounce {
        0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
        40% { transform: translateY(-8px); opacity: 1; }
      }
    `}</style>
  </div>
);

export default LoadingScreen;
