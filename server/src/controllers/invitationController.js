const axios = require('axios');
const twilio = require('twilio');
const Guest = require('../models/Guest');
const Event = require('../models/Event');
const Settings = require('../models/Settings');
const { logActivity } = require('../utils/activityLogger');
const { asyncHandler } = require('../middleware/errorHandler');

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
};

const buildConfirmUrl = (eventSlug, guestVerificationCode) => {
  const baseUrl = process.env.CLIENT_URL || 'https://cardpro-app.onrender.com';
  return `${baseUrl}/event/${eventSlug}?code=${guestVerificationCode}`;
};

const interpolateTemplate = (template, guest, event) => {
  const confirmUrl = buildConfirmUrl(event.slug, guest.verificationCode);
  return template
    .replace(/{guestName}/g, guest.guestName)
    .replace(/{eventName}/g, event.name)
    .replace(/{date}/g, formatDate(event.date))
    .replace(/{time}/g, event.time)
    .replace(/{venue}/g, event.venue)
    .replace(/{dressCode}/g, event.dressCode || '')
    .replace(/{confirmUrl}/g, confirmUrl)
    .replace(/{verificationCode}/g, guest.verificationCode);
};

// --- SMS via Beem Africa ---
const sendBeemSMS = async (phone, message, settings) => {
  const apiKey = settings?.beemApiKey || process.env.BEEM_API_KEY;
  const secretKey = settings?.beemSecretKey || process.env.BEEM_SECRET_KEY;
  const senderId = settings?.beemSenderId || process.env.BEEM_SENDER_ID || 'CARDPRO';

  if (!apiKey || !secretKey) {
    throw new Error('Beem Africa credentials not configured. Set beemApiKey and beemSecretKey in Settings.');
  }

  // Ensure phone has no + prefix for Beem
  const cleanPhone = phone.replace(/^\+/, '');

  const recipients = [{ recipient_id: 1, dest_addr: cleanPhone }];

  try {
    const response = await axios.post(
      'https://apisms.beem.africa/v1/send',
      {
        source_addr: senderId,
        schedule_time: '',
        encoding: 0,
        message,
        recipients,
      },
      {
        auth: { username: apiKey, password: secretKey },
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      }
    );

    // Beem returns success_count in response
    const data = response.data;
    if (data?.successful === 0 || (data?.data && data.data[0]?.request_id === null)) {
      throw new Error(`Beem rejected message: ${JSON.stringify(data)}`);
    }

    return data;
  } catch (err) {
    if (err.response) {
      // Beem returned an error response
      throw new Error(`Beem API error (${err.response.status}): ${JSON.stringify(err.response.data)}`);
    }
    throw err;
  }
};

// --- WhatsApp via Twilio (plain body) ---
const sendTwilioWhatsApp = async (phone, message, settings) => {
  const accountSid = settings?.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID;
  const authToken = settings?.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN;
  const from = settings?.twilioWhatsappFrom || process.env.TWILIO_WHATSAPP_FROM;
  const contentSid = process.env.TWILIO_CONTENT_SID;

  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials not configured.');
  }

  const client = twilio(accountSid, authToken);

  // If Content SID is set — use template (recommended for WhatsApp Business)
  if (contentSid) {
    // Extract values from the interpolated message is not possible in reverse
    // so we pass message as plain body fallback — but for template we need guest/event data
    // This path is used by sendWhatsAppTemplate() below
    return client.messages.create({ from, to: `whatsapp:+${phone}`, body: message });
  }

  return client.messages.create({ from, to: `whatsapp:+${phone}`, body: message });
};

