const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const Guest = require('../models/Guest');
const Event = require('../models/Event');
const { generateQRCodeBuffer } = require('../utils/qrGenerator');
const { uploadToCloudinary } = require('../utils/cloudinary');
const { logActivity } = require('../utils/activityLogger');
const { asyncHandler } = require('../middleware/errorHandler');
const axios = require('axios');

const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '#FFFFFF');
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255,
  } : { r: 1, g: 1, b: 1 };
};

const fetchBuffer = async (url) => {
  const response = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 30000,
  });
  return Buffer.from(response.data);
};

exports.generateCard = asyncHandler(async (req, res) => {
  const guest = await Guest.findById(req.params.id).populate('event');
  if (!guest) return res.status(404).json({ success: false, message: 'Guest not found.' });

  const event = guest.event;
  if (!event.cardTemplate?.url) {
    return res.status(400).json({ success: false, message: 'No card template uploaded for this event.' });
  }

  // Ensure QR token exists
  if (!guest.qrToken) {
    const { generateQRToken } = require('../utils/qrGenerator');
    guest.qrToken = generateQRToken(guest._id.toString(), event._id.toString(), guest.ticketType);
    await guest.save({ validateBeforeSave: false });
  }

  // Create PDF
  const pdfDoc = await PDFDocument.create();
  const templateBytes = await fetchBuffer(event.cardTemplate.url);

  let templateImage;
  try {
    templateImage = await pdfDoc.embedPng(templateBytes);
  } catch {
    templateImage = await pdfDoc.embedJpg(templateBytes);
  }

  const { width, height } = templateImage.scale(1);
  const page = pdfDoc.addPage([width, height]);

  // Draw template background
  page.drawImage(templateImage, { x: 0, y: 0, width, height });

  // Draw guest name with outline for clarity
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const config = event.cardTemplate;
  const nameColor = hexToRgb(config.guestNameColor || '#FFFFFF');
  const fontSize = config.guestNameFontSize || 24;
  const nameWidth = font.widthOfTextAtSize(guest.guestName, fontSize);

  let nameX;
  const namePctX = (config.guestNamePosition?.x || 50) / 100;
  const namePctY = (config.guestNamePosition?.y || 85) / 100;

  if (config.guestNameAlign === 'center') {
    nameX = (width * namePctX) - (nameWidth / 2);
  } else if (config.guestNameAlign === 'right') {
    nameX = (width * namePctX) - nameWidth;
  } else {
    nameX = width * namePctX;
  }

  const nameY = height * (1 - namePctY);

  // Shadow color — opposite of text color for contrast
  const shadowColor = nameColor.r + nameColor.g + nameColor.b > 1.5
    ? { r: 0, g: 0, b: 0 }
    : { r: 1, g: 1, b: 1 };

  // Draw outline first
  const offsets = [[-1,-1],[1,-1],[-1,1],[1,1],[0,-1],[0,1],[-1,0],[1,0]];
  for (const [ox, oy] of offsets) {
    page.drawText(guest.guestName, {
      x: nameX + ox, y: nameY + oy,
      size: fontSize, font,
      color: rgb(shadowColor.r, shadowColor.g, shadowColor.b),
      opacity: 0.6,
    });
  }

  // Draw main text
  page.drawText(guest.guestName, {
    x: nameX, y: nameY,
    size: fontSize, font,
    color: rgb(nameColor.r, nameColor.g, nameColor.b),
    opacity: 1,
  });

  // Draw QR code
  if (config.showQR !== false && guest.qrToken) {
    const qrSize = config.qrSize || 150;
    const qrBuffer = await generateQRCodeBuffer(guest.qrToken, { size: qrSize });
    const qrImage = await pdfDoc.embedPng(qrBuffer);

    const qrPctX = (config.qrPosition?.x || 70) / 100;
    const qrPctY = (config.qrPosition?.y || 70) / 100;

    page.drawImage(qrImage, {
      x: width * qrPctX - qrSize / 2,
      y: height * (1 - qrPctY) - qrSize / 2,
      width: qrSize,
      height: qrSize,
    });

    // Draw ticket label above QR
    const labelFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const label = guest.ticketLabel || guest.ticketType.toUpperCase();
    const labelSize = 14;
    const labelWidth = labelFont.widthOfTextAtSize(label, labelSize);
    page.drawText(label, {
      x: width * qrPctX - labelWidth / 2,
      y: height * (1 - qrPctY) + qrSize / 2 + 5,
      size: labelSize,
      font: labelFont,
      color: rgb(nameColor.r, nameColor.g, nameColor.b),
    });
  }

  const pdfBytes = await pdfDoc.save();
  const pdfBuffer = Buffer.from(pdfBytes);

  const result = await uploadToCloudinary(pdfBuffer, {
    folder: `cardpro/events/${event._id}/cards`,
    public_id: `card_${guest._id}`,
    resource_type: 'image',
    format: 'jpg',
    transformation: [{ quality: 'auto:best', dpr: '2.0' }],
  });

  guest.cardUrl = result.secure_url;
  guest.cardPublicId = result.public_id;
  await guest.save({ validateBeforeSave: false });

  await logActivity({
    event: event._id,
    action: 'generate_card',
    description: `Card generated for guest "${guest.guestName}"`,
    req,
  });

  res.json({ success: true, guest, cardUrl: result.secure_url });
});

