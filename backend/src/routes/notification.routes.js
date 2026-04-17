const { Router } = require('express');
const notificationController = require('../controllers/notification.controller');
const { authenticate } = require('../middlewares/auth');

const router = Router();

router.use(authenticate);
router.get('/', notificationController.getAll);
router.get('/unread-count', notificationController.getUnreadCount);
router.put('/:id/read', notificationController.markAsRead);
router.put('/read-all', notificationController.markAllAsRead);

module.exports = router;
