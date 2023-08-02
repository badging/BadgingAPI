const { Octokit } = require("@octokit/rest");
const mailer = require("./helpers/mailer.js");
const bronzeBadge = require("./badges/bronzeBadge.js");

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

        console.log(repoResponse.data);

        const id = repoResponse.data.id;
        const url = repoResponse.data.html_url;
        let content = null;
        try {
          const contentResponse = await octokit.repos.getContent({
            owner: repo.split("/")[0],
            repo: repo.split("/")[1],
            path: "DEI.md",
          });

          const DEIcommitSHA = contentResponse.data.sha;
          content = Buffer.from(
            contentResponse.data.content,
            "base64"
          ).toString();
        } catch (error) {
          results.push("DEI.md file");
          mailer(email, name, "Bronze", null, null, results.join("\n"));
          return results;
        }

        if (content) {
          bronzeBadge(name, email, id, url, content, DEIcommitSHA);
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
