const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { logActivity } = require('../utils/activityLogger');
const { asyncHandler } = require('../middleware/errorHandler');

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

exports.login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required.' });
  }

  const user = await User.findOne({ username: username.toLowerCase().trim() });
  if (!user || !user.isActive) {
    return res.status(401).json({ success: false, message: 'Invalid credentials.' });
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Invalid credentials.' });
  }

  // Update last login
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  const token = signToken(user._id);

  await logActivity({
    user: user._id,
    userName: user.username,
    action: 'login',
    description: `User ${user.username} logged in`,
    req,
  });

  res.json({
    success: true,
    token,
    user: {
      id: user._id,
      username: user.username,
      fullName: user.fullName,
      role: user.role,
      assignedEvents: user.assignedEvents,
    },
  });
});

exports.logout = asyncHandler(async (req, res) => {
  await logActivity({
    user: req.user._id,
    userName: req.user.username,
    action: 'logout',
    description: `User ${req.user.username} logged out`,
    req,
  });

  res.json({ success: true, message: 'Logged out successfully.' });
});

exports.getMe = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).populate('assignedEvents', 'name slug status date');
  res.json({ success: true, user });
});

exports.changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, message: 'Both current and new passwords are required.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
  }

  const user = await User.findById(req.user._id);
  const isMatch = await user.comparePassword(currentPassword);

  if (!isMatch) {
    return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
  }

  user.password = newPassword;
  await user.save();

  res.json({ success: true, message: 'Password changed successfully.' });
});
