const csv = require('csv-parser');
const { Readable } = require('stream');
const Guest = require('../models/Guest');
const Event = require('../models/Event');
const { logActivity } = require('../utils/activityLogger');
const { generateQRToken, generateQRCodeBuffer } = require('../utils/qrGenerator');
const { uploadToCloudinary } = require('../utils/cloudinary');
const { normalizePhone } = require('../utils/phoneUtils');
const { asyncHandler } = require('../middleware/errorHandler');

const TICKET_MAP = {
  s: 'Single', single: 'Single',
  d: 'Double', double: 'Double',
  vip: 'VIP',
  vvip: 'VVIP',
  family: 'Family',
  child: 'Child',
};

const normalizeTicketType = (val) => {
  if (!val) return 'Single';
  const key = val.toString().toLowerCase().trim();
  return TICKET_MAP[key] || 'Single';
};

exports.addGuest = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const { guestName, phone, email, ticketType, tableNumber, seatNumber, notes } = req.body;

  const event = await Event.findById(eventId);
  if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    return res.status(400).json({ success: false, message: 'Invalid phone number.' });
  }

  const existing = await Guest.findOne({ event: eventId, phone: normalizedPhone, isDeleted: false });
  if (existing) {
    return res.status(400).json({ success: false, message: 'A guest with this phone number already exists in this event.' });
  }

  const guest = await Guest.create({
    event: eventId,
    guestName: guestName.trim(),
    phone: normalizedPhone,
    email,
    ticketType: normalizeTicketType(ticketType),
    tableNumber,
    seatNumber,
    notes,
  });

  await logActivity({
    event: eventId,
    action: 'add_guest',
    description: `Guest "${guest.guestName}" added to event`,
    req,
  });

  res.status(201).json({ success: true, guest });
});

exports.importGuests = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const event = await Event.findById(eventId);
  if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

  if (!req.file) return res.status(400).json({ success: false, message: 'No CSV file uploaded.' });

  const results = [];
  const errors = [];
  let rowIndex = 1;

  const stream = Readable.from(req.file.buffer.toString());

  await new Promise((resolve, reject) => {
    stream
      .pipe(csv({ mapHeaders: ({ header }) => header.toLowerCase().trim() }))
      .on('data', (row) => {
        rowIndex++;
        const guestName = row['guest name'] || row['guestname'] || row['name'] || '';
        const phone = row['phone'] || row['phone number'] || row['mobile'] || '';
        const ticketType = normalizeTicketType(row['ticket'] || row['ticket type'] || row['tickettype'] || '');
        const email = row['email'] || '';
        const tableNumber = row['table'] || row['table number'] || '';
        const notes = row['notes'] || row['note'] || '';

        if (!guestName.trim()) {
          errors.push({ row: rowIndex, reason: 'Missing guest name' });
          return;
        }

        const normalizedPhone = normalizePhone(phone);
        if (!normalizedPhone) {
          errors.push({ row: rowIndex, guestName, reason: `Invalid phone number: ${phone}` });
          return;
        }

        results.push({ guestName: guestName.trim(), phone: normalizedPhone, email, ticketType, tableNumber, notes });
      })
      .on('end', resolve)
      .on('error', reject);
  });

  if (results.length === 0) {
    return res.status(400).json({ success: false, message: 'No valid guests found in CSV.', errors });
  }

  // Check for duplicates within CSV itself
  const phoneSeen = new Set();
  const uniqueResults = [];
  for (const r of results) {
    if (phoneSeen.has(r.phone)) {
      errors.push({ guestName: r.guestName, reason: 'Duplicate phone in CSV' });
    } else {
      phoneSeen.add(r.phone);
      uniqueResults.push(r);
    }
  }

  // Get existing phones in event
  const existingGuests = await Guest.find({ event: eventId, isDeleted: false }).select('phone');
  const existingPhones = new Set(existingGuests.map(g => g.phone));

  const toInsert = [];
  for (const r of uniqueResults) {
    if (existingPhones.has(r.phone)) {
      errors.push({ guestName: r.guestName, reason: 'Phone already exists in event' });
    } else {
      toInsert.push({ ...r, event: eventId });
    }
  }

  let inserted = [];
  if (toInsert.length > 0) {
    inserted = await Guest.insertMany(toInsert, { ordered: false });
  }

  await logActivity({
    event: eventId,
    action: 'import_guests',
    description: `${inserted.length} guests imported via CSV`,
    metadata: { inserted: inserted.length, errors: errors.length },
    req,
  });

  res.json({
    success: true,
    imported: inserted.length,
    skipped: errors.length,
    errors,
    message: `${inserted.length} guests imported successfully. ${errors.length} records skipped.`,
  });
});

exports.getGuests = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const {
    search, rsvpStatus, messageStatus, scanStatus,
    ticketType, isDeleted = 'false',
    page = 1, limit = 50,
  } = req.query;

  const filter = { event: eventId, isDeleted: isDeleted === 'true' };

  if (search) {
    filter.$or = [
      { guestName: { $regex: search, $options: 'i' } },
      { phone: { $regex: search, $options: 'i' } },
      { verificationCode: { $regex: search, $options: 'i' } },
    ];
  }
  if (rsvpStatus) filter.rsvpStatus = rsvpStatus;
  if (messageStatus) filter.messageStatus = messageStatus;
  if (scanStatus) filter.scanStatus = scanStatus;
  if (ticketType) filter.ticketType = ticketType;

  const skip = (Number(page) - 1) * Number(limit);
  const [guests, total] = await Promise.all([
    Guest.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Guest.countDocuments(filter),
  ]);

  res.json({
    success: true,
    guests,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
  });
});

