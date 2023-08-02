const { Octokit } = require("@octokit/rest");
const axios = require("axios");


/**
 * Redirects the user to the GitHub OAuth login page for authentication.
 * @param {*} req - object containing the client req details.
 * @param {*} res - object used to send a redirect response.
 */
const login = (req, res) => {
  const scopes = ["user", "repo"];
  const url = `https://github.com/login/oauth/authorize?client_id=${process.env.CLIENT_ID
    }&scope=${scopes.join(",")}`;

  res.redirect(url);
}

const productionCallback = async (req, res) => {
  try {
    const { code } = req.body;
    const {
      data: { access_token },
    } = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        code,
      },
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    const octokit = new Octokit({ auth: `${access_token}` });

    // Authenticated user details
    const {
      data: { login, name, email },
    } = await octokit.users.getAuthenticated();

    // Public repos they maintain, administer, or own
    let repos = [];
    let page = 1;
    let response = await octokit.repos.listForAuthenticatedUser({
      visibility: "public",
      per_page: 100,
      page,
    });

    while (response.data.length > 0) {
      repos = [...repos, ...response.data];
      page++;
      response = await octokit.repos.listForAuthenticatedUser({
        visibility: "public",
        per_page: 100,
        page,
      });
    }

    const repoList = repos.map((repo) => repo.full_name);

    res.status(200).json({
      name,
      username: login,
      email,
      repos: repoList,
    });
  } catch (error) {
    res.status(500).send(error.message);
  }
}

const developmentCallback = async (req, res) => {
  try {
    const { code } = req.query;
    const {
      data: { access_token },
    } = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.CLIENT_ID,
        client_secret: process.env.CLIENT_SECRET,
        code,
      },
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    const octokit = new Octokit({ auth: `${access_token}` });

    // Authenticated user details
    const {
      data: { login, name, email },
    } = await octokit.users.getAuthenticated();

    // Public repos they maintain, administer, or own
    let repos = [];
    let page = 1;
    let response = await octokit.repos.listForAuthenticatedUser({
      visibility: "public",
      per_page: 100,
      page,
    });

    while (response.data.length > 0) {
      repos = [...repos, ...response.data];
      page++;
      response = await octokit.repos.listForAuthenticatedUser({
        visibility: "public",
        per_page: 100,
        page,
      });
    }

    const repoList = repos.map((repo) => repo.full_name);

    res.status(200).send(`
        <html>
        <head>
          <title>Repo List</title>
        </head>
        <body>
          <h1>Welcome ${name}</h1>
          <h2>Username: ${login}</h2>
          <h2>Email: ${email}</h2>
          <form action="/api/repos-to-badge" method="post">
            <input type="hidden" name="name" value="${name}">
            <input type="hidden" name="email" value="${email}">
            <h2>Select Repositories:</h2>
            ${repoList
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
  } catch (error) {
    res.status(500).send(error.message);
  }
}

const reposToBadge = async (req, res) => {
  const selectedRepos = (await req.body.repos) || [];
  const name = req.body.name || "";
  const email = req.body.email || "";
  // Process the selected repos as needed
  const results = await scanner(name, email, selectedRepos);
  res.status(200).json({ results });
}

module.exports = {
  login,
  productionCallback,
  developmentCallback,
  reposToBadge
}