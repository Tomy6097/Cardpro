import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { eventsAPI, invitationsAPI, guestsAPI } from '../api';
import toast from 'react-hot-toast';
import Button from '../components/common/Button';
import { Textarea } from '../components/common/Input';
import Badge from '../components/common/Badge';

const Invitations = () => {
  const { id: eventId } = useParams();
  const [channel, setChannel] = useState('sms');
  const [bulkFilter, setBulkFilter] = useState('all');
  const [mode, setMode] = useState('bulk');
  const [selectedGuests, setSelectedGuests] = useState(new Set());
  const [guestSearch, setGuestSearch] = useState('');
  const [sendingSelected, setSendingSelected] = useState(false);

  // Persist templates per channel in localStorage
  const smsKey   = `cardpro_sms_template_${eventId}`;
  const waKey    = `cardpro_wa_template_${eventId}`;
  const [smsTemplate, setSmsTemplate] = useState(() => localStorage.getItem(smsKey) || '');
  const [waTemplate,  setWaTemplate]  = useState(() => localStorage.getItem(waKey)  || '');

  const template    = channel === 'sms' ? smsTemplate : waTemplate;
  const setTemplate = (val) => {
    if (channel === 'sms') {
      setSmsTemplate(val);
      localStorage.setItem(smsKey, val);
    } else {
      setWaTemplate(val);
      localStorage.setItem(waKey, val);
    }
  };

  const { data: eventData } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventsAPI.getOne(eventId).then(r => r.data),
  });

  const { data: statsData, refetch: refetchStats } = useQuery({
    queryKey: ['invitation-stats', eventId],
    queryFn: () => invitationsAPI.getStats(eventId).then(r => r.data),
  });

  const { data: guestsData } = useQuery({
    queryKey: ['guests-invite', eventId, guestSearch],
    queryFn: () => guestsAPI.getAll(eventId, { search: guestSearch, limit: 100, isDeleted: false }).then(r => r.data),
    enabled: mode === 'select',
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

  const singleSMSMutation = useMutation({
    mutationFn: (d) => invitationsAPI.sendSMS(d),
    onSuccess: () => { refetchStats(); },
    onError: (err) => { /* handled per-guest */ },
  });

  const singleWAMutation = useMutation({
    mutationFn: (d) => invitationsAPI.sendWhatsApp(d),
    onSuccess: () => { refetchStats(); },
    onError: (err) => { /* handled per-guest */ },
  });

  const handleSendBulk = () => {
    const filter = bulkFilter === 'not_sent' ? { notSent: true } : bulkFilter === 'pending_rsvp' ? { rsvpStatus: 'pending' } : {};
    const payload = { eventId, customMessage: template || undefined, filter };
    if (channel === 'sms') bulkSMSMutation.mutate(payload);
    else bulkWAMutation.mutate(payload);
  };

  const handleSendSelected = async () => {
    if (selectedGuests.size === 0) { toast.error('Select at least one guest.'); return; }
    setSendingSelected(true);
    let sent = 0, failed = 0;
    for (const guestId of selectedGuests) {
      try {
        const payload = { guestId, customMessage: template || undefined };
        if (channel === 'sms') await singleSMSMutation.mutateAsync(payload);
        else await singleWAMutation.mutateAsync(payload);
        sent++;
      } catch { failed++; }
    }
    setSendingSelected(false);
    toast.success(`Sent: ${sent}, Failed: ${failed}`);
    setSelectedGuests(new Set());
    refetchStats();
  };

  const toggleGuest = (id) => {
    const s = new Set(selectedGuests);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelectedGuests(s);
  };

  const toggleAll = () => {
    const guests = guestsData?.guests || [];
    if (selectedGuests.size === guests.length) setSelectedGuests(new Set());
    else setSelectedGuests(new Set(guests.map(g => g._id)));
  };

  const stats = statsData?.stats || {};
  const ev = eventData?.event;
  const guests = guestsData?.guests || [];
  const isLoading = bulkSMSMutation.isPending || bulkWAMutation.isPending;

  const defaultSMSTemplate = `Dear {guestName},\n\nYou are cordially invited to {eventName} on {date} at {venue}.\n\nDress Code: {dressCode}\n\nConfirm attendance: {confirmUrl}\n\nYour Entry Code: {verificationCode}`;
  const defaultWATemplate = `Dear {guestName},\n\nYou are cordially invited to *{eventName}*\n\nDate: {date}\nVenue: {venue}\nDress Code: {dressCode}\n\nConfirm attendance: {confirmUrl}`;

  return (
    <div className="page-container fade-in">
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
        <Link to="/events" style={{ color: 'var(--primary)' }}>Events</Link>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        <Link to={`/events/${eventId}`} style={{ color: 'var(--primary)' }}>{ev?.name}</Link>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        <span>Invitations</span>
      </div>

      <h1 style={{ fontFamily: 'Poppins', fontSize: '22px', fontWeight: 700, color: 'var(--primary-dark)', marginBottom: '20px' }}>
        Invitation Center
      </h1>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px', marginBottom: '20px' }}>
        {[
          { label: 'Total Guests', value: stats.total, color: 'var(--primary)' },
          { label: 'SMS Sent', value: stats.smsSent, color: '#4F46E5' },
          { label: 'WhatsApp Sent', value: stats.whatsappSent, color: '#25D366' },
          { label: 'Not Sent', value: stats.notSent, color: 'var(--warning)' },
          { label: 'Failed', value: stats.failed, color: 'var(--danger)' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-light)', padding: '14px' }}>
            <p style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'Poppins', color: s.color, margin: '0 0 3px' }}>{s.value ?? 0}</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-light)', padding: '22px' }}>

        {/* Channel tabs */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
          {['sms', 'whatsapp'].map(c => (
            <button key={c} onClick={() => setChannel(c)} style={{
              padding: '9px 22px', borderRadius: 'var(--radius)',
              border: channel === c ? 'none' : '1px solid var(--border)',
              background: channel === c ? (c === 'whatsapp' ? '#25D366' : 'var(--primary)') : 'var(--white)',
              color: channel === c ? 'white' : 'var(--text-secondary)',
              fontSize: '14px', fontWeight: 500, cursor: 'pointer', fontFamily: 'Inter',
            }}>
              {c === 'whatsapp' ? 'WhatsApp' : 'SMS'}
            </button>
          ))}
        </div>

        {/* Send mode toggle */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', background: 'var(--cream)', borderRadius: 'var(--radius)', padding: '4px', width: 'fit-content' }}>
          {['bulk', 'select'].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              padding: '7px 18px', borderRadius: 'var(--radius-sm)',
              border: 'none', cursor: 'pointer',
              background: mode === m ? 'var(--white)' : 'transparent',
              color: mode === m ? 'var(--primary-dark)' : 'var(--text-muted)',
              fontSize: '13px', fontWeight: mode === m ? 600 : 400,
              fontFamily: 'Inter', boxShadow: mode === m ? 'var(--shadow-sm)' : 'none',
              transition: 'all 0.2s',
            }}>
              {m === 'bulk' ? 'Bulk Send' : 'Select Guests'}
            </button>
          ))}
        </div>

        {/* Message Template */}
        <div style={{ marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
              Message Template
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 400, marginLeft: '6px' }}>
                (auto-saved)
              </span>
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {template && (
                <span style={{ fontSize: '11px', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  Saved
                </span>
              )}
              {template && (
                <button
                  onClick={() => setTemplate('')}
                  style={{ fontSize: '11px', color: 'var(--text-muted)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
                >
                  Clear template
                </button>
              )}
            </div>
          </div>
          <Textarea
            value={template}
            onChange={e => setTemplate(e.target.value)}
            placeholder={channel === 'sms' ? defaultSMSTemplate : defaultWATemplate}
            rows={5}
          />
        </div>

        {/* Variables hint */}
        <div style={{ background: 'var(--info-light)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: '16px', fontSize: '12px', color: 'var(--info)' }}>
          <strong>Variables:</strong> {'{guestName}'}, {'{eventName}'}, {'{date}'}, {'{venue}'}, {'{dressCode}'}, {'{confirmUrl}'}, {'{verificationCode}'}
          <br/>
          <span style={{ opacity: 0.8 }}>Tip: Use {'{verificationCode}'} for guests with basic phones who cannot click links</span>
        </div>

        {/* BULK MODE */}
        {mode === 'bulk' && (
          <div>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>Send To</label>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { key: 'all', label: 'All Guests' },
                  { key: 'not_sent', label: 'Not Sent Yet' },
                  { key: 'pending_rsvp', label: 'Pending RSVP' },
                ].map(f => (
                  <button key={f.key} onClick={() => setBulkFilter(f.key)} style={{
                    padding: '7px 16px', borderRadius: 'var(--radius-sm)',
                    border: '1px solid ' + (bulkFilter === f.key ? 'var(--primary)' : 'var(--border)'),
                    background: bulkFilter === f.key ? 'var(--cream-dark)' : 'var(--white)',
                    color: bulkFilter === f.key ? 'var(--primary)' : 'var(--text-secondary)',
                    fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter',
                  }}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            <Button variant="primary" onClick={handleSendBulk} loading={isLoading} size="lg" fullWidth>
              Send {channel === 'whatsapp' ? 'WhatsApp' : 'SMS'} to {bulkFilter === 'all' ? 'All Guests' : bulkFilter === 'not_sent' ? 'Unsent Guests' : 'Pending RSVP'}
            </Button>
          </div>
        )}

        {/* SELECT MODE */}
        {mode === 'select' && (
          <div>
            {/* Search */}
            <div style={{ position: 'relative', marginBottom: '12px' }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}>
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <input
                type="text"
                placeholder="Search guests by name or phone..."
                value={guestSearch}
                onChange={e => setGuestSearch(e.target.value)}
                style={{ width: '100%', padding: '9px 14px 9px 36px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '13px', outline: 'none', fontFamily: 'Inter', boxSizing: 'border-box' }}
                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
            </div>

            {/* Select all bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px', padding: '8px 12px', background: 'var(--cream)', borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input type="checkbox" checked={guests.length > 0 && selectedGuests.size === guests.length} onChange={toggleAll} style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
                <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  {selectedGuests.size > 0 ? `${selectedGuests.size} selected` : 'Select all'}
                </span>
              </div>
              {selectedGuests.size > 0 && (
                <Button variant="primary" size="sm" loading={sendingSelected} onClick={handleSendSelected}>
                  Send {channel === 'whatsapp' ? 'WhatsApp' : 'SMS'} to {selectedGuests.size} guest{selectedGuests.size !== 1 ? 's' : ''}
                </Button>
              )}
            </div>

            {/* Guest list */}
            <div style={{ maxHeight: '380px', overflowY: 'auto', border: '1px solid var(--border-light)', borderRadius: 'var(--radius)' }}>
              {guests.length === 0 ? (
                <p style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '13px' }}>No guests found</p>
              ) : guests.map((g, i) => (
                <div key={g._id} onClick={() => toggleGuest(g._id)} style={{
                  display: 'flex', alignItems: 'center', gap: '12px',
                  padding: '10px 14px', cursor: 'pointer',
                  background: selectedGuests.has(g._id) ? 'var(--cream)' : i % 2 === 0 ? 'var(--white)' : 'var(--cream)',
                  borderBottom: '1px solid var(--border-light)',
                  transition: 'background 0.1s',
                }}>
                  <input type="checkbox" checked={selectedGuests.has(g._id)} onChange={() => toggleGuest(g._id)} onClick={e => e.stopPropagation()} style={{ cursor: 'pointer', width: '15px', height: '15px', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: '13px', color: 'var(--primary-dark)', margin: '0 0 1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.guestName}</p>
                    <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>{g.phone}</p>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <Badge status={g.ticketType} />
                    <Badge status={g.messageStatus} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Invitations;
