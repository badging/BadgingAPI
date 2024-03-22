const { DataTypes } = require("sequelize");
const sequelize = require("../helpers/sequelize");

const Event = sequelize.define("events", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    allowNull: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  eventLink: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  date: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  badge: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  reviewers: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  applicationLink: {
    type: DataTypes.JSON,
    allowNull: true,
  },
  version: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
});

module.exports = Event;
