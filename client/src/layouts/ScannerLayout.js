import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const API = process.env.REACT_APP_API_URL || '/api';

const ScannerLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);

  useEffect(() => {
    try {
      const cached = localStorage.getItem('cardpro_settings');
      if (cached) {
        const s = JSON.parse(cached);
        if (s?.logo?.url) setSettings(s);
      }
    } catch {}
    fetch(`${API}/public/settings`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.settings) {
          setSettings(d.settings);
          localStorage.setItem('cardpro_settings', JSON.stringify(d.settings));
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out.');
    navigate('/login');
  };

  const logoUrl = settings?.logo?.url;
  const companyName = settings?.companyName || 'Cardpro';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--primary-dark)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <header style={{
        background: 'var(--primary-dark)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
        padding: '16px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {logoUrl ? (
            <img src={logoUrl} alt={companyName} style={{ width: '36px', height: '36px', borderRadius: '10px', objectFit: 'cover' }} />
          ) : (
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Poppins', fontSize: '18px', fontWeight: 800, color: 'var(--white)' }}>
              {companyName[0]?.toUpperCase()}
            </div>
          )}
          <div>
            <p style={{ fontFamily: 'Poppins', fontSize: '16px', fontWeight: 700, color: 'var(--white)', margin: 0 }}>{companyName}</p>
            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>Scanner Portal</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>
            {user?.fullName || user?.username}
          </span>
          <button onClick={handleLogout} style={{
            background: 'rgba(255,255,255,0.1)', border: 'none', cursor: 'pointer',
            color: 'var(--white)', padding: '8px 16px', borderRadius: 'var(--radius)',
            fontSize: '13px', fontFamily: 'Inter, sans-serif',
          }}>
            Logout
          </button>
        </div>
      </header>
      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
    </div>
  );
};

export default ScannerLayout;
