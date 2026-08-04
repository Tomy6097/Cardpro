import React, { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { publicAPI, rsvpAPI } from '../api';
import Countdown from 'react-countdown';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const EventWebsite = () => {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');
  const [rsvpDone, setRsvpDone] = useState(false);
  const [rsvpDeclined, setRsvpDeclined] = useState(false);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-event', slug, code],
    queryFn: () => code
      ? publicAPI.getInvitation(slug, code).then(r => r.data)
      : publicAPI.getEvent(slug).then(r => r.data),
    retry: 2,
  });

  const confirmMutation = useMutation({
    mutationFn: () => rsvpAPI.confirm(code),
    onSuccess: () => { setRsvpDone(true); toast.success('Attendance confirmed!'); },
    onError: (err) => toast.error(err.message),
  });

  const declineMutation = useMutation({
    mutationFn: () => rsvpAPI.decline(code),
    onSuccess: () => { setRsvpDeclined(true); },
    onError: (err) => toast.error(err.message),
  });

  // Loading state
  if (isLoading) return (
    <div style={{ minHeight: '100vh', background: '#1A0A00', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '16px' }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#C9A84C', animation: `bounce 1.2s ease ${i*0.2}s infinite` }} />
          ))}
        </div>
        <p style={{ color: 'rgba(255,255,255,0.6)', fontFamily: 'Poppins', fontSize: '14px' }}>Loading invitation...</p>
        <style>{`@keyframes bounce { 0%,80%,100%{transform:translateY(0);opacity:.5} 40%{transform:translateY(-8px);opacity:1} }`}</style>
      </div>
    </div>
  );

  // Error / not found
  if (isError || !data?.event) return (
    <div style={{ minHeight: '100vh', background: '#1A0A00', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ textAlign: 'center', color: 'white' }}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" style={{ marginBottom: '16px' }}>
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <h2 style={{ fontFamily: 'Poppins', fontSize: '20px', marginBottom: '8px' }}>Event Not Found</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>This event may have been cancelled or the link is invalid.</p>
      </div>
    </div>
  );

  const event = data.event;
  const guest = data.guest;

  // Countdown renderer
  const countdownRenderer = ({ days, hours, minutes, seconds, completed }) => {
    if (completed) return (
      <div style={{ textAlign: 'center', padding: '16px 0' }}>
        <span style={{ color: 'var(--secondary)', fontSize: '18px', fontFamily: 'Poppins', fontWeight: 700 }}>
          The event is happening now!
        </span>
      </div>
    );
    return (
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
        {[{ v: days, l: 'Days' }, { v: hours, l: 'Hours' }, { v: minutes, l: 'Min' }, { v: seconds, l: 'Sec' }].map(({ v, l }) => (
          <div key={l} style={{ textAlign: 'center', minWidth: '56px' }}>
            <div style={{
              background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)',
              borderRadius: '10px', padding: '10px 8px',
              fontFamily: 'Poppins', fontSize: '32px', fontWeight: 700, color: '#C9A84C', lineHeight: 1,
            }}>
              {String(v).padStart(2, '0')}
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {l}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #1A0A00 0%, #3D2808 50%, #1A0A00 100%)' }}>
      {/* Decorations */}
      <div style={{ position: 'fixed', top: '-100px', right: '-100px', width: '350px', height: '350px', borderRadius: '50%', background: 'rgba(201,168,76,0.04)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-80px', left: '-80px', width: '280px', height: '280px', borderRadius: '50%', background: 'rgba(201,168,76,0.04)', pointerEvents: 'none' }} />

      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '32px 16px 48px' }}>

        {/* Branding */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <span style={{ fontFamily: 'Poppins', fontSize: '11px', letterSpacing: '3px', color: 'rgba(201,168,76,0.6)', textTransform: 'uppercase' }}>
            Powered by Cardpro
          </span>
        </div>

        {/* ── GUEST CARD (shown when guest has a card) ── */}
        {guest?.cardUrl && (
          <div style={{ marginBottom: '20px', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <img
              src={guest.cardUrl}
              alt={`Invitation card for ${guest.guestName}`}
              style={{ width: '100%', display: 'block' }}
            />
          </div>
        )}

        {/* ── MAIN INVITATION CARD ── */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(20px)',
          borderRadius: '20px',
          border: '1px solid rgba(201,168,76,0.2)',
          boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
          overflow: 'hidden',
          marginBottom: '16px',
        }}>
          {/* Gold divider top */}
          <div style={{ height: '3px', background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)' }} />

          <div style={{ padding: '28px 24px' }}>
            {/* Guest name if logged in */}
            {guest && (
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '2px', margin: '0 0 6px' }}>
                  Dear
                </p>
                <h2 style={{ fontFamily: 'Poppins', fontSize: '26px', fontWeight: 700, color: '#C9A84C', margin: 0 }}>
                  {guest.guestName}
                </h2>
                <div style={{ display: 'inline-block', marginTop: '8px', padding: '3px 14px', borderRadius: '20px', background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)' }}>
                  <span style={{ fontSize: '12px', color: '#C9A84C', fontWeight: 600, letterSpacing: '1px' }}>
                    {guest.ticketType?.toUpperCase()} TICKET
                  </span>
                </div>
              </div>
            )}

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, rgba(201,168,76,0.4))' }} />
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#C9A84C">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
              <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, rgba(201,168,76,0.4), transparent)' }} />
            </div>

            <p style={{ textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.4)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>
              You Are Cordially Invited To
            </p>
            <h1 style={{ fontFamily: 'Poppins', fontSize: '26px', fontWeight: 700, color: 'white', textAlign: 'center', margin: '0 0 4px', lineHeight: 1.3 }}>
              {event.name}
            </h1>
            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', fontSize: '14px', marginBottom: '24px' }}>
              Hosted by {event.clientName}
            </p>

            {/* Event Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {[
                {
                  icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
                  text: event.date ? `${format(new Date(event.date), 'EEEE, MMMM d, yyyy')}${event.time ? ` at ${event.time}` : ''}` : '—',
                },
                {
                  icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
                  text: event.venue,
                },
                event.dressCode && {
                  icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#C9A84C" strokeWidth="2"><path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.57a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.57a2 2 0 00-1.34-2.23z"/></svg>,
                  text: `Dress Code: ${event.dressCode}`,
                },
              ].filter(Boolean).map((item, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: '12px',
                  padding: '12px 14px', background: 'rgba(255,255,255,0.04)',
                  borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)',
                }}>
                  <div style={{ flexShrink: 0, marginTop: '1px' }}>{item.icon}</div>
                  <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px', lineHeight: 1.5 }}>{item.text}</span>
                </div>
              ))}
            </div>

            {/* Countdown */}
            {event.date && (
              <div style={{ marginBottom: '24px' }}>
                <p style={{ textAlign: 'center', fontSize: '11px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '14px' }}>
                  Event Countdown
                </p>
                <Countdown date={new Date(event.date)} renderer={countdownRenderer} />
              </div>
            )}

            {/* RSVP Buttons */}
            {guest && code && !rsvpDone && !rsvpDeclined && guest.rsvpStatus !== 'confirmed' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '16px' }}>
                <button
                  onClick={() => confirmMutation.mutate()}
                  disabled={confirmMutation.isPending}
                  style={{
                    padding: '15px', background: 'linear-gradient(135deg, #C9A84C, #B8860B)',
                    color: 'white', border: 'none', borderRadius: '12px',
                    fontSize: '15px', fontWeight: 700, cursor: 'pointer',
                    fontFamily: 'Poppins', letterSpacing: '0.5px',
                    boxShadow: '0 4px 15px rgba(201,168,76,0.35)',
                  }}
                >
                  {confirmMutation.isPending ? 'Confirming...' : 'Confirm My Attendance'}
                </button>
                <button
                  onClick={() => declineMutation.mutate()}
                  disabled={declineMutation.isPending}
                  style={{
                    padding: '11px', background: 'transparent',
                    color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '10px', fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter',
                  }}
                >
                  Unable to Attend
                </button>
              </div>
            )}

            {/* Already confirmed */}
            {(rsvpDone || guest?.rsvpStatus === 'confirmed') && (
              <div style={{ padding: '18px', background: 'rgba(45,106,79,0.2)', borderRadius: '12px', textAlign: 'center', border: '1px solid rgba(45,106,79,0.4)', marginBottom: '16px' }}>
                <p style={{ fontSize: '28px', margin: '0 0 6px' }}>✓</p>
                <p style={{ fontFamily: 'Poppins', fontSize: '16px', fontWeight: 700, color: '#86EFAC', margin: '0 0 4px' }}>
                  Attendance Confirmed
                </p>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: 0 }}>
                  We look forward to seeing you!
                </p>
              </div>
            )}

            {/* Declined */}
            {rsvpDeclined && (
              <div style={{ padding: '16px', background: 'rgba(196,75,75,0.15)', borderRadius: '12px', textAlign: 'center', border: '1px solid rgba(196,75,75,0.3)', marginBottom: '16px' }}>
                <p style={{ color: '#FCA5A5', fontSize: '14px', margin: 0 }}>
                  You have declined this invitation. Thank you for letting us know.
                </p>
              </div>
            )}

            {/* Maps link */}
            {event.googleMapsUrl && (
              <a href={event.googleMapsUrl} target="_blank" rel="noreferrer" style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                padding: '11px', borderRadius: '10px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.6)', textDecoration: 'none', fontSize: '13px',
                transition: 'background 0.2s',
              }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                View Location on Google Maps
              </a>
            )}
          </div>

          {/* Gold divider bottom */}
          <div style={{ height: '3px', background: 'linear-gradient(90deg, transparent, #C9A84C, transparent)' }} />
        </div>

        {/* ── INVITATION VIDEO ── */}
        {event.invitationVideo?.url && (
          <div style={{
            background: 'rgba(255,255,255,0.03)', borderRadius: '16px',
            overflow: 'hidden', border: '1px solid rgba(201,168,76,0.15)',
            marginBottom: '16px',
          }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '2px', margin: 0 }}>
                Event Preview
              </p>
            </div>
            <video controls style={{ width: '100%', display: 'block', background: '#000' }}>
              <source src={event.invitationVideo.url} />
            </video>
          </div>
        )}

        {/* ── DESCRIPTION ── */}
        {event.description && (
          <div style={{
            background: 'rgba(255,255,255,0.03)', borderRadius: '14px',
            padding: '20px', border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', lineHeight: 1.8, margin: 0 }}>
              {event.description}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventWebsite;
