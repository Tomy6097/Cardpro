import React, { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsAPI, cardsAPI, guestsAPI } from '../api';
import toast from 'react-hot-toast';
import Button from '../components/common/Button';

const CardGenerator = () => {
  const { id: eventId } = useParams();
  const qc = useQueryClient();
  const templateRef = useRef();

  const { data: eventData, isLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventsAPI.getOne(eventId).then(r => r.data),
  });

  const [config, setConfig] = useState(null);

  React.useEffect(() => {
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
    onSuccess: () => { qc.invalidateQueries(['event', eventId]); toast.success('Template uploaded.'); },
    onError: (err) => toast.error(err.message),
  });

  const saveConfigMutation = useMutation({
    mutationFn: (d) => eventsAPI.updateCardConfig(eventId, d),
    onSuccess: () => { qc.invalidateQueries(['event', eventId]); toast.success('Card configuration saved.'); },
    onError: (err) => toast.error(err.message),
  });

  const generateAllMutation = useMutation({
    mutationFn: () => cardsAPI.generateAll(eventId),
    onSuccess: (r) => { toast.success(`${r.data.generated} cards generated.`); qc.invalidateQueries(['guests', eventId]); },
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

  const ev = eventData?.event;
  const template = ev?.cardTemplate;

  if (isLoading) return <div className="page-container"><div className="skeleton" style={{ height: '300px' }} /></div>;

  return (
    <div className="page-container fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
        <Link to="/events" style={{ color: 'var(--primary)' }}>Events</Link>
        <span>/</span>
        <Link to={`/events/${eventId}`} style={{ color: 'var(--primary)' }}>{ev?.name}</Link>
        <span>/</span>
        <span>Card Generator</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h1 style={{ fontFamily: 'Poppins', fontSize: '22px', fontWeight: 700, color: 'var(--primary-dark)', margin: 0 }}>
          Digital Card Generator
        </h1>
        {template?.url && (
          <Button variant="primary" onClick={() => generateAllMutation.mutate()} loading={generateAllMutation.isPending}>
            Generate All Cards
          </Button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '24px' }}>
        {/* Preview panel */}
        <div>
          <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-light)', padding: '24px', marginBottom: '20px' }}>
            <h3 style={{ fontFamily: 'Poppins', fontSize: '15px', fontWeight: 600, color: 'var(--primary-dark)', marginBottom: '16px' }}>Card Template</h3>

            {template?.url ? (
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <img
                  src={template.url} alt="Card template"
                  style={{ maxWidth: '100%', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-lg)' }}
                />
                {/* QR position indicator */}
                {config?.showQR && (
                  <div style={{
                    position: 'absolute',
                    left: `${config.qrPosition.x}%`, top: `${config.qrPosition.y}%`,
                    transform: 'translate(-50%, -50%)',
                    width: `${config.qrSize * 0.3}px`, height: `${config.qrSize * 0.3}px`,
                    border: '2px dashed var(--secondary)',
                    borderRadius: '4px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(201,168,76,0.2)',
                    fontSize: '10px', color: 'var(--secondary)', fontWeight: 700,
                  }}>QR</div>
                )}
                {/* Name position indicator */}
                <div style={{
                  position: 'absolute',
                  left: `${config?.guestNamePosition?.x || 50}%`, top: `${config?.guestNamePosition?.y || 85}%`,
                  transform: 'translateX(-50%)',
                  background: 'rgba(92,61,17,0.7)',
                  color: 'var(--white)', fontSize: '11px', padding: '2px 8px',
                  borderRadius: '4px', whiteSpace: 'nowrap',
                }}>Guest Name</div>
              </div>
            ) : (
              <div style={{
                border: '2px dashed var(--border)', borderRadius: 'var(--radius)',
                padding: '60px 40px', textAlign: 'center',
              }}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ marginBottom: '16px' }}>
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                </svg>
                <p style={{ color: 'var(--text-muted)', marginBottom: '16px' }}>No template uploaded yet</p>
                <Button variant="secondary" onClick={() => templateRef.current?.click()}>Upload Template</Button>
                <input ref={templateRef} type="file" accept=".png,.jpg,.jpeg" onChange={handleTemplateUpload} style={{ display: 'none' }} />
              </div>
            )}

            {template?.url && (
              <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
                <Button variant="secondary" size="sm" onClick={() => templateRef.current?.click()} loading={uploadTemplateMutation.isPending}>
                  Replace Template
                </Button>
                <input ref={templateRef} type="file" accept=".png,.jpg,.jpeg" onChange={handleTemplateUpload} style={{ display: 'none' }} />
              </div>
            )}
          </div>
        </div>

        {/* Config panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {config && (
            <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-light)', padding: '24px' }}>
              <h3 style={{ fontFamily: 'Poppins', fontSize: '15px', fontWeight: 600, color: 'var(--primary-dark)', marginBottom: '20px' }}>
                Card Configuration
              </h3>

              {/* QR toggle */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', padding: '12px 0', borderBottom: '1px solid var(--border-light)' }}>
                <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>Show QR Code</span>
                <button onClick={() => setConfig(p => ({ ...p, showQR: !p.showQR }))} style={{
                  width: '44px', height: '24px', borderRadius: '12px',
                  background: config.showQR ? 'var(--primary)' : 'var(--border)',
                  border: 'none', cursor: 'pointer', position: 'relative', transition: 'background var(--transition)',
                }}>
                  <div style={{
                    width: '18px', height: '18px', borderRadius: '50%',
                    background: 'var(--white)',
                    position: 'absolute', top: '3px',
                    left: config.showQR ? '23px' : '3px',
                    transition: 'left var(--transition)',
                  }} />
                </button>
              </div>

              {config.showQR && (
                <>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>QR Position (%)</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Left %</label>
                      <input type="number" min="0" max="100" value={config.qrPosition.x}
                        onChange={e => setConfig(p => ({ ...p, qrPosition: { ...p.qrPosition, x: Number(e.target.value) } }))}
                        style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '13px', outline: 'none' }} />
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Top %</label>
                      <input type="number" min="0" max="100" value={config.qrPosition.y}
                        onChange={e => setConfig(p => ({ ...p, qrPosition: { ...p.qrPosition, y: Number(e.target.value) } }))}
                        style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '13px', outline: 'none' }} />
                    </div>
                  </div>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>QR Size (px)</label>
                    <input type="range" min="80" max="300" value={config.qrSize}
                      onChange={e => setConfig(p => ({ ...p, qrSize: Number(e.target.value) }))}
                      style={{ width: '100%', accentColor: 'var(--primary)' }} />
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{config.qrSize}px</span>
                  </div>
                </>
              )}

              <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>Guest Name</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Left %</label>
                  <input type="number" min="0" max="100" value={config.guestNamePosition.x}
                    onChange={e => setConfig(p => ({ ...p, guestNamePosition: { ...p.guestNamePosition, x: Number(e.target.value) } }))}
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '13px', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Top %</label>
                  <input type="number" min="0" max="100" value={config.guestNamePosition.y}
                    onChange={e => setConfig(p => ({ ...p, guestNamePosition: { ...p.guestNamePosition, y: Number(e.target.value) } }))}
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '13px', outline: 'none' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Name Color</label>
                  <input type="color" value={config.guestNameColor}
                    onChange={e => setConfig(p => ({ ...p, guestNameColor: e.target.value }))}
                    style={{ width: '100%', height: '36px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', cursor: 'pointer' }} />
                </div>
                <div>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Font Size</label>
                  <input type="number" min="10" max="72" value={config.guestNameFontSize}
                    onChange={e => setConfig(p => ({ ...p, guestNameFontSize: Number(e.target.value) }))}
                    style={{ width: '100%', padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '13px', outline: 'none' }} />
                </div>
              </div>

              <Button variant="primary" fullWidth onClick={() => saveConfigMutation.mutate(config)} loading={saveConfigMutation.isPending}>
                Save Configuration
              </Button>
            </div>
          )}

          {!config && (
            <div style={{ background: 'var(--warning-light)', borderRadius: 'var(--radius)', padding: '16px', fontSize: '13px', color: 'var(--warning)', border: '1px solid #F0C040' }}>
              Upload a card template first to configure the positions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CardGenerator;
