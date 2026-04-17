const prisma = require('../config/prisma');

const findAll = async () => {
  return prisma.vehicleGroup.findMany({
    orderBy: { order: 'asc' },
    include: {
      _count: { select: { vehicles: true } },
      requiredDocTypes: { include: { documentType: true } },
    },
  });
};

const findById = async (id) => {
  return prisma.vehicleGroup.findUnique({
    where: { id },
    include: {
      _count: { select: { vehicles: true } },
      requiredDocTypes: { include: { documentType: true } },
    },
  });
};

const create = async (data) => prisma.vehicleGroup.create({ data });
const update = async (id, data) => prisma.vehicleGroup.update({ where: { id }, data });
const remove = async (id) => prisma.vehicleGroup.delete({ where: { id } });
const getVehicleCount = async (id) => prisma.vehicle.count({ where: { groupId: id } });

const setRequiredDocTypes = async (groupId, documentTypeIds) => {
  // Delete existing joins and recreate
  await prisma.groupDocumentType.deleteMany({ where: { groupId } });
  if (documentTypeIds.length > 0) {
    await prisma.groupDocumentType.createMany({
      data: documentTypeIds.map((documentTypeId) => ({ groupId, documentTypeId })),
    });
  }
};

module.exports = { findAll, findById, create, update, remove, getVehicleCount, setRequiredDocTypes };
