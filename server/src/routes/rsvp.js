const router = require('express').Router();
const { protect, adminOnly } = require('../middleware/auth');
const { confirmRSVP, declineRSVP, getRSVPStats, getRecentRSVPCount, saveGuestMessage, getEventNotifications, getAllEventNotifications } = require('../controllers/rsvpController');

// Public RSVP endpoints (no auth needed)
router.post('/confirm/:verificationCode', confirmRSVP);
router.post('/decline/:verificationCode', declineRSVP);
router.post('/message/:verificationCode', saveGuestMessage);

// Protected stats
router.get('/stats/:eventId', protect, adminOnly, getRSVPStats);
router.get('/recent-count', protect, getRecentRSVPCount);
router.get('/notifications/:eventId', protect, getEventNotifications);
router.get('/notifications', protect, getAllEventNotifications);

module.exports = router;
