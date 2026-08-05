import React, { useState, useEffect } from 'react';

const API = process.env.REACT_APP_API_URL || '/api';

const LoadingScreen = () => {
  const [logoUrl, setLogoUrl] = useState(null);
  const [companyName, setCompanyName] = useState('Cardpro');

  useEffect(() => {
    fetch(`${API}/public/settings`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.settings?.logo?.url) setLogoUrl(d.settings.logo.url);
        if (d?.settings?.companyName) setCompanyName(d.settings.companyName);
      })
      .catch(() => {});
  }, []);

  return (
    <div style={{
      position: 'fixed', inset: 0,
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--cream)',
      zIndex: 9999,
    }}>
      <div style={{ marginBottom: '20px' }}>
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={companyName}
            style={{ height: '56px', width: 'auto', objectFit: 'contain', borderRadius: '12px' }}
          />
        ) : (
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px',
            background: 'var(--primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Poppins', fontSize: '24px', fontWeight: 800, color: 'var(--secondary)',
          }}>
            {companyName[0]?.toUpperCase()}
          </div>
        )}
      </div>
      <div style={{ fontFamily: 'Poppins', fontSize: '18px', fontWeight: 700, color: 'var(--primary)', marginBottom: '20px' }}>
        {companyName}
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: '8px', height: '8px',
            borderRadius: '50%', backgroundColor: 'var(--secondary)',
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
};

export default LoadingScreen;
