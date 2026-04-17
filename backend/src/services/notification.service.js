const notificationRepository = require('../repositories/notification.repository');
const prisma = require('../config/prisma');

const create = async ({ userId, type, title, message, entityId }) => {
  // If no specific userId, notify all admins
  if (!userId) {
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' } });
    if (admins.length) {
      const notifications = admins.map((admin) => ({
        userId: admin.id,
        type,
        title,
        message,
        entityId: entityId || undefined,
      }));
      await notificationRepository.createMany(notifications);
    }
    return;
  }
  return notificationRepository.create({ userId, type, title, message, entityId });
};

const getByUserId = async (userId, query) => {
  return notificationRepository.findByUserId(userId, query);
};

const markAsRead = async (id, userId) => {
  return notificationRepository.markAsRead(id, userId);
};

const markAllAsRead = async (userId) => {
  return notificationRepository.markAllAsRead(userId);
};

const getUnreadCount = async (userId) => {
  return notificationRepository.getUnreadCount(userId);
};

module.exports = { create, getByUserId, markAsRead, markAllAsRead, getUnreadCount };