// --- WhatsApp via Twilio Content Template (with real guest/event data) ---
const sendTwilioWhatsAppWithTemplate = async (phone, guest, event, settings) => {
  const accountSid = settings?.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID;
  const authToken  = settings?.twilioAuthToken  || process.env.TWILIO_AUTH_TOKEN;
  const from       = settings?.twilioWhatsappFrom || process.env.TWILIO_WHATSAPP_FROM;
  const contentSid = process.env.TWILIO_CONTENT_SID;

  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.');
  }
  if (!from) {
    throw new Error('TWILIO_WHATSAPP_FROM not configured.');
  }
  if (!contentSid) {
    throw new Error('TWILIO_CONTENT_SID not configured.');
  }

  const client = twilio(accountSid, authToken);
  const confirmUrl = buildConfirmUrl(event.slug, guest.verificationCode);

  // Normalize phone and from
  const cleanPhone = phone.replace(/\D/g, '');
  const toNumber   = `whatsapp:+${cleanPhone}`;
  const rawFrom    = settings?.twilioWhatsappFrom || process.env.TWILIO_WHATSAPP_FROM || '';
  const fromNumber = rawFrom.startsWith('whatsapp:')
    ? rawFrom.replace(/\s/g, '')
    : `whatsapp:+${rawFrom.replace(/\D/g, '')}`;

  const contentVariables = {
    '1': guest.guestName,
    '2': event.name,
    '3': formatDate(event.date) + (event.time ? ` saa ${event.time}` : ''),
    '4': event.venue,
    '5': event.dressCode || 'Smart Casual',
    '6': confirmUrl,
    '7': guest.verificationCode,
  };

  const cvString = JSON.stringify(contentVariables);

  // Use Twilio REST API directly via axios — avoids SDK contentVariables serialization issues
  const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const params = new URLSearchParams();
  params.append('From', fromNumber);
  params.append('To', toNumber);
  params.append('ContentSid', contentSid);
  params.append('ContentVariables', cvString);

  return axios.post(twilioUrl, params, {
    auth: { username: accountSid, password: authToken },
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: 30000,
  });
};

// --- WhatsApp via Twilio Content Template ---
const sendTwilioWhatsAppTemplate = async ({ to, contentSid, contentVariables, settings }) => {
  const accountSid = settings?.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID;
  const authToken  = settings?.twilioAuthToken  || process.env.TWILIO_AUTH_TOKEN;
  const from       = settings?.twilioWhatsappFrom || process.env.TWILIO_WHATSAPP_FROM;

  if (!accountSid || !authToken) {
    throw new Error('Twilio credentials not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in Settings or .env');
  }
  if (!from) {
    throw new Error('TWILIO_WHATSAPP_FROM not configured. Set it in Settings or .env');
  }
  if (!contentSid) {
    throw new Error('No Content SID provided.');
  }

  const client = twilio(accountSid, authToken);

  const params = {
    from,
    to,
    contentSid,
  };

  // Only include contentVariables if there are any
  if (contentVariables && Object.keys(contentVariables).length > 0) {
    params.contentVariables = JSON.stringify(contentVariables);
  }

  return client.messages.create(params);
};

exports.sendSMS = asyncHandler(async (req, res) => {
  const { guestId, customMessage } = req.body;

  const guest = await Guest.findById(guestId).populate('event');
  if (!guest) return res.status(404).json({ success: false, message: 'Guest not found.' });

  const settings = await Settings.findOne();
  const template = customMessage || settings?.defaultSmsTemplate || 'Dear {guestName}, You are invited to {eventName} on {date} at {venue}. Confirm: {confirmUrl}';

  const message = interpolateTemplate(template, guest, guest.event);

  await sendBeemSMS(guest.phone, message, settings);

  guest.messageStatus = 'sms_sent';
  guest.messageChannel = 'sms';
  guest.messageSentAt = new Date();
  await guest.save({ validateBeforeSave: false });

  await logActivity({
    event: guest.event._id,
    action: 'send_sms',
    description: `SMS sent to guest "${guest.guestName}"`,
    req,
  });

  res.json({ success: true, message: 'SMS sent successfully.' });
});

