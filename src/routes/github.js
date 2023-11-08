const { Octokit } = require("@octokit/rest");

const saveUser = require("../../database/controllers/user.controller.js");
const github_helper = require("../helpers/github.js");

const handleOAuthCallback = async (req, res) => {
  const code = req.body.code ?? req.query.code;

  const { access_token, errors: access_token_errors } =
    await github_helper.requestAccessToken(code);
  if (access_token_errors.length > 0) {
    res.status(500).send(access_token_errors.join());
    return;
  }

  const octokit = new Octokit({ auth: `${access_token}` });

  // Authenticated user details
  const { user_info, errors: user_info_errors } =
    await github_helper.getUserInfo(octokit);
  if (user_info_errors.length > 0) {
    res.status(500).send(user_info_errors.join());
    return;
  }

  // Save user to database
  await saveUser(
    user_info.login,
    user_info.name,
    user_info.email,
    user_info.id
  );

  // Public repos they maintain, administer, or own
  const { repositories, errors: repositories_errors } =
    await github_helper.getUserRepositories(octokit);
  if (repositories_errors.length > 0) {
    res.status(500).send(repositories_errors.join());
    return;
  }

  if (process.env.NODE_ENV === "production") {
    res.status(200).json({
      name: user_info.name,
      username: user_info.login,
      email: user_info.email,
      repos: repositories,
      provider: "github",
    });
  } else if (process.env.NODE_ENV === "development") {
    res.status(200).send(`
        <html>
        <head>
          <title>Repo List</title>
        </head>
        <body>
          <h1>Welcome ${user_info.name}</h1>
          <h2>Username: ${user_info.login}</h2>
          <h2>Email: ${user_info.email}</h2>
          <form action="/api/repos-to-badge" method="post">
            <input type="hidden" name="name" value="${user_info.name}">
            <input type="hidden" name="email" value="${user_info.email}">
            <input type="hidden" name="provider" value="github">
            <h2>Select Repositories:</h2>
            ${repositories
              .map(
                (repo) => `
                <div>
                  <input type="checkbox" name="repos[]" value="${repo}">
                  <label for="${repo}">${repo}</label>
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
 * Sets up the provided Express app routes for GitHub
 * @param {*} app Express application instance
 */
const setupGitHubRoutes = (app) => {
  if (process.env.NODE_ENV === "production") {
    app.post("/api/callback/github", handleOAuthCallback);
  } else if (process.env.NODE_ENV === "development") {
    app.get("/api/callback/github", handleOAuthCallback);
  }
};

module.exports = {
  setupGitHubRoutes,
};
