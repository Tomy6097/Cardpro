const ActivityLog = require('../models/ActivityLog');
const { asyncHandler } = require('../middleware/errorHandler');

exports.getLogs = asyncHandler(async (req, res) => {
  const { eventId, action, userId, page = 1, limit = 50, startDate, endDate } = req.query;

  const filter = {};
  if (eventId) filter.event = eventId;
  if (action) filter.action = action;
  if (userId) filter.user = userId;
  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) filter.createdAt.$lte = new Date(endDate);
  }

  const skip = (Number(page) - 1) * Number(limit);
  const [logs, total] = await Promise.all([
    ActivityLog.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('user', 'username fullName')
      .populate('event', 'name'),
    ActivityLog.countDocuments(filter),
  ]);

  res.json({
    success: true,
    logs,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
  });
});

exports.getEventLogs = asyncHandler(async (req, res) => {
  const { eventId } = req.params;
  const { page = 1, limit = 50 } = req.query;

  const skip = (Number(page) - 1) * Number(limit);
  const [logs, total] = await Promise.all([
    ActivityLog.find({ event: eventId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('user', 'username fullName'),
    ActivityLog.countDocuments({ event: eventId }),
  ]);

  res.json({
    success: true,
    logs,
    pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) },
  });
});

// Manual cleanup — delete logs older than X days (default 30)
exports.cleanupLogs = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days) || 30;
  if (days < 1 || days > 365) {
    return res.status(400).json({ success: false, message: 'Days must be between 1 and 365.' });
  }

  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const result = await ActivityLog.deleteMany({ createdAt: { $lt: cutoff } });

  res.json({
    success: true,
    message: `Deleted ${result.deletedCount} logs older than ${days} days.`,
    deletedCount: result.deletedCount,
    cutoffDate: cutoff.toISOString(),
  });
});

// Get log stats — total count, oldest log, storage estimate
exports.getLogStats = asyncHandler(async (req, res) => {
  const [total, oldest] = await Promise.all([
    ActivityLog.countDocuments({}),
    ActivityLog.findOne({}).sort({ createdAt: 1 }).select('createdAt'),
  ]);

  // Rough estimate: ~500 bytes per log document
  const estimatedKB = Math.round((total * 500) / 1024);

  res.json({
    success: true,
    stats: {
      total,
      oldestLog: oldest?.createdAt || null,
      estimatedStorageKB: estimatedKB,
      ttlDays: 30,
      ttlNote: 'Logs auto-delete after 30 days via MongoDB TTL index',
    },
  });
});
