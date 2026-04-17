const paymentService = require('../services/payment.service');
const { success } = require('../utils/response');

const paySingle = async (req, res, next) => {
  try {
    const { challanId, method, transactionId } = req.body;
    const result = await paymentService.paySingle({
      challanId,
      method: method || 'CASH',
      transactionId,
      paidBy: req.user.id,
    });
    return success(res, result, 'Challan paid successfully', 201);
  } catch (err) {
    next(err);
  }
};

const payBulk = async (req, res, next) => {
  try {
    const { challanIds, method, transactionId } = req.body;
    const result = await paymentService.payBulk({
      challanIds,
      method: method || 'CASH',
      transactionId,
      paidBy: req.user.id,
    });
    return success(res, result, 'Bulk payment successful', 201);
  } catch (err) {
    next(err);
  }
};

const getById = async (req, res, next) => {
  try {
    const result = await paymentService.getPaymentById(req.params.id);
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

const getAll = async (req, res, next) => {
  try {
    const result = await paymentService.getAllPayments(req.query);
    return success(res, result);
  } catch (err) {
    next(err);
  }
};

module.exports = { paySingle, payBulk, getById, getAll };
