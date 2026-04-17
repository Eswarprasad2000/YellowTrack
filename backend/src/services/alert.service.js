const notificationService = require('./notification.service');

const triggerVehicleAlert = async (vehicleRegNo, docType, status, expiryDate, vehicleId) => {
  const daysUntilExpiry = Math.ceil(
    (new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const severity = status === 'RED' ? 'CRITICAL' : 'WARNING';
  const expiryText = daysUntilExpiry <= 0
    ? `expired ${Math.abs(daysUntilExpiry)} days ago`
    : `expires in ${daysUntilExpiry} days`;

  const title = status === 'RED'
    ? `${docType} Expired — ${vehicleRegNo}`
    : `${docType} Expiring Soon — ${vehicleRegNo}`;

  const message = `${docType} for vehicle ${vehicleRegNo} ${expiryText}. Immediate action required.`;

  console.log(`🚨 [${severity}] ${title}`);

  // Create notification for all admins
  await notificationService.create({
    type: 'VEHICLE_DOC_EXPIRY',
    title,
    message,
    entityId: vehicleId || undefined,
  });
};

const triggerDriverAlert = async (driverName, licenseNumber, status, expiryDate, driverId) => {
  const daysUntilExpiry = Math.ceil(
    (new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const severity = status === 'RED' ? 'CRITICAL' : 'WARNING';
  const expiryText = daysUntilExpiry <= 0
    ? `expired ${Math.abs(daysUntilExpiry)} days ago`
    : `expires in ${daysUntilExpiry} days`;

  const title = status === 'RED'
    ? `License Expired — ${driverName}`
    : `License Expiring — ${driverName}`;

  const message = `Driving license (${licenseNumber}) for ${driverName} ${expiryText}.`;

  console.log(`🚨 [${severity}] ${title}`);

  await notificationService.create({
    type: 'LICENSE_EXPIRY',
    title,
    message,
    entityId: driverId || undefined,
  });
};

const triggerDriverDocAlert = async (driverName, docType, status, expiryDate, driverId) => {
  const daysUntilExpiry = Math.ceil(
    (new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  const expiryText = daysUntilExpiry <= 0
    ? `expired ${Math.abs(daysUntilExpiry)} days ago`
    : `expires in ${daysUntilExpiry} days`;

  const title = status === 'RED'
    ? `${docType} Expired — ${driverName}`
    : `${docType} Expiring — ${driverName}`;

  const message = `${docType} for driver ${driverName} ${expiryText}.`;

  await notificationService.create({
    type: 'DRIVER_DOC_EXPIRY',
    title,
    message,
    entityId: driverId || undefined,
  });
};

const triggerFastagAlert = async (vehicleRegNo, balance, fastagId) => {
  const title = `Low FASTag Balance — ${vehicleRegNo}`;
  const message = `FASTag balance for ${vehicleRegNo} is ₹${Math.round(balance)}. Please recharge soon.`;
  console.log(`🚨 [${balance <= 0 ? 'CRITICAL' : 'WARNING'}] ${title}`);
  await notificationService.create({
    type: 'FASTAG_LOW_BALANCE',
    title,
    message,
    entityId: fastagId || undefined,
  });
};

const triggerServiceAlert = async (vehicleRegNo, serviceTitle, nextDueDate, vehicleId) => {
  const days = Math.ceil((new Date(nextDueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const severity = days <= 0 ? 'CRITICAL' : 'WARNING';
  const timeText = days <= 0 ? `overdue by ${Math.abs(days)} days` : `due in ${days} days`;
  const title = days <= 0
    ? `Service Overdue — ${vehicleRegNo}`
    : `Service Due Soon — ${vehicleRegNo}`;
  const message = `"${serviceTitle}" for ${vehicleRegNo} is ${timeText}.`;
  console.log(`🔧 [${severity}] ${title}`);
  await notificationService.create({
    type: 'SERVICE_DUE',
    title,
    message,
    entityId: vehicleId || undefined,
  });
};

module.exports = { triggerVehicleAlert, triggerDriverAlert, triggerDriverDocAlert, triggerFastagAlert, triggerServiceAlert };
