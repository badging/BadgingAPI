require("dotenv").config();

const augurAPI = async (id, level, url) => {
  try {
    const apiUrl = `https://projectbadge.chaoss.io/api/unstable/dei/repo/add?id=${id}&level=${level}&url=${url}`;
    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Client ${process.env.AUGUR_API_KEY}`,
      },
    });

    if (!response.ok) {
      throw new Error("Request failed with status: " + response.status);
    }

    return response;
  } catch (error) {
    console.error("Error:", error.message);
    throw error;
  }
};

module.exports = augurAPI;