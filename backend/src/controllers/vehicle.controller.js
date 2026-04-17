const vehicleService = require('../services/vehicle.service');
const { onboardVehicleSchema, manualOnboardSchema, getVehiclesQuerySchema } = require('../validations/vehicle.validation');
const vehicleRepository = require('../repositories/vehicle.repository');
const { success } = require('../utils/response');

const onboard = async (req, res, next) => {
  try {
    const { registrationNumber, groupId } = onboardVehicleSchema.parse(req.body);

    // Collect vehicle images if uploaded
    const images = req.files?.map((f) => `/uploads/${f.filename}`) || [];

    const vehicle = await vehicleService.onboardVehicle(registrationNumber, images, groupId || null);
    return success(res, vehicle, 'Vehicle onboarded successfully', 201);
  } catch (err) {
    next(err);
  }
};

const manualOnboard = async (req, res, next) => {
  try {
    const validated = manualOnboardSchema.parse(req.body);

    // Map uploaded files dynamically (upload.any() puts all files in req.files array)
    const docFiles = {};
    const images = [];
    if (Array.isArray(req.files)) {
      for (const f of req.files) {
        if (f.fieldname === 'vehicleImages') {
          images.push(`/uploads/${f.filename}`);
        } else {
          docFiles[f.fieldname] = `/uploads/${f.filename}`;
        }
      }
    }

    const vehicle = await vehicleService.manualOnboard(validated, docFiles, images);
    return success(res, vehicle, 'Vehicle onboarded manually', 201);
  } catch (err) {
    next(err);
  }
};

const uploadImages = async (req, res, next) => {
  try {
    const vehicleId = req.params.id;
    const newImages = req.files?.map((f) => `/uploads/${f.filename}`) || [];

    if (newImages.length === 0) {
      return res.status(400).json({ success: false, message: 'No images uploaded' });
    }

    const vehicle = await vehicleRepository.findById(vehicleId);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }

    const allImages = [...(vehicle.images || []), ...newImages];
    await vehicleRepository.update(vehicleId, { images: allImages });

    const updated = await vehicleRepository.findById(vehicleId);
    return success(res, updated, 'Images uploaded successfully');
  } catch (err) {
    next(err);
  }
};

const deleteImage = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { imageUrl } = req.body;
    if (!imageUrl) return res.status(400).json({ success: false, message: 'imageUrl is required' });

    const vehicle = await vehicleRepository.findById(id);
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });

    const updatedImages = (vehicle.images || []).filter((img) => img !== imageUrl);
    await vehicleRepository.update(id, { images: updatedImages });

    const updated = await vehicleRepository.findById(id);
    return success(res, updated, 'Image deleted successfully');
  } catch (err) { next(err); }
};

const getAll = async (req, res, next) => {
  try {
    const query = getVehiclesQuerySchema.parse(req.query);
    const result = await vehicleService.getAllVehicles(query);
    return success(res, result, 'Vehicles fetched successfully');
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const vehicle = await vehicleService.getVehicleById(req.params.id);
    return success(res, vehicle, 'Vehicle fetched successfully');
  } catch (err) {
    next(err);
  }
};

const getDashboardStats = async (req, res, next) => {
  try {
    const stats = await vehicleService.getDashboardStats();
    return success(res, stats, 'Dashboard stats fetched successfully');
  } catch (err) {
    next(err);
  }
};

const syncChallans = async (req, res, next) => {
  try {
    const vehicle = await vehicleService.getVehicleById(req.params.id);
    await vehicleService.syncChallans(vehicle.id, vehicle.registrationNumber);
    return success(res, null, 'Challans synced successfully');
  } catch (err) {
    next(err);
  }
};

const uploadInvoice = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Invoice file is required' });
    const invoiceUrl = `/uploads/${req.file.filename}`;
    await vehicleRepository.update(req.params.id, { invoiceUrl });
    const updated = await vehicleRepository.findById(req.params.id);
    return success(res, updated, 'Invoice uploaded successfully');
  } catch (err) { next(err); }
};

