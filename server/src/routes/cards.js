const router = require('express').Router();
const { protect, adminOnly } = require('../middleware/auth');
const { generateCard, generateAllCards, downloadCardPDF, getCardProgress } = require('../controllers/cardController');

router.use(protect, adminOnly);

router.post('/generate/:id', generateCard);
router.post('/generate-all/:eventId', generateAllCards);
router.get('/progress/:eventId', getCardProgress);
router.get('/download/:id', downloadCardPDF);

module.exports = router;
