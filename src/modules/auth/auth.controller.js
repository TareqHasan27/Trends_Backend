const authService = require('./auth.service');
const { success, error, asyncHandler } = require('../../utils/helpers');

const login = asyncHandler(async (req, res) => {
  const tokens = await authService.login(req.body.email, req.body.password);
  success(res, tokens);
});

const refresh = asyncHandler(async (req, res) => {
  const token = req.body.refreshToken;
  if (!token) return error(res, 400, 'Refresh token required');
  const tokens = await authService.refresh(token);
  success(res, tokens);
});

const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user.id);
  success(res, { message: 'Logged out successfully' });
});

const session = asyncHandler(async (req, res) => {
  const data = await authService.getSession(req.user.id);
  success(res, data);
});

module.exports = { login, refresh, logout, session };
