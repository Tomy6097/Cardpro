const router = require('express').Router();
const { protect, adminOnly } = require('../middleware/auth');
const { generateEventReport } = require('../controllers/reportController');

router.use(protect, adminOnly);

router.get('/event/:eventId', generateEventReport);

module.exports = router;
