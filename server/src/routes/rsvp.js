const router = require('express').Router();
const { protect, adminOnly } = require('../middleware/auth');
const { confirmRSVP, declineRSVP, getRSVPStats } = require('../controllers/rsvpController');

// Public RSVP endpoints (no auth needed)
router.post('/confirm/:verificationCode', confirmRSVP);
router.post('/decline/:verificationCode', declineRSVP);

// Protected stats
router.get('/stats/:eventId', protect, adminOnly, getRSVPStats);

module.exports = router;
