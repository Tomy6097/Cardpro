const QRCode = require('qrcode');
const crypto = require('crypto');

const generateQRToken = (guestId, eventId, ticketType) => {
  const payload = JSON.stringify({ guestId, eventId, ticketType, ts: Date.now() });
  const hmac = crypto.createHmac('sha256', process.env.JWT_SECRET || 'cardpro-secret');
  hmac.update(payload);
  const signature = hmac.digest('hex').substring(0, 16);
  return Buffer.from(payload).toString('base64url') + '.' + signature;
};

const verifyQRToken = (token) => {
  try {
    const [payloadB64, signature] = token.split('.');
    if (!payloadB64 || !signature) return null;

    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString());
    const hmac = crypto.createHmac('sha256', process.env.JWT_SECRET || 'cardpro-secret');
    hmac.update(JSON.stringify({ guestId: payload.guestId, eventId: payload.eventId, ticketType: payload.ticketType, ts: payload.ts }));
    const expectedSig = hmac.digest('hex').substring(0, 16);

    if (signature !== expectedSig) return null;
    return payload;
  } catch {
    return null;
  }
};

const generateQRCodeBuffer = async (data, options = {}) => {
  return QRCode.toBuffer(data, {
    errorCorrectionLevel: 'H',
    type: 'png',
    width: options.size || 300,
    margin: 2,
    color: {
      dark: options.darkColor || '#1A0A00',
      light: options.lightColor || '#FFFFFF',
    },
  });
};

const generateQRCodeDataURL = async (data, options = {}) => {
  return QRCode.toDataURL(data, {
    errorCorrectionLevel: 'H',
    width: options.size || 200,
    margin: 2,
    color: {
      dark: options.darkColor || '#1A0A00',
      light: options.lightColor || '#FFFFFF',
    },
  });
};

module.exports = { generateQRToken, verifyQRToken, generateQRCodeBuffer, generateQRCodeDataURL };
