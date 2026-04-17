const authService = require('../services/auth.service');
const { registerSchema, loginSchema } = require('../validations/auth.validation');
const { success } = require('../utils/response');
const config = require('../config');

const REFRESH_COOKIE_NAME = 'refreshToken';

const cookieOptions = (expiresAt) => ({
  httpOnly: true,
  secure: config.nodeEnv === 'production',
  sameSite: config.nodeEnv === 'production' ? 'strict' : 'lax',
  path: '/api/auth',
  expires: expiresAt,
});

const register = async (req, res, next) => {
  try {
    const validated = registerSchema.parse(req.body);
    const { user, accessToken, refreshToken, refreshTokenExpiresAt } =
      await authService.register(validated);

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, cookieOptions(refreshTokenExpiresAt));
    return success(res, { user, accessToken }, 'Registration successful', 201);
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const validated = loginSchema.parse(req.body);
    const { user, accessToken, refreshToken, refreshTokenExpiresAt } =
      await authService.login(validated);

    res.cookie(REFRESH_COOKIE_NAME, refreshToken, cookieOptions(refreshTokenExpiresAt));
    return success(res, { user, accessToken }, 'Login successful');
  } catch (err) {
    next(err);
  }
};

const refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    const { user, accessToken, refreshToken: newRefreshToken, refreshTokenExpiresAt } =
      await authService.refresh(refreshToken);

    res.cookie(REFRESH_COOKIE_NAME, newRefreshToken, cookieOptions(refreshTokenExpiresAt));
    return success(res, { user, accessToken }, 'Token refreshed');
  } catch (err) {
    // Clear the bad cookie on failure
    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
    await authService.logout(refreshToken);

    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
    return success(res, null, 'Logged out successfully');
  } catch (err) {
    next(err);
  }
};

const logoutAll = async (req, res, next) => {
  try {
    await authService.logoutAll(req.user.id);

    res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
    return success(res, null, 'Logged out from all devices');
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, refresh, logout, logoutAll };
