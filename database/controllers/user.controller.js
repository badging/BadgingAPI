const User = require("../models/user.model");

const saveUser = async (login, name, email, githubId) => {
  try {
    // Find a user by their GitHub ID
    let user = await User.findOne({ where: { githubId } });

    if (!user) {
      // If the user doesn't exist, create a new one
      user = await User.create({
        login,
        name,
        email,
        githubId,
      });
      console.log("New user created");
      return `New user created: ${user.login}`;
    } else {
      // User already exists; update if necessary
      const updates = [];

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

      console.log("User Already Exists");
      return "User Already Exists";
    }
  } catch (error) {
    return `Error saving user: ${error.message}`;
  }
};

module.exports = saveUser;
