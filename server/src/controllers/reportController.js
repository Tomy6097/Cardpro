const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const Guest = require('../models/Guest');
const Event = require('../models/Event');
const { asyncHandler } = require('../middleware/errorHandler');

// ─── Color palette ────────────────────────────────────────────
const C = {
  primary:    rgb(0.361, 0.239, 0.067),  // #5C3D11
  gold:       rgb(0.788, 0.659, 0.298),  // #C9A84C
  dark:       rgb(0.102, 0.039, 0),      // #1A0A00
  white:      rgb(1, 1, 1),
  cream:      rgb(0.992, 0.961, 0.918),  // #FDF5EA
  muted:      rgb(0.45, 0.35, 0.2),
  green:      rgb(0.176, 0.416, 0.310),  // #2D6A4F
  red:        rgb(0.769, 0.294, 0.294),  // #C44B4B
  orange:     rgb(0.780, 0.525, 0.160),  // #C98629
  lightgray:  rgb(0.93, 0.91, 0.88),
};

// ─── Helpers ──────────────────────────────────────────────────
const fmtDate = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleDateString('sw-TZ', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  } catch { return String(d); }
};

const fmtDateTime = (d) => {
  if (!d) return '—';
  try {
    return new Date(d).toLocaleString('sw-TZ', {
      year: 'numeric', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  } catch { return String(d); }
};

const pct = (n, total) => total > 0 ? Math.round((n / total) * 100) : 0;

// Draw a filled rectangle
const rect = (page, x, y, w, h, color) =>
  page.drawRectangle({ x, y, width: w, height: h, color });

// Draw text safely (truncate if needed)
const txt = (page, text, x, y, opts) => {
  const str = String(text ?? '—').substring(0, 120);
  page.drawText(str, { x, y, ...opts });
};

// Draw a horizontal rule
const rule = (page, y, width, color = C.lightgray, thickness = 0.5) =>
  page.drawLine({ start: { x: 40, y }, end: { x: 40 + width, y }, thickness, color });

exports.generateEventReport = asyncHandler(async (req, res) => {
  const { eventId } = req.params;

  const [event, allGuests] = await Promise.all([
    Event.findById(eventId),
    Guest.find({ event: eventId, isDeleted: false }).sort({ guestName: 1 }),
  ]);

  if (!event) return res.status(404).json({ success: false, message: 'Event not found.' });

  // ── Compute stats ────────────────────────────────────────────
  const total      = allGuests.length;
  const confirmed  = allGuests.filter(g => g.rsvpStatus === 'confirmed').length;
  const pending    = allGuests.filter(g => g.rsvpStatus === 'pending').length;
  const declined   = allGuests.filter(g => g.rsvpStatus === 'declined').length;
  const scanned    = allGuests.filter(g => g.scanStatus === 'scanned').length;
  const smsSent    = allGuests.filter(g => g.messageChannel === 'sms').length;
  const waSent     = allGuests.filter(g => g.messageChannel === 'whatsapp').length;
  const notSent    = allGuests.filter(g => g.messageStatus === 'not_sent').length;
  const declined_with_reason = allGuests.filter(g => g.rsvpStatus === 'declined' && g.declineReason);

  // Ticket breakdown
  const ticketBreakdown = {};
  for (const g of allGuests) {
    ticketBreakdown[g.ticketType] = (ticketBreakdown[g.ticketType] || 0) + 1;
  }

  // ── Create PDF ───────────────────────────────────────────────
  const pdfDoc  = await PDFDocument.create();
  const W       = 595; // A4 width pts
  const H       = 842; // A4 height pts
  const margin  = 40;
  const colW    = W - margin * 2;

  const fontBold    = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // ─────────────────────────────────────────
  // PAGE 1 — Cover + Summary
  // ─────────────────────────────────────────
  let page = pdfDoc.addPage([W, H]);

  // Header background
  rect(page, 0, H - 110, W, 110, C.dark);
  rect(page, 0, H - 114, W, 4, C.gold);

  // Title
  txt(page, 'RIPOTI YA TUKIO', margin, H - 45, {
    font: fontBold, size: 22, color: C.gold,
  });
  txt(page, event.name.toUpperCase(), margin, H - 68, {
    font: fontBold, size: 14, color: C.white,
  });
  txt(page, `Mteja: ${event.clientName}  ·  Tarehe ya Ripoti: ${fmtDateTime(new Date())}`, margin, H - 88, {
    font: fontRegular, size: 9, color: rgb(0.7, 0.65, 0.55),
  });

  let y = H - 130;

  // ── Event Info Section ───────────────────────────────────────
  rect(page, margin, y - 14, colW, 20, C.primary);
  txt(page, 'MAELEZO YA TUKIO', margin + 8, y - 8, { font: fontBold, size: 10, color: C.white });
  y -= 14;

  const infoRows = [
    ['Jina la Tukio',   event.name],
    ['Mteja',           event.clientName],
    ['Tarehe',          fmtDate(event.date) + (event.time ? `  ·  Saa: ${event.time}` : '')],
    ['Mahali',          event.venue],
    ['Mavazi',          event.dressCode || '—'],
    ['Hali',            event.status?.toUpperCase() || '—'],
    ['Maelezo',         event.description || '—'],
  ];

  for (const [label, value] of infoRows) {
    y -= 18;
    if (y < 60) { page = pdfDoc.addPage([W, H]); y = H - 60; }
    rect(page, margin, y - 4, colW, 18, C.cream);
    txt(page, label, margin + 6, y + 2, { font: fontBold, size: 9, color: C.primary });
    txt(page, value, margin + 130, y + 2, { font: fontRegular, size: 9, color: C.dark });
    rule(page, y - 4, colW, C.lightgray);
  }

  y -= 28;

  // ── Stats Section ─────────────────────────────────────────────
  if (y < 200) { page = pdfDoc.addPage([W, H]); y = H - 60; }

  rect(page, margin, y - 14, colW, 20, C.primary);
  txt(page, 'TAKWIMU ZA WAGENI', margin + 8, y - 8, { font: fontBold, size: 10, color: C.white });
  y -= 14;

  // Stat boxes — 4 per row
  const boxes = [
    { label: 'Jumla ya Wageni', value: total,     color: C.primary },
    { label: 'Wamethibitisha',  value: confirmed,  color: C.green },
    { label: 'Hawajathibitisha',value: pending,    color: C.orange },
    { label: 'Wamekataa',       value: declined,   color: C.red },
    { label: 'Wameingia',       value: scanned,    color: C.green },
    { label: 'Hawajaingia',     value: total - scanned, color: C.muted },
    { label: 'SMS Zilitumwa',   value: smsSent,    color: C.primary },
    { label: 'WhatsApp Zilitumwa', value: waSent,  color: rgb(0.145, 0.827, 0.400) },
  ];

  y -= 10;
  const bW = (colW - 15) / 4;
  let bx = 0;
  for (let i = 0; i < boxes.length; i++) {
    const b = boxes[i];
    if (i % 4 === 0) {
      if (i > 0) y -= 58;
      bx = 0;
      if (y < 60) { page = pdfDoc.addPage([W, H]); y = H - 60; }
    }
    const bxPos = margin + bx * (bW + 5);
    rect(page, bxPos, y - 46, bW, 46, C.cream);
    page.drawRectangle({ x: bxPos, y: y - 46, width: 3, height: 46, color: b.color });
    txt(page, String(b.value), bxPos + 10, y - 20, { font: fontBold, size: 20, color: b.color });
    txt(page, `${pct(b.value, total)}%`, bxPos + 10, y - 32, { font: fontRegular, size: 7, color: C.muted });
    txt(page, b.label, bxPos + 10, y - 42, { font: fontRegular, size: 7.5, color: C.primary });
    bx++;
  }
  y -= 64;

  // Ticket Breakdown
  y -= 18;
  if (y < 100) { page = pdfDoc.addPage([W, H]); y = H - 60; }

  rect(page, margin, y - 14, colW, 20, C.primary);
  txt(page, 'MGAWANYO WA TIKETI', margin + 8, y - 8, { font: fontBold, size: 10, color: C.white });
  y -= 24;

  const ticketEntries = Object.entries(ticketBreakdown);
  const tW = colW / Math.max(ticketEntries.length, 1);
  for (let i = 0; i < ticketEntries.length; i++) {
    const [type, count] = ticketEntries[i];
    const tx = margin + i * tW;
    rect(page, tx, y - 40, tW - 4, 40, C.cream);
    page.drawRectangle({ x: tx, y: y - 40, width: tW - 4, height: 3, color: C.gold });
    txt(page, String(count), tx + 8, y - 18, { font: fontBold, size: 18, color: C.primary });
    txt(page, type.toUpperCase(), tx + 8, y - 35, { font: fontBold, size: 8, color: C.muted });
  }
  y -= 56;

  // ─────────────────────────────────────────
  // PAGE 2 — Full Guest List
  // ─────────────────────────────────────────
  page = pdfDoc.addPage([W, H]);
  rect(page, 0, H - 50, W, 50, C.dark);
  rect(page, 0, H - 54, W, 4, C.gold);
  txt(page, 'ORODHA YA WAGENI', margin, H - 30, { font: fontBold, size: 14, color: C.gold });
  txt(page, event.name, margin, H - 44, { font: fontRegular, size: 9, color: rgb(0.7,0.65,0.55) });

  y = H - 68;

  // Table header
  const cols = { name: 140, phone: 90, ticket: 55, rsvp: 65, scan: 55, code: 90 };
  let cx = margin;
  rect(page, margin, y - 14, colW, 18, C.primary);
  for (const [, w] of Object.entries(cols)) { // draw separators
    cx += w;
    if (cx < margin + colW) page.drawLine({ start:{x:cx,y:y-14}, end:{x:cx,y:y+4}, thickness:0.3, color:rgb(1,1,1,0.3) });
  }
  cx = margin;
  for (const [label, w] of [['Jina la Mgeni',cols.name],['Simu',cols.phone],['Tiketi',cols.ticket],['RSVP',cols.rsvp],['Scan',cols.scan],['Nambari ya Code',cols.code]]) {
    txt(page, label, cx + 4, y - 8, { font: fontBold, size: 8, color: C.white });
    cx += w;
  }
  y -= 18;

  for (let i = 0; i < allGuests.length; i++) {
    if (y < 50) {
      page = pdfDoc.addPage([W, H]);
      // mini header
      rect(page, 0, H - 30, W, 30, C.dark);
      txt(page, `ORODHA YA WAGENI (ukurasa ${pdfDoc.getPageCount()})`, margin, H - 18, { font: fontBold, size: 10, color: C.gold });
      y = H - 48;
      // re-draw table header
      rect(page, margin, y - 14, colW, 18, C.primary);
      cx = margin;
      for (const [label, w] of [['Jina la Mgeni',cols.name],['Simu',cols.phone],['Tiketi',cols.ticket],['RSVP',cols.rsvp],['Scan',cols.scan],['Nambari ya Code',cols.code]]) {
        txt(page, label, cx + 4, y - 8, { font: fontBold, size: 8, color: C.white });
        cx += w;
      }
      y -= 18;
    }

    const g = allGuests[i];
    const bg = i % 2 === 0 ? C.white : C.cream;
    rect(page, margin, y - 13, colW, 15, bg);

    const rsvpColor = g.rsvpStatus === 'confirmed' ? C.green : g.rsvpStatus === 'declined' ? C.red : C.orange;
    const scanColor = g.scanStatus === 'scanned' ? C.green : C.muted;

    const rsvpLabel = g.rsvpStatus === 'confirmed' ? 'Imethibitishwa' : g.rsvpStatus === 'declined' ? 'Imekataliwa' : 'Inasubiri';
    const scanLabel = g.scanStatus === 'scanned' ? 'Ameingia' : 'Hajakuja';

    cx = margin;
    txt(page, g.guestName,        cx + 4, y - 8, { font: fontBold,    size: 8, color: C.dark   }); cx += cols.name;
    txt(page, g.phone,            cx + 4, y - 8, { font: fontRegular, size: 7.5, color: C.muted }); cx += cols.phone;
    txt(page, g.ticketType,       cx + 4, y - 8, { font: fontRegular, size: 8, color: C.primary }); cx += cols.ticket;
    txt(page, rsvpLabel,          cx + 4, y - 8, { font: fontBold,    size: 7.5, color: rsvpColor }); cx += cols.rsvp;
    txt(page, scanLabel,          cx + 4, y - 8, { font: fontBold,    size: 7.5, color: scanColor }); cx += cols.scan;
    txt(page, g.verificationCode, cx + 4, y - 8, { font: fontRegular, size: 7.5, color: C.muted  });

    rule(page, y - 13, colW);
    y -= 15;
  }

  // ─────────────────────────────────────────
  // PAGE 3 — Declined with Reasons
  // ─────────────────────────────────────────
  if (declined_with_reason.length > 0) {
    page = pdfDoc.addPage([W, H]);
    rect(page, 0, H - 50, W, 50, C.dark);
    rect(page, 0, H - 54, W, 4, C.gold);
    txt(page, 'WAGENI WALIOKATAA — SABABU ZAO', margin, H - 30, { font: fontBold, size: 14, color: C.gold });
    txt(page, event.name, margin, H - 44, { font: fontRegular, size: 9, color: rgb(0.7,0.65,0.55) });

    y = H - 72;

    for (const g of declined_with_reason) {
      if (y < 80) {
        page = pdfDoc.addPage([W, H]);
        rect(page, 0, H - 30, W, 30, C.dark);
        txt(page, 'WAGENI WALIOKATAA (inaendelea)', margin, H - 18, { font: fontBold, size: 10, color: C.gold });
        y = H - 50;
      }

      // Card per declined guest
      const cardH = 54;
      rect(page, margin, y - cardH, colW, cardH, C.cream);
      page.drawRectangle({ x: margin, y: y - cardH, width: 4, height: cardH, color: C.red });

      txt(page, g.guestName, margin + 12, y - 12, { font: fontBold, size: 10, color: C.red });
      txt(page, `${g.ticketType}  ·  ${g.phone}`, margin + 12, y - 24, { font: fontRegular, size: 8, color: C.muted });

      if (g.rsvpAt) {
        txt(page, `Tarehe ya kukataa: ${fmtDateTime(g.rsvpAt)}`, margin + 12, y - 34, { font: fontRegular, size: 8, color: C.muted });
      }

      // Reason text — wrap manually at ~85 chars
      const reason = g.declineReason || '';
      const lines  = [];
      let cur = '';
      for (const word of reason.split(' ')) {
        if ((cur + ' ' + word).length > 85) { lines.push(cur.trim()); cur = word; }
        else cur += ' ' + word;
      }
      if (cur.trim()) lines.push(cur.trim());

      txt(page, `"${lines[0] || ''}"`, margin + 12, y - 46, { font: fontRegular, size: 8, color: C.dark });

      rule(page, y - cardH - 2, colW, C.lightgray);
      y -= cardH + 10;
    }
  }

  // ─────────────────────────────────────────
  // LAST PAGE — Footer / Summary
  // ─────────────────────────────────────────
  page = pdfDoc.addPage([W, H]);
  rect(page, 0, H - 50, W, 50, C.dark);
  rect(page, 0, H - 54, W, 4, C.gold);
  txt(page, 'MUHTASARI WA RIPOTI', margin, H - 30, { font: fontBold, size: 14, color: C.gold });
  txt(page, event.name, margin, H - 44, { font: fontRegular, size: 9, color: rgb(0.7,0.65,0.55) });

  y = H - 80;

  const summaryRows = [
    ['Jumla ya Wageni Walioorodheshwa', `${total}`],
    ['Wamethibitisha Mahudhurio', `${confirmed} (${pct(confirmed, total)}%)`],
    ['Bado Hawajajibu (Pending)', `${pending} (${pct(pending, total)}%)`],
    ['Wamekataa', `${declined} (${pct(declined, total)}%)`],
    ['Wamekataa na Kutoa Sababu', `${declined_with_reason.length}`],
    ['Wameingia Siku ya Tukio', `${scanned} (${pct(scanned, total)}%)`],
    ['Hawakuingia', `${total - scanned} (${pct(total - scanned, total)}%)`],
    ['Mialiko Iliyotumwa (SMS)', `${smsSent}`],
    ['Mialiko Iliyotumwa (WhatsApp)', `${waSent}`],
    ['Hawakupata Mwaliko', `${notSent}`],
  ];

  for (const [label, value] of summaryRows) {
    if (y < 60) { page = pdfDoc.addPage([W, H]); y = H - 60; }
    rect(page, margin, y - 16, colW, 18, C.cream);
    txt(page, label, margin + 8, y - 6, { font: fontRegular, size: 9.5, color: C.primary });
    txt(page, value, margin + colW - 100, y - 6, { font: fontBold, size: 10, color: C.dark });
    rule(page, y - 16, colW);
    y -= 18;
  }

  // Footer
  y -= 30;
  if (y < 80) { page = pdfDoc.addPage([W, H]); y = H - 60; }
  rect(page, margin, y - 40, colW, 40, C.dark);
  txt(page, 'Imetolewa na Mfumo wa Cardpro', margin + 10, y - 14, { font: fontBold, size: 9, color: C.gold });
  txt(page, `Tarehe: ${fmtDateTime(new Date())}  ·  Tukio: ${event.name}`, margin + 10, y - 28, { font: fontRegular, size: 8, color: rgb(0.65,0.60,0.50) });

  // Page numbers on all pages
  const pages = pdfDoc.getPages();
  for (let i = 0; i < pages.length; i++) {
    txt(pages[i], `Uk. ${i + 1} / ${pages.length}`, W - 70, 20, { font: fontRegular, size: 8, color: C.muted });
  }

  // ── Serialize & send ─────────────────────────────────────────
  const pdfBytes = await pdfDoc.save();
  const filename = `Ripoti_${event.name.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().slice(0,10)}.pdf`;

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', pdfBytes.length);
  res.end(Buffer.from(pdfBytes));
});
