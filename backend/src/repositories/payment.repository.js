const prisma = require('../config/prisma');

const create = async ({ totalAmount, method, transactionId, paidBy, challanIds }) => {
  return prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: { totalAmount, method, transactionId, paidBy, status: 'SUCCESS' },
    });

    await tx.challan.updateMany({
      where: { id: { in: challanIds } },
      data: { status: 'PAID', paidAt: new Date(), paymentId: payment.id },
    });

    return tx.payment.findUnique({
      where: { id: payment.id },
      include: { challans: { include: { vehicle: true } } },
    });
  });
};

const findById = async (id) => {
  return prisma.payment.findUnique({
    where: { id },
    include: { challans: { include: { vehicle: true } } },
  });
};

const findAll = async ({ page = 1, limit = 20 }) => {
  const skip = (page - 1) * limit;
  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: { challans: { include: { vehicle: true } } },
    }),
    prisma.payment.count(),
  ]);
  return { payments, total, page, totalPages: Math.ceil(total / limit) };
};

module.exports = { create, findById, findAll };
