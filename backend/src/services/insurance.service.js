const insuranceRepository = require('../repositories/insurance.repository');
const vehicleRepository = require('../repositories/vehicle.repository');
const { extractFromPDF } = require('./insurance/pdfParser.service');
const { getPlans: getMockPlans } = require('./mock/insurance.mock');
const alertService = require('./alert.service');
const AppError = require('../utils/AppError');

const uploadAndExtract = async (vehicleId, filePath, documentUrl) => {
  const vehicle = await vehicleRepository.findById(vehicleId);
  if (!vehicle) throw new AppError('Vehicle not found', 404);

  const extracted = await extractFromPDF(filePath);

  // Determine status based on expiry
  let status = 'ACTIVE';
  if (extracted.expiryDate) {
    const days = Math.ceil((new Date(extracted.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days <= 0) status = 'EXPIRED';
    else if (days <= 30) status = 'EXPIRING';
  }

  const policy = await insuranceRepository.create({
    vehicleId,
    policyNumber: extracted.policyNumber,
    insurer: extracted.insurer === 'Unable to detect — please fill manually' ? null : extracted.insurer,
    startDate: extracted.startDate ? new Date(extracted.startDate) : null,
    expiryDate: extracted.expiryDate ? new Date(extracted.expiryDate) : null,
    premium: extracted.premium,
    coverageType: extracted.coverageType,
    documentUrl,
    status,
    extractedData: extracted,
  });

  return { policy, extracted };
};

const savePolicy = async (data) => {
  const vehicle = await vehicleRepository.findById(data.vehicleId);
  if (!vehicle) throw new AppError('Vehicle not found', 404);

  let status = 'ACTIVE';
  if (data.expiryDate) {
    const days = Math.ceil((new Date(data.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days <= 0) status = 'EXPIRED';
    else if (days <= 30) status = 'EXPIRING';
  }

  return insuranceRepository.create({
    vehicleId: data.vehicleId,
    policyNumber: data.policyNumber || null,
    insurer: data.insurer || null,
    planName: data.planName || null,
    startDate: data.startDate ? new Date(data.startDate) : null,
    expiryDate: data.expiryDate ? new Date(data.expiryDate) : null,
    premium: data.premium ? Number(data.premium) : null,
    coverageType: data.coverageType || null,
    coverageDetails: data.coverageDetails || [],
    addOns: data.addOns || [],
    documentUrl: data.documentUrl || null,
    status,
  });
};

const getPlans = async (vehicleId) => {
  const vehicle = await vehicleRepository.findById(vehicleId);
  if (!vehicle) throw new AppError('Vehicle not found', 404);

  const existingPolicy = await insuranceRepository.findActiveByVehicleId(vehicleId);
  const previousInsurer = existingPolicy?.insurer || null;
  const vehicleType = vehicle.permitType === 'GOODS' ? 'Commercial' : vehicle.permitType === 'PASSENGER' ? 'Passenger' : 'Private Car';

  const plans = getMockPlans(vehicle.registrationNumber, vehicleType, previousInsurer);
  return { vehicle: { id: vehicle.id, registrationNumber: vehicle.registrationNumber, make: vehicle.make, model: vehicle.model }, plans };
};

const purchase = async (vehicleId, planData) => {
  const vehicle = await vehicleRepository.findById(vehicleId);
  if (!vehicle) throw new AppError('Vehicle not found', 404);

  // Mock payment — 95% success rate
  const paymentSuccess = Math.random() > 0.05;
  const paymentId = `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

  if (!paymentSuccess) {
    throw new AppError('Payment failed. Please try again.', 402);
  }

  // Mark old policies as RENEWED
  const existingPolicies = await insuranceRepository.findByVehicleId(vehicleId);
  for (const p of existingPolicies) {
    if (p.status === 'ACTIVE' || p.status === 'EXPIRING' || p.status === 'EXPIRED') {
      await insuranceRepository.update(p.id, { status: 'RENEWED' });
    }
  }

  const startDate = new Date();
  const expiryDate = new Date();
  expiryDate.setFullYear(expiryDate.getFullYear() + 1);

  const policy = await insuranceRepository.create({
    vehicleId,
    policyNumber: `POL-${Date.now().toString().slice(-10)}`,
    insurer: planData.provider,
    planName: planData.planName,
    startDate,
    expiryDate,
    premium: planData.premium,
    coverageType: planData.planName,
    coverageDetails: planData.coverage || [],
    addOns: planData.addOns || [],
    status: 'ACTIVE',
    paidAmount: planData.premium,
    paymentId,
    paymentStatus: 'SUCCESS',
  });

  return { policy, payment: { id: paymentId, status: 'SUCCESS', amount: planData.premium } };
};

const checkExpiring = async () => {
  const policies = await insuranceRepository.findAllActive();
  let updated = 0;
  let alerts = 0;

  for (const policy of policies) {
    if (!policy.expiryDate) continue;
    const days = Math.ceil((new Date(policy.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    let newStatus = 'ACTIVE';
    if (days <= 0) newStatus = 'EXPIRED';
    else if (days <= 30) newStatus = 'EXPIRING';

    if (newStatus !== policy.status) {
      await insuranceRepository.update(policy.id, { status: newStatus });
      updated++;
    }

    if ((newStatus === 'EXPIRING' || newStatus === 'EXPIRED') && policy.vehicle) {
      try {
        const notificationService = require('./notification.service');
        await notificationService.create({
          type: 'INSURANCE_EXPIRY',
          title: `Insurance ${newStatus === 'EXPIRED' ? 'Expired' : 'Expiring'} — ${policy.vehicle.registrationNumber}`,
          message: `Insurance policy ${policy.policyNumber || ''} for ${policy.vehicle.registrationNumber} ${newStatus === 'EXPIRED' ? 'has expired' : `expires in ${days} days`}. Renew now.`,
          entityId: policy.id,
        });
        alerts++;
      } catch { /* ignore */ }
    }
  }

  return { updated, alerts };
};

const getAll = async (query) => insuranceRepository.findAll(query);
const getById = async (id) => {
  const p = await insuranceRepository.findById(id);
  if (!p) throw new AppError('Policy not found', 404);
  return p;
};
const getByVehicle = async (vehicleId) => insuranceRepository.findByVehicleId(vehicleId);
const getStats = async () => insuranceRepository.getStats();

module.exports = { uploadAndExtract, savePolicy, getPlans, purchase, checkExpiring, getAll, getById, getByVehicle, getStats };
