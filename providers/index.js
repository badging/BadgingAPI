const { githubAuth, githubAuthCallback } = require("./github/auth.js");
const { gitlabAuth, gitlabAuthCallback } = require("./gitlab/auth.js");

module.exports = {
  githubAuth,
  githubAuthCallback,
  gitlabAuth,
  gitlabAuthCallback,
};
