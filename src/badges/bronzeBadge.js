const { mailer } = require("../helpers");
const bronzeBadge = async (email, DEI) => {
  const report = [];
  const content = Buffer.from(DEI.content, "base64").toString("utf-8");
  // Check for specific titles
  const titlesToCheck = [
    "Project Access",
    "Communication Transparency",
    "Newcomer Experiences",
    "Inclusive Leadership",
  ];

  let hasAllTitles = true;

  for (const title of titlesToCheck) {
    if (content.includes(title)) {
      report.push(`✅ ${title} present`);
    } else {
      report.push(`${title} not present`);
      hasAllTitles = false;
    }
  }

  if (hasAllTitles) {
    // call the augur API from here
    mailer(email, report);
  } else {
    report.push(
      "some fields are missing. Please refer to this link for more information"
    );
    mailer(email, report);
  }
};

module.exports = bronzeBadge;
