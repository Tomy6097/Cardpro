import React, { useState, useRef, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { useQuery, useMutation } from '@tanstack/react-query';
import { scannerAPI } from '../api';
import toast from 'react-hot-toast';

// Sound effects - improved
const playSound = (type) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);

    if (type === 'success') {
      // Two-tone success beep
      [880, 1320].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.connect(gain);
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.4, ctx.currentTime + i * 0.15);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.2);
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.2);
      });
    } else if (type === 'error') {
      // Low buzzer
      const osc = ctx.createOscillator();
      osc.connect(gain);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(110, ctx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } else {
      // Warning beep
      const osc = ctx.createOscillator();
      osc.connect(gain);
      osc.frequency.value = 440;
      gain.gain.setValueAtTime(0.4, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch {}
};

const Scanner = () => {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [mode, setMode] = useState('camera');
  const [cameraOn, setCameraOn] = useState(false);
  const scanLock = useRef(false);
  const webcamRef = useRef(null);
  const scanInterval = useRef(null);

  const { data: eventsData } = useQuery({
    queryKey: ['scanner-events'],
    queryFn: () => scannerAPI.getEvents().then(r => r.data),
  });

  const { data: statsData, refetch: refetchStats } = useQuery({
    queryKey: ['live-stats', selectedEvent?._id],
    queryFn: () => scannerAPI.getLiveStats(selectedEvent._id).then(r => r.data),
    enabled: !!selectedEvent,
    refetchInterval: 8000,
  });

  const scanMutation = useMutation({
    mutationFn: d => scannerAPI.scan(d),
    onSuccess: res => {
      scanLock.current = false;
      setScanResult(res.data);
      if (res.data.status === 'allowed') playSound('success');
      else if (res.data.status === 'duplicate') playSound('warning');
      else playSound('error');
      refetchStats();
      if (mode === 'camera') setTimeout(() => setScanResult(null), 5000);
    },
    onError: err => {
      scanLock.current = false;
      toast.error(err.message);
    },
  });

  const doScan = useCallback((token) => {
    if (scanLock.current || !token?.trim() || !selectedEvent) return;
    scanLock.current = true;
    scanMutation.mutate({ token: token.trim(), eventId: selectedEvent._id });
  }, [selectedEvent, scanMutation]);

  // jsQR scanning loop
  const startScanLoop = useCallback(async () => {
    const jsQR = (await import('jsqr').catch(() => null))?.default;
    if (!jsQR) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    scanInterval.current = setInterval(() => {
      if (!webcamRef.current || scanLock.current) return;
      try {
        const video = webcamRef.current.video;
        if (!video || video.readyState < 2 || video.videoWidth === 0) return;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code?.data) {
          console.log('QR:', code.data.substring(0, 60));
          doScan(code.data.trim());
        }
      } catch {}
    }, 100); // scan 10 times per second for faster response
  }, [doScan]);

  const stopScanLoop = () => {
    if (scanInterval.current) clearInterval(scanInterval.current);
    scanInterval.current = null;
  };

  useEffect(() => {
    if (cameraOn) {
      setTimeout(startScanLoop, 1000); // give webcam 1s to initialize
    } else {
      stopScanLoop();
    }
    return stopScanLoop;
  }, [cameraOn, startScanLoop]);

  // Search
  useEffect(() => {
    if (!searchQuery.trim() || !selectedEvent) { setSearchResults([]); return; }
    const t = setTimeout(async () => {
      try {
        const res = await scannerAPI.search({ query: searchQuery, eventId: selectedEvent._id });
        setSearchResults(res.data?.guests || []);
      } catch { setSearchResults([]); }
    }, 400);
    return () => clearTimeout(t);
  }, [searchQuery, selectedEvent]);

  const events = eventsData?.events || [];
  const stats = statsData?.stats || {};

  const resultConfig = {
    allowed: { bg: '#065F46', border: '#10B981', icon: '✓', title: 'Entry Allowed', tc: '#D1FAE5' },
    duplicate: { bg: '#78350F', border: '#F59E0B', icon: '!', title: 'Already Used', tc: '#FDE68A' },
    invalid: { bg: '#7F1D1D', border: '#EF4444', icon: '✕', title: 'Invalid QR', tc: '#FEE2E2' },
  };
  const rc = scanResult ? (resultConfig[scanResult.status] || resultConfig.invalid) : null;

  // Event selection
  if (!selectedEvent) return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', fontFamily: 'Inter' }}>
      <div style={{ background: 'var(--primary-dark)', padding: '16px 20px' }}>
        <h2 style={{ fontFamily: 'Poppins', fontSize: '18px', fontWeight: 700, color: 'white', margin: 0 }}>Scanner Portal</h2>
        <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: '2px 0 0' }}>Select event to begin scanning</p>
      </div>
      <div style={{ padding: '24px 16px', maxWidth: '480px', margin: '0 auto' }}>
        {events.length === 0 ? (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px' }}>No active events assigned.</p>
        ) : events.map(ev => (
          <div key={ev._id} onClick={() => setSelectedEvent(ev)} style={{
            background: 'var(--white)', borderRadius: 'var(--radius)', padding: '18px 20px',
            marginBottom: '10px', cursor: 'pointer', border: '1px solid var(--border-light)',
            boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div>
              <h3 style={{ fontFamily: 'Poppins', fontSize: '15px', fontWeight: 600, color: 'var(--primary-dark)', margin: '0 0 3px' }}>{ev.name}</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>{ev.venue}</p>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', fontFamily: 'Inter', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ background: 'var(--primary-dark)', padding: '12px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '520px', margin: '0 auto' }}>
          <div>
            <h2 style={{ fontFamily: 'Poppins', fontSize: '15px', fontWeight: 700, color: 'white', margin: 0 }}>{selectedEvent.name}</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', margin: 0 }}>{selectedEvent.venue}</p>
          </div>
          <button onClick={() => { setSelectedEvent(null); setScanResult(null); setCameraOn(false); }} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', color: 'white', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            Back
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ background: 'var(--white)', borderBottom: '1px solid var(--border-light)', flexShrink: 0 }}>
        <div style={{ display: 'flex', maxWidth: '520px', margin: '0 auto' }}>
          {[['Total', stats.total, 'var(--primary-dark)'], ['Entered', stats.entered, '#065F46'], ['Remaining', stats.remaining, '#78350F'], ['Confirmed', stats.confirmed, '#1E40AF']].map(([l, v, c]) => (
            <div key={l} style={{ flex: 1, padding: '10px 6px', textAlign: 'center', borderRight: '1px solid var(--border-light)' }}>
              <p style={{ fontFamily: 'Poppins', fontSize: '20px', fontWeight: 700, color: c, margin: 0, lineHeight: 1 }}>{v ?? 0}</p>
              <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: '3px 0 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{l}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: 'var(--white)', borderBottom: '1px solid var(--border-light)', flexShrink: 0 }}>
        <div style={{ display: 'flex', maxWidth: '520px', margin: '0 auto' }}>
          {['camera', 'manual', 'search'].map(m => (
            <button key={m} onClick={() => { setMode(m); if (m !== 'camera') setCameraOn(false); setScanResult(null); setSearchResults([]); }} style={{
              flex: 1, padding: '12px 6px', border: 'none', cursor: 'pointer',
              background: mode === m ? 'var(--cream-dark)' : 'transparent',
              color: mode === m ? 'var(--primary-dark)' : 'var(--text-muted)',
              fontSize: '13px', fontWeight: mode === m ? 600 : 400, fontFamily: 'Inter',
              borderBottom: mode === m ? '2px solid var(--primary)' : '2px solid transparent',
            }}>
              {m === 'camera' ? 'Camera' : m === 'manual' ? 'Enter Code' : 'Search'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        <div style={{ maxWidth: '520px', margin: '0 auto' }}>

          {/* Scan Result */}
          {scanResult && rc && (
            <div style={{ background: rc.bg, border: `2px solid ${rc.border}`, borderRadius: 'var(--radius-lg)', padding: '20px', marginBottom: '16px', textAlign: 'center', animation: 'fadeIn 0.2s ease' }}>
              <div style={{ fontSize: '36px', fontWeight: 700, color: rc.border, marginBottom: '6px', lineHeight: 1 }}>{rc.icon}</div>
              <h3 style={{ fontFamily: 'Poppins', fontSize: '18px', fontWeight: 700, color: rc.tc, margin: '0 0 4px' }}>{rc.title}</h3>
              <p style={{ color: rc.tc, fontSize: '14px', margin: '0 0 8px', opacity: 0.85 }}>{scanResult.message}</p>
              {scanResult.guest && (
                <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '10px', marginTop: '6px' }}>
                  <p style={{ color: rc.tc, fontWeight: 700, fontSize: '16px', margin: '0 0 2px', fontFamily: 'Poppins' }}>{scanResult.guest.guestName}</p>
                  <p style={{ color: rc.tc, fontSize: '13px', margin: 0, opacity: 0.7 }}>
                    {scanResult.guest.ticketLabel || scanResult.guest.ticketType}
                    {scanResult.guest.remaining !== undefined && ` • ${scanResult.guest.remaining} left`}
                  </p>
                </div>
              )}
              <button onClick={() => { setScanResult(null); scanLock.current = false; }} style={{ marginTop: '12px', padding: '7px 22px', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px', color: rc.tc, fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter' }}>
                Scan Next
              </button>
            </div>
          )}

          {/* Camera */}
          {mode === 'camera' && (
            <div>
              <div style={{ background: '#000', borderRadius: 'var(--radius-lg)', overflow: 'hidden', width: '100%', aspectRatio: '4/3', maxHeight: '360px', position: 'relative', marginBottom: '12px', border: cameraOn ? '3px solid var(--secondary)' : '3px solid var(--border)' }}>
                {cameraOn ? (
                  <>
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      videoConstraints={{ facingMode: 'environment' }}
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                      onUserMediaError={() => { toast.error('Camera error'); setCameraOn(false); }}
                    />
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: '55%', aspectRatio: '1', border: '2px solid var(--secondary)', borderRadius: '8px', boxShadow: '0 0 0 9999px rgba(0,0,0,0.45)', zIndex: 2 }} />
                    {scanLock.current && (
                      <div style={{ position: 'absolute', bottom: '10px', left: 0, right: 0, textAlign: 'center', zIndex: 3 }}>
                        <span style={{ background: 'rgba(0,0,0,0.7)', color: 'white', fontSize: '12px', padding: '4px 12px', borderRadius: '20px' }}>Processing...</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.4)', textAlign: 'center', padding: '20px' }}>
                    <div>
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '12px' }}>
                        <path d="M23 7V3a2 2 0 00-2-2h-4M23 17v4a2 2 0 01-2 2h-4M1 7V3a2 2 0 012-2h4M1 17v4a2 2 0 002 2h4"/>
                        <rect x="7" y="7" width="10" height="10" rx="1"/>
                      </svg>
                      <p style={{ fontSize: '13px', margin: 0 }}>Press button to start camera</p>
                    </div>
                  </div>
                )}
              </div>
              <button onClick={() => setCameraOn(p => !p)} style={{ width: '100%', padding: '14px', background: cameraOn ? '#7F1D1D' : 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius)', fontSize: '15px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Poppins', display: 'block', boxSizing: 'border-box' }}>
                {cameraOn ? 'Stop Camera' : 'Start Camera Scan'}
              </button>
            </div>
          )}

          {/* Manual */}
          {mode === 'manual' && (
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '8px' }}>Verification Code or QR Data</label>
              <input
                type="text" value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                placeholder="Enter code..."
                autoFocus
                onKeyPress={e => { if (e.key === 'Enter') { doScan(manualCode); setManualCode(''); } }}
                style={{ width: '100%', padding: '13px 14px', border: '2px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '15px', outline: 'none', fontFamily: 'Inter', boxSizing: 'border-box', marginBottom: '10px' }}
                onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                onBlur={e => e.target.style.borderColor = 'var(--border)'}
              />
              <button onClick={() => { doScan(manualCode); setManualCode(''); }} style={{ width: '100%', padding: '14px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius)', fontSize: '15px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Poppins', boxSizing: 'border-box' }}>
                Verify Entry
              </button>
            </div>
          )}

          {/* Search */}
          {mode === 'search' && (
            <div>
              <div style={{ position: 'relative', marginBottom: '12px' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}>
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by name, phone, or code..."
                  autoFocus
                  style={{ width: '100%', padding: '13px 14px 13px 40px', border: '2px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '14px', outline: 'none', fontFamily: 'Inter', boxSizing: 'border-box' }}
                  onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>
              {searchQuery && searchResults.length === 0 && <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px', fontSize: '13px' }}>No guests found</p>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {searchResults.map(g => (
                  <div key={g._id} style={{ background: 'var(--white)', borderRadius: 'var(--radius)', padding: '14px 16px', border: '1px solid var(--border-light)', boxShadow: 'var(--shadow-sm)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: '14px', color: 'var(--primary-dark)', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.guestName}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>{g.phone} &bull; <span style={{ color: g.scanStatus === 'scanned' ? 'var(--success)' : 'var(--text-muted)', fontWeight: 500 }}>{g.scanStatus?.replace('_', ' ')}</span></p>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <span style={{ padding: '3px 10px', background: 'var(--cream-dark)', borderRadius: '20px', fontSize: '11px', fontWeight: 600, color: 'var(--primary)', border: '1px solid var(--border)' }}>{g.ticketType}</span>
                      <button onClick={() => { if (g.qrToken) doScan(g.qrToken); else toast.error('No QR token.'); }} style={{ padding: '6px 14px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter', fontWeight: 500 }}>
                        Scan
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <style>{`@keyframes fadeIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}`}</style>
    </div>
  );
};

export default Scanner;
