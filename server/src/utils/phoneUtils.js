/**
 * Normalize phone numbers to international format (255XXXXXXXXX)
 * Supports Tanzanian numbers
 */
const normalizePhone = (phone) => {
  if (!phone) return null;

  // Remove spaces, dashes, parentheses
  let cleaned = String(phone).replace(/[\s\-\(\)\.]/g, '');

  // Remove leading +
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }

  // Already in 255 format (12 digits)
  if (/^255\d{9}$/.test(cleaned)) {
    return cleaned;
  }

  // Starts with 0 (local format) - 0754696878 -> 255754696878
  if (/^0\d{9}$/.test(cleaned)) {
    return '255' + cleaned.substring(1);
  }

  // 9 digits (without country code or leading 0) - 754696878 -> 255754696878
  if (/^\d{9}$/.test(cleaned)) {
    return '255' + cleaned;
  }

  // Other country codes
  if (/^\d{10,14}$/.test(cleaned)) {
    return cleaned;
  }

  return null;
};

const validatePhone = (phone) => {
  const normalized = normalizePhone(phone);
  return normalized !== null;
};

const formatPhoneForDisplay = (phone) => {
  const normalized = normalizePhone(phone);
  if (!normalized) return phone;
  return '+' + normalized;
};

module.exports = { normalizePhone, validatePhone, formatPhoneForDisplay };
