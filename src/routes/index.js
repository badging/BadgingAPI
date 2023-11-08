const Repo = require("../../database/models/repo.model.js");
const github_helpers = require("../helpers/github.js");
const github_routes = require("./github.js");

/**
 * Redirects the user to the GitHub OAuth login page for authentication.
 * @param {*} req - object containing the client req details.
 * @param {*} res - object used to send a redirect response.
 */
const login = (req, res) => {
  const provider = req.query.provider;

  if (provider === "github") {
    github_helpers.authorizeApplication(res);
  } else {
    res.status(400).send(`Unknown provider: ${provider}`);
  }
};

const reposToBadge = async (req, res) => {
  const selectedRepos = (await req.body.repos) || [];
  const name = req.body.name || "";
  const email = req.body.email || "";
  const provider = req.body.provider;

  if (!provider) {
    res.status(400).send("provider missing");
  }

  // Process the selected repos as needed
  if (provider === "github") {
    const results = await github_helpers.scanRepositories(
      name,
      email,
      selectedRepos
    );
    res.status(200).json({ results });
  } else {
    res.status(400).send(`Unknown provider: ${provider}`);
  }
};

const badgedRepos = async (req, res) => {
  try {
    // Use Sequelize to find all repos, excluding the DEICommitSHA field
    const repos = await Repo.findAll({
      attributes: { exclude: ["DEICommitSHA"] },
    });

    // Extract the relevant information from the repos
    const formattedRepos = repos.map((repo) => ({
      id: repo.id,
      githubRepoId: repo.githubRepoId,
      repoLink: repo.repoLink,
      badgeType: repo.badgeType,
      attachment: repo.attachment,
      createdAt: repo.createdAt,
      updatedAt: repo.updatedAt,
      userId: repo.userId,
    }));

    res.json(formattedRepos);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving repos", error });
  }
};

const setupRoutes = (app) => {
  app.get("/api/login", login);
  app.get("/api/badgedRepos", badgedRepos);
  app.post("/api/repos-to-badge", reposToBadge);

  github_routes.setupGitHubRoutes(app);
};

module.exports = {
  setupRoutes,
};
