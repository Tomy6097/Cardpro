const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const TICKET_TYPES = ['Single', 'Double', 'VIP', 'VVIP', 'Family', 'Child'];
const TICKET_CAPACITY = { Single: 1, Double: 2, VIP: 1, VVIP: 1, Family: 4, Child: 1 };

const scanSchema = new mongoose.Schema({
  scannedAt: { type: Date, default: Date.now },
  scannedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  scannerName: String,
  location: String,
  entryNumber: Number,
}, { _id: false });

const guestSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
  },
  guestName: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  email: { type: String, trim: true, lowercase: true },
  ticketType: {
    type: String,
    enum: TICKET_TYPES,
    default: 'Single',
  },
  ticketLabel: { type: String },
  verificationCode: {
    type: String,
    index: { unique: true, sparse: true },
  },
  qrToken: { type: String, index: { sparse: true } },
  qrCodeUrl: { type: String },
  cardUrl: { type: String },
  cardPublicId: { type: String },

  // RSVP
  rsvpStatus: {
    type: String,
    enum: ['pending', 'confirmed', 'declined'],
    default: 'pending',
  },
  rsvpAt: Date,
  declineReason: { type: String, trim: true, default: '' },

  // Messaging
  messageStatus: {
    type: String,
    enum: ['not_sent', 'sms_sent', 'whatsapp_sent', 'delivered', 'pending', 'failed'],
    default: 'not_sent',
  },
  messageChannel: {
    type: String,
    enum: ['sms', 'whatsapp', null],
    default: null,
  },
  messageSentAt: Date,

  // Scanner
  scanStatus: {
    type: String,
    enum: ['not_scanned', 'scanned', 'duplicate_scan', 'invalid'],
    default: 'not_scanned',
  },
  scanHistory: [scanSchema],
  scanCount: { type: Number, default: 0 },
  remainingEntries: { type: Number },

  isDeleted: { type: Boolean, default: false },
  deletedAt: Date,
  notes: String,
  tableNumber: String,
  seatNumber: String,
}, { timestamps: true });

// Pre-save: generate verification code, token, set ticket label, remaining entries
guestSchema.pre('save', function (next) {
  if (!this.verificationCode) {
    this.verificationCode = uuidv4().replace(/-/g, '').substring(0, 12).toUpperCase();
  }
  if (!this.qrToken) {
    this.qrToken = uuidv4();
  }
  if (!this.ticketLabel) {
    this.ticketLabel = this.ticketType.toUpperCase();
  }
  if (this.remainingEntries === undefined || this.remainingEntries === null) {
    this.remainingEntries = TICKET_CAPACITY[this.ticketType] || 1;
  }
  next();
});

guestSchema.index({ event: 1, phone: 1 }, { unique: true, partialFilterExpression: { isDeleted: false } });
guestSchema.index({ event: 1, isDeleted: 1 });
guestSchema.index({ event: 1, rsvpStatus: 1 });
guestSchema.index({ event: 1, scanStatus: 1 });
guestSchema.index({ guestName: 'text' });

module.exports = mongoose.model('Guest', guestSchema);
module.exports.TICKET_TYPES = TICKET_TYPES;
module.exports.TICKET_CAPACITY = TICKET_CAPACITY;
