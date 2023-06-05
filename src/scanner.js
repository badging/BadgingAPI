// const fs = require("fs");
const { Octokit } = require("@octokit/rest");
const mailer = require("./mailer.js");

const scanner = async (req, res, login, name, email) => {
  const report = [];
  let deiFilePresent = false; // Track if DEI file is present

  try {
    const selectedRepositories = JSON.parse(req.body.repositories);
    const octokit = new Octokit();

    const DEIContents = [];

    for (const repo of selectedRepositories) {
      const [owner, repoName] = repo.split("/");

      try {
        const { data: DEI } = await octokit.repos.getContent({
          owner,
          repo: repoName,
          path: "DEI.md",
        });

        if (DEI && DEI.content) {
          console.log("✅", `DEI file present`);
          report.push(`✅ DEI file present`);
          const content = Buffer.from(DEI.content, "base64").toString("utf-8");
          DEIContents.push({ repo, content });

          // Check for specific titles
          const titlesToCheck = [
            "Project Access",
            "Communication Transparency",
            "Newcomer Experiences",
            "Inclusive Leadership",
          ];

          for (const title of titlesToCheck) {
            if (content.includes(title)) {
              report.push(`✅ ${title} present`);
            } else {
              report.push(`${title} not present`);
            }
          }

          // Set the flag to true if DEI file is present
          deiFilePresent = true;
        }
      } catch (error) {
        console.error("Error:", error.message);
        report.push(`❌ ${repo}: ${error.message}`);
      }
    }

    if (!deiFilePresent) {
      report.push("❌ DEI file not present"); // Add the message if DEI file is not found
    }

    // res.json(report);
    mailer(req, res, login, name, email, report);
  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).send("Internal Server Error");
  }
};

module.exports = scanner;
