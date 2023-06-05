const express = require("express");
const { Octokit } = require("@octokit/rest");
const axios = require("axios");
const bodyParser = require("body-parser");
require("dotenv").config();

const { handleGithubCallback, scanner } = require("./src");

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.get("/api", (req, res) => {
  res.send('<a href="/api/auth/github">Login with GitHub</a>');
});

app.get("/api/auth/github", (req, res) => {
  const scopes = ["user", "repo", "project", "admin:org"];
  res.redirect(
    `https://github.com/login/oauth/authorize?client_id=${
      process.env.CLIENT_ID
    }&redirect_uri=${process.env.REDIRECT_URI}&scope=${scopes.join(",")}`
  );
});

let name, login, email;

app.get("/api/auth/github/callback", async (req, res) => {
  // get GitHub User token to use for API calls with octokit
  try {
    const { code } = req.query;
    const tokenResponse = await axios.post(
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

    const octokit = new Octokit({ auth: `${tokenResponse.data.access_token}` });

    ({
      data: { login, name, email },
    } = await octokit.users.getAuthenticated());

    // use the octokit client in the callback Handler
    handleGithubCallback(req, res, octokit);
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/api/repo", (req, res) => scanner(req, res, login, name, email));

app.listen(process.env.PORT, () => {
  console.log(`App listening at http://localhost:${process.env.PORT}`);
});
