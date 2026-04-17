const { Router } = require('express');
const fastagController = require('../controllers/fastag.controller');
const { authenticate } = require('../middlewares/auth');

const router = Router();

// Static routes first
router.get('/', authenticate, fastagController.getAll);
router.get('/stats', authenticate, fastagController.getStats);
router.post('/', authenticate, fastagController.create);

// Named param routes before generic :id
router.get('/vehicle/:vehicleId', authenticate, fastagController.getByVehicle);

// Dynamic :id routes last
router.get('/:id', authenticate, fastagController.getById);
router.get('/:id/transactions', authenticate, fastagController.getTransactions);
router.post('/:id/recharge', authenticate, fastagController.recharge);

module.exports = router;
