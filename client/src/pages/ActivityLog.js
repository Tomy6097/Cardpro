import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { activityAPI, eventsAPI } from '../api';
import { format } from 'date-fns';

const actionColors = {
  login: '#2D6A4F', logout: '#6B7280',
  create_event: '#5C3D11', delete_event: '#C44B4B',
  add_guest: '#2D6A4F', delete_guest: '#C44B4B', restore_guest: '#2D6A4F',
  generate_qr: '#C9A84C', generate_card: '#C9A84C',
  send_sms: '#4F46E5', send_whatsapp: '#25D366',
  scan_entry: '#2D6A4F', scan_duplicate: '#F59E0B', scan_invalid: '#C44B4B',
  rsvp_confirm: '#2D6A4F', rsvp_decline: '#C44B4B',
};

const ActionBadge = ({ action }) => {
  const color = actionColors[action] || '#6B7280';
  const label = action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', borderRadius: '12px',
      fontSize: '11px', fontWeight: 600,
      background: color + '18', color,
      whiteSpace: 'nowrap',
    }}>{label}</span>
  );
};

const ActivityLog = () => {
  const { id: eventId } = useParams();
  const [page, setPage] = useState(1);

  const { data: eventData } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventsAPI.getOne(eventId).then(r => r.data),
    enabled: !!eventId,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['activity', eventId, page],
    queryFn: () => eventId
      ? activityAPI.getEventLogs(eventId, { page, limit: 50 }).then(r => r.data)
      : activityAPI.getLogs({ page, limit: 50 }).then(r => r.data),
    keepPreviousData: true,
  });

  const logs = data?.logs || [];
  const pagination = data?.pagination || {};
  const ev = eventData?.event;

  return (
    <div className="page-container fade-in">
      {eventId && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
          <Link to="/events" style={{ color: 'var(--primary)' }}>Events</Link>
          <span>/</span>
          <Link to={`/events/${eventId}`} style={{ color: 'var(--primary)' }}>{ev?.name}</Link>
          <span>/</span>
          <span>Activity Log</span>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: 'Poppins', fontSize: '22px', fontWeight: 700, color: 'var(--primary-dark)', margin: 0 }}>
            {eventId ? 'Event Activity Log' : 'System Activity Log'}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0' }}>
            {pagination.total || 0} total records
          </p>
        </div>
      </div>

      <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-light)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--cream)', borderBottom: '1px solid var(--border)' }}>
                {['Timestamp', 'Action', 'Description', 'User', 'IP Address'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={5} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>No activity records found.</td></tr>
              ) : logs.map((log, i) => (
                <tr key={log._id} style={{ borderBottom: '1px solid var(--border-light)', background: i % 2 === 0 ? 'var(--white)' : 'var(--cream)' }}>
                  <td style={{ padding: '11px 16px', whiteSpace: 'nowrap', fontSize: '12px', color: 'var(--text-muted)' }}>
                    {format(new Date(log.createdAt), 'MMM d, yyyy HH:mm:ss')}
                  </td>
                  <td style={{ padding: '11px 16px' }}>
                    <ActionBadge action={log.action} />
                  </td>
                  <td style={{ padding: '11px 16px', fontSize: '13px', color: 'var(--text-primary)', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.description}
                    {log.event?.name && <span style={{ color: 'var(--text-muted)' }}> — {log.event.name}</span>}
                  </td>
                  <td style={{ padding: '11px 16px', fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {log.userName || log.user?.username || '—'}
                  </td>
                  <td style={{ padding: '11px 16px', fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {log.ipAddress || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {pagination.pages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px', borderTop: '1px solid var(--border-light)' }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
              style={{ padding: '6px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--white)', cursor: page > 1 ? 'pointer' : 'not-allowed', opacity: page <= 1 ? 0.5 : 1 }}>
              Previous
            </button>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Page {page} of {pagination.pages} ({pagination.total} records)
            </span>
            <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page >= pagination.pages}
              style={{ padding: '6px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--white)', cursor: page < pagination.pages ? 'pointer' : 'not-allowed', opacity: page >= pagination.pages ? 0.5 : 1 }}>
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ActivityLog;
