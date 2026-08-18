const Event = require('../models/Event');
const Guest = require('../models/Guest');
const { asyncHandler } = require('../middleware/errorHandler');

// Public mini website data
exports.getEventPublic = asyncHandler(async (req, res) => {
  const { slug } = req.params;

  const event = await Event.findOne({ slug, status: { $ne: 'cancelled' } })
    .select('name clientName date time venue description dressCode googleMapsUrl invitationVideo coverImage status slug websiteTheme dressCodeImages dressCodeColors eventPhotos');

  if (!event) {
    return res.status(404).json({ success: false, message: 'Event not found.' });
  }

  res.json({ success: true, event });
});

// Public settings (company branding only)
exports.getPublicSettings = asyncHandler(async (req, res) => {
  const Settings = require('../models/Settings');
  const settings = await Settings.findOne().select('companyName logo contactPhone contactEmail');
  res.json({ success: true, settings: settings || { companyName: 'Cardpro', logo: null, contactPhone: '', contactEmail: '' } });
});
exports.getGuestInvitation = asyncHandler(async (req, res) => {
  const { slug } = req.params;
  const { code } = req.query;

  const event = await Event.findOne({ slug })
    .select('name clientName date time venue description dressCode googleMapsUrl invitationVideo coverImage status websiteTheme dressCodeImages dressCodeColors eventPhotos rsvpDeadline');

  if (!event) {
    return res.status(404).json({ success: false, message: 'Event not found.' });
  }

  if (!code) {
    return res.json({ success: true, event, guest: null });
  }

  const guest = await Guest.findOne({
    verificationCode: code.toUpperCase(),
    event: event._id,
    isDeleted: false,
  }).select('guestName ticketType ticketLabel rsvpStatus qrCodeUrl cardUrl verificationCode scanCount remainingEntries');

  if (!guest) {
    return res.status(404).json({ success: false, message: 'Invalid invitation code.' });
  }

  res.json({ success: true, event, guest });
});
