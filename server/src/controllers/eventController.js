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

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return res.status(503).json({
      success: false,
      message: 'Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET in your Render environment variables.',
    });
  }

  if (event.cardTemplate?.publicId) {
    await deleteFromCloudinary(event.cardTemplate.publicId);
  }

  const result = await uploadToCloudinary(req.file.buffer, {
    folder: `cardpro/events/${event._id}/templates`,
    format: 'png',
  });

  // Use $set with dot notation to avoid undefined nested object issue
  const updatedEvent = await Event.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        'cardTemplate.url': result.secure_url,
        'cardTemplate.publicId': result.public_id,
        'cardTemplate.qrPosition': event.cardTemplate?.qrPosition || { x: 70, y: 70 },
        'cardTemplate.qrSize': event.cardTemplate?.qrSize || 150,
        'cardTemplate.guestNamePosition': event.cardTemplate?.guestNamePosition || { x: 50, y: 85 },
        'cardTemplate.guestNameColor': event.cardTemplate?.guestNameColor || '#FFFFFF',
        'cardTemplate.guestNameFontSize': event.cardTemplate?.guestNameFontSize || 24,
        'cardTemplate.guestNameAlign': event.cardTemplate?.guestNameAlign || 'center',
        'cardTemplate.showQR': event.cardTemplate?.showQR !== undefined ? event.cardTemplate.showQR : true,
      },
    },
    { new: true, runValidators: false }
  );

  await logActivity({
    event: event._id,
    action: 'upload_template',
    description: `Card template uploaded for event "${event.name}"`,
    req,
  });

  res.json({ success: true, event: updatedEvent });
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

  event.invitationVideo = {
    url: result.secure_url,
    publicId: result.public_id,
    caption: req.body.caption || '',
  };
  await event.save();

  await logActivity({
    event: event._id,
    action: 'upload_video',
    description: `Invitation video uploaded for event "${event.name}"`,
    req,
  });

  res.json({ success: true, event });
});

exports.deleteVideo = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

  if (event.invitationVideo?.publicId) {
    await deleteFromCloudinary(event.invitationVideo.publicId, 'video');
  }

  event.invitationVideo = undefined;
  await event.save();

  await logActivity({
    event: event._id,
    action: 'delete_video',
    description: `Invitation video deleted for event "${event.name}"`,
    req,
  });

  res.json({ success: true, message: 'Video deleted.' });
});

exports.updateCardConfig = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

  const {
    qrPosition, qrSize, guestNamePosition, guestNameColor,
    guestNameFontSize, guestNameAlign, showQR,
  } = req.body;

  const updatedEvent = await Event.findByIdAndUpdate(
    req.params.id,
    {
      $set: {
        'cardTemplate.qrPosition': (qrPosition && typeof qrPosition === 'object')
          ? { x: Number(qrPosition.x) || 70, y: Number(qrPosition.y) || 70 }
          : (event.cardTemplate?.qrPosition || { x: 70, y: 70 }),
        'cardTemplate.qrSize': qrSize !== undefined ? Number(qrSize) : (event.cardTemplate?.qrSize || 150),
        'cardTemplate.guestNamePosition': (guestNamePosition && typeof guestNamePosition === 'object')
          ? { x: Number(guestNamePosition.x) || 50, y: Number(guestNamePosition.y) || 85 }
          : (event.cardTemplate?.guestNamePosition || { x: 50, y: 85 }),
        'cardTemplate.guestNameColor': guestNameColor || event.cardTemplate?.guestNameColor || '#FFFFFF',
        'cardTemplate.guestNameFontSize': guestNameFontSize !== undefined ? Number(guestNameFontSize) : (event.cardTemplate?.guestNameFontSize || 24),
        'cardTemplate.guestNameAlign': guestNameAlign || event.cardTemplate?.guestNameAlign || 'center',
        'cardTemplate.showQR': showQR !== undefined ? Boolean(showQR) : (event.cardTemplate?.showQR !== undefined ? event.cardTemplate.showQR : true),
      },
    },
    { new: true, runValidators: false }
  );

  res.json({ success: true, event: updatedEvent });
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

exports.updateWebsiteTheme = asyncHandler(async (req, res) => {
  const { primaryColor, bgColor, accentColor, fontStyle } = req.body;
  const event = await Event.findByIdAndUpdate(
    req.params.id,
    { $set: { 'websiteTheme.primaryColor': primaryColor, 'websiteTheme.bgColor': bgColor, 'websiteTheme.accentColor': accentColor, 'websiteTheme.fontStyle': fontStyle } },
    { new: true, runValidators: false }
  );
  if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });
  res.json({ success: true, event });
});

exports.updateDressCodeColors = asyncHandler(async (req, res) => {
  const { colors } = req.body; // array of {name, hex}
  const event = await Event.findByIdAndUpdate(
    req.params.id,
    { $set: { dressCodeColors: colors } },
    { new: true, runValidators: false }
  );
  if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });
  res.json({ success: true, event });
});

exports.uploadDressCodeImage = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

  const result = await uploadToCloudinary(req.file.buffer, {
    folder: `cardpro/events/${event._id}/dresscode`,
    format: 'jpg',
    transformation: [{ quality: 'auto:good', width: 800 }],
  });

  event.dressCodeImages.push({
    url: result.secure_url,
    publicId: result.public_id,
    caption: req.body.caption || '',
    gender: req.body.gender || 'general',
  });
  await event.save();
  res.json({ success: true, event });
});

exports.deleteDressCodeImage = asyncHandler(async (req, res) => {
  const { id, imageId } = req.params;
  const event = await Event.findById(id);
  if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

  const img = event.dressCodeImages.id(imageId);
  if (img?.publicId) await deleteFromCloudinary(img.publicId);
  event.dressCodeImages.pull(imageId);
  await event.save();
  res.json({ success: true, event });
});

exports.uploadEventPhoto = asyncHandler(async (req, res) => {
  const event = await Event.findById(req.params.id);
  if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

  const result = await uploadToCloudinary(req.file.buffer, {
    folder: `cardpro/events/${event._id}/photos`,
    format: 'jpg',
    transformation: [{ quality: 'auto:good', width: 1200, crop: 'limit' }],
  });

  event.eventPhotos.push({
    url: result.secure_url,
    publicId: result.public_id,
    caption: req.body.caption || '',
  });
  await event.save();
  res.json({ success: true, event });
});

exports.deleteEventPhoto = asyncHandler(async (req, res) => {
  const { id, photoId } = req.params;
  const event = await Event.findById(id);
  if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

  const photo = event.eventPhotos.id(photoId);
  if (photo?.publicId) await deleteFromCloudinary(photo.publicId);
  event.eventPhotos.pull(photoId);
  await event.save();
  res.json({ success: true, event });
});
