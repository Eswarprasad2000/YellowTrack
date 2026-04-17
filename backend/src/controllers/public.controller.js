const vehicleRepository = require('../repositories/vehicle.repository');
const driverRepository = require('../repositories/driver.repository');
const complianceService = require('../services/compliance.service');
const { publicDriverUpdateSchema } = require('../validations/publicDriver.validation');
const AppError = require('../utils/AppError');
const { success } = require('../utils/response');

const getVehiclePublic = async (req, res, next) => {
  try {
    const vehicle = await vehicleRepository.findById(req.params.id);
    if (!vehicle) throw new AppError('Vehicle not found', 404);

    // Recalculate compliance statuses
    const compliance = await complianceService.getComplianceByVehicleId(vehicle.id);

    // Get current active driver
    const activeMapping = vehicle.driverMappings?.find((m) => m.isActive);

    // Mask sensitive data
    const publicData = {
      registrationNumber: vehicle.registrationNumber,
      make: vehicle.make,
      model: vehicle.model,
      fuelType: vehicle.fuelType,
      permitType: vehicle.permitType,
      ownerName: vehicle.ownerName ? vehicle.ownerName.charAt(0) + '***' : null,
      currentDriver: activeMapping
        ? {
            name: activeMapping.driver.name,
            licenseNumber: activeMapping.driver.licenseNumber.slice(0, 4) + '****',
            assignedAt: activeMapping.assignedAt,
          }
        : null,
      compliance: compliance.map((doc) => ({
        type: doc.type,
        status: doc.status,
        expiryDate: doc.expiryDate,
      })),
    };

    return success(res, publicData);
  } catch (err) {
    next(err);
  }
};

const getDriverByToken = async (req, res, next) => {
  try {
    const driver = await driverRepository.findByVerificationToken(req.params.token);
    if (!driver) throw new AppError('Invalid verification link', 404);

    return success(res, {
      id: driver.id,
      name: driver.name,
      phone: driver.phone,
      aadhaarLast4: driver.aadhaarLast4,
      licenseNumber: driver.licenseNumber,
      licenseExpiry: driver.licenseExpiry,
      vehicleClass: driver.vehicleClass,
      bloodGroup: driver.bloodGroup,
      fatherName: driver.fatherName,
      motherName: driver.motherName,
      emergencyContact: driver.emergencyContact,
      emergencyContacts: driver.emergencyContacts,
      currentAddress: driver.currentAddress,
      currentAddressPhotos: driver.currentAddressPhotos || [],
      permanentAddress: driver.permanentAddress,
      permanentAddressPhotos: driver.permanentAddressPhotos || [],
      currentAddressLat: driver.currentAddressLat,
      currentAddressLng: driver.currentAddressLng,
      permanentAddressLat: driver.permanentAddressLat,
      permanentAddressLng: driver.permanentAddressLng,
      profilePhoto: driver.profilePhoto,
      selfVerifiedAt: driver.selfVerifiedAt,
      adminVerified: driver.adminVerified || false,
    }, 'Driver data fetched');
  } catch (err) { next(err); }
};

const updateDriverByToken = async (req, res, next) => {
  try {
    const driver = await driverRepository.findByVerificationToken(req.params.token);
    if (!driver) throw new AppError('Invalid verification link', 404);

    // Block editing if admin has verified
    if (driver.adminVerified) {
      throw new AppError('Your profile has been verified by the admin. Contact admin to make changes.', 403);
    }

    const validated = publicDriverUpdateSchema.parse(req.body);
    validated.selfVerifiedAt = new Date();

    const updated = await driverRepository.update(driver.id, validated);

    // Send notification to admins
    const notificationService = require('../services/notification.service');
    await notificationService.create({
      type: 'DRIVER_SELF_VERIFIED',
      title: `Driver Verified — ${driver.name}`,
      message: `${driver.name} (${driver.licenseNumber}) has submitted their profile verification. Review and approve.`,
      entityId: driver.id,
    });

    return success(res, updated, 'Driver profile updated successfully');
  } catch (err) { next(err); }
};

const uploadDriverPhoto = async (req, res, next) => {
  try {
    const driver = await driverRepository.findByVerificationToken(req.params.token);
    if (!driver) throw new AppError('Invalid verification link', 404);
    if (!req.file) throw new AppError('Photo file is required', 400);

    const photoUrl = `/uploads/${req.file.filename}`;
    await driverRepository.update(driver.id, { profilePhoto: photoUrl });

    return success(res, { profilePhoto: photoUrl }, 'Photo uploaded successfully');
  } catch (err) { next(err); }
};

const uploadAddressPhoto = async (req, res, next) => {
  try {
    const driver = await driverRepository.findByVerificationToken(req.params.token);
    if (!driver) throw new AppError('Invalid verification link', 404);
    if (!req.file) throw new AppError('Photo file is required', 400);

    const type = req.params.type; // 'current' or 'permanent'
    if (type !== 'current' && type !== 'permanent') throw new AppError('Invalid address type', 400);

    const photoUrl = `/uploads/${req.file.filename}`;
    const field = type === 'current' ? 'currentAddressPhotos' : 'permanentAddressPhotos';
    const existing = driver[field] || [];
    if (existing.length >= 5) throw new AppError('Maximum 5 photos allowed per address', 400);

    await driverRepository.update(driver.id, { [field]: [...existing, photoUrl] });

    return success(res, { url: photoUrl, photos: [...existing, photoUrl] }, 'Address photo uploaded');
  } catch (err) { next(err); }
};

const deleteAddressPhoto = async (req, res, next) => {
  try {
    const driver = await driverRepository.findByVerificationToken(req.params.token);
    if (!driver) throw new AppError('Invalid verification link', 404);

    const { type, url } = req.body;
    if (type !== 'current' && type !== 'permanent') throw new AppError('Invalid address type', 400);

    const field = type === 'current' ? 'currentAddressPhotos' : 'permanentAddressPhotos';
    const existing = driver[field] || [];
    const updated = existing.filter((p) => p !== url);

    await driverRepository.update(driver.id, { [field]: updated });

    return success(res, { photos: updated }, 'Photo removed');
  } catch (err) { next(err); }
};

module.exports = { getVehiclePublic, getDriverByToken, updateDriverByToken, uploadDriverPhoto, uploadAddressPhoto, deleteAddressPhoto };
