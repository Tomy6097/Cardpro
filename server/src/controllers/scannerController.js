const Guest = require('../models/Guest');
const Event = require('../models/Event');
const { logActivity } = require('../utils/activityLogger');
const { verifyQRToken } = require('../utils/qrGenerator');
const { asyncHandler } = require('../middleware/errorHandler');

const TICKET_CAPACITY = { Single: 1, Double: 2, VIP: 1, VVIP: 1, Family: 4, Child: 1 };

exports.scanQR = asyncHandler(async (req, res) => {
  const { token, eventId } = req.body;

  if (!token || !eventId) {
    return res.status(400).json({ success: false, message: 'QR token and event ID are required.' });
  }

  // Verify scanner has access to this event
  const scanner = req.user;
  if (scanner.role === 'scanner' && !scanner.assignedEvents.map(e => e.toString()).includes(eventId)) {
    return res.status(403).json({ success: false, message: 'Not authorized for this event.' });
  }

  // Find guest by qrToken OR verificationCode (flexible matching)
  let guest = await Guest.findOne({ qrToken: token, event: eventId, isDeleted: false });

  // If not found by qrToken, try verificationCode
  if (!guest) {
    guest = await Guest.findOne({
      verificationCode: token.toUpperCase(),
      event: eventId,
      isDeleted: false,
    });
  }

  // If still not found, try partial token match (in case of URL encoding)
  if (!guest) {
    const tokenPart = token.split('.')[0]; // get base64 part before signature
    if (tokenPart && tokenPart.length > 10) {
      const allGuests = await Guest.find({ event: eventId, isDeleted: false }).select('qrToken guestName');
      guest = allGuests.find(g => g.qrToken && (g.qrToken === token || g.qrToken.startsWith(tokenPart)));
      if (guest) guest = await Guest.findById(guest._id);
    }
  }

  if (!guest) {
    // Try to verify the token structure
    const decoded = verifyQRToken(token);
    if (!decoded || decoded.eventId !== eventId) {
      await logActivity({
        event: eventId,
        user: scanner._id,
        userName: scanner.username,
        action: 'scan_invalid',
        description: 'Invalid QR code scanned',
        req,
      });
      return res.status(200).json({
        success: false,
        status: 'invalid',
        message: 'Invalid QR Code. This code does not belong to this event.',
        debug: process.env.NODE_ENV !== 'production' ? { tokenReceived: token?.substring(0, 30) + '...' } : undefined,
      });
    }

    return res.status(200).json({
      success: false,
      status: 'invalid',
      message: 'Guest not found for this QR code.',
    });
  }

  const capacity = TICKET_CAPACITY[guest.ticketType] || 1;

  // Check if fully used
  if (guest.scanCount >= capacity) {
    await logActivity({
      event: eventId,
      user: scanner._id,
      userName: scanner.username,
      action: 'scan_duplicate',
      description: `Duplicate scan for guest "${guest.guestName}"`,
      metadata: { guestId: guest._id, scanCount: guest.scanCount },
      req,
    });

    guest.scanStatus = 'duplicate_scan';
    await guest.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: false,
      status: 'duplicate',
      message: `Already Fully Used. This ${guest.ticketType} ticket has been used ${guest.scanCount} time(s).`,
      guest: {
        guestName: guest.guestName,
        ticketType: guest.ticketType,
        scanCount: guest.scanCount,
        firstScannedAt: guest.scanHistory[0]?.scannedAt,
        firstScannedBy: guest.scanHistory[0]?.scannerName,
      },
    });
  }

  // Allow entry
  const entryNumber = guest.scanCount + 1;
  const remaining = capacity - entryNumber;

  guest.scanCount = entryNumber;
  guest.remainingEntries = remaining;
  guest.scanStatus = 'scanned';
  guest.scanHistory.push({
    scannedAt: new Date(),
    scannedBy: scanner._id,
    scannerName: scanner.fullName || scanner.username,
    entryNumber,
  });

  await guest.save({ validateBeforeSave: false });

  await logActivity({
    event: eventId,
    user: scanner._id,
    userName: scanner.username,
    action: 'scan_entry',
    description: `Entry allowed for guest "${guest.guestName}" (Entry ${entryNumber}/${capacity})`,
    metadata: { guestId: guest._id, entryNumber, remaining },
    req,
  });

  return res.status(200).json({
    success: true,
    status: 'allowed',
    message: `Entry Allowed. Welcome, ${guest.guestName}!`,
    guest: {
      guestName: guest.guestName,
      ticketType: guest.ticketType,
      ticketLabel: guest.ticketLabel,
      entryNumber,
      remaining,
      capacity,
      rsvpStatus: guest.rsvpStatus,
    },
  });
});

exports.searchGuest = asyncHandler(async (req, res) => {
  const { query, eventId } = req.query;

  if (!query || !eventId) {
    return res.status(400).json({ success: false, message: 'Query and event ID are required.' });
  }

  const scanner = req.user;
  if (scanner.role === 'scanner' && !scanner.assignedEvents.map(e => e.toString()).includes(eventId)) {
    return res.status(403).json({ success: false, message: 'Not authorized for this event.' });
  }

  const guests = await Guest.find({
    event: eventId,
    isDeleted: false,
    $or: [
      { guestName: { $regex: query, $options: 'i' } },
      { phone: { $regex: query, $options: 'i' } },
      { verificationCode: query.toUpperCase() },
    ],
  }).limit(20);

  res.json({ success: true, guests });
});

exports.getLiveStats = asyncHandler(async (req, res) => {
  const { eventId } = req.params;

  const scanner = req.user;
  if (scanner.role === 'scanner' && !scanner.assignedEvents.map(e => e.toString()).includes(eventId)) {
    return res.status(403).json({ success: false, message: 'Not authorized for this event.' });
  }

  const [total, scanned, confirmed, pending] = await Promise.all([
    Guest.countDocuments({ event: eventId, isDeleted: false }),
    Guest.countDocuments({ event: eventId, isDeleted: false, scanStatus: 'scanned' }),
    Guest.countDocuments({ event: eventId, isDeleted: false, rsvpStatus: 'confirmed' }),
    Guest.countDocuments({ event: eventId, isDeleted: false, rsvpStatus: 'pending' }),
  ]);

  res.json({
    success: true,
    stats: {
      total,
      entered: scanned,
      remaining: total - scanned,
      confirmed,
      pending,
    },
  });
});

exports.getScannerEvents = asyncHandler(async (req, res) => {
  const user = req.user;
  let events;

  if (user.role === 'admin') {
    const Event = require('../models/Event');
    events = await Event.find({ status: 'active' }).select('name slug date time venue status').sort({ date: 1 });
  } else {
    const Event = require('../models/Event');
    events = await Event.find({
      _id: { $in: user.assignedEvents },
      status: 'active',
    }).select('name slug date time venue status').sort({ date: 1 });
  }

  res.json({ success: true, events });
});
