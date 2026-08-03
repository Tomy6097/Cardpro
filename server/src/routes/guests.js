const router = require('express').Router();
const { protect, adminOnly } = require('../middleware/auth');
const { csvUpload } = require('../middleware/upload');
const {
  addGuest, importGuests, getGuests, getGuest, updateGuest,
  deleteGuest, restoreGuest, deleteAllGuests, restoreAllGuests,
  generateQRForGuest, generateAllQRCodes, downloadGuestCSV,
} = require('../controllers/guestController');

router.use(protect);

router.get('/event/:eventId', getGuests);
router.post('/event/:eventId', adminOnly, addGuest);
router.post('/event/:eventId/import', adminOnly, csvUpload.single('csv'), importGuests);
router.delete('/event/:eventId/all', adminOnly, deleteAllGuests);
router.post('/event/:eventId/restore-all', adminOnly, restoreAllGuests);
router.post('/event/:eventId/generate-all-qr', adminOnly, generateAllQRCodes);
router.get('/event/:eventId/download-csv', adminOnly, downloadGuestCSV);

router.get('/:id', getGuest);
router.put('/:id', adminOnly, updateGuest);
router.delete('/:id', adminOnly, deleteGuest);
router.post('/:id/restore', adminOnly, restoreGuest);
router.post('/:id/generate-qr', adminOnly, generateQRForGuest);

module.exports = router;
