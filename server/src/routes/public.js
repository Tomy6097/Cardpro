const router = require('express').Router();
const { getEventPublic, getGuestInvitation } = require('../controllers/publicController');

router.get('/event/:slug', getEventPublic);
router.get('/event/:slug/invitation', getGuestInvitation);

module.exports = router;
