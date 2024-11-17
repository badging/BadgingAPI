// Database imports
const { findUser } = require("../database/controllers/user.controller.js");
const Repo = require("../database/models/repo.model.js");

// Event badging imports
const {
  welcome,
  getResults,
  endReview,
  assignChecklist,
  saveEvent,
} = require("../event_badging/logic/index.js");

// Provider imports
const github_helpers = require("../providers/github/APICalls.js");
const gitlab_helpers = require("../providers/gitlab/APICalls.js");
const { githubAuth, githubApp, gitlabAuth } = require("../providers/index.js");

// Error handling utility
const handleError = (res, statusCode, message) => {
  return res.status(statusCode).json({ error: message });
};

const login = (req, res) => {
  const { provider } = req.query;

  switch (provider) {
    case "github":
      return githubAuth(req, res);
    case "gitlab":
      return gitlabAuth(req, res);
    default:
      return handleError(res, 400, `Unknown provider: ${provider}`);
  }
};

const scanRepositories = async (user, provider, repos) => {
  const helpers = provider === "github" ? github_helpers : gitlab_helpers;
  return await helpers.scanRepositories(user.id, user.name, user.email, repos);
};

const reposToBadge = async (req, res) => {
  const { repos = [], userId, provider } = req.body;
  const repositoryIds = repos.map((repo) => repo.id);

  if (!provider || !userId) {
    return handleError(res, 400, "Missing required parameters");
  }

  try {
    const user = await findUser(userId);
    if (!user) {
      return handleError(res, 404, "User not found");
    }

    const reposToScan =
      process.env.NODE_ENV === "production" ? repositoryIds : repos;
    const results = await scanRepositories(user, provider, reposToScan);
    return res.status(200).json({ results });
  } catch (error) {
    return handleError(res, 500, "Error processing repositories");
  }
};

const badgedRepos = async (req, res) => {
  try {
    const repos = await Repo.findAll({
      attributes: { exclude: ["DEICommitSHA"] },
    });

    const formattedRepos = repos.map(
      ({
        id,
        githubRepoId,
        repoLink,
        badgeType,
        attachment,
        createdAt,
        updatedAt,
        userId,
      }) => ({
        id,
        githubRepoId,
        repoLink,
        badgeType,
        attachment,
        createdAt,
        updatedAt,
        userId,
      })
    );

    return res.json(formattedRepos);
  } catch (error) {
    return handleError(res, 500, "Error retrieving repos");
  }
};

const handleEventBadging = async (req, res) => {
  const {
    headers: { "x-github-event": eventName },
    body: payload,
  } = req;

  try {
    const octokit = await githubApp.getInstallationOctokit(
      payload.installation.id
    );

    if (payload.issue?.title.match(/event/i)) {
      const eventHandlers = {
        issues: {
          opened: () => welcome(octokit, payload),
          assigned: () => assignChecklist(octokit, payload),
          closed: () => saveEvent(octokit, payload),
        },
        issue_comment: {
          created: () => {
            if (payload.comment.body.match("/result"))
              return getResults(octokit, payload);
            if (payload.comment.body.match("/end"))
              return endReview(octokit, payload);
          },
        },
      };

      const handler = eventHandlers[eventName]?.[payload.action];
      if (handler) await handler();
    }

    console.info(`Received ${eventName} event from Github`);
    return res.send("ok");
  } catch (error) {
    return handleError(res, 500, "Error processing GitHub event");
  }
};

const healthCheck = (req, res) => {
  try {
    return res.json({ message: "Project Badging server up and running" });
  } catch (error) {
    return handleError(res, 500, "Server health check failed");
  }
};

module.exports = {
  login,
  reposToBadge,
  badgedRepos,
  handleEventBadging,
  healthCheck,
};
