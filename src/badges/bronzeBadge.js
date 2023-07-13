const augurAPI = require("../helpers/augurAPI");

const bronzeBadge = async (id, url, content) => {
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
    if (content.includes(title)) {
      results.push(`✅ ${title} present`);
    } else {
      results.push(`${title} not present`);
      hasAllTitles = false;
    }
  }

  if (hasAllTitles) {
    /**
     * augur configs here
     */

    const augur=augurAPI(id,"bronze",url)
    console.log(augur.json())
    return results
  } else {
    results.push(
      "some fields are missing. Please refer to this link for more information"
    );
    return results;
  }
};

module.exports = bronzeBadge;
