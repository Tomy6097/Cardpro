import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventsAPI } from '../api';
import toast from 'react-hot-toast';
import Badge from '../components/common/Badge';
import Modal from '../components/common/Modal';
import Input, { Textarea, Select } from '../components/common/Input';
import Button from '../components/common/Button';
import { format } from 'date-fns';

const statusOptions = [
  { value: '', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const emptyForm = {
  name: '', clientName: '', date: '', time: '', venue: '',
  description: '', securityPin: '', dressCode: '', googleMapsUrl: '', status: 'active',
};

const Events = () => {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['events', search, statusFilter],
    queryFn: () => eventsAPI.getAll({ search, status: statusFilter, limit: 50 }).then(r => r.data),
  });

  const createMutation = useMutation({
    mutationFn: (data) => editId ? eventsAPI.update(editId, data) : eventsAPI.create(data),
    onSuccess: () => {
      qc.invalidateQueries(['events']);
      qc.invalidateQueries(['dashboard']);
      toast.success(editId ? 'Event updated.' : 'Event created.');
      setModalOpen(false);
      setForm(emptyForm);
      setEditId(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: eventsAPI.delete,
    onSuccess: () => {
      qc.invalidateQueries(['events']);
      toast.success('Event deleted.');
    },
    onError: (err) => toast.error(err.message),
  });

  const handleChange = (e) => setForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleEdit = (ev) => {
    setForm({
      name: ev.name, clientName: ev.clientName,
      date: ev.date ? ev.date.split('T')[0] : '',
      time: ev.time, venue: ev.venue,
      description: ev.description || '', securityPin: ev.securityPin,
      dressCode: ev.dressCode || '', googleMapsUrl: ev.googleMapsUrl || '',
      status: ev.status,
    });
    setEditId(ev._id);
    setModalOpen(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Delete this event? All guest data will also be deleted.')) {
      deleteMutation.mutate(id);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(form);
  };

  const events = data?.events || [];

  return (
    <div className="page-container fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'Poppins', fontSize: '24px', fontWeight: 700, color: 'var(--primary-dark)', margin: 0 }}>Events</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', margin: '4px 0 0' }}>{data?.pagination?.total || 0} total events</p>
        </div>
        <Button variant="primary" onClick={() => { setEditId(null); setForm(emptyForm); setModalOpen(true); }}>
          + New Event
        </Button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input
          type="text" placeholder="Search events..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{
            flex: '1 1 240px', padding: '9px 16px',
            border: '1px solid var(--border)', borderRadius: 'var(--radius)',
            fontSize: '14px', outline: 'none', fontFamily: 'Inter',
          }}
        />
        <select
          value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          style={{
            padding: '9px 16px', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', fontSize: '14px',
            outline: 'none', background: 'var(--white)', fontFamily: 'Inter',
          }}
        >
          {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Events grid */}
      {isLoading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton" style={{ height: '200px' }} />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)' }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="1.5" style={{ marginBottom: '16px' }}>
            <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
          </svg>
          <h3 style={{ fontFamily: 'Poppins', color: 'var(--primary-dark)', marginBottom: '8px' }}>No events found</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>Create your first event to get started.</p>
          <Button onClick={() => setModalOpen(true)}>Create Event</Button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {events.map(ev => (
            <div key={ev._id} style={{
              background: 'var(--white)', borderRadius: 'var(--radius)',
              boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-light)',
              overflow: 'hidden', transition: 'box-shadow var(--transition)',
              cursor: 'pointer',
            }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow-lg)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'var(--shadow-md)'}
            >
              {/* Header */}
              <div style={{ background: 'linear-gradient(135deg, var(--primary-dark), var(--primary))', padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <h3 style={{ fontFamily: 'Poppins', fontSize: '16px', fontWeight: 600, color: 'var(--white)', margin: 0, flex: 1 }}>
                    {ev.name}
                  </h3>
                  <Badge status={ev.status} style={{ marginLeft: '8px', flexShrink: 0 }} />
                </div>
                <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', margin: 0 }}>{ev.clientName}</p>
              </div>

              {/* Body */}
              <div style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
                    {ev.date ? format(new Date(ev.date), 'MMMM d, yyyy') : '—'} {ev.time && `at ${ev.time}`}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>
                    {ev.venue}
                  </div>
                  {ev.stats?.totalGuests > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
                      {ev.stats.totalGuests} guests
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => navigate(`/events/${ev._id}/guests`)} style={{
                    flex: 1, padding: '8px', borderRadius: 'var(--radius-sm)',
                    background: 'var(--primary)', color: 'var(--white)',
                    border: 'none', fontSize: '12px', fontWeight: 500,
                    cursor: 'pointer', fontFamily: 'Inter',
                  }}>
                    Manage
                  </button>
                  <button onClick={() => handleEdit(ev)} style={{
                    padding: '8px 14px', borderRadius: 'var(--radius-sm)',
                    background: 'var(--cream-dark)', color: 'var(--primary)',
                    border: '1px solid var(--border)', fontSize: '12px',
                    cursor: 'pointer', fontFamily: 'Inter',
                  }}>
                    Edit
                  </button>
                  <button onClick={() => handleDelete(ev._id)} style={{
                    padding: '8px 14px', borderRadius: 'var(--radius-sm)',
                    background: 'var(--danger-light)', color: 'var(--danger)',
                    border: 'none', fontSize: '12px',
                    cursor: 'pointer', fontFamily: 'Inter',
                  }}>
                    Del
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditId(null); setForm(emptyForm); }}
        title={editId ? 'Edit Event' : 'Create New Event'}
        width="600px"
        footer={
          <>
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" loading={createMutation.isPending} onClick={handleSubmit} type="button">
              {editId ? 'Save Changes' : 'Create Event'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Input label="Event Name" name="name" value={form.name} onChange={handleChange} required />
            <Input label="Client Name" name="clientName" value={form.clientName} onChange={handleChange} required />
            <Input label="Date" name="date" type="date" value={form.date} onChange={handleChange} required />
            <Input label="Time" name="time" type="time" value={form.time} onChange={handleChange} required />
          </div>
          <Input label="Venue" name="venue" value={form.venue} onChange={handleChange} required />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Input label="Dress Code" name="dressCode" value={form.dressCode} onChange={handleChange} placeholder="e.g. Formal Attire" />
            <Input label="Security PIN" name="securityPin" value={form.securityPin} onChange={handleChange} required />
          </div>
          <Input label="Google Maps URL" name="googleMapsUrl" value={form.googleMapsUrl} onChange={handleChange} placeholder="https://maps.google.com/..." />
          <Textarea label="Description" name="description" value={form.description} onChange={handleChange} rows={3} />
          {editId && (
            <Select label="Status" name="status" value={form.status} onChange={handleChange}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'completed', label: 'Completed' },
                { value: 'cancelled', label: 'Cancelled' },
              ]}
            />
          )}
        </form>
      </Modal>
    </div>
  );
};

export default Events;
