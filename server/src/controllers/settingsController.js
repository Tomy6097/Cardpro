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
    'companyName', 'contactPhone', 'contactEmail',
    'senderIdSms', 'twilioAccountSid', 'twilioAuthToken',
    'twilioWhatsappFrom', 'beemApiKey', 'beemSecretKey', 'beemSenderId',
    'cloudinaryCloudName', 'cloudinaryApiKey', 'cloudinaryApiSecret',
    'defaultSmsTemplate', 'defaultWhatsappTemplate',
  ];

  for (const field of allowedFields) {
    if (req.body[field] !== undefined && req.body[field] !== '***masked***') {
      let val = req.body[field];
      // Normalize WhatsApp From number
      if (field === 'twilioWhatsappFrom' && val) {
        val = val.trim();
        if (!val.startsWith('whatsapp:')) {
          val = `whatsapp:+${val.replace(/\D/g, '')}`;
        } else {
          val = val.replace(/\s/g, '');
        }
      }
      settings[field] = val;
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

// ✅ NEW: WhatsApp Template Management

// Get all WhatsApp templates
exports.getWhatsappTemplates = asyncHandler(async (req, res) => {
  let settings = await Settings.findOne();
  if (!settings) {
    settings = await Settings.create({ companyName: 'Cardpro' });
  }

  res.json({
    success: true,
    templates: settings.whatsappTemplates || [],
    selectedTemplateSid: settings.selectedWhatsappTemplateSid || process.env.TWILIO_CONTENT_SID,
  });
});

// Add a new WhatsApp template
exports.addWhatsappTemplate = asyncHandler(async (req, res) => {
  const { name, contentSid, description } = req.body;

  if (!name || !contentSid) {
    return res.status(400).json({ success: false, message: 'Template name and Content SID are required.' });
  }

  let settings = await Settings.findOne();
  if (!settings) settings = new Settings();

  // Check if Content SID already exists
  const exists = settings.whatsappTemplates.some(t => t.contentSid === contentSid);
  if (exists) {
    return res.status(400).json({ success: false, message: 'This Content SID is already added.' });
  }

  settings.whatsappTemplates.push({
    name,
    contentSid,
    description: description || '',
    isActive: false,
  });

  await settings.save();

  await logActivity({
    action: 'add_whatsapp_template',
    description: `Added WhatsApp template: ${name}`,
    req,
  });

  res.json({ success: true, message: 'Template added successfully.', templates: settings.whatsappTemplates });
});

// Select/activate a WhatsApp template
exports.selectWhatsappTemplate = asyncHandler(async (req, res) => {
  const { contentSid } = req.body;

  if (!contentSid) {
    return res.status(400).json({ success: false, message: 'Content SID is required.' });
  }

  let settings = await Settings.findOne();
  if (!settings) settings = new Settings();

  // Mark all templates as inactive
  settings.whatsappTemplates.forEach(t => t.isActive = false);

  // Mark selected template as active
  const selectedTemplate = settings.whatsappTemplates.find(t => t.contentSid === contentSid);
  if (selectedTemplate) {
    selectedTemplate.isActive = true;
  }

  // Set the selected template SID
  settings.selectedWhatsappTemplateSid = contentSid;
  await settings.save();

  await logActivity({
    action: 'select_whatsapp_template',
    description: `Selected WhatsApp template: ${selectedTemplate?.name || contentSid}`,
    req,
  });

  res.json({ success: true, message: 'Template activated successfully.', selectedTemplateSid: contentSid });
});

// Delete a WhatsApp template
exports.deleteWhatsappTemplate = asyncHandler(async (req, res) => {
  const { contentSid } = req.params;

  let settings = await Settings.findOne();
  if (!settings) {
    return res.status(404).json({ success: false, message: 'Settings not found.' });
  }

  const templateIndex = settings.whatsappTemplates.findIndex(t => t.contentSid === contentSid);
  if (templateIndex === -1) {
    return res.status(404).json({ success: false, message: 'Template not found.' });
  }

  const templateName = settings.whatsappTemplates[templateIndex].name;

  // Check if this is the currently selected template
  if (settings.selectedWhatsappTemplateSid === contentSid) {
    settings.selectedWhatsappTemplateSid = null;
  }

  settings.whatsappTemplates.splice(templateIndex, 1);
  await settings.save();

  await logActivity({
    action: 'delete_whatsapp_template',
    description: `Deleted WhatsApp template: ${templateName}`,
    req,
  });

  res.json({ success: true, message: 'Template deleted successfully.', templates: settings.whatsappTemplates });
});