exports.getGuest = asyncHandler(async (req, res) => {
  const guest = await Guest.findById(req.params.id).populate('event', 'name slug date time venue');
  if (!guest) return res.status(404).json({ success: false, message: 'Guest not found.' });
  res.json({ success: true, guest });
});

exports.updateGuest = asyncHandler(async (req, res) => {
  const guest = await Guest.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!guest) return res.status(404).json({ success: false, message: 'Guest not found.' });
  res.json({ success: true, guest });
});

exports.deleteGuest = asyncHandler(async (req, res) => {
  const guest = await Guest.findById(req.params.id);
  if (!guest) return res.status(404).json({ success: false, message: 'Guest not found.' });

  guest.isDeleted = true;
  guest.deletedAt = new Date();
  await guest.save({ validateBeforeSave: false });

  await logActivity({
    event: guest.event,
    action: 'delete_guest',
    description: `Guest "${guest.guestName}" soft-deleted`,
    req,
  });

  res.json({ success: true, message: 'Guest deleted.' });
});

exports.restoreGuest = asyncHandler(async (req, res) => {
  const guest = await Guest.findById(req.params.id);
  if (!guest) return res.status(404).json({ success: false, message: 'Guest not found.' });

  // Check if phone already exists in active guests
  const conflict = await Guest.findOne({
    event: guest.event,
    phone: guest.phone,
    isDeleted: false,
    _id: { $ne: guest._id },
  });

  if (conflict) {
    return res.status(400).json({ success: false, message: 'Cannot restore: phone number already active in event.' });
  }

  guest.isDeleted = false;
  guest.deletedAt = undefined;
  await guest.save({ validateBeforeSave: false });

  await logActivity({
    event: guest.event,
    action: 'restore_guest',
    description: `Guest "${guest.guestName}" restored`,
    req,
  });

  res.json({ success: true, guest });
});

exports.deleteAllGuests = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  await Guest.updateMany({ event: eventId, isDeleted: false }, { isDeleted: true, deletedAt: new Date() });

  await logActivity({
    event: eventId,
    action: 'delete_all_guests',
    description: 'All guests soft-deleted',
    req,
  });

  res.json({ success: true, message: 'All guests deleted.' });
});

exports.restoreAllGuests = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  await Guest.updateMany({ event: eventId, isDeleted: true }, { isDeleted: false, $unset: { deletedAt: '' } });

  await logActivity({
    event: eventId,
    action: 'restore_all_guests',
    description: 'All guests restored',
    req,
  });

  res.json({ success: true, message: 'All guests restored.' });
});

exports.generateQRForGuest = asyncHandler(async (req, res) => {
  const guest = await Guest.findById(req.params.id).populate('event');
  if (!guest) return res.status(404).json({ success: false, message: 'Guest not found.' });

  const token = generateQRToken(guest._id.toString(), guest.event._id.toString(), guest.ticketType);
  guest.qrToken = token;

  const qrBuffer = await generateQRCodeBuffer(token, { size: 300 });

  const result = await uploadToCloudinary(qrBuffer, {
    folder: `cardpro/events/${guest.event._id}/qrcodes`,
    public_id: `qr_${guest._id}`,
    format: 'png',
  });

  guest.qrCodeUrl = result.secure_url;
  await guest.save({ validateBeforeSave: false });

  await logActivity({
    event: guest.event._id,
    action: 'generate_qr',
    description: `QR code generated for guest "${guest.guestName}"`,
    req,
  });

  res.json({ success: true, guest });
});

exports.generateAllQRCodes = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const event = await Event.findById(eventId);
  if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

  const guests = await Guest.find({ event: eventId, isDeleted: false });
  let generated = 0;

  for (const guest of guests) {
    const token = generateQRToken(guest._id.toString(), eventId, guest.ticketType);
    guest.qrToken = token;

    const qrBuffer = await generateQRCodeBuffer(token, { size: 300 });
    const result = await uploadToCloudinary(qrBuffer, {
      folder: `cardpro/events/${eventId}/qrcodes`,
      public_id: `qr_${guest._id}`,
      format: 'png',
    });

    guest.qrCodeUrl = result.secure_url;
    await guest.save({ validateBeforeSave: false });
    generated++;
  }

  await logActivity({
    event: eventId,
    action: 'generate_qr',
    description: `QR codes generated for ${generated} guests`,
    req,
  });

  res.json({ success: true, generated, message: `QR codes generated for ${generated} guests.` });
});

exports.downloadGuestCSV = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const guests = await Guest.find({ event: eventId, isDeleted: false }).sort({ guestName: 1 });

  const headers = ['Guest Name', 'Phone', 'Email', 'Ticket Type', 'RSVP Status', 'Message Status', 'Scan Status', 'Verification Code', 'Table Number'];
  const rows = guests.map(g => [
    g.guestName, g.phone, g.email || '', g.ticketType,
    g.rsvpStatus, g.messageStatus, g.scanStatus,
    g.verificationCode, g.tableNumber || '',
  ]);

  const csvContent = [headers, ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');

  await logActivity({ event: eventId, action: 'download_csv', description: 'Guest list downloaded as CSV', req });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="guests-${eventId}.csv"`);
  res.send(csvContent);
});
