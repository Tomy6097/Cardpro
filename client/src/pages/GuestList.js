import React, { useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { guestsAPI, eventsAPI } from '../api';
import toast from 'react-hot-toast';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import Input, { Select } from '../components/common/Input';
import Button from '../components/common/Button';

const ticketOptions = [
  { value: 'Single', label: 'Single' }, { value: 'Double', label: 'Double' },
  { value: 'VIP', label: 'VIP' }, { value: 'VVIP', label: 'VVIP' },
  { value: 'Family', label: 'Family' }, { value: 'Child', label: 'Child' },
];

const emptyForm = { guestName: '', phone: '', email: '', ticketType: 'Single', tableNumber: '', notes: '' };

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
    onSuccess: (r) => { qc.invalidateQueries(['guests', eventId]); toast.success(`${r.data.generated} QR codes generated.`); },
    onError: (err) => toast.error(err.message),
  });

  const importMutation = useMutation({
    mutationFn: ({ fd }) => guestsAPI.import(eventId, fd),
    onSuccess: (r) => {
      qc.invalidateQueries(['guests', eventId]);
      toast.success(`${r.data.imported} guests imported. ${r.data.skipped} skipped.`);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteAllMutation = useMutation({
    mutationFn: () => guestsAPI.deleteAll(eventId),
    onSuccess: () => { qc.invalidateQueries(['guests', eventId]); toast.success('All guests deleted.'); },
    onError: (err) => toast.error(err.message),
  });

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('csv', file);
    importMutation.mutate({ fd });
    e.target.value = '';
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
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {g.qrCodeUrl && (
                        <a href={g.qrCodeUrl} target="_blank" rel="noreferrer" style={{ padding: '4px 10px', background: 'var(--cream-dark)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '11px', color: 'var(--primary)', textDecoration: 'none' }}>
                          QR
                        </a>
                      )}
                      {g.cardUrl && (
                        <a href={g.cardUrl} target="_blank" rel="noreferrer" style={{ padding: '4px 10px', background: 'var(--cream-dark)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', fontSize: '11px', color: 'var(--primary)', textDecoration: 'none' }}>
                          Card
                        </a>
                      )}
                      {showDeleted ? (
                        <button onClick={() => restoreMutation.mutate(g._id)} style={{ padding: '4px 10px', background: 'var(--success-light)', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '11px', color: 'var(--success)', cursor: 'pointer' }}>
                          Restore
                        </button>
                      ) : (
                        <button onClick={() => deleteMutation.mutate(g._id)} style={{ padding: '4px 10px', background: 'var(--danger-light)', border: 'none', borderRadius: 'var(--radius-sm)', fontSize: '11px', color: 'var(--danger)', cursor: 'pointer' }}>
                          Delete
                        </button>
                      )}
                    </div>
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
      <Modal isOpen={addModal} onClose={() => setAddModal(false)} title="Add Guest" width="480px"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAddModal(false)}>Cancel</Button>
            <Button variant="primary" loading={addMutation.isPending} onClick={() => addMutation.mutate(form)}>Add Guest</Button>
          </>
        }
      >
        <Input label="Guest Name" name="guestName" value={form.guestName} onChange={e => setForm(p => ({ ...p, guestName: e.target.value }))} required />
        <Input label="Phone Number" name="phone" value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} required placeholder="0754696878 or 255754696878" />
        <Input label="Email (optional)" name="email" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
        <Select label="Ticket Type" name="ticketType" value={form.ticketType}
          onChange={e => setForm(p => ({ ...p, ticketType: e.target.value }))}
          options={ticketOptions}
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <Input label="Table Number" name="tableNumber" value={form.tableNumber} onChange={e => setForm(p => ({ ...p, tableNumber: e.target.value }))} />
          <Input label="Notes" name="notes" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
        </div>
      </Modal>
    </div>
  );
};

export default GuestList;
