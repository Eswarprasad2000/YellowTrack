const { Router } = require('express');
const insuranceController = require('../controllers/insurance.controller');
const { authenticate } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

const router = Router();

router.get('/', authenticate, insuranceController.getAll);
router.get('/stats', authenticate, insuranceController.getStats);
router.get('/vehicle/:vehicleId', authenticate, insuranceController.getByVehicle);
router.get('/:id', authenticate, insuranceController.getById);
router.post('/upload', authenticate, upload.single('document'), insuranceController.upload);
router.post('/save', authenticate, insuranceController.save);
router.post('/plans', authenticate, insuranceController.getPlans);
router.post('/purchase', authenticate, insuranceController.purchase);

module.exports = router;
