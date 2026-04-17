const driverService = require('../services/driver.service');
const { createDriverSchema, updateDriverSchema, assignDriverSchema } = require('../validations/driver.validation');
const { uploadDriverDocSchema } = require('../validations/document.validation');
const { success } = require('../utils/response');

const create = async (req, res, next) => {
  try {
    const validated = createDriverSchema.parse(req.body);
    const driver = await driverService.createDriver(validated);
    return success(res, driver, 'Driver created successfully', 201);
  } catch (err) {
    next(err);
  }
};

const getAll = async (req, res, next) => {
  try {
    const drivers = await driverService.getAllDrivers();
    return success(res, drivers, 'Drivers fetched successfully');
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const driver = await driverService.getDriverById(req.params.id);
    return success(res, driver, 'Driver fetched successfully');
  } catch (err) {
    next(err);
  }
};

const assign = async (req, res, next) => {
  try {
    const { vehicleId } = assignDriverSchema.parse(req.body);
    const mapping = await driverService.assignDriverToVehicle(req.params.id, vehicleId);
    return success(res, mapping, 'Driver assigned to vehicle successfully');
  } catch (err) {
    next(err);
  }
};

const uploadDocument = async (req, res, next) => {
  try {
    const validated = uploadDriverDocSchema.parse(req.body);
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'File is required' });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const doc = await driverService.uploadDriverDocument(req.params.id, validated, fileUrl);
    return success(res, doc, 'Driver document uploaded successfully');
  } catch (err) {
    next(err);
  }
};

const autoCreate = async (req, res, next) => {
  try {
    const { licenseNumber } = req.body;
    if (!licenseNumber || licenseNumber.length < 5) {
      return res.status(400).json({ success: false, message: 'Valid license number is required' });
    }
    const driver = await driverService.autoCreateDriver(licenseNumber);
    return success(res, driver, 'Driver verified and created successfully', 201);
  } catch (err) {
    next(err);
  }
};

const updateDocExpiry = async (req, res, next) => {
  try {
    const { expiryDate, lifetime } = req.body;
    const finalExpiry = (lifetime === true || lifetime === 'true') ? null : expiryDate;
    if (!lifetime && !expiryDate) return res.status(400).json({ success: false, message: 'Expiry date or lifetime flag is required' });
    const driverRepository = require('../repositories/driver.repository');
    const doc = await driverRepository.updateDocumentExpiry(req.params.docId, finalExpiry);
    return success(res, doc, 'Document expiry updated');
  } catch (err) { next(err); }
};

const getDocHistory = async (req, res, next) => {
  try {
    const history = await driverService.getDocumentHistory(req.params.driverId, req.params.type);
    return success(res, history, 'Document history fetched');
  } catch (err) { next(err); }
};

const renewDocument = async (req, res, next) => {
  try {
    const { expiryDate, type, lifetime } = req.body;
    const fileUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const doc = await driverService.renewDriverDocument(
      req.params.id,
      req.params.docId,
      { expiryDate: expiryDate || null, lifetime: lifetime === true || lifetime === 'true' },
      fileUrl
    );
    return success(res, doc, 'Document renewed successfully', 201);
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const validated = updateDriverSchema.parse(req.body);
    const driver = await driverService.updateDriver(req.params.id, validated);
    return success(res, driver, 'Driver updated successfully');
  } catch (err) {
    next(err);
  }
};

const complianceStats = async (req, res, next) => {
  try {
    const stats = await driverService.getDriverComplianceStats();
    return success(res, stats, 'Driver compliance stats fetched');
  } catch (err) { next(err); }
};

const toggleVerification = async (req, res, next) => {
  try {
    const driverRepository = require('../repositories/driver.repository');
    const driver = await driverRepository.findById(req.params.id);
    if (!driver) return res.status(404).json({ success: false, message: 'Driver not found' });
    const newVerified = !driver.adminVerified;
    // When unverifying, also clear selfVerifiedAt so driver can edit again
    const updateData = newVerified
      ? { adminVerified: true }
      : { adminVerified: false, selfVerifiedAt: null };
    const updated = await driverRepository.update(req.params.id, updateData);
    return success(res, updated, `Driver ${updated.adminVerified ? 'verified' : 'unverified'} successfully`);
  } catch (err) { next(err); }
};

module.exports = { create, autoCreate, getAll, getById, update, assign, uploadDocument, updateDocExpiry, complianceStats, getDocHistory, renewDocument, toggleVerification };
