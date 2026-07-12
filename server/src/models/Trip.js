const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Trip = sequelize.define('Trip', {
  trip_id: {
    type: DataTypes.STRING(20),
    primaryKey: true,
  },
  source: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  destination: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  vehicle_reg: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  driver_id: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  cargo_weight_kg: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
  },
  planned_distance_km: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
  },
  actual_distance_km: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
  },
  fuel_consumed_liters: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
  },
  revenue: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
    defaultValue: 0,
  },
  status: {
    type: DataTypes.ENUM('Draft', 'Dispatched', 'Completed', 'Cancelled'),
    allowNull: false,
    defaultValue: 'Draft',
  },
  created_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  dispatched_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  completed_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
}, {
  tableName: 'trips',
  timestamps: false,
  indexes: [
    { fields: ['vehicle_reg'] },
    { fields: ['driver_id'] },
    { fields: ['status'] },
  ],
});

module.exports = Trip;
