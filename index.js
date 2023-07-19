const express = require("express");
const { Octokit } = require("@octokit/rest");
const axios = require("axios");
require("dotenv").config();
const bodyParser = require("body-parser");
const scanner = require("./src/scanner.js");
const cors = require("cors");

const app = express();
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(
  cors({
    origin: "*",
    methods: "GET,HEAD,PUT,PATCH,POST,DELETE",
    optionsSuccessStatus: 200,
  })
);

app.get("/api/login", (req, res) => {
  const scopes = ["user", "repo"];
  const url = `https://github.com/login/oauth/authorize?client_id=${
    process.env.CLIENT_ID
  }&scope=${scopes.join(",")}`;

  res.redirect(url);
});

app.get("/api/callback", async (req, res) => {
  console.log(req);
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

    // authenticated user details
    const {
      data: { login, name, email },
    } = await octokit.users.getAuthenticated();

    // Public repos they maintain, administer or own
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

    if (process.env.NODE_ENV === "production") {
      res.status(200).json({
        name,
        username: login,
        email,
        repos: repoList,
      });
    } else if (process.env.NODE_ENV === "development") {
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
    }
  } catch (error) {
    res.status(500).send(error.message);
  }
});

app.post("/api/repos-to-badge", async (req, res) => {
  const selectedRepos = (await req.body.repos) || [];
  const name = req.body.name || "";
  const email = req.body.email || "";
  // Process the selected repos as needed
  const results = await scanner(name, email, selectedRepos);
  res.status(200).json({ results });
});

app.listen(process.env.PORT, () => {
  console.log(`server listening on port ${process.env.PORT}`);
});
