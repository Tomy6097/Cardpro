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
