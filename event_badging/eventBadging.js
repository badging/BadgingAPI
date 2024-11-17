// Utility function to calculate badge
const calculateBadge = async (octokit, payload) => {
  let initialCheckCount = 6;
  let issueURL = payload.issue.html_url;
  payload.repository.name === "event-diversity-and-inclusion"
    ? (initialCheckCount = 4)
    : initialCheckCount;

  // get the list of comments on the event issue
  const comments = await octokit.rest.issues.listComments({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    issue_number: payload.issue.number,
  });

  // filter out the comments that are checklists
  let checklists = comments.data.filter((comment) => {
    return (
      comment.user.type == "Bot" &&
      comment.body.substring(0, 15) == "# Checklist for"
    );
  });

  // get the total number of checks for each checklist
  let totalCheckCount = checklists.map(function (element) {
    return (
      (element.body.match(/\[x\]/g) || []).length +
      (element.body.match(/\[ \]/g) || []).length
    );
  });

  totalCheckCount = totalCheckCount.map(function (element) {
    return element - initialCheckCount;
  });

  // get the number of checks for each checklist that are positive
  let positiveCheckCount = checklists.map(function (element) {
    let checkCount =
      +(element.body.match(/\[x\]/g) || []).length - initialCheckCount;
    if (checkCount <= 0) return 0;
    else return checkCount;
  });

  // get the percentage of checks for each checklist that are positive
  let percentages = positiveCheckCount.map(function (element) {
    let p = Math.floor((element / totalCheckCount[0]) * 100);
    return p;
  });

  let reviewerCount = percentages.length;
  let reviewResult = 0;
  percentages.forEach((element) => {
    reviewResult += element;
  });
  reviewResult /= reviewerCount;

  // assign bagde based on review result
  const badgeAssigned =
    reviewResult < 40
      ? ["Pending", "D%26I-Pending-red"]
      : reviewResult < 60
      ? ["Passing", "D%26I-Passing-passing"]
      : reviewResult < 80
      ? ["Silver", "D%26I-Silver-silver"]
      : reviewResult <= 100
      ? ["Gold", "D%26I-Gold-yellow"]
      : ["pending", "D%26I-Pending-red"];

  const url =
    "https://img.shields.io/badge/" +
    badgeAssigned[1] +
    "?style=flat-square&labelColor=583586&&link=" +
    issueURL +
    "/&logo=data:image/svg+xml;base64,PHN2ZyB2ZXJzaW9uPSIxLjEiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgdmlld0JveD0iMCAwIDI1MCAyNTAiPgo8cGF0aCBmaWxsPSIjMUM5QkQ2IiBkPSJNOTcuMSw0OS4zYzE4LTYuNywzNy44LTYuOCw1NS45LTAuMmwxNy41LTMwLjJjLTI5LTEyLjMtNjEuOC0xMi4yLTkwLjgsMC4zTDk3LjEsNDkuM3oiLz4KPHBhdGggZmlsbD0iIzZBQzdCOSIgZD0iTTE5NC42LDMyLjhMMTc3LjIsNjNjMTQuOCwxMi4zLDI0LjcsMjkuNSwyNy45LDQ4LjVoMzQuOUMyMzYuMiw4MC4yLDIxOS45LDUxLjcsMTk0LjYsMzIuOHoiLz4KPHBhdGggZmlsbD0iI0JGOUNDOSIgZD0iTTIwNC45LDEzOS40Yy03LjksNDMuOS00OS45LDczLTkzLjgsNjUuMWMtMTMuOC0yLjUtMjYuOC04LjYtMzcuNS0xNy42bC0yNi44LDIyLjQKCWM0Ni42LDQzLjQsMTE5LjUsNDAuOSwxNjIuOS01LjdjMTYuNS0xNy43LDI3LTQwLjIsMzAuMS02NC4ySDIwNC45eiIvPgo8cGF0aCBmaWxsPSIjRDYxRDVGIiBkPSJNNTUuNiwxNjUuNkMzNS45LDEzMS44LDQzLjMsODguOCw3My4xLDYzLjVMNTUuNywzMy4yQzcuNSw2OS44LTQuMiwxMzcuNCwyOC44LDE4OEw1NS42LDE2NS42eiIvPgo8L3N2Zz4K";

  const markdownBadgeImage =
    "![Assigned badge: " + badgeAssigned[0] + "](" + url + ")";

  const htmlBadgeImage =
    "<img src='" +
    url +
    "' alt='" +
    "d&i-badging-badge-state: " +
    badgeAssigned[0] +
    "'/>";
  messageObj = {
    markdownBadgeImage: markdownBadgeImage,
    htmlBadgeImage: htmlBadgeImage,
    reviewResult: reviewResult,
    reviewerCount: reviewerCount,
    assigned_badge: badgeAssigned[0],
    badge_URL: url,
  };

  return messageObj;
};

