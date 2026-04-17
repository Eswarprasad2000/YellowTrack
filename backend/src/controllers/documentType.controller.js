const documentTypeService = require('../services/documentType.service');
const { createDocTypeSchema, updateDocTypeSchema } = require('../validations/documentType.validation');
const { success } = require('../utils/response');

const getAll = async (req, res, next) => {
  try { return success(res, await documentTypeService.getAll(), 'Document types fetched'); }
  catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try { return success(res, await documentTypeService.getById(req.params.id), 'Document type fetched'); }
  catch (err) { next(err); }
};

const getByGroupId = async (req, res, next) => {
  try { return success(res, await documentTypeService.getByGroupId(req.params.groupId), 'Group document types fetched'); }
  catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try { return success(res, await documentTypeService.create(createDocTypeSchema.parse(req.body)), 'Document type created', 201); }
  catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try { return success(res, await documentTypeService.update(req.params.id, updateDocTypeSchema.parse(req.body)), 'Document type updated'); }
  catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try { await documentTypeService.remove(req.params.id); return success(res, null, 'Document type deleted'); }
  catch (err) { next(err); }
};

module.exports = { getAll, getById, getByGroupId, create, update, remove };
