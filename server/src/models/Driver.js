const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Driver = sequelize.define('Driver', {
  driver_id: {
    type: DataTypes.STRING(20),
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  license_number: {
    type: DataTypes.STRING(50),
    allowNull: true,
    unique: true,
  },
  license_category: {
    type: DataTypes.STRING(30),
    allowNull: true,
  },
  license_expiry_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  contact_number: {
    type: DataTypes.STRING(30),
    allowNull: true,
  },
  safety_score: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('Available', 'On Trip', 'Off Duty', 'Suspended'),
    allowNull: false,
    defaultValue: 'Available',
  },
}, {
  tableName: 'drivers',
  timestamps: false,
});

module.exports = Driver;
