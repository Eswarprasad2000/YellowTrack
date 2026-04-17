const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');
const vehicleRepository = require('../repositories/vehicle.repository');
const complianceRepository = require('../repositories/compliance.repository');
const challanRepository = require('../repositories/challan.repository');
const documentTypeRepository = require('../repositories/documentType.repository');
const complianceService = require('./compliance.service');
const alertService = require('./alert.service');
const { fetchVehicleData, fetchComplianceDates } = require('./mock/vahan.mock');
const { fetchChallans } = require('./mock/challan.mock');
const AppError = require('../utils/AppError');

const generateQRCode = async (vehicleId) => {
  const dir = path.resolve('./uploads/qr');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const publicUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/public/vehicle/${vehicleId}`;
  const filePath = path.join(dir, `${vehicleId}.png`);
  await QRCode.toFile(filePath, publicUrl, { width: 300, margin: 2 });
  return `/uploads/qr/${vehicleId}.png`;
};

const onboardVehicle = async (registrationNumber, images = [], groupId) => {
  if (!groupId) throw new AppError('Vehicle group is required for onboarding', 400);

  const existing = await vehicleRepository.findByRegistrationNumber(registrationNumber);
  if (existing) {
    throw new AppError('Vehicle with this registration number already exists', 409);
  }

  // Fetch required doc types for this group
  const groupDocTypes = await documentTypeRepository.findByGroupId(groupId);
  if (groupDocTypes.length === 0) {
    throw new AppError('Selected vehicle group has no document types configured', 400);
  }

  let vehicleData;
  try {
    vehicleData = await fetchVehicleData(registrationNumber);
  } catch (err) {
    throw new AppError('Failed to fetch vehicle data from VAHAN API', 502);
  }

  // Create vehicle
  const vehicle = await vehicleRepository.create({
    registrationNumber,
    ...vehicleData,
    images: images.length > 0 ? images : [],
    groupId,
  });

  // Generate QR code
  try {
    const qrCodeUrl = await generateQRCode(vehicle.id);
    await vehicleRepository.update(vehicle.id, { qrCodeUrl });
  } catch (err) {
    console.error('Failed to generate QR code:', err.message);
  }

  // Fetch and create compliance documents for group's required types only
  try {
    const docTypeCodes = groupDocTypes.map((dt) => dt.code);
    const complianceDates = await fetchComplianceDates(registrationNumber, docTypeCodes);
    const complianceDocs = Object.entries(complianceDates).map(([type, expiryDate]) => ({
      vehicleId: vehicle.id,
      type,
      expiryDate,
      status: complianceService.calculateComplianceStatus(expiryDate),
      lastVerifiedAt: new Date(),
    }));
    await complianceRepository.createMany(complianceDocs);
  } catch (err) {
    console.error('Failed to create compliance documents:', err.message);
  }

  // Sync challans
  try {
    await syncChallans(vehicle.id, registrationNumber);
  } catch (err) {
    console.error('Failed to sync challans:', err.message);
  }

  const fullVehicle = await vehicleRepository.findById(vehicle.id);

  // Check for alerts
  if (fullVehicle.complianceDocuments) {
    for (const doc of fullVehicle.complianceDocuments) {
      if (doc.status === 'YELLOW' || doc.status === 'RED') {
        alertService.triggerVehicleAlert(vehicle.registrationNumber, doc.type, doc.status, doc.expiryDate, vehicle.id);
      }
    }
  }

  return fullVehicle;
};

const syncChallans = async (vehicleId, registrationNumber) => {
  const challansData = await fetchChallans(registrationNumber);
  if (challansData.length > 0) {
    const challans = challansData.map((c) => ({
      vehicleId,
      amount: c.amount,
      userCharges: c.userCharges || 0,
      status: c.status,
      issuedAt: new Date(c.issuedAt),
      source: c.source,
      location: c.location || null,
      unitName: c.unitName || null,
      psLimits: c.psLimits || null,
      violation: c.violation || c.comment || null,
      challanNumber: c.challanNumber || null,
      authorizedBy: c.authorizedBy || null,
      proofImageUrl: c.proofImageUrl || null,
    }));
    await challanRepository.createMany(challans);
  }
};

const getAllVehicles = async (query) => {
  const result = await vehicleRepository.findAll(query);

  result.vehicles = result.vehicles.map((vehicle) => ({
    ...vehicle,
    complianceDocuments: vehicle.complianceDocuments.map((doc) => ({
      ...doc,
      status: complianceService.calculateComplianceStatus(doc.expiryDate),
    })),
    overallStatus: getOverallStatus(vehicle.complianceDocuments),
    pendingChallanAmount: vehicle.challans
      .filter((c) => c.status === 'PENDING')
      .reduce((sum, c) => sum + c.amount, 0),
    activeDriver: vehicle.driverMappings?.find((m) => m.isActive)?.driver || null,
  }));

  return result;
};

const getVehicleById = async (id) => {
  const vehicle = await vehicleRepository.findById(id);
  if (!vehicle) throw new AppError('Vehicle not found', 404);

  vehicle.complianceDocuments = vehicle.complianceDocuments.map((doc) => ({
    ...doc,
    status: complianceService.calculateComplianceStatus(doc.expiryDate),
    daysUntilExpiry: doc.expiryDate
      ? Math.ceil((new Date(doc.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null,
  }));

  vehicle.overallStatus = getOverallStatus(vehicle.complianceDocuments);
  vehicle.pendingChallanAmount = vehicle.challans
    .filter((c) => c.status === 'PENDING')
    .reduce((sum, c) => sum + c.amount, 0);
  vehicle.activeDriver = vehicle.driverMappings?.find((m) => m.isActive)?.driver || null;
  vehicle.assignmentHistory = vehicle.driverMappings?.sort(
    (a, b) => new Date(b.assignedAt) - new Date(a.assignedAt)
  );

  return vehicle;
};

const getOverallStatus = (docs) => {
  if (!docs || docs.length === 0) return 'GREEN';
  const statuses = docs.map((d) =>
    complianceService.calculateComplianceStatus(d.expiryDate)
  );
  if (statuses.includes('RED')) return 'RED';
  if (statuses.includes('ORANGE')) return 'ORANGE';
  if (statuses.includes('YELLOW')) return 'YELLOW';
  return 'GREEN';
};

const manualOnboard = async (data, docFiles = {}, images = []) => {
  const {
    registrationNumber, ownerName, make, model, fuelType,
    chassisNumber, engineNumber, gvw, seatingCapacity, permitType, groupId,
  } = data;

  if (!groupId) throw new AppError('Vehicle group is required for onboarding', 400);

  const existing = await vehicleRepository.findByRegistrationNumber(registrationNumber);
  if (existing) throw new AppError('Vehicle with this registration number already exists', 409);

  // Fetch required doc types for this group
  const groupDocTypes = await documentTypeRepository.findByGroupId(groupId);
  if (groupDocTypes.length === 0) {
    throw new AppError('Selected vehicle group has no document types configured', 400);
  }

  const vehicle = await vehicleRepository.create({
    registrationNumber, ownerName: ownerName || null, make, model, fuelType,
    chassisNumber: chassisNumber || null, engineNumber: engineNumber || null,
    gvw: gvw || null, seatingCapacity: seatingCapacity || null, permitType: permitType || null,
    images: images.length > 0 ? images : [],
    groupId,
  });

  try {
    const qrCodeUrl = await generateQRCode(vehicle.id);
    await vehicleRepository.update(vehicle.id, { qrCodeUrl });
  } catch (err) { console.error('QR generation failed:', err.message); }

  // Handle invoice separately — not a compliance doc
  if (docFiles.invoiceFile) {
    try { await vehicleRepository.update(vehicle.id, { invoiceUrl: docFiles.invoiceFile }); }
    catch (err) { console.error('Invoice save failed:', err.message); }
  }

  // Build compliance docs dynamically from group's required doc types
  const complianceDocs = groupDocTypes.map((dt) => {
    const expiryKey = `${dt.code.toLowerCase()}Expiry`;
    const fileKey = `${dt.code.toLowerCase()}File`;
    const expiry = data[expiryKey] || null;
    return {
      vehicleId: vehicle.id,
      type: dt.code,
      expiryDate: expiry ? new Date(expiry) : null,
      documentUrl: docFiles[fileKey] || null,
      status: complianceService.calculateComplianceStatus(expiry ? new Date(expiry) : null),
      lastVerifiedAt: new Date(),
    };
  });

  try { await complianceRepository.createMany(complianceDocs); }
  catch (err) { console.error('Compliance doc creation failed:', err.message); }

  // Create tyres if provided
  if (data.tyres) {
    try {
      const tyresArr = typeof data.tyres === 'string' ? JSON.parse(data.tyres) : data.tyres;
      if (Array.isArray(tyresArr) && tyresArr.length > 0) {
        const prisma = require('../config/prisma');
        await prisma.tyre.createMany({
          data: tyresArr.map((t) => ({
            vehicleId: vehicle.id,
            position: t.position,
            brand: t.brand || null,
            size: t.size || null,
            installedAt: t.installedAt ? new Date(t.installedAt) : null,
            kmAtInstall: t.kmAtInstall ? parseInt(t.kmAtInstall, 10) : null,
            condition: t.condition || 'GOOD',
          })),
        });
      }
    } catch (err) { console.error('Tyre creation failed:', err.message); }
  }

  return vehicleRepository.findById(vehicle.id);
};

const getDashboardStats = async () => {
  const [vehicleStats, challanStats] = await Promise.all([
    vehicleRepository.getDashboardStats(),
    challanRepository.getStats(),
  ]);
  return { ...vehicleStats, challans: challanStats };
};

module.exports = { onboardVehicle, manualOnboard, getAllVehicles, getVehicleById, getDashboardStats, syncChallans };
