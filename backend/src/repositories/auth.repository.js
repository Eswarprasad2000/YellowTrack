const prisma = require('../config/prisma');

const findUserByEmail = async (email) => {
  return prisma.user.findUnique({ where: { email } });
};

const findUserById = async (id) => {
  return prisma.user.findUnique({ where: { id } });
};

const createUser = async (data) => {
  return prisma.user.create({ data });
};

// ── Refresh Token operations ───────────────────────────────

const createRefreshToken = async ({ token, userId, expiresAt }) => {
  return prisma.refreshToken.create({
    data: { token, userId, expiresAt },
  });
};

const findRefreshToken = async (token) => {
  return prisma.refreshToken.findUnique({ where: { token } });
};

const deleteRefreshToken = async (token) => {
  return prisma.refreshToken.delete({ where: { token } });
};

const deleteAllUserRefreshTokens = async (userId) => {
  return prisma.refreshToken.deleteMany({ where: { userId } });
};

const deleteExpiredTokens = async () => {
  return prisma.refreshToken.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  });
};

module.exports = {
  findUserByEmail,
  findUserById,
  createUser,
  createRefreshToken,
  findRefreshToken,
  deleteRefreshToken,
  deleteAllUserRefreshTokens,
  deleteExpiredTokens,
};
