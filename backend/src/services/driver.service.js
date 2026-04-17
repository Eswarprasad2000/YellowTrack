const { randomUUID } = require('crypto');
const driverRepository = require('../repositories/driver.repository');
const vehicleRepository = require('../repositories/vehicle.repository');
const { fetchDriverByLicense } = require('./mock/dl.mock');
const { calculateComplianceStatus } = require('./compliance.service');
const AppError = require('../utils/AppError');

const calculateLicenseStatus = (licenseExpiry) => {
  const now = new Date();
  const expiry = new Date(licenseExpiry);
  const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft <= 0) return 'RED';       // Expired
  if (daysLeft <= 7) return 'ORANGE';    // Critical (within 7 days)
  if (daysLeft <= 30) return 'YELLOW';   // Expiring soon (within 30 days)
  return 'GREEN';                         // Valid
};

const createDriver = async (data) => {
  // Check for duplicate license
  const existing = await driverRepository.findByLicenseNumber(data.licenseNumber);
  if (existing) {
    throw new AppError('Driver with this license number already exists', 409);
  }

  // Check if license is expired
  const licenseExpiry = new Date(data.licenseExpiry);
  if (licenseExpiry < new Date()) {
    throw new AppError('Cannot add driver with expired license', 400);
  }

  data.verificationToken = randomUUID();
  return driverRepository.create(data);
};

