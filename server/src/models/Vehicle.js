const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Vehicle = sequelize.define('Vehicle', {
  registration_number: {
    type: DataTypes.STRING(20),
    primaryKey: true,
  },
  vehicle_name_model: {
    type: DataTypes.STRING(150),
    allowNull: true,
  },
  type: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
  max_load_capacity_kg: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  odometer_km: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: 0,
  },
  acquisition_cost: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('Available', 'On Trip', 'In Shop', 'Retired'),
    allowNull: false,
    defaultValue: 'Available',
  },
  region: {
    type: DataTypes.STRING(50),
    allowNull: true,
  },
}, {
  tableName: 'vehicles',
  timestamps: false,
});

module.exports = Vehicle;
