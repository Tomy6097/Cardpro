import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../api';
import toast from 'react-hot-toast';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) {
      toast.error('Please enter username and password.');
      return;
    }
    setLoading(true);
    try {
      const res = await authAPI.login(form);
      login(res.data.token, res.data.user);
      toast.success(`Welcome back, ${res.data.user.fullName || res.data.user.username}.`);
      navigate(res.data.user.role === 'scanner' ? '/scanner' : '/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      background: 'linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 50%, var(--primary-light) 100%)',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'absolute', top: '-100px', right: '-100px',
        width: '400px', height: '400px', borderRadius: '50%',
        background: 'rgba(201,168,76,0.1)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '-80px', left: '-80px',
        width: '300px', height: '300px', borderRadius: '50%',
        background: 'rgba(201,168,76,0.08)',
        pointerEvents: 'none',
      }} />

      {/* Left panel */}
      <div style={{
        flex: 1, display: 'none', flexDirection: 'column', justifyContent: 'center',
        padding: '60px', position: 'relative', zIndex: 1,
        '@media (min-width: 1024px)': { display: 'flex' },
      }}>
        <div style={{ maxWidth: '460px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '48px' }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '14px',
              background: 'var(--secondary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Poppins', fontSize: '26px', fontWeight: 800, color: 'var(--white)',
            }}>C</div>
            <span style={{ fontFamily: 'Poppins', fontSize: '28px', fontWeight: 700, color: 'var(--white)' }}>Cardpro</span>
          </div>
          <h1 style={{ fontFamily: 'Poppins', fontSize: '40px', fontWeight: 700, color: 'var(--white)', marginBottom: '20px', lineHeight: 1.2 }}>
            Professional Event Management Platform
          </h1>
          <p style={{ fontSize: '16px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, marginBottom: '40px' }}>
            Manage events, guests, digital invitations, QR scanning, and RSVP tracking — all in one place.
          </p>
          {[
            'Unlimited events with isolated data',
            'Smart QR code entry scanning',
            'WhatsApp & SMS invitation delivery',
            'Real-time RSVP and analytics',
          ].map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
              <div style={{
                width: '24px', height: '24px', borderRadius: '50%',
                background: 'var(--secondary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
              <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '14px' }}>{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel - Login Form */}
      <div style={{
        width: '100%', maxWidth: '480px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 32px',
        position: 'relative', zIndex: 1,
      }}>
        <div style={{
          background: 'var(--white)', borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-xl)',
          padding: '40px', width: '100%',
        }}>
          {/* Mobile logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px',
              background: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Poppins', fontSize: '22px', fontWeight: 800, color: 'var(--secondary)',
            }}>C</div>
            <div>
              <h2 style={{ fontFamily: 'Poppins', fontSize: '20px', fontWeight: 700, color: 'var(--primary-dark)', margin: 0 }}>Cardpro</h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>Event Management Platform</p>
            </div>
          </div>

          <h3 style={{ fontFamily: 'Poppins', fontSize: '24px', fontWeight: 600, color: 'var(--primary-dark)', marginBottom: '8px' }}>
            Sign In
          </h3>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '28px' }}>
            Access your dashboard to manage events
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                Username
              </label>
              <input
                type="text" name="username" value={form.username} onChange={handleChange}
                placeholder="Enter username"
                autoComplete="username" autoFocus
                style={{
                  width: '100%', padding: '12px 16px',
                  border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                  fontSize: '14px', color: 'var(--text-primary)',
                  outline: 'none', transition: 'border-color var(--transition)',
                  fontFamily: 'Inter, sans-serif',
                }}
                onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(92,61,17,0.1)'; }}
                onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'} name="password" value={form.password} onChange={handleChange}
                  placeholder="Enter password"
                  autoComplete="current-password"
                  style={{
                    width: '100%', padding: '12px 44px 12px 16px',
                    border: '1px solid var(--border)', borderRadius: 'var(--radius)',
                    fontSize: '14px', color: 'var(--text-primary)',
                    outline: 'none', transition: 'border-color var(--transition)',
                    fontFamily: 'Inter, sans-serif',
                  }}
                  onFocus={e => { e.target.style.borderColor = 'var(--primary)'; e.target.style.boxShadow = '0 0 0 3px rgba(92,61,17,0.1)'; }}
                  onBlur={e => { e.target.style.borderColor = 'var(--border)'; e.target.style.boxShadow = 'none'; }}
                />
                <button type="button" onClick={() => setShowPassword(p => !p)} style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', display: 'flex', alignItems: 'center',
                }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    {showPassword
                      ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
                      : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
                    }
                  </svg>
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '13px',
              background: loading ? 'var(--text-muted)' : 'var(--primary)',
              color: 'var(--white)', border: 'none',
              borderRadius: 'var(--radius)', fontSize: '15px',
              fontWeight: 600, fontFamily: 'Poppins, sans-serif',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background var(--transition)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          {/* Contact */}
          <div style={{
            marginTop: '32px', paddingTop: '24px',
            borderTop: '1px solid var(--border-light)',
            display: 'flex', justifyContent: 'center', gap: '24px',
          }}>
            <a href="https://wa.me/255754696878" target="_blank" rel="noreferrer" style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              color: 'var(--text-muted)', fontSize: '13px', textDecoration: 'none',
              transition: 'color var(--transition)',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#25D366'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
              WhatsApp
            </a>
            <a href="tel:+255754696878" style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              color: 'var(--text-muted)', fontSize: '13px', textDecoration: 'none',
              transition: 'color var(--transition)',
            }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--primary)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.67 19.79 19.79 0 01.07 2.05 2 2 0 012.06 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92z"/></svg>
              Call
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
