const { Octokit } = require("@octokit/rest");
const axios = require("axios");
const Repo = require("../../database/models/repo.model.js");
const bronzeBadge = require("../badges/bronzeBadge.js");
const mailer = require("../helpers/mailer.js");

/**
 * Starts the authorization process with the GitHub OAuth system
 * @param {*} res Response to send back to the caller
 */
const authorizeApplication = (res) => {
  if (!process.env.GITHUB_APP_CLIENT_ID) {
    res.status(500).send("GitHub provider is not configured");
    return;
  }

  const scopes = ["user", "repo"];
  const url = `https://github.com/login/oauth/authorize?client_id=${
    process.env.GITHUB_APP_CLIENT_ID
  }&scope=${scopes.join(",")}`;

  res.redirect(url);
};

/**
 * Calls the GitHub API to get an access token from the OAuth code.
 * @param {*} code Code returned by the GitHub OAuth authorization API
 * @returns A json object with `access_token` and `errors`
 */
const requestAccessToken = async (code) => {
  try {
    const {
      data: { access_token },
    } = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: process.env.GITHUB_APP_CLIENT_ID,
        client_secret: process.env.GITHUB_APP_CLIENT_SECRET,
        code,
      },
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    return {
      access_token,
      errors: [],
    };
  } catch (error) {
    return {
      access_token: "",
      errors: [error.message],
    };
  }
};

/**
 * Calls the GitHub API to get the user info.
 * @param {*} octokit Octokit instance with autorization already set up
 * @returns A json object with `user_info` and `errors`
 */
const getUserInfo = async (octokit) => {
  try {
    // Authenticated user details
    const response = await octokit.users.getAuthenticated();
    const {
      data: { login, name, email, id },
    } = response;

    return {
      user_info: {
        login,
        name,
        email,
        id,
      },
      errors: [],
    };
  } catch (error) {
    return {
      user_info: null,
      errors: [error.message],
    };
  }
};

/**
 * Calls the GitHub API to get the user public repositories.
 * @param {*} octokit Octokit instance with autorization already set up
 * @returns A json object with `repositories` and `errors`
 */
const getUserRepositories = async (octokit) => {
  try {
    // Public repos they maintain, administer, or own
    let repos = [];
    let page = 1;
    let response = await octokit.repos.listForAuthenticatedUser({
      visibility: "public",
      per_page: 100,
      page,
    });

    while (response.data.length > 0) {
      repos = [...repos, ...response.data];
      page++;
      response = await octokit.repos.listForAuthenticatedUser({
        visibility: "public",
        per_page: 100,
        page,
      });
    }

    return {
      repositories: repos.map((repo) => repo.full_name),
      errors: [],
    };
  } catch (error) {
    return {
      repositories: null,
      errors: [error.message],
    };
  }
};

/**
 * Get the id and url of the provided repository path
 * @param {*} octokit An Octokit instance
 * @param {*} owner The (username) owner of the repository
 * @param {*} repositoryPath The path to the repository, without the owner prefix
 * @returns A json object with `info` (the repository infos) and `errors`
 */
const getRepositoryInfo = async (octokit, owner, repositoryPath) => {
  try {
    const {
      data: { id, html_url },
    } = await octokit.repos.get({ owner, repo: repositoryPath });

    return {
      info: {
        id,
        url: html_url,
      },
      errors: [],
    };
  } catch (error) {
    return {
      info: null,
      errors: [error.message],
    };
  }
};

/**
 * Get the content and commit SHA of a file inside a repository
 * @param {*} octokit An Octokit instance
 * @param {*} owner The (username) owner of the repository
 * @param {*} repositoryPath The path to the repository, without the owner prefix
 * @param {*} filePath The path to the file inside the repository
 * @returns A json object with `file` (SHA and content) and `errors`
 */
const getFileContentAndSHA = async (
  octokit,
  owner,
  repositoryPath,
  filePath
) => {
  try {
    const {
      data: { sha, content },
    } = await octokit.repos.getContent({
      owner,
      repo: repositoryPath,
      path: filePath,
    });

    return {
      file: {
        sha,
        content: Buffer.from(content, "base64").toString(),
      },
      errors: [],
    };
  } catch (error) {
    return {
      file: null,
      errors: [error.message],
    };
  }
};

/**
 * Scans a list of repositories to try and apply for a badge
 * @param {*} name Full name of the user
 * @param {*} email User email used to send them emails with the results
 * @param {*} repositories List of repositories to scan
 */
const scanRepositories = async (name, email, repositories) => {
  const octokit = new Octokit();
  let results = [];

  try {
    for (const repository of repositories) {
      const owner = repository.split("/")[0];
      const repositoryPath = repository.split("/")[1];

      const { info, errors: info_errors } = await getRepositoryInfo(
        octokit,
        owner,
        repositoryPath
      );
      if (info_errors.length > 0) {
        console.error(info_errors);
        continue;
      }

      const { file, errors: file_errors } = await getFileContentAndSHA(
        octokit,
        owner,
        repositoryPath,
        "DEI.md"
      );
      if (file_errors.length > 0) {
        results.push(`${info.url} does not have a DEI.md file`);
        continue;
      }

      try {
        // Check if the repo was badged before
        const existingRepo = await Repo.findOne({
          where: { githubRepoId: info.id },
        });

        if (file.content) {
          if (existingRepo) {
            // Compare the DEICommitSHA with the existing repo's DEICommitSHA
            if (existingRepo.DEICommitSHA !== file.sha) {
              bronzeBadge(
                name,
                email,
                info.id,
                info.url,
                file.content,
                file.sha
              );
            } else {
              // Handle case when DEI.md file is not changed
              results.push(`${info.url} was already badged`);
            }
          } else {
            // Repo not badged before, badge it
            bronzeBadge(name, email, info.id, info.url, file.content, file.sha);
          }
        }
      } catch (error) {
        console.error(error.message);
      }
    }

    // Send one single email for generic errors while processing repositories
    // The `bronzeBadge` function will handle sending email for each project
    // with wether success or error messages
    if (results.length > 0) {
      mailer(email, name, "Bronze", null, null, results.join("\n"));
    }
  } catch (error) {
    console.error("Error: ", error.message);
  }

  return results;
};

module.exports = {
  authorizeApplication,
  requestAccessToken,
  getUserInfo,
  getUserRepositories,
  scanRepositories,
};
