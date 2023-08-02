const mongoose = require("mongoose");

const repoSchema = new mongoose.Schema({
  githubRepoId: { type: Number, required: true },
  DEICommitSHA: { type: String, required: true },
  repoLink: { type: String, required: true },
  badgeType: { type: String, required: true },
  attachment: { type: String, required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
});

const Repo = mongoose.model("Repo", repoSchema);

module.exports = Repo;
