import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';

const API = process.env.REACT_APP_API_URL || '/api';

const EventWebsite = () => {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code');

  const [event, setEvent] = useState(null);
  const [guest, setGuest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [rsvpDone, setRsvpDone] = useState(false);
  const [rsvpDeclined, setRsvpDeclined] = useState(false);
  const [timeLeft, setTimeLeft] = useState({});

  // Fetch event data
  useEffect(() => {
    const url = code
      ? `${API}/public/event/${slug}/invitation?code=${code}`
      : `${API}/public/event/${slug}`;

    fetch(url)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          setEvent(data.event);
          setGuest(data.guest || null);
        } else {
          setError(data.message || 'Event not found');
        }
      })
      .catch(err => setError('Failed to load event'))
      .finally(() => setLoading(false));
  }, [slug, code]);

  // Countdown timer
  useEffect(() => {
    if (!event?.date) return;
    const calc = () => {
      const diff = new Date(event.date) - new Date();
      if (diff <= 0) { setTimeLeft({ done: true }); return; }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff / 3600000) % 24),
        minutes: Math.floor((diff / 60000) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };
    calc();
    const t = setInterval(calc, 1000);
    return () => clearInterval(t);
  }, [event?.date]);

  const handleConfirm = async () => {
    try {
      const r = await fetch(`${API}/rsvp/confirm/${code}`, { method: 'POST' });
      const d = await r.json();
      if (d.success) setRsvpDone(true);
    } catch {}
  };

  const handleDecline = async () => {
    try {
      const r = await fetch(`${API}/rsvp/decline/${code}`, { method: 'POST' });
      const d = await r.json();
      if (d.success) setRsvpDeclined(true);
    } catch {}
  };

  const formatDate = (d) => {
    if (!d) return '';
    try {
      return new Date(d).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    } catch { return d; }
  };

  // ── LOADING ──
  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#1A0A00', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '16px' }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#C9A84C', animation: `dot 1.2s ${i * 0.2}s ease-in-out infinite` }} />
          ))}
        </div>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'sans-serif' }}>Loading invitation...</p>
        <style>{`@keyframes dot{0%,80%,100%{opacity:.3;transform:scale(1)}40%{opacity:1;transform:scale(1.3)}}`}</style>
      </div>
    </div>
  );

  // ── ERROR ──
  if (error || !event) return (
    <div style={{ minHeight: '100vh', background: '#1A0A00', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ textAlign: 'center', color: 'white' }}>
        <p style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</p>
        <h2 style={{ fontFamily: 'sans-serif', marginBottom: '8px' }}>Event Not Found</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>{error || 'This event link is invalid or expired.'}</p>
      </div>
    </div>
  );

  // ── EVENT PAGE ──
  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#1A0A00,#3D2808,#1A0A00)', fontFamily: 'sans-serif' }}>
      <div style={{ maxWidth: '520px', margin: '0 auto', padding: '32px 16px 60px' }}>

        {/* Branding */}
        <p style={{ textAlign: 'center', fontSize: '11px', letterSpacing: '3px', color: 'rgba(201,168,76,0.5)', textTransform: 'uppercase', marginBottom: '24px' }}>
          Cardpro Invitation
        </p>

        {/* Guest Card Image */}
        {guest?.cardUrl && (
          <div style={{ marginBottom: '20px', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}>
            <img src={guest.cardUrl} alt="Your invitation card" style={{ width: '100%', display: 'block' }} />
          </div>
        )}

        {/* Main Card */}
        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '20px', border: '1px solid rgba(201,168,76,0.2)', overflow: 'hidden', marginBottom: '16px' }}>
          {/* Gold line */}
          <div style={{ height: '3px', background: 'linear-gradient(90deg,transparent,#C9A84C,transparent)' }} />

          <div style={{ padding: '28px 22px' }}>

            {/* Guest greeting */}
            {guest && (
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', letterSpacing: '2px', textTransform: 'uppercase', margin: '0 0 6px' }}>Dear</p>
                <h2 style={{ fontFamily: 'Georgia, serif', fontSize: '28px', color: '#C9A84C', margin: '0 0 8px' }}>{guest.guestName}</h2>
                <span style={{ display: 'inline-block', padding: '3px 14px', borderRadius: '20px', background: 'rgba(201,168,76,0.15)', border: '1px solid rgba(201,168,76,0.3)', fontSize: '12px', color: '#C9A84C', fontWeight: 600, letterSpacing: '1px' }}>
                  {guest.ticketType?.toUpperCase()} TICKET
                </span>
              </div>
            )}

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '16px 0' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(201,168,76,0.3)' }} />
              <span style={{ color: '#C9A84C', fontSize: '16px' }}>✦</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(201,168,76,0.3)' }} />
            </div>

            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '2px', margin: '0 0 8px' }}>You Are Invited To</p>
            <h1 style={{ fontFamily: 'Georgia, serif', fontSize: '26px', color: 'white', textAlign: 'center', margin: '0 0 4px' }}>{event.name}</h1>
            <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.45)', fontSize: '14px', margin: '0 0 22px' }}>by {event.clientName}</p>

            {/* Details */}
            {[
              { icon: '📅', text: `${formatDate(event.date)}${event.time ? ` at ${event.time}` : ''}` },
              { icon: '📍', text: event.venue },
              event.dressCode && { icon: '👔', text: `Dress Code: ${event.dressCode}` },
            ].filter(Boolean).map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', padding: '11px 13px', background: 'rgba(255,255,255,0.04)', borderRadius: '10px', marginBottom: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
                <span>{item.icon}</span>
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: '14px' }}>{item.text}</span>
              </div>
            ))}

            {/* Countdown */}
            {event.date && !timeLeft.done && (
              <div style={{ margin: '20px 0' }}>
                <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '14px' }}>Event Countdown</p>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  {[['days', 'Days'], ['hours', 'Hrs'], ['minutes', 'Min'], ['seconds', 'Sec']].map(([k, l]) => (
                    <div key={k} style={{ textAlign: 'center' }}>
                      <div style={{ background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '10px', padding: '10px 10px 8px', fontFamily: 'Georgia', fontSize: '28px', fontWeight: 700, color: '#C9A84C', lineHeight: 1, minWidth: '52px' }}>
                        {String(timeLeft[k] ?? 0).padStart(2, '0')}
                      </div>
                      <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', marginTop: '4px', textTransform: 'uppercase' }}>{l}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {timeLeft.done && (
              <p style={{ textAlign: 'center', color: '#C9A84C', fontWeight: 700, fontSize: '16px', margin: '20px 0' }}>The event is happening now!</p>
            )}

            {/* RSVP */}
            {guest && code && !rsvpDone && !rsvpDeclined && guest.rsvpStatus !== 'confirmed' && (
              <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button onClick={handleConfirm} style={{ padding: '15px', background: 'linear-gradient(135deg,#C9A84C,#B8860B)', color: 'white', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.5px' }}>
                  Confirm My Attendance
                </button>
                <button onClick={handleDecline} style={{ padding: '11px', background: 'transparent', color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', fontSize: '13px', cursor: 'pointer' }}>
                  Unable to Attend
                </button>
              </div>
            )}

            {(rsvpDone || guest?.rsvpStatus === 'confirmed') && (
              <div style={{ marginTop: '20px', padding: '18px', background: 'rgba(45,106,79,0.2)', borderRadius: '12px', textAlign: 'center', border: '1px solid rgba(45,106,79,0.4)' }}>
                <p style={{ fontSize: '28px', margin: '0 0 6px' }}>✓</p>
                <p style={{ color: '#86EFAC', fontWeight: 700, fontSize: '16px', margin: '0 0 4px' }}>Attendance Confirmed</p>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: 0 }}>We look forward to seeing you!</p>
              </div>
            )}

            {rsvpDeclined && (
              <div style={{ marginTop: '16px', padding: '16px', background: 'rgba(196,75,75,0.15)', borderRadius: '12px', textAlign: 'center', border: '1px solid rgba(196,75,75,0.3)' }}>
                <p style={{ color: '#FCA5A5', fontSize: '14px', margin: 0 }}>Thank you for letting us know. We will miss you!</p>
              </div>
            )}

            {/* Maps */}
            {event.googleMapsUrl && (
              <a href={event.googleMapsUrl} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '16px', padding: '11px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.55)', textDecoration: 'none', fontSize: '13px' }}>
                📍 View on Google Maps
              </a>
            )}
          </div>
          <div style={{ height: '3px', background: 'linear-gradient(90deg,transparent,#C9A84C,transparent)' }} />
        </div>

        {/* Video */}
        {event.invitationVideo?.url && (
          <div style={{ borderRadius: '16px', overflow: 'hidden', border: '1px solid rgba(201,168,76,0.15)', marginBottom: '16px' }}>
            <video controls style={{ width: '100%', display: 'block', background: '#000' }}>
              <source src={event.invitationVideo.url} />
            </video>
          </div>
        )}

        {/* Description */}
        {event.description && (
          <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: '14px', padding: '18px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', lineHeight: 1.8, margin: 0 }}>{event.description}</p>
          </div>
        )}

        <p style={{ textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: '11px', marginTop: '32px' }}>Powered by Cardpro</p>
      </div>
    </div>
  );
};

export default EventWebsite;
