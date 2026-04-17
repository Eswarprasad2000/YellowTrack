const fastagRepository = require('../repositories/fastag.repository');
const vehicleRepository = require('../repositories/vehicle.repository');
const alertService = require('./alert.service');
const { getRandomTollAmount, getRandomTollPlaza } = require('./mock/fastag.mock');
const AppError = require('../utils/AppError');
const prisma = require('../config/prisma');

const createFastag = async (vehicleId, tagId, provider, initialBalance = 500) => {
  const vehicle = await vehicleRepository.findById(vehicleId);
  if (!vehicle) throw new AppError('Vehicle not found', 404);

  const existing = await fastagRepository.findByTagId(tagId);
  if (existing) throw new AppError('FASTag ID already in use', 409);

  // Deactivate any existing active FASTag for this vehicle
  await fastagRepository.deactivateByVehicleId(vehicleId);

  const expiryDate = new Date();
  expiryDate.setFullYear(expiryDate.getFullYear() + 5);

  const fastag = await fastagRepository.create({
    vehicleId,
    tagId,
    provider: provider || null,
    balance: initialBalance,
    status: 'ACTIVE',
    isActive: true,
    enrolledAt: new Date(),
    expiryDate,
  });

  // Create initial recharge transaction
  if (initialBalance > 0) {
    await fastagRepository.createTransaction({
      fastagId: fastag.id,
      type: 'RECHARGE',
      amount: initialBalance,
      balance: initialBalance,
      description: 'Initial balance on FASTag creation',
    });
  }

  return fastagRepository.findById(fastag.id);
};

const rechargeFastag = async (fastagId, amount) => {
  const fastag = await fastagRepository.findById(fastagId);
  if (!fastag) throw new AppError('FASTag not found', 404);
  if (!fastag.isActive) throw new AppError('FASTag is not active', 400);

  const newBalance = fastag.balance + amount;

  // Atomic: update balance + create transaction
  await prisma.$transaction(async (tx) => {
    await tx.fastag.update({ where: { id: fastagId }, data: { balance: newBalance } });
    await tx.fastagTransaction.create({
      data: {
        fastagId,
        type: 'RECHARGE',
        amount,
        balance: newBalance,
        description: `Recharge of ₹${amount}`,
      },
    });
  });

  return fastagRepository.findById(fastagId);
};

const simulateTollDeductions = async () => {
  const activeFastags = await fastagRepository.findAllActive();
  if (activeFastags.length === 0) return { processed: 0 };

  // Pick 30-60% randomly
  const count = Math.max(1, Math.floor(activeFastags.length * (0.3 + Math.random() * 0.3)));
  const shuffled = activeFastags.sort(() => Math.random() - 0.5).slice(0, count);

  let processed = 0;
  let alerts = 0;

  for (const fastag of shuffled) {
    const tollAmount = getRandomTollAmount();
    if (tollAmount > fastag.balance) continue; // Skip if insufficient balance

    const newBalance = fastag.balance - tollAmount;
    const tollPlaza = getRandomTollPlaza();

    try {
      await prisma.$transaction(async (tx) => {
        await tx.fastag.update({ where: { id: fastag.id }, data: { balance: newBalance } });
        await tx.fastagTransaction.create({
          data: {
            fastagId: fastag.id,
            type: 'TOLL',
            amount: tollAmount,
            balance: newBalance,
            description: `Toll - ${tollPlaza}`,
            tollPlaza,
          },
        });
      });
      processed++;

      // Low balance alert
      if (newBalance < 100 && fastag.vehicle) {
        try {
          await alertService.triggerFastagAlert(
            fastag.vehicle.registrationNumber,
            newBalance,
            fastag.id
          );
          alerts++;
        } catch { /* ignore alert errors */ }
      }
    } catch { /* ignore individual failures */ }
  }

  console.log(`   ✅ FASTag: ${processed} toll deductions, ${alerts} low-balance alerts`);
  return { processed, alerts };
};

const getAll = async (query) => fastagRepository.findAll(query);
const getById = async (id) => {
  const fastag = await fastagRepository.findById(id);
  if (!fastag) throw new AppError('FASTag not found', 404);
  return fastag;
};
const getByVehicle = async (vehicleId) => fastagRepository.findActiveByVehicleId(vehicleId);
const getTransactions = async (fastagId, query) => fastagRepository.getTransactions(fastagId, query);
const getStats = async () => fastagRepository.getStats();

module.exports = { createFastag, rechargeFastag, simulateTollDeductions, getAll, getById, getByVehicle, getTransactions, getStats };
