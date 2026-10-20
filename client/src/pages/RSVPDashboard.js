import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { eventsAPI, rsvpAPI, guestsAPI } from '../api';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const RSVPDashboard = () => {
  const { id: eventId } = useParams();

  const { data: eventData } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventsAPI.getOne(eventId).then(r => r.data),
  });

  const { data: statsData, isLoading } = useQuery({
    queryKey: ['rsvp-stats', eventId],
    queryFn: () => rsvpAPI.getStats(eventId).then(r => r.data),
    refetchInterval: 30000,
  });

  // Fetch declined guests with reasons
  const { data: declinedData } = useQuery({
    queryKey: ['declined-guests', eventId],
    queryFn: () => guestsAPI.getAll(eventId, { rsvpStatus: 'declined', limit: 100 }).then(r => r.data),
  });

  // Fetch guests with messages — get all and filter client-side
  const { data: messagesData } = useQuery({
    queryKey: ['guest-messages', eventId],
    queryFn: () => guestsAPI.getAll(eventId, { limit: 500 }).then(r => r.data),
    refetchInterval: 30000,
  });
  const guestMessages = (messagesData?.guests || []).filter(g => g.guestMessage && g.guestMessage.trim());

  const stats = statsData?.stats || {};
  const ev = eventData?.event;
  const declinedGuests = (declinedData?.guests || []).filter(g => g.declineReason);

  const pieData = [
    { name: 'Confirmed', value: stats.confirmed || 0, color: '#2D6A4F' },
    { name: 'Pending', value: stats.pending || 0, color: '#C9A84C' },
    { name: 'Declined', value: stats.declined || 0, color: '#C44B4B' },
  ];

  return (
    <div className="page-container fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
        <Link to="/events" style={{ color: 'var(--primary)' }}>Events</Link>
        <span>/</span>
        <Link to={`/events/${eventId}`} style={{ color: 'var(--primary)' }}>{ev?.name}</Link>
        <span>/</span>
        <span>RSVP</span>
      </div>

      <h1 style={{ fontFamily: 'Poppins', fontSize: '22px', fontWeight: 700, color: 'var(--primary-dark)', marginBottom: '24px' }}>
        RSVP Dashboard
      </h1>

      {isLoading ? (
        <div className="skeleton" style={{ height: '300px' }} />
      ) : (
        <>
          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: 'Total Guests', value: stats.total, color: '#5C3D11', bg: '#FDF6EC' },
              { label: 'Confirmed', value: stats.confirmed, pct: stats.confirmedPct, color: '#2D6A4F', bg: '#D1FAE5' },
              { label: 'Pending', value: stats.pending, pct: stats.pendingPct, color: '#92400E', bg: '#FEF3C7' },
              { label: 'Declined', value: stats.declined, pct: stats.declinedPct, color: '#991B1B', bg: '#FEE2E2' },
            ].map(s => (
              <div key={s.label} style={{
                background: s.bg, borderRadius: 'var(--radius)',
                padding: '20px', border: '1px solid ' + s.color + '30',
              }}>
                <h3 style={{ fontFamily: 'Poppins', fontSize: '32px', fontWeight: 700, color: s.color, margin: '0 0 4px' }}>
                  {s.value ?? 0}
                </h3>
                <p style={{ fontSize: '13px', color: s.color, margin: 0, opacity: 0.8 }}>{s.label}</p>
                {s.pct !== undefined && (
                  <div style={{ marginTop: '10px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.5)', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                      <div style={{ width: `${s.pct}%`, height: '100%', background: s.color, borderRadius: '4px', transition: 'width 0.5s ease' }} />
                    </div>
                    <p style={{ fontSize: '11px', color: s.color, margin: '4px 0 0', opacity: 0.7 }}>{s.pct}%</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Chart */}
          <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-light)', padding: '24px' }}>
            <h3 style={{ fontFamily: 'Poppins', fontSize: '15px', fontWeight: 600, color: 'var(--primary-dark)', marginBottom: '20px' }}>
              RSVP Breakdown
            </h3>
            {stats.total > 0 ? (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} innerRadius={60} paddingAngle={3} label={({ name, pct }) => `${name} ${pct}%`}>
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => v.toLocaleString()} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '60px 0' }}>
                No RSVP data yet. Send invitations to guests first.
              </p>
            )}
          </div>

          {/* Decline Reasons */}
          {declinedGuests.length > 0 && (
            <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-light)', padding: '24px', marginTop: '20px' }}>
              <h3 style={{ fontFamily: 'Poppins', fontSize: '15px', fontWeight: 600, color: 'var(--primary-dark)', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--danger)" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                Decline Reasons
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 16px' }}>
                {declinedGuests.length} guests who declined and provided reasons
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {declinedGuests.map(g => (
                  <div key={g._id} style={{
                    display: 'flex', alignItems: 'flex-start', gap: '14px',
                    padding: '14px 16px',
                    background: '#FEF2F2',
                    borderRadius: 'var(--radius)',
                    border: '1px solid #FECACA',
                  }}>
                    {/* Avatar */}
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      background: '#991B1B', color: 'white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '14px', fontWeight: 700, fontFamily: 'Poppins',
                      flexShrink: 0,
                    }}>
                      {g.guestName[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                        <p style={{ fontWeight: 600, fontSize: '14px', color: '#991B1B', margin: 0, fontFamily: 'Poppins' }}>
                          {g.guestName}
                        </p>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'white', padding: '2px 8px', borderRadius: '20px', border: '1px solid #FECACA' }}>
                          {g.ticketType}
                        </span>
                        {g.rsvpAt && (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {new Date(g.rsvpAt).toLocaleDateString('sw-TZ', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                        )}
                      </div>
                      <p style={{
                        fontSize: '13px', color: '#7F1D1D', margin: 0,
                        fontStyle: 'italic', lineHeight: 1.5,
                        background: 'white', padding: '8px 12px',
                        borderRadius: '8px', border: '1px solid #FECACA',
                      }}>
                        "{g.declineReason}"
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Guest Messages to Couple */}
          {guestMessages.length > 0 && (
            <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-light)', padding: '24px', marginTop: '20px' }}>
              <h3 style={{ fontFamily: 'Poppins', fontSize: '15px', fontWeight: 600, color: 'var(--primary-dark)', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--secondary)" strokeWidth="2">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
                </svg>
                Messages from Guests
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 16px' }}>
                {guestMessages.length} guest{guestMessages.length !== 1 ? 's' : ''} left a message
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {guestMessages.map(g => (
                  <div key={g._id} style={{
                    display: 'flex', alignItems: 'flex-start', gap: '14px',
                    padding: '16px', background: '#FFFBEB',
                    borderRadius: 'var(--radius)', border: '1px solid #FDE68A',
                  }}>
                    {/* Avatar */}
                    <div style={{
                      width: '38px', height: '38px', borderRadius: '50%',
                      background: 'var(--secondary)', color: '#3a1f00',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '15px', fontWeight: 700, fontFamily: 'Poppins', flexShrink: 0,
                    }}>
                      {g.guestName[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                        <p style={{ fontWeight: 600, fontSize: '14px', color: 'var(--primary-dark)', margin: 0, fontFamily: 'Poppins' }}>
                          {g.guestName}
                        </p>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'white', padding: '2px 8px', borderRadius: '20px', border: '1px solid #FDE68A' }}>
                          {g.ticketType}
                        </span>
                        {g.messageAt && (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            {new Date(g.messageAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                      <p style={{
                        fontSize: '14px', color: '#78350F', margin: 0,
                        fontStyle: 'italic', lineHeight: 1.6,
                        background: 'white', padding: '10px 14px',
                        borderRadius: '8px', border: '1px solid #FDE68A',
                      }}>
                        "{g.guestMessage}"
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default RSVPDashboard;
