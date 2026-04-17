const { Router } = require('express');
const challanController = require('../controllers/challan.controller');
const { authenticate } = require('../middlewares/auth');

const router = Router();

router.use(authenticate);
router.get('/', challanController.getAll);
router.get('/stats', challanController.getStats);

module.exports = router;
