const { Octokit } = require("@octokit/rest");
const mailer = require("./helpers/mailer.js");
const bronzeBadge = require("./badges/bronzeBadge.js");
const Repo = require("./database/models/Repo.js");

const scanner = async (name, email, selectedRepos) => {
  const octokit = new Octokit();
  let results = [];

  try {
    for (const repo of selectedRepos) {
      try {
        const repoResponse = await octokit.repos.get({
          owner: repo.split("/")[0],
          repo: repo.split("/")[1],
        });

        const id = repoResponse.data.id;
        const url = repoResponse.data.html_url;
        let DEICommitSHA,
          content = null;

        try {
          const contentResponse = await octokit.repos.getContent({
            owner: repo.split("/")[0],
            repo: repo.split("/")[1],
            path: "DEI.md",
          });

          DEICommitSHA = contentResponse.data.sha;
          content = Buffer.from(
            contentResponse.data.content,
            "base64"
          ).toString();
        } catch (error) {
          results.push(`${url} does not have a DEI.md file`);
          mailer(email, name, "Bronze", null, null, results.join("\n"));
          return results;
        }

        // Check if the repo was badged before
        const existingRepo = await Repo.findOne({ githubRepoId: id });

        if (content) {
          if (existingRepo) {
            // Compare the DEICommitSHA with the existing repo's DEICommitSHA
            if (existingRepo.DEICommitSHA !== DEICommitSHA) {
              bronzeBadge(name, email, id, url, content, DEICommitSHA);
            } else {
              // Handle case when DEI.md file is not changed
              results.push(`${url} was already badged `);
              mailer(email, name, "Bronze", null, null, results.join("\n"));
            }
          } else {
            // Repo not badged before, badge it
            bronzeBadge(name, email, id, url, content, DEICommitSHA);
          }
        }
      } catch (error) {
        console.error(error.message);
      }
    }
  } catch (error) {
    console.error("Error:", error.message);
  }
};

module.exports = scanner;
