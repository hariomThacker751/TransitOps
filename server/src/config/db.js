require('dotenv').config();
const { Sequelize } = require('sequelize');

if (process.env.NODE_ENV === 'production' && !process.env.DB_PASSWORD) {
  console.error('❌ Critical Error: DB_PASSWORD must be set in production environment.');
  process.exit(1);
}

const sequelize = new Sequelize(
  process.env.DB_NAME || 'transitops_db',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || '',
  {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT) || 3306,
    dialect: 'mysql',
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000,
    },
    timezone: '+00:00',
    define: {
      timestamps: false,
      underscored: false,
    },
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ MySQL connected successfully via Sequelize');
  } catch (error) {
    console.error('❌ MySQL connection failed:', error.message);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
