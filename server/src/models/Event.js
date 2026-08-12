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
    url: { type: String },
    publicId: { type: String },
    qrPosition: {
      type: { x: Number, y: Number },
      default: () => ({ x: 70, y: 70 }),
    },
    qrSize: { type: Number, default: 150 },
    guestNamePosition: {
      type: { x: Number, y: Number },
      default: () => ({ x: 50, y: 85 }),
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

  // Website Theme Customization
  websiteTheme: {
    primaryColor: { type: String, default: '#C9A84C' },
    bgColor: { type: String, default: '#1A0A00' },
    accentColor: { type: String, default: '#FFFFFF' },
    fontStyle: { type: String, default: 'serif' },
  },

  // RSVP Deadline — guests cannot confirm/decline after this date
  rsvpDeadline: { type: Date, default: null },

  // Dress Code Images
  dressCodeImages: [{
    url: { type: String },
    publicId: { type: String },
    caption: { type: String },
    gender: { type: String, enum: ['male', 'female', 'general'], default: 'general' },
  }],

  // Dress Code Colors
  dressCodeColors: [{
    name: { type: String },
    hex: { type: String },
  }],

  // Event/Wedding Photos (bridegroom, venue etc)
  eventPhotos: [{
    url: { type: String },
    publicId: { type: String },
    caption: { type: String },
  }],

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
