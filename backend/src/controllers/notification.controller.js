const notificationService = require('../services/notification.service');
const { success } = require('../utils/response');

const getAll = async (req, res, next) => {
  try {
    const result = await notificationService.getByUserId(req.user.id, req.query);
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

const getUnreadCount = async (req, res, next) => {
  try {
    const count = await notificationService.getUnreadCount(req.user.id);
    return success(res, { count });
  } catch (err) {
    next(err);
  }
};

const markAsRead = async (req, res, next) => {
  try {
    await notificationService.markAsRead(req.params.id, req.user.id);
    return success(res, null, 'Notification marked as read');
  } catch (err) {
    next(err);
  }
};

const markAllAsRead = async (req, res, next) => {
  try {
    await notificationService.markAllAsRead(req.user.id);
    return success(res, null, 'All notifications marked as read');
  } catch (err) {
    next(err);
  }
};

module.exports = { getAll, getUnreadCount, markAsRead, markAllAsRead };
