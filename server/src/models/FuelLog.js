const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const FuelLog = sequelize.define('FuelLog', {
  fuel_log_id: {
    type: DataTypes.STRING(20),
    primaryKey: true,
  },
  vehicle_reg: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  trip_id: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  liters: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
  },
  cost: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
}, {
  tableName: 'fuel_logs',
  timestamps: false,
  indexes: [
    { fields: ['vehicle_reg'] },
    { fields: ['trip_id'] },
    { fields: ['date'] },
  ],
});

module.exports = FuelLog;
