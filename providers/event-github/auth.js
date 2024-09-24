const axios = require("axios");
const { Octokit } = require("@octokit/rest");
const { encrypt, decrypt, convertToMarkdown } = require("../../helpers/crypto");

const issueCreationAuth = (req, res) => {
  if (!process.env.GITHUB_AUTH_CLIENT_ID) {
    res.status(500).send("GitHub Issue Creation is not configured");
    return;
  }

  const scopes = ["repo"];
  const encryptedFormData = encrypt(JSON.stringify(req.body));
  const url = `https://github.com/login/oauth/authorize?client_id=${
    process.env.GITHUB_AUTH_CLIENT_ID
  }&scope=${scopes.join(",")}&state=${encryptedFormData}`;

  res.send({ authorizationLink: url });
};

const issueCreationCallback = async (req, res) => {
  const code = req.query.code;
  const encryptedState = req.query.state;

  const formData = decrypt(encryptedState);
  const parsedFormData = JSON.parse(formData);
  const issueTitle = parsedFormData.title;
  const markdown = convertToMarkdown(parsedFormData.body);

  if (!formData) {
    return res.status(400).json({ error: "No form data found" });
  }

  try {
    const tokenResponse = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.GITHUB_AUTH_CLIENT_ID,
        client_secret: process.env.GITHUB_AUTH_CLIENT_SECRET,
        code,
      },
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    const accessToken = tokenResponse.data.access_token;

    const octokit = new Octokit({ auth: accessToken });

    const { data: issue } = await octokit.rest.issues.create({
      owner: "badging",
      repo: "event-diversity-and-inclusion",
      title: issueTitle,
      body: markdown,
    });

    res.redirect(issue.html_url);
  } catch (error) {
    console.error("Error in issue creation callback:", error);
    res.status(500).send("An error occurred during issue creation");
  }
};

module.exports = {
  issueCreationAuth,
  issueCreationCallback,
};