exports.sendWhatsApp = asyncHandler(async (req, res) => {
  const { guestId, customMessage } = req.body;

  const guest = await Guest.findById(guestId).populate('event');
  if (!guest) return res.status(404).json({ success: false, message: 'Guest not found.' });

  const settings = await Settings.findOne();
  const contentSid = process.env.TWILIO_CONTENT_SID;
  const accountSid = settings?.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID;
  const authToken  = settings?.twilioAuthToken  || process.env.TWILIO_AUTH_TOKEN;

  // Normalize FROM — always ensure it has whatsapp: prefix and no spaces
  const rawFrom = settings?.twilioWhatsappFrom || process.env.TWILIO_WHATSAPP_FROM || '';
  const from = rawFrom.startsWith('whatsapp:')
    ? rawFrom.replace(/\s/g, '')
    : `whatsapp:+${rawFrom.replace(/\D/g, '')}`;

  // Normalize phone — digits only, then add whatsapp: prefix
  const cleanPhone = guest.phone.replace(/\D/g, '');
  const toNumber   = `whatsapp:+${cleanPhone}`;

  console.log('=== WhatsApp Debug ===');
  console.log('Guest:', guest.guestName);
  console.log('Raw phone:', guest.phone);
  console.log('Clean phone:', cleanPhone);
  console.log('To:', toNumber);
  console.log('From:', from);
  console.log('ContentSid:', contentSid);
  console.log('AccountSid set:', !!accountSid);
  console.log('AuthToken set:', !!authToken);
  console.log('=====================');

  if (!accountSid || !authToken) {
    return res.status(400).json({ success: false, message: 'Twilio credentials not configured. Go to Settings → Messaging and save your Twilio credentials.' });
  }
  if (!from) {
    return res.status(400).json({ success: false, message: 'TWILIO_WHATSAPP_FROM not configured.' });
  }

  const client = twilio(accountSid, authToken);

  if (contentSid && !customMessage) {
    const confirmUrl = buildConfirmUrl(guest.event.slug, guest.verificationCode);
    const contentVariables = {
      '1': guest.guestName,
      '2': guest.event.name,
      '3': formatDate(guest.event.date) + (guest.event.time ? ` · ${guest.event.time}` : ''),
      '4': guest.event.venue,
      '5': guest.event.dressCode || 'Smart Casual',
      '6': confirmUrl,
      '7': guest.verificationCode,
    };

    const cvString = JSON.stringify(contentVariables);
    console.log('=== sendWhatsApp DEBUG ===');
    console.log('Guest:', guest.guestName, '| Phone:', guest.phone);
    console.log('From:', from, '| To:', toNumber);
    console.log('ContentSid:', contentSid);
    console.log('ContentVariables:', cvString);
    console.log('=========================');

    // Use Twilio REST API directly via axios
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const params = new URLSearchParams();
    params.append('From', from);
    params.append('To', toNumber);
    params.append('ContentSid', contentSid);
    params.append('ContentVariables', cvString);

    const response = await axios.post(twilioUrl, params, {
      auth: { username: accountSid, password: authToken },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 30000,
    });

    console.log('Twilio SID:', response.data?.sid, '| Status:', response.data?.status);
    console.log('Body sent:', response.data?.body?.substring(0, 100));
  } else {
    const template = customMessage || settings?.defaultWhatsappTemplate || 'Dear {guestName}, You are invited to *{eventName}*\nDate: {date}\nVenue: {venue}\nConfirm: {confirmUrl}';
    const message  = interpolateTemplate(template, guest, guest.event);
    await client.messages.create({ from, to: toNumber, body: message });
  }

  guest.messageStatus = 'whatsapp_sent';
  guest.messageChannel = 'whatsapp';
  guest.messageSentAt = new Date();
  await guest.save({ validateBeforeSave: false });

  await logActivity({
    event: guest.event._id,
    action: 'send_whatsapp',
    description: `WhatsApp sent to guest "${guest.guestName}"`,
    req,
  });

  res.json({ success: true, message: 'WhatsApp message sent successfully.' });
});

exports.sendBulkSMS = asyncHandler(async (req, res) => {
  const { eventId, customMessage, filter = {} } = req.body;

  const event = await Event.findById(eventId);
  if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

  const settings = await Settings.findOne();
  const template = customMessage || settings?.defaultSmsTemplate || 'Dear {guestName}, You are invited to {eventName}. Confirm: {confirmUrl}';

  const guestFilter = { event: eventId, isDeleted: false };
  if (filter.rsvpStatus) guestFilter.rsvpStatus = filter.rsvpStatus;
  if (filter.notSent) guestFilter.messageStatus = 'not_sent';

  const guests = await Guest.find(guestFilter);

  const results = { sent: 0, failed: 0, errors: [] };

  for (const guest of guests) {
    try {
      const message = interpolateTemplate(template, guest, event);
      await sendBeemSMS(guest.phone, message, settings);
      guest.messageStatus = 'sms_sent';
      guest.messageChannel = 'sms';
      guest.messageSentAt = new Date();
      await guest.save({ validateBeforeSave: false });
      results.sent++;
    } catch (err) {
      results.failed++;
      results.errors.push({ guest: guest.guestName, error: err.message });
    }
  }

  await logActivity({
    event: eventId,
    action: 'send_bulk_sms',
    description: `Bulk SMS: ${results.sent} sent, ${results.failed} failed`,
    metadata: results,
    req,
  });

  res.json({ success: true, ...results });
});

