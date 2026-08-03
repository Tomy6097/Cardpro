import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { eventsAPI } from '../api';
import Badge from '../components/common/Badge';
import { format } from 'date-fns';

const NavCard = ({ to, icon, title, desc, color }) => {
  const navigate = useNavigate();
  return (
    <div onClick={() => navigate(to)} style={{
      background: 'var(--white)', borderRadius: 'var(--radius)',
      boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-light)',
      padding: '20px', cursor: 'pointer',
      transition: 'all var(--transition)',
      display: 'flex', alignItems: 'center', gap: '16px',
    }}
    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = 'var(--shadow-lg)'; }}
    onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
    >
      <div style={{
        width: '48px', height: '48px', borderRadius: 'var(--radius)',
        background: color + '20', color, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '22px',
      }}>{icon}</div>
      <div>
        <h4 style={{ fontFamily: 'Poppins', fontSize: '15px', fontWeight: 600, color: 'var(--primary-dark)', margin: '0 0 4px' }}>{title}</h4>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>{desc}</p>
      </div>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" style={{ marginLeft: 'auto' }}>
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </div>
  );
};

const EventDetail = () => {
  const { id } = useParams();
  const { data, isLoading } = useQuery({
    queryKey: ['event', id],
    queryFn: () => eventsAPI.getOne(id).then(r => r.data),
  });

  const { data: statsData } = useQuery({
    queryKey: ['event-stats', id],
    queryFn: () => eventsAPI.getStats(id).then(r => r.data),
  });

  if (isLoading) return <div className="page-container"><div className="skeleton" style={{ height: '300px' }} /></div>;

  const ev = data?.event;
  const stats = statsData?.stats || {};

  if (!ev) return <div className="page-container"><p>Event not found.</p></div>;

  return (
    <div className="page-container fade-in">
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', fontSize: '13px', color: 'var(--text-muted)' }}>
        <Link to="/events" style={{ color: 'var(--primary)' }}>Events</Link>
        <span>/</span>
        <span>{ev.name}</span>
      </div>

      {/* Event Header */}
      <div style={{
        background: 'linear-gradient(135deg, var(--primary-dark) 0%, var(--primary) 100%)',
        borderRadius: 'var(--radius-lg)', padding: '28px 32px', marginBottom: '24px',
        color: 'var(--white)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h1 style={{ fontFamily: 'Poppins', fontSize: '26px', fontWeight: 700, margin: '0 0 6px' }}>{ev.name}</h1>
            <p style={{ margin: 0, opacity: 0.8, fontSize: '15px' }}>{ev.clientName}</p>
          </div>
          <Badge status={ev.status} />
        </div>
        <div style={{ display: 'flex', gap: '28px', flexWrap: 'wrap', opacity: 0.9, fontSize: '14px' }}>
          <span>{ev.date ? format(new Date(ev.date), 'MMMM d, yyyy') : '—'} {ev.time && `at ${ev.time}`}</span>
          <span>{ev.venue}</span>
          {ev.dressCode && <span>Dress: {ev.dressCode}</span>}
        </div>

        {/* Stats bar */}
        <div style={{ display: 'flex', gap: '28px', marginTop: '20px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.2)', flexWrap: 'wrap' }}>
          {[
            { label: 'Total Guests', value: stats.total },
            { label: 'Confirmed', value: stats.confirmed },
            { label: 'Pending', value: stats.pending },
            { label: 'Scanned', value: stats.scanned },
            { label: 'SMS Sent', value: stats.smsSent },
            { label: 'WhatsApp', value: stats.whatsappSent },
          ].map(s => (
            <div key={s.label}>
              <p style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'Poppins', margin: '0 0 2px' }}>{s.value ?? 0}</p>
              <p style={{ fontSize: '12px', opacity: 0.7, margin: 0 }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Event Website link */}
      <div style={{
        background: 'var(--white)', borderRadius: 'var(--radius)',
        padding: '14px 20px', marginBottom: '24px',
        border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/></svg>
          <div>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-muted)' }}>Event Website</p>
            <code style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 500 }}>
              {window.location.origin}/event/{ev.slug}
            </code>
          </div>
        </div>
        <a href={`/event/${ev.slug}`} target="_blank" rel="noreferrer" style={{
          padding: '7px 16px', borderRadius: 'var(--radius-sm)',
          background: 'var(--cream-dark)', color: 'var(--primary)',
          fontSize: '13px', fontWeight: 500, textDecoration: 'none',
          border: '1px solid var(--border)',
        }}>
          Preview
        </a>
      </div>

      {/* Navigation cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
        <NavCard to={`/events/${id}/guests`} icon="👥" title="Guest Management" desc="Add, import, and manage guests" color="#5C3D11" />
        <NavCard to={`/events/${id}/cards`} icon="🎫" title="Digital Cards" desc="Generate personalized invitation cards" color="#C9A84C" />
        <NavCard to={`/events/${id}/invitations`} icon="💬" title="Invitation Center" desc="Send SMS & WhatsApp invitations" color="#4F46E5" />
        <NavCard to={`/events/${id}/rsvp`} icon="✅" title="RSVP Dashboard" desc="Track attendance confirmations" color="#2D6A4F" />
        <NavCard to={`/events/${id}/activity`} icon="📋" title="Activity Log" desc="View all event activity" color="#8B6914" />
      </div>
    </div>
  );
};

export default EventDetail;
