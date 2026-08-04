const router = require('express').Router();
const { getEventPublic, getGuestInvitation, getPublicSettings } = require('../controllers/publicController');

router.get('/event/:slug', getEventPublic);
router.get('/event/:slug/invitation', getGuestInvitation);
router.get('/settings', getPublicSettings);

module.exports = router;
