import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { eventsAPI } from '../api';
import Badge from '../components/common/Badge';
import { format } from 'date-fns';

const modules = [
  {
    key: 'guests',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
    title: 'Guest Management',
    desc: 'Add, import & manage guests',
    color: '#5C3D11',
    bg: '#FDF6EC',
  },
  {
    key: 'cards',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <path d="M8 21h8M12 17v4"/>
      </svg>
    ),
    title: 'Card & Template',
    desc: 'Upload template & generate cards',
    color: '#B8860B',
    bg: '#FEF9E7',
  },
  {
    key: 'invitations',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
        <polyline points="22,6 12,13 2,6"/>
      </svg>
    ),
    title: 'Send Invitations',
    desc: 'Send SMS & WhatsApp invites',
    color: '#4F46E5',
    bg: '#EEF2FF',
  },
  {
    key: 'rsvp',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    ),
    title: 'RSVP Dashboard',
    desc: 'Track attendance confirmations',
    color: '#2D6A4F',
    bg: '#ECFDF5',
  },
  {
    key: 'activity',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
      </svg>
    ),
    title: 'Activity Log',
    desc: 'All event activity history',
    color: '#8B6914',
    bg: '#FFFBEB',
  },
  {
    key: 'website',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10"/>
        <path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/>
      </svg>
    ),
    title: 'Website Editor',
    desc: 'Colors, dress code & event photos',
    color: '#7C3AED',
    bg: '#EDE9FE',
  },
];

const EventDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventsAPI.getOne(id).then(r => r.data),
  });

  const { data: statsData } = useQuery({
    queryKey: ['event-stats', id],
    queryFn: () => eventsAPI.getStats(id).then(r => r.data),
  });

  if (isLoading) return (
    <div className="page-container">
      <div className="skeleton" style={{ height: '200px', marginBottom: '16px' }} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
        {[...Array(5)].map((_, i) => <div key={i} className="skeleton" style={{ height: '100px' }} />)}
      </div>
    </div>
  );

  const ev = data?.event;
  const stats = statsData?.stats || {};
  if (!ev) return <div className="page-container"><p>Event not found.</p></div>;

  return (
    <div className="page-container fade-in">

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', fontSize: '13px', color: 'var(--text-muted)' }}>
        <Link to="/events" style={{ color: 'var(--primary)' }}>Events</Link>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        <span style={{ color: 'var(--primary-dark)', fontWeight: 500 }}>{ev.name}</span>
      </div>

      {/* Event Header Card */}
      <div style={{
        background: 'linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 100%)',
        borderRadius: 'var(--radius-lg)', padding: '28px 32px', marginBottom: '20px',
        color: 'var(--white)', position: 'relative', overflow: 'hidden',
      }}>
        {/* decoration */}
        <div style={{ position: 'absolute', top: '-40px', right: '-40px', width: '160px', height: '160px', borderRadius: '50%', background: 'rgba(201,168,76,0.1)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px', gap: '12px' }}>
          <div>
            <h1 style={{ fontFamily: 'Poppins', fontSize: '24px', fontWeight: 700, margin: '0 0 6px', color: '#FFFFFF' }}>{ev.name}</h1>
            <p style={{ margin: 0, opacity: 0.75, fontSize: '14px', color: 'rgba(255,255,255,0.85)' }}>Client: {ev.clientName}</p>
          </div>
          <Badge status={ev.status} />
        </div>

        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', fontSize: '13px', opacity: 0.9, marginBottom: '20px', color: 'rgba(255,255,255,0.9)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
            {ev.date ? format(new Date(ev.date), 'MMMM d, yyyy') : '—'}{ev.time && ` at ${ev.time}`}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
            {ev.venue}
          </span>
          {ev.dressCode && <span>Dress Code: {ev.dressCode}</span>}
        </div>

        {/* Stats bar */}
        <div style={{ display: 'flex', gap: '24px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.15)', flexWrap: 'wrap' }}>
          {[
            { label: 'Guests', value: stats.total },
            { label: 'Confirmed', value: stats.confirmed },
            { label: 'Pending', value: stats.pending },
            { label: 'Scanned', value: stats.scanned },
            { label: 'SMS', value: stats.smsSent },
            { label: 'WhatsApp', value: stats.whatsappSent },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'Poppins', margin: '0 0 2px', color: 'var(--secondary)' }}>{s.value ?? 0}</p>
              <p style={{ fontSize: '11px', opacity: 0.65, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Event Website link */}
      <div style={{
        background: 'var(--white)', borderRadius: 'var(--radius)',
        padding: '12px 20px', marginBottom: '24px',
        border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
        flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
            <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/>
          </svg>
          <div>
            <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>Event Website (Guest Link)</p>
            <code style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 500 }}>
              {window.location.origin}/event/{ev.slug}
            </code>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/event/${ev.slug}`); }} style={{
            padding: '7px 14px', borderRadius: 'var(--radius-sm)',
            background: 'var(--cream-dark)', color: 'var(--primary)',
            fontSize: '12px', fontWeight: 500, border: '1px solid var(--border)',
            cursor: 'pointer', fontFamily: 'Inter',
          }}>
            Copy Link
          </button>
          <a href={`/event/${ev.slug}`} target="_blank" rel="noreferrer" style={{
            padding: '7px 14px', borderRadius: 'var(--radius-sm)',
            background: 'var(--primary)', color: 'var(--white)',
            fontSize: '12px', fontWeight: 500, textDecoration: 'none',
          }}>
            Preview
          </a>
        </div>
      </div>

      {/* Module Navigation */}
      <h3 style={{ fontFamily: 'Poppins', fontSize: '14px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px' }}>
        Event Modules
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
        {modules.map(mod => (
          <div
            key={mod.key}
            onClick={() => navigate(`/events/${id}/${mod.key}`)}
            style={{
              background: 'var(--white)',
              borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow-sm)',
              border: '1px solid var(--border-light)',
              padding: '18px 20px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = 'var(--shadow-lg)';
              e.currentTarget.style.borderColor = mod.color + '40';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
              e.currentTarget.style.borderColor = 'var(--border-light)';
            }}
          >
            <div style={{
              width: '46px', height: '46px', borderRadius: 'var(--radius)',
              background: mod.bg, color: mod.color, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {mod.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <h4 style={{ fontFamily: 'Poppins', fontSize: '14px', fontWeight: 600, color: 'var(--primary-dark)', margin: '0 0 3px' }}>
                {mod.title}
              </h4>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>{mod.desc}</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" style={{ flexShrink: 0 }}>
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventDetail;
