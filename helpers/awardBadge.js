// const fs = require("fs");
// const path = require("path");
// const badgePath = path.join(__dirname, "../../assets/badge.svg");
const badgeLink =
  "https://raw.githubusercontent.com/AllInOpenSource/ProjectBadging/main/src/assets/images/badges/badge.svg";

const awardBadge = async (octokit, owner, repoName) => {
  try {
    // Read the SVG file content
    // const svgContent = fs.readFileSync(badgePath, "utf8");

    // Read the existing README file content
    const { data: existingFile } = await octokit.rest.repos.getContent({
      owner: owner,
      repo: repoName,
      path: "README.md",
      ref: "main",
    });
    const existingContent = Buffer.from(
      existingFile.content,
      "base64"
    ).toString("utf8");

    // Combine the SVG content with the existing README content
    // const updatedContent = `![Bronze badge](${svgContent})\n\n${existingContent}`;
    const updatedContent = `![Bronze badge](${badgeLink})\n\n${existingContent}`;

    // Create or update the README file with the modified content directly on the main branch
    await octokit.rest.repos.createOrUpdateFileContents({
      owner: owner,
      repo: repoName,
      path: "README.md",
      message: "Add badge to README",
      content: Buffer.from(updatedContent).toString("base64"),
      branch: "main",
      sha: existingFile.sha,
    });

    console.log("Badge added to README successfully.");
  } catch (error) {
    console.error("Error awarding badge:", error);
  }
};

module.exports = awardBadge;
