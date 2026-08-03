const Guest = require('../models/Guest');
const Event = require('../models/Event');
const { logActivity } = require('../utils/activityLogger');
const { asyncHandler } = require('../middleware/errorHandler');

exports.confirmRSVP = asyncHandler(async (req, res) => {
  const { verificationCode } = req.params;

  const guest = await Guest.findOne({ verificationCode, isDeleted: false }).populate('event');
  if (!guest) return res.status(404).json({ success: false, message: 'Invalid verification code.' });

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

  const guest = await Guest.findOne({ verificationCode, isDeleted: false }).populate('event');
  if (!guest) return res.status(404).json({ success: false, message: 'Invalid verification code.' });

  guest.rsvpStatus = 'declined';
  guest.rsvpAt = new Date();
  await guest.save({ validateBeforeSave: false });

  await logActivity({
    event: guest.event._id,
    action: 'rsvp_decline',
    description: `Guest "${guest.guestName}" declined attendance`,
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
