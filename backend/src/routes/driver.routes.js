const { Router } = require('express');
const driverController = require('../controllers/driver.controller');
const { authenticate } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

const router = Router();

router.post('/', authenticate, driverController.create);
router.post('/auto', authenticate, driverController.autoCreate);
router.get('/', authenticate, driverController.getAll);
router.get('/stats', authenticate, driverController.complianceStats);
router.get('/:id', authenticate, driverController.getById);
router.put('/:id', authenticate, driverController.update);
router.patch('/:id/toggle-verification', authenticate, driverController.toggleVerification);
router.post('/:id/assign', authenticate, driverController.assign);
router.post('/:id/documents', authenticate, upload.single('document'), driverController.uploadDocument);
router.put('/documents/:docId/expiry', authenticate, driverController.updateDocExpiry);
router.get('/:driverId/documents/history/:type', authenticate, driverController.getDocHistory);
router.post('/:id/documents/:docId/renew', authenticate, upload.single('document'), driverController.renewDocument);

module.exports = router;