// Check moderator status
const checkModerator = async (octokit, payload) => {
  const moderators = await octokit.rest.repos
    .getContent({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      path: ".github/moderators.md",
    })
    .then((res) => Buffer.from(res, "base64").toString())
    .catch((err) => console.err(err));

  let moderatorUsername = payload.issue.user.login;
  let moderatorList = moderators.split("\n");

  let list = moderatorList
    .filter((element) => element[0] == "-")
    .map((element) => element.substring(2));

  return list.includes(moderatorUsername);
};

// Welcome functionality
const welcome = async (octokit, payload) => {
  const {
    data: { content },
  } = await octokit.rest.repos.getContent({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    path: ".github/applicant-welcome.md",
  });

  await octokit.rest.issues
    .createComment({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number: payload.issue.number,
      body: Buffer.from(content, "base64").toString(),
    })
    .then((res) => console.info(res.status))
    .catch((err) => console.error(err));
};

// Save event functionality
const saveEvent = async (octokit, payload) => {
  let { assigned_badge, badge_URL } = await calculateBadge(octokit, payload);

  const event_name = payload.issue.title.replace(/\[(.*?)\] /gi, "");
  let event_URL = getEventURL(payload);

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

  try {
    const event = await createEvent(newEvent);
    return event || "";
  } catch (error) {
    console.error(error);
    return "";
  }
};

// Get results functionality
const getResults = async (octokit, payload) => {
  const resultsArray = await calculateBadge(octokit, payload);
  const message = `
Review percentage: ${resultsArray.reviewResult}
Number of reviewers: ${resultsArray.reviewerCount}
`;

  await octokit.rest.issues
    .createComment({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number: payload.issue.number,
      body: message,
    })
    .then((res) => console.log(res.status))
    .catch((err) => console.error(err));
};

// End review functionality
const endReview = async (octokit, payload) => {
  let resultsObj = await calculateBadge(octokit, payload);
  let message = `
**Markdown Badge Link:**
\`\`\`
${resultsObj.markdownBadgeImage}
\`\`\`
**HTML Badge Link:**
\`\`\`
${resultsObj.htmlBadgeImage}
\`\`\``;

  // Handle labels and comments
  await handleEndReviewActions(octokit, payload, resultsObj, message);
};

// Helper function for getting event URL
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

// Helper function for end review actions
const handleEndReviewActions = async (
  octokit,
  payload,
  resultsObj,
  message
) => {
  await octokit.rest.issues.removeLabel({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    issue_number: payload.issue.number,
    name: "review-begin",
  });

  await octokit.rest.issues.addLabels({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    issue_number: payload.issue.number,
    labels: ["review-end"],
  });

  await octokit.rest.issues.createComment({
    owner: payload.repository.owner.login,
    repo: payload.repository.name,
    issue_number: payload.issue.number,
    body: resultsObj.markdownBadgeImage + message,
  });

  if (checkModerator) {
    await octokit.rest.issues.update({
      owner: payload.repository.owner.login,
      repo: payload.repository.name,
      issue_number: payload.issue.number,
      state: "closed",
    });
  }
};

module.exports = {
  calculateBadge,
  checkModerator,
  welcome,
  saveEvent,
  getResults,
  endReview,
};
