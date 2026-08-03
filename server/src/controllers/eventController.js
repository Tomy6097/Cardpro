const Event = require('../models/Event');
const Guest = require('../models/Guest');
const { logActivity } = require('../utils/activityLogger');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');
const { asyncHandler } = require('../middleware/errorHandler');

exports.createEvent = asyncHandler(async (req, res) => {
  const {
    name, clientName, date, time, venue, description,
    securityPin, dressCode, googleMapsUrl,
  } = req.body;

  const event = await Event.create({
    name, clientName, date, time, venue, description,
    securityPin, dressCode, googleMapsUrl,
    createdBy: req.user._id,
  });

  await logActivity({
    event: event._id,
    action: 'create_event',
    description: `Event "${event.name}" created`,
    req,
  });

  res.status(201).json({ success: true, event });
});

exports.getEvents = asyncHandler(async (req, res) => {
  const { status, search, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (status) filter.status = status;
  if (search) filter.$or = [
    { name: { $regex: search, $options: 'i' } },
    { clientName: { $regex: search, $options: 'i' } },
    { venue: { $regex: search, $options: 'i' } },
  ];

  const skip = (Number(page) - 1) * Number(limit);
  const [events, total] = await Promise.all([
    Event.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).populate('createdBy', 'username fullName'),
    Event.countDocuments(filter),
  ]);

  res.json({
    success: true,
    events,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) },
  });
});

exports.getEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id).populate('createdBy', 'username fullName');
  if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });
  res.json({ success: true, event });
});

exports.updateEvent = asyncHandler(async (req, res) => {
  const event = await Event.findByIdAndUpdate(req.params.id, req.body, {
    new: true, runValidators: true,
  });
  if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

  await logActivity({
    event: event._id,
    action: 'update_event',
    description: `Event "${event.name}" updated`,
    req,
  });

  res.json({ success: true, event });
});

exports.deleteEvent = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

  // Soft-delete approach: mark as cancelled or hard delete
  await Event.findByIdAndDelete(req.params.id);
  await Guest.deleteMany({ event: req.params.id });

  await logActivity({
    action: 'delete_event',
    description: `Event "${event.name}" deleted`,
    req,
  });

  res.json({ success: true, message: 'Event deleted successfully.' });
});

exports.uploadTemplate = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }

  // Delete old template
  if (event.cardTemplate?.publicId) {
    await deleteFromCloudinary(event.cardTemplate.publicId);
  }

  const result = await uploadToCloudinary(req.file.buffer, {
    folder: `cardpro/events/${event._id}/templates`,
    format: 'png',
  });

  event.cardTemplate = {
    ...event.cardTemplate,
    url: result.secure_url,
    publicId: result.public_id,
  };
  await event.save();

  await logActivity({
    event: event._id,
    action: 'upload_template',
    description: `Card template uploaded for event "${event.name}"`,
    req,
  });

  res.json({ success: true, event });
});

exports.uploadVideo = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

  if (!req.file) {
    return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }

  if (event.invitationVideo?.publicId) {
    await deleteFromCloudinary(event.invitationVideo.publicId, 'video');
  }

  const result = await uploadToCloudinary(req.file.buffer, {
    folder: `cardpro/events/${event._id}/videos`,
    resource_type: 'video',
  });

  event.invitationVideo = { url: result.secure_url, publicId: result.public_id };
  await event.save();

  await logActivity({
    event: event._id,
    action: 'upload_video',
    description: `Invitation video uploaded for event "${event.name}"`,
    req,
  });

  res.json({ success: true, event });
});

exports.updateCardConfig = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

  const {
    qrPosition, qrSize, guestNamePosition, guestNameColor,
    guestNameFontSize, guestNameAlign, showQR,
  } = req.body;

  event.cardTemplate = {
    ...event.cardTemplate,
    qrPosition: qrPosition || event.cardTemplate.qrPosition,
    qrSize: qrSize || event.cardTemplate.qrSize,
    guestNamePosition: guestNamePosition || event.cardTemplate.guestNamePosition,
    guestNameColor: guestNameColor || event.cardTemplate.guestNameColor,
    guestNameFontSize: guestNameFontSize || event.cardTemplate.guestNameFontSize,
    guestNameAlign: guestNameAlign || event.cardTemplate.guestNameAlign,
    showQR: showQR !== undefined ? showQR : event.cardTemplate.showQR,
  };
  await event.save();

  res.json({ success: true, event });
});

exports.getEventStats = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

  const [total, confirmed, pending, declined, scanned, smsSent, whatsappSent] = await Promise.all([
    Guest.countDocuments({ event: event._id, isDeleted: false }),
    Guest.countDocuments({ event: event._id, isDeleted: false, rsvpStatus: 'confirmed' }),
    Guest.countDocuments({ event: event._id, isDeleted: false, rsvpStatus: 'pending' }),
    Guest.countDocuments({ event: event._id, isDeleted: false, rsvpStatus: 'declined' }),
    Guest.countDocuments({ event: event._id, isDeleted: false, scanStatus: 'scanned' }),
    Guest.countDocuments({ event: event._id, isDeleted: false, messageChannel: 'sms' }),
    Guest.countDocuments({ event: event._id, isDeleted: false, messageChannel: 'whatsapp' }),
  ]);

  // Update stats
  await Event.findByIdAndUpdate(event._id, {
    'stats.totalGuests': total,
    'stats.confirmed': confirmed,
    'stats.pending': pending,
    'stats.declined': declined,
    'stats.scanned': scanned,
    'stats.smsSent': smsSent,
    'stats.whatsappSent': whatsappSent,
  });

  res.json({
    success: true,
    stats: { total, confirmed, pending, declined, scanned, smsSent, whatsappSent },
  });
});
