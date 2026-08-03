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
  const baseUrl = process.env.CLIENT_URL || '';
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

  const recipients = [{ recipient_id: 1, dest_addr: phone }];

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
    }
  );

  return response.data;
};

// --- WhatsApp via Twilio ---
const sendTwilioWhatsApp = async (phone, message, settings) => {
  const accountSid = settings?.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID;
  const authToken = settings?.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN;
  const from = settings?.twilioWhatsappFrom || process.env.TWILIO_WHATSAPP_FROM;

  const client = twilio(accountSid, authToken);
  return client.messages.create({
    from,
    to: `whatsapp:+${phone}`,
    body: message,
  });
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
  const template = customMessage || settings?.defaultWhatsappTemplate || 'Dear {guestName}, You are invited to *{eventName}*\nDate: {date}\nVenue: {venue}\nConfirm: {confirmUrl}';

  const message = interpolateTemplate(template, guest, guest.event);

  await sendTwilioWhatsApp(guest.phone, message, settings);

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
  const template = customMessage || settings?.defaultWhatsappTemplate || 'Dear {guestName}, You are invited to *{eventName}*. Confirm: {confirmUrl}';

  const guestFilter = { event: eventId, isDeleted: false };
  if (filter.rsvpStatus) guestFilter.rsvpStatus = filter.rsvpStatus;
  if (filter.notSent) guestFilter.messageStatus = 'not_sent';

  const guests = await Guest.find(guestFilter);
  const results = { sent: 0, failed: 0, errors: [] };

  for (const guest of guests) {
    try {
      const message = interpolateTemplate(template, guest, event);
      await sendTwilioWhatsApp(guest.phone, message, settings);
      guest.messageStatus = 'whatsapp_sent';
      guest.messageChannel = 'whatsapp';
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
