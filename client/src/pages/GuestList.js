import React, { useState, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { guestsAPI, eventsAPI, cardsAPI } from '../api';
import toast from 'react-hot-toast';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import Input, { Select } from '../components/common/Input';
import Button from '../components/common/Button';

// Phone validation — Tanzania & international
const validatePhone = (phone) => {
  const clean = phone.replace(/\s/g, '');
  // Tanzania: 255XXXXXXXXX (12 digits) or 07XXXXXXXX / 06XXXXXXXX
  const tzLocal = /^0[67]\d{8}$/.test(clean);
  const tzIntl  = /^255[67]\d{8}$/.test(clean);
  const intl    = /^\+?\d{10,15}$/.test(clean);
  return tzLocal || tzIntl || intl;
};

const ticketOptions = [
  { value: 'Single', label: 'Single' }, { value: 'Double', label: 'Double' },
  { value: 'VIP', label: 'VIP' }, { value: 'VVIP', label: 'VVIP' },
  { value: 'Family', label: 'Family' }, { value: 'Child', label: 'Child' },
];

const emptyForm = { guestName: '', phone: '', email: '', ticketType: 'Single', tableNumber: '', notes: '' };
const emptyEditForm = { guestName: '', phone: '', email: '', ticketType: 'Single', tableNumber: '', notes: '' };

// Card Preview Popup Component
const CardPreviewModal = ({ guest, onClose }) => {
  if (!guest) return null;

  return ReactDOM.createPortal(
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(26,10,0,0.85)', backdropFilter: 'blur(8px)' }}
      />

      {/* Centered container */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', pointerEvents: 'none' }}>

        {/* Modal box */}
        <div
          onClick={e => e.stopPropagation()}
          style={{ width: 'min(460px, calc(100vw - 32px))', maxHeight: 'calc(100vh - 32px)', background: 'var(--white)', borderRadius: 'var(--radius-xl)', boxShadow: '0 24px 60px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', overflow: 'hidden', pointerEvents: 'all' }}
        >
          {/* Header */}
          <div style={{ background: 'linear-gradient(135deg, var(--primary-dark), var(--primary))', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div>
              <h3 style={{ fontFamily: 'Poppins', fontSize: '15px', fontWeight: 700, color: 'white', margin: 0 }}>{guest.guestName}</h3>
              <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '12px', margin: '2px 0 0' }}>
                {guest.ticketType} &bull; {guest.phone} &bull; <code style={{ color: 'var(--secondary)', fontWeight: 600 }}>{guest.verificationCode}</code>
              </p>
            </div>
            <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          {/* Card Image */}
          <div style={{ background: '#1a0a00', flex: 1, overflowY: 'auto' }}>
            {guest.cardUrl ? (
              <img
                src={guest.cardUrl}
                alt={guest.guestName}
                style={{ width: '100%', height: 'auto', display: 'block' }}
                onError={e => {
                  const url = guest.cardUrl;
                  if (url.includes('/upload/') && !url.includes('f_jpg')) {
                    e.target.src = url.replace('/upload/', '/upload/f_jpg,q_auto/');
                  } else {
                    e.target.style.display = 'none';
                  }
                }}
              />
            ) : guest.qrCodeUrl ? (
              <div style={{ padding: '32px', textAlign: 'center' }}>
                <div style={{ display: 'inline-block', background: 'white', padding: '16px', borderRadius: '16px' }}>
                  <img src={guest.qrCodeUrl} alt="QR" style={{ width: '180px', height: '180px', display: 'block' }} />
                  <p style={{ margin: '8px 0 0', fontSize: '13px', fontWeight: 800, color: '#1A0A00', letterSpacing: '2px', textAlign: 'center' }}>{guest.ticketType?.toUpperCase()}</p>
                </div>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '12px', marginTop: '12px' }}>Card is being generated...</p>
              </div>
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>QR code is being generated...</div>
            )}
          </div>

          {/* Footer */}
          {guest.cardUrl && (
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border-light)', display: 'flex', gap: '10px', justifyContent: 'center', flexShrink: 0, background: 'var(--white)' }}>
              <button
                onClick={async () => {
                  try {
                    const r = await fetch(guest.cardUrl);
                    const blob = await r.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url; a.download = `${guest.guestName.replace(/\s+/g,'_')}_card.jpg`;
                    document.body.appendChild(a); a.click(); document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  } catch { window.open(guest.cardUrl, '_blank'); }
                }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 22px', background: 'var(--primary)', color: 'white', borderRadius: 'var(--radius)', fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
                Download JPG
              </button>
              <button onClick={onClose} style={{ padding: '9px 16px', background: 'var(--cream-dark)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '13px', cursor: 'pointer', color: 'var(--text-secondary)' }}>
                Close
              </button>
            </div>
          )}

        </div>
      </div>
    </>,
    document.body
  );
};

const GuestList = () => {
  const { id: eventId } = useParams();
  const qc = useQueryClient();
  const fileRef = useRef();

  const [search, setSearch] = useState('');
  const [rsvpFilter, setRsvpFilter] = useState('');
  const [showDeleted, setShowDeleted] = useState(false);
  const [page, setPage] = useState(1);
  const [addModal, setAddModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selected, setSelected] = useState(new Set());
  const [previewGuest, setPreviewGuest] = useState(null);
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState(emptyEditForm);
  const [editGuest, setEditGuest] = useState(null);
  const [scanHistoryGuest, setScanHistoryGuest] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  const { data: eventData } = useQuery({
    queryKey: ['event', eventId],
    queryFn: () => eventsAPI.getOne(eventId).then(r => r.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['guests', eventId, search, rsvpFilter, showDeleted, page],
    queryFn: () => guestsAPI.getAll(eventId, {
      search, rsvpStatus: rsvpFilter, isDeleted: showDeleted, page, limit: 50,
    }).then(r => r.data),
    keepPreviousData: true,
    // Auto-refresh every 5s if any guest is still generating QR/card
    refetchInterval: (data) => {
      const guests = data?.guests || [];
      const stillGenerating = guests.some(g => !g.qrCodeUrl || !g.qrToken);
      return stillGenerating ? 5000 : false;
    },
  });

  const addMutation = useMutation({
    mutationFn: (d) => guestsAPI.add(eventId, d),
    onSuccess: () => { qc.invalidateQueries(['guests', eventId]); toast.success('Guest added.'); setAddModal(false); setForm(emptyForm); },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: guestsAPI.delete,
    onSuccess: () => { qc.invalidateQueries(['guests', eventId]); toast.success('Guest deleted.'); },
    onError: (err) => toast.error(err.message),
  });

  const restoreMutation = useMutation({
    mutationFn: guestsAPI.restore,
    onSuccess: () => { qc.invalidateQueries(['guests', eventId]); toast.success('Guest restored.'); },
    onError: (err) => toast.error(err.message),
  });

  const genQRMutation = useMutation({
    mutationFn: guestsAPI.generateAllQR,
    onSuccess: (r) => {
      qc.invalidateQueries(['guests', eventId]);
      qc.invalidateQueries(['qr-progress', eventId]);
      toast.success(`Inatengeneza QR codes ${r.data.total || 0} kwa nyuma. Angalia maendeleo hapa chini.`);
    },
    onError: (err) => toast.error(err.message),
  });

  const importMutation = useMutation({
    mutationFn: ({ fd }) => guestsAPI.import(eventId, fd),
    onSuccess: (r) => {
      qc.invalidateQueries(['guests', eventId]);
      toast.success(`${r.data.imported} guests imported. ${r.data.skipped} skipped.`);
    },
    onError: (err) => {
      const msg = err.response?.data?.hint || err.response?.data?.message || err.message;
      toast.error(msg, { duration: 6000 });
    },
  });

  const deleteAllMutation = useMutation({
    mutationFn: () => guestsAPI.deleteAll(eventId),
    onSuccess: () => { qc.invalidateQueries(['guests', eventId]); toast.success('All guests deleted.'); },
    onError: (err) => toast.error(err.message),
  });

  const resetScanMutation = useMutation({
    mutationFn: guestsAPI.resetScan,
    onSuccess: () => { qc.invalidateQueries(['guests', eventId]); toast.success('Scan reset. Guest can enter again.'); },
    onError: (err) => toast.error(err.message),
  });

  const editMutation = useMutation({
    mutationFn: ({ id, data }) => guestsAPI.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries(['guests', eventId]);
      toast.success('Taarifa za mgeni zimebadilishwa.');
      setEditModal(false);
      setEditGuest(null);
    },
    onError: (err) => toast.error(err.response?.data?.message || err.message),
  });

  // Card generation progress polling
  const { data: cardProgressData } = useQuery({
    queryKey: ['card-progress', eventId],
    queryFn: () => cardsAPI.getProgress(eventId).then(r => r.data),
    refetchInterval: (data) => data?.status === 'running' ? 2000 : false,
  });
  const cardProgress = cardProgressData?.status === 'running' ? cardProgressData : null;

  // QR generation progress polling
  const { data: qrProgressData } = useQuery({
    queryKey: ['qr-progress', eventId],
    queryFn: () => guestsAPI.getQRProgress(eventId).then(r => r.data),
    refetchInterval: (data) => data?.status === 'running' ? 2000 : false,
  });
  const qrProgress = qrProgressData?.status === 'running' ? qrProgressData : null;

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('csv', file);
    importMutation.mutate({ fd });
    e.target.value = '';
  };

  const openEditModal = (g) => {
    setEditGuest(g);
    setEditForm({ guestName: g.guestName, phone: g.phone, email: g.email || '', ticketType: g.ticketType, tableNumber: g.tableNumber || '', notes: g.notes || '' });
    setFormErrors({});
    setEditModal(true);
  };

  const handleAddGuest = () => {
    const errors = {};
    if (!form.guestName.trim()) errors.guestName = 'Jina linahitajika';
    if (!form.phone.trim()) errors.phone = 'Namba ya simu inahitajika';
    else if (!validatePhone(form.phone)) errors.phone = 'Namba ya simu si sahihi (mfano: 0754696878 au 255754696878)';
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }
    setFormErrors({});
    addMutation.mutate(form);
  };

  const handleEditGuest = () => {
    const errors = {};
    if (!editForm.guestName.trim()) errors.guestName = 'Jina linahitajika';
    if (editForm.phone && !validatePhone(editForm.phone)) errors.phone = 'Namba ya simu si sahihi';
    if (Object.keys(errors).length > 0) { setFormErrors(errors); return; }
    setFormErrors({});
    editMutation.mutate({ id: editGuest._id, data: editForm });
  };

  const handleDownloadCSV = async () => {
    try {
      const res = await guestsAPI.downloadCSV(eventId);
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url; a.download = `guests-${eventId}.csv`; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Download failed.'); }
  };

  const guests = data?.guests || [];
  const pagination = data?.pagination || {};
  const event = eventData?.event;
  const toggleSelect = (id) => {
    const s = new Set(selected);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelected(s);
  };

  return (
    <div className="page-container fade-in">
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
        <Link to="/events" style={{ color: 'var(--primary)' }}>Events</Link>
        <span>/</span>
        <Link to={`/events/${eventId}`} style={{ color: 'var(--primary)' }}>{event?.name || 'Event'}</Link>
        <span>/</span>
        <span>Guests</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'Poppins', fontSize: '22px', fontWeight: 700, color: 'var(--primary-dark)', margin: 0 }}>
            Guest Management
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: '4px 0 0' }}>
            {pagination.total || 0} guests {showDeleted ? '(deleted)' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button variant="secondary" size="sm" onClick={handleDownloadCSV}>Export CSV</Button>
          <a href="/guests-template.csv" download="guests-template.csv" style={{
            padding: '6px 14px', borderRadius: 'var(--radius)',
            background: 'var(--cream-dark)', color: 'var(--primary)',
            border: '1px solid var(--border)', fontSize: '13px',
            fontWeight: 500, textDecoration: 'none', fontFamily: 'Inter',
            display: 'inline-flex', alignItems: 'center', gap: '6px',
          }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
            CSV Template
          </a>
          <Button variant="secondary" size="sm" onClick={() => fileRef.current?.click()} loading={importMutation.isPending}>
            Import CSV
          </Button>
          <input ref={fileRef} type="file" accept=".csv" onChange={handleImport} style={{ display: 'none' }} />
          <Button variant="secondary" size="sm" onClick={() => genQRMutation.mutate(eventId)} loading={genQRMutation.isPending}>
            Generate QR Codes
          </Button>
          <Button variant="primary" size="sm" onClick={() => { setForm(emptyForm); setAddModal(true); }}>
            + Add Guest
          </Button>
        </div>
      </div>

      {/* Card Generation Progress Bar */}
      {cardProgress && (
        <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', border: '1px solid var(--secondary)', padding: '14px 18px', marginBottom: '16px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#C9A84C', animation: 'pulse 1.5s ease-in-out infinite' }} />
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary-dark)', fontFamily: 'Poppins' }}>
                Inatengeneza kadi...
              </span>
            </div>
            <span style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 700 }}>
              {cardProgress.done}/{cardProgress.total} ({cardProgress.pct}%)
            </span>
          </div>
          <div style={{ background: 'var(--cream-dark)', borderRadius: '6px', height: '10px', overflow: 'hidden' }}>
            <div style={{ width: `${cardProgress.pct}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary), var(--secondary))', borderRadius: '6px', transition: 'width .5s ease' }} />
          </div>
          {cardProgress.failed > 0 && (
            <p style={{ fontSize: '11px', color: 'var(--danger)', margin: '6px 0 0' }}>{cardProgress.failed} kadi zilishindwa</p>
          )}
        </div>
      )}

      {/* QR Code Generation Progress Bar */}
      {qrProgress && (
        <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', border: '1px solid #818CF8', padding: '14px 18px', marginBottom: '16px', boxShadow: 'var(--shadow-sm)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#4F46E5', animation: 'pulse 1.5s ease-in-out infinite' }} />
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--primary-dark)', fontFamily: 'Poppins' }}>
                Inatengeneza QR codes...
              </span>
            </div>
            <span style={{ fontSize: '13px', color: '#4F46E5', fontWeight: 700 }}>
              {qrProgress.done}/{qrProgress.total} ({qrProgress.pct}%)
            </span>
          </div>
          <div style={{ background: 'var(--cream-dark)', borderRadius: '6px', height: '10px', overflow: 'hidden' }}>
            <div style={{ width: `${qrProgress.pct}%`, height: '100%', background: 'linear-gradient(90deg, #4F46E5, #818CF8)', borderRadius: '6px', transition: 'width .5s ease' }} />
          </div>
          {qrProgress.failed > 0 && (
            <p style={{ fontSize: '11px', color: 'var(--danger)', margin: '6px 0 0' }}>{qrProgress.failed} QR zilishindwa</p>
          )}
          <style>{`@keyframes pulse{0%,100%{opacity:.6;transform:scale(1)}50%{opacity:1;transform:scale(1.3)}}`}</style>
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text" placeholder="Search by name, phone, or code..."
          value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={{
            flex: '1 1 240px', padding: '9px 14px',
            border: '1px solid var(--border)', borderRadius: 'var(--radius)',
            fontSize: '14px', outline: 'none', fontFamily: 'Inter',
          }}
        />
        <select value={rsvpFilter} onChange={e => setRsvpFilter(e.target.value)}
          style={{ padding: '9px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)', fontSize: '14px', outline: 'none', fontFamily: 'Inter' }}>
          <option value="">All RSVP</option>
          <option value="confirmed">Confirmed</option>
          <option value="pending">Pending</option>
          <option value="declined">Declined</option>
        </select>
        <button onClick={() => setShowDeleted(p => !p)} style={{
          padding: '9px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius)',
          fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter',
          background: showDeleted ? 'var(--danger-light)' : 'var(--white)',
          color: showDeleted ? 'var(--danger)' : 'var(--text-secondary)',
        }}>
          {showDeleted ? 'View Active' : 'View Deleted'}
        </button>
        {!showDeleted && guests.length > 0 && (
          <button onClick={() => { if (window.confirm('Delete all guests?')) deleteAllMutation.mutate(); }}
            style={{ padding: '9px 14px', border: 'none', borderRadius: 'var(--radius)', fontSize: '13px', cursor: 'pointer', fontFamily: 'Inter', background: 'var(--danger-light)', color: 'var(--danger)' }}>
            Delete All
          </button>
        )}
      </div>

      {/* Table */}
      <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-light)', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'var(--cream)', borderBottom: '1px solid var(--border)' }}>
                {['Guest Name', 'Phone', 'Ticket', 'RSVP', 'Message', 'Scan', 'Code', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</td></tr>
              ) : guests.length === 0 ? (
                <tr><td colSpan={8} style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  {showDeleted ? 'No deleted guests.' : 'No guests yet. Add your first guest.'}
                </td></tr>
              ) : guests.map((g, i) => (
                <tr key={g._id} style={{ borderBottom: '1px solid var(--border-light)', background: i % 2 === 0 ? 'var(--white)' : 'var(--cream)' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ fontWeight: 500, fontSize: '14px', color: 'var(--primary-dark)' }}>{g.guestName}</div>
                    {g.email && <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{g.email}</div>}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{g.phone}</td>
                  <td style={{ padding: '12px 16px' }}><Badge status={g.ticketType} /></td>
                  <td style={{ padding: '12px 16px' }}><Badge status={g.rsvpStatus} /></td>
                  <td style={{ padding: '12px 16px' }}><Badge status={g.messageStatus} /></td>
                  <td style={{ padding: '12px 16px' }}><Badge status={g.scanStatus} /></td>
                  <td style={{ padding: '12px 16px' }}>
                    <code style={{ fontSize: '11px', background: 'var(--cream)', padding: '2px 6px', borderRadius: '4px', color: 'var(--primary)' }}>
                      {g.verificationCode}
                    </code>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexWrap: 'wrap' }}>
                      {/* View Card Button — opens popup */}
                      <button
                        onClick={() => setPreviewGuest(g)}
                        style={{ padding: '4px 10px', background: 'var(--primary)', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '11px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        title="View Card"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        Card
                      </button>

                      {/* Edit button */}
                      <button
                        onClick={() => openEditModal(g)}
                        style={{ padding: '4px 10px', background: '#EEF2FF', border: '1px solid #C7D2FE', borderRadius: 'var(--radius-sm)', fontSize: '11px', color: '#4338CA', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        title="Edit Guest"
                      >
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        Edit
                      </button>

                      {/* Scan history button */}
                      {(g.scanHistory?.length > 0 || g.scanStatus === 'scanned') && (
                        <button
                          onClick={() => setScanHistoryGuest(g)}
                          style={{ padding: '4px 10px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 'var(--radius-sm)', fontSize: '11px', color: '#166534', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                          title="Scan History"
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                          Historia
                        </button>
                      )}

                      {/* Preview as Guest — opens invitation website */}
                      {event?.slug && g.verificationCode && (
                        <a
                          href={`/event/${event.slug}?code=${g.verificationCode}`}
                          target="_blank"
                          rel="noreferrer"
                          style={{ padding: '4px 10px', background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 'var(--radius-sm)', fontSize: '11px', color: '#92400E', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontFamily: 'Inter' }}
                          title="Preview invitation as this guest"
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                          Invite
                        </a>
                      )}

                      {/* QR generating indicator */}
                      {!g.qrCodeUrl && (
                        <span style={{ padding: '4px 8px', background: '#FEF9C3', border: '1px solid #FDE047', borderRadius: 'var(--radius-sm)', fontSize: '10px', color: '#854D0E' }}>
                          ⟳ QR...
                        </span>
                      )}

                      {/* Reset Scan — only if scanned */}
                      {g.scanStatus === 'scanned' || g.scanStatus === 'duplicate_scan' ? (
                        <button
                          onClick={() => { if (window.confirm(`Reset scan for ${g.guestName}? They will be able to enter again.`)) resetScanMutation.mutate(g._id); }}
                          style={{ padding: '4px 10px', background: '#DBEAFE', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '11px', color: '#1E40AF', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '3px' }}
                          title="Reset Scan"
                        >
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-4.95"/></svg>
                          Reset
                        </button>
                      ) : null}

                      {/* Restore / Delete */}
                      {showDeleted ? (
                        <button onClick={() => restoreMutation.mutate(g._id)} style={{ padding: '4px 10px', background: 'var(--success-light)', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '11px', color: 'var(--success)', cursor: 'pointer' }}>
                          Restore
                        </button>
                      ) : (
                        <button onClick={() => deleteMutation.mutate(g._id)} style={{ padding: '4px 8px', background: 'var(--danger-light)', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '11px', color: 'var(--danger)', cursor: 'pointer' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                        </button>
                      )}
                    </div>
                    <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '16px', borderTop: '1px solid var(--border-light)' }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
              style={{ padding: '6px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--white)', cursor: page > 1 ? 'pointer' : 'not-allowed', opacity: page <= 1 ? 0.5 : 1 }}>
              Prev
            </button>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              Page {page} of {pagination.pages}
            </span>
            <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page >= pagination.pages}
              style={{ padding: '6px 14px', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', background: 'var(--white)', cursor: page < pagination.pages ? 'pointer' : 'not-allowed', opacity: page >= pagination.pages ? 0.5 : 1 }}>
              Next
            </button>
          </div>
        )}
      </div>

      {/* Add Guest Modal */}
      <Modal isOpen={addModal} onClose={() => { setAddModal(false); setFormErrors({}); }} title="Ongeza Mgeni" width="480px" offsetTop={48}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setAddModal(false); setFormErrors({}); }}>Ghairi</Button>
            <Button variant="primary" loading={addMutation.isPending} onClick={handleAddGuest}>Ongeza Mgeni</Button>
          </>
        }
      >
        <div>
          <Input label="Jina la Mgeni *" name="guestName" value={form.guestName} onChange={e => { setForm(p => ({ ...p, guestName: e.target.value })); setFormErrors(p => ({ ...p, guestName: '' })); }} required />
          {formErrors.guestName && <p style={{ color: 'var(--danger)', fontSize: '11px', margin: '-8px 0 8px', fontFamily: 'Inter' }}>{formErrors.guestName}</p>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
          <div>
            <Input label="Namba ya Simu *" name="phone" value={form.phone} onChange={e => { setForm(p => ({ ...p, phone: e.target.value })); setFormErrors(p => ({ ...p, phone: '' })); }} required placeholder="0754696878" />
            {formErrors.phone && <p style={{ color: 'var(--danger)', fontSize: '11px', margin: '-8px 0 8px', fontFamily: 'Inter' }}>{formErrors.phone}</p>}
          </div>
          <Select label="Aina ya Tiketi" name="ticketType" value={form.ticketType}
            onChange={e => setForm(p => ({ ...p, ticketType: e.target.value }))}
            options={ticketOptions}
          />
        </div>
        <Input label="Barua Pepe (si lazima)" name="email" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
          <Input label="Nambari ya Meza" name="tableNumber" value={form.tableNumber} onChange={e => setForm(p => ({ ...p, tableNumber: e.target.value }))} />
          <Input label="Maelezo" name="notes" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
        </div>
      </Modal>

      {/* Edit Guest Modal */}
      <Modal isOpen={editModal} onClose={() => { setEditModal(false); setFormErrors({}); }} title={`Badilisha: ${editGuest?.guestName || ''}`} width="480px" offsetTop={48}
        footer={
          <>
            <Button variant="secondary" onClick={() => { setEditModal(false); setFormErrors({}); }}>Ghairi</Button>
            <Button variant="primary" loading={editMutation.isPending} onClick={handleEditGuest}>Hifadhi Mabadiliko</Button>
          </>
        }
      >
        <div>
          <Input label="Jina la Mgeni *" name="guestName" value={editForm.guestName} onChange={e => { setEditForm(p => ({ ...p, guestName: e.target.value })); setFormErrors(p => ({ ...p, guestName: '' })); }} required />
          {formErrors.guestName && <p style={{ color: 'var(--danger)', fontSize: '11px', margin: '-8px 0 8px', fontFamily: 'Inter' }}>{formErrors.guestName}</p>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
          <div>
            <Input label="Namba ya Simu" name="phone" value={editForm.phone} onChange={e => { setEditForm(p => ({ ...p, phone: e.target.value })); setFormErrors(p => ({ ...p, phone: '' })); }} placeholder="0754696878" />
            {formErrors.phone && <p style={{ color: 'var(--danger)', fontSize: '11px', margin: '-8px 0 8px', fontFamily: 'Inter' }}>{formErrors.phone}</p>}
          </div>
          <Select label="Aina ya Tiketi" name="ticketType" value={editForm.ticketType}
            onChange={e => setEditForm(p => ({ ...p, ticketType: e.target.value }))}
            options={ticketOptions}
          />
        </div>
        <Input label="Barua Pepe (si lazima)" name="email" type="email" value={editForm.email} onChange={e => setEditForm(p => ({ ...p, email: e.target.value }))} />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 12px' }}>
          <Input label="Nambari ya Meza" name="tableNumber" value={editForm.tableNumber} onChange={e => setEditForm(p => ({ ...p, tableNumber: e.target.value }))} />
          <Input label="Maelezo" name="notes" value={editForm.notes} onChange={e => setEditForm(p => ({ ...p, notes: e.target.value }))} />
        </div>
      </Modal>

      {/* Scan History Modal */}
      {scanHistoryGuest && ReactDOM.createPortal(
        <>
          <div onClick={() => setScanHistoryGuest(null)} style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(26,10,0,0.7)', backdropFilter: 'blur(4px)' }} />
          <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', pointerEvents: 'none' }}>
            <div onClick={e => e.stopPropagation()} style={{ width: 'min(480px, calc(100vw - 32px))', maxHeight: 'calc(100vh - 32px)', background: 'var(--white)', borderRadius: 'var(--radius-xl)', boxShadow: '0 24px 60px rgba(0,0,0,0.4)', overflow: 'hidden', pointerEvents: 'all', display: 'flex', flexDirection: 'column' }}>
              <div style={{ background: 'linear-gradient(135deg, var(--primary-dark), var(--primary))', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h3 style={{ fontFamily: 'Poppins', fontSize: '15px', fontWeight: 700, color: 'white', margin: 0 }}>Historia ya Scan</h3>
                  <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', margin: '2px 0 0' }}>{scanHistoryGuest.guestName} · {scanHistoryGuest.ticketType}</p>
                </div>
                <button onClick={() => setScanHistoryGuest(null)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
              <div style={{ padding: '16px', overflowY: 'auto' }}>
                {(!scanHistoryGuest.scanHistory || scanHistoryGuest.scanHistory.length === 0) ? (
                  <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: '10px', opacity: 0.4 }}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    <p style={{ fontSize: '13px', margin: 0 }}>Hakuna historia ya scan</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {scanHistoryGuest.scanHistory.map((s, i) => (
                      <div key={i} style={{ padding: '12px 14px', background: 'var(--cream)', borderRadius: 'var(--radius)', border: '1px solid var(--border-light)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <p style={{ fontWeight: 600, fontSize: '13px', color: 'var(--primary-dark)', margin: '0 0 3px' }}>
                            Ingizo #{s.entryNumber || i + 1}
                          </p>
                          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                            {s.scannedAt ? new Date(s.scannedAt).toLocaleString('sw-TZ', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                          </p>
                          {s.scannerName && <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0' }}>Scanner: {s.scannerName}</p>}
                        </div>
                        <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--success)', flexShrink: 0 }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Card Preview Popup */}
      <CardPreviewModal guest={previewGuest} onClose={() => setPreviewGuest(null)} />
    </div>
  );
};

export default GuestList;
