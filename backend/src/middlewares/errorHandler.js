const { error } = require('../utils/response');

const errorHandler = (err, req, res, _next) => {
  console.error(`[ERROR] ${err.message}`, err.stack);

  // Zod validation error
  if (err.name === 'ZodError') {
    const messages = err.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
    return error(res, 'Validation failed', 400, messages);
  }

  // Prisma known request error (works for both PostgreSQL and MongoDB)
  if (err.code === 'P2002') {
    const field = err.meta?.target?.join(', ') || 'field';
    return error(res, `Duplicate value for ${field}`, 409);
  }

  if (err.code === 'P2025') {
    return error(res, 'Record not found', 404);
  }

  // MongoDB duplicate key error
  if (err.code === 11000) {
    return error(res, 'Duplicate entry', 409);
  }

  // Custom AppError
  if (err.isOperational) {
    return error(res, err.message, err.statusCode);
  }

  // Fallback
  return error(res, 'Internal server error', 500);
};

module.exports = errorHandler;
