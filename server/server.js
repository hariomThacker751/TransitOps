require('dotenv').config();
const app = require('./src/app');
const startLicenseCheckCron = require('./src/cron/licenseCheck');

const PORT = process.env.PORT || 5000;

// Start cron jobs
startLicenseCheckCron();

// Suppress console.log in production
if (process.env.NODE_ENV === 'production') {
  console.log = function() {};
}

app.listen(PORT, () => {
  console.log(`\n🚀 TransitOps API Server running on port ${PORT}`);
  console.log(`   Environment : ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Base URL    : http://localhost:${PORT}/api`);
  console.log(`   Health      : http://localhost:${PORT}/api/health\n`);
});
