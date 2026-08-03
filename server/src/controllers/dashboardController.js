const Event = require('../models/Event');
const Guest = require('../models/Guest');
const ActivityLog = require('../models/ActivityLog');
const { asyncHandler } = require('../middleware/errorHandler');

exports.getDashboardStats = asyncHandler(async (req, res) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [
    totalEvents, activeEvents, todayEvents,
    totalGuests, confirmedGuests, pendingGuests, scannedGuests,
    smsSent, whatsappSent,
    recentActivity,
  ] = await Promise.all([
    Event.countDocuments(),
    Event.countDocuments({ status: 'active' }),
    Event.countDocuments({ date: { $gte: today, $lt: tomorrow } }),
    Guest.countDocuments({ isDeleted: false }),
    Guest.countDocuments({ isDeleted: false, rsvpStatus: 'confirmed' }),
    Guest.countDocuments({ isDeleted: false, rsvpStatus: 'pending' }),
    Guest.countDocuments({ isDeleted: false, scanStatus: 'scanned' }),
    Guest.countDocuments({ isDeleted: false, messageChannel: 'sms' }),
    Guest.countDocuments({ isDeleted: false, messageChannel: 'whatsapp' }),
    ActivityLog.find().sort({ createdAt: -1 }).limit(10).populate('user', 'username').populate('event', 'name'),
  ]);

  // Events per status chart data
  const [completedEvents, cancelledEvents] = await Promise.all([
    Event.countDocuments({ status: 'completed' }),
    Event.countDocuments({ status: 'cancelled' }),
  ]);

  // Guest trend - last 7 days
  const guestTrend = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);
    const count = await Guest.countDocuments({
      isDeleted: false,
      createdAt: { $gte: d, $lt: next },
    });
    guestTrend.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      guests: count,
    });
  }

  res.json({
    success: true,
    stats: {
      totalEvents, activeEvents, completedEvents, cancelledEvents, todayEvents,
      totalGuests, confirmedGuests, pendingGuests, scannedGuests,
      smsSent, whatsappSent,
    },
    charts: {
      eventStatus: [
        { label: 'Active', value: activeEvents, color: '#8B6914' },
        { label: 'Completed', value: completedEvents, color: '#2D6A4F' },
        { label: 'Cancelled', value: cancelledEvents, color: '#C44B4B' },
      ],
      rsvpStatus: [
        { label: 'Confirmed', value: confirmedGuests, color: '#2D6A4F' },
        { label: 'Pending', value: pendingGuests, color: '#8B6914' },
        { label: 'Declined', value: totalGuests - confirmedGuests - pendingGuests, color: '#C44B4B' },
      ],
      guestTrend,
    },
    recentActivity,
  });
});

exports.getUpcomingEvents = asyncHandler(async (req, res) => {
  const today = new Date();
  const events = await Event.find({
    status: 'active',
    date: { $gte: today },
  }).sort({ date: 1 }).limit(5).select('name clientName date time venue');

  res.json({ success: true, events });
});
