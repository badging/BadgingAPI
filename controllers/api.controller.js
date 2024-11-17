const { findUser } = require("../database/controllers/user.controller.js");
const Repo = require("../database/models/repo.model.js");
const {
  welcome,
  getResults,
  endReview,
  assignChecklist,
  saveEvent,
} = require("../event_badging/logic/index.js");
const github_helpers = require("../providers/github/APICalls.js");
const gitlab_helpers = require("../providers/gitlab/APICalls.js");
const { githubAuth, githubApp, gitlabAuth } = require("../providers/index.js");

const login = (req, res) => {
  const provider = req.query.provider;

  if (provider === "github") {
    githubAuth(req, res);
  } else if (provider === "gitlab") {
    gitlabAuth(req, res);
  } else {
    res.status(400).send(`Unknown provider: ${provider}`);
  }
};

const reposToBadge = async (req, res) => {
  const selectedRepos = (await req.body.repos) || [];
  const userId = req.body.userId;
  const provider = req.body.provider;
  const repositoryIds = selectedRepos.map((repo) => repo.id);
  if (!provider) {
    res.status(400).send("provider missing");
    return;
  }

  if (!userId) {
    res.status(400).send("userId missing");
    return;
  }

  let user = null;
  try {
    user = await findUser(userId);
    if (!user) {
      res.status(404).json("User not found");
      return;
    }
  } catch (error) {
    res.status(500).json("Error fetching user data");
    return;
  }

  // Process the selected repos as needed
  if (process.env.NODE_ENV === "development") {
    if (provider === "github") {
      const results = await github_helpers.scanRepositories(
        user.id,
        user.name,
        user.email,
        selectedRepos
      );
      res.status(200).json({ results });
    } else if (provider === "gitlab") {
      const results = await gitlab_helpers.scanRepositories(
        user.id,
        user.name,
        user.email,
        selectedRepos
      );
      res.status(200).json({ results });
    }
  } else if (process.env.NODE_ENV === "production") {
    // process the selected repositories in production
    if (provider === "github") {
      const results = await github_helpers.scanRepositories(
        user.id,
        user.name,
        user.email,
        repositoryIds
      );
      res.status(200).json({ results });
    } else if (provider === "gitlab") {
      const results = await gitlab_helpers.scanRepositories(
        user.id,
        user.name,
        user.email,
        repositoryIds
      );
      res.status(200).json({ results });
    }
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

const handleEventBadging = async (req, res) => {
  const {
    headers: { "x-github-event": name },
    body: payload,
  } = req;
  const octokit = await githubApp.getInstallationOctokit(
    payload.installation.id
  );

  // perform actions on application issues only
  if (payload.issue?.title.match(/event/i)) {
    // when applicant issue is open, welcome the applicant
    if (name === "issues" && payload.action === "opened") {
      welcome(octokit, payload);
    }

    // when issue is assigned, trigger the assign algorithm
    if (name === "issues" && payload.action === "assigned") {
      assignChecklist(octokit, payload);
    }

    // comment commands
    if (name === "issue_comment" && payload.action === "created") {
      // get results
      if (payload.comment.body.match("/result")) {
        getResults(octokit, payload);
      }

      // end review
      if (payload.comment.body.match("/end")) {
        endReview(octokit, payload);
      }
    }

    // when issue is closed, update the readme with the event
    if (name === "issues" && payload.action === "closed") {
      saveEvent(octokit, payload);
    }
  } else if (
    name === "installation" &&
    payload.action === "new_permissions_accepted"
  ) {
    console.info("New permissions accepted");
  } else if (name === "*") {
    console.info(
      `Webhook: ${name}.${payload.action} not yet automated or needed`
    );
  }

  console.info(`Received ${name} event from Github`);
  res.send("ok");
};

const healthCheck = (req, res) => {
  try {
    res.json({ message: "Project Badging server up and running" });
  } catch (error) {
    console.error(error);
    if (error.statusCode && error.statusCode !== 200) {
      res.status(error.statusCode).json({
        error: "Error",
        message: "our bad, something is wrong with the server configuration",
      });
    } else {
      res.status(500).json({
        error: "Internal Server Error",
        message: "An unexpected error occurred at our end",
      });
    }
  }
};

module.exports = {
  login,
  reposToBadge,
  badgedRepos,
  handleEventBadging,
  healthCheck,
};
