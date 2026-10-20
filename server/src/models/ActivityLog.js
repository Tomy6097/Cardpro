const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({
  event: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    default: null,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  userName: String,
  action: {
    type: String,
    required: true,
    enum: [
      'login', 'logout',
      'create_event', 'update_event', 'delete_event',
      'add_guest', 'import_guests', 'update_guest', 'delete_guest', 'restore_guest', 'delete_all_guests', 'restore_all_guests',
      'generate_qr', 'generate_card', 'generate_all_cards',
      'send_sms', 'send_whatsapp', 'send_bulk_sms', 'send_bulk_whatsapp',
      'scan_entry', 'scan_duplicate', 'scan_invalid',
      'rsvp_confirm', 'rsvp_decline',
      'download_pdf', 'download_csv',
      'update_settings', 'create_scanner', 'delete_scanner',
      'upload_template', 'upload_video', 'delete_video',
      'test_whatsapp', 'test_whatsapp_failed',
      'cleanup_logs', 'reset_scan',
    ],
  },
  description: String,
  metadata: { type: mongoose.Schema.Types.Mixed },
  ipAddress: String,
  userAgent: String,
}, { timestamps: true });

activityLogSchema.index({ event: 1, createdAt: -1 });
activityLogSchema.index({ user: 1, createdAt: -1 });
activityLogSchema.index({ action: 1 });
activityLogSchema.index({ createdAt: -1 });

// TTL Index — auto-delete logs older than 30 days
// MongoDB background job runs every ~60 seconds and deletes expired docs
activityLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 }); // 30 days

module.exports = mongoose.model('ActivityLog', activityLogSchema);