exports.sendBulkWhatsApp = asyncHandler(async (req, res) => {
  const { eventId, customMessage, filter = {} } = req.body;

  const event = await Event.findById(eventId);
  if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

  const settings = await Settings.findOne();
  const contentSid = process.env.TWILIO_CONTENT_SID;

  const guestFilter = { event: eventId, isDeleted: false };
  if (filter.rsvpStatus) guestFilter.rsvpStatus = filter.rsvpStatus;
  if (filter.notSent) guestFilter.messageStatus = 'not_sent';

  const guests = await Guest.find(guestFilter);
  const results = { sent: 0, failed: 0, errors: [] };

  for (const guest of guests) {
    try {
      if (contentSid && !customMessage) {
        await sendTwilioWhatsAppWithTemplate(guest.phone, guest, event, settings);
      } else {
        const accountSid = settings?.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID;
        const authToken  = settings?.twilioAuthToken  || process.env.TWILIO_AUTH_TOKEN;
        const rawFrom    = settings?.twilioWhatsappFrom || process.env.TWILIO_WHATSAPP_FROM || '';
        const from       = rawFrom.startsWith('whatsapp:') ? rawFrom.replace(/\s/g,'') : `whatsapp:+${rawFrom.replace(/\D/g,'')}`;
        const template   = customMessage || settings?.defaultWhatsappTemplate || 'Dear {guestName}, You are invited to *{eventName}*. Confirm: {confirmUrl}';
        const message    = interpolateTemplate(template, guest, event);
        const cleanPhone = guest.phone.replace(/\D/g, '');
        const client     = twilio(accountSid, authToken);
        await client.messages.create({ from, to: `whatsapp:+${cleanPhone}`, body: message });
      }
      guest.messageStatus = 'whatsapp_sent';
      guest.messageChannel = 'whatsapp';
      guest.messageSentAt = new Date();
      await guest.save({ validateBeforeSave: false });
      results.sent++;

      // Delay 1.2s between messages to avoid Twilio rate limits
      if (results.sent < guests.length) {
        await new Promise(r => setTimeout(r, 1200));
      }
    } catch (err) {
      results.failed++;
      results.errors.push({ guest: guest.guestName, error: err.message });
    }
  }

  await logActivity({
    event: eventId,
    action: 'send_bulk_whatsapp',
    description: `Bulk WhatsApp: ${results.sent} sent, ${results.failed} failed`,
    metadata: results,
    req,
  });

  res.json({ success: true, ...results });
});

exports.getInvitationStats = asyncHandler(async (req, res) => {
  const { eventId } = req.params;

  const [total, smsSent, whatsappSent, notSent, delivered, failed] = await Promise.all([
    Guest.countDocuments({ event: eventId, isDeleted: false }),
    Guest.countDocuments({ event: eventId, isDeleted: false, messageChannel: 'sms' }),
    Guest.countDocuments({ event: eventId, isDeleted: false, messageChannel: 'whatsapp' }),
    Guest.countDocuments({ event: eventId, isDeleted: false, messageStatus: 'not_sent' }),
    Guest.countDocuments({ event: eventId, isDeleted: false, messageStatus: 'delivered' }),
    Guest.countDocuments({ event: eventId, isDeleted: false, messageStatus: 'failed' }),
  ]);

  res.json({ success: true, stats: { total, smsSent, whatsappSent, notSent, delivered, failed } });
});

