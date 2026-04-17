const vehicleGroupService = require('../services/vehicleGroup.service');
const { createGroupSchema, updateGroupSchema } = require('../validations/vehicleGroup.validation');
const { success } = require('../utils/response');

const getAll = async (req, res, next) => {
  try { return success(res, await vehicleGroupService.getAll(), 'Vehicle groups fetched'); }
  catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try { return success(res, await vehicleGroupService.getById(req.params.id), 'Vehicle group fetched'); }
  catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try { return success(res, await vehicleGroupService.create(createGroupSchema.parse(req.body)), 'Vehicle group created', 201); }
  catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try { return success(res, await vehicleGroupService.update(req.params.id, updateGroupSchema.parse(req.body)), 'Vehicle group updated'); }
  catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try { await vehicleGroupService.remove(req.params.id); return success(res, null, 'Vehicle group deleted'); }
  catch (err) { next(err); }
};

module.exports = { getAll, getById, create, update, remove };
