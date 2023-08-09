const mongoose = require("mongoose");
require("dotenv").config();
const User = require("./models/User");
const Repo = require("./models/Repo");

// Connect to MongoDB
const dbconnect = async () => {
  mongoose
    .connect(process.env.DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => {
      console.log("Connected to MongoDB");
    })
    .catch((error) => {
      console.error("Error connecting to MongoDB:", error);
    });
};

// save user to database
const saveUser = async (login, name, email, githubId) => {
  try {
    let user = await User.findOne({ githubId });

    if (!user) {
      user = new User({
        login,
        name,
        email,
        githubId,
      });
      await user.save();
      return `New user created: ${user.login}`;
    } else {
      let updates = [];

      if (user.name !== name) {
        user.name = name;
        updates.push(`name from '${user.name}' to '${name}'`);
      }
      if (user.email !== email) {
        user.email = email;
        updates.push(`email from '${user.email}' to '${email}'`);
      }
      if (user.login !== login) {
        user.login = login;
        updates.push(`username from '${user.login}' to '${login}'`);
      }

      if (updates.length > 0) {
        await user.save();
        return `User ${user.login} updated: ${updates.join(", ")}`;
      }

      return "User Already Exists";
    }
  } catch (error) {
    return `Error saving user: ${error}`;
  }
};

// save repo to database
const saveRepo = async (
  githubRepoId,
  DEICommitSHA,
  repoLink,
  badgeType,
  attachment,
  name
) => {
  try {
    // find user  with the provided name
    let user = await User.findOne({ name });

    const repo = new Repo({
      githubRepoId,
      DEICommitSHA,
      repoLink,
      badgeType,
      attachment,
      user: user._id,
    });

    const savedRepo = await repo.save();
    return savedRepo._id.valueOf();
  } catch (error) {
    console.error("Error saving repo:", error);
  }
};

module.exports = { dbconnect, saveUser, saveRepo };
