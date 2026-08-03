const Settings = require('../models/Settings');
const { uploadToCloudinary, deleteFromCloudinary } = require('../utils/cloudinary');
const { logActivity } = require('../utils/activityLogger');
const { asyncHandler } = require('../middleware/errorHandler');

exports.getSettings = asyncHandler(async (req, res) => {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({ companyName: 'Cardpro' });
  }

  // Mask sensitive fields
  const safeSettings = settings.toObject();
  if (safeSettings.twilioAuthToken) safeSettings.twilioAuthToken = '***masked***';
  if (safeSettings.beemSecretKey) safeSettings.beemSecretKey = '***masked***';
  if (safeSettings.cloudinaryApiSecret) safeSettings.cloudinaryApiSecret = '***masked***';

  res.json({ success: true, settings: safeSettings });
});

exports.updateSettings = asyncHandler(async (req, res) => {
  let settings = await Settings.findOne();
  if (!settings) settings = new Settings();

  const allowedFields = [
    'companyName', 'senderIdSms', 'twilioAccountSid', 'twilioAuthToken',
    'twilioWhatsappFrom', 'beemApiKey', 'beemSecretKey', 'beemSenderId',
    'cloudinaryCloudName', 'cloudinaryApiKey', 'cloudinaryApiSecret',
    'defaultSmsTemplate', 'defaultWhatsappTemplate',
  ];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined && req.body[field] !== '***masked***') {
      settings[field] = req.body[field];
    }
  }

  await settings.save();

  await logActivity({
    action: 'update_settings',
    description: 'System settings updated',
    req,
  });

  res.json({ success: true, message: 'Settings updated successfully.' });
});

exports.uploadLogo = asyncHandler(async (req, res) => {
  if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });

  let settings = await Settings.findOne();
  if (!settings) settings = new Settings();

  if (settings.logo?.publicId) {
    await deleteFromCloudinary(settings.logo.publicId);
  }

  const result = await uploadToCloudinary(req.file.buffer, {
    folder: 'cardpro/branding',
    public_id: 'company_logo',
    format: 'png',
  });

  settings.logo = { url: result.secure_url, publicId: result.public_id };
  await settings.save();

  res.json({ success: true, logo: settings.logo });
});
