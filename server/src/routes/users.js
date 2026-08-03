const router = require('express').Router();
const { protect, adminOnly } = require('../middleware/auth');
const { createScanner, getScanners, getScanner, updateScanner, deleteScanner } = require('../controllers/userController');

router.use(protect, adminOnly);

router.get('/scanners', getScanners);
router.post('/scanners', createScanner);
router.get('/scanners/:id', getScanner);
router.put('/scanners/:id', updateScanner);
router.delete('/scanners/:id', deleteScanner);

module.exports = router;
