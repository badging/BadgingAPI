const { saveUser } = require("../../database/controllers/user.controller.js");
const { getUserInfo, getUserRepositories } = require("./APICalls.js");
const axios = require("axios");

/**
 * Starts the authorization process with the GitLab OAuth system
 * @param {*} res Response to send back to the caller
 */
const gitlabAuth = (req, res) => {
  if (!process.env.GITLAB_APP_CLIENT_ID) {
    res.status(500).send("GitLab provider is not configured");
    return;
  }

  const scopes = ["read_api"];
  const url = `https://gitlab.com/oauth/authorize?client_id=${
    process.env.GITLAB_APP_CLIENT_ID
  }&response_type=code&state=STATE&scope=${scopes.join("+")}&redirect_uri=${
    process.env.GITLAB_APP_REDIRECT_URI
  }`;

  res.redirect(url);
};

/**
 * Calls the GitLab API to get an access token from the OAuth code.
 * @param {*} code Code returned by the GitLab OAuth authorization API
 * @returns A json object with `access_token` and `errors`
 */
const requestAccessToken = async (code) => {
  try {
    const {
      data: { access_token },
    } = await axios.post(
      "https://gitlab.com/oauth/token",
      {
        client_id: process.env.GITLAB_APP_CLIENT_ID,
        client_secret: process.env.GITLAB_APP_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: process.env.GITLAB_APP_REDIRECT_URI,
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
 * Calls the GitLab API to get user info from the access token.
 * @param {*} access_token Access token returned by the GitLab OAuth authorization API
 * @returns A json object with `user_info` and `errors`
 * */

const handleOAuthCallback = async (req, res) => {
  const code = req.body.code ?? req.query.code;

  const { access_token, errors: access_token_errors } =
    await requestAccessToken(code);
  if (access_token_errors.length > 0) {
    res.status(500).send(access_token_errors.join());
    return;
  }

  // Authenticated user details
  const { user_info, errors: user_info_errors } = await getUserInfo(
    access_token
  );
  if (user_info_errors.length > 0) {
    res.status(500).send(user_info_errors.join());
    return;
  }

  // Save user to database
  const savedUser = await saveUser(
    user_info.login,
    user_info.name,
    user_info.email,
    null,
    user_info.id
  );
  if (!savedUser) {
    res.status(500).send("Error saving user info");
    return;
  }

  // Public repos they maintain, administer, or own
  const { repositories, errors: repositories_errors } =
    await getUserRepositories(access_token);
  if (repositories_errors.length > 0) {
    res.status(500).send(repositories_errors.join());
    return;
  }

  if (
    process.env.NODE_ENV === "production" ||
    process.env.RETURN_JSON_ON_LOGIN
  ) {
    res.status(200).json({
      userId: savedUser.id,
      name: savedUser.name,
      username: savedUser.login,
      email: savedUser.email,
      repos: repositories,
      provider: "gitlab",
    });
  } else if (process.env.NODE_ENV === "development") {
    res.status(200).send(`
        <html>
        <head>
          <title>Repo List</title>
        </head>
        <body>
          <h1>Welcome ${savedUser.name}</h1>
          <h2>Username: ${savedUser.login}</h2>
          <h2>Email: ${savedUser.email}</h2>
          <form action="/api/repos-to-badge" method="post">
            <input type="hidden" name="provider" value="gitlab">
            <input type="hidden" name="userId" value="${savedUser.id}">
            <h2>Select Repositories:</h2>
            ${repositories
              .map(
                (repo) => `
                <div>
                  <input type="checkbox" name="repos[]" value="${repo.id}">
                  <label for="${repo.id}">${repo.fullName}</label>
                </div>
              `
              )
              .join("")}
            <br>
            <input type="submit" value="Submit">
          </form>
        </body>
      </html>
    `);
  } else {
    res.status(500).send("Unknown process mode");
  }
};

/**
 * Sets up the provided Express app routes for GitLab
 * @param {*} app Express application instance
 */
const gitlabAuthCallback = (app) => {
  if (process.env.NODE_ENV === "production") {
    app.post("/api/callback/gitlab", handleOAuthCallback);
  } else if (process.env.NODE_ENV === "development") {
    app.get("/api/callback/gitlab", handleOAuthCallback);
  }
};

module.exports = {
  gitlabAuth,
  gitlabAuthCallback,
};
