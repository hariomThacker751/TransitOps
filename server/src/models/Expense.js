const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Expense = sequelize.define('Expense', {
  expense_id: {
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
  expense_type: {
    type: DataTypes.STRING(100),
    allowNull: true,
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true,
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
  },
}, {
  tableName: 'expenses',
  timestamps: false,
  indexes: [
    { fields: ['vehicle_reg'] },
    { fields: ['trip_id'] },
    { fields: ['date'] },
    { fields: ['expense_type'] },
  ],
});

module.exports = Expense;
