const paymentRepository = require('../repositories/payment.repository');
const challanRepository = require('../repositories/challan.repository');
const notificationService = require('./notification.service');
const AppError = require('../utils/AppError');

const paySingle = async ({ challanId, method, transactionId, paidBy }) => {
  const challan = await challanRepository.findById(challanId);
  if (!challan) throw new AppError('Challan not found', 404);
  if (challan.status === 'PAID') throw new AppError('Challan already paid', 400);

  const payment = await paymentRepository.create({
    totalAmount: challan.amount,
    method,
    transactionId: transactionId || `TXN-${Date.now()}`,
    paidBy,
    challanIds: [challanId],
  });

  await notificationService.create({
    userId: paidBy,
    type: 'CHALLAN_PAID',
    title: 'Challan Paid',
    message: `Challan of ₹${challan.amount} for ${challan.vehicle?.registrationNumber || 'vehicle'} paid successfully.`,
    entityId: challanId,
  });

  return payment;
};

const payBulk = async ({ challanIds, method, transactionId, paidBy }) => {
  if (!challanIds?.length) throw new AppError('No challans selected', 400);

  const challans = await Promise.all(
    challanIds.map((id) => challanRepository.findById(id))
  );

  const invalid = challans.filter((c) => !c || c.status === 'PAID');
  if (invalid.length) throw new AppError(`${invalid.length} challan(s) are already paid or not found`, 400);

  const totalAmount = challans.reduce((sum, c) => sum + c.amount, 0);

  const payment = await paymentRepository.create({
    totalAmount,
    method,
    transactionId: transactionId || `BULK-TXN-${Date.now()}`,
    paidBy,
    challanIds,
  });

  await notificationService.create({
    userId: paidBy,
    type: 'CHALLAN_PAID',
    title: 'Bulk Payment Successful',
    message: `${challanIds.length} challans totaling ₹${totalAmount} paid successfully.`,
  });

  return payment;
};

const getPaymentById = async (id) => {
  const payment = await paymentRepository.findById(id);
  if (!payment) throw new AppError('Payment not found', 404);
  return payment;
};

const getAllPayments = async (query) => {
  return paymentRepository.findAll(query);
};

module.exports = { paySingle, payBulk, getPaymentById, getAllPayments };
