const { Octokit } = require("@octokit/rest");
const { scanne, awardBadge } = require("../helpers");
const bronzeBadge = require("./bronzeBadge");

const badges = async (req, res, login, name, email, octokit) => {
  let deiFilePresent = false; // track presence of DEI file

  try {
    const selectedRepositories = JSON.parse(req.body.repositories);

    // const octokit = new Octokit();
    for (const repo of selectedRepositories) {
      const [owner, repoName] = repo.split("/");
      try {
        const { data: DEI } = await octokit.repos.getContent({
          owner,
          repo: repoName,
          path: "DEI.md",
        });

        if (DEI && DEI.content) {
          deiFilePresent = true;
          // scan repo from here using ./scanner.js
          bronzeBadge(owner, octokit, email, DEI);
        }
      } catch (e) {
        console.error("Error: ", e.message);
        res.status(500).send("Interval Server Error");
      }
    }

    if (!deiFilePresent) {
      res.json("DEI.md file was not found");
    }
  } catch (e) {
    console.error("Error:", e.message);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = badges;
