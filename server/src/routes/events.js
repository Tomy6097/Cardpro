const router = require('express').Router();
const { protect, adminOnly } = require('../middleware/auth');
const { imageUpload, videoUpload } = require('../middleware/upload');
const {
  createEvent, getEvents, getEvent, updateEvent, deleteEvent,
  uploadTemplate, uploadVideo, deleteVideo, updateCardConfig, getEventStats,
  updateWebsiteTheme, uploadDressCodeImage, deleteDressCodeImage,
  uploadEventPhoto, deleteEventPhoto, updateDressCodeColors,
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
router.delete('/:id/video', adminOnly, deleteVideo);
router.put('/:id/card-config', adminOnly, updateCardConfig);
router.put('/:id/website-theme', adminOnly, updateWebsiteTheme);
router.put('/:id/dresscode-colors', adminOnly, updateDressCodeColors);
router.post('/:id/dresscode', adminOnly, imageUpload.single('image'), uploadDressCodeImage);
router.delete('/:id/dresscode/:imageId', adminOnly, deleteDressCodeImage);
router.post('/:id/photos', adminOnly, imageUpload.single('image'), uploadEventPhoto);
router.delete('/:id/photos/:photoId', adminOnly, deleteEventPhoto);

module.exports = router;
