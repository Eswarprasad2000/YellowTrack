const documentTypeRepository = require('../repositories/documentType.repository');
const AppError = require('../utils/AppError');

const getAll = async () => documentTypeRepository.findAll();

const getById = async (id) => {
  const dt = await documentTypeRepository.findById(id);
  if (!dt) throw new AppError('Document type not found', 404);
  return dt;
};

const getByGroupId = async (groupId) => {
  return documentTypeRepository.findByGroupId(groupId);
};

const create = async (data) => {
  const existing = await documentTypeRepository.findByCode(data.code);
  if (existing) throw new AppError(`Document type with code "${data.code}" already exists`, 409);
  return documentTypeRepository.create({ ...data, isSystem: false });
};

const update = async (id, data) => {
  const dt = await getById(id);
  if (dt.isSystem && data.code) {
    throw new AppError('Cannot change the code of a system document type', 400);
  }
  return documentTypeRepository.update(id, data);
};

const remove = async (id) => {
  const dt = await getById(id);
  if (dt.isSystem) throw new AppError('Cannot delete a system document type', 400);
  const refCount = await documentTypeRepository.countGroupReferences(id);
  if (refCount > 0) {
    throw new AppError(`Cannot delete: this document type is assigned to ${refCount} group${refCount > 1 ? 's' : ''}. Remove it from all groups first.`, 400);
  }
  return documentTypeRepository.remove(id);
};

module.exports = { getAll, getById, getByGroupId, create, update, remove };
