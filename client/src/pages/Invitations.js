import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { eventsAPI, invitationsAPI, guestsAPI } from '../api';
import toast from 'react-hot-toast';
import Button from '../components/common/Button';
import { Textarea } from '../components/common/Input';

const Invitations = () => {
  const { id: eventId } = useParams();
  const [channel, setChannel] = useState('sms');
  const [template, setTemplate] = useState('');
  const [bulkFilter, setBulkFilter] = useState('all');

  const { data: eventData } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventsAPI.getOne(eventId).then(r => r.data),
  });

  const { data: statsData, refetch: refetchStats } = useQuery({
    queryKey: ['invitation-stats', eventId],
    queryFn: () => invitationsAPI.getStats(eventId).then(r => r.data),
  });

  const bulkSMSMutation = useMutation({
    mutationFn: (d) => invitationsAPI.sendBulkSMS(d),
    onSuccess: (r) => { toast.success(`SMS: ${r.data.sent} sent, ${r.data.failed} failed.`); refetchStats(); },
    onError: (err) => toast.error(err.message),
  });

  const bulkWAMutation = useMutation({
    mutationFn: (d) => invitationsAPI.sendBulkWhatsApp(d),
    onSuccess: (r) => { toast.success(`WhatsApp: ${r.data.sent} sent, ${r.data.failed} failed.`); refetchStats(); },
    onError: (err) => toast.error(err.message),
  });

  const handleSendBulk = () => {
    const filter = bulkFilter === 'not_sent' ? { notSent: true } : {};
    const payload = { eventId, customMessage: template || undefined, filter };
    if (channel === 'sms') bulkSMSMutation.mutate(payload);
    else bulkWAMutation.mutate(payload);
  };

  const stats = statsData?.stats || {};
  const ev = eventData?.event;
  const isLoading = bulkSMSMutation.isPending || bulkWAMutation.isPending;

  const defaultSMSTemplate = `Dear {guestName},\n\nYou are cordially invited to {eventName} on {date} at {venue}.\n\nDress Code: {dressCode}\n\nConfirm attendance: {confirmUrl}`;
  const defaultWATemplate = `Dear {guestName},\n\nYou are cordially invited to *{eventName}*\n\nDate: {date}\nVenue: {venue}\nDress Code: {dressCode}\n\nConfirm attendance: {confirmUrl}`;

  return (
    <div className="page-container fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
        <Link to="/events" style={{ color: 'var(--primary)' }}>Events</Link>
        <span>/</span>
        <Link to={`/events/${eventId}`} style={{ color: 'var(--primary)' }}>{ev?.name}</Link>
        <span>/</span>
        <span>Invitations</span>
      </div>

      <h1 style={{ fontFamily: 'Poppins', fontSize: '22px', fontWeight: 700, color: 'var(--primary-dark)', marginBottom: '24px' }}>
        Invitation Center
      </h1>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total Guests', value: stats.total, color: 'var(--primary)' },
          { label: 'SMS Sent', value: stats.smsSent, color: '#4F46E5' },
          { label: 'WhatsApp Sent', value: stats.whatsappSent, color: '#25D366' },
          { label: 'Not Sent', value: stats.notSent, color: 'var(--warning)' },
          { label: 'Failed', value: stats.failed, color: 'var(--danger)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-light)', padding: '16px' }}>
            <p style={{ fontSize: '24px', fontWeight: 700, fontFamily: 'Poppins', color: s.color, margin: '0 0 4px' }}>{s.value ?? 0}</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Channel tabs */}
      <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-light)', padding: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
          {['sms', 'whatsapp'].map(c => (
            <button key={c} onClick={() => setChannel(c)} style={{
              padding: '10px 24px', borderRadius: 'var(--radius)',
              border: channel === c ? 'none' : '1px solid var(--border)',
              background: channel === c ? (c === 'whatsapp' ? '#25D366' : 'var(--primary)') : 'var(--white)',
              color: channel === c ? 'var(--white)' : 'var(--text-secondary)',
              fontSize: '14px', fontWeight: 500, cursor: 'pointer',
              fontFamily: 'Inter',
            }}>
              {c === 'whatsapp' ? 'WhatsApp' : 'SMS'}
            </button>
          ))}
        </div>

        {/* Bulk send section */}
        <div>
          <h3 style={{ fontFamily: 'Poppins', fontSize: '15px', fontWeight: 600, color: 'var(--primary-dark)', marginBottom: '16px' }}>
            Bulk Send via {channel === 'whatsapp' ? 'WhatsApp' : 'SMS'}
          </h3>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Send To</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {['all', 'not_sent', 'pending_rsvp'].map(f => (
                <button key={f} onClick={() => setBulkFilter(f)} style={{
                  padding: '7px 16px', borderRadius: 'var(--radius-sm)',
                  border: '1px solid ' + (bulkFilter === f ? 'var(--primary)' : 'var(--border)'),
                  background: bulkFilter === f ? 'var(--cream-dark)' : 'var(--white)',
                  color: bulkFilter === f ? 'var(--primary)' : 'var(--text-secondary)',
                  fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter',
                }}>
                  {f === 'all' ? 'All Guests' : f === 'not_sent' ? 'Not Sent' : 'Pending RSVP'}
                </button>
              ))}
            </div>
          </div>

          <Textarea
            label="Message Template (optional — leave blank for default)"
            value={template}
            onChange={e => setTemplate(e.target.value)}
            placeholder={channel === 'sms' ? defaultSMSTemplate : defaultWATemplate}
            rows={6}
          />

          <div style={{ background: 'var(--info-light)', borderRadius: 'var(--radius-sm)', padding: '12px 16px', marginBottom: '20px', fontSize: '13px', color: 'var(--info)' }}>
            Available variables: {'{guestName}'}, {'{eventName}'}, {'{date}'}, {'{venue}'}, {'{dressCode}'}, {'{confirmUrl}'}
          </div>

          <Button variant="primary" onClick={handleSendBulk} loading={isLoading} size="lg">
            Send {channel === 'whatsapp' ? 'WhatsApp' : 'SMS'} to {bulkFilter === 'all' ? 'All Guests' : bulkFilter === 'not_sent' ? 'Unsent Guests' : 'Pending RSVP'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Invitations;
