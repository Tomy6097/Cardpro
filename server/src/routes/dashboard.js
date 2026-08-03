const router = require('express').Router();
const { protect, adminOnly } = require('../middleware/auth');
const { getDashboardStats, getUpcomingEvents } = require('../controllers/dashboardController');

router.use(protect, adminOnly);

router.get('/', getDashboardStats);
router.get('/upcoming', getUpcomingEvents);

module.exports = router;
