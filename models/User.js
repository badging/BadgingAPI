const { DataTypes } = require("sequelize");
const sequelize = require("../database/helpers/sequelize.js");

const User = sequelize.define("users", {
  login: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  githubId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  gitlabId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
});

module.exports = User;
