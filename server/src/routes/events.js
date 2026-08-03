const router = require('express').Router();
const { protect, adminOnly } = require('../middleware/auth');
const { imageUpload, videoUpload } = require('../middleware/upload');
const {
  createEvent, getEvents, getEvent, updateEvent, deleteEvent,
  uploadTemplate, uploadVideo, updateCardConfig, getEventStats,
} = require('../controllers/eventController');

router.use(protect);

router.get('/', getEvents);
router.post('/', adminOnly, createEvent);
router.get('/:id', getEvent);
router.put('/:id', adminOnly, updateEvent);
router.delete('/:id', adminOnly, deleteEvent);
router.get('/:id/stats', getEventStats);
router.post('/:id/template', adminOnly, imageUpload.single('template'), uploadTemplate);
router.post('/:id/video', adminOnly, videoUpload.single('video'), uploadVideo);
router.put('/:id/card-config', adminOnly, updateCardConfig);

module.exports = router;
