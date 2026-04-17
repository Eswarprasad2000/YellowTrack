const { Router } = require('express');
const vehicleController = require('../controllers/vehicle.controller');
const complianceController = require('../controllers/compliance.controller');
const challanController = require('../controllers/challan.controller');
const { authenticate } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

const router = Router();

// Vehicle routes
router.post('/onboard', authenticate, upload.array('vehicleImages', 10), vehicleController.onboard);
router.post('/onboard-manual', authenticate, upload.any(), vehicleController.manualOnboard);
router.post('/:id/images', authenticate, upload.array('vehicleImages', 10), vehicleController.uploadImages);
router.post('/:id/invoice', authenticate, upload.single('invoice'), vehicleController.uploadInvoice);
router.delete('/:id/images', authenticate, vehicleController.deleteImage);
router.put('/:id/profile-image', authenticate, vehicleController.setProfileImage);
router.get('/', authenticate, vehicleController.getAll);
router.get('/stats', authenticate, vehicleController.getDashboardStats);
router.get('/:id', authenticate, vehicleController.getById);
router.patch('/:id/group', authenticate, vehicleController.updateGroup);
router.put('/:id/tyres', authenticate, vehicleController.upsertTyres);

// Expense routes
router.get('/expenses/report', authenticate, vehicleController.getExpenseReport);

// Service routes
router.get('/services/all', authenticate, vehicleController.getAllServices);
router.get('/:id/services', authenticate, vehicleController.getServices);
router.post('/:id/services', authenticate, upload.any(), vehicleController.createService);
router.put('/:id/services/:serviceId', authenticate, upload.any(), vehicleController.updateService);
router.delete('/:id/services/:serviceId', authenticate, vehicleController.deleteService);

// Expense routes (per vehicle)
router.get('/:id/expenses', authenticate, vehicleController.getExpenses);
router.post('/:id/expenses', authenticate, upload.single('proof'), vehicleController.createExpense);
router.put('/:id/expenses/:expenseId', authenticate, upload.single('proof'), vehicleController.updateExpense);
router.delete('/:id/expenses/:expenseId', authenticate, vehicleController.deleteExpense);

// Compliance routes (nested under vehicle)
router.get('/:id/compliance', authenticate, complianceController.getByVehicleId);

// Challan routes (nested under vehicle)
router.get('/:id/challans', authenticate, challanController.getByVehicleId);
router.post('/:id/challans/sync', authenticate, vehicleController.syncChallans);

module.exports = router;
