require('dotenv').config();
const app = require('./src/app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`\n🚀 TransitOps API Server running on port ${PORT}`);
  console.log(`   Environment : ${process.env.NODE_ENV || 'development'}`);
  console.log(`   Base URL    : http://localhost:${PORT}/api`);
  console.log(`   Health      : http://localhost:${PORT}/api/health\n`);
});
