const prisma = require('../config/prisma');

const findById = async (id) => {
  return prisma.challan.findUnique({
    where: { id },
    include: { vehicle: true, payment: true },
  });
};

const findByVehicleId = async (vehicleId) => {
  return prisma.challan.findMany({
    where: { vehicleId },
    orderBy: { issuedAt: 'desc' },
    include: { payment: true },
  });
};

const findAll = async ({ page = 1, limit = 20, status, vehicleId, search } = {}) => {
  const skip = (page - 1) * limit;
  const where = {};
  if (status) where.status = status;
  if (vehicleId) where.vehicleId = vehicleId;
  if (search) {
    where.vehicle = { registrationNumber: { contains: search, mode: 'insensitive' } };
  }

  const [challans, total] = await Promise.all([
    prisma.challan.findMany({
      where,
      skip,
      take: limit,
      orderBy: { issuedAt: 'desc' },
      include: { vehicle: true, payment: true },
    }),
    prisma.challan.count({ where }),
  ]);
  return { challans, total, page, totalPages: Math.ceil(total / limit) };
};

const createMany = async (challans) => {
  return prisma.challan.createMany({ data: challans });
};

const getPendingSummary = async (vehicleId) => {
  const where = { status: 'PENDING' };
  if (vehicleId) where.vehicleId = vehicleId;

  const result = await prisma.challan.aggregate({
    where,
    _sum: { amount: true },
    _count: true,
  });

  return {
    pendingCount: result._count,
    pendingAmount: result._sum.amount || 0,
  };
};

const getStats = async () => {
  const [pending, paid, total] = await Promise.all([
    prisma.challan.aggregate({ where: { status: 'PENDING' }, _sum: { amount: true }, _count: true }),
    prisma.challan.aggregate({ where: { status: 'PAID' }, _sum: { amount: true }, _count: true }),
    prisma.challan.count(),
  ]);
  return {
    total,
    pending: { count: pending._count, amount: pending._sum.amount || 0 },
    paid: { count: paid._count, amount: paid._sum.amount || 0 },
  };
};

module.exports = { findById, findByVehicleId, findAll, createMany, getPendingSummary, getStats };
