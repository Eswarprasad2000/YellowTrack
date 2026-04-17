const { Router } = require('express');
const authRoutes = require('./auth.routes');
const vehicleRoutes = require('./vehicle.routes');
const driverRoutes = require('./driver.routes');
const complianceRoutes = require('./compliance.routes');
const challanRoutes = require('./challan.routes');
const paymentRoutes = require('./payment.routes');
const notificationRoutes = require('./notification.routes');
const publicRoutes = require('./public.routes');
const vehicleGroupRoutes = require('./vehicleGroup.routes');
const fastagRoutes = require('./fastag.routes');
const insuranceRoutes = require('./insurance.routes');
const documentTypeRoutes = require('./documentType.routes');

const router = Router();

router.use('/auth', authRoutes);
router.use('/vehicles', vehicleRoutes);
router.use('/vehicle-groups', vehicleGroupRoutes);
router.use('/document-types', documentTypeRoutes);
router.use('/fastags', fastagRoutes);
router.use('/insurance', insuranceRoutes);
router.use('/drivers', driverRoutes);
router.use('/compliance', complianceRoutes);
router.use('/challans', challanRoutes);
router.use('/payments', paymentRoutes);
router.use('/notifications', notificationRoutes);
router.use('/public', publicRoutes);

module.exports = router;
