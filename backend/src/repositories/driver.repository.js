const prisma = require('../config/prisma');

const findAll = async () => {
  return prisma.driver.findMany({
    include: {
      documents: { where: { isActive: true }, orderBy: { createdAt: 'desc' } },
      vehicleMappings: {
        where: { isActive: true },
        include: { vehicle: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
};

const findById = async (id) => {
  return prisma.driver.findUnique({
    where: { id },
    include: {
      documents: { where: { isActive: true }, orderBy: { createdAt: 'desc' } },
      vehicleMappings: {
        orderBy: { assignedAt: 'desc' },
        include: { vehicle: true },
      },
    },
  });
};

const findByLicenseNumber = async (licenseNumber) => {
  return prisma.driver.findUnique({ where: { licenseNumber } });
};

const findByVerificationToken = async (token) => {
  return prisma.driver.findUnique({ where: { verificationToken: token } });
};

const create = async (data) => {
  return prisma.driver.create({ data });
};

const assignToVehicle = async (driverId, vehicleId) => {
  // Deactivate existing mapping for this vehicle
  await prisma.vehicleDriverMapping.updateMany({
    where: { vehicleId, isActive: true },
    data: { isActive: false, unassignedAt: new Date() },
  });
  // Also deactivate any active mapping for this driver on other vehicles
  await prisma.vehicleDriverMapping.updateMany({
    where: { driverId, isActive: true },
    data: { isActive: false, unassignedAt: new Date() },
  });

  return prisma.vehicleDriverMapping.create({
    data: { driverId, vehicleId },
    include: { driver: true, vehicle: true },
  });
};

const createDocument = async (data) => {
  return prisma.driverDocument.create({ data });
};

const updateDocumentExpiry = async (docId, expiryDate) => {
  if (!expiryDate) {
    return prisma.driverDocument.update({
      where: { id: docId },
      data: { expiryDate: null, status: 'GREEN' },
    });
  }
  const days = Math.ceil((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const status = days <= 0 ? 'RED' : days <= 7 ? 'ORANGE' : days <= 30 ? 'YELLOW' : 'GREEN';
  return prisma.driverDocument.update({
    where: { id: docId },
    data: { expiryDate: new Date(expiryDate), status },
  });
};

const findActiveByDriverAndType = async (driverId, type) => {
  return prisma.driverDocument.findFirst({
    where: { driverId, type, isActive: true },
  });
};

const findDocById = async (id) => {
  return prisma.driverDocument.findUnique({ where: { id } });
};

const renewDocument = async (oldDocId, newData) => {
  return prisma.$transaction(async (tx) => {
    await tx.driverDocument.update({
      where: { id: oldDocId },
      data: { isActive: false, archivedAt: new Date() },
    });
    return tx.driverDocument.create({ data: newData });
  });
};

const getDocHistory = async (driverId, type) => {
  return prisma.driverDocument.findMany({
    where: { driverId, type },
    orderBy: { createdAt: 'desc' },
  });
};

const update = async (id, data) => {
  return prisma.driver.update({
    where: { id },
    data,
    include: {
      documents: { orderBy: { createdAt: 'desc' } },
      vehicleMappings: {
        orderBy: { assignedAt: 'desc' },
        include: { vehicle: true },
      },
    },
  });
};

module.exports = { findAll, findById, findByLicenseNumber, findByVerificationToken, create, update, assignToVehicle, createDocument, updateDocumentExpiry, findActiveByDriverAndType, findDocById, renewDocument, getDocHistory };
