const express = require("express");
const { Octokit } = require("@octokit/rest");
const axios = require("axios");
require("dotenv").config();

const app = express();
app.use(express.urlencoded({ extended: true }));
const port = 4040;

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

    const userRepos = await octokit.repos.listForAuthenticatedUser();
    const repositories = userRepos.data;
    console.log(repositories);

    res.send(`
    <h1>Select Repositories</h1>
      <form action="/api/repo" method="POST">
        <select id="repository-select">
          ${repositories
            .map(
              (repo) =>
                `<option value="${repo.full_name}">${repo.full_name}</option>`
            )
            .join("")}
        </select>
        <button type="button" onclick="addRepository()">Add Repository</button>
        <input type="hidden" name="repositories" id="selected-repositories" value="[]">
        <ul id="selected-repositories-list"></ul>
        <button type="submit">Submit</button>
      </form>

      <script>
        const repositorySelect = document.getElementById('repository-select');
        const selectedRepositories = [];

        function addRepository() {
          const selectedOption = repositorySelect.options[repositorySelect.selectedIndex];
          const repositoryName = selectedOption.value;
          const repositoryFullName = selectedOption.text;

          if (!selectedRepositories.includes(repositoryName)) {
            selectedRepositories.push(repositoryName);

            const selectedRepositoriesList = document.getElementById('selected-repositories-list');
            const li = document.createElement('li');
            li.textContent = repositoryFullName;
            selectedRepositoriesList.appendChild(li);
          }
        }

        document.getElementById('repository-select').addEventListener('change', () => {
          addRepository();
        });

        document.getElementById('selected-repositories-list').addEventListener('click', (event) => {
          const repositoryName = event.target.textContent;
          const index = selectedRepositories.indexOf(repositoryName);
          if (index > -1) {
            selectedRepositories.splice(index, 1);
            event.target.remove();
          }
        });

        document.getElementById('repository-select').addEventListener('change', () => {
          document.getElementById('selected-repositories').value = JSON.stringify(selectedRepositories);
        });
      </script>
    `);
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).send("Internal Server Error");
  }
});

app.post("/api/repo", async (req, res) => {
  try {
    const selectedRepositories = JSON.parse(req.body.repositories);
    console.log("Selected Repositories:", selectedRepositories);

    const octokit = new Octokit();

    const readmeContents = [];

    for (const repo of selectedRepositories) {
      const [owner, repoName] = repo.split("/");

      const { data: readme } = await octokit.repos.getContent({
        owner,
        repo: repoName,
        path: "DEI.md",
      });

      if (readme && readme.content) {
        const content = Buffer.from(readme.content, "base64").toString("utf-8");
        readmeContents.push({ repo, content });
      }
    }

    res.json(readmeContents);
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).send("Internal Server Error");
  }
});

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
