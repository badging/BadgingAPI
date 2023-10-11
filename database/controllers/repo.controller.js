const Repo = require("../models/repo.model");
const User = require("../models/user.model");

const saveRepo = async (
  githubRepoId,
  DEICommitSHA,
  repoLink,
  badgeType,
  attachment,
  name
) => {
  try {
    // Find a user by their name
    const user = await User.findOne({ where: { name } });

    if (!user) {
      throw new Error(`User with name '${name}' not found.`);
    }

    // Create a new repo associated with the user
    const repo = await Repo.create({
      githubRepoId,
      DEICommitSHA,
      repoLink,
      badgeType,
      attachment,
      userId: user.id,
    });

    return repo.id;
  } catch (error) {
    console.error("Error saving repo:", error.message);
  }
};

module.exports = saveRepo;
