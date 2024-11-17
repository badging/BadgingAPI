const { getAllEvents } = require("../database/controllers/event.controller.js");
const { handleOAuthCallback } = require("../providers/github/auth.js");
const { handleOAuthCallbackGitlab } = require("../providers/gitlab/auth.js");
const { githubAuth, gitlabAuth } = require("../providers/index.js");
const {
  login,
  reposToBadge,
  badgedRepos,
  handleEventBadging,
  healthCheck,
} = require("../controllers/api.controller.js");

const setupRoutes = (app) => {
  app.get("/api", healthCheck);

  // Auth routes
  app.get("/api/auth/github", githubAuth);
  app.post("/api/auth/github", githubAuth);
  app.get("/api/auth/gitlab", gitlabAuth);
  app.get("/api/login", login);

  // OAuth callbacks
  app.get("/api/callback/github", handleOAuthCallback);
  app.get("/api/callback/gitlab", handleOAuthCallbackGitlab);

  // Repository routes
  app.get("/api/badgedRepos", badgedRepos);
  app.post("/api/repos-to-badge", reposToBadge);

  // Event badging routes
  app.post("/api/event_badging", handleEventBadging);
  app.get("/api/badged_events", getAllEvents);

  // 404 handler
  app.get("*", (req, res) => {
    res.status(404).send("Endpoint not found or unresponsive");
  });
};

module.exports = {
  setupRoutes,
};
