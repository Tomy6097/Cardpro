const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  companyName: { type: String, default: 'Cardpro' },
  logo: {
    url: String,
    publicId: String,
  },
  senderIdSms: { type: String, default: 'CARDPRO' },
  twilioAccountSid: String,
  twilioAuthToken: String,
  twilioWhatsappFrom: String,
  beemApiKey: String,
  beemSecretKey: String,
  beemSenderId: { type: String, default: 'CARDPRO' },
  cloudinaryCloudName: String,
  cloudinaryApiKey: String,
  cloudinaryApiSecret: String,
  defaultSmsTemplate: {
    type: String,
    default: 'Dear {guestName},\n\nYou are cordially invited to {eventName} on {date} at {venue}.\n\nConfirm attendance: {confirmUrl}',
  },
  defaultWhatsappTemplate: {
    type: String,
    default: 'Dear {guestName},\n\nYou are cordially invited to *{eventName}*\n\nDate: {date}\nVenue: {venue}\n\nClick to confirm: {confirmUrl}',
  },
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
