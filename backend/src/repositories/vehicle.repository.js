const prisma = require('../config/prisma');

const findAll = async ({ page = 1, limit = 10, search, status, groupId }) => {
  const skip = (page - 1) * limit;

  const where = {};
  if (search) {
    where.OR = [
      { registrationNumber: { contains: search, mode: 'insensitive' } },
      { make: { contains: search, mode: 'insensitive' } },
      { model: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (status) {
    where.complianceDocuments = {
      some: { status },
    };
  }

  if (groupId) {
    where.groupId = groupId;
  }

  const [vehicles, total] = await Promise.all([
    prisma.vehicle.findMany({
      where,
      skip,
      take: limit,
      include: {
        group: true,
        complianceDocuments: { where: { isActive: true } },
        challans: { where: { status: 'PENDING' } },
        driverMappings: {
          where: { isActive: true },
          include: { driver: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.vehicle.count({ where }),
  ]);

  return {
    vehicles,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

const findById = async (id) => {
  return prisma.vehicle.findUnique({
    where: { id },
    include: {
      group: true,
      complianceDocuments: { where: { isActive: true } },
      challans: { orderBy: { issuedAt: 'desc' }, include: { payment: true } },
      driverMappings: {
        orderBy: { assignedAt: 'desc' },
        include: { driver: true },
      },
      tyres: { orderBy: { position: 'asc' } },
    },
  });
};

const update = async (id, data) => {
  return prisma.vehicle.update({ where: { id }, data });
};

const findByRegistrationNumber = async (registrationNumber) => {
  return prisma.vehicle.findUnique({
    where: { registrationNumber },
  });
};

const create = async (data) => {
  return prisma.vehicle.create({ data });
};

const getDashboardStats = async () => {
  const [totalVehicles, greenDocs, yellowDocs, orangeDocs, redDocs, pendingChallans] = await Promise.all([
    prisma.vehicle.count(),
    prisma.complianceDocument.count({ where: { status: 'GREEN' } }),
    prisma.complianceDocument.count({ where: { status: 'YELLOW' } }),
    prisma.complianceDocument.count({ where: { status: 'ORANGE' } }),
    prisma.complianceDocument.count({ where: { status: 'RED' } }),
    prisma.challan.aggregate({ where: { status: 'PENDING' }, _sum: { amount: true }, _count: true }),
  ]);

  return {
    totalVehicles,
    compliance: { green: greenDocs, yellow: yellowDocs, orange: orangeDocs, red: redDocs },
    challans: {
      pendingCount: pendingChallans._count,
      pendingAmount: pendingChallans._sum.amount || 0,
    },
  };
};

module.exports = { findAll, findById, findByRegistrationNumber, create, update, getDashboardStats };
