const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const eventSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, unique: true, lowercase: true },
  clientName: { type: String, required: true, trim: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  venue: { type: String, required: true, trim: true },
  description: { type: String, trim: true },
  securityPin: { type: String, required: true },
  dressCode: { type: String, trim: true },
  googleMapsUrl: { type: String, trim: true },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active',
  },
  invitationVideo: {
    url: String,
    publicId: String,
  },
  coverImage: {
    url: String,
    publicId: String,
  },
  cardTemplate: {
    url: String,
    publicId: String,
    qrPosition: {
      x: { type: Number, default: 70 },
      y: { type: Number, default: 70 },
    },
    qrSize: { type: Number, default: 150 },
    guestNamePosition: {
      x: { type: Number, default: 50 },
      y: { type: Number, default: 85 },
    },
    guestNameColor: { type: String, default: '#FFFFFF' },
    guestNameFontSize: { type: Number, default: 24 },
    guestNameAlign: { type: String, default: 'center' },
    showQR: { type: Boolean, default: true },
  },
  stats: {
    totalGuests: { type: Number, default: 0 },
    confirmed: { type: Number, default: 0 },
    pending: { type: Number, default: 0 },
    declined: { type: Number, default: 0 },
    scanned: { type: Number, default: 0 },
    smsSent: { type: Number, default: 0 },
    whatsappSent: { type: Number, default: 0 },
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, { timestamps: true });

// Auto-generate slug
eventSchema.pre('validate', function (next) {
  if (!this.slug) {
    const base = this.name
      ? this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      : '';
    this.slug = `${base}-${uuidv4().split('-')[0]}`;
  }
  next();
});

eventSchema.index({ status: 1 });
eventSchema.index({ createdBy: 1 });
eventSchema.index({ date: 1 });

module.exports = mongoose.model('Event', eventSchema);
