const ActivityLog = require('../models/ActivityLog');

const logActivity = async ({
  event = null,
  user = null,
  userName = null,
  action,
  description,
  metadata = {},
  req = null,
}) => {
  try {
    await ActivityLog.create({
      event,
      user,
      userName: userName || req?.user?.username || 'system',
      action,
      description,
      metadata,
      ipAddress: req ? (req.ip || req.connection?.remoteAddress) : null,
      userAgent: req ? req.headers['user-agent'] : null,
    });
  } catch (err) {
    // Non-critical - don't throw
    console.error('Activity log error:', err.message);
  }
};

module.exports = { logActivity };
