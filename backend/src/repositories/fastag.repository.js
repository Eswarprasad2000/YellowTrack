const prisma = require('../config/prisma');

const findById = async (id) => {
  return prisma.fastag.findUnique({
    where: { id },
    include: { vehicle: true, transactions: { orderBy: { createdAt: 'desc' }, take: 10 } },
  });
};

const findByVehicleId = async (vehicleId) => {
  return prisma.fastag.findMany({
    where: { vehicleId },
    orderBy: { createdAt: 'desc' },
    include: { transactions: { orderBy: { createdAt: 'desc' }, take: 5 } },
  });
};

const findActiveByVehicleId = async (vehicleId) => {
  return prisma.fastag.findFirst({
    where: { vehicleId, isActive: true },
    include: { vehicle: true, transactions: { orderBy: { createdAt: 'desc' }, take: 10 } },
  });
};

const findByTagId = async (tagId) => {
  return prisma.fastag.findUnique({ where: { tagId } });
};

const findAll = async ({ page = 1, limit = 20, status, search } = {}) => {
  const skip = (page - 1) * limit;
  const where = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { tagId: { contains: search, mode: 'insensitive' } },
      { vehicle: { registrationNumber: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [fastags, total] = await Promise.all([
    prisma.fastag.findMany({
      where, skip, take: limit,
      orderBy: { createdAt: 'desc' },
      include: { vehicle: true },
    }),
    prisma.fastag.count({ where }),
  ]);

  return { fastags, total, page, totalPages: Math.ceil(total / limit) };
};

const create = async (data) => prisma.fastag.create({ data, include: { vehicle: true } });

const update = async (id, data) => prisma.fastag.update({ where: { id }, data });

const deactivateByVehicleId = async (vehicleId) => {
  return prisma.fastag.updateMany({
    where: { vehicleId, isActive: true },
    data: { isActive: false, status: 'INACTIVE' },
  });
};

const createTransaction = async (data) => prisma.fastagTransaction.create({ data });

const getTransactions = async (fastagId, { page = 1, limit = 20 } = {}) => {
  limit = Number(limit) || 20;
  page = Number(page) || 1;
  const skip = (page - 1) * limit;
  const [transactions, total] = await Promise.all([
    prisma.fastagTransaction.findMany({
      where: { fastagId }, skip, take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.fastagTransaction.count({ where: { fastagId } }),
  ]);
  return { transactions, total, page, totalPages: Math.ceil(total / limit) };
};

const getStats = async () => {
  const [total, active, balanceAgg, lowBalance] = await Promise.all([
    prisma.fastag.count(),
    prisma.fastag.count({ where: { isActive: true } }),
    prisma.fastag.aggregate({ where: { isActive: true }, _sum: { balance: true } }),
    prisma.fastag.count({ where: { isActive: true, balance: { lt: 100 } } }),
  ]);
  return { total, active, totalBalance: balanceAgg._sum.balance || 0, lowBalance };
};

const findAllActive = async () => {
  return prisma.fastag.findMany({
    where: { isActive: true, balance: { gt: 0 } },
    include: { vehicle: true },
  });
};

module.exports = { findById, findByVehicleId, findActiveByVehicleId, findByTagId, findAll, create, update, deactivateByVehicleId, createTransaction, getTransactions, getStats, findAllActive };
