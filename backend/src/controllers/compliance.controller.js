const complianceService = require('../services/compliance.service');
const { uploadComplianceDocSchema } = require('../validations/document.validation');
const { success } = require('../utils/response');

const getByVehicleId = async (req, res, next) => {
  try {
    const docs = await complianceService.getComplianceByVehicleId(req.params.id);
    return success(res, docs, 'Compliance documents fetched successfully');
  } catch (err) {
    next(err);
  }
};

const uploadDocument = async (req, res, next) => {
  try {
    const { id: docId } = req.params;
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'File is required' });
    }

    const documentUrl = `/uploads/${req.file.filename}`;
    const doc = await complianceService.uploadDocument(docId, documentUrl);

    // Simulate OCR extraction
    console.log(`📄 [OCR SIMULATED] Extracting data from document: ${req.file.originalname}`);
    console.log(`   Document ID: ${docId}`);
    console.log(`   File stored at: ${documentUrl}`);

    return success(res, doc, 'Document uploaded successfully');
  } catch (err) {
    next(err);
  }
};

const updateExpiry = async (req, res, next) => {
  try {
    const validated = uploadComplianceDocSchema.parse(req.body);
    const finalExpiry = validated.lifetime ? null : (validated.expiryDate || null);
    const doc = await complianceService.updateExpiryDate(req.params.id, finalExpiry);
    return success(res, doc, 'Compliance document updated successfully');
  } catch (err) {
    next(err);
  }
};

const renewDocument = async (req, res, next) => {
  try {
    const { expiryDate, type, lifetime } = req.body;
    if (!type) {
      return res.status(400).json({ success: false, message: 'Type is required' });
    }

    const complianceRepository = require('../repositories/compliance.repository');
    const oldDoc = await complianceRepository.findById(req.params.id);
    if (!oldDoc) {
      return res.status(404).json({ success: false, message: 'Document not found' });
    }

    const isLifetime = lifetime === true || lifetime === 'true';
    const finalExpiry = isLifetime ? null : (expiryDate ? new Date(expiryDate) : null);
    const fileUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const status = complianceService.calculateComplianceStatus(finalExpiry);

    const newDoc = await complianceRepository.renewDocument(req.params.id, {
      vehicleId: oldDoc.vehicleId,
      type: oldDoc.type,
      expiryDate: finalExpiry,
      documentUrl: fileUrl,
      status,
      lastVerifiedAt: new Date(),
      isActive: true,
    });

    return success(res, newDoc, 'Document renewed successfully', 201);
  } catch (err) {
    next(err);
  }
};

const getHistory = async (req, res, next) => {
  try {
    const { vehicleId, type } = req.params;
    const complianceRepository = require('../repositories/compliance.repository');
    const history = await complianceRepository.getHistory(vehicleId, type);
    return success(res, history, 'Document history fetched');
  } catch (err) {
    next(err);
  }
};

module.exports = { getByVehicleId, uploadDocument, updateExpiry, renewDocument, getHistory };
