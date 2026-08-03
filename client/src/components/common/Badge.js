import React from 'react';

const badgeColors = {
  active: { bg: '#D1FAE5', color: '#065F46' },
  completed: { bg: '#DBEAFE', color: '#1E40AF' },
  cancelled: { bg: '#FEE2E2', color: '#991B1B' },
  pending: { bg: '#FEF3C7', color: '#92400E' },
  confirmed: { bg: '#D1FAE5', color: '#065F46' },
  declined: { bg: '#FEE2E2', color: '#991B1B' },
  not_sent: { bg: '#F3F4F6', color: '#374151' },
  sms_sent: { bg: '#DBEAFE', color: '#1E40AF' },
  whatsapp_sent: { bg: '#D1FAE5', color: '#065F46' },
  delivered: { bg: '#D1FAE5', color: '#065F46' },
  failed: { bg: '#FEE2E2', color: '#991B1B' },
  scanned: { bg: '#D1FAE5', color: '#065F46' },
  not_scanned: { bg: '#F3F4F6', color: '#374151' },
  duplicate_scan: { bg: '#FEF3C7', color: '#92400E' },
  Single: { bg: '#EDE9FE', color: '#5B21B6' },
  Double: { bg: '#FEE2E2', color: '#991B1B' },
  VIP: { bg: '#FEF3C7', color: '#92400E' },
  VVIP: { bg: '#5C3D11', color: '#C9A84C' },
  Family: { bg: '#D1FAE5', color: '#065F46' },
  Child: { bg: '#DBEAFE', color: '#1E40AF' },
  admin: { bg: '#5C3D11', color: '#C9A84C' },
  scanner: { bg: '#DBEAFE', color: '#1E40AF' },
};

const labelMap = {
  not_sent: 'Not Sent',
  sms_sent: 'SMS Sent',
  whatsapp_sent: 'WhatsApp Sent',
  not_scanned: 'Not Scanned',
  duplicate_scan: 'Duplicate Scan',
};

const Badge = ({ status, label, style = {} }) => {
  const colors = badgeColors[status] || { bg: '#F3F4F6', color: '#374151' };
  const displayLabel = label || labelMap[status] || (status ? status.charAt(0).toUpperCase() + status.slice(1) : '');

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      padding: '3px 10px', borderRadius: '20px',
      fontSize: '12px', fontWeight: 500,
      background: colors.bg, color: colors.color,
      whiteSpace: 'nowrap',
      ...style,
    }}>
      {displayLabel}
    </span>
  );
};

export default Badge;