// ─────────────────────────────────────────────────────────────────
// INSPECT TWILIO TEMPLATE — fetch variable structure from Twilio
// ─────────────────────────────────────────────────────────────────
exports.inspectTemplate = asyncHandler(async (req, res) => {
  const settings = await Settings.findOne();
  const accountSid = settings?.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID;
  const authToken  = settings?.twilioAuthToken  || process.env.TWILIO_AUTH_TOKEN;
  const contentSid = process.env.TWILIO_CONTENT_SID || 'HX9e7d3b8a1f973c95c208541772e9d9a9';

  if (!accountSid || !authToken) {
    return res.status(400).json({ success: false, message: 'Twilio credentials not configured.' });
  }

  try {
    const client = twilio(accountSid, authToken);
    const content = await client.content.v1.contents(contentSid).fetch();
    res.json({
      success: true,
      template: {
        sid: content.sid,
        friendlyName: content.friendlyName,
        language: content.language,
        types: content.types,
        variables: content.variables || {},
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: `Failed to fetch template: ${err.message}`,
      code: err.code || null,
    });
  }
});

// ─────────────────────────────────────────────────────────────────
// TEST WHATSAPP — sandbox proof-of-concept
// ─────────────────────────────────────────────────────────────────
exports.testWhatsApp = asyncHandler(async (req, res) => {
  const settings = await Settings.findOne();

  const contentSid = process.env.TWILIO_CONTENT_SID || 'HX9e7d3b8a1f973c95c208541772e9d9a9';
  const testTo     = process.env.TWILIO_TEST_TO;

  if (!testTo) {
    return res.status(400).json({
      success: false,
      message: 'TWILIO_TEST_TO not set in .env — add: TWILIO_TEST_TO=whatsapp:+255XXXXXXXXX',
    });
  }

  // Sample test data — mirrors real guest/event data
  const testData = {
    guestName:        req.body.guestName        || 'James',
    eventName:        req.body.eventName        || 'James & Anna Wedding',
    date:             req.body.date             || '25 December 2026',
    venue:            req.body.venue            || 'Golden Tulip Dar es Salaam',
    dressCode:        req.body.dressCode        || 'White and Black',
    confirmUrl:       req.body.confirmUrl       || 'https://example.com/invite/test123',
    verificationCode: req.body.verificationCode || 'CP7821',
  };

  // ContentVariables: Twilio templates use {{1}}, {{2}} etc.
  // The cardpro_invitation template (Swahili) variables mapped in order:
  // {{1}} = guestName, {{2}} = eventName, {{3}} = date,
  // {{4}} = venue, {{5}} = dressCode, {{6}} = confirmUrl, {{7}} = verificationCode
  // NOTE: If template has fewer variables, unused ones are ignored by Twilio.
  const contentVariables = {
    '1': testData.guestName,
    '2': testData.eventName,
    '3': testData.date,
    '4': testData.venue,
    '5': testData.dressCode,
    '6': testData.confirmUrl,
    '7': testData.verificationCode,
  };

  let messageSid, status, errorMsg, twilioCode;

  try {
    const result = await sendTwilioWhatsAppTemplate({
      to: testTo,
      contentSid,
      contentVariables,
      settings,
    });

    messageSid = result.sid;
    status = result.status;

    // Log success (no credentials logged)
    await logActivity({
      action: 'test_whatsapp',
      description: `WhatsApp test sent to ${testTo.replace(/\d{6}$/, '******')} — SID: ${messageSid} — Status: ${status}`,
    });

    res.json({
      success: true,
      message: 'WhatsApp invitation sent successfully via Twilio Sandbox.',
      messageSid,
      status,
      sentTo: testTo.replace(/\d{6}$/, '******'), // mask last 6 digits
      contentSid,
      testData,
    });

  } catch (err) {
    // Safe error — never expose auth token
    twilioCode = err.code || null;
    errorMsg = err.message || 'Unknown Twilio error';

    // Remove any potential credential leaks from error message
    errorMsg = errorMsg.replace(/AC[a-f0-9]{32}/gi, '[ACCOUNT_SID]');
    errorMsg = errorMsg.replace(/[a-f0-9]{32}/gi, (m) => m.length === 32 ? '[TOKEN]' : m);

    await logActivity({
      action: 'test_whatsapp_failed',
      description: `WhatsApp test FAILED — Code: ${twilioCode} — ${errorMsg}`,
    });

    res.status(500).json({
      success: false,
      message: errorMsg,
      twilioCode,
      troubleshoot: getTroubleshootHint(twilioCode, errorMsg),
    });
  }
});

// Helper: human-readable troubleshooting hints for common Twilio errors
const getTroubleshootHint = (code, message) => {
  if (code === 20003) return 'Authentication failed. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in Settings.';
  if (code === 20404) return 'Content SID not found. Verify TWILIO_CONTENT_SID is correct.';
  if (code === 63016) return 'The recipient has not joined the WhatsApp Sandbox. Ask them to send "join <sandbox-word>" to +14155238886.';
  if (code === 63032) return 'Template not approved or variables mismatch. Check the template variables in Twilio Console.';
  if (code === 21211) return 'Invalid "To" phone number format. TWILIO_TEST_TO must be: whatsapp:+255XXXXXXXXX';
  if (code === 21608) return 'The number is not enabled for WhatsApp. Make sure the recipient joined the sandbox.';
  if (!code && message?.includes('credentials')) return 'Twilio credentials are empty. Fill TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in Settings.';
  return 'Check Twilio Console logs at console.twilio.com for details.';
};
