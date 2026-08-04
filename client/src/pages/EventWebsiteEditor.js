import React, { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsAPI } from '../api';
import toast from 'react-hot-toast';
import Button from '../components/common/Button';

const FONT_OPTIONS = [
  { value: 'serif', label: 'Serif (Classic)' },
  { value: 'sans-serif', label: 'Sans-Serif (Modern)' },
  { value: 'elegant', label: 'Elegant (Georgia)' },
];

const EventWebsiteEditor = () => {
  const { id: eventId } = useParams();
  const qc = useQueryClient();
  const dressRef = useRef();
  const photoRef = useRef();

  const [theme, setTheme] = useState({
    primaryColor: '#C9A84C',
    bgColor: '#1A0A00',
    accentColor: '#FFFFFF',
    fontStyle: 'serif',
  });
  const [dressCaption, setDressCaption] = useState('');
  const [dressGender, setDressGender] = useState('general');
  const [photoCaption, setPhotoCaption] = useState('');

  const { data: eventData, isLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventsAPI.getOne(eventId).then(r => r.data),
  });

  useEffect(() => {
    if (eventData?.event?.websiteTheme) {
      setTheme({ ...theme, ...eventData.event.websiteTheme });
    }
  }, [eventData]);

  const themeMutation = useMutation({
    mutationFn: (d) => eventsAPI.updateWebsiteTheme(eventId, d),
    onSuccess: () => { qc.invalidateQueries(['event', eventId]); toast.success('Theme saved.'); },
    onError: (err) => toast.error(err.message),
  });

  const uploadDressMutation = useMutation({
    mutationFn: (fd) => eventsAPI.uploadDressCodeImage(eventId, fd),
    onSuccess: () => { qc.invalidateQueries(['event', eventId]); toast.success('Dress code image added.'); setDressCaption(''); },
    onError: (err) => toast.error(err.message),
  });

  const deleteDressMutation = useMutation({
    mutationFn: (imgId) => eventsAPI.deleteDressCodeImage(eventId, imgId),
    onSuccess: () => { qc.invalidateQueries(['event', eventId]); toast.success('Image removed.'); },
    onError: (err) => toast.error(err.message),
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: (fd) => eventsAPI.uploadEventPhoto(eventId, fd),
    onSuccess: () => { qc.invalidateQueries(['event', eventId]); toast.success('Photo added.'); setPhotoCaption(''); },
    onError: (err) => toast.error(err.message),
  });

  const deletePhotoMutation = useMutation({
    mutationFn: (pid) => eventsAPI.deleteEventPhoto(eventId, pid),
    onSuccess: () => { qc.invalidateQueries(['event', eventId]); toast.success('Photo removed.'); },
    onError: (err) => toast.error(err.message),
  });

  const handleDressUpload = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const fd = new FormData();
    fd.append('image', file);
    fd.append('caption', dressCaption);
    fd.append('gender', dressGender);
    uploadDressMutation.mutate(fd);
    e.target.value = '';
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    const fd = new FormData();
    fd.append('image', file);
    fd.append('caption', photoCaption);
    uploadPhotoMutation.mutate(fd);
    e.target.value = '';
  };

  const ev = eventData?.event;
  const fontMap = { serif: 'Georgia, serif', 'sans-serif': 'Inter, sans-serif', elegant: "'Palatino Linotype', serif" };

  if (isLoading) return <div className="page-container"><div className="skeleton" style={{ height: '400px' }} /></div>;

  return (
    <div className="page-container fade-in">
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
        <Link to="/events" style={{ color: 'var(--primary)' }}>Events</Link>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        <Link to={`/events/${eventId}`} style={{ color: 'var(--primary)' }}>{ev?.name}</Link>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        <span>Website Editor</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'Poppins', fontSize: '22px', fontWeight: 700, color: 'var(--primary-dark)', margin: 0 }}>
            Event Website Editor
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0' }}>
            Customize colors, dress code samples, and event photos
          </p>
        </div>
        <a href={`/event/${ev?.slug}`} target="_blank" rel="noreferrer" style={{
          padding: '9px 18px', background: 'var(--primary)', color: 'white',
          borderRadius: 'var(--radius)', fontSize: '13px', fontWeight: 600,
          textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px',
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Preview Website
        </a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

        {/* ── LEFT COLUMN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Theme Colors */}
          <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-light)', padding: '22px' }}>
            <h3 style={{ fontFamily: 'Poppins', fontSize: '14px', fontWeight: 600, color: 'var(--primary-dark)', margin: '0 0 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v3M12 20v3M4.22 4.22l2.12 2.12M17.66 17.66l2.12 2.12M1 12h3M20 12h3M4.22 19.78l2.12-2.12M17.66 6.34l2.12-2.12"/></svg>
              Website Colors
            </h3>

            {/* Live preview */}
            <div style={{
              borderRadius: '10px', overflow: 'hidden', marginBottom: '16px',
              background: theme.bgColor, border: '1px solid var(--border)',
            }}>
              <div style={{ padding: '16px', textAlign: 'center' }}>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', letterSpacing: '2px', margin: '0 0 4px', textTransform: 'uppercase' }}>Preview</p>
                <h2 style={{ fontFamily: fontMap[theme.fontStyle], fontSize: '20px', color: theme.primaryColor, margin: '0 0 4px' }}>
                  {ev?.name || 'Event Name'}
                </h2>
                <p style={{ color: theme.accentColor, fontSize: '13px', margin: 0, opacity: 0.7 }}>
                  {ev?.venue || 'Venue'}
                </p>
                <div style={{ marginTop: '12px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                  <button style={{ padding: '8px 16px', background: theme.primaryColor, color: theme.bgColor, border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 700, cursor: 'default' }}>
                    Confirm Attendance
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              {[
                { key: 'primaryColor', label: 'Accent Color', hint: 'Buttons, countdown, gold elements' },
                { key: 'bgColor', label: 'Background Color', hint: 'Page background' },
                { key: 'accentColor', label: 'Text Color', hint: 'Body text color' },
              ].map(({ key, label, hint }) => (
                <div key={key}>
                  <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', fontWeight: 500 }}>{label}</label>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <input type="color" value={theme[key]}
                      onChange={e => setTheme(p => ({ ...p, [key]: e.target.value }))}
                      style={{ width: '36px', height: '32px', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', padding: '2px' }}
                    />
                    <input type="text" value={theme[key]}
                      onChange={e => setTheme(p => ({ ...p, [key]: e.target.value }))}
                      style={{ flex: 1, padding: '6px 8px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '12px', fontFamily: 'monospace', outline: 'none' }}
                    />
                  </div>
                  <p style={{ fontSize: '10px', color: 'var(--text-muted)', margin: '3px 0 0' }}>{hint}</p>
                </div>
              ))}

              <div>
                <label style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', fontWeight: 500 }}>Font Style</label>
                <select value={theme.fontStyle} onChange={e => setTheme(p => ({ ...p, fontStyle: e.target.value }))}
                  style={{ width: '100%', padding: '6px 8px', border: '1px solid var(--border)', borderRadius: '6px', fontSize: '12px', fontFamily: 'Inter', outline: 'none', background: 'var(--white)' }}>
                  {FONT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            {/* Quick color presets */}
            <div style={{ marginBottom: '14px' }}>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 500 }}>Quick Presets:</p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {[
                  { name: 'Gold & Dark', primaryColor: '#C9A84C', bgColor: '#1A0A00', accentColor: '#FFFFFF' },
                  { name: 'Rose & White', primaryColor: '#E91E8C', bgColor: '#1A0A14', accentColor: '#FFE4F0' },
                  { name: 'Royal Blue', primaryColor: '#4F88E0', bgColor: '#0A0F1A', accentColor: '#E4EEFF' },
                  { name: 'Emerald', primaryColor: '#2ECC71', bgColor: '#0A1A12', accentColor: '#E4FFF0' },
                  { name: 'Purple', primaryColor: '#9B59B6', bgColor: '#0F0A1A', accentColor: '#F0E4FF' },
                  { name: 'Crimson', primaryColor: '#E74C3C', bgColor: '#1A0A0A', accentColor: '#FFE4E4' },
                ].map(preset => (
                  <button key={preset.name} onClick={() => setTheme(p => ({ ...p, ...preset }))} style={{
                    padding: '5px 10px', borderRadius: '20px', border: '1px solid var(--border)',
                    background: preset.bgColor, color: preset.primaryColor,
                    fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                    transition: 'transform 0.1s',
                  }}>
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            <Button variant="primary" fullWidth onClick={() => themeMutation.mutate(theme)} loading={themeMutation.isPending}>
              Save Theme
            </Button>
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Dress Code Images */}
          <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-light)', padding: '22px' }}>
            <h3 style={{ fontFamily: 'Poppins', fontSize: '14px', fontWeight: 600, color: 'var(--primary-dark)', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><path d="M20.38 3.46L16 2a4 4 0 01-8 0L3.62 3.46a2 2 0 00-1.34 2.23l.58 3.57a1 1 0 00.99.84H6v10c0 1.1.9 2 2 2h8a2 2 0 002-2V10h2.15a1 1 0 00.99-.84l.58-3.57a2 2 0 00-1.34-2.23z"/></svg>
              Dress Code Samples
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 14px' }}>
              Add images showing how guests should dress
            </p>

            {/* Upload controls */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
              <input type="text" placeholder="Caption (e.g. Ladies)" value={dressCaption}
                onChange={e => setDressCaption(e.target.value)}
                style={{ flex: 1, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '12px', outline: 'none', minWidth: '120px' }}
              />
              <select value={dressGender} onChange={e => setDressGender(e.target.value)}
                style={{ padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '12px', outline: 'none', background: 'var(--white)' }}>
                <option value="general">General</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
              <button onClick={() => dressRef.current?.click()} style={{
                padding: '7px 14px', background: 'var(--primary)', color: 'white',
                border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '12px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
                opacity: uploadDressMutation.isPending ? 0.6 : 1,
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                {uploadDressMutation.isPending ? 'Uploading...' : 'Upload'}
              </button>
              <input ref={dressRef} type="file" accept=".jpg,.jpeg,.png" onChange={handleDressUpload} style={{ display: 'none' }} />
            </div>

            {/* Existing images */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px' }}>
              {(ev?.dressCodeImages || []).length === 0 ? (
                <div style={{ gridColumn: '1/-1', padding: '20px', textAlign: 'center', border: '2px dashed var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', fontSize: '12px' }}>
                  No dress code images yet
                </div>
              ) : ev.dressCodeImages.map(img => (
                <div key={img._id} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <img src={img.url} alt={img.caption} style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', display: 'block' }} />
                  {img.caption && (
                    <div style={{ padding: '4px 6px', background: 'rgba(0,0,0,0.7)', position: 'absolute', bottom: 0, left: 0, right: 0 }}>
                      <p style={{ color: 'white', fontSize: '10px', margin: 0, textAlign: 'center' }}>{img.caption}</p>
                    </div>
                  )}
                  <button onClick={() => deleteDressMutation.mutate(img._id)} style={{
                    position: 'absolute', top: '4px', right: '4px', width: '22px', height: '22px',
                    background: 'rgba(220,38,38,0.9)', border: 'none', borderRadius: '50%',
                    color: 'white', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>×</button>
                </div>
              ))}
            </div>
          </div>

          {/* Event Photos */}
          <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-light)', padding: '22px' }}>
            <h3 style={{ fontFamily: 'Poppins', fontSize: '14px', fontWeight: 600, color: 'var(--primary-dark)', margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              Event Photos
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 14px' }}>
              Add couple/bridegroom photos or venue images
            </p>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input type="text" placeholder="Caption (e.g. The Couple)" value={photoCaption}
                onChange={e => setPhotoCaption(e.target.value)}
                style={{ flex: 1, padding: '7px 10px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '12px', outline: 'none' }}
              />
              <button onClick={() => photoRef.current?.click()} style={{
                padding: '7px 14px', background: 'var(--secondary)', color: 'white',
                border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '12px',
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px',
                opacity: uploadPhotoMutation.isPending ? 0.6 : 1,
              }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>
                {uploadPhotoMutation.isPending ? 'Uploading...' : 'Upload'}
              </button>
              <input ref={photoRef} type="file" accept=".jpg,.jpeg,.png" onChange={handlePhotoUpload} style={{ display: 'none' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '10px' }}>
              {(ev?.eventPhotos || []).length === 0 ? (
                <div style={{ gridColumn: '1/-1', padding: '20px', textAlign: 'center', border: '2px dashed var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', fontSize: '12px' }}>
                  No event photos yet
                </div>
              ) : ev.eventPhotos.map(photo => (
                <div key={photo._id} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <img src={photo.url} alt={photo.caption} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }} />
                  {photo.caption && (
                    <div style={{ padding: '4px 6px', background: 'rgba(0,0,0,0.7)', position: 'absolute', bottom: 0, left: 0, right: 0 }}>
                      <p style={{ color: 'white', fontSize: '10px', margin: 0, textAlign: 'center' }}>{photo.caption}</p>
                    </div>
                  )}
                  <button onClick={() => deletePhotoMutation.mutate(photo._id)} style={{
                    position: 'absolute', top: '4px', right: '4px', width: '22px', height: '22px',
                    background: 'rgba(220,38,38,0.9)', border: 'none', borderRadius: '50%',
                    color: 'white', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>×</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventWebsiteEditor;
