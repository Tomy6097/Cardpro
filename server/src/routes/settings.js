const router = require('express').Router();
const { protect, adminOnly } = require('../middleware/auth');
const { imageUpload } = require('../middleware/upload');
const {
  getSettings,
  updateSettings,
  uploadLogo,
  getWhatsappTemplates,
  addWhatsappTemplate,
  selectWhatsappTemplate,
  deleteWhatsappTemplate,
} = require('../controllers/settingsController');

router.use(protect, adminOnly);

router.get('/', getSettings);
router.put('/', updateSettings);
router.post('/logo', imageUpload.single('logo'), uploadLogo);

// ✅ NEW: WhatsApp Template Management Routes
router.get('/whatsapp-templates', getWhatsappTemplates);
router.post('/whatsapp-templates', addWhatsappTemplate);
router.put('/whatsapp-templates/select', selectWhatsappTemplate);
router.delete('/whatsapp-templates/:contentSid', deleteWhatsappTemplate);

module.exports = router;
