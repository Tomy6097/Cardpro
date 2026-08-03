const User = require('../models/User');
const { logActivity } = require('../utils/activityLogger');
const { asyncHandler } = require('../middleware/errorHandler');

exports.createScanner = asyncHandler(async (req, res) => {
  const { username, password, fullName, assignedEvents } = req.body;

  if (!username || !password) {
    return res.status(400).json({ success: false, message: 'Username and password are required.' });
  }

  const existing = await User.findOne({ username: username.toLowerCase() });
  if (existing) {
    return res.status(400).json({ success: false, message: 'Username already exists.' });
  }

  const scanner = await User.create({
    username: username.toLowerCase(),
    password,
    fullName,
    role: 'scanner',
    assignedEvents: assignedEvents || [],
    createdBy: req.user._id,
  });

  await logActivity({
    action: 'create_scanner',
    description: `Scanner account "${scanner.username}" created`,
    req,
  });

  res.status(201).json({ success: true, user: scanner });
});

exports.getScanners = asyncHandler(async (req, res) => {
  const scanners = await User.find({ role: 'scanner' })
    .populate('assignedEvents', 'name slug status')
    .sort({ createdAt: -1 });
  res.json({ success: true, scanners });
});

exports.getScanner = asyncHandler(async (req, res) => {
  const scanner = await User.findById(req.params.id).populate('assignedEvents', 'name slug status');
  if (!scanner) return res.status(404).json({ success: false, message: 'Scanner not found.' });
  res.json({ success: true, scanner });
});

exports.updateScanner = asyncHandler(async (req, res) => {
  const { fullName, assignedEvents, isActive, password } = req.body;

  const scanner = await User.findById(req.params.id);
  if (!scanner || scanner.role !== 'scanner') {
    return res.status(404).json({ success: false, message: 'Scanner not found.' });
  }

  if (fullName) scanner.fullName = fullName;
  if (assignedEvents) scanner.assignedEvents = assignedEvents;
  if (isActive !== undefined) scanner.isActive = isActive;
  if (password) scanner.password = password;

  await scanner.save();
  res.json({ success: true, user: scanner });
});

exports.deleteScanner = asyncHandler(async (req, res) => {
  const scanner = await User.findById(req.params.id);
  if (!scanner || scanner.role !== 'scanner') {
    return res.status(404).json({ success: false, message: 'Scanner not found.' });
  }

  await User.findByIdAndDelete(req.params.id);

  await logActivity({
    action: 'delete_scanner',
    description: `Scanner "${scanner.username}" deleted`,
    req,
  });

  res.json({ success: true, message: 'Scanner deleted.' });
});
