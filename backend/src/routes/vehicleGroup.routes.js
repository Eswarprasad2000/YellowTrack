const { Router } = require('express');
const controller = require('../controllers/vehicleGroup.controller');
const { authenticate } = require('../middlewares/auth');

const router = Router();

router.get('/', authenticate, controller.getAll);
router.get('/:id', authenticate, controller.getById);
router.post('/', authenticate, controller.create);
router.put('/:id', authenticate, controller.update);
router.delete('/:id', authenticate, controller.remove);

module.exports = router;
