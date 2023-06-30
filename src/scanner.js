const { Octokit } = require("@octokit/rest");
const mailer = require('./helpers/mailer.js')
const bronzeBadge = require('./badges/bronzeBadge.js')

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

        const id = repoResponse.data.id
        const url = repoResponse.data.html_url
        const contentResponse = await octokit.repos.getContent({
          owner: repo.split("/")[0],
          repo: repo.split("/")[1],
          path: "DEI.md",
        });
        const content = Buffer.from(contentResponse.data.content, 'base64').toString();
        const bronzeResults = await bronzeBadge(id,url,content)
        results.push("✅", repo, bronzeResults)
      } catch (error) {
        console.error(error)
        // results.push("❌", repo, "does not have DEI.md file");
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
  mailer(email, results)
  return results;
}

module.exports = scanner;

