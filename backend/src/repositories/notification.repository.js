const prisma = require('../config/prisma');

const create = async (data) => {
  return prisma.notification.create({ data });
};

const createMany = async (notifications) => {
  return prisma.notification.createMany({ data: notifications });
};

const findByUserId = async (userId, { page = 1, limit = 20, unreadOnly = false }) => {
  const pg = parseInt(page, 10) || 1;
  const lim = parseInt(limit, 10) || 20;
  const skip = (pg - 1) * lim;
  const where = { userId, ...(unreadOnly ? { isRead: false } : {}) };
  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      skip,
      take: lim,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);
  return { notifications, total, unreadCount, page: pg, totalPages: Math.ceil(total / lim) };
};

const markAsRead = async (id, userId) => {
  return prisma.notification.updateMany({
    where: { id, userId },
    data: { isRead: true },
  });
};

const markAllAsRead = async (userId) => {
  return prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
};

const getUnreadCount = async (userId) => {
  return prisma.notification.count({ where: { userId, isRead: false } });
};

module.exports = { create, createMany, findByUserId, markAsRead, markAllAsRead, getUnreadCount };
