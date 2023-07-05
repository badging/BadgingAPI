const express = require("express");
const { Octokit } = require("@octokit/rest");
const axios = require("axios");
require("dotenv").config();
const bodyParser = require("body-parser");
const scanner = require("./src/scanner.js");

const app = express();
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get("/api/login", (req, res) => {
  const scopes = ["user", "repo"];
  const url = `https://github.com/login/oauth/authorize?client_id=${
    process.env.CLIENT_ID
  }&scope=${scopes.join(",")}`;

  res.redirect(url);
});

app.get("/api/callback", async (req, res) => {
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

    // let repoList = repos.filter(repo=>repo.permissions.admin === true)
    const repoList = repos.map((repo) => repo.full_name);

    res.status(200).json({
      name,
      username: login,
      email,
      repos: repoList,
    });
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).send("Internal Server Error");
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

app.listen(4040, () => {
  console.log("Server started on port 4040");
});
