// Database imports
const { findUser } = require("../database/controllers/user.controller.js");
const Repo = require("../database/models/repo.model.js");
const { createEvent } = require("../database/controllers/event.controller.js");

// Provider imports
const github_helpers = require("../providers/github/APICalls.js");
const gitlab_helpers = require("../providers/gitlab/APICalls.js");
const { githubAuth, githubApp, gitlabAuth } = require("../providers/index.js");

// Error handling utility
const handleError = (res, statusCode, message) => {
  return res.status(statusCode).json({ error: message });
};

// Badge calculation utilities
const calculateBadge = async (octokit, payload) => {
  try {
    const { repository, issue } = payload;
    const initialCheckCount =
      repository.name === "event-diversity-and-inclusion" ? 4 : 6;

    const { data: comments } = await octokit.rest.issues.listComments({
      owner: repository.owner.login,
      repo: repository.name,
      issue_number: issue.number,
    });

    const checklists = comments.filter(
      (comment) =>
        comment.user.type === "Bot" &&
        comment.body.startsWith("# Checklist for")
    );

    const totalCheckCount = checklists.map((element) => {
      const total =
        (element.body.match(/\[x\]/g) || []).length +
        (element.body.match(/\[ \]/g) || []).length;
      return total - initialCheckCount;
    });

    const positiveCheckCount = checklists.map((element) => {
      const count =
        (element.body.match(/\[x\]/g) || []).length - initialCheckCount;
      return Math.max(0, count);
    });

    const percentages = positiveCheckCount.map((element) =>
      Math.floor((element / totalCheckCount[0]) * 100)
    );

    const reviewResult =
      percentages.reduce((sum, p) => sum + p, 0) / percentages.length;
    const badgeAssigned = getBadgeLevel(reviewResult, issue.html_url);

    return {
      markdownBadgeImage: `![Assigned badge: ${badgeAssigned.name}](${badgeAssigned.url})`,
      htmlBadgeImage: `<img src='${badgeAssigned.url}' alt='d&i-badging-badge-state: ${badgeAssigned.name}'/>`,
      reviewResult,
      reviewerCount: percentages.length,
      assigned_badge: badgeAssigned.name,
      badge_URL: badgeAssigned.url,
    };
  } catch (error) {
    console.error("Error calculating badge:", error);
    throw error;
  }
};

const getBadgeLevel = (reviewResult, issueURL) => {
  const levels = {
    40: ["Pending", "D%26I-Pending-red"],
    60: ["Passing", "D%26I-Passing-passing"],
    80: ["Silver", "D%26I-Silver-silver"],
    100: ["Gold", "D%26I-Gold-yellow"],
  };

  const [name, badge] = Object.entries(levels).find(
    ([threshold]) => reviewResult < Number(threshold)
  ) || ["100", ["Gold", "D%26I-Gold-yellow"]];

  const url = `https://img.shields.io/badge/${badge}?style=flat-square&labelColor=583586&&link=${issueURL}/&logo=data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgdmlld0JveD0iMCAwIDI1MCAyNTAiPgo8cGF0aCBmaWxsPSIjMUM5QkQ2IiBkPSJNOTcuMSw0OS4zYzE4LTYuNywzNy44LTYuOCw1NS45LTAuMmwxNy41LTMwLjJjLTI5LTEyLjMtNjEuOC0xMi4yLTkwLjgsMC4zTDk3LjEsNDkuM3oiLz4KPHBhdGggZmlsbD0iIzZBQzdCOSIgZD0iTTE5NC42LDMyLjhMMTc3LjIsNjNjMTQuOCwxMi4zLDI0LjcsMjkuNSwyNy45LDQ4LjVoMzQuOUMyMzYuMiw4MC4yLDIxOS45LDUxLjcsMTk0LjYsMzIuOHoiLz4KPHBhdGggZmlsbD0iI0JGOUNDOSIgZD0iTTIwNC45LDEzOS40Yy03LjksNDMuOS00OS45LDczLTkzLjgsNjUuMWMtMTMuOC0yLjUtMjYuOC04LjYtMzcuNS0xNy42bC0yNi44LDIyLjQKCWM0Ni42LDQzLjQsMTE5LjUsNDAuOSwxNjIuOS01LjdjMTYuNS0xNy43LDI3LTQwLjIsMzAuMS02NC4ySDIwNC45eiIvPgo8cGF0aCBmaWxsPSIjRDYxRDVGIiBkPSJNNTUuNiwxNjUuNkMzNS45LDEzMS44LDQzLjMsODguOCw3My4xLDYzLjVMNTUuNywzMy4yQzcuNSw2OS44LTQuMiwxMzcuNCwyOC44LDE4OEw1NS42LDE2NS42eiIvPgo8L3N2Zz4K`;

  return { name, url };
};

// Event badging utilities
const checkModerator = async (octokit, payload) => {
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      path: ".github/moderators.md",
    });

    const moderators = Buffer.from(data.content, "base64").toString();
    const moderatorUsername = payload.issue.user.login;
    const moderatorList = moderators.split("\n");
    const list = moderatorList
      .filter((element) => element[0] === "-")
      .map((element) => element.substring(2));

    return list.includes(moderatorUsername);
  } catch (error) {
    console.error("Error checking moderator status:", error);
    return false;
  }
};

const welcome = async (octokit, payload) => {
  try {
    const { data } = await octokit.rest.repos.getContent({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      path: ".github/applicant-welcome.md",
    });

    await octokit.rest.issues.createComment({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number: payload.issue.number,
      body: Buffer.from(data.content, "base64").toString(),
    });
  } catch (error) {
    console.error("Error in welcome function:", error);
    throw error;
  }
};

