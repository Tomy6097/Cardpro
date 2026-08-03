const router = require('express').Router();
const { protect, scannerOrAdmin } = require('../middleware/auth');
const { scanQR, searchGuest, getLiveStats, getScannerEvents } = require('../controllers/scannerController');

router.use(protect, scannerOrAdmin);

router.post('/scan', scanQR);
router.get('/search', searchGuest);
router.get('/events', getScannerEvents);
router.get('/stats/:eventId', getLiveStats);

module.exports = router;
