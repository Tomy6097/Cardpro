import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsAPI, cardsAPI } from '../api';
import toast from 'react-hot-toast';
import Button from '../components/common/Button';

// Sample QR code as data URL (small black/white pattern)
const SAMPLE_QR = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="white"/><rect x="10" y="10" width="30" height="30" fill="black"/><rect x="15" y="15" width="20" height="20" fill="white"/><rect x="20" y="20" width="10" height="10" fill="black"/><rect x="60" y="10" width="30" height="30" fill="black"/><rect x="65" y="15" width="20" height="20" fill="white"/><rect x="70" y="20" width="10" height="10" fill="black"/><rect x="10" y="60" width="30" height="30" fill="black"/><rect x="15" y="65" width="20" height="20" fill="white"/><rect x="20" y="70" width="10" height="10" fill="black"/><rect x="45" y="10" width="5" height="5" fill="black"/><rect x="50" y="15" width="5" height="5" fill="black"/><rect x="45" y="20" width="5" height="5" fill="black"/><rect x="55" y="10" width="5" height="5" fill="black"/><rect x="45" y="45" width="5" height="5" fill="black"/><rect x="55" y="45" width="5" height="5" fill="black"/><rect x="65" y="45" width="5" height="5" fill="black"/><rect x="75" y="45" width="5" height="5" fill="black"/><rect x="45" y="55" width="5" height="5" fill="black"/><rect x="60" y="55" width="5" height="5" fill="black"/><rect x="70" y="55" width="5" height="5" fill="black"/><rect x="45" y="65" width="5" height="5" fill="black"/><rect x="55" y="65" width="5" height="5" fill="black"/><rect x="75" y="65" width="5" height="5" fill="black"/><rect x="45" y="75" width="5" height="5" fill="black"/><rect x="60" y="75" width="5" height="5" fill="black"/><rect x="55" y="85" width="5" height="5" fill="black"/><rect x="70" y="85" width="5" height="5" fill="black"/><rect x="80" y="85" width="5" height="5" fill="black"/></svg>';

