const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

// ─── Helpers ────────────────────────────────────────────────────────────────

const signAccessToken = (userId, role) =>
  jwt.sign({ userId, role }, process.env.JWT_ACCESS_SECRET, {
    expiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',
  });

const signRefreshToken = (userId) =>
  jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d',
  });

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days in ms
  path: '/',
};

const clearRefreshCookie = (res) =>
  res.clearCookie('refreshToken', { ...REFRESH_COOKIE_OPTIONS, maxAge: 0 });

const userPublicFields = (user) => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  role: user.role,
  profilePhoto: user.profilePhoto,
});

// ─── Controllers ────────────────────────────────────────────────────────────

exports.register = catchAsync(async (req, res, next) => {
  const { name, email, phone, password, role } = req.body;

  if (await User.findOne({ email: email.toLowerCase() })) {
    return next(new AppError('Email already registered', 409, 'EMAIL_EXISTS'));
  }
  if (await User.findOne({ phone })) {
    return next(new AppError('Phone number already registered', 409, 'PHONE_EXISTS'));
  }

  const user = await User.create({ name, email, phone, password, role });

  const accessToken = signAccessToken(user._id, user.role);
  const refreshToken = signRefreshToken(user._id);

  user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  await user.save({ validateBeforeSave: false });

  res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);

  res.status(201).json({
    success: true,
    accessToken,
    user: userPublicFields(user),
  });
});

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() }).select(
    '+password +refreshTokenHash'
  );

  if (!user) {
    return next(new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS'));
  }
  if (user.isSuspended) {
    return next(
      new AppError('Your account has been suspended. Contact support.', 403, 'ACCOUNT_SUSPENDED')
    );
  }
  if (!(await user.comparePassword(password))) {
    return next(new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS'));
  }

  const accessToken = signAccessToken(user._id, user.role);
  const refreshToken = signRefreshToken(user._id);

  user.refreshTokenHash = await bcrypt.hash(refreshToken, 10);
  await user.save({ validateBeforeSave: false });

  res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);

  res.status(200).json({
    success: true,
    accessToken,
    user: userPublicFields(user),
  });
});

exports.refreshToken = catchAsync(async (req, res, next) => {
  const token = req.cookies?.refreshToken;
  if (!token) {
    return next(new AppError('No refresh token', 401, 'NO_REFRESH_TOKEN'));
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
  } catch {
    clearRefreshCookie(res);
    return next(new AppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN'));
  }

  const user = await User.findById(decoded.userId).select('+refreshTokenHash');
  if (!user || user.isSuspended) {
    clearRefreshCookie(res);
    return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
  }

  const isMatch = user.refreshTokenHash
    ? await bcrypt.compare(token, user.refreshTokenHash)
    : false;

  if (!isMatch) {
    clearRefreshCookie(res);
    return next(new AppError('Refresh token is invalid or has been revoked', 401, 'TOKEN_REUSE'));
  }

  // Token rotation
  const newAccessToken = signAccessToken(user._id, user.role);
  const newRefreshToken = signRefreshToken(user._id);

  user.refreshTokenHash = await bcrypt.hash(newRefreshToken, 10);
  await user.save({ validateBeforeSave: false });

  res.cookie('refreshToken', newRefreshToken, REFRESH_COOKIE_OPTIONS);

  res.status(200).json({ success: true, accessToken: newAccessToken });
});

exports.logout = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.user.userId);
  if (user) {
    user.refreshTokenHash = null;
    await user.save({ validateBeforeSave: false });
  }

  clearRefreshCookie(res);

  res.status(200).json({ success: true, message: 'Logged out successfully' });
});

exports.forgotPassword = catchAsync(async (req, res, next) => {
  const { email } = req.body;

  const user = await User.findOne({ email: email.toLowerCase() });

  // Always return the same response to prevent user enumeration
  const genericResponse = {
    success: true,
    message: 'If an account exists, a reset code has been sent.',
  };

  if (!user) {
    return res.status(200).json(genericResponse);
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  if (process.env.NODE_ENV === 'development') {
    console.log(`[DEV] OTP for ${email}: ${otp}`);
  }

  user.resetOtp = await bcrypt.hash(otp, 10);
  user.resetOtpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  await user.save({ validateBeforeSave: false });

  const response = { ...genericResponse };
  if (process.env.NODE_ENV === 'development') {
    response.otp = otp; // convenience for testing
  }

  res.status(200).json(response);
});

exports.resetPassword = catchAsync(async (req, res, next) => {
  const { email, otp, newPassword } = req.body;

  const invalid = () => next(new AppError('Invalid or expired reset code', 400, 'INVALID_OTP'));

  const user = await User.findOne({ email: email.toLowerCase() }).select(
    '+resetOtp +resetOtpExpiry'
  );
  if (!user || !user.resetOtp || !user.resetOtpExpiry) return invalid();
  if (user.resetOtpExpiry < Date.now()) return invalid();

  const otpMatch = await bcrypt.compare(otp, user.resetOtp);
  if (!otpMatch) return invalid();

  user.password = newPassword; // pre-save hook will hash it
  user.resetOtp = undefined;
  user.resetOtpExpiry = undefined;
  user.refreshTokenHash = null; // invalidate all active sessions
  await user.save();

  res.status(200).json({ success: true, message: 'Password reset successful' });
});
