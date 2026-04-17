const fastagService = require('../services/fastag.service');
const { createFastagSchema, rechargeFastagSchema, getFastagsQuerySchema } = require('../validations/fastag.validation');
const { success } = require('../utils/response');

const getAll = async (req, res, next) => {
  try {
    const query = getFastagsQuerySchema.parse(req.query);
    return success(res, await fastagService.getAll(query), 'FASTags fetched');
  } catch (err) { next(err); }
};

const getStats = async (req, res, next) => {
  try { return success(res, await fastagService.getStats(), 'FASTag stats fetched'); }
  catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try { return success(res, await fastagService.getById(req.params.id), 'FASTag fetched'); }
  catch (err) { next(err); }
};

const getByVehicle = async (req, res, next) => {
  try { return success(res, await fastagService.getByVehicle(req.params.vehicleId), 'FASTag fetched'); }
  catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const { vehicleId, tagId, provider, initialBalance } = createFastagSchema.parse(req.body);
    const fastag = await fastagService.createFastag(vehicleId, tagId, provider, initialBalance);
    return success(res, fastag, 'FASTag created successfully', 201);
  } catch (err) { next(err); }
};

const recharge = async (req, res, next) => {
  try {
    const { amount } = rechargeFastagSchema.parse(req.body);
    const fastag = await fastagService.rechargeFastag(req.params.id, amount);
    return success(res, fastag, 'FASTag recharged successfully');
  } catch (err) { next(err); }
};

const getTransactions = async (req, res, next) => {
  try {
    const result = await fastagService.getTransactions(req.params.id, req.query);
    return success(res, result, 'Transactions fetched');
  } catch (err) { next(err); }
};

module.exports = { getAll, getStats, getById, getByVehicle, create, recharge, getTransactions };
