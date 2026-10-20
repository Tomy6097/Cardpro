const router = require('express').Router();
const { protect, adminOnly } = require('../middleware/auth');
const { getLogs, getEventLogs, cleanupLogs, getLogStats } = require('../controllers/activityController');

router.use(protect, adminOnly);

router.get('/', getLogs);
router.get('/stats', getLogStats);
router.delete('/cleanup', cleanupLogs);
router.get('/event/:eventId', getEventLogs);

module.exports = router;
