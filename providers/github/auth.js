const { Octokit } = require("@octokit/rest");
const { App } = require("octokit");
require("dotenv").config();
const axios = require("axios");
const { saveUser } = require("../../database/controllers/user.controller.js");
const { getUserInfo, getUserRepositories } = require("./APICalls.js");
const {
  encrypt,
  decrypt,
  convertToMarkdown,
} = require("../../helpers/crypto.js");

// instantiate Github App for event handling (webhooks)
const githubApp = new App({
  appId: process.env.GITHUB_APP_ID,
  privateKey: process.env.GITHUB_APP_PRIVATE_KEY.replace(/\\n/g, "\n"),
  oauth: {
    clientId: process.env.GITHUB_APP_CLIENT_ID,
    clientSecret: process.env.GITHUB_APP_CLIENT_SECRET,
  },
  webhooks: { secret: process.env.GITHUB_APP_WEBHOOK_SECRET },
});

/**
 * Starts the authorization process with the GitHub OAuth system
 * @param {*} res Response to send back to the caller
 */
const githubAuth = (req, res) => {
  const { type } = req.body;
  if (!process.env.GITHUB_AUTH_CLIENT_ID) {
    res.status(500).send("GitHub provider is not configured");
    return;
  }

  if (type === "event-badging") {
    const scopes = ["repo"];
    const encryptedFormData = encrypt(JSON.stringify(req.body));
    const url = `https://github.com/login/oauth/authorize?client_id=${
      process.env.GITHUB_AUTH_CLIENT_ID
    }&scope=${scopes.join(",")}&state=${encryptedFormData}`;

    res.send({ authorizationLink: url });
  } else {
    const scopes = ["user", "repo"];
    const url = `https://github.com/login/oauth/authorize?client_id=${
      process.env.GITHUB_AUTH_CLIENT_ID
    }&scope=${scopes.join(",")}`;

    res.redirect(url);
  }
};

/**
 * Calls the GitHub API to get an access token from the OAuth code.
 * @param {*} code Code returned by the GitHub OAuth authorization API
 * @returns A json object with `access_token` and `errors`
 */
const requestAccessToken = async (code) => {
  try {
    const {
      data: { access_token },
    } = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.GITHUB_AUTH_CLIENT_ID,
        client_secret: process.env.GITHUB_AUTH_CLIENT_SECRET,
        code,
      },
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    return {
      access_token,
      errors: [],
    };
  } catch (error) {
    return {
      access_token: "",
      errors: [error.message],
    };
  }
};


/**
 * Sets up the provided Express app routes for GitLab
 * @param {*} app Express application instance
 */
const githubAuthCallback = (app) => {
  if (process.env.NODE_ENV === "production") {
    app.post("/api/callback/github", handleOAuthCallback);
  } else if (process.env.NODE_ENV === "development") {
    app.get("/api/callback/github", handleOAuthCallback);
  }
};

module.exports = {
  githubAuth,
  githubAuthCallback,
  githubApp,
};
