import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsAPI, cardsAPI } from '../api';
import toast from 'react-hot-toast';
import Button from '../components/common/Button';

const CardGenerator = () => {
  const { id: eventId } = useParams();
  const qc = useQueryClient();
  const templateRef = useRef();
  const canvasRef = useRef();
  const imgRef = useRef();

  const [config, setConfig] = useState(null);
  const [activeElement, setActiveElement] = useState(null); // 'qr' | 'name' | null
  const [dragging, setDragging] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  const { data: eventData, isLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventsAPI.getOne(eventId).then(r => r.data),
  });

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
      toast.success('Template uploaded successfully.');
    },
    onError: (err) => toast.error(err.message),
  });

  const saveConfigMutation = useMutation({
    mutationFn: (d) => eventsAPI.updateCardConfig(eventId, d),
    onSuccess: () => {
      qc.invalidateQueries(['event', eventId]);
      toast.success('Configuration saved.');
    },
    onError: (err) => toast.error(err.message),
  });

  const generateAllMutation = useMutation({
    mutationFn: () => cardsAPI.generateAll(eventId),
    onSuccess: (r) => {
      toast.success(`${r.data.generated} cards generated.`);
      qc.invalidateQueries(['guests', eventId]);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleTemplateUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('template', file);
    uploadTemplateMutation.mutate({ fd });
    e.target.value = '';
  };

  // Get click/drag position as percentage on the preview image
  const getPercentPosition = useCallback((e) => {
    const img = imgRef.current;
    if (!img) return null;
    const rect = img.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const x = Math.round(((clientX - rect.left) / rect.width) * 100);
    const y = Math.round(((clientY - rect.top) / rect.height) * 100);
    return {
      x: Math.max(5, Math.min(95, x)),
      y: Math.max(5, Math.min(95, y)),
    };
  }, []);

  const handleCanvasClick = useCallback((e) => {
    if (!activeElement || !config) return;
    const pos = getPercentPosition(e);
    if (!pos) return;

    if (activeElement === 'qr') {
      setConfig(p => ({ ...p, qrPosition: pos }));
    } else if (activeElement === 'name') {
      setConfig(p => ({ ...p, guestNamePosition: pos }));
    }
  }, [activeElement, config, getPercentPosition]);

  const handleMouseMove = useCallback((e) => {
    if (!dragging || !activeElement || !config) return;
    const pos = getPercentPosition(e);
    if (!pos) return;
    if (activeElement === 'qr') {
      setConfig(p => ({ ...p, qrPosition: pos }));
    } else if (activeElement === 'name') {
      setConfig(p => ({ ...p, guestNamePosition: pos }));
    }
  }, [dragging, activeElement, config, getPercentPosition]);

  const ev = eventData?.event;
  const template = ev?.cardTemplate;

  if (isLoading) return (
    <div className="page-container">
      <div className="skeleton" style={{ height: '400px' }} />
    </div>
  );

  const qrSizePct = config ? (config.qrSize / 10) : 15; // approx % of preview

  return (
    <div className="page-container fade-in">
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
        <Link to="/events" style={{ color: 'var(--primary)' }}>Events</Link>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        <Link to={`/events/${eventId}`} style={{ color: 'var(--primary)' }}>{ev?.name}</Link>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        <span>Card Generator</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'Poppins', fontSize: '22px', fontWeight: 700, color: 'var(--primary-dark)', margin: 0 }}>
            Digital Card Generator
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0' }}>
            Click on the template to position QR code and guest name
          </p>
        </div>
        {template?.url && (
          <Button variant="primary" onClick={() => generateAllMutation.mutate()} loading={generateAllMutation.isPending}>
            Generate All Cards
          </Button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '24px' }}>

        {/* ── LEFT: Template Preview with click-to-position ── */}
        <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-light)', padding: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontFamily: 'Poppins', fontSize: '15px', fontWeight: 600, color: 'var(--primary-dark)', margin: 0 }}>
              Card Preview
            </h3>
            <button onClick={() => templateRef.current?.click()} style={{
              padding: '7px 16px', borderRadius: 'var(--radius-sm)',
              background: 'var(--cream-dark)', color: 'var(--primary)',
              border: '1px solid var(--border)', fontSize: '13px',
              cursor: 'pointer', fontFamily: 'Inter', fontWeight: 500,
            }}>
              {template?.url ? 'Replace Template' : 'Upload Template'}
            </button>
            <input ref={templateRef} type="file" accept=".png,.jpg,.jpeg" onChange={handleTemplateUpload} style={{ display: 'none' }} />
          </div>

          {template?.url ? (
            <>
              {/* Active element selector */}
              {config && (
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)', fontWeight: 500 }}>Click to move:</span>
                  <button onClick={() => setActiveElement(activeElement === 'qr' ? null : 'qr')} style={{
                    padding: '6px 14px', borderRadius: 'var(--radius-sm)',
                    background: activeElement === 'qr' ? 'var(--primary)' : 'var(--cream-dark)',
                    color: activeElement === 'qr' ? 'var(--white)' : 'var(--primary)',
                    border: `2px solid ${activeElement === 'qr' ? 'var(--primary)' : 'var(--border)'}`,
                    fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter',
                    display: 'flex', alignItems: 'center', gap: '6px',
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                      <rect x="3" y="14" width="7" height="7"/><path d="M14 14h.01M14 17h.01M17 14h.01M17 17h.01M20 14h.01M20 17h.01M20 20h.01M17 20h.01M14 20h.01"/>
                    </svg>
                    QR Code {activeElement === 'qr' && '(active)'}
                  </button>
                  <button onClick={() => setActiveElement(activeElement === 'name' ? null : 'name')} style={{
                    padding: '6px 14px', borderRadius: 'var(--radius-sm)',
                    background: activeElement === 'name' ? 'var(--secondary)' : 'var(--cream-dark)',
                    color: activeElement === 'name' ? 'var(--white)' : 'var(--primary)',
                    border: `2px solid ${activeElement === 'name' ? 'var(--secondary)' : 'var(--border)'}`,
                    fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'Inter',
                    display: 'flex', alignItems: 'center', gap: '6px',
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>
                    </svg>
                    Guest Name {activeElement === 'name' && '(active)'}
                  </button>
                  {activeElement && (
                    <button onClick={() => setActiveElement(null)} style={{
                      padding: '6px 10px', borderRadius: 'var(--radius-sm)',
                      background: 'var(--danger-light)', color: 'var(--danger)',
                      border: 'none', fontSize: '12px', cursor: 'pointer', fontFamily: 'Inter',
                    }}>
                      Cancel
                    </button>
                  )}
                </div>
              )}

              {/* Instruction */}
              {activeElement && (
                <div style={{
                  background: activeElement === 'qr' ? 'rgba(92,61,17,0.08)' : 'rgba(201,168,76,0.12)',
                  borderRadius: 'var(--radius-sm)', padding: '8px 14px', marginBottom: '10px',
                  fontSize: '13px', color: 'var(--primary)', fontWeight: 500,
                  display: 'flex', alignItems: 'center', gap: '8px',
                }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                  Click anywhere on the card to place {activeElement === 'qr' ? 'QR Code' : 'Guest Name'}
                </div>
              )}

              {/* Template with overlay markers */}
              <div
                ref={canvasRef}
                style={{
                  position: 'relative',
                  display: 'inline-block',
                  width: '100%',
                  cursor: activeElement ? 'crosshair' : 'default',
                  userSelect: 'none',
                  borderRadius: 'var(--radius)',
                  overflow: 'hidden',
                  boxShadow: activeElement ? `0 0 0 3px ${activeElement === 'qr' ? 'var(--primary)' : 'var(--secondary)'}` : 'var(--shadow-lg)',
                  transition: 'box-shadow 0.2s',
                }}
                onClick={handleCanvasClick}
                onMouseMove={handleMouseMove}
                onMouseDown={() => setDragging(true)}
                onMouseUp={() => setDragging(false)}
                onMouseLeave={() => setDragging(false)}
              >
                <img
                  ref={imgRef}
                  src={template.url}
                  alt="Card template"
                  onLoad={() => setImgLoaded(true)}
                  style={{ width: '100%', display: 'block', pointerEvents: 'none' }}
                />

                {imgLoaded && config && (
                  <>
                    {/* QR Code marker */}
                    {config.showQR && (
                      <div
                        style={{
                          position: 'absolute',
                          left: `${config.qrPosition.x}%`,
                          top: `${config.qrPosition.y}%`,
                          transform: 'translate(-50%, -50%)',
                          width: `${qrSizePct}%`,
                          aspectRatio: '1',
                          border: `3px solid ${activeElement === 'qr' ? '#FFFFFF' : 'rgba(92,61,17,0.8)'}`,
                          borderRadius: '6px',
                          background: activeElement === 'qr' ? 'rgba(92,61,17,0.3)' : 'rgba(255,255,255,0.15)',
                          backdropFilter: 'blur(2px)',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: activeElement === 'qr' ? '0 0 0 3px rgba(92,61,17,0.4)' : 'none',
                          pointerEvents: 'none',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                          <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                          <rect x="3" y="14" width="7" height="7"/>
                        </svg>
                        <span style={{ color: 'white', fontSize: '9px', fontWeight: 700, marginTop: '2px', textShadow: '0 1px 2px rgba(0,0,0,0.8)' }}>QR</span>
                      </div>
                    )}

                    {/* Guest Name marker */}
                    <div
                      style={{
                        position: 'absolute',
                        left: `${config.guestNamePosition.x}%`,
                        top: `${config.guestNamePosition.y}%`,
                        transform: 'translate(-50%, -50%)',
                        padding: '4px 12px',
                        background: activeElement === 'name' ? 'rgba(201,168,76,0.5)' : 'rgba(0,0,0,0.35)',
                        backdropFilter: 'blur(4px)',
                        borderRadius: '4px',
                        border: `2px solid ${activeElement === 'name' ? 'var(--secondary)' : 'rgba(255,255,255,0.6)'}`,
                        pointerEvents: 'none',
                        whiteSpace: 'nowrap',
                        boxShadow: activeElement === 'name' ? '0 0 0 3px rgba(201,168,76,0.4)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <span style={{
                        color: config.guestNameColor,
                        fontSize: `${Math.max(10, config.guestNameFontSize * 0.4)}px`,
                        fontFamily: 'Poppins',
                        fontWeight: 700,
                        textShadow: '0 1px 3px rgba(0,0,0,0.9)',
                      }}>
                        Guest Name
                      </span>
                    </div>
                  </>
                )}
              </div>

              {config && (
                <div style={{ marginTop: '12px', display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <span>QR: {config.qrPosition.x}%, {config.qrPosition.y}%</span>
                  <span>Name: {config.guestNamePosition.x}%, {config.guestNamePosition.y}%</span>
                </div>
              )}
            </>
          ) : (
            <div style={{
              border: '2px dashed var(--border)', borderRadius: 'var(--radius)',
              padding: '60px 40px', textAlign: 'center',
            }}>
              {uploadTemplateMutation.isPending ? (
                <div style={{ color: 'var(--text-muted)' }}>Uploading...</div>
              ) : (
                <>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ marginBottom: '16px' }}>
                    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                  <p style={{ color: 'var(--text-muted)', marginBottom: '16px', fontSize: '14px' }}>
                    No template uploaded yet.<br/>Upload a card design (PNG or JPG)
                  </p>
                  <Button variant="primary" onClick={() => templateRef.current?.click()}>
                    Upload Template
                  </Button>
                </>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT: Configuration Panel ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {config ? (
            <>
              <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-light)', padding: '20px' }}>
                <h3 style={{ fontFamily: 'Poppins', fontSize: '14px', fontWeight: 600, color: 'var(--primary-dark)', marginBottom: '16px' }}>
                  Configuration
                </h3>

                {/* QR Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', padding: '10px 0', borderBottom: '1px solid var(--border-light)' }}>
                  <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)' }}>Show QR Code</span>
                  <button onClick={() => setConfig(p => ({ ...p, showQR: !p.showQR }))} style={{
                    width: '44px', height: '24px', borderRadius: '12px',
                    background: config.showQR ? 'var(--primary)' : 'var(--border)',
                    border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
                  }}>
                    <div style={{
                      width: '18px', height: '18px', borderRadius: '50%', background: 'white',
                      position: 'absolute', top: '3px',
                      left: config.showQR ? '23px' : '3px', transition: 'left 0.2s',
                    }} />
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
                      style={{ width: '100%', accentColor: 'var(--primary)', cursor: 'pointer' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                      <span>Small</span><span>Large</span>
                    </div>
                  </div>
                )}

                {/* Name Color */}
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: '6px' }}>
                    Name Color
                  </label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <input type="color" value={config.guestNameColor}
                      onChange={e => setConfig(p => ({ ...p, guestNameColor: e.target.value }))}
                      style={{ width: '40px', height: '36px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', padding: '2px' }}
                    />
                    <input type="text" value={config.guestNameColor}
                      onChange={e => setConfig(p => ({ ...p, guestNameColor: e.target.value }))}
                      style={{ flex: 1, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '13px', outline: 'none', fontFamily: 'monospace' }}
                    />
                  </div>
                </div>

                {/* Font Size */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>Font Size</label>
                    <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 600 }}>{config.guestNameFontSize}px</span>
                  </div>
                  <input type="range" min="10" max="72" value={config.guestNameFontSize}
                    onChange={e => setConfig(p => ({ ...p, guestNameFontSize: Number(e.target.value) }))}
                    style={{ width: '100%', accentColor: 'var(--secondary)', cursor: 'pointer' }}
                  />
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)' }}>
                    <span>Small</span><span>Large</span>
                  </div>
                </div>

                {/* Alignment */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: '8px' }}>
                    Name Alignment
                  </label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    {['left', 'center', 'right'].map(align => (
                      <button key={align} onClick={() => setConfig(p => ({ ...p, guestNameAlign: align }))} style={{
                        flex: 1, padding: '7px',
                        borderRadius: 'var(--radius-sm)',
                        background: config.guestNameAlign === align ? 'var(--primary)' : 'var(--cream-dark)',
                        color: config.guestNameAlign === align ? 'var(--white)' : 'var(--text-secondary)',
                        border: 'none', cursor: 'pointer', fontSize: '12px', fontFamily: 'Inter', fontWeight: 500,
                        textTransform: 'capitalize',
                      }}>
                        {align}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => saveConfigMutation.mutate(config)}
                  loading={saveConfigMutation.isPending}
                >
                  Save Configuration
                </Button>
              </div>

              {/* Quick help */}
              <div style={{ background: 'var(--info-light)', borderRadius: 'var(--radius)', padding: '14px 16px', fontSize: '12px', color: 'var(--info)', border: '1px solid #BFDBFE' }}>
                <p style={{ fontWeight: 600, margin: '0 0 6px' }}>How to position elements:</p>
                <p style={{ margin: '0 0 4px' }}>1. Click <strong>QR Code</strong> or <strong>Guest Name</strong> button above</p>
                <p style={{ margin: '0 0 4px' }}>2. Click anywhere on the card preview</p>
                <p style={{ margin: 0 }}>3. Click <strong>Save Configuration</strong> when done</p>
              </div>
            </>
          ) : (
            <div style={{ background: 'var(--warning-light)', borderRadius: 'var(--radius)', padding: '16px', fontSize: '13px', color: 'var(--warning)', border: '1px solid #F0C040' }}>
              Upload a card template first to configure positions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CardGenerator;
