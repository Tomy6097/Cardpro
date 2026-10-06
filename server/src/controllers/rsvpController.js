const Guest = require('../models/Guest');
const Event = require('../models/Event');
const { logActivity } = require('../utils/activityLogger');
const { asyncHandler } = require('../middleware/errorHandler');

exports.confirmRSVP = asyncHandler(async (req, res) => {
  const { verificationCode } = req.params;

  const guest = await Guest.findOne({ verificationCode, isDeleted: false }).populate('event');
  if (!guest) return res.status(404).json({ success: false, message: 'Invalid verification code.' });

  // Check RSVP deadline
  if (guest.event?.rsvpDeadline && new Date() > new Date(guest.event.rsvpDeadline)) {
    return res.status(400).json({
      success: false,
      message: 'Muda wa kuthibitisha mahudhurio umepita. Tafadhali wasiliana na mpangaji wa tukio.',
      deadlinePassed: true,
    });
  }

  if (guest.rsvpStatus === 'confirmed') {
    return res.json({
      success: true,
      message: 'Your attendance is already confirmed!',
      guest: { guestName: guest.guestName, rsvpStatus: guest.rsvpStatus },
      event: guest.event,
    });
  }

  guest.rsvpStatus = 'confirmed';
  guest.rsvpAt = new Date();
  await guest.save({ validateBeforeSave: false });

  await logActivity({
    event: guest.event._id,
    action: 'rsvp_confirm',
    description: `Guest "${guest.guestName}" confirmed attendance`,
    req,
  });

  res.json({
    success: true,
    message: 'Attendance confirmed successfully! We look forward to seeing you.',
    guest: {
      guestName: guest.guestName,
      rsvpStatus: guest.rsvpStatus,
      ticketType: guest.ticketType,
      qrCodeUrl: guest.qrCodeUrl,
      verificationCode: guest.verificationCode,
    },
    event: {
      name: guest.event.name,
      date: guest.event.date,
      time: guest.event.time,
      venue: guest.event.venue,
      dressCode: guest.event.dressCode,
      googleMapsUrl: guest.event.googleMapsUrl,
    },
  });
});

exports.declineRSVP = asyncHandler(async (req, res) => {
  const { verificationCode } = req.params;
  const { reason } = req.body;

  const guest = await Guest.findOne({ verificationCode, isDeleted: false }).populate('event');
  if (!guest) return res.status(404).json({ success: false, message: 'Invalid verification code.' });

  // Check RSVP deadline
  if (guest.event?.rsvpDeadline && new Date() > new Date(guest.event.rsvpDeadline)) {
    return res.status(400).json({
      success: false,
      message: 'Muda wa kuthibitisha mahudhurio umepita.',
      deadlinePassed: true,
    });
  }

  guest.rsvpStatus = 'declined';
  guest.rsvpAt = new Date();
  if (reason && reason.trim()) {
    guest.declineReason = reason.trim();
  }
  await guest.save({ validateBeforeSave: false });

  await logActivity({
    event: guest.event._id,
    action: 'rsvp_decline',
    description: `Guest "${guest.guestName}" declined attendance${reason ? `: "${reason.trim()}"` : ''}`,
    req,
  });

  res.json({ success: true, message: 'You have declined the invitation.' });
});

exports.getRSVPStats = asyncHandler(async (req, res) => {
  const { eventId } = req.params;

  const [total, confirmed, pending, declined] = await Promise.all([
    Guest.countDocuments({ event: eventId, isDeleted: false }),
    Guest.countDocuments({ event: eventId, isDeleted: false, rsvpStatus: 'confirmed' }),
    Guest.countDocuments({ event: eventId, isDeleted: false, rsvpStatus: 'pending' }),
    Guest.countDocuments({ event: eventId, isDeleted: false, rsvpStatus: 'declined' }),
  ]);

  const confirmedPct = total > 0 ? Math.round((confirmed / total) * 100) : 0;
  const pendingPct = total > 0 ? Math.round((pending / total) * 100) : 0;
  const declinedPct = total > 0 ? Math.round((declined / total) * 100) : 0;

  res.json({
    success: true,
    stats: {
      total, confirmed, pending, declined,
      confirmedPct, pendingPct, declinedPct,
    },
  });
});

// Count new RSVPs (confirmed + declined) in last 24 hours — for sidebar notification badge
exports.getRecentRSVPCount = asyncHandler(async (req, res) => {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const newCount = await Guest.countDocuments({
    isDeleted: false,
    rsvpStatus: { $in: ['confirmed', 'declined'] },
    rsvpAt: { $gte: since },
  });
  res.json({ success: true, newCount });
});

// Per-event notifications — new RSVPs and messages since last check
exports.getEventNotifications = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000); // last 48h

  const [newConfirmed, newDeclined, newMessages] = await Promise.all([
    Guest.countDocuments({ event: eventId, isDeleted: false, rsvpStatus: 'confirmed', rsvpAt: { $gte: since } }),
    Guest.countDocuments({ event: eventId, isDeleted: false, rsvpStatus: 'declined', rsvpAt: { $gte: since } }),
    Guest.countDocuments({ event: eventId, isDeleted: false, guestMessage: { $nin: [null, '', undefined] }, messageAt: { $gte: since } }),
  ]);

  res.json({
    success: true,
    rsvp: newConfirmed + newDeclined,
    messages: newMessages,
    total: newConfirmed + newDeclined + newMessages,
  });
});

// All events notifications — returns { eventId: { rsvp, messages, total } }
exports.getAllEventNotifications = asyncHandler(async (req, res) => {
  const since = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const Event = require('../models/Event');

  // Get all active events
  const events = await Event.find({ status: 'active' }).select('_id name').lean();

  const results = {};
  let grandTotal = 0;

  for (const ev of events) {
    const [rsvp, msgs] = await Promise.all([
      Guest.countDocuments({ event: ev._id, isDeleted: false, rsvpStatus: { $in: ['confirmed', 'declined'] }, rsvpAt: { $gte: since } }),
      Guest.countDocuments({ event: ev._id, isDeleted: false, guestMessage: { $nin: [null, '', undefined] }, messageAt: { $gte: since } }),
    ]);
    if (rsvp > 0 || msgs > 0) {
      results[ev._id] = { rsvp, messages: msgs, total: rsvp + msgs, name: ev.name };
      grandTotal += rsvp + msgs;
    }
  }

  res.json({ success: true, events: results, grandTotal });
});

// Save guest congratulation message
exports.saveGuestMessage = asyncHandler(async (req, res) => {
  const { verificationCode } = req.params;
  const { message } = req.body;
  const guest = await Guest.findOne({ verificationCode, isDeleted: false });
  if (!guest) return res.status(404).json({ success: false, message: 'Invalid code.' });
  guest.guestMessage = message?.trim()?.substring(0, 500) || '';
  guest.messageAt = new Date();
  await guest.save({ validateBeforeSave: false });
  res.json({ success: true });
});
