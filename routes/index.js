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

// Route groups
const authRoutes = (app) => {
  app.get("/api/auth/github", githubAuth);
  app.post("/api/auth/github", githubAuth);
  app.get("/api/auth/gitlab", gitlabAuth);
  app.get("/api/login", login);
  app.get("/api/callback/github", handleOAuthCallback);
  app.get("/api/callback/gitlab", handleOAuthCallbackGitlab);
};

const repoRoutes = (app) => {
  app.get("/api/badgedRepos", badgedRepos);
  app.post("/api/repos-to-badge", reposToBadge);
};

const eventRoutes = (app) => {
  app.post("/api/event_badging", handleEventBadging);
  app.get("/api/badged_events", getAllEvents);
};

const setupRoutes = (app) => {
  app.get("/api", healthCheck);

  // Apply route groups
  authRoutes(app);
  repoRoutes(app);
  eventRoutes(app);

  // 404 handler
  app.all("*", (req, res) => {
    res.status(404).json({ error: "Endpoint not found" });
  });
};

module.exports = {
  setupRoutes,
};
