import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { dashboardAPI } from '../api';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { format } from 'date-fns';

const StatBox = ({ label, value, color = 'var(--primary)', icon }) => (
  <div style={{
    background: 'var(--white)', borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-light)',
    padding: '20px 24px', display: 'flex', alignItems: 'center',
    justifyContent: 'space-between',
  }}>
    <div>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 6px', fontWeight: 500 }}>{label}</p>
      <h3 style={{ fontFamily: 'Poppins', fontSize: '30px', fontWeight: 700, color: 'var(--primary-dark)', margin: 0 }}>
        {(value ?? 0).toLocaleString()}
      </h3>
    </div>
    <div style={{
      width: '48px', height: '48px', borderRadius: 'var(--radius)',
      background: color + '18',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '22px',
    }}>
      {icon}
    </div>
  </div>
);

const actionLabel = (action) => {
  const map = {
    login: 'User logged in', logout: 'User logged out',
    create_event: 'Event created', update_event: 'Event updated', delete_event: 'Event deleted',
    add_guest: 'Guest added', import_guests: 'Guests imported', delete_guest: 'Guest deleted',
    generate_qr: 'QR codes generated', generate_card: 'Card generated', generate_all_cards: 'All cards generated',
    send_sms: 'SMS sent', send_whatsapp: 'WhatsApp sent', send_bulk_sms: 'Bulk SMS sent',
    scan_entry: 'Entry scanned', scan_duplicate: 'Duplicate scan', scan_invalid: 'Invalid scan',
    rsvp_confirm: 'RSVP confirmed', rsvp_decline: 'RSVP declined',
    download_pdf: 'PDF downloaded', download_csv: 'CSV downloaded',
  };
  return map[action] || action;
};

const Dashboard = () => {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => dashboardAPI.getStats().then(r => r.data),
    refetchInterval: 60000,
  });

  const stats = data?.stats || {};
  const charts = data?.charts || {};
  const activity = data?.recentActivity || [];

  const COLORS = ['#5C3D11', '#2D6A4F', '#C44B4B', '#8B6914'];

  return (
    <div className="page-container fade-in">
      {/* Page header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: 'Poppins', fontSize: '24px', fontWeight: 700, color: 'var(--primary-dark)', margin: 0 }}>
          Dashboard
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '4px 0 0' }}>
          {format(new Date(), 'EEEE, MMMM d, yyyy')}
        </p>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        <StatBox label="Total Events" value={stats.totalEvents} icon="📅" color="#5C3D11" />
        <StatBox label="Active Events" value={stats.activeEvents} icon="✅" color="#2D6A4F" />
        <StatBox label="Today's Events" value={stats.todayEvents} icon="📌" color="#C9A84C" />
        <StatBox label="Total Guests" value={stats.totalGuests} icon="👥" color="#5C3D11" />
        <StatBox label="Confirmed RSVPs" value={stats.confirmedGuests} icon="✔" color="#2D6A4F" />
        <StatBox label="Pending RSVPs" value={stats.pendingGuests} icon="⏳" color="#C9A84C" />
        <StatBox label="Scanned Entries" value={stats.scannedGuests} icon="📲" color="#5C3D11" />
        <StatBox label="SMS Sent" value={stats.smsSent} icon="💬" color="#4F46E5" />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', marginBottom: '24px' }}>
        {/* Guest trend */}
        <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-light)', padding: '24px' }}>
          <h3 style={{ fontFamily: 'Poppins', fontSize: '15px', fontWeight: 600, color: 'var(--primary-dark)', margin: '0 0 20px' }}>
            Guest Registrations (Last 7 Days)
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={charts.guestTrend || []}>
              <defs>
                <linearGradient id="guestGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#5C3D11" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#5C3D11" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
              <XAxis dataKey="date" tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontSize: 12, fill: 'var(--text-muted)' }} />
              <Tooltip contentStyle={{ borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontFamily: 'Inter' }} />
              <Area type="monotone" dataKey="guests" stroke="#5C3D11" fill="url(#guestGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* RSVP Pie */}
        <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-light)', padding: '24px' }}>
          <h3 style={{ fontFamily: 'Poppins', fontSize: '15px', fontWeight: 600, color: 'var(--primary-dark)', margin: '0 0 20px' }}>
            RSVP Overview
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={charts.rsvpStatus || []} dataKey="value" nameKey="label" cx="50%" cy="50%" outerRadius={70} innerRadius={40}>
                {(charts.rsvpStatus || []).map((entry, index) => (
                  <Cell key={index} fill={entry.color || COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v, n) => [v.toLocaleString(), n]} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
            {(charts.rsvpStatus || []).map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '13px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: item.color }} />
                  <span style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                </div>
                <span style={{ fontWeight: 600, color: 'var(--primary-dark)' }}>{item.value?.toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-light)', padding: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ fontFamily: 'Poppins', fontSize: '15px', fontWeight: 600, color: 'var(--primary-dark)', margin: 0 }}>
            Recent Activity
          </h3>
          <Link to="/activity" style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 500 }}>
            View All
          </Link>
        </div>
        {activity.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', padding: '24px 0' }}>
            No activity recorded yet.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            {activity.map((log, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '14px',
                padding: '10px 0',
                borderBottom: i < activity.length - 1 ? '1px solid var(--border-light)' : 'none',
              }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: 'var(--cream-dark)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, color: 'var(--primary)',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
                  </svg>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>
                    {actionLabel(log.action)}
                  </p>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                    {log.description} {log.event?.name && `• ${log.event.name}`}
                  </p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>
                    {log.userName}
                  </p>
                  <p style={{ margin: 0, fontSize: '11px', color: 'var(--text-muted)' }}>
                    {format(new Date(log.createdAt), 'MMM d, HH:mm')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
