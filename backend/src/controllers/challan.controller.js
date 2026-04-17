const challanRepository = require('../repositories/challan.repository');
const { success } = require('../utils/response');

const getByVehicleId = async (req, res, next) => {
  try {
    const challans = await challanRepository.findByVehicleId(req.params.id);
    const summary = await challanRepository.getPendingSummary(req.params.id);
    return success(res, { challans, summary }, 'Challans fetched successfully');
  } catch (err) {
    next(err);
  }
};

const getAll = async (req, res, next) => {
  try {
    const result = await challanRepository.findAll(req.query);
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

const getStats = async (req, res, next) => {
  try {
    const stats = await challanRepository.getStats();
    return success(res, stats);
  } catch (err) {
    next(err);
  }
};

module.exports = { getByVehicleId, getAll, getStats };
