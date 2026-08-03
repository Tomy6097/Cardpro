const router = require('express').Router();
const { protect, adminOnly } = require('../middleware/auth');
const { getLogs, getEventLogs } = require('../controllers/activityController');

router.use(protect, adminOnly);

router.get('/', getLogs);
router.get('/event/:eventId', getEventLogs);

module.exports = router;
