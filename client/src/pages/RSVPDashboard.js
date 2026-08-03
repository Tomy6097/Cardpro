import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { eventsAPI, rsvpAPI } from '../api';
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

  const stats = statsData?.stats || {};
  const ev = eventData?.event;

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
        </>
      )}
    </div>
  );
};

export default RSVPDashboard;
