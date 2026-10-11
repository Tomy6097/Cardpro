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
  
  // ✅ NEW: WhatsApp sending mode (template vs custom)
  const [whatsappMode, setWhatsappMode] = useState('template'); // 'template' or 'custom'

  // SMS cost calculator
  const SMS_COST_TZS = 25; // TSh per SMS part (Beem Africa approximate)
  const calcSMS = (text) => {
    if (!text) return { parts: 0, chars: 0, charsPerPart: 160, remaining: 160, totalChars: 0 };
    // Check if text has non-GSM7 characters (Unicode SMS = 70 chars/part)
    const gsm7 = /^[\x00-\x7F\u00C0-\u00FF£¥€§¿¡ÄÅÆÇÉÑÖØÜßàäåæèéìñòöøùü@\n\r\f !"#$%&'()*+,\-./:;<=>?^_`{|}~]*$/;
    const isUnicode = !gsm7.test(text);
    const charsPerPart = isUnicode ? 70 : 160;
    const chars = text.length;
    const parts = Math.ceil(chars / charsPerPart) || 1;
    const remaining = (parts * charsPerPart) - chars;
    return { parts, chars, charsPerPart, remaining, isUnicode, totalChars: chars };
  };

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
    onSuccess: (r) => { 
      const data = r.data;
      const hasErrors = data.failed > 0;
      
      if (hasErrors && data.errors && data.errors.length > 0) {
        // Show summary with first few errors
        const firstError = data.errors[0];
        toast.error(
          <div>
            <div style={{ fontWeight: 600 }}>WhatsApp: {data.sent} sent, {data.failed} failed</div>
            <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.9 }}>
              First error: {firstError.error}
            </div>
            <div style={{ fontSize: '11px', marginTop: '4px', opacity: 0.7 }}>
              Check Activity Log for full details
            </div>
          </div>,
          { duration: 10000 }
        );
      } else {
        toast.success(`WhatsApp: ${data.sent} sent successfully!`);
      }
      
      refetchStats(); 
    },
    onError: (err) => {
      const errorMsg = err.response?.data?.message || err.message || 'Bulk WhatsApp send failed';
      const suggestion = err.response?.data?.suggestion;
      
      toast.error(
        <div>
          <div style={{ fontWeight: 600 }}>{errorMsg}</div>
          {suggestion && <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.9 }}>{suggestion}</div>}
        </div>,
        { duration: 8000 }
      );
    },
  });

  const singleSMSMutation = useMutation({
    mutationFn: (d) => invitationsAPI.sendSMS(d),
    onSuccess: () => { refetchStats(); },
    onError: (err) => { /* handled per-guest */ },
  });

  const singleWAMutation = useMutation({
    mutationFn: (d) => invitationsAPI.sendWhatsApp(d),
    onSuccess: (response) => { 
      refetchStats(); 
      toast.success(response.data.message || 'WhatsApp sent!');
    },
    onError: (err) => { 
      const errorMsg = err.response?.data?.message || err.message || 'Failed to send WhatsApp';
      const suggestion = err.response?.data?.suggestion;
      const errorCode = err.response?.data?.errorCode;
      
      // Show detailed error with suggestion
      toast.error(
        <div>
          <div style={{ fontWeight: 600, marginBottom: '4px' }}>{errorMsg}</div>
          {suggestion && <div style={{ fontSize: '12px', opacity: 0.9 }}>{suggestion}</div>}
          {errorCode && <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '4px' }}>Code: {errorCode}</div>}
        </div>,
        { duration: 8000 }
      );
    },
  });

  const handleSendBulk = () => {
    const filter = bulkFilter === 'not_sent' ? { notSent: true } : bulkFilter === 'pending_rsvp' ? { rsvpStatus: 'pending' } : {};
    
    // ✅ Prepare payload based on channel and mode
    const payload = { eventId, filter };
    
    // For WhatsApp: if template mode, don't send customMessage (uses approved template)
    if (channel === 'whatsapp' && whatsappMode === 'template') {
      payload.useTemplate = true; // Use approved template
    } else {
      payload.customMessage = template || undefined; // Use custom/plain text
      payload.useTemplate = false;
    }
    
    if (channel === 'sms') bulkSMSMutation.mutate(payload);
    else bulkWAMutation.mutate(payload);
  };

  const handleSendSelected = async () => {
    if (selectedGuests.size === 0) { toast.error('Select at least one guest.'); return; }
    setSendingSelected(true);
    let sent = 0, failed = 0;
    for (const guestId of selectedGuests) {
      try {
        // ✅ Prepare payload based on channel and mode
        const payload = { guestId };
        
        if (channel === 'whatsapp' && whatsappMode === 'template') {
          payload.useTemplate = true; // Use approved template
        } else {
          payload.customMessage = template || undefined;
          payload.useTemplate = false;
        }
        
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

        {/* ✅ NEW: WhatsApp Mode Selector (only show when WhatsApp is selected) */}
        {channel === 'whatsapp' && (
          <div style={{ marginBottom: '20px', background: 'var(--info-light)', borderRadius: 'var(--radius)', padding: '14px', border: '1px solid #BFDBFE' }}>
            <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary-dark)', display: 'block', marginBottom: '10px' }}>
              WhatsApp Sending Mode
            </label>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setWhatsappMode('template')}
                style={{
                  flex: 1,
                  minWidth: '200px',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius)',
                  border: whatsappMode === 'template' ? '2px solid #25D366' : '1px solid var(--border)',
                  background: whatsappMode === 'template' ? '#F0FDF4' : 'var(--white)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'start', gap: '10px' }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: whatsappMode === 'template' ? '6px solid #25D366' : '2px solid var(--border)',
                    flexShrink: 0,
                    marginTop: '2px',
                  }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--primary-dark)', marginBottom: '4px' }}>
                      🎨 Template Mode
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                      Uses approved template with image & button
                      <br />
                      <span style={{ color: '#25D366', fontWeight: 500 }}>✓ Recommended for wedding!</span>
                    </div>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setWhatsappMode('custom')}
                style={{
                  flex: 1,
                  minWidth: '200px',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius)',
                  border: whatsappMode === 'custom' ? '2px solid var(--primary)' : '1px solid var(--border)',
                  background: whatsappMode === 'custom' ? 'var(--cream)' : 'var(--white)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'start', gap: '10px' }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    border: whatsappMode === 'custom' ? '6px solid var(--primary)' : '2px solid var(--border)',
                    flexShrink: 0,
                    marginTop: '2px',
                  }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--primary-dark)', marginBottom: '4px' }}>
                      📝 Custom Text
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.4' }}>
                      Simple text message (no image/button)
                      <br />
                      <span style={{ color: 'var(--warning)', fontWeight: 500 }}>⚡ Works immediately</span>
                    </div>
                  </div>
                </div>
              </button>
            </div>

            {/* Mode explanation */}
            {whatsappMode === 'template' ? (
              <div style={{ marginTop: '12px', padding: '10px 12px', background: '#F0FDF4', borderRadius: 'var(--radius-sm)', border: '1px solid #25D366', fontSize: '12px', color: '#065F46' }}>
                <strong>✓ Template Mode:</strong> Sends rich WhatsApp message with wedding card image, formatted text, and "Confirm Attendance" button. Requires approved template.
              </div>
            ) : (
              <div style={{ marginTop: '12px', padding: '10px 12px', background: '#FFFBEB', borderRadius: 'var(--radius-sm)', border: '1px solid #FCD34D', fontSize: '12px', color: '#78350F' }}>
                <strong>⚡ Custom Text:</strong> Sends plain text message using your custom template below. No approval needed, works instantly!
              </div>
            )}
          </div>
        )}

        {/* Message Template (only show for Custom mode in WhatsApp, or always for SMS) */}
        {(channel === 'sms' || (channel === 'whatsapp' && whatsappMode === 'custom')) && (
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

            {/* SMS Cost Calculator — only for SMS channel */}
            {channel === 'sms' && (() => {
              const msgText = template || defaultSMSTemplate;
              // Estimate with a sample guest name substitution
              const sampleText = msgText
                .replace(/{guestName}/g, 'Tomy James')
                .replace(/{eventName}/g, ev?.name || 'Harusi')
                .replace(/{date}/g, 'Ijumaa, 25 Aprili 2026')
                .replace(/{venue}/g, ev?.venue || 'Red Hall')
                .replace(/{dressCode}/g, ev?.dressCode || 'Smart Casual')
                .replace(/{confirmUrl}/g, 'https://cardpro.co.tz/event/x?code=ABCDEF123456')
                .replace(/{verificationCode}/g, 'ABCDEF123456');
              const sms = calcSMS(sampleText);
              const totalGuests = stats.total || 0;
              const costPerGuest = sms.parts * SMS_COST_TZS;
              const totalCost = costPerGuest * totalGuests;
              return (
                <div style={{ marginTop: '8px', padding: '10px 14px', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 'var(--radius-sm)', fontSize: '12px' }}>
                  <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#C2410C" strokeWidth="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
                      <span style={{ color: '#92400E', fontWeight: 600 }}>SMS Calculator</span>
                    </div>
                    <span style={{ color: '#78350F' }}>
                      <strong>{sms.chars}</strong> chars → <strong>{sms.parts}</strong> SMS {sms.parts > 1 ? 'parts' : 'part'}
                      {sms.isUnicode && <span style={{ color: '#B45309', marginLeft: '4px' }}>(Unicode)</span>}
                      <span style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>({sms.remaining} remaining)</span>
                    </span>
                    <span style={{ color: '#78350F' }}>
                      Per guest: <strong>~TSh {costPerGuest.toLocaleString()}</strong>
                    </span>
                    {totalGuests > 0 && (
                      <span style={{ color: '#92400E', fontWeight: 700, background: '#FED7AA', padding: '2px 10px', borderRadius: '12px' }}>
                        {totalGuests} guests: ~TSh {totalCost.toLocaleString()}
                      </span>
                    )}
                    <span style={{ color: 'var(--text-muted)', fontSize: '10px' }}>*TSh {SMS_COST_TZS}/SMS (Beem estimate)</span>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Variables hint - only show when message template is visible */}
        {(channel === 'sms' || (channel === 'whatsapp' && whatsappMode === 'custom')) && (
          <div style={{ background: 'var(--info-light)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', marginBottom: '16px', fontSize: '12px', color: 'var(--info)' }}>
            <strong>Variables:</strong> {'{guestName}'}, {'{eventName}'}, {'{date}'}, {'{venue}'}, {'{dressCode}'}, {'{confirmUrl}'}, {'{verificationCode}'}
            <br/>
            <span style={{ opacity: 0.8 }}>Tip: Use {'{verificationCode}'} for guests with basic phones who cannot click links</span>
          </div>
        )}
        
        {/* Template Mode Info - show when template mode is active */}
        {channel === 'whatsapp' && whatsappMode === 'template' && (
          <div style={{ background: 'linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)', borderRadius: 'var(--radius)', padding: '16px', marginBottom: '16px', border: '1px solid #25D366' }}>
            <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
              <div style={{ fontSize: '24px' }}>🎊</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#065F46', marginBottom: '6px' }}>
                  Wedding Invitation Template Active
                </div>
                <div style={{ fontSize: '12px', color: '#047857', lineHeight: '1.5' }}>
                  Guests will receive a beautiful message with:
                  <ul style={{ margin: '6px 0 0 0', paddingLeft: '20px' }}>
                    <li>Wedding card image (header)</li>
                    <li>Couple names & event details</li>
                    <li>"Confirm Attendance" button</li>
                    <li>Professional formatting</li>
                  </ul>
                </div>
                <div style={{ marginTop: '8px', fontSize: '11px', color: '#059669', background: 'white', padding: '6px 10px', borderRadius: 'var(--radius-sm)', display: 'inline-block' }}>
                  ✓ Template automatically uses event data (date, venue, dress code, etc.)
                </div>
              </div>
            </div>
          </div>
        )}

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
