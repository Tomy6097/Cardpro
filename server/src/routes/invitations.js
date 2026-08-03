const router = require('express').Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  sendSMS, sendWhatsApp, sendBulkSMS, sendBulkWhatsApp, getInvitationStats,
} = require('../controllers/invitationController');

router.use(protect, adminOnly);

router.post('/sms', sendSMS);
router.post('/whatsapp', sendWhatsApp);
router.post('/bulk-sms', sendBulkSMS);
router.post('/bulk-whatsapp', sendBulkWhatsApp);
router.get('/stats/:eventId', getInvitationStats);

module.exports = router;
