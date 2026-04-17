const prisma = require('../config/prisma');

const findByVehicleId = async (vehicleId, includeArchived = false) => {
  const where = { vehicleId };
  if (!includeArchived) where.isActive = true;
  return prisma.complianceDocument.findMany({
    where,
    orderBy: [{ isActive: 'desc' }, { type: 'asc' }, { createdAt: 'desc' }],
  });
};

const findAll = async () => {
  // Get all active compliance documents (isActive defaults to true)
  return prisma.complianceDocument.findMany({
    where: { isActive: { not: false } },
  });
};

const updateStatus = async (id, status) => {
  return prisma.complianceDocument.update({
    where: { id },
    data: { status, lastVerifiedAt: new Date() },
  });
};

const updateDocumentUrl = async (id, documentUrl) => {
  return prisma.complianceDocument.update({
    where: { id },
    data: { documentUrl },
  });
};

const updateExpiry = async (id, expiryDate, status) => {
  return prisma.complianceDocument.update({
    where: { id },
    data: { expiryDate, status, lastVerifiedAt: new Date() },
  });
};

const createMany = async (documents) => {
  return prisma.complianceDocument.createMany({ data: documents });
};

const findById = async (id) => {
  return prisma.complianceDocument.findUnique({ where: { id } });
};

// Renew: archive old doc & create new one
const renewDocument = async (oldDocId, newData) => {
  return prisma.$transaction(async (tx) => {
    // Archive the old document
    await tx.complianceDocument.update({
      where: { id: oldDocId },
      data: { isActive: false, archivedAt: new Date() },
    });

    // Create the new document
    const newDoc = await tx.complianceDocument.create({ data: newData });
    return newDoc;
  });
};

// Get history for a vehicle + doc type
const getHistory = async (vehicleId, type) => {
  return prisma.complianceDocument.findMany({
    where: { vehicleId, type },
    orderBy: { createdAt: 'desc' },
  });
};

module.exports = {
  findByVehicleId,
  findAll,
  updateStatus,
  updateDocumentUrl,
  updateExpiry,
  createMany,
  findById,
  renewDocument,
  getHistory,
};
