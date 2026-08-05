import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { scannerAPI } from '../api';
import toast from 'react-hot-toast';

// Sound effects using Web Audio API
const playSound = (type) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
    } else if (type === 'error') {
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.setValueAtTime(200, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.5);
    } else if (type === 'warning') {
      osc.frequency.setValueAtTime(600, ctx.currentTime);
      osc.frequency.setValueAtTime(400, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.4);
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
  const [isScanning, setIsScanning] = useState(false);
  const [scanning, setScanning] = useState(false); // prevent double scan
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const readerRef = useRef(null);
  const manualRef = useRef(null);
  const searchRef = useRef(null);

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
      setScanResult(res.data);
      setScanning(false);
      if (res.data.status === 'allowed') {
        playSound('success');
      } else if (res.data.status === 'duplicate') {
        playSound('warning');
      } else {
        playSound('error');
      }
      refetchStats();
      // Auto-reset result after 4 seconds for camera mode
      if (mode === 'camera') {
        setTimeout(() => {
          setScanResult(null);
          setScanning(false);
        }, 4000);
      }
    },
    onError: err => {
      setScanning(false);
      toast.error(err.message);
    },
  });

  const doScan = useCallback((token) => {
    if (scanning || !selectedEvent || !token?.trim()) return;
    setScanning(true);
    scanMutation.mutate({ token: token.trim(), eventId: selectedEvent._id });
  }, [scanning, selectedEvent, scanMutation]);

  // Search handler
  const handleSearch = useCallback(async (q) => {
    if (!q.trim() || !selectedEvent) { setSearchResults([]); return; }
    try {
      const res = await scannerAPI.search({ query: q, eventId: selectedEvent._id });
      setSearchResults(res.data?.guests || []);
    } catch { setSearchResults([]); }
  }, [selectedEvent]);

  useEffect(() => {
    const timer = setTimeout(() => handleSearch(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  // Camera
  const stopCamera = useCallback(() => {
    if (readerRef.current) { try { readerRef.current.reset(); } catch {} readerRef.current = null; }
    if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()); streamRef.current = null; }
    setIsScanning(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      streamRef.current = stream;

      // Wait for video to be ready before processing
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        await new Promise((resolve) => {
          video.onloadedmetadata = () => {
            video.play().then(resolve).catch(resolve);
          };
          // Timeout fallback
          setTimeout(resolve, 2000);
        });
      }

      setIsScanning(true);

      // Canvas-based QR scanning with jsQR
      const jsQR = (await import('jsqr').catch(() => null))?.default;

      if (jsQR && video) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        let animFrame;

        const scan = () => {
          if (!streamRef.current || !video) return;

          if (video.readyState === video.HAVE_ENOUGH_DATA && video.videoWidth > 0) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            try {
              const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const code = jsQR(imageData.data, imageData.width, imageData.height);
              if (code && code.data && !scanning) {
                console.log('QR:', code.data.substring(0, 60));
                doScan(code.data.trim());
              }
            } catch {}
          }
          animFrame = requestAnimationFrame(scan);
        };

        animFrame = requestAnimationFrame(scan);
        // Store cancel function
        readerRef.current = { reset: () => cancelAnimationFrame(animFrame) };
      }
    } catch (err) {
      console.error('Camera error:', err);
      toast.error('Camera access denied. Use manual entry.');
    }
  }, [doScan, scanning]);

  useEffect(() => { return () => stopCamera(); }, [stopCamera]);

  const handleManualScan = () => {
    if (!manualCode.trim()) { toast.error('Enter a code.'); return; }
    doScan(manualCode);
    if (scanMutation.isSuccess || scanMutation.isError) setManualCode('');
  };

  const events = eventsData?.events || [];
  const stats = statsData?.stats || {};

  const resultConfig = {
    allowed: { bg: '#065F46', border: '#10B981', icon: '✓', title: 'Entry Allowed', textColor: '#D1FAE5' },
    duplicate: { bg: '#78350F', border: '#F59E0B', icon: '!', title: 'Already Used', textColor: '#FDE68A' },
    invalid: { bg: '#7F1D1D', border: '#EF4444', icon: '✕', title: 'Invalid QR', textColor: '#FEE2E2' },
  };
  const rc = scanResult ? (resultConfig[scanResult.status] || resultConfig.invalid) : null;

  // Event selection screen
  if (!selectedEvent) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--cream)', fontFamily: 'Inter, sans-serif' }}>
        {/* Header */}
        <div style={{ background: 'var(--primary-dark)', padding: '16px 20px' }}>
          <h2 style={{ fontFamily: 'Poppins', fontSize: '18px', fontWeight: 700, color: 'white', margin: 0 }}>Scanner Portal</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '13px', margin: '2px 0 0' }}>Select event to begin scanning</p>
        </div>

        <div style={{ padding: '24px 16px', maxWidth: '480px', margin: '0 auto' }}>
          {events.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '12px', opacity: 0.4 }}>
                <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
              </svg>
              <p>No active events assigned.</p>
            </div>
          ) : events.map(ev => (
            <div key={ev._id} onClick={() => setSelectedEvent(ev)} style={{
              background: 'var(--white)', borderRadius: 'var(--radius)', padding: '18px 20px',
              marginBottom: '12px', cursor: 'pointer', border: '1px solid var(--border-light)',
              boxShadow: 'var(--shadow-sm)', transition: 'all 0.2s',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.borderColor = 'var(--primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.borderColor = 'var(--border-light)'; }}
            >
              <div>
                <h3 style={{ fontFamily: 'Poppins', fontSize: '15px', fontWeight: 600, color: 'var(--primary-dark)', margin: '0 0 4px' }}>{ev.name}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0 }}>{ev.venue}</p>
              </div>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Scanner screen
  return (
    <div style={{ minHeight: '100vh', background: 'var(--cream)', fontFamily: 'Inter, sans-serif', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ background: 'var(--primary-dark)', padding: '12px 16px', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '480px', margin: '0 auto' }}>
          <div>
            <h2 style={{ fontFamily: 'Poppins', fontSize: '15px', fontWeight: 700, color: 'white', margin: 0 }}>{selectedEvent.name}</h2>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', margin: 0 }}>{selectedEvent.venue}</p>
          </div>
          <button onClick={() => { setSelectedEvent(null); setScanResult(null); stopCamera(); }} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', color: 'white', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
            Back
          </button>
        </div>
      </div>

      {/* Live Stats */}
      <div style={{ background: 'var(--white)', borderBottom: '1px solid var(--border-light)', flexShrink: 0 }}>
        <div style={{ display: 'flex', maxWidth: '480px', margin: '0 auto' }}>
          {[
            { label: 'Total', value: stats.total, color: 'var(--primary-dark)' },
            { label: 'Entered', value: stats.entered, color: '#065F46' },
            { label: 'Remaining', value: stats.remaining, color: '#78350F' },
            { label: 'Confirmed', value: stats.confirmed, color: '#1E40AF' },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, padding: '10px 8px', textAlign: 'center', borderRight: '1px solid var(--border-light)' }}>
              <p style={{ fontFamily: 'Poppins', fontSize: '20px', fontWeight: 700, color: s.color, margin: 0, lineHeight: 1 }}>{s.value ?? 0}</p>
              <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: '3px 0 0', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Mode tabs */}
      <div style={{ background: 'var(--white)', borderBottom: '1px solid var(--border-light)', flexShrink: 0 }}>
        <div style={{ display: 'flex', maxWidth: '480px', margin: '0 auto' }}>
          {['camera', 'manual', 'search'].map(m => (
            <button key={m} onClick={() => { setMode(m); if (m !== 'camera') stopCamera(); setScanResult(null); setSearchResults([]); }} style={{
              flex: 1, padding: '12px 8px', border: 'none', cursor: 'pointer',
              background: mode === m ? 'var(--cream-dark)' : 'transparent',
              color: mode === m ? 'var(--primary-dark)' : 'var(--text-muted)',
              fontSize: '13px', fontWeight: mode === m ? 600 : 400,
              fontFamily: 'Inter', textTransform: 'capitalize',
              borderBottom: mode === m ? '2px solid var(--primary)' : '2px solid transparent',
              transition: 'all 0.2s',
            }}>
              {m === 'camera' ? 'Camera Scan' : m === 'manual' ? 'Enter Code' : 'Search Guest'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
        <div style={{ maxWidth: '480px', margin: '0 auto' }}>

          {/* ── SCAN RESULT ── */}
          {scanResult && rc && (
            <div style={{
              background: rc.bg, border: `2px solid ${rc.border}`,
              borderRadius: 'var(--radius-lg)', padding: '20px',
              marginBottom: '16px', textAlign: 'center',
              animation: 'fadeIn 0.2s ease',
            }}>
              <div style={{ fontSize: '40px', fontWeight: 700, color: rc.border, marginBottom: '8px', lineHeight: 1 }}>{rc.icon}</div>
              <h3 style={{ fontFamily: 'Poppins', fontSize: '18px', fontWeight: 700, color: rc.textColor, margin: '0 0 6px' }}>{rc.title}</h3>
              <p style={{ color: rc.textColor, fontSize: '14px', margin: '0 0 8px', opacity: 0.85 }}>{scanResult.message}</p>
              {scanResult.guest && (
                <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '10px 14px', marginTop: '8px' }}>
                  <p style={{ color: rc.textColor, fontWeight: 700, fontSize: '16px', margin: '0 0 2px', fontFamily: 'Poppins' }}>{scanResult.guest.guestName}</p>
                  <p style={{ color: rc.textColor, fontSize: '13px', margin: 0, opacity: 0.7 }}>
                    {scanResult.guest.ticketLabel || scanResult.guest.ticketType}
                    {scanResult.guest.remaining !== undefined && ` • ${scanResult.guest.remaining} entries remaining`}
                  </p>
                </div>
              )}
              <button onClick={() => { setScanResult(null); setScanning(false); setManualCode(''); setTimeout(() => manualRef.current?.focus(), 100); }} style={{
                marginTop: '14px', padding: '8px 24px', background: 'rgba(255,255,255,0.15)',
                border: '1px solid rgba(255,255,255,0.3)', borderRadius: '8px',
                color: rc.textColor, fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter', fontWeight: 500,
              }}>
                Scan Next
              </button>
            </div>
          )}

          {/* ── CAMERA MODE ── */}
          {mode === 'camera' && (
            <div>
              {/* Camera view */}
              <div style={{
                background: '#000',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                width: '100%',
                aspectRatio: '4/3',
                maxHeight: '340px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
                marginBottom: '12px',
                border: isScanning ? '3px solid var(--secondary)' : '3px solid var(--border)',
                boxSizing: 'border-box',
              }}>
                {isScanning ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    {/* Scan guide overlay */}
                    <div style={{
                      position: 'absolute',
                      top: '50%', left: '50%',
                      transform: 'translate(-50%, -50%)',
                      width: '55%', aspectRatio: '1',
                      border: '2px solid var(--secondary)',
                      borderRadius: '8px',
                      boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)',
                      zIndex: 2,
                    }} />
                    {scanning && (
                      <div style={{ position: 'absolute', bottom: '10px', left: 0, right: 0, textAlign: 'center', zIndex: 3 }}>
                        <span style={{ background: 'rgba(0,0,0,0.7)', color: 'white', fontSize: '12px', padding: '4px 12px', borderRadius: '20px' }}>
                          Processing...
                        </span>
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', padding: '20px' }}>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '12px' }}>
                      <path d="M23 7V3a2 2 0 00-2-2h-4M23 17v4a2 2 0 01-2 2h-4M1 7V3a2 2 0 012-2h4M1 17v4a2 2 0 002 2h4"/>
                      <rect x="7" y="7" width="10" height="10" rx="1"/>
                    </svg>
                    <p style={{ fontSize: '13px', margin: 0 }}>Tap button to start camera</p>
                  </div>
                )}
              </div>

              {/* Start/Stop button — full width */}
              <button
                onClick={isScanning ? stopCamera : startCamera}
                style={{
                  width: '100%',
                  padding: '14px',
                  background: isScanning ? '#7F1D1D' : 'var(--primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius)',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'Poppins',
                  display: 'block',
                  boxSizing: 'border-box',
                }}
              >
                {isScanning ? 'Stop Camera' : 'Start Camera Scan'}
              </button>
            </div>
          )}

          {/* ── MANUAL CODE MODE ── */}
          {mode === 'manual' && (
            <div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Verification Code or QR Data
                </label>
                <input
                  ref={manualRef}
                  type="text"
                  value={manualCode}
                  onChange={e => setManualCode(e.target.value)}
                  placeholder="Enter code..."
                  autoFocus
                  onKeyPress={e => e.key === 'Enter' && handleManualScan()}
                  style={{
                    width: '100%', padding: '13px 14px',
                    border: '2px solid var(--border)', borderRadius: 'var(--radius)',
                    fontSize: '15px', color: 'var(--text-primary)',
                    outline: 'none', fontFamily: 'Inter', boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>
              <button
                onClick={handleManualScan}
                disabled={scanMutation.isPending || scanning}
                style={{
                  width: '100%', padding: '14px',
                  background: scanning ? 'var(--text-muted)' : 'var(--primary)',
                  color: 'white', border: 'none', borderRadius: 'var(--radius)',
                  fontSize: '15px', fontWeight: 600,
                  cursor: scanning ? 'not-allowed' : 'pointer',
                  fontFamily: 'Poppins', boxShadow: 'var(--shadow-md)',
                }}
              >
                {scanning ? 'Checking...' : 'Verify Entry'}
              </button>
            </div>
          )}

          {/* ── SEARCH MODE ── */}
          {mode === 'search' && (
            <div>
              <div style={{ marginBottom: '12px', position: 'relative' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}>
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search by name, phone, or code..."
                  autoFocus
                  style={{
                    width: '100%', padding: '13px 14px 13px 40px',
                    border: '2px solid var(--border)', borderRadius: 'var(--radius)',
                    fontSize: '14px', color: 'var(--text-primary)',
                    outline: 'none', fontFamily: 'Inter', boxSizing: 'border-box',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                  onBlur={e => e.target.style.borderColor = 'var(--border)'}
                />
              </div>

              {searchQuery && searchResults.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', padding: '20px' }}>No guests found</p>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {searchResults.map(g => (
                  <div key={g._id} style={{
                    background: 'var(--white)', borderRadius: 'var(--radius)',
                    padding: '14px 16px', border: '1px solid var(--border-light)',
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 600, fontSize: '14px', color: 'var(--primary-dark)', margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.guestName}</p>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                        {g.phone} &bull; <span style={{ color: g.scanStatus === 'scanned' ? 'var(--success)' : 'var(--text-muted)', fontWeight: 500, textTransform: 'capitalize' }}>{g.scanStatus?.replace('_',' ')}</span>
                      </p>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                      <span style={{ padding: '3px 10px', background: 'var(--cream-dark)', borderRadius: '20px', fontSize: '11px', fontWeight: 600, color: 'var(--primary)', border: '1px solid var(--border)' }}>{g.ticketType}</span>
                      <button
                        onClick={() => {
                          if (g.qrToken) doScan(g.qrToken);
                          else toast.error('No QR token. Generate QR first.');
                        }}
                        style={{
                          padding: '6px 14px', background: 'var(--primary)', color: 'white',
                          border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '12px',
                          cursor: 'pointer', fontFamily: 'Inter', fontWeight: 500,
                        }}
                      >
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
