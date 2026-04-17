const complianceRepository = require('../repositories/compliance.repository');

/**
 * Calculate compliance status based on expiry date
 * > 30 days → GREEN
 * <= 30 days (but > 7) → YELLOW
 * <= 7 days (but > 0) → ORANGE
 * <= 0 days (expired) → RED
 */
const calculateComplianceStatus = (expiryDate) => {
  if (!expiryDate) return 'GREEN'; // Lifetime validity — always valid
  const now = new Date();
  const expiry = new Date(expiryDate);
  const diffMs = expiry.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays > 30) return 'GREEN';
  if (diffDays > 7) return 'YELLOW';
  if (diffDays > 0) return 'ORANGE';
  return 'RED';
};

const getComplianceByVehicleId = async (vehicleId) => {
  const docs = await complianceRepository.findByVehicleId(vehicleId);
  return docs.map((doc) => ({
    ...doc,
    status: calculateComplianceStatus(doc.expiryDate),
    daysUntilExpiry: doc.expiryDate
      ? Math.ceil((new Date(doc.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : null,
  }));
};

const updateComplianceStatuses = async () => {
  const allDocs = await complianceRepository.findAll();
  let updated = 0;

  for (const doc of allDocs) {
    const newStatus = calculateComplianceStatus(doc.expiryDate);
    if (newStatus !== doc.status) {
      await complianceRepository.updateStatus(doc.id, newStatus);
      updated++;
    }
  }

  return { total: allDocs.length, updated };
};

const uploadDocument = async (docId, documentUrl) => {
  return complianceRepository.updateDocumentUrl(docId, documentUrl);
};

const updateExpiryDate = async (docId, expiryDate) => {
  const newStatus = calculateComplianceStatus(expiryDate || null);
  return complianceRepository.updateExpiry(docId, expiryDate || null, newStatus);
};

module.exports = {
  calculateComplianceStatus,
  getComplianceByVehicleId,
  updateComplianceStatuses,
  uploadDocument,
  updateExpiryDate,
};