const getResults = async (octokit, payload) => {
  try {
    const resultsArray = await calculateBadge(octokit, payload);
    const message = `
Review percentage: ${resultsArray.reviewResult}
Number of reviewers: ${resultsArray.reviewerCount}
`;

    await octokit.rest.issues.createComment({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number: payload.issue.number,
      body: message,
    });
  } catch (error) {
    console.error("Error getting results:", error);
    throw error;
  }
};

const getEventURL = (payload) => {
  const body = payload.issue.body;
  const isVirtual = payload.issue.title.includes("[Virtual Event]");
  const startStr = "- Link to the Event Website: ";
  const endStr = isVirtual
    ? "- Provide verification that you are an event organizer: "
    : "- Are you an organizer ";

  return body
    .slice(body.indexOf(startStr), body.indexOf(endStr) - 2)
    .replace(startStr, "");
};

const saveEvent = async (octokit, payload) => {
  try {
    const { assigned_badge, badge_URL } = await calculateBadge(
      octokit,
      payload
    );
    const event_name = payload.issue.title.replace(/\[(.*?)\] /gi, "");
    const event_URL = getEventURL(payload);

    const newEvent = {
      event_name,
      event_URL,
      badge: {
        name: assigned_badge,
        badgeURL: badge_URL,
      },
      reviewers: payload.issue.assignees.map((assignee) => ({
        name: assignee.login,
        github_profile_link: assignee.html_url,
      })),
      application: {
        app_no: payload.issue.number,
        app_URL: payload.issue.html_url,
      },
    };

    return await createEvent(newEvent);
  } catch (error) {
    console.error("Error saving event:", error);
    return "";
  }
};

const endReview = async (octokit, payload) => {
  try {
    const resultsObj = await calculateBadge(octokit, payload);
    const message = `
**Markdown Badge Link:**
\`\`\`
${resultsObj.markdownBadgeImage}
\`\`\`
**HTML Badge Link:**
\`\`\`
${resultsObj.htmlBadgeImage}
\`\`\``;

    const {
      owner: { login: owner },
      name: repo,
    } = payload.repository;
    const { number: issue_number } = payload.issue;

    await Promise.all([
      octokit.rest.issues.removeLabel({
        owner,
        repo,
        issue_number,
        name: "review-begin",
      }),
      octokit.rest.issues.addLabels({
        owner,
        repo,
        issue_number,
        labels: ["review-end"],
      }),
      octokit.rest.issues.createComment({
        owner,
        repo,
        issue_number,
        body: resultsObj.markdownBadgeImage + message,
      }),
    ]);

    if (await checkModerator(octokit, payload)) {
      await octokit.rest.issues.update({
        owner,
        repo,
        issue_number,
        state: "closed",
      });
    }
  } catch (error) {
    console.error("Error ending review:", error);
    throw error;
  }
};

// Main controller functions
const login = (req, res) => {
  const { provider } = req.query;
  switch (provider) {
    case "github":
      return githubAuth(req, res);
    case "gitlab":
      return gitlabAuth(req, res);
    default:
      return handleError(res, 400, `Unknown provider: ${provider}`);
  }
};

const scanRepositories = async (user, provider, repos) => {
  const helpers = provider === "github" ? github_helpers : gitlab_helpers;
  return await helpers.scanRepositories(user.id, user.name, user.email, repos);
};

const reposToBadge = async (req, res) => {
  const { repos = [], userId, provider } = req.body;
  const repositoryIds = repos.map((repo) => repo.id);

  if (!provider || !userId) {
    return handleError(res, 400, "Missing required parameters");
  }

  try {
    const user = await findUser(userId);
    if (!user) {
      return handleError(res, 404, "User not found");
    }

    const reposToScan =
      process.env.NODE_ENV === "production" ? repositoryIds : repos;
    const results = await scanRepositories(user, provider, reposToScan);
    return res.status(200).json({ results });
  } catch (error) {
    return handleError(res, 500, "Error processing repositories");
  }
};

const badgedRepos = async (req, res) => {
  try {
    const repos = await Repo.findAll({
      attributes: { exclude: ["DEICommitSHA"] },
    });
    const formattedRepos = repos.map(
      ({
        id,
        githubRepoId,
        repoLink,
        badgeType,
        attachment,
        createdAt,
        updatedAt,
        userId,
      }) => ({
        id,
        githubRepoId,
        repoLink,
        badgeType,
        attachment,
        createdAt,
        updatedAt,
        userId,
      })
    );
    return res.json(formattedRepos);
  } catch (error) {
    return handleError(res, 500, "Error retrieving repos");
  }
};

const handleEventBadging = async (req, res) => {
  const {
    headers: { "x-github-event": eventName },
    body: payload,
  } = req;

  try {
    const octokit = await githubApp.getInstallationOctokit(
      payload.installation.id
    );

    if (payload.issue?.title.match(/event/i)) {
      const eventHandlers = {
        issues: {
          opened: () => welcome(octokit, payload),
          closed: () => saveEvent(octokit, payload),
        },
        issue_comment: {
          created: () => {
            if (payload.comment.body.match("/result"))
              return getResults(octokit, payload);
            if (payload.comment.body.match("/end"))
              return endReview(octokit, payload);
          },
        },
      };

      const handler = eventHandlers[eventName]?.[payload.action];
      if (handler) await handler();
    }

    console.info(`Received ${eventName} event from Github`);
    return res.send("ok");
  } catch (error) {
    return handleError(res, 500, "Error processing GitHub event");
  }
};

const healthCheck = (req, res) => {
  try {
    return res.json({ message: "Project Badging server up and running" });
  } catch (error) {
    return handleError(res, 500, "Server health check failed");
  }
};

module.exports = {
  login,
  reposToBadge,
  badgedRepos,
  handleEventBadging,
  healthCheck,
};
