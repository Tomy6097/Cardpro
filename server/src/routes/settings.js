const router = require('express').Router();
const { protect, adminOnly } = require('../middleware/auth');
const { imageUpload } = require('../middleware/upload');
const { getSettings, updateSettings, uploadLogo } = require('../controllers/settingsController');

router.use(protect, adminOnly);

router.get('/', getSettings);
router.put('/', updateSettings);
router.post('/logo', imageUpload.single('logo'), uploadLogo);

module.exports = router;
