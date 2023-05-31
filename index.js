const express = require("express");
const { Octokit } = require("@octokit/rest");
const axios = require("axios");
require("dotenv").config();

const { handleGithubCallback, scanner } = require("./src");

const app = express();
app.use(express.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  res.send('<a href="/auth/github">Login with GitHub</a>');
});

app.get("/auth/github", (req, res) => {
  const scopes = ["user", "repo", "project", "admin:org"];
  res.redirect(
    `https://github.com/login/oauth/authorize?client_id=${
      process.env.clientID
    }&redirect_uri=${process.env.REDIRECT_URI}&scope=${scopes.join(",")}`
  );
});

app.get("/api/auth/github/callback", async (req, res) => {
  // get GitHub User token to use for API calls with octokit
  try {
    const { code } = req.query;
    const tokenResponse = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.clientID,
        client_secret: process.env.clientSecret,
        code,
      },
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    const octokit = new Octokit({ auth: `${tokenResponse.data.access_token}` });

    // use the octokit client in the callback Handler
    handleGithubCallback(req, res, octokit);
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/api/repo", scanner);

app.listen(process.env.PORT, () => {
  console.log(`App listening at http://localhost:${process.env.PORT}`);
});