exports.generateAllCards = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const event = await Event.findById(eventId);
  if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });
  if (!event.cardTemplate?.url) {
    return res.status(400).json({ success: false, message: 'No card template uploaded.' });
  }

  const guests = await Guest.find({ event: eventId, isDeleted: false });
  let generated = 0;
  const errors = [];

  for (const guest of guests) {
    try {
      const pdfDoc = await PDFDocument.create();
      const templateBytes = await fetchBuffer(event.cardTemplate.url);

      let templateImage;
      try { templateImage = await pdfDoc.embedPng(templateBytes); }
      catch { templateImage = await pdfDoc.embedJpg(templateBytes); }

      const { width, height } = templateImage.scale(1);
      const page = pdfDoc.addPage([width, height]);
      page.drawImage(templateImage, { x: 0, y: 0, width, height });

      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const config = event.cardTemplate;
      const nameColor = hexToRgb(config.guestNameColor || '#FFFFFF');
      const fontSize = config.guestNameFontSize || 24;
      const nameWidth = font.widthOfTextAtSize(guest.guestName, fontSize);
      const namePctX = (config.guestNamePosition?.x || 50) / 100;
      const namePctY = (config.guestNamePosition?.y || 85) / 100;
      const nameX = config.guestNameAlign === 'center'
        ? (width * namePctX) - (nameWidth / 2)
        : config.guestNameAlign === 'right'
          ? (width * namePctX) - nameWidth
          : width * namePctX;
      const nameY = height * (1 - namePctY);

      // Shadow/outline
      const shadowColor = nameColor.r + nameColor.g + nameColor.b > 1.5
        ? { r: 0, g: 0, b: 0 } : { r: 1, g: 1, b: 1 };
      const offsets = [[-1,-1],[1,-1],[-1,1],[1,1],[0,-1],[0,1],[-1,0],[1,0]];
      for (const [ox, oy] of offsets) {
        page.drawText(guest.guestName, { x: nameX+ox, y: nameY+oy, size: fontSize, font, color: rgb(shadowColor.r, shadowColor.g, shadowColor.b), opacity: 0.6 });
      }
      page.drawText(guest.guestName, { x: nameX, y: nameY, size: fontSize, font, color: rgb(nameColor.r, nameColor.g, nameColor.b), opacity: 1 });

      if (config.showQR !== false && guest.qrToken) {
        const qrSize = config.qrSize || 150;
        const qrBuffer = await generateQRCodeBuffer(guest.qrToken, { size: qrSize });
        const qrImage = await pdfDoc.embedPng(qrBuffer);
        const qrPctX = (config.qrPosition?.x || 70) / 100;
        const qrPctY = (config.qrPosition?.y || 70) / 100;
        page.drawImage(qrImage, {
          x: width * qrPctX - qrSize / 2,
          y: height * (1 - qrPctY) - qrSize / 2,
          width: qrSize, height: qrSize,
        });
      }

      const pdfBytes = await pdfDoc.save();
      const result = await uploadToCloudinary(Buffer.from(pdfBytes), {
        folder: `cardpro/events/${eventId}/cards`,
        public_id: `card_${guest._id}`,
        format: 'jpg',
        resource_type: 'image',
        transformation: [{ quality: 'auto:best', dpr: '2.0' }],
      });

      guest.cardUrl = result.secure_url;
      guest.cardPublicId = result.public_id;
      await guest.save({ validateBeforeSave: false });
      generated++;
    } catch (err) {
      errors.push({ guest: guest.guestName, error: err.message });
    }
  }

  await logActivity({
    event: eventId,
    action: 'generate_all_cards',
    description: `${generated} cards generated`,
    req,
  });

  res.json({ success: true, generated, errors, message: `${generated} cards generated.` });
});

exports.downloadCardPDF = asyncHandler(async (req, res) => {
  const guest = await Guest.findById(req.params.id);
  if (!guest || !guest.cardUrl) {
    return res.status(404).json({ success: false, message: 'Card not found. Generate the card first.' });
  }

  await logActivity({
    event: guest.event,
    action: 'download_pdf',
    description: `Card PDF downloaded for guest "${guest.guestName}"`,
    req,
  });

  res.json({ success: true, cardUrl: guest.cardUrl });
});