const CardGenerator = () => {
  const { id: eventId } = useParams();
  const qc = useQueryClient();
  const templateRef = useRef();
  const imgRef = useRef();

  const [config, setConfig] = useState(null);
  const [activeElement, setActiveElement] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [sampleName] = useState('Tomy Johnson');
  const [previewMode, setPreviewMode] = useState(false);

  const { data: eventData, isLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventsAPI.getOne(eventId).then(r => r.data),
  });

  // Card generation progress polling
  const { data: cardProgressData } = useQuery({
    queryKey: ['card-progress', eventId],
    queryFn: () => cardsAPI.getProgress(eventId).then(r => r.data),
    refetchInterval: (data) => data?.status === 'running' ? 2000 : false,
  });
  const cardProgress = cardProgressData?.status === 'running' ? cardProgressData : null;

  // Check if guests have QR tokens (needed before generating cards)
  const { data: statsData } = useQuery({
    queryKey: ['event-stats', eventId],
    queryFn: () => eventsAPI.getStats(eventId).then(r => r.data),
  });
  const totalGuests = statsData?.stats?.total || 0;

  useEffect(() => {
    if (eventData?.event?.cardTemplate) {
      const t = eventData.event.cardTemplate;
      setConfig({
        qrPosition: t.qrPosition || { x: 70, y: 70 },
        qrSize: t.qrSize || 150,
        guestNamePosition: t.guestNamePosition || { x: 50, y: 85 },
        guestNameColor: t.guestNameColor || '#FFFFFF',
        guestNameFontSize: t.guestNameFontSize || 24,
        guestNameAlign: t.guestNameAlign || 'center',
        showQR: t.showQR !== false,
      });
    }
  }, [eventData]);

  const uploadTemplateMutation = useMutation({
    mutationFn: ({ fd }) => eventsAPI.uploadTemplate(eventId, fd),
    onSuccess: () => {
      qc.invalidateQueries(['event', eventId]);
      setImgLoaded(false);
      toast.success('Template uploaded.');
    },
    onError: (err) => toast.error(err.message),
  });

  const saveConfigMutation = useMutation({
    mutationFn: (d) => eventsAPI.updateCardConfig(eventId, d),
    onSuccess: () => { qc.invalidateQueries(['event', eventId]); toast.success('Configuration saved.'); },
    onError: (err) => toast.error(err.message),
  });

  const generateAllMutation = useMutation({
    mutationFn: (newOnly = false) => cardsAPI.generateAll(eventId, newOnly),
    onSuccess: (r) => {
      const total     = r.data.total    || 0;
      const withoutQR = r.data.withoutQR || 0;
      const newOnly   = r.data.newOnly;
      if (total === 0) {
        toast.success('All guests already have cards. Nothing to generate.', { duration: 5000 });
        return;
      }
      if (withoutQR > 0) {
        toast(`Generating ${total}${newOnly ? ' new' : ''} cards in background. ${withoutQR} guests have no QR — their cards will not have QR codes.`, { icon: '⚠️', duration: 6000 });
      } else {
        toast.success(`Generating ${total}${newOnly ? ' new' : ''} cards in background.`);
      }
      qc.invalidateQueries(['guests', eventId]);
      qc.invalidateQueries(['card-progress', eventId]);
    },
    onError: (err) => {
      const msg = err.response?.data?.hint
        ? `${err.response.data.message}\n\n${err.response.data.hint}`
        : err.response?.data?.message || err.message;
      toast.error(msg, { duration: 7000 });
    },
  });

  const handleTemplateUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('template', file);
    uploadTemplateMutation.mutate({ fd });
    e.target.value = '';
  };

  const getPercentPosition = useCallback((e) => {
    const img = imgRef.current;
    if (!img) return null;
    const rect = img.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: Math.max(3, Math.min(97, Math.round(((clientX - rect.left) / rect.width) * 100))),
      y: Math.max(3, Math.min(97, Math.round(((clientY - rect.top) / rect.height) * 100))),
    };
  }, []);

  const handleCanvasInteraction = useCallback((e) => {
    if (!activeElement || !config) return;
    const pos = getPercentPosition(e);
    if (!pos) return;
    if (activeElement === 'qr') setConfig(p => ({ ...p, qrPosition: pos }));
    else if (activeElement === 'name') setConfig(p => ({ ...p, guestNamePosition: pos }));
  }, [activeElement, config, getPercentPosition]);

  const ev = eventData?.event;
  const template = ev?.cardTemplate;
  const qrSizePct = config ? Math.max(8, Math.min(30, config.qrSize / 8)) : 15;

  if (isLoading) return <div className="page-container"><div className="skeleton" style={{ height: '400px' }} /></div>;

  return (
    <div className="page-container fade-in">
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
        <Link to="/events" style={{ color: 'var(--primary)' }}>Events</Link>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        <Link to={`/events/${eventId}`} style={{ color: 'var(--primary)' }}>{ev?.name}</Link>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        <span>Card Generator</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'Poppins', fontSize: '22px', fontWeight: 700, color: 'var(--primary-dark)', margin: 0 }}>Digital Card Generator</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0' }}>
            {activeElement ? `Click on the card to place ${activeElement === 'qr' ? 'QR Code' : 'Guest Name'}` : 'Select an element to position it on the card'}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {template?.url && config && (
            <button onClick={() => setPreviewMode(p => !p)} style={{
              padding: '9px 18px', borderRadius: 'var(--radius)',
              background: previewMode ? 'var(--primary)' : 'var(--white)',
              color: previewMode ? 'var(--white)' : 'var(--primary)',
              border: '2px solid var(--primary)', fontSize: '13px',
              fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
              </svg>
              {previewMode ? 'Edit Mode' : 'Preview Card'}
            </button>
          )}
          {template?.url && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                {/* New guests only */}
                <button
                  onClick={() => generateAllMutation.mutate(true)}
                  disabled={generateAllMutation.isPending}
                  style={{
                    padding: '9px 16px', borderRadius: 'var(--radius)',
                    background: 'var(--cream-dark)', color: 'var(--primary)',
                    border: '1px solid var(--primary)', fontSize: '13px',
                    fontWeight: 600, cursor: generateAllMutation.isPending ? 'not-allowed' : 'pointer',
                    fontFamily: 'Inter', display: 'flex', alignItems: 'center', gap: '6px',
                    opacity: generateAllMutation.isPending ? 0.6 : 1,
                  }}
                  title="Generate cards for new guests only (no card yet)"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    <line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
                  </svg>
                  New Only
                </button>

                {/* Regenerate all */}
                <Button
                  variant="primary"
                  onClick={() => generateAllMutation.mutate(false)}
                  loading={generateAllMutation.isPending}
                  title="Regenerate cards for ALL guests (takes longer)"
                >
                  Generate All Cards
                </Button>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'Inter', textAlign: 'right' }}>
                "New Only" — guests without cards &nbsp;·&nbsp; "Generate All" — regenerate all
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Card Generation Progress Bar */}
      {cardProgress && (
        <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', border: '1px solid var(--secondary)', padding: '16px 20px', marginBottom: '16px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--secondary)', animation: 'pulse 1.5s ease-in-out infinite' }} />
              <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--primary-dark)', fontFamily: 'Poppins' }}>
                Generating cards...
              </span>
            </div>
            <span style={{ fontSize: '14px', color: 'var(--primary)', fontWeight: 700, fontFamily: 'Poppins' }}>
              {cardProgress.done} / {cardProgress.total} ({cardProgress.pct}%)
            </span>
          </div>
          <div style={{ background: 'var(--cream-dark)', borderRadius: '8px', height: '12px', overflow: 'hidden' }}>
            <div style={{
              width: `${cardProgress.pct}%`, height: '100%',
              background: 'linear-gradient(90deg, var(--primary), var(--secondary))',
              borderRadius: '8px',
              transition: 'width .6s ease',
            }} />
          </div>
          {cardProgress.failed > 0 && (
            <p style={{ fontSize: '12px', color: 'var(--danger)', margin: '8px 0 0' }}>
              ⚠ {cardProgress.failed} cards failed to generate
            </p>
          )}
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '6px 0 0' }}>
            This may take a few minutes depending on the number of guests
          </p>
          <style>{`@keyframes pulse{0%,100%{opacity:.6;transform:scale(1)}50%{opacity:1;transform:scale(1.3)}}`}</style>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '20px' }}>
        {/* LEFT: Preview / Edit Canvas */}
        <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-light)', padding: '20px' }}>

          {/* Top bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
            <h3 style={{ fontFamily: 'Poppins', fontSize: '14px', fontWeight: 600, color: 'var(--primary-dark)', margin: 0 }}>
              {previewMode ? 'Card Preview (Sample)' : 'Edit — Click to Position'}
            </h3>
            <button onClick={() => templateRef.current?.click()} style={{
              padding: '6px 14px', borderRadius: 'var(--radius-sm)',
              background: 'var(--cream-dark)', color: 'var(--primary)',
              border: '1px solid var(--border)', fontSize: '12px',
              cursor: 'pointer', fontFamily: 'Inter', fontWeight: 500,
            }}>
              {template?.url ? 'Replace' : 'Upload Template'}
            </button>
            <input ref={templateRef} type="file" accept=".png,.jpg,.jpeg" onChange={handleTemplateUpload} style={{ display: 'none' }} />
          </div>

          {/* Element selector buttons — only in edit mode */}
          {template?.url && config && !previewMode && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>Move:</span>
              {config.showQR && (
                <button onClick={() => setActiveElement(p => p === 'qr' ? null : 'qr')} style={{
                  padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                  background: activeElement === 'qr' ? 'var(--primary)' : 'transparent',
                  color: activeElement === 'qr' ? 'white' : 'var(--primary)',
                  border: `2px solid var(--primary)`, cursor: 'pointer', fontFamily: 'Inter',
                }}>
                  QR Code {activeElement === 'qr' && '✓'}
                </button>
              )}
              <button onClick={() => setActiveElement(p => p === 'name' ? null : 'name')} style={{
                padding: '5px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
                background: activeElement === 'name' ? 'var(--secondary)' : 'transparent',
                color: activeElement === 'name' ? 'white' : 'var(--gold)',
                border: `2px solid var(--secondary)`, cursor: 'pointer', fontFamily: 'Inter',
              }}>
                Guest Name {activeElement === 'name' && '✓'}
              </button>
              {activeElement && (
                <button onClick={() => setActiveElement(null)} style={{
                  padding: '5px 12px', borderRadius: '20px', background: 'var(--danger-light)',
                  color: 'var(--danger)', border: 'none', fontSize: '11px', cursor: 'pointer',
                }}>✕ Cancel</button>
              )}
            </div>
          )}

          {template?.url ? (
            <div
              ref={imgRef}
              style={{
                position: 'relative', display: 'block', width: '100%',
                cursor: (!previewMode && activeElement) ? 'crosshair' : 'default',
                userSelect: 'none', borderRadius: 'var(--radius)',
                overflow: 'hidden',
                boxShadow: (!previewMode && activeElement)
                  ? `0 0 0 3px ${activeElement === 'qr' ? 'var(--primary)' : 'var(--secondary)'}, var(--shadow-lg)`
                  : 'var(--shadow-lg)',
              }}
              onClick={!previewMode ? handleCanvasInteraction : undefined}
              onMouseMove={!previewMode && dragging ? handleCanvasInteraction : undefined}
              onMouseDown={() => !previewMode && setDragging(true)}
              onMouseUp={() => setDragging(false)}
              onMouseLeave={() => setDragging(false)}
            >
              {/* Template image */}
              <img
                src={template.url} alt="Card template"
                onLoad={() => setImgLoaded(true)}
                style={{ width: '100%', display: 'block', pointerEvents: 'none' }}
              />

              {imgLoaded && config && (
                <>
                  {/* ── QR Code overlay ── */}
                  {config.showQR && (
                    <div style={{
                      position: 'absolute',
                      left: `${config.qrPosition.x}%`,
                      top: `${config.qrPosition.y}%`,
                      transform: 'translate(-50%, -50%)',
                      width: `${qrSizePct}%`,
                      aspectRatio: '1',
                      pointerEvents: 'none',
                      transition: !dragging ? 'left 0.1s, top 0.1s' : 'none',
                    }}>
                      {previewMode ? (
                        /* Preview: real-looking QR */
                        <div style={{
                          width: '100%', height: '100%',
                          background: 'white', borderRadius: '6px',
                          padding: '6%', boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                          display: 'flex', flexDirection: 'column',
                          alignItems: 'center', justifyContent: 'center',
                        }}>
                          <img src={SAMPLE_QR} alt="QR" style={{ width: '100%', height: '85%', objectFit: 'contain' }} />
                          <span style={{ fontSize: '8px', fontWeight: 800, color: '#1A0A00', letterSpacing: '1px', marginTop: '2px' }}>
                            {ev?.cardTemplate?.ticketLabel || 'SINGLE'}
                          </span>
                        </div>
                      ) : (
                        /* Edit: dashed border indicator */
                        <div style={{
                          width: '100%', height: '100%',
                          border: `3px dashed ${activeElement === 'qr' ? 'white' : 'rgba(92,61,17,0.9)'}`,
                          borderRadius: '6px',
                          background: activeElement === 'qr' ? 'rgba(92,61,17,0.25)' : 'rgba(255,255,255,0.1)',
                          display: 'flex', flexDirection: 'column',
                          alignItems: 'center', justifyContent: 'center',
                          backdropFilter: 'blur(1px)',
                        }}>
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }}>
                            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                            <rect x="3" y="14" width="7" height="7"/>
                          </svg>
                          <span style={{ color: 'white', fontSize: '9px', fontWeight: 700, textShadow: '0 1px 3px rgba(0,0,0,0.9)', marginTop: '2px' }}>QR</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ── Guest Name overlay ── */}
                  <div style={{
                    position: 'absolute',
                    left: `${config.guestNamePosition.x}%`,
                    top: `${config.guestNamePosition.y}%`,
                    transform: config.guestNameAlign === 'center' ? 'translate(-50%, -50%)'
                      : config.guestNameAlign === 'right' ? 'translate(-100%, -50%)'
                      : 'translate(0%, -50%)',
                    pointerEvents: 'none',
                    transition: !dragging ? 'left 0.1s, top 0.1s' : 'none',
                    textAlign: config.guestNameAlign,
                    whiteSpace: 'nowrap',
                  }}>
                    {previewMode ? (
                      /* Preview: actual styled name */
                      <span style={{
                        color: config.guestNameColor,
                        fontSize: `${Math.max(8, config.guestNameFontSize * 0.45)}px`,
                        fontFamily: 'Poppins, sans-serif',
                        fontWeight: 700,
                        letterSpacing: '0.5px',
                        display: 'block',
                      }}>
                        {sampleName}
                      </span>
                    ) : (
                      /* Edit: label with dashed border */
                      <div style={{
                        padding: '3px 10px',
                        background: activeElement === 'name' ? 'rgba(201,168,76,0.4)' : 'rgba(0,0,0,0.3)',
                        border: `2px dashed ${activeElement === 'name' ? 'var(--secondary)' : 'rgba(255,255,255,0.7)'}`,
                        borderRadius: '4px', backdropFilter: 'blur(2px)',
                      }}>
                        <span style={{
                          color: config.guestNameColor,
                          fontSize: `${Math.max(9, config.guestNameFontSize * 0.4)}px`,
                          fontFamily: 'Poppins', fontWeight: 700,
                          textShadow: '0 1px 3px rgba(0,0,0,0.9)',
                        }}>
                          Guest Name
                        </span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div style={{ border: '2px dashed var(--border)', borderRadius: 'var(--radius)', padding: '60px', textAlign: 'center' }}>
              {uploadTemplateMutation.isPending ? (
                <p style={{ color: 'var(--text-muted)' }}>Uploading...</p>
              ) : (
                <>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ marginBottom: '14px' }}>
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>No template yet. Upload a card design.</p>
                  <Button variant="primary" onClick={() => templateRef.current?.click()}>Upload Template</Button>
                </>
              )}
            </div>
          )}

          {/* Position info bar */}
          {config && template?.url && (
            <div style={{ display: 'flex', gap: '16px', marginTop: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>
              {config.showQR && <span>QR: {config.qrPosition.x}%, {config.qrPosition.y}%</span>}
              <span>Name: {config.guestNamePosition.x}%, {config.guestNamePosition.y}%</span>
            </div>
          )}
        </div>

        {/* RIGHT: Config panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {config ? (
            <>
              <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-light)', padding: '20px' }}>
                <h3 style={{ fontFamily: 'Poppins', fontSize: '14px', fontWeight: 600, color: 'var(--primary-dark)', marginBottom: '16px' }}>Settings</h3>

                {/* QR Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '14px', borderBottom: '1px solid var(--border-light)' }}>
                  <span style={{ fontSize: '13px', fontWeight: 500 }}>Show QR Code</span>
                  <button onClick={() => setConfig(p => ({ ...p, showQR: !p.showQR }))} style={{
                    width: '44px', height: '24px', borderRadius: '12px',
                    background: config.showQR ? 'var(--primary)' : 'var(--border)',
                    border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                  }}>
                    <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: 'white', position: 'absolute', top: '3px', left: config.showQR ? '23px' : '3px', transition: 'left 0.2s' }} />
                  </button>
                </div>

                {/* QR Size */}
                {config.showQR && (
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                      <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>QR Size</label>
                      <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 600 }}>{config.qrSize}px</span>
                    </div>
                    <input type="range" min="60" max="300" value={config.qrSize}
                      onChange={e => setConfig(p => ({ ...p, qrSize: Number(e.target.value) }))}
                      style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }} />
                  </div>
                )}

                {/* Sample name preview */}
                <div style={{ marginBottom: '16px', paddingBottom: '14px', borderBottom: '1px solid var(--border-light)' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>Sample Name (preview only)</label>
                  <div style={{
                    padding: '8px 12px', borderRadius: 'var(--radius-sm)',
                    background: '#1A0A00', color: config.guestNameColor,
                    fontSize: `${Math.min(18, config.guestNameFontSize)}px`,
                    fontFamily: 'Poppins', fontWeight: 700, textAlign: config.guestNameAlign,
                  }}>
                    {sampleName}
                  </div>
                </div>

                {/* Name Color */}
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>Name Color</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input type="color" value={config.guestNameColor}
                      onChange={e => setConfig(p => ({ ...p, guestNameColor: e.target.value }))}
                      style={{ width: '40px', height: '36px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', padding: '2px' }} />
                    <input type="text" value={config.guestNameColor}
                      onChange={e => setConfig(p => ({ ...p, guestNameColor: e.target.value }))}
                      style={{ flex: 1, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '13px', outline: 'none', fontFamily: 'monospace' }} />
                  </div>
                </div>

                {/* Font Size */}
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>Font Size</label>
                    <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 600 }}>{config.guestNameFontSize}px</span>
                  </div>
                  <input type="range" min="10" max="72" value={config.guestNameFontSize}
                    onChange={e => setConfig(p => ({ ...p, guestNameFontSize: Number(e.target.value) }))}
                    style={{ width: '100%', accentColor: 'var(--secondary)', cursor: 'pointer' }} />
                </div>

                {/* Alignment */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: '8px' }}>Alignment</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {['left', 'center', 'right'].map(a => (
                      <button key={a} onClick={() => setConfig(p => ({ ...p, guestNameAlign: a }))} style={{
                        flex: 1, padding: '7px', borderRadius: 'var(--radius-sm)',
                        background: config.guestNameAlign === a ? 'var(--primary)' : 'var(--cream-dark)',
                        color: config.guestNameAlign === a ? 'white' : 'var(--text-secondary)',
                        border: 'none', cursor: 'pointer', fontSize: '12px', fontFamily: 'Inter', fontWeight: 500,
                        textTransform: 'capitalize',
                      }}>{a}</button>
                    ))}
                  </div>
                </div>

                <Button variant="primary" fullWidth onClick={() => saveConfigMutation.mutate(config)} loading={saveConfigMutation.isPending}>
                  Save Configuration
                </Button>
              </div>

              {/* Help box */}
              <div style={{ background: 'var(--info-light)', borderRadius: 'var(--radius)', padding: '14px', fontSize: '12px', color: '#1E40AF', border: '1px solid #BFDBFE', lineHeight: 1.6 }}>
                <p style={{ fontWeight: 700, margin: '0 0 6px' }}>How to use:</p>
                <p style={{ margin: '0 0 3px' }}>1. Click <b>QR Code</b> or <b>Guest Name</b></p>
                <p style={{ margin: '0 0 3px' }}>2. Click on the card where you want it</p>
                <p style={{ margin: '0 0 3px' }}>3. Click <b>Preview Card</b> to see the result</p>
                <p style={{ margin: 0 }}>4. Click <b>Save Configuration</b> when happy</p>
              </div>
            </>
          ) : (
            <div style={{ background: 'var(--warning-light)', borderRadius: 'var(--radius)', padding: '16px', fontSize: '13px', color: 'var(--warning)', border: '1px solid #F0C040' }}>
              Upload a card template first.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CardGenerator;
