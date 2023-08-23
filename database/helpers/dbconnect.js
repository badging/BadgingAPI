const sequelize = require("./sequelize");
const dbconnect = async () => {
  try {
    await sequelize.authenticate();
    try {
      await sequelize.sync();
      /**
       * to drop all tables and re-create them use:
       *
       * await sequelize.sync({ force: true });
       *
       * this is useful during development when model structure is
       * changing frequently
       */
    } catch (error) {
      console.error(error);
    }
  } catch (error) {
    console.error("Error connecting to MySQL:", error);
  }
};

module.exports = dbconnect;
