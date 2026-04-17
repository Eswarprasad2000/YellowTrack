const insuranceService = require('../services/insurance.service');
const { savePolicySchema, purchaseSchema, getInsuranceQuerySchema } = require('../validations/insurance.validation');
const { success } = require('../utils/response');

const upload = async (req, res, next) => {
  try {
    const { vehicleId } = req.body;
    if (!vehicleId) return res.status(400).json({ success: false, message: 'Vehicle ID is required' });
    if (!req.file) return res.status(400).json({ success: false, message: 'PDF file is required' });

    const filePath = req.file.path;
    const documentUrl = `/uploads/${req.file.filename}`;
    const result = await insuranceService.uploadAndExtract(vehicleId, filePath, documentUrl);
    return success(res, result, 'Insurance PDF uploaded and parsed', 201);
  } catch (err) { next(err); }
};

const save = async (req, res, next) => {
  try {
    const data = savePolicySchema.parse(req.body);
    const policy = await insuranceService.savePolicy(data);
    return success(res, policy, 'Insurance policy saved', 201);
  } catch (err) { next(err); }
};

const getPlans = async (req, res, next) => {
  try {
    const { vehicleId } = req.body;
    if (!vehicleId) return res.status(400).json({ success: false, message: 'Vehicle ID is required' });
    const result = await insuranceService.getPlans(vehicleId);
    return success(res, result, 'Insurance plans fetched');
  } catch (err) { next(err); }
};

const purchase = async (req, res, next) => {
  try {
    const data = purchaseSchema.parse(req.body);
    const result = await insuranceService.purchase(data.vehicleId, data);
    return success(res, result, 'Insurance purchased successfully', 201);
  } catch (err) { next(err); }
};

const getAll = async (req, res, next) => {
  try {
    const query = getInsuranceQuerySchema.parse(req.query);
    return success(res, await insuranceService.getAll(query), 'Policies fetched');
  } catch (err) { next(err); }
};

const getStats = async (req, res, next) => {
  try { return success(res, await insuranceService.getStats(), 'Stats fetched'); }
  catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try { return success(res, await insuranceService.getById(req.params.id), 'Policy fetched'); }
  catch (err) { next(err); }
};

const getByVehicle = async (req, res, next) => {
  try { return success(res, await insuranceService.getByVehicle(req.params.vehicleId), 'Policies fetched'); }
  catch (err) { next(err); }
};

module.exports = { upload, save, getPlans, purchase, getAll, getStats, getById, getByVehicle };
