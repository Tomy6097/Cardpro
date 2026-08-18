import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsAPI, usersAPI, eventsAPI, invitationsAPI } from '../api';
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
  const [waTestResult, setWaTestResult] = useState(null); // { success, messageSid, status, message, troubleshoot }
  const [waTestLoading, setWaTestLoading] = useState(false);
  const [templateInfo, setTemplateInfo] = useState(null);
  const [templateLoading, setTemplateLoading] = useState(false);

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

  const handleTestWhatsApp = async () => {
    setWaTestLoading(true);
    setWaTestResult(null);
    try {
      const res = await invitationsAPI.testWhatsApp({});
      setWaTestResult({ success: true, ...res.data });
    } catch (err) {
      const d = err.response?.data || {};
      setWaTestResult({
        success: false,
        message: d.message || err.message,
        twilioCode: d.twilioCode,
        troubleshoot: d.troubleshoot,
      });
    } finally {
      setWaTestLoading(false);
    }
  };

  const handleInspectTemplate = async () => {
    setTemplateLoading(true);
    setTemplateInfo(null);
    try {
      const res = await invitationsAPI.inspectTemplate();
      setTemplateInfo({ success: true, ...res.data.template });
    } catch (err) {
      const d = err.response?.data || {};
      setTemplateInfo({ success: false, message: d.message || err.message });
    } finally {
      setTemplateLoading(false);
    }
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

          {/* Contact Info — shown on event websites */}
          <div style={{ marginBottom: '4px', padding: '16px', background: 'var(--cream)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-light)' }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: 'var(--primary-dark)', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81a19.79 19.79 0 01-3.07-8.68A2 2 0 012 .91h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/></svg>
              Contact Info (shown in event website footer)
            </p>
            <Input label="Phone / WhatsApp" name="contactPhone" value={settingsForm.contactPhone || ''} onChange={handleSettingChange} placeholder="+255 754 696 878" />
            <Input label="Email Address" name="contactEmail" value={settingsForm.contactEmail || ''} onChange={handleSettingChange} placeholder="info@cardpro.co.tz" />
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

          {/* ── Twilio Sandbox Test ── */}
          <div style={{ background: 'var(--white)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)', border: '2px solid #25D36622', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#25D366" stroke="none"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.533 5.858L0 24l6.335-1.507A11.945 11.945 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-1.9 0-3.7-.5-5.24-1.373l-.375-.222-3.876.923.96-3.773-.244-.389A9.945 9.945 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
              <h3 style={{ fontFamily: 'Poppins', fontSize: '15px', fontWeight: 600, color: '#075E54', margin: 0 }}>
                WhatsApp Sandbox Test
              </h3>
              <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', background: '#FEF3C7', color: '#92400E', border: '1px solid #FDE68A' }}>
                SANDBOX
              </span>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 16px' }}>
              Tests the <strong>cardpro_invitation</strong> template (Content SID: HX9e7d3b8a1f973c95c208541772e9d9a9) via Twilio Sandbox.
              Recipient is set by <code style={{ background: 'var(--cream)', padding: '1px 5px', borderRadius: '3px', fontSize: '11px' }}>TWILIO_TEST_TO</code> in .env
            </p>

            {/* Test data preview */}
            <div style={{ background: 'var(--cream)', borderRadius: 'var(--radius-sm)', padding: '12px 14px', marginBottom: '16px', fontSize: '12px', color: 'var(--text-secondary)', border: '1px solid var(--border-light)' }}>
              <p style={{ fontWeight: 600, color: 'var(--primary-dark)', margin: '0 0 8px', fontSize: '12px' }}>Test data that will be sent:</p>
              {[
                ['Guest Name', 'James'],
                ['Event', 'James & Anna Wedding'],
                ['Date', '25 December 2026'],
                ['Venue', 'Golden Tulip Dar es Salaam'],
                ['Dress Code', 'White and Black'],
                ['Confirm URL', 'https://example.com/invite/test123'],
                ['Verification Code', 'CP7821'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', gap: '8px', marginBottom: '3px' }}>
                  <span style={{ color: 'var(--text-muted)', minWidth: '120px' }}>{k}:</span>
                  <span style={{ color: 'var(--primary-dark)', fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <button
                onClick={handleTestWhatsApp}
                disabled={waTestLoading}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 20px', background: waTestLoading ? '#ccc' : '#25D366',
                  color: 'white', border: 'none', borderRadius: 'var(--radius)',
                  fontSize: '14px', fontWeight: 600, cursor: waTestLoading ? 'not-allowed' : 'pointer',
                  fontFamily: 'Inter', transition: 'all .2s',
                }}
              >
                {waTestLoading ? (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 1s linear infinite' }}><path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" opacity=".25"/><path d="M21 12a9 9 0 01-9 9"/></svg>
                    Sending...
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    Send Test WhatsApp
                  </>
                )}
              </button>

              <button
                onClick={handleInspectTemplate}
                disabled={templateLoading}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '10px 18px', background: 'var(--white)',
                  color: 'var(--primary)', border: '1px solid var(--primary)',
                  borderRadius: 'var(--radius)', fontSize: '13px', fontWeight: 500,
                  cursor: templateLoading ? 'not-allowed' : 'pointer', fontFamily: 'Inter',
                }}
              >
                {templateLoading ? 'Inspecting...' : '🔍 Inspect Template Variables'}
              </button>
            </div>
            <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>

            {/* Test Result */}
            {waTestResult && (
              <div style={{
                borderRadius: 'var(--radius)',
                border: `2px solid ${waTestResult.success ? '#22C55E' : '#EF4444'}`,
                background: waTestResult.success ? '#F0FDF4' : '#FEF2F2',
                padding: '16px',
                marginBottom: '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  {waTestResult.success ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5"><path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                  )}
                  <span style={{ fontWeight: 700, fontSize: '14px', color: waTestResult.success ? '#15803D' : '#DC2626', fontFamily: 'Poppins' }}>
                    {waTestResult.success ? 'SUCCESS' : 'FAILED'}
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: waTestResult.success ? '#166534' : '#991B1B', margin: '0 0 8px' }}>
                  {waTestResult.message}
                </p>
                {waTestResult.success && (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    <div><strong>Message SID:</strong> <code style={{ background: '#DCFCE7', padding: '2px 6px', borderRadius: '4px', fontSize: '12px', color: '#166534' }}>{waTestResult.messageSid}</code></div>
                    <div><strong>Status:</strong> <code style={{ background: '#DCFCE7', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>{waTestResult.status}</code></div>
                    <div><strong>Sent to:</strong> {waTestResult.sentTo}</div>
                    <div><strong>Content SID:</strong> {waTestResult.contentSid}</div>
                  </div>
                )}
                {!waTestResult.success && waTestResult.twilioCode && (
                  <p style={{ fontSize: '12px', color: '#7F1D1D', margin: '4px 0 0' }}>
                    <strong>Twilio Error Code:</strong> {waTestResult.twilioCode}
                  </p>
                )}
                {!waTestResult.success && waTestResult.troubleshoot && (
                  <div style={{ marginTop: '10px', padding: '10px 12px', background: '#FEF9C3', borderRadius: '8px', border: '1px solid #FDE047' }}>
                    <p style={{ fontSize: '12px', color: '#854D0E', margin: 0 }}>
                      <strong>💡 How to fix:</strong> {waTestResult.troubleshoot}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Template Inspection Result */}
            {templateInfo && (
              <div style={{ borderRadius: 'var(--radius)', border: '1px solid var(--border)', background: 'var(--cream)', padding: '14px' }}>
                <p style={{ fontWeight: 600, fontSize: '13px', color: 'var(--primary-dark)', margin: '0 0 8px' }}>
                  Template: {templateInfo.friendlyName || '—'} ({templateInfo.language || '—'})
                </p>
                {templateInfo.success === false ? (
                  <p style={{ color: 'var(--danger)', fontSize: '12px', margin: 0 }}>{templateInfo.message}</p>
                ) : (
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <p style={{ margin: '0 0 6px' }}><strong>SID:</strong> {templateInfo.sid}</p>
                    {templateInfo.variables && Object.keys(templateInfo.variables).length > 0 && (
                      <div>
                        <p style={{ margin: '0 0 4px', fontWeight: 600 }}>Variables:</p>
                        {Object.entries(templateInfo.variables).map(([k, v]) => (
                          <div key={k} style={{ display: 'flex', gap: '8px', marginBottom: '2px' }}>
                            <code style={{ background: 'white', padding: '1px 6px', borderRadius: '3px', minWidth: '30px', textAlign: 'center' }}>{`{{${k}}}`}</code>
                            <span>{v}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    {templateInfo.types && (
                      <div style={{ marginTop: '8px' }}>
                        <p style={{ margin: '0 0 4px', fontWeight: 600 }}>Template body:</p>
                        <pre style={{ background: 'white', padding: '8px', borderRadius: '6px', fontSize: '11px', whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0, border: '1px solid var(--border-light)' }}>
                          {JSON.stringify(templateInfo.types, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
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
