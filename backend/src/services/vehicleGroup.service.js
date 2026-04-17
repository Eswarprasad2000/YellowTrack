const vehicleGroupRepository = require('../repositories/vehicleGroup.repository');
const AppError = require('../utils/AppError');

const getAll = async () => vehicleGroupRepository.findAll();

const getById = async (id) => {
  const group = await vehicleGroupRepository.findById(id);
  if (!group) throw new AppError('Vehicle group not found', 404);
  return group;
};

const create = async (data) => {
  const { requiredDocTypeIds, ...groupData } = data;
  const group = await vehicleGroupRepository.create(groupData);

  if (requiredDocTypeIds && requiredDocTypeIds.length > 0) {
    await vehicleGroupRepository.setRequiredDocTypes(group.id, requiredDocTypeIds);
  } else {
    // Default: link all system doc types
    const prisma = require('../config/prisma');
    const systemTypes = await prisma.documentType.findMany({ where: { isSystem: true, isActive: true } });
    await vehicleGroupRepository.setRequiredDocTypes(group.id, systemTypes.map((dt) => dt.id));
  }

  return vehicleGroupRepository.findById(group.id);
};

const update = async (id, data) => {
  await getById(id);
  const { requiredDocTypeIds, ...groupData } = data;

  if (Object.keys(groupData).length > 0) {
    await vehicleGroupRepository.update(id, groupData);
  }

  if (requiredDocTypeIds !== undefined) {
    await vehicleGroupRepository.setRequiredDocTypes(id, requiredDocTypeIds);
  }

  return vehicleGroupRepository.findById(id);
};

const remove = async (id) => {
  const count = await vehicleGroupRepository.getVehicleCount(id);
  if (count > 0) throw new AppError(`Cannot delete group with ${count} assigned vehicle${count > 1 ? 's' : ''}. Reassign them first.`, 400);
  return vehicleGroupRepository.remove(id);
};

module.exports = { getAll, getById, create, update, remove };
