import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { scannerAPI } from '../api';
import toast from 'react-hot-toast';

const Scanner = () => {
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [manualCode, setManualCode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [mode, setMode] = useState('camera'); // camera | manual | search
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const { data: eventsData } = useQuery({
    queryKey: ['scanner-events'],
    queryFn: () => scannerAPI.getEvents().then(r => r.data),
  });

  const { data: statsData, refetch: refetchStats } = useQuery({
    queryKey: ['live-stats', selectedEvent?._id],
    queryFn: () => scannerAPI.getLiveStats(selectedEvent._id).then(r => r.data),
    enabled: !!selectedEvent,
    refetchInterval: 5000,
  });

  const scanMutation = useMutation({
    mutationFn: (d) => scannerAPI.scan(d),
    onSuccess: (res) => {
      setScanResult(res.data);
      if (res.data.status === 'allowed') {
        toast.success(res.data.message, { duration: 3000 });
      } else if (res.data.status === 'duplicate') {
        toast.error(res.data.message, { duration: 4000 });
      } else {
        toast.error(res.data.message, { duration: 3000 });
      }
      refetchStats();
    },
    onError: (err) => toast.error(err.message),
  });

  const searchMutation = useMutation({
    mutationFn: (d) => scannerAPI.search(d),
  });

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setIsScanning(true);

      // Use ZXing if available, otherwise use interval-based approach
      const { BrowserQRCodeReader } = await import('@zxing/library').catch(() => ({ BrowserQRCodeReader: null }));
      if (BrowserQRCodeReader) {
        const reader = new BrowserQRCodeReader();
        reader.decodeFromStream(stream, videoRef.current, (result, err) => {
          if (result) {
            stopCamera();
            scanMutation.mutate({ token: result.text, eventId: selectedEvent._id });
          }
        });
      }
    } catch (err) {
      toast.error('Camera access denied or not available.');
    }
  }, [selectedEvent, stopCamera]);

  useEffect(() => {
    return () => stopCamera();
  }, [stopCamera]);

  const handleManualScan = () => {
    if (!manualCode.trim()) { toast.error('Enter a verification code.'); return; }
    scanMutation.mutate({ token: manualCode.trim(), eventId: selectedEvent._id });
    setManualCode('');
  };

  const handleSearch = () => {
    if (!searchQuery.trim()) return;
    searchMutation.mutate({ query: searchQuery, eventId: selectedEvent._id });
  };

  const events = eventsData?.events || [];
  const stats = statsData?.stats || {};

  const resultColors = {
    allowed: { bg: '#D1FAE5', border: '#2D6A4F', color: '#065F46' },
    duplicate: { bg: '#FEF3C7', border: '#D97706', color: '#92400E' },
    invalid: { bg: '#FEE2E2', border: '#DC2626', color: '#991B1B' },
  };

  if (!selectedEvent) {
    return (
      <div style={{ padding: '40px 24px', maxWidth: '480px', margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'Poppins', fontSize: '20px', fontWeight: 700, color: 'var(--white)', marginBottom: '8px' }}>
          Select Event
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '24px', fontSize: '14px' }}>
          Choose an event to start scanning
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {events.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '40px' }}>
              No active events assigned to you.
            </p>
          ) : events.map(ev => (
            <div key={ev._id} onClick={() => setSelectedEvent(ev)} style={{
              background: 'rgba(255,255,255,0.08)',
              borderRadius: 'var(--radius)', padding: '20px',
              cursor: 'pointer', border: '1px solid rgba(255,255,255,0.15)',
              transition: 'background var(--transition)',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
            >
              <h3 style={{ fontFamily: 'Poppins', fontSize: '16px', fontWeight: 600, color: 'var(--white)', margin: '0 0 6px' }}>{ev.name}</h3>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '13px', margin: 0 }}>{ev.venue}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
      {/* Event header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button onClick={() => { setSelectedEvent(null); setScanResult(null); stopCamera(); }} style={{
          background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 'var(--radius-sm)',
          padding: '8px', cursor: 'pointer', color: 'var(--white)',
          display: 'flex', alignItems: 'center',
        }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div>
          <h2 style={{ fontFamily: 'Poppins', fontSize: '18px', fontWeight: 700, color: 'var(--white)', margin: 0 }}>{selectedEvent.name}</h2>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', margin: 0 }}>{selectedEvent.venue}</p>
        </div>
      </div>

      {/* Live Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '20px' }}>
        {[
          { label: 'Total', value: stats.total, color: 'var(--white)' },
          { label: 'Entered', value: stats.entered, color: '#86EFAC' },
          { label: 'Remaining', value: stats.remaining, color: '#FDE68A' },
          { label: 'Confirmed', value: stats.confirmed, color: '#93C5FD' },
        ].map(s => (
          <div key={s.label} style={{ background: 'rgba(255,255,255,0.08)', borderRadius: 'var(--radius-sm)', padding: '12px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.1)' }}>
            <p style={{ fontFamily: 'Poppins', fontSize: '22px', fontWeight: 700, color: s.color, margin: '0 0 2px' }}>{s.value ?? 0}</p>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Mode tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', background: 'rgba(255,255,255,0.08)', borderRadius: 'var(--radius)', padding: '4px' }}>
        {['camera', 'manual', 'search'].map(m => (
          <button key={m} onClick={() => { setMode(m); if (m !== 'camera') stopCamera(); }} style={{
            flex: 1, padding: '9px', borderRadius: 'var(--radius-sm)',
            border: 'none', cursor: 'pointer',
            background: mode === m ? 'var(--white)' : 'transparent',
            color: mode === m ? 'var(--primary-dark)' : 'rgba(255,255,255,0.6)',
            fontSize: '13px', fontWeight: mode === m ? 600 : 400,
            fontFamily: 'Inter', textTransform: 'capitalize',
          }}>
            {m === 'camera' ? 'Camera' : m === 'manual' ? 'Code' : 'Search'}
          </button>
        ))}
      </div>

      {/* Camera mode */}
      {mode === 'camera' && (
        <div>
          <div style={{
            background: 'rgba(0,0,0,0.3)', borderRadius: 'var(--radius-lg)',
            overflow: 'hidden', aspectRatio: '1', marginBottom: '16px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid rgba(201,168,76,0.3)', position: 'relative',
          }}>
            {isScanning ? (
              <>
                <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                {/* Scanner overlay */}
                <div style={{ position: 'absolute', inset: '20%', border: '2px solid var(--secondary)', borderRadius: '8px', boxShadow: '0 0 0 999px rgba(0,0,0,0.4)' }} />
              </>
            ) : (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '12px' }}>
                  <path d="M23 7V3a2 2 0 00-2-2h-4M23 17v4a2 2 0 01-2 2h-4M1 7V3a2 2 0 012-2h4M1 17v4a2 2 0 002 2h4"/>
                  <rect x="7" y="7" width="10" height="10" rx="1"/>
                </svg>
                <p style={{ fontSize: '14px' }}>Tap to start camera</p>
              </div>
            )}
          </div>
          <button onClick={isScanning ? stopCamera : startCamera} style={{
            width: '100%', padding: '14px',
            background: isScanning ? 'var(--danger)' : 'var(--secondary)',
            color: 'var(--white)', border: 'none',
            borderRadius: 'var(--radius)', fontSize: '15px',
            fontWeight: 600, cursor: 'pointer', fontFamily: 'Poppins',
          }}>
            {isScanning ? 'Stop Camera' : 'Start Camera Scan'}
          </button>
        </div>
      )}

      {/* Manual code mode */}
      {mode === 'manual' && (
        <div>
          <input
            type="text" value={manualCode} onChange={e => setManualCode(e.target.value)}
            placeholder="Enter verification code or QR data"
            onKeyPress={e => e.key === 'Enter' && handleManualScan()}
            style={{
              width: '100%', padding: '14px 16px',
              border: '2px solid rgba(255,255,255,0.2)',
              borderRadius: 'var(--radius)', fontSize: '16px',
              color: 'var(--white)', background: 'rgba(255,255,255,0.08)',
              outline: 'none', fontFamily: 'Inter', marginBottom: '12px',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--secondary)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.2)'}
          />
          <button onClick={handleManualScan} disabled={scanMutation.isPending} style={{
            width: '100%', padding: '14px',
            background: 'var(--secondary)', color: 'var(--white)', border: 'none',
            borderRadius: 'var(--radius)', fontSize: '15px', fontWeight: 600,
            cursor: scanMutation.isPending ? 'not-allowed' : 'pointer', fontFamily: 'Poppins',
          }}>
            {scanMutation.isPending ? 'Checking...' : 'Verify Entry'}
          </button>
        </div>
      )}

      {/* Search mode */}
      {mode === 'search' && (
        <div>
          <input
            type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by name, phone, or code..."
            onKeyPress={e => e.key === 'Enter' && handleSearch()}
            style={{
              width: '100%', padding: '14px 16px',
              border: '2px solid rgba(255,255,255,0.2)',
              borderRadius: 'var(--radius)', fontSize: '15px',
              color: 'var(--white)', background: 'rgba(255,255,255,0.08)',
              outline: 'none', fontFamily: 'Inter', marginBottom: '12px',
            }}
            onFocus={e => e.target.style.borderColor = 'var(--secondary)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.2)'}
          />
          <button onClick={handleSearch} disabled={searchMutation.isPending} style={{
            width: '100%', padding: '14px',
            background: 'var(--secondary)', color: 'var(--white)', border: 'none',
            borderRadius: 'var(--radius)', fontSize: '15px', fontWeight: 600,
            cursor: 'pointer', fontFamily: 'Poppins', marginBottom: '16px',
          }}>Search</button>

          {searchMutation.data?.data?.guests?.map(g => (
            <div key={g._id} style={{
              background: 'rgba(255,255,255,0.08)', borderRadius: 'var(--radius)',
              padding: '14px 16px', marginBottom: '8px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              border: '1px solid rgba(255,255,255,0.1)',
            }}>
              <div>
                <p style={{ color: 'var(--white)', fontSize: '14px', fontWeight: 600, margin: '0 0 2px' }}>{g.guestName}</p>
                <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '12px', margin: 0 }}>{g.phone} • {g.ticketType}</p>
              </div>
              <button onClick={() => {
                if (g.qrToken) scanMutation.mutate({ token: g.qrToken, eventId: selectedEvent._id });
                else toast.error('This guest has no QR token. Generate QR codes first.');
              }} style={{
                padding: '8px 16px', background: 'var(--secondary)',
                color: 'var(--white)', border: 'none', borderRadius: 'var(--radius-sm)',
                fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter',
              }}>
                Allow Entry
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Scan Result */}
      {scanResult && (
        <div style={{
          marginTop: '20px', padding: '20px', borderRadius: 'var(--radius-lg)',
          background: resultColors[scanResult.status]?.bg || '#F3F4F6',
          border: '2px solid ' + (resultColors[scanResult.status]?.border || '#6B7280'),
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <div style={{ fontSize: '32px' }}>
              {scanResult.status === 'allowed' ? '✓' : scanResult.status === 'duplicate' ? '!' : '✗'}
            </div>
            <div>
              <p style={{ fontFamily: 'Poppins', fontSize: '18px', fontWeight: 700, color: resultColors[scanResult.status]?.color, margin: '0 0 2px' }}>
                {scanResult.status === 'allowed' ? 'Entry Allowed' : scanResult.status === 'duplicate' ? 'Already Used' : 'Invalid QR'}
              </p>
              <p style={{ fontSize: '13px', color: resultColors[scanResult.status]?.color, margin: 0, opacity: 0.8 }}>
                {scanResult.message}
              </p>
            </div>
          </div>
          {scanResult.guest && (
            <div style={{ borderTop: '1px solid ' + resultColors[scanResult.status]?.border, paddingTop: '12px' }}>
              <p style={{ fontWeight: 700, fontSize: '15px', color: resultColors[scanResult.status]?.color, margin: '0 0 4px' }}>
                {scanResult.guest.guestName}
              </p>
              <p style={{ fontSize: '13px', color: resultColors[scanResult.status]?.color, margin: 0, opacity: 0.7 }}>
                {scanResult.guest.ticketLabel} Ticket
                {scanResult.guest.remaining !== undefined && ` • ${scanResult.guest.remaining} entries remaining`}
              </p>
            </div>
          )}
          <button onClick={() => setScanResult(null)} style={{
            marginTop: '12px', width: '100%', padding: '10px',
            background: resultColors[scanResult.status]?.border,
            color: 'var(--white)', border: 'none', borderRadius: 'var(--radius-sm)',
            fontSize: '14px', cursor: 'pointer', fontFamily: 'Inter', fontWeight: 500,
          }}>
            Scan Next
          </button>
        </div>
      )}
    </div>
  );
};

export default Scanner;
