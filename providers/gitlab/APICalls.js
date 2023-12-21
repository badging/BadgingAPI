const axios = require("axios");
const Repo = require("../../database/models/repo.model.js");
const bronzeBadge = require("../../badges/bronzeBadge.js");
const mailer = require("../../helpers/mailer.js");

/**
 * Calls the GitLab API to get the user info.
 * @param {*} access_token Token used to authorize the call to the GitLab API
 * @returns A json object with `user_info` and `errors`
 */
const getUserInfo = async (access_token) => {
  try {
    // Authenticated user details
    const {
      data: { username: login, name, email, id },
    } = await axios.get("https://gitlab.com/api/v4/user", {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${access_token}`,
      },
    });

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
 * Calls the GitLab API to get the user public repositories.
 * @param {*} access_token Token used to authorize the call to the GitLab API
 * @returns A json object with `repositories` and `errors`
 */
const getUserRepositories = async (access_token) => {
  try {
    // Authenticated user details
    const { data } = await axios.get(
      "https://gitlab.com/api/v4/projects?owned=true&visibility=public",
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${access_token}`,
        },
      }
    );

    return {
      repositories: data.map((repo) => {
        return {
          id: repo.id,
          fullName: repo.name_with_namespace,
        };
      }),
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
 * @param {*} repositoryId The id of the repository
 * @returns A json object with `info` (the repository infos) and `errors`
 */
const getRepositoryInfo = async (repositoryId) => {
  try {
    const { data } = await axios.get(
      `https://gitlab.com/api/v4/projects/${repositoryId}`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    return {
      info: {
        id: repositoryId,
        url: data.web_url,
        defaultBranch: data.default_branch,
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
 * @param {*} repositoryId The path to the repository, without the owner prefix
 * @param {*} filePath The path to the file inside the repository
 * @param {*} branch Name of the branch to use as source for the file
 * @returns A json object with `file` (SHA and content) and `errors`
 */
const getFileContentAndSHA = async (repositoryId, filePath, branch) => {
  try {
    const { data } = await axios.get(
      `https://gitlab.com/api/v4/projects/${repositoryId}/repository/files/${filePath}?ref=${branch}`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    return {
      file: {
        sha: data.last_commit_id,
        content: Buffer.from(data.content, "base64").toString(),
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
 * @param {*} userId Id of the user
 * @param {*} name Full name of the user
 * @param {*} email User email used to send them emails with the results
 * @param {*} repositoryIds List of repositories id to scan
 */
const scanRepositories = async (userId, name, email, repositoryIds) => {
  let results = [];

  try {
    for (const repositoryId of repositoryIds) {
      const { info, errors: info_errors } = await getRepositoryInfo(
        repositoryId
      );
      if (info_errors.length > 0) {
        console.error(info_errors);
        continue;
      }

      const { file, errors: file_errors } = await getFileContentAndSHA(
        repositoryId,
        "DEI.md",
        info.defaultBranch
      );
      if (file_errors.length > 0) {
        results.push(`${info.url} does not have a DEI.md file`);
        continue;
      }

      try {
        // Check if the repo was badged before
        const existingRepo = await Repo.findOne({
          where: { gitlabRepoId: info.id, DEICommitSHA: file.sha },
        });

        // retrieve DEI template
        const template_content = await axios.get(
          "https://api.github.com/repos/badging/badging/contents/Template.DEI.md"
        );
        const template = Buffer.from(
          template_content.data.content,
          "base64"
        ).toString();

        console.log({
          repo: file.content,
          template_to_test: template,
        });

        if (file.content) {
          if (existingRepo) {
            // Compare the DEICommitSHA with the existing repo's DEICommitSHA
            if (existingRepo.DEICommitSHA !== file.sha) {
              bronzeBadge(
                userId,
                name,
                email,
                null,
                info.id,
                info.url,
                file.content,
                file.sha
              );
            } else {
              // Handle case when DEI.md file is not changed
              results.push(`${info.url} was already badged`);
            }
          } else if (file.content && file.content === template) {
            // check if file content is copy/paste from template
            results.push(
              `Please provide DEI information specific to ${info.url} by editing the template`
            );
          } else {
            // Repo not badged before, badge it
            bronzeBadge(
              userId,
              name,
              email,
              null,
              info.id,
              info.url,
              file.content,
              file.sha
            );
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
  getUserInfo,
  getUserRepositories,
  scanRepositories,
};
