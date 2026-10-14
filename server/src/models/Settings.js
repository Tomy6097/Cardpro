const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  companyName: { type: String, default: 'Cardpro' },
  logo: {
    url: String,
    publicId: String,
  },
  contactPhone: { type: String, default: '' },
  contactEmail: { type: String, default: '' },
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
  
  // ✅ NEW: Support for multiple WhatsApp templates
  whatsappTemplates: [{
    name: { type: String, required: true },        // e.g., "Wedding Invitation V1"
    contentSid: { type: String, required: true },  // Twilio Content SID
    description: String,                           // Optional description
    isActive: { type: Boolean, default: false },   // Which template is currently active
    createdAt: { type: Date, default: Date.now },
  }],
  
  // Selected template (fallback to TWILIO_CONTENT_SID from .env if not set)
  selectedWhatsappTemplateSid: String,
}, { timestamps: true });

module.exports = mongoose.model('Settings', settingsSchema);
