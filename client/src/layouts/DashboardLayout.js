import React, { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { settingsAPI, rsvpAPI } from '../api';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';

// NavItem with optional badge
const NavItem = ({ to, icon: Icon, label, collapsed, badge }) => (
  <NavLink to={to} style={{ textDecoration: 'none' }}>
    {({ isActive }) => (
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: collapsed ? '12px' : '11px 16px',
        borderRadius: 'var(--radius)',
        background: isActive ? 'rgba(201,168,76,0.15)' : 'transparent',
        color: isActive ? 'var(--secondary)' : 'rgba(253,246,236,0.7)',
        transition: 'all var(--transition)',
        cursor: 'pointer',
        justifyContent: collapsed ? 'center' : 'flex-start',
        marginBottom: '2px',
        position: 'relative',
      }}
      onMouseEnter={e => { if (!e.currentTarget.querySelector('[data-active]')) e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; }}
      onMouseLeave={e => { if (!e.currentTarget.querySelector('[data-active]')) e.currentTarget.style.background = isActive ? 'rgba(201,168,76,0.15)' : 'transparent'; }}
      >
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <Icon size={18} />
          {badge > 0 && (
            <span style={{
              position: 'absolute', top: '-6px', right: '-8px',
              background: '#EF4444', color: 'white',
              fontSize: '9px', fontWeight: 700, fontFamily: 'Inter',
              minWidth: '16px', height: '16px', borderRadius: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '0 3px', lineHeight: 1,
            }}>
              {badge > 99 ? '99+' : badge}
            </span>
          )}
        </div>
        {!collapsed && <span style={{ fontSize: '14px', fontWeight: isActive ? 600 : 400, whiteSpace: 'nowrap', flex: 1 }}>{label}</span>}
        {!collapsed && badge > 0 && (
          <span style={{
            background: '#EF4444', color: 'white',
            fontSize: '10px', fontWeight: 700, padding: '1px 6px',
            borderRadius: '10px', fontFamily: 'Inter',
          }}>
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </div>
    )}
  </NavLink>
);

// Icons using SVG
const icons = {
  Dashboard: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  Events: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  Guests: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  Settings: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>,
  Activity: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  Logout: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>,
  Menu: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  ChevronLeft: (p) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>,
};

const Icon = ({ name, size = 18 }) => {
  const I = icons[name];
  return I ? <I width={size} height={size} style={{ flexShrink: 0 }} /> : null;
};

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [companyLogo, setCompanyLogo] = useState(null);
  const [companyName, setCompanyName] = useState('Cardpro');

  // Notification: count new RSVPs (confirmed + declined) in last 24h across all events
  const { data: notifData } = useQuery({
    queryKey: ['rsvp-notifications'],
    queryFn: () => rsvpAPI.getRecentCount().then(r => r.data),
    refetchInterval: 60000, // every minute
    retry: false,
  });
  const rsvpBadge = notifData?.newCount || 0;

  useEffect(() => {
    // Check cache first
    try {
      const cached = localStorage.getItem('cardpro_settings');
      if (cached) {
        const s = JSON.parse(cached);
        if (s?.logo?.url) setCompanyLogo(s.logo.url);
        if (s?.companyName) setCompanyName(s.companyName);
      }
    } catch {}
    // Then fetch fresh
    settingsAPI.get().then(r => {
      if (r.data?.settings?.logo?.url) setCompanyLogo(r.data.settings.logo.url);
      if (r.data?.settings?.companyName) setCompanyName(r.data.settings.companyName);
      // Update cache
      if (r.data?.settings) localStorage.setItem('cardpro_settings', JSON.stringify(r.data.settings));
    }).catch(() => {});
  }, []);

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully.');
    navigate('/login');
  };

  const navItems = [
    { to: '/dashboard', icon: (p) => <Icon name="Dashboard" {...p} />, label: 'Dashboard' },
    { to: '/events', icon: (p) => <Icon name="Events" {...p} />, label: 'Events', badge: rsvpBadge },
    { to: '/activity', icon: (p) => <Icon name="Activity" {...p} />, label: 'Activity Log' },
    { to: '/settings', icon: (p) => <Icon name="Settings" {...p} />, label: 'Settings' },
  ];

  const sidebarWidth = collapsed ? '64px' : '240px';

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--cream)' }}>
      {/* Sidebar */}
      <aside style={{
        width: sidebarWidth, flexShrink: 0,
        background: 'var(--primary-dark)',
        display: 'flex', flexDirection: 'column',
        transition: 'width 0.3s ease',
        overflow: 'hidden',
        zIndex: 100,
        position: 'relative',
      }}>
        {/* Logo */}
        <div style={{
          padding: collapsed ? '20px 0' : '20px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          gap: '12px',
        }}>
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
              {companyLogo ? (
                <img
                  src={companyLogo}
                  alt={companyName}
                  style={{ width: '36px', height: '36px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }}
                />
              ) : (
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: 'var(--secondary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'Poppins', fontSize: '18px', fontWeight: 800, color: 'var(--white)', flexShrink: 0,
                }}>
                  {companyName?.[0]?.toUpperCase() || 'C'}
                </div>
              )}
              <span style={{
                fontFamily: 'Poppins', fontSize: '17px', fontWeight: 700,
                color: 'var(--white)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {companyName}
              </span>
            </div>
          )}
          {collapsed && (
            companyLogo ? (
              <img src={companyLogo} alt={companyName} style={{ width: '36px', height: '36px', borderRadius: '10px', objectFit: 'cover' }} />
            ) : (
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: 'var(--secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'Poppins', fontSize: '18px', fontWeight: 800, color: 'var(--white)',
              }}>
                {companyName?.[0]?.toUpperCase() || 'C'}
              </div>
            )
          )}
          {!collapsed && (
            <button onClick={() => setCollapsed(true)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'rgba(255,255,255,0.5)', padding: '4px', flexShrink: 0,
            }}>
              <Icon name="ChevronLeft" size={18} />
            </button>
          )}
        </div>

        {/* Expand button when collapsed */}
        {collapsed && (
          <button onClick={() => setCollapsed(false)} style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.5)', padding: '12px',
            display: 'flex', justifyContent: 'center',
          }}>
            <Icon name="Menu" size={18} />
          </button>
        )}

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto', overflowX: 'hidden' }}>
          {navItems.map(item => (
            <NavItem key={item.to} {...item} collapsed={collapsed} />
          ))}
        </nav>

        {/* User */}
        <div style={{
          padding: '16px 8px',
          borderTop: '1px solid rgba(255,255,255,0.1)',
        }}>
          {!collapsed && (
            <div style={{ padding: '0 8px 12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '50%',
                background: 'var(--secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '14px', fontWeight: 700, color: 'var(--white)', flexShrink: 0,
              }}>
                {user?.username?.[0]?.toUpperCase()}
              </div>
              <div style={{ minWidth: 0 }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--white)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user?.fullName || user?.username}
                </p>
                <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', margin: 0, textTransform: 'capitalize' }}>
                  {user?.role}
                </p>
              </div>
            </div>
          )}
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: collapsed ? '10px' : '10px 12px',
            width: '100%', borderRadius: 'var(--radius)',
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.5)',
            justifyContent: collapsed ? 'center' : 'flex-start',
            transition: 'color var(--transition)',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#FC8181'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
          >
            <Icon name="Logout" size={16} />
            {!collapsed && <span style={{ fontSize: '13px' }}>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;