const getAllDrivers = async () => {
  const drivers = await driverRepository.findAll();
  return drivers.map((driver) => {
    const licenseStatus = calculateLicenseStatus(driver.licenseExpiry);
    const daysToExpiry = Math.ceil(
      (new Date(driver.licenseExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    return { ...driver, licenseStatus, daysToExpiry };
  });
};

const getDriverById = async (id) => {
  const driver = await driverRepository.findById(id);
  if (!driver) {
    throw new AppError('Driver not found', 404);
  }

  const licenseStatus = calculateLicenseStatus(driver.licenseExpiry);
  const daysToExpiry = Math.ceil(
    (new Date(driver.licenseExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  return { ...driver, licenseStatus, daysToExpiry };
};

const assignDriverToVehicle = async (driverId, vehicleId) => {
  // Validate driver exists
  const driver = await driverRepository.findById(driverId);
  if (!driver) {
    throw new AppError('Driver not found', 404);
  }

  // Check license expiry
  if (new Date(driver.licenseExpiry) < new Date()) {
    throw new AppError('Cannot assign driver with expired license', 400);
  }

  // Validate vehicle exists
  const vehicle = await vehicleRepository.findById(vehicleId);
  if (!vehicle) {
    throw new AppError('Vehicle not found', 404);
  }

  // Check vehicle class compatibility
  const validClasses = getValidVehicleClasses(driver.vehicleClass);
  const vehiclePermitType = vehicle.permitType?.toUpperCase();
  if (vehiclePermitType && !validClasses.includes(vehiclePermitType)) {
    throw new AppError(
      `Driver vehicle class "${driver.vehicleClass}" is not compatible with vehicle permit type "${vehicle.permitType}"`,
      400
    );
  }

  return driverRepository.assignToVehicle(driverId, vehicleId);
};

const getValidVehicleClasses = (driverClass) => {
  // Simplified mapping of driver license classes to allowed vehicle types
  const classMap = {
    LMV: ['GOODS', 'PASSENGER', 'STATE'],
    HMV: ['GOODS', 'PASSENGER', 'NATIONAL', 'STATE'],
    HGMV: ['GOODS', 'NATIONAL', 'STATE'],
    HPMV: ['PASSENGER', 'NATIONAL', 'STATE'],
    TRANS: ['GOODS', 'PASSENGER', 'NATIONAL', 'STATE'],
  };

  return classMap[driverClass.toUpperCase()] || ['GOODS', 'PASSENGER', 'NATIONAL', 'STATE'];
};

const autoCreateDriver = async (licenseNumber) => {
  const existing = await driverRepository.findByLicenseNumber(licenseNumber);
  if (existing) {
    throw new AppError('Driver with this license number already exists', 409);
  }

  let dlData;
  try {
    dlData = await fetchDriverByLicense(licenseNumber);
  } catch (err) {
    throw new AppError('Failed to verify license from DL database', 502);
  }

  const licenseExpiry = new Date(dlData.licenseExpiry);
  if (licenseExpiry < new Date()) {
    throw new AppError('Cannot add driver with expired license', 400);
  }

  const driver = await driverRepository.create({
    name: dlData.name,
    phone: dlData.phone,
    aadhaarLast4: dlData.aadhaarLast4,
    licenseNumber: dlData.licenseNumber,
    licenseExpiry: licenseExpiry,
    vehicleClass: dlData.vehicleClass,
    bloodGroup: dlData.bloodGroup || null,
    fatherName: dlData.fatherName || null,
    motherName: dlData.motherName || null,
    emergencyContact: dlData.emergencyContact || null,
    currentAddress: dlData.currentAddress || null,
    permanentAddress: dlData.permanentAddress || null,
    verificationToken: randomUUID(),
  });

  return {
    ...driver,
    licenseStatus: calculateLicenseStatus(driver.licenseExpiry),
    daysToExpiry: Math.ceil((licenseExpiry.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    verified: true,
  };
};

const uploadDriverDocument = async (driverId, docData, fileUrl) => {
  const driver = await driverRepository.findById(driverId);
  if (!driver) {
    throw new AppError('Driver not found', 404);
  }

  const expiryDate = docData.lifetime ? null : (docData.expiryDate ? new Date(docData.expiryDate) : null);
  const status = calculateComplianceStatus(expiryDate);

  const newData = {
    driverId,
    type: docData.type,
    expiryDate,
    documentUrl: fileUrl,
    status,
    isActive: true,
  };

  // Check for existing active doc of same type — archive it
  const existing = await driverRepository.findActiveByDriverAndType(driverId, docData.type);
  if (existing) {
    return driverRepository.renewDocument(existing.id, newData);
  }

  return driverRepository.createDocument(newData);
};

const getDocumentHistory = async (driverId, type) => {
  const driver = await driverRepository.findById(driverId);
  if (!driver) throw new AppError('Driver not found', 404);
  return driverRepository.getDocHistory(driverId, type);
};

const renewDriverDocument = async (driverId, oldDocId, newDocData, fileUrl) => {
  const oldDoc = await driverRepository.findDocById(oldDocId);
  if (!oldDoc || oldDoc.driverId !== driverId) throw new AppError('Document not found', 404);

  const expiryDate = newDocData.lifetime ? null : (newDocData.expiryDate ? new Date(newDocData.expiryDate) : null);

  return driverRepository.renewDocument(oldDocId, {
    driverId,
    type: oldDoc.type,
    expiryDate,
    documentUrl: fileUrl || oldDoc.documentUrl,
    status: calculateComplianceStatus(expiryDate),
    isActive: true,
  });
};

const updateDriver = async (id, data) => {
  const driver = await driverRepository.findById(id);
  if (!driver) {
    throw new AppError('Driver not found', 404);
  }
  const updated = await driverRepository.update(id, data);
  const licenseStatus = calculateLicenseStatus(updated.licenseExpiry);
  const daysToExpiry = Math.ceil(
    (new Date(updated.licenseExpiry).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  return { ...updated, licenseStatus, daysToExpiry };
};

const getDriverComplianceStats = async () => {
  const drivers = await driverRepository.findAll();
  const totalDrivers = drivers.length;

  // License stats
  const license = { green: 0, yellow: 0, orange: 0, red: 0 };
  drivers.forEach((d) => {
    const status = calculateLicenseStatus(d.licenseExpiry);
    license[status.toLowerCase()]++;
  });

  // Document stats
  const docs = { green: 0, yellow: 0, orange: 0, red: 0 };
  drivers.forEach((d) => {
    (d.documents || []).forEach((doc) => {
      if (!doc.expiryDate) { docs.green++; return; } // Lifetime = green
      const days = Math.ceil((new Date(doc.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (days > 30) docs.green++;
      else if (days > 7) docs.yellow++;
      else if (days > 0) docs.orange++;
      else docs.red++;
    });
  });

  return { totalDrivers, license, documents: docs };
};

module.exports = { createDriver, autoCreateDriver, getAllDrivers, getDriverById, updateDriver, getDriverComplianceStats, assignDriverToVehicle, uploadDriverDocument, getDocumentHistory, renewDriverDocument };
