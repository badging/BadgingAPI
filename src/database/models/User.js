const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  login: { type: String, required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  githubId: { type: Number, required: true },
});

const User = mongoose.model("User", userSchema);

module.exports = User;
