const router = require('express').Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
  sendSMS, sendWhatsApp, sendBulkSMS, sendBulkWhatsApp,
  getInvitationStats, testWhatsApp, inspectTemplate,
} = require('../controllers/invitationController');

router.use(protect, adminOnly);

router.post('/sms', sendSMS);
router.post('/whatsapp', sendWhatsApp);
router.post('/bulk-sms', sendBulkSMS);
router.post('/bulk-whatsapp', sendBulkWhatsApp);
router.get('/stats/:eventId', getInvitationStats);

// Twilio Sandbox test endpoints
router.post('/test-whatsapp', testWhatsApp);
router.get('/inspect-template', inspectTemplate);

module.exports = router;
