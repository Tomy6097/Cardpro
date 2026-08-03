import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsAPI, usersAPI, eventsAPI } from '../api';
import toast from 'react-hot-toast';
import Button from '../components/common/Button';
import Input, { Select } from '../components/common/Input';
import Modal from '../components/common/Modal';
import Badge from '../components/common/Badge';

const Settings = () => {
  const qc = useQueryClient();
  const logoRef = useRef();
  const [activeTab, setActiveTab] = useState('general');
  const [settingsForm, setSettingsForm] = useState({});
  const [scannerModal, setScannerModal] = useState(false);
  const [scannerForm, setScannerForm] = useState({ username: '', password: '', fullName: '', assignedEvents: [] });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  const { data: settingsData, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsAPI.get().then(r => r.data),
  });

  const { data: scannersData, refetch: refetchScanners } = useQuery({
    queryKey: ['scanners'],
    queryFn: () => usersAPI.getScanners().then(r => r.data),
  });

  const { data: eventsData } = useQuery({
    queryKey: ['events-all'],
    queryFn: () => eventsAPI.getAll({ limit: 100 }).then(r => r.data),
  });

  useEffect(() => {
    if (settingsData?.settings) {
      setSettingsForm(settingsData.settings);
    }
  }, [settingsData]);

  const updateMutation = useMutation({
    mutationFn: (d) => settingsAPI.update(d),
    onSuccess: () => { qc.invalidateQueries(['settings']); toast.success('Settings saved.'); },
    onError: (err) => toast.error(err.message),
  });

  const uploadLogoMutation = useMutation({
    mutationFn: (fd) => settingsAPI.uploadLogo(fd),
    onSuccess: () => { qc.invalidateQueries(['settings']); toast.success('Logo updated.'); },
    onError: (err) => toast.error(err.message),
  });

  const createScannerMutation = useMutation({
    mutationFn: (d) => usersAPI.createScanner(d),
    onSuccess: () => { refetchScanners(); toast.success('Scanner created.'); setScannerModal(false); setScannerForm({ username: '', password: '', fullName: '', assignedEvents: [] }); },
    onError: (err) => toast.error(err.message),
  });

  const deleteScannerMutation = useMutation({
    mutationFn: usersAPI.deleteScanner,
    onSuccess: () => { refetchScanners(); toast.success('Scanner deleted.'); },
    onError: (err) => toast.error(err.message),
  });

  const handleSettingChange = (e) => setSettingsForm(p => ({ ...p, [e.target.name]: e.target.value }));

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('logo', file);
    uploadLogoMutation.mutate(fd);
    e.target.value = '';
  };

  const tabs = ['general', 'messaging', 'scanners', 'security'];

  const scanners = scannersData?.scanners || [];
  const events = eventsData?.events || [];

  return (
    <div className="page-container fade-in">
      <h1 style={{ fontFamily: 'Poppins', fontSize: '24px', fontWeight: 700, color: 'var(--primary-dark)', marginBottom: '24px' }}>
        Settings
      </h1>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '24px', background: 'var(--white)', borderRadius: 'var(--radius)', padding: '6px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-light)', width: 'fit-content' }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={{
            padding: '8px 20px', borderRadius: 'var(--radius-sm)',
            border: 'none', cursor: 'pointer',
            background: activeTab === t ? 'var(--primary)' : 'transparent',
            color: activeTab === t ? 'var(--white)' : 'var(--text-secondary)',
            fontSize: '14px', fontWeight: activeTab === t ? 600 : 400,
            fontFamily: 'Inter', transition: 'all var(--transition)',
            textTransform: 'capitalize',
          }}>
            {t}
          </button>
        ))}
      </div>

      {/* General Tab */}
      {activeTab === 'general' && (
        <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-light)', padding: '28px', maxWidth: '600px' }}>
          <h3 style={{ fontFamily: 'Poppins', fontSize: '16px', fontWeight: 600, color: 'var(--primary-dark)', marginBottom: '20px' }}>
            Company Settings
          </h3>
          <Input label="Company Name" name="companyName" value={settingsForm.companyName || ''} onChange={handleSettingChange} />

          {/* Logo */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>Company Logo</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {settingsForm.logo?.url && (
                <img src={settingsForm.logo.url} alt="Logo" style={{ height: '48px', width: 'auto', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }} />
              )}
              <Button variant="secondary" size="sm" onClick={() => logoRef.current?.click()} loading={uploadLogoMutation.isPending}>
                {settingsForm.logo?.url ? 'Replace Logo' : 'Upload Logo'}
              </Button>
              <input ref={logoRef} type="file" accept=".png,.jpg,.jpeg,.svg" onChange={handleLogoUpload} style={{ display: 'none' }} />
            </div>
          </div>

          <Input label="Default SMS Sender ID" name="senderIdSms" value={settingsForm.senderIdSms || ''} onChange={handleSettingChange} placeholder="CARDPRO" />

          <Button variant="primary" onClick={() => updateMutation.mutate(settingsForm)} loading={updateMutation.isPending}>
            Save Settings
          </Button>
        </div>
      )}

      {/* Messaging Tab */}
      {activeTab === 'messaging' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '700px' }}>
          {/* Beem Africa */}
          <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-light)', padding: '24px' }}>
            <h3 style={{ fontFamily: 'Poppins', fontSize: '15px', fontWeight: 600, color: 'var(--primary-dark)', marginBottom: '16px' }}>
              Beem Africa SMS
            </h3>
            <Input label="API Key" name="beemApiKey" value={settingsForm.beemApiKey || ''} onChange={handleSettingChange} placeholder="Your Beem API Key" />
            <Input label="Secret Key" name="beemSecretKey" value={settingsForm.beemSecretKey || ''} onChange={handleSettingChange} type="password" placeholder="Your Beem Secret Key" />
            <Input label="Sender ID" name="beemSenderId" value={settingsForm.beemSenderId || ''} onChange={handleSettingChange} placeholder="CARDPRO" />
            <Button variant="primary" size="sm" onClick={() => updateMutation.mutate(settingsForm)} loading={updateMutation.isPending}>Save</Button>
          </div>

          {/* Twilio */}
          <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-light)', padding: '24px' }}>
            <h3 style={{ fontFamily: 'Poppins', fontSize: '15px', fontWeight: 600, color: 'var(--primary-dark)', marginBottom: '16px' }}>
              Twilio WhatsApp
            </h3>
            <Input label="Account SID" name="twilioAccountSid" value={settingsForm.twilioAccountSid || ''} onChange={handleSettingChange} placeholder="ACxxxxxxxxxx" />
            <Input label="Auth Token" name="twilioAuthToken" value={settingsForm.twilioAuthToken || ''} onChange={handleSettingChange} type="password" placeholder="Your Twilio Auth Token" />
            <Input label="WhatsApp From Number" name="twilioWhatsappFrom" value={settingsForm.twilioWhatsappFrom || ''} onChange={handleSettingChange} placeholder="whatsapp:+14155238886" />
            <Button variant="primary" size="sm" onClick={() => updateMutation.mutate(settingsForm)} loading={updateMutation.isPending}>Save</Button>
          </div>

          {/* Cloudinary */}
          <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-light)', padding: '24px' }}>
            <h3 style={{ fontFamily: 'Poppins', fontSize: '15px', fontWeight: 600, color: 'var(--primary-dark)', marginBottom: '16px' }}>
              Cloudinary Storage
            </h3>
            <Input label="Cloud Name" name="cloudinaryCloudName" value={settingsForm.cloudinaryCloudName || ''} onChange={handleSettingChange} />
            <Input label="API Key" name="cloudinaryApiKey" value={settingsForm.cloudinaryApiKey || ''} onChange={handleSettingChange} />
            <Input label="API Secret" name="cloudinaryApiSecret" value={settingsForm.cloudinaryApiSecret || ''} onChange={handleSettingChange} type="password" />
            <Button variant="primary" size="sm" onClick={() => updateMutation.mutate(settingsForm)} loading={updateMutation.isPending}>Save</Button>
          </div>
        </div>
      )}

      {/* Scanners Tab */}
      {activeTab === 'scanners' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
            <h3 style={{ fontFamily: 'Poppins', fontSize: '16px', fontWeight: 600, color: 'var(--primary-dark)', margin: 0 }}>
              Scanner Accounts
            </h3>
            <Button variant="primary" size="sm" onClick={() => setScannerModal(true)}>+ Add Scanner</Button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {scanners.length === 0 ? (
              <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', padding: '40px', textAlign: 'center', color: 'var(--text-muted)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-light)' }}>
                No scanners yet. Add a scanner account.
              </div>
            ) : scanners.map(s => (
              <div key={s._id} style={{ background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-light)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--cream-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: 700, color: 'var(--primary)' }}>
                    {s.username?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p style={{ margin: 0, fontWeight: 600, fontSize: '14px', color: 'var(--primary-dark)' }}>{s.fullName || s.username}</p>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-muted)' }}>@{s.username}</p>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Badge status={s.isActive ? 'active' : 'cancelled'} label={s.isActive ? 'Active' : 'Inactive'} />
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    {s.assignedEvents?.length || 0} events
                  </span>
                  <button onClick={() => { if (window.confirm(`Delete scanner ${s.username}?`)) deleteScannerMutation.mutate(s._id); }}
                    style={{ padding: '6px 12px', border: 'none', borderRadius: 'var(--radius-sm)', background: 'var(--danger-light)', color: 'var(--danger)', fontSize: '12px', cursor: 'pointer' }}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-light)', padding: '28px', maxWidth: '480px' }}>
          <h3 style={{ fontFamily: 'Poppins', fontSize: '16px', fontWeight: 600, color: 'var(--primary-dark)', marginBottom: '20px' }}>
            Change Admin Password
          </h3>
          <Input label="Current Password" type="password" value={passwordForm.currentPassword}
            onChange={e => setPasswordForm(p => ({ ...p, currentPassword: e.target.value }))} required />
          <Input label="New Password" type="password" value={passwordForm.newPassword}
            onChange={e => setPasswordForm(p => ({ ...p, newPassword: e.target.value }))} required />
          <Input label="Confirm New Password" type="password" value={passwordForm.confirmPassword}
            onChange={e => setPasswordForm(p => ({ ...p, confirmPassword: e.target.value }))} required />
          <Button variant="primary" onClick={async () => {
            if (passwordForm.newPassword !== passwordForm.confirmPassword) {
              toast.error('Passwords do not match.'); return;
            }
            try {
              const { authAPI } = await import('../api');
              await authAPI.changePassword({ currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword });
              toast.success('Password changed successfully.');
              setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
            } catch (err) { toast.error(err.message); }
          }}>
            Change Password
          </Button>
        </div>
      )}

      {/* Scanner Modal */}
      <Modal isOpen={scannerModal} onClose={() => setScannerModal(false)} title="Create Scanner Account" width="480px"
        footer={
          <>
            <Button variant="secondary" onClick={() => setScannerModal(false)}>Cancel</Button>
            <Button variant="primary" loading={createScannerMutation.isPending}
              onClick={() => createScannerMutation.mutate(scannerForm)}>
              Create Scanner
            </Button>
          </>
        }
      >
        <Input label="Username" value={scannerForm.username} onChange={e => setScannerForm(p => ({ ...p, username: e.target.value }))} required />
        <Input label="Password" type="password" value={scannerForm.password} onChange={e => setScannerForm(p => ({ ...p, password: e.target.value }))} required />
        <Input label="Full Name" value={scannerForm.fullName} onChange={e => setScannerForm(p => ({ ...p, fullName: e.target.value }))} />
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
            Assigned Events
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '160px', overflowY: 'auto' }}>
            {events.map(ev => (
              <label key={ev._id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={scannerForm.assignedEvents.includes(ev._id)}
                  onChange={e => {
                    const arr = [...scannerForm.assignedEvents];
                    if (e.target.checked) arr.push(ev._id);
                    else arr.splice(arr.indexOf(ev._id), 1);
                    setScannerForm(p => ({ ...p, assignedEvents: arr }));
                  }}
                />
                {ev.name}
              </label>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Settings;
