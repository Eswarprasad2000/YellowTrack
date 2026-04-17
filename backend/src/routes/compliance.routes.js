const { Router } = require('express');
const complianceController = require('../controllers/compliance.controller');
const { authenticate } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

const router = Router();

router.put('/:id', authenticate, complianceController.updateExpiry);
router.post('/:id/upload', authenticate, upload.single('document'), complianceController.uploadDocument);
router.post('/:id/renew', authenticate, upload.single('document'), complianceController.renewDocument);
router.get('/history/:vehicleId/:type', authenticate, complianceController.getHistory);

module.exports = router;
