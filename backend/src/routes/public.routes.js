const { Router } = require('express');
const publicController = require('../controllers/public.controller');
const upload = require('../middlewares/upload');

const router = Router();

// No authentication required
router.get('/vehicles/:id', publicController.getVehiclePublic);

// Driver self-verification (public, no auth — token is the auth)
router.get('/driver/verify/:token', publicController.getDriverByToken);
router.put('/driver/verify/:token', publicController.updateDriverByToken);
router.post('/driver/verify/:token/photo', upload.single('photo'), publicController.uploadDriverPhoto);
router.post('/driver/verify/:token/address-photo/:type', upload.single('photo'), publicController.uploadAddressPhoto);
router.delete('/driver/verify/:token/address-photo', publicController.deleteAddressPhoto);

module.exports = router;