const setProfileImage = async (req, res, next) => {
  try {
    const { imageUrl } = req.body;
    if (!imageUrl) return res.status(400).json({ success: false, message: 'imageUrl is required' });
    await vehicleRepository.update(req.params.id, { profileImage: imageUrl });
    const updated = await vehicleRepository.findById(req.params.id);
    return success(res, updated, 'Profile image set successfully');
  } catch (err) { next(err); }
};

const updateGroup = async (req, res, next) => {
  try {
    const { groupId } = req.body;
    await vehicleRepository.update(req.params.id, { groupId: groupId || null });
    const updated = await vehicleService.getVehicleById(req.params.id);
    return success(res, updated, 'Vehicle group updated');
  } catch (err) { next(err); }
};

const upsertTyres = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { tyres } = req.body;
    if (!Array.isArray(tyres)) return res.status(400).json({ success: false, message: 'tyres must be an array' });

    const vehicle = await vehicleRepository.findById(id);
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });

    const prisma = require('../config/prisma');
    // Delete existing tyres and recreate
    await prisma.tyre.deleteMany({ where: { vehicleId: id } });
    if (tyres.length > 0) {
      await prisma.tyre.createMany({
        data: tyres.map((t) => ({
          vehicleId: id,
          position: t.position,
          brand: t.brand || null,
          size: t.size || null,
          installedAt: t.installedAt ? new Date(t.installedAt) : null,
          kmAtInstall: t.kmAtInstall ? parseInt(t.kmAtInstall, 10) : null,
          condition: t.condition || 'GOOD',
        })),
      });
    }

    const updated = await vehicleService.getVehicleById(id);
    return success(res, updated, 'Tyres updated successfully');
  } catch (err) { next(err); }
};

// ── Service Records ────────────────────────────────────────
const getAllServices = async (req, res, next) => {
  try {
    const prisma = require('../config/prisma');
    const { status, vehicleId } = req.query;
    const where = {};
    if (status) where.status = status;
    if (vehicleId) where.vehicleId = vehicleId;
    const services = await prisma.serviceRecord.findMany({
      where,
      include: { vehicle: { select: { id: true, registrationNumber: true, make: true, model: true, profileImage: true, group: { select: { name: true, icon: true, color: true } } } } },
      orderBy: { serviceDate: 'desc' },
    });
    return success(res, services, 'All services fetched');
  } catch (err) { next(err); }
};

const getServices = async (req, res, next) => {
  try {
    const prisma = require('../config/prisma');
    const services = await prisma.serviceRecord.findMany({
      where: { vehicleId: req.params.id },
      orderBy: { serviceDate: 'desc' },
    });
    return success(res, services, 'Services fetched');
  } catch (err) { next(err); }
};

const createService = async (req, res, next) => {
  try {
    const prisma = require('../config/prisma');
    const { title, description, serviceDate, odometerKm, totalCost, parts, nextDueDate, nextDueKm, status } = req.body;

    if (!title || !serviceDate) {
      return res.status(400).json({ success: false, message: 'Title and service date are required' });
    }

    // Build file map from upload.any() — receipts + partProof_0, partProof_1, etc.
    const fileMap = {};
    const receiptUrls = [];
    if (Array.isArray(req.files)) {
      for (const f of req.files) {
        if (f.fieldname === 'receipts') {
          receiptUrls.push(`/uploads/${f.filename}`);
        } else {
          fileMap[f.fieldname] = `/uploads/${f.filename}`;
        }
      }
    }

    // Parse parts if sent as JSON string
    let parsedParts = [];
    if (parts) {
      parsedParts = typeof parts === 'string' ? JSON.parse(parts) : parts;
    }

    const record = await prisma.serviceRecord.create({
      data: {
        vehicleId: req.params.id,
        title,
        description: description || null,
        serviceDate: new Date(serviceDate),
        odometerKm: odometerKm ? parseInt(odometerKm, 10) : null,
        totalCost: totalCost ? parseFloat(totalCost) : 0,
        receiptUrls,
        parts: parsedParts.map((p, i) => ({
          name: p.name,
          quantity: parseInt(p.quantity, 10) || 1,
          unitCost: parseFloat(p.unitCost) || 0,
          proofUrl: fileMap[`partProof_${i}`] || p.proofUrl || null,
        })),
        nextDueDate: nextDueDate ? new Date(nextDueDate) : null,
        nextDueKm: nextDueKm ? parseInt(nextDueKm, 10) : null,
        status: status || 'COMPLETED',
      },
    });
    return success(res, record, 'Service record created', 201);
  } catch (err) { next(err); }
};

