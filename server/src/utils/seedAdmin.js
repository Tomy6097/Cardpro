const User = require('../models/User');
const Settings = require('../models/Settings');
const logger = require('./logger');

const seedAdmin = async () => {
  try {
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      await User.create({
        username: process.env.ADMIN_USERNAME || 'cardpro',
        password: process.env.ADMIN_PASSWORD || 'tmj2026',
        role: 'admin',
        fullName: 'System Administrator',
        isActive: true,
      });
      logger.info('Default admin account created.');
    }

    const settingsExist = await Settings.findOne();
    if (!settingsExist) {
      await Settings.create({
        companyName: 'Cardpro',
        senderIdSms: 'CARDPRO',
        beemSenderId: 'CARDPRO',
      });
      logger.info('Default settings created.');
    }
  } catch (err) {
    logger.error('Seed error:', err.message);
  }
};

module.exports = { seedAdmin };
