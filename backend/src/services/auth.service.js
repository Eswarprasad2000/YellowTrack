const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const authRepository = require('../repositories/auth.repository');
const AppError = require('../utils/AppError');

// ── Helpers ────────────────────────────────────────────────

const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiresIn }
  );
};

const generateRefreshToken = () => {
  return crypto.randomBytes(40).toString('hex');
};

const getRefreshTokenExpiry = () => {
  // Parse the configured expiry (e.g. '7d', '30d') into a Date
  const match = config.jwt.refreshExpiresIn.match(/^(\d+)([dhms])$/);
  if (!match) return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // fallback 7d

  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers = { d: 86400000, h: 3600000, m: 60000, s: 1000 };
  return new Date(Date.now() + value * multipliers[unit]);
};

const createTokenPair = async (user) => {
  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken();
  const expiresAt = getRefreshTokenExpiry();

  await authRepository.createRefreshToken({
    token: refreshToken,
    userId: user.id,
    expiresAt,
  });

  return { accessToken, refreshToken, refreshTokenExpiresAt: expiresAt };
};

const sanitizeUser = (user) => {
  const { password, refreshTokens, ...rest } = user;
  return rest;
};

// ── Public API ─────────────────────────────────────────────

const register = async ({ name, email, password }) => {
  const existing = await authRepository.findUserByEmail(email);
  if (existing) {
    throw new AppError('Email already registered', 409);
  }

  const hashedPassword = await bcrypt.hash(password, 12);
  const user = await authRepository.createUser({
    name,
    email,
    password: hashedPassword,
  });

  const tokens = await createTokenPair(user);
  return { user: sanitizeUser(user), ...tokens };
};

const login = async ({ email, password }) => {
  const user = await authRepository.findUserByEmail(email);
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    throw new AppError('Invalid email or password', 401);
  }

  const tokens = await createTokenPair(user);
  return { user: sanitizeUser(user), ...tokens };
};

const refresh = async (refreshToken) => {
  if (!refreshToken) {
    throw new AppError('Refresh token is required', 401);
  }

  // Find the stored refresh token
  const storedToken = await authRepository.findRefreshToken(refreshToken);
  if (!storedToken) {
    throw new AppError('Invalid refresh token', 401);
  }

  // Check expiry
  if (new Date() > storedToken.expiresAt) {
    await authRepository.deleteRefreshToken(refreshToken);
    throw new AppError('Refresh token expired. Please login again.', 401);
  }

  // Token rotation: delete old token, issue new pair
  await authRepository.deleteRefreshToken(refreshToken);

  const user = await authRepository.findUserById(storedToken.userId);
  if (!user) {
    throw new AppError('User not found', 401);
  }

  const tokens = await createTokenPair(user);
  return { user: sanitizeUser(user), ...tokens };
};

const logout = async (refreshToken) => {
  if (refreshToken) {
    try {
      await authRepository.deleteRefreshToken(refreshToken);
    } catch {
      // Token may already be deleted — ignore
    }
  }
};

const logoutAll = async (userId) => {
  await authRepository.deleteAllUserRefreshTokens(userId);
};

module.exports = { register, login, refresh, logout, logoutAll };
