const csv = require('csv-parser');
const { Readable } = require('stream');
const Guest = require('../models/Guest');
const Event = require('../models/Event');
const { logActivity } = require('../utils/activityLogger');
const { generateQRToken, generateQRCodeBuffer } = require('../utils/qrGenerator');
const { uploadToCloudinary } = require('../utils/cloudinary');
const { normalizePhone } = require('../utils/phoneUtils');
const { asyncHandler } = require('../middleware/errorHandler');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const axios = require('axios');

const TICKET_MAP = {
  s: 'Single', single: 'Single',
  d: 'Double', double: 'Double',
  vip: 'VIP', vvip: 'VVIP',
  family: 'Family', child: 'Child',
};

const normalizeTicketType = (val) => {
  if (!val) return 'Single';
  return TICKET_MAP[val.toString().toLowerCase().trim()] || 'Single';
};

const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '#FFFFFF');
  return result
    ? { r: parseInt(result[1], 16) / 255, g: parseInt(result[2], 16) / 255, b: parseInt(result[3], 16) / 255 }
    : { r: 1, g: 1, b: 1 };
};

const fetchBuffer = async (url) => {
  const response = await axios.get(url, { responseType: 'arraybuffer' });
  return Buffer.from(response.data);
};

/**
 * Auto-generate QR code + card for a guest in the background
 * Non-blocking — errors are caught silently so guest creation doesn't fail
 */
const autoGenerateQRAndCard = async (guest, event) => {
  try {
    // 1. Generate QR Token
    const token = generateQRToken(guest._id.toString(), event._id.toString(), guest.ticketType);
    guest.qrToken = token;

    // 2. Generate QR code image and upload to Cloudinary
    const qrBuffer = await generateQRCodeBuffer(token, { size: 300 });
    const qrResult = await uploadToCloudinary(qrBuffer, {
      folder: `cardpro/events/${event._id}/qrcodes`,
      public_id: `qr_${guest._id}`,
      format: 'png',
    });
    guest.qrCodeUrl = qrResult.secure_url;

    // 3. Generate card PDF if template exists
    if (event.cardTemplate?.url) {
      const pdfDoc = await PDFDocument.create();
      const templateBytes = await fetchBuffer(event.cardTemplate.url);

      let templateImage;
      try { templateImage = await pdfDoc.embedPng(templateBytes); }
      catch { templateImage = await pdfDoc.embedJpg(templateBytes); }

      const { width, height } = templateImage.scale(1);
      const page = pdfDoc.addPage([width, height]);
      page.drawImage(templateImage, { x: 0, y: 0, width, height });

      const cfg = event.cardTemplate;
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const nameColor = hexToRgb(cfg.guestNameColor || '#FFFFFF');
      const fontSize = cfg.guestNameFontSize || 24;
      const nameWidth = font.widthOfTextAtSize(guest.guestName, fontSize);
      const namePctX = (cfg.guestNamePosition?.x || 50) / 100;
      const namePctY = (cfg.guestNamePosition?.y || 85) / 100;
      const nameX = (cfg.guestNameAlign === 'center')
        ? (width * namePctX) - (nameWidth / 2)
        : (cfg.guestNameAlign === 'right')
          ? (width * namePctX) - nameWidth
          : width * namePctX;

      const nameY = height * (1 - namePctY);

      // Draw shadow/outline for readability (dark stroke behind text)
      const isDarkBg = true; // assume template may have any background
      const shadowColor = nameColor.r + nameColor.g + nameColor.b > 1.5
        ? { r: 0, g: 0, b: 0 }   // dark shadow for light text
        : { r: 1, g: 1, b: 1 };  // light shadow for dark text

      // Draw outline (shadow) first — offset by 1px in 4 directions
      const offsets = [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1], [0, 1], [-1, 0], [1, 0]];
      for (const [ox, oy] of offsets) {
        page.drawText(guest.guestName, {
          x: nameX + ox, y: nameY + oy,
          size: fontSize, font,
          color: rgb(shadowColor.r, shadowColor.g, shadowColor.b),
          opacity: 0.6,
        });
      }

      // Draw main text on top
      page.drawText(guest.guestName, {
        x: nameX, y: nameY,
        size: fontSize, font,
        color: rgb(nameColor.r, nameColor.g, nameColor.b),
        opacity: 1,
      });

      const qrSize = cfg.qrSize || 150;
      if (cfg.showQR !== false) {
        const qrImg = await pdfDoc.embedPng(qrBuffer);
        const qrPctX = (cfg.qrPosition?.x || 70) / 100;
        const qrPctY = (cfg.qrPosition?.y || 70) / 100;
        page.drawImage(qrImg, {
          x: width * qrPctX - qrSize / 2,
          y: height * (1 - qrPctY) - qrSize / 2,
          width: qrSize, height: qrSize,
        });

        const labelFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const label = guest.ticketType.toUpperCase();
        const labelWidth = labelFont.widthOfTextAtSize(label, 12);
        page.drawText(label, {
          x: width * qrPctX - labelWidth / 2,
          y: height * (1 - qrPctY) + qrSize / 2 + 5,
          size: 12, font: labelFont,
          color: rgb(nameColor.r, nameColor.g, nameColor.b),
        });
      }

      const pdfBytes = await pdfDoc.save();
      const cardResult = await uploadToCloudinary(Buffer.from(pdfBytes), {
        folder: `cardpro/events/${event._id}/cards`,
        public_id: `card_${guest._id}`,
        format: 'pdf',
        resource_type: 'image',
      });
      guest.cardUrl = cardResult.secure_url;
      guest.cardPublicId = cardResult.public_id;
    }

    await guest.save({ validateBeforeSave: false });
  } catch (err) {
    // Non-critical — log but don't fail guest creation
    console.error(`Auto QR/Card generation failed for guest ${guest._id}:`, err.message);
  }
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

  // Auto-generate QR code and card in background (non-blocking)
  autoGenerateQRAndCard(guest, event);

  await logActivity({
    event: eventId,
    action: 'add_guest',
    description: `Guest "${guest.guestName}" added — QR & card generating...`,
    req,
  });

  res.status(201).json({
    success: true,
    guest,
    message: 'Guest added. QR code and card are being generated automatically.',
  });
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

  // Auto-generate QR codes and cards for all imported guests in background
  if (inserted.length > 0) {
    setImmediate(async () => {
      for (const guest of inserted) {
        await autoGenerateQRAndCard(guest, event);
      }
    });
  }

  await logActivity({
    event: eventId,
    action: 'import_guests',
    description: `${inserted.length} guests imported via CSV — QR codes generating automatically`,
    metadata: { inserted: inserted.length, errors: errors.length },
    req,
  });

  res.json({
    success: true,
    imported: inserted.length,
    skipped: errors.length,
    errors,
    message: `${inserted.length} guests imported. QR codes and cards are being generated automatically.`,
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
