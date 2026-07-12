const cron = require('node-cron');
const { Op } = require('sequelize');
const Driver = require('../models/Driver');

/**
 * Runs every day at midnight (00:00)
 * Checks all drivers whose license has expired
 * and updates their status to 'Suspended'.
 */
const startLicenseCheckCron = () => {
  cron.schedule('0 0 * * *', async () => {
    try {
      console.log('[Cron] Running daily license expiry check...');
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find drivers whose license is expired and are not already suspended
      const expiredDrivers = await Driver.findAll({
        where: {
          license_expiry_date: {
            [Op.lt]: today
          },
          status: {
            [Op.notIn]: ['Suspended']
          }
        }
      });

      if (expiredDrivers.length > 0) {
        console.log(`[Cron] Found ${expiredDrivers.length} drivers with expired licenses. Suspending them...`);
        
        for (const driver of expiredDrivers) {
          await Driver.update(
            { status: 'Suspended' },
            { where: { driver_id: driver.driver_id } }
          );
          console.log(`[Cron] Suspended driver: ${driver.driver_id}`);
        }
      } else {
        console.log('[Cron] No expired licenses found.');
      }
    } catch (error) {
      console.error('[Cron] Error running license expiry check:', error);
    }
  });
};

module.exports = startLicenseCheckCron;
