const { Router } = require('express');
const paymentController = require('../controllers/payment.controller');
const { authenticate } = require('../middlewares/auth');

const router = Router();

router.use(authenticate);
router.post('/single', paymentController.paySingle);
router.post('/bulk', paymentController.payBulk);
router.get('/', paymentController.getAll);
router.get('/:id', paymentController.getById);

module.exports = router;
