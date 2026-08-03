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

  if (isLoading) return (
    <div style={{ minHeight: '100vh', background: 'var(--primary-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--white)', textAlign: 'center' }}>
        <div style={{ marginBottom: '16px', fontSize: '16px', fontFamily: 'Poppins' }}>Loading invitation...</div>
      </div>
    </div>
  );

  if (isError || !data?.event) return (
    <div style={{ minHeight: '100vh', background: 'var(--primary-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'var(--white)', textAlign: 'center', padding: '40px' }}>
        <h2 style={{ fontFamily: 'Poppins', marginBottom: '16px' }}>Event Not Found</h2>
        <p style={{ opacity: 0.7 }}>This event may have been cancelled or the link is invalid.</p>
      </div>
    </div>
  );

  const event = data.event;
  const guest = data.guest;

  const countdownRenderer = ({ days, hours, minutes, seconds, completed }) => {
    if (completed) return <span style={{ color: 'var(--secondary)', fontSize: '20px', fontWeight: 700 }}>Event is happening now!</span>;
    return (
      <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
        {[{ v: days, l: 'Days' }, { v: hours, l: 'Hours' }, { v: minutes, l: 'Min' }, { v: seconds, l: 'Sec' }].map(({ v, l }) => (
          <div key={l} style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'Poppins', fontSize: '42px', fontWeight: 700, color: 'var(--secondary)', lineHeight: 1 }}>
              {String(v).padStart(2, '0')}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              {l}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg, #1A0A00 0%, #3D2808 40%, #5C3D11 100%)' }}>
      {/* Decorative circles */}
      <div style={{ position: 'fixed', top: '-150px', right: '-100px', width: '400px', height: '400px', borderRadius: '50%', background: 'rgba(201,168,76,0.05)', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-100px', left: '-100px', width: '300px', height: '300px', borderRadius: '50%', background: 'rgba(201,168,76,0.05)', pointerEvents: 'none' }} />

      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '40px 20px' }}>
        {/* Branding */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontFamily: 'Poppins', fontSize: '13px', letterSpacing: '3px', color: 'var(--secondary)', textTransform: 'uppercase', marginBottom: '4px' }}>
            Cardpro
          </div>
        </div>

        {/* Invitation Card */}
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px', padding: '40px 32px',
          border: '1px solid rgba(201,168,76,0.2)',
          boxShadow: '0 25px 50px rgba(0,0,0,0.5)',
          marginBottom: '24px',
        }}>
          {/* Gold divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px' }}>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, transparent, var(--secondary))' }} />
            <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--secondary)">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
            </svg>
            <div style={{ flex: 1, height: '1px', background: 'linear-gradient(90deg, var(--secondary), transparent)' }} />
          </div>

          <p style={{ textAlign: 'center', fontSize: '13px', color: 'rgba(255,255,255,0.5)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '8px' }}>
            You Are Cordially Invited To
          </p>

          <h1 style={{
            fontFamily: 'Poppins', fontSize: '32px', fontWeight: 700,
            color: 'var(--white)', textAlign: 'center', margin: '0 0 8px',
            lineHeight: 1.2,
          }}>
            {event.name}
          </h1>

          {guest && (
            <p style={{ textAlign: 'center', fontSize: '18px', color: 'var(--secondary)', fontFamily: 'Poppins', fontWeight: 500, marginBottom: '24px' }}>
              {guest.guestName}
            </p>
          )}

          {!guest && (
            <p style={{ textAlign: 'center', fontSize: '15px', color: 'rgba(255,255,255,0.7)', marginBottom: '24px' }}>
              Hosted by {event.clientName}
            </p>
          )}

          {/* Event details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '28px' }}>
            {[
              { icon: '📅', text: event.date ? format(new Date(event.date), 'EEEE, MMMM d, yyyy') + (event.time ? ` at ${event.time}` : '') : '' },
              { icon: '📍', text: event.venue },
              event.dressCode && { icon: '👔', text: `Dress Code: ${event.dressCode}` },
            ].filter(Boolean).map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', padding: '14px 16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
                <span style={{ fontSize: '18px', flexShrink: 0 }}>{item.icon}</span>
                <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '14px', lineHeight: 1.5 }}>{item.text}</span>
              </div>
            ))}
          </div>

          {/* Countdown */}
          {event.date && (
            <div style={{ textAlign: 'center', padding: '24px 0', borderTop: '1px solid rgba(255,255,255,0.08)', borderBottom: '1px solid rgba(255,255,255,0.08)', marginBottom: '24px' }}>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '16px' }}>
                Event Starts In
              </p>
              <Countdown date={new Date(event.date)} renderer={countdownRenderer} />
            </div>
          )}

          {/* QR Code for guest */}
          {guest?.qrCodeUrl && (
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '16px' }}>
                Your Entry QR Code
              </p>
              <div style={{ display: 'inline-block', background: 'var(--white)', padding: '16px', borderRadius: '16px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                <img src={guest.qrCodeUrl} alt="QR Code" style={{ width: '180px', height: '180px', display: 'block' }} />
                {guest.ticketType && (
                  <p style={{ textAlign: 'center', margin: '8px 0 0', fontSize: '13px', fontWeight: 700, color: 'var(--primary-dark)', letterSpacing: '2px' }}>
                    {guest.ticketType.toUpperCase()}
                  </p>
                )}
              </div>
              {guest.verificationCode && (
                <p style={{ margin: '12px 0 0', fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>
                  Code: <code style={{ color: 'var(--secondary)' }}>{guest.verificationCode}</code>
                </p>
              )}
            </div>
          )}

          {/* RSVP Buttons */}
          {guest && code && !rsvpDone && !rsvpDeclined && guest.rsvpStatus !== 'confirmed' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button onClick={() => confirmMutation.mutate()} disabled={confirmMutation.isPending} style={{
                padding: '16px', background: 'linear-gradient(135deg, var(--secondary), var(--gold))',
                color: 'var(--white)', border: 'none', borderRadius: '14px',
                fontSize: '16px', fontWeight: 700, cursor: 'pointer',
                fontFamily: 'Poppins', letterSpacing: '0.5px',
                boxShadow: '0 4px 15px rgba(201,168,76,0.4)',
              }}>
                {confirmMutation.isPending ? 'Confirming...' : 'Confirm Attendance'}
              </button>
              <button onClick={() => declineMutation.mutate()} disabled={declineMutation.isPending} style={{
                padding: '12px', background: 'transparent',
                color: 'rgba(255,255,255,0.4)', border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '12px', fontSize: '14px', cursor: 'pointer', fontFamily: 'Inter',
              }}>
                Unable to Attend
              </button>
            </div>
          )}

          {/* Already confirmed */}
          {(rsvpDone || guest?.rsvpStatus === 'confirmed') && (
            <div style={{ padding: '20px', background: 'rgba(45,106,79,0.2)', borderRadius: '14px', textAlign: 'center', border: '1px solid rgba(45,106,79,0.4)' }}>
              <p style={{ fontSize: '32px', marginBottom: '8px' }}>✓</p>
              <p style={{ fontFamily: 'Poppins', fontSize: '18px', fontWeight: 700, color: '#86EFAC', margin: '0 0 4px' }}>Attendance Confirmed</p>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', margin: 0 }}>
                We look forward to seeing you at the event.
              </p>
            </div>
          )}

          {/* Declined */}
          {rsvpDeclined && (
            <div style={{ padding: '20px', background: 'rgba(196,75,75,0.15)', borderRadius: '14px', textAlign: 'center', border: '1px solid rgba(196,75,75,0.3)' }}>
              <p style={{ fontFamily: 'Poppins', fontSize: '16px', color: '#FCA5A5', margin: 0 }}>
                You have declined this invitation. Thank you for letting us know.
              </p>
            </div>
          )}

          {/* Maps link */}
          {event.googleMapsUrl && (
            <a href={event.googleMapsUrl} target="_blank" rel="noreferrer" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              marginTop: '20px', padding: '12px', borderRadius: '12px',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.7)', textDecoration: 'none', fontSize: '13px',
              transition: 'background var(--transition)',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
              View on Google Maps
            </a>
          )}
        </div>

        {/* Invitation video */}
        {event.invitationVideo?.url && (
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '20px', overflow: 'hidden', border: '1px solid rgba(201,168,76,0.15)', marginBottom: '24px' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px', margin: 0 }}>
                Event Preview
              </p>
            </div>
            <video controls style={{ width: '100%', display: 'block', maxHeight: '300px', background: '#000' }}>
              <source src={event.invitationVideo.url} />
            </video>
          </div>
        )}

        {/* Description */}
        {event.description && (
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '16px', padding: '24px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: '24px' }}>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', lineHeight: 1.8, margin: 0 }}>
              {event.description}
            </p>
          </div>
        )}

        {/* Footer */}
        <p style={{ textAlign: 'center', fontSize: '12px', color: 'rgba(255,255,255,0.2)' }}>
          Powered by Cardpro
        </p>
      </div>
    </div>
  );
};

export default EventWebsite;
