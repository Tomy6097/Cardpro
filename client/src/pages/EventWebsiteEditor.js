import React, { useState, useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsAPI } from '../api';
import toast from 'react-hot-toast';
import Button from '../components/common/Button';

const PRESETS = [
  { name: 'Gold & Dark', primaryColor: '#C9A84C', bgColor: '#1A0A00', accentColor: '#FFFFFF' },
  { name: 'Rose', primaryColor: '#E91E8C', bgColor: '#1A0A14', accentColor: '#FFE4F0' },
  { name: 'Royal Blue', primaryColor: '#4F88E0', bgColor: '#0A0F1A', accentColor: '#E4EEFF' },
  { name: 'Emerald', primaryColor: '#2ECC71', bgColor: '#0A1A12', accentColor: '#E4FFF0' },
  { name: 'Purple', primaryColor: '#9B59B6', bgColor: '#0F0A1A', accentColor: '#F0E4FF' },
  { name: 'Crimson', primaryColor: '#E74C3C', bgColor: '#1A0A0A', accentColor: '#FFE4E4' },
];

const EventWebsiteEditor = () => {
  const { id: eventId } = useParams();
  const qc = useQueryClient();
  const dressRef = useRef();
  const photoRef = useRef();
  const videoRef = useRef();

  const [theme, setTheme] = useState({ primaryColor: '#C9A84C', bgColor: '#1A0A00', accentColor: '#FFFFFF', fontStyle: 'serif' });
  const [dressCaption, setDressCaption] = useState('');
  const [dressGender, setDressGender] = useState('general');
  const [photoCaption, setPhotoCaption] = useState('');

  const { data: eventData, isLoading } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventsAPI.getOne(eventId).then(r => r.data),
  });

  useEffect(() => {
    if (eventData?.event?.websiteTheme) {
      setTheme(p => ({ ...p, ...eventData.event.websiteTheme }));
    }
  }, [eventData]);

  const themeMutation = useMutation({
    mutationFn: d => eventsAPI.updateWebsiteTheme(eventId, d),
    onSuccess: () => { qc.invalidateQueries(['event', eventId]); toast.success('Theme saved.'); },
    onError: err => toast.error(err.message),
  });
  const uploadDressMutation = useMutation({
    mutationFn: fd => eventsAPI.uploadDressCodeImage(eventId, fd),
    onSuccess: () => { qc.invalidateQueries(['event', eventId]); toast.success('Image added.'); setDressCaption(''); },
    onError: err => toast.error(err.message),
  });
  const deleteDressMutation = useMutation({
    mutationFn: id => eventsAPI.deleteDressCodeImage(eventId, id),
    onSuccess: () => { qc.invalidateQueries(['event', eventId]); toast.success('Removed.'); },
    onError: err => toast.error(err.message),
  });
  const uploadPhotoMutation = useMutation({
    mutationFn: fd => eventsAPI.uploadEventPhoto(eventId, fd),
    onSuccess: () => { qc.invalidateQueries(['event', eventId]); toast.success('Photo added.'); setPhotoCaption(''); },
    onError: err => toast.error(err.message),
  });
  const deletePhotoMutation = useMutation({
    mutationFn: id => eventsAPI.deleteEventPhoto(eventId, id),
    onSuccess: () => { qc.invalidateQueries(['event', eventId]); toast.success('Removed.'); },
    onError: err => toast.error(err.message),
  });
  const uploadVideoMutation = useMutation({
    mutationFn: fd => eventsAPI.uploadVideo(eventId, fd),
    onSuccess: () => { qc.invalidateQueries(['event', eventId]); toast.success('Video uploaded!'); },
    onError: err => toast.error(err.message),
  });

  const handleDress = e => {
    const f = e.target.files?.[0]; if (!f) return;
    const fd = new FormData(); fd.append('image', f); fd.append('caption', dressCaption); fd.append('gender', dressGender);
    uploadDressMutation.mutate(fd); e.target.value = '';
  };
  const handlePhoto = e => {
    const f = e.target.files?.[0]; if (!f) return;
    const fd = new FormData(); fd.append('image', f); fd.append('caption', photoCaption);
    uploadPhotoMutation.mutate(fd); e.target.value = '';
  };
  const handleVideo = e => {
    const f = e.target.files?.[0]; if (!f) return;
    if (f.size > 50 * 1024 * 1024) { toast.error('Max 50MB'); return; }
    const fd = new FormData(); fd.append('video', f);
    uploadVideoMutation.mutate(fd); e.target.value = '';
  };

  const ev = eventData?.event;
  const fontMap = { serif: 'Georgia,serif', 'sans-serif': 'Inter,sans-serif', elegant: "'Palatino Linotype',serif" };

  if (isLoading) return <div className="page-container"><div className="skeleton" style={{ height: '400px' }} /></div>;

  return (
    <div className="page-container fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
        <Link to="/events" style={{ color: 'var(--primary)' }}>Events</Link>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        <Link to={`/events/${eventId}`} style={{ color: 'var(--primary)' }}>{ev?.name}</Link>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        <span>Website Editor</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'Poppins', fontSize: '22px', fontWeight: 700, color: 'var(--primary-dark)', margin: 0 }}>Website Editor</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0' }}>Customize colors, dress code samples, video and event photos</p>
        </div>
        <a href={`/event/${ev?.slug}`} target="_blank" rel="noreferrer" style={{ padding: '9px 18px', background: 'var(--primary)', color: 'white', borderRadius: 'var(--radius)', fontSize: '13px', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Preview Website
        </a>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

        {/* LEFT — Theme */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-light)', padding: '22px' }}>
            <h3 style={{ fontFamily: 'Poppins', fontSize: '14px', fontWeight: 600, color: 'var(--primary-dark)', margin: '0 0 14px' }}>Website Colors & Font</h3>

            {/* Preview */}
            <div style={{ borderRadius: '10px', overflow: 'hidden', marginBottom: '14px', background: theme.bgColor, border: '1px solid var(--border)' }}>
              <div style={{ padding: '14px', textAlign: 'center' }}>
                <h2 style={{ fontFamily: fontMap[theme.fontStyle], fontSize: '18px', color: theme.primaryColor, margin: '0 0 4px' }}>{ev?.name || 'Event Name'}</h2>
                <p style={{ color: theme.accentColor, fontSize: '12px', margin: '0 0 10px', opacity: 0.7 }}>{ev?.venue || 'Venue'}</p>
                <button style={{ padding: '7px 14px', background: theme.primaryColor, color: theme.bgColor, border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: 700, cursor: 'default' }}>Confirm Attendance</button>
              </div>
            </div>

            {/* Color pickers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              {[
                { key: 'primaryColor', label: 'Accent Color' },
                { key: 'bgColor', label: 'Background' },
                { key: 'accentColor', label: 'Text Color' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', fontWeight: 500 }}>{label}</label>
                  <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                    <input type="color" value={theme[key]} onChange={e => setTheme(p => ({ ...p, [key]: e.target.value }))} style={{ width: '34px', height: '30px', border: '1px solid var(--border)', borderRadius: '5px', cursor: 'pointer', padding: '2px' }} />
                    <input type="text" value={theme[key]} onChange={e => setTheme(p => ({ ...p, [key]: e.target.value }))} style={{ flex: 1, padding: '5px 7px', border: '1px solid var(--border)', borderRadius: '5px', fontSize: '11px', fontFamily: 'monospace', outline: 'none' }} />
                  </div>
                </div>
              ))}
              <div>
                <label style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px', fontWeight: 500 }}>Font</label>
                <select value={theme.fontStyle} onChange={e => setTheme(p => ({ ...p, fontStyle: e.target.value }))} style={{ width: '100%', padding: '5px 7px', border: '1px solid var(--border)', borderRadius: '5px', fontSize: '11px', outline: 'none', background: 'var(--white)' }}>
                  <option value="serif">Serif (Classic)</option>
                  <option value="sans-serif">Sans-Serif (Modern)</option>
                  <option value="elegant">Elegant</option>
                </select>
              </div>
            </div>

            {/* Presets */}
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 500 }}>Quick Presets:</p>
            <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap', marginBottom: '14px' }}>
              {PRESETS.map(p => (
                <button key={p.name} onClick={() => setTheme(prev => ({ ...prev, ...p }))} style={{ padding: '4px 10px', borderRadius: '20px', border: '1px solid var(--border)', background: p.bgColor, color: p.primaryColor, fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                  {p.name}
                </button>
              ))}
            </div>

            <Button variant="primary" fullWidth onClick={() => themeMutation.mutate(theme)} loading={themeMutation.isPending}>Save Theme</Button>
          </div>
        </div>

        {/* RIGHT — Photos, Dress, Video */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Dress Code */}
          <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-light)', padding: '22px' }}>
            <h3 style={{ fontFamily: 'Poppins', fontSize: '14px', fontWeight: 600, color: 'var(--primary-dark)', margin: '0 0 4px' }}>👔 Dress Code Samples</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 12px' }}>Upload images showing how guests should dress</p>
            <div style={{ display: 'flex', gap: '7px', marginBottom: '10px', flexWrap: 'wrap' }}>
              <input type="text" placeholder="Caption" value={dressCaption} onChange={e => setDressCaption(e.target.value)} style={{ flex: 1, padding: '6px 9px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '12px', outline: 'none', minWidth: '100px' }} />
              <select value={dressGender} onChange={e => setDressGender(e.target.value)} style={{ padding: '6px 9px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '12px', outline: 'none', background: 'var(--white)' }}>
                <option value="general">General</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
              </select>
              <button onClick={() => dressRef.current?.click()} disabled={uploadDressMutation.isPending} style={{ padding: '6px 12px', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '12px', cursor: 'pointer', opacity: uploadDressMutation.isPending ? 0.6 : 1 }}>
                {uploadDressMutation.isPending ? 'Uploading...' : 'Upload'}
              </button>
              <input ref={dressRef} type="file" accept=".jpg,.jpeg,.png" onChange={handleDress} style={{ display: 'none' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(90px,1fr))', gap: '8px' }}>
              {(ev?.dressCodeImages || []).length === 0 ? (
                <div style={{ gridColumn: '1/-1', padding: '16px', textAlign: 'center', border: '2px dashed var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', fontSize: '12px' }}>No images yet</div>
              ) : ev.dressCodeImages.map(img => (
                <div key={img._id} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <img src={img.url} alt={img.caption} style={{ width: '100%', aspectRatio: '3/4', objectFit: 'cover', display: 'block' }} />
                  <button onClick={() => deleteDressMutation.mutate(img._id)} style={{ position: 'absolute', top: '3px', right: '3px', width: '20px', height: '20px', background: 'rgba(220,38,38,0.9)', border: 'none', borderRadius: '50%', color: 'white', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                </div>
              ))}
            </div>
          </div>

          {/* Event Photos */}
          <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-light)', padding: '22px' }}>
            <h3 style={{ fontFamily: 'Poppins', fontSize: '14px', fontWeight: 600, color: 'var(--primary-dark)', margin: '0 0 4px' }}>📸 Event Photos</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 12px' }}>Add couple/bridegroom or venue photos</p>
            <div style={{ display: 'flex', gap: '7px', marginBottom: '10px' }}>
              <input type="text" placeholder="Caption (e.g. The Couple)" value={photoCaption} onChange={e => setPhotoCaption(e.target.value)} style={{ flex: 1, padding: '6px 9px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '12px', outline: 'none' }} />
              <button onClick={() => photoRef.current?.click()} disabled={uploadPhotoMutation.isPending} style={{ padding: '6px 12px', background: 'var(--secondary)', color: 'white', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '12px', cursor: 'pointer', opacity: uploadPhotoMutation.isPending ? 0.6 : 1 }}>
                {uploadPhotoMutation.isPending ? 'Uploading...' : 'Upload'}
              </button>
              <input ref={photoRef} type="file" accept=".jpg,.jpeg,.png" onChange={handlePhoto} style={{ display: 'none' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(100px,1fr))', gap: '8px' }}>
              {(ev?.eventPhotos || []).length === 0 ? (
                <div style={{ gridColumn: '1/-1', padding: '16px', textAlign: 'center', border: '2px dashed var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', fontSize: '12px' }}>No photos yet</div>
              ) : ev.eventPhotos.map(photo => (
                <div key={photo._id} style={{ position: 'relative', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                  <img src={photo.url} alt={photo.caption} style={{ width: '100%', aspectRatio: '4/3', objectFit: 'cover', display: 'block' }} />
                  <button onClick={() => deletePhotoMutation.mutate(photo._id)} style={{ position: 'absolute', top: '3px', right: '3px', width: '20px', height: '20px', background: 'rgba(220,38,38,0.9)', border: 'none', borderRadius: '50%', color: 'white', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
                </div>
              ))}
            </div>
          </div>

          {/* Video Upload */}
          <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-light)', padding: '22px' }}>
            <h3 style={{ fontFamily: 'Poppins', fontSize: '14px', fontWeight: 600, color: 'var(--primary-dark)', margin: '0 0 4px' }}>🎬 Invitation Video</h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 12px' }}>Upload a short video (max 50MB) shown on the guest website</p>

            {ev?.invitationVideo?.url && (
              <div style={{ marginBottom: '12px', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border)' }}>
                <video controls style={{ width: '100%', maxHeight: '160px', display: 'block', background: '#000' }}>
                  <source src={ev.invitationVideo.url} />
                </video>
                <div style={{ padding: '7px 12px', background: 'var(--cream)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Current video</span>
                  <span style={{ fontSize: '11px', color: 'var(--success)', fontWeight: 600 }}>✓ Active</span>
                </div>
              </div>
            )}

            <div onClick={() => !uploadVideoMutation.isPending && videoRef.current?.click()} style={{ border: `2px dashed ${uploadVideoMutation.isPending ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 'var(--radius)', padding: '24px', textAlign: 'center', cursor: uploadVideoMutation.isPending ? 'not-allowed' : 'pointer', background: uploadVideoMutation.isPending ? 'var(--cream)' : 'var(--cream-dark)' }}>
              {uploadVideoMutation.isPending ? (
                <div>
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'center', marginBottom: '8px' }}>
                    {[0,1,2].map(i => <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--primary)', animation: `vd 1.2s ${i*.2}s ease-in-out infinite` }} />)}
                  </div>
                  <p style={{ fontSize: '13px', color: 'var(--primary)', margin: 0, fontWeight: 500 }}>Uploading video...</p>
                  <style>{`@keyframes vd{0%,80%,100%{opacity:.3;transform:scale(1)}40%{opacity:1;transform:scale(1.3)}}`}</style>
                </div>
              ) : (
                <div>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ marginBottom: '8px' }}>
                    <polygon points="23 7 16 12 23 17 23 7"/>
                    <rect x="1" y="5" width="15" height="14" rx="2"/>
                  </svg>
                  <p style={{ fontSize: '13px', color: 'var(--text-primary)', margin: '0 0 4px', fontWeight: 500 }}>
                    {ev?.invitationVideo?.url ? 'Replace Video' : 'Upload Video'}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>MP4, MOV, AVI — Max 50MB</p>
                </div>
              )}
            </div>
            <input ref={videoRef} type="file" accept=".mp4,.mov,.avi,.webm" onChange={handleVideo} style={{ display: 'none' }} />
          </div>

        </div>
      </div>
    </div>
  );
};

export default EventWebsiteEditor;
