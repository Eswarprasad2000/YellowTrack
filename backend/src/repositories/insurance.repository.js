const prisma = require('../config/prisma');

const findAll = async ({ page = 1, limit = 20, status, search } = {}) => {
  const skip = (page - 1) * Number(limit);
  const where = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { policyNumber: { contains: search, mode: 'insensitive' } },
      { insurer: { contains: search, mode: 'insensitive' } },
      { vehicle: { registrationNumber: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [policies, total] = await Promise.all([
    prisma.insurancePolicy.findMany({ where, skip, take: Number(limit), orderBy: { createdAt: 'desc' }, include: { vehicle: true } }),
    prisma.insurancePolicy.count({ where }),
  ]);
  return { policies, total, page: Number(page), totalPages: Math.ceil(total / Number(limit)) };
};

const findById = async (id) => prisma.insurancePolicy.findUnique({ where: { id }, include: { vehicle: true } });

const findByVehicleId = async (vehicleId) => prisma.insurancePolicy.findMany({ where: { vehicleId }, orderBy: { createdAt: 'desc' }, include: { vehicle: true } });

const findActiveByVehicleId = async (vehicleId) => prisma.insurancePolicy.findFirst({ where: { vehicleId, status: { in: ['ACTIVE', 'EXPIRING'] } }, include: { vehicle: true } });

const create = async (data) => prisma.insurancePolicy.create({ data, include: { vehicle: true } });

const update = async (id, data) => prisma.insurancePolicy.update({ where: { id }, data, include: { vehicle: true } });

const getStats = async () => {
  const [total, active, expiring, expired, premiumAgg] = await Promise.all([
    prisma.insurancePolicy.count(),
    prisma.insurancePolicy.count({ where: { status: 'ACTIVE' } }),
    prisma.insurancePolicy.count({ where: { status: 'EXPIRING' } }),
    prisma.insurancePolicy.count({ where: { status: 'EXPIRED' } }),
    prisma.insurancePolicy.aggregate({ where: { status: { in: ['ACTIVE', 'EXPIRING'] } }, _sum: { premium: true } }),
  ]);
  return { total, active, expiring, expired, totalPremium: premiumAgg._sum.premium || 0 };
};

const findAllActive = async () => prisma.insurancePolicy.findMany({ where: { status: { in: ['ACTIVE', 'EXPIRING'] }, expiryDate: { not: null } }, include: { vehicle: true } });

module.exports = { findAll, findById, findByVehicleId, findActiveByVehicleId, create, update, getStats, findAllActive };
