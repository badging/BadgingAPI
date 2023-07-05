const axios = require("axios");
require("dotenv").config();

const augurAPI = async (id, level, url) => {
  try {
    const response = await axios.post(
      "https://projectbadge.chaoss.io/api/unstable/dei/repo",
      { id, level, url },
      {
        headers: {
          Authorization: process.env.AUGUR_API_KEY,
        },
      }
    );

    return response;
  } catch (error) {
    console.error("Error:", error.message);
    throw error;
  }
};

module.exports = augurAPI;
