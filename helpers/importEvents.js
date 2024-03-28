const sequelize = require("../database/helpers/sequelize");
const exceljs = require("exceljs");
const fs = require("fs");
const Event = require("../database/models/events.model");
const badgeRepo = require("../badges/badgeRepo");

const importFile = async (req, res) => {
  const file = req.file;

  if (
    !file.originalname.endsWith(".xlsx") &&
    !file.originalname.endsWith(".xls") &&
    !file.originalname.endsWith(".csv")
  ) {
    return res.status(400).send("Invalid file type");
  }

  // Parse all three sheets concurrently
  const [row1, row2, row3] = await Promise.all([
    parseXLSX(file.filename, "Sheet1"),
    parseXLSX(file.filename, "Sheet2"),
    parseXLSX(file.filename, "Sheet3"),
  ]);

  // Concatenate the rows into one array
  const rows = row1.concat(row2, row3);

  try {
    // Process each row
    for (const row of rows) {
      await processData(row, 3);
    }

    // Delete the uploaded file from the local server
    fs.unlinkSync(`./uploads/${file.filename}`);

    res.status(200).send({ message: "Successfully imported data", data: rows });
  } catch (error) {
    console.error("Error importing data", error);
    res.status(500).send({ message: "Error importing data", error: error });
  }
};

// Helper function to parse excel file to json data.
async function parseXLSX(filename, sheetName) {
  const stream = fs.createReadStream(`./uploads/${filename}`);

  const workbook = new exceljs.Workbook();
  await workbook.xlsx.read(stream);

  const worksheet = workbook.getWorksheet(sheetName);

  // Get header
  const headers = worksheet.getRow(1).values;

  // Convert headers to camelCase
  const camelCaseHeaders = headers.map((header) => {
    return toCamelCase(header);
  });

  const rows = [];

  // Get all data rows
  worksheet.eachRow({ raw: true, skipEmpty: true }, (row, rowNum) => {
    if (rowNum > 1) {
      rows.push(row.values);
    }
  });

  // Map rows to objects
  const mappedRows = rows.map((rowVals) => {
    const obj = {};
    camelCaseHeaders.forEach((header, i) => {
      obj[header] = rowVals[i];
    });
    return obj;
  });
  return mappedRows;
}

// Helper function to process data (with retry mechanism)
async function processData(row, retry) {
  const delayMs = 2000; // 2 seconds delay
  for (let attempt = 1; attempt <= retry; attempt++) {
    try {
      await executeQueryWithTransaction(row);
      break; // If successful, break the loop
    } catch (error) {
      console.error(`Attempt ${attempt}: Error processing data`, error);
      if (attempt === retry) {
        // Log or handle the failed row here
        console.error("Failed to process row:", row);
        throw error; // Throw the error if retries are exhausted
      }
      // Add retry delay
      await new Promise((resolve) => setTimeout(resolve, delayMs)); // Delay for 2 seconds
    }
  }
}

// Helper function to execute query within a transaction using Sequelize
async function executeQueryWithTransaction(row) {
  let transaction;
  let data = {
    name: row.name.text ? row.name.text : row.name,
    eventLink: row.name.hyperlink ? row.name.hyperlink : null,
    date: row.date,
    badge: {
      image: row.badge.hyperlink,
      name: extractBadgeName(row.badge.hyperlink, badgeRepo),
    },
    reviewers: generateGitHubLinks(
      row.reviewers.text ? row.reviewers.text : row.reviewers
    ),
    applicationLink: {
      issue: row.applicationLink.text,
      link: generateGitHubIssueLink(row.applicationLink.text),
    },
    version: row.version,
  };

  try {
    // Start a transaction
    transaction = await sequelize.transaction();

    // Insert the row into the database
    await Event.create(data, { transaction });

    // Commit the transaction
    await transaction.commit();

    // Transaction successfully committed
    console.log("Transaction committed successfully");
  } catch (error) {
    // If there is any error, rollback the transaction
    if (transaction) {
      await transaction.rollback();
    }
    // Throw the error
    throw error;
  }
}

function toCamelCase(str) {
  return str
    .replace(/^[A-Z]/, (letter) => letter.toLowerCase())
    .replace(/\s+(\w)/g, (match, letter) => letter.toUpperCase());
}

function generateGitHubLinks(reviewersText) {
  const usernames = reviewersText.match(/@\w+-\w+|\w+/g); // Extract GitHub usernames prefixed with @
  if (!usernames) return []; // Return empty array if no usernames found

  const githubLinks = usernames.map((username) => {
    const githubUsername = username.slice(1); // Remove @ prefix
    return `https://github.com/${githubUsername}`; // Generate GitHub link
  });

  return githubLinks;
}

function generateGitHubIssueLink(issueNumber) {
  const repoURL = "https://github.com/badging/event-diversity-and-inclusion";
  const issue = issueNumber.replace("#", ""); // Remove '#' prefix
  return `${repoURL}/issues/${issue}`;
}

function extractBadgeName(badgeHyperlink, badgeRepo) {
  for (const badge of badgeRepo) {
    if (badge.eventBadge && badge.eventBadge === badgeHyperlink) {
      return badge.name;
    }
  }
  return null; // Return null if no matching badge found
}

module.exports = importFile;
