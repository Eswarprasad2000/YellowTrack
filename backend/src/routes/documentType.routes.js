const { Router } = require('express');
const { authenticate } = require('../middlewares/auth');
const ctrl = require('../controllers/documentType.controller');

const router = Router();

router.get('/', authenticate, ctrl.getAll);
router.get('/by-group/:groupId', authenticate, ctrl.getByGroupId);
router.get('/:id', authenticate, ctrl.getById);
router.post('/', authenticate, ctrl.create);
router.put('/:id', authenticate, ctrl.update);
router.delete('/:id', authenticate, ctrl.remove);

module.exports = router;
