const { exec } = require("child_process");
require("dotenv").config();

const augurAPI = async (id, level, url) => {
  try {
    const command = `curl --request POST \
      --url 'https://projectbadge.chaoss.io/api/unstable/dei/repo/add?id=${id}&level=${level}&url=${encodeURIComponent(
      url
    )}' \
      --header 'Authorization: Client ${process.env.AUGUR_API_KEY}'`;

    const { stdout } = await execAsync(command);

    return stdout;
  } catch (error) {
    console.error("Error:", error.message);
    throw error;
  }
};

const execAsync = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout) => {
      if (error) {
        reject(error);
      } else {
        resolve({ stdout });
      }
    });
  });
};

module.exports = augurAPI;
