const augurAPI = require("../helpers/augurAPI");
const mailer = require("../helpers/mailer");
const emailTemplate = require("../helpers/emailTemplate");

const bronzeBadge = async (name, email, id, url, content) => {
  const results = [];
  // Check for specific titles
  const titlesToCheck = [
    "Project Access",
    "Communication Transparency",
    "Newcomer Experiences",
    "Inclusive Leadership",
  ];

  let hasAllTitles = true;

  for (const title of titlesToCheck) {
    if (!content.includes(title)) {
      results.push(`${title} not present`);
      hasAllTitles = false;
    }
  }

  if (hasAllTitles) {
    // configure Augur API
    const augurResponse = await augurAPI(id, "bronze", url);
    console.log(augurResponse.status);

    // email content
    const markdownLink =
      "![Bronze Badge](https://raw.githubusercontent.com/AllInOpenSource/BadgingAPI/main/assets/bronze-badge.svg)";
    const htmlLink =
      '<img src="https://raw.githubusercontent.com/AllInOpenSource/BadgingAPI/main/assets/bronze-badge.svg" alt="Project Badging Bronze Badge" />';
    const badgeImageUrl =
      "https://raw.githubusercontent.com/AllInOpenSource/BadgingAPI/main/assets/bronze-badge.svg";

    const emailContent = await emailTemplate(
      name,
      "Bronze",
      badgeImageUrl,
      markdownLink,
      htmlLink
    );

    // send email
    await mailer(email, emailContent);
  } else {
    results.push(
      "some fields are missing. Please refer to this link for more information"
    );
    await mailer(email, results.join("\n"));
  }
};

module.exports = bronzeBadge;