const updateService = async (req, res, next) => {
  try {
    const prisma = require('../config/prisma');
    const { serviceId } = req.params;
    const { title, description, serviceDate, odometerKm, totalCost, parts, nextDueDate, nextDueKm, status } = req.body;

    const existing = await prisma.serviceRecord.findUnique({ where: { id: serviceId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Service record not found' });

    // Build file map from upload.any()
    const fileMap = {};
    const newReceipts = [];
    if (Array.isArray(req.files)) {
      for (const f of req.files) {
        if (f.fieldname === 'receipts') {
          newReceipts.push(`/uploads/${f.filename}`);
        } else {
          fileMap[f.fieldname] = `/uploads/${f.filename}`;
        }
      }
    }
    let receiptUrls = [...(existing.receiptUrls || []), ...newReceipts];

    // If removedReceipts is provided, filter them out
    if (req.body.removedReceipts) {
      const removed = typeof req.body.removedReceipts === 'string' ? JSON.parse(req.body.removedReceipts) : req.body.removedReceipts;
      receiptUrls = receiptUrls.filter((url) => !removed.includes(url));
    }

    let parsedParts;
    if (parts) {
      parsedParts = (typeof parts === 'string' ? JSON.parse(parts) : parts).map((p, i) => ({
        name: p.name,
        quantity: parseInt(p.quantity, 10) || 1,
        unitCost: parseFloat(p.unitCost) || 0,
        proofUrl: fileMap[`partProof_${i}`] || p.proofUrl || null,
      }));
    }

    const updated = await prisma.serviceRecord.update({
      where: { id: serviceId },
      data: {
        ...(title && { title }),
        ...(description !== undefined && { description: description || null }),
        ...(serviceDate && { serviceDate: new Date(serviceDate) }),
        ...(odometerKm !== undefined && { odometerKm: odometerKm ? parseInt(odometerKm, 10) : null }),
        ...(totalCost !== undefined && { totalCost: parseFloat(totalCost) || 0 }),
        receiptUrls,
        ...(parsedParts && { parts: parsedParts }),
        ...(nextDueDate !== undefined && { nextDueDate: nextDueDate ? new Date(nextDueDate) : null }),
        ...(nextDueKm !== undefined && { nextDueKm: nextDueKm ? parseInt(nextDueKm, 10) : null }),
        ...(status && { status }),
      },
    });
    return success(res, updated, 'Service record updated');
  } catch (err) { next(err); }
};

const deleteService = async (req, res, next) => {
  try {
    const prisma = require('../config/prisma');
    const { serviceId } = req.params;
    const existing = await prisma.serviceRecord.findUnique({ where: { id: serviceId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Service record not found' });
    await prisma.serviceRecord.delete({ where: { id: serviceId } });
    return success(res, null, 'Service record deleted');
  } catch (err) { next(err); }
};

// ── Expenses ───────────────────────────────────────────────
const createExpense = async (req, res, next) => {
  try {
    const prisma = require('../config/prisma');
    const { category, title, amount, expenseDate, description, referenceId } = req.body;
    if (!category || !title || !amount || !expenseDate) {
      return res.status(400).json({ success: false, message: 'Category, title, amount, and date are required' });
    }
    const proofUrl = req.file ? `/uploads/${req.file.filename}` : null;
    const expense = await prisma.expense.create({
      data: {
        vehicleId: req.params.id, category, title, amount: parseFloat(amount),
        expenseDate: new Date(expenseDate), description: description || null,
        proofUrl, referenceId: referenceId || null,
      },
    });
    return success(res, expense, 'Expense logged', 201);
  } catch (err) { next(err); }
};

const getExpenses = async (req, res, next) => {
  try {
    const prisma = require('../config/prisma');
    const { from, to, category } = req.query;
    const where = { vehicleId: req.params.id };
    if (from || to) { where.expenseDate = {}; if (from) where.expenseDate.gte = new Date(from); if (to) where.expenseDate.lte = new Date(to); }
    if (category) where.category = category;
    const expenses = await prisma.expense.findMany({ where, orderBy: { expenseDate: 'desc' } });
    return success(res, expenses, 'Expenses fetched');
  } catch (err) { next(err); }
};

const updateExpense = async (req, res, next) => {
  try {
    const prisma = require('../config/prisma');
    const { expenseId } = req.params;
    const existing = await prisma.expense.findUnique({ where: { id: expenseId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Expense not found' });
    const proofUrl = req.file ? `/uploads/${req.file.filename}` : existing.proofUrl;
    const { category, title, amount, expenseDate, description } = req.body;
    const updated = await prisma.expense.update({
      where: { id: expenseId },
      data: {
        ...(category && { category }), ...(title && { title }),
        ...(amount && { amount: parseFloat(amount) }),
        ...(expenseDate && { expenseDate: new Date(expenseDate) }),
        ...(description !== undefined && { description: description || null }),
        proofUrl,
      },
    });
    return success(res, updated, 'Expense updated');
  } catch (err) { next(err); }
};

const deleteExpense = async (req, res, next) => {
  try {
    const prisma = require('../config/prisma');
    await prisma.expense.delete({ where: { id: req.params.expenseId } });
    return success(res, null, 'Expense deleted');
  } catch (err) { next(err); }
};

const getExpenseReport = async (req, res, next) => {
  try {
    const prisma = require('../config/prisma');
    const { vehicleId, from, to } = req.query;
    const dateFrom = from ? new Date(from) : new Date(new Date().getFullYear(), 0, 1);
    const dateTo = to ? new Date(to) : new Date();
    dateTo.setHours(23, 59, 59, 999);

    const vFilter = vehicleId ? { vehicleId } : {};

    // Query all 5 sources in parallel
    const [challans, services, insurance, tolls, expenses] = await Promise.all([
      prisma.challan.findMany({ where: { ...vFilter, status: 'PAID', paidAt: { gte: dateFrom, lte: dateTo } }, include: { vehicle: { select: { id: true, registrationNumber: true, make: true, model: true } } } }),
      prisma.serviceRecord.findMany({ where: { ...vFilter, status: 'COMPLETED', serviceDate: { gte: dateFrom, lte: dateTo } }, include: { vehicle: { select: { id: true, registrationNumber: true, make: true, model: true } } } }),
      prisma.insurancePolicy.findMany({ where: { ...vFilter, paidAmount: { gt: 0 }, createdAt: { gte: dateFrom, lte: dateTo } }, include: { vehicle: { select: { id: true, registrationNumber: true, make: true, model: true } } } }),
      prisma.fastagTransaction.findMany({ where: { type: 'TOLL', createdAt: { gte: dateFrom, lte: dateTo }, ...(vehicleId ? { fastag: { vehicleId } } : {}) }, include: { fastag: { include: { vehicle: { select: { id: true, registrationNumber: true, make: true, model: true } } } } } }),
      prisma.expense.findMany({ where: { ...vFilter, expenseDate: { gte: dateFrom, lte: dateTo } }, include: { vehicle: { select: { id: true, registrationNumber: true, make: true, model: true } } } }),
    ]);

    // Build unified expense list
    const allExpenses = [];
    let breakdown = { challans: 0, services: 0, parts: 0, insurance: 0, tolls: 0, compliance: 0, fuel: 0, maintenance: 0, misc: 0 };

    for (const c of challans) {
      const amt = c.amount + (c.userCharges || 0);
      breakdown.challans += amt;
      allExpenses.push({ source: 'CHALLAN', date: c.paidAt, vehicleId: c.vehicleId, vehicle: c.vehicle, title: c.violation || `Challan ${c.challanNumber || ''}`, amount: amt, proofUrl: c.proofImageUrl, category: 'challans' });
    }
    for (const s of services) {
      breakdown.services += s.totalCost;
      const partsTotal = (s.parts || []).reduce((sum, p) => sum + p.unitCost * p.quantity, 0);
      breakdown.parts += partsTotal;
      allExpenses.push({ source: 'SERVICE', date: s.serviceDate, vehicleId: s.vehicleId, vehicle: s.vehicle, title: s.title, amount: s.totalCost, proofUrl: s.receiptUrls?.[0] || null, category: 'services' });
    }
    for (const ins of insurance) {
      const amt = ins.paidAmount || ins.premium || 0;
      breakdown.insurance += amt;
      allExpenses.push({ source: 'INSURANCE', date: ins.createdAt, vehicleId: ins.vehicleId, vehicle: ins.vehicle, title: `${ins.insurer || 'Insurance'} — ${ins.planName || ins.policyNumber || ''}`, amount: amt, proofUrl: ins.documentUrl, category: 'insurance' });
    }
    for (const t of tolls) {
      breakdown.tolls += t.amount;
      allExpenses.push({ source: 'TOLL', date: t.createdAt, vehicleId: t.fastag?.vehicle?.id, vehicle: t.fastag?.vehicle, title: t.description || `Toll — ${t.tollPlaza || ''}`, amount: t.amount, proofUrl: null, category: 'tolls' });
    }
    for (const e of expenses) {
      const catKey = e.category === 'COMPLIANCE' ? 'compliance' : e.category === 'FUEL' ? 'fuel' : e.category === 'MAINTENANCE' ? 'maintenance' : 'misc';
      breakdown[catKey] = (breakdown[catKey] || 0) + e.amount;
      allExpenses.push({ source: 'EXPENSE', date: e.expenseDate, vehicleId: e.vehicleId, vehicle: e.vehicle, title: e.title, amount: e.amount, proofUrl: e.proofUrl, category: e.category.toLowerCase() });
    }

    allExpenses.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const totalSpent = Object.values(breakdown).reduce((s, v) => s + v, 0);

    // Build monthly timeline
    const timelineMap = {};
    for (const exp of allExpenses) {
      const month = new Date(exp.date).toISOString().slice(0, 7);
      if (!timelineMap[month]) timelineMap[month] = { period: month, challans: 0, services: 0, insurance: 0, tolls: 0, compliance: 0, fuel: 0, maintenance: 0, misc: 0, total: 0 };
      const cat = exp.category;
      timelineMap[month][cat] = (timelineMap[month][cat] || 0) + exp.amount;
      timelineMap[month].total += exp.amount;
    }
    const timeline = Object.values(timelineMap).sort((a, b) => a.period.localeCompare(b.period));

    return success(res, { summary: { totalSpent, breakdown }, timeline, expenses: allExpenses }, 'Expense report generated');
  } catch (err) { next(err); }
};

module.exports = { onboard, manualOnboard, uploadImages, deleteImage, uploadInvoice, setProfileImage, getAll, getById, getDashboardStats, syncChallans, updateGroup, upsertTyres, getAllServices, getServices, createService, updateService, deleteService, createExpense, getExpenses, updateExpense, deleteExpense, getExpenseReport };
