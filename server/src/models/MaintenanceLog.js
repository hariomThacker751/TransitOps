const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const MaintenanceLog = sequelize.define('MaintenanceLog', {
  maintenance_id: {
    type: DataTypes.STRING(20),
    primaryKey: true,
  },
  vehicle_reg: {
    type: DataTypes.STRING(20),
    allowNull: true,
  },
  maintenance_type: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  cost: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
  status: {
    type: DataTypes.ENUM('Active', 'Closed'),
    allowNull: false,
    defaultValue: 'Active',
  },
}, {
  tableName: 'maintenance_logs',
  timestamps: false,
  indexes: [
    { fields: ['vehicle_reg'] },
    { fields: ['status'] },
  ],
});

module.exports = MaintenanceLog;
