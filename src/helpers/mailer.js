const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: `.env.${process.env.NODE_ENV}` });

const mailer = async (
  email,
  recipientName,
  badgeName,
  markdownLink,
  htmlLink,
  results
) => {
  if (
    !process.env.EMAIL_HOST ||
    !process.env.EMAIL_HOST ||
    !process.env.EMAIL_USERNAME ||
    !process.env.EMAIL_PASSWORD
  ) {
    console.error("Email service is not configured");

    if (process.env.NODE_ENV === "development") {
      console.log(`Sending email to '${email}'`, results);
    }

    return;
  }

  // Create a transporter using your email service provider's SMTP settings
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: "ekaxada@gmail.com",
      pass: process.env.MAIL_PASSWORD,
    },
  });

  let mailOptions = {};

  if (results) {
    // Read the HTML template file
    const templatePath = path.resolve(
      __dirname,
      "./email_templates/failure.html"
    );
    const html = fs.readFileSync(templatePath, { encoding: "utf-8" });

    // Replace placeholders with dynamic values in the HTML template
    const replacedHTML = await html
      .replace("{{recipientName}}", recipientName)
      .replace("{{badgeName}}", badgeName)
      .replace("{{results}}", results);

    // Define the email options with HTML content
    mailOptions = {
      from: "ekaxada@gmail.com",
      to: email,
      subject: "DEI Badging report",
      html: replacedHTML,
    };
  } else {
    // Read the HTML template file
    const templatePath = path.resolve(
      __dirname,
      "./email_templates/success.html"
    );
    const html = fs.readFileSync(templatePath, { encoding: "utf-8" });

    // Replace placeholders with dynamic values in the HTML template
    const replacedHTML = await html
      .replace("{{recipientName}}", recipientName)
      .replace("{{badgeName}}", badgeName)
      .replace("{{markdownLink}}", markdownLink)
      .replace("{{htmlLink}}", htmlLink);

    // Define the email options with HTML content
    mailOptions = {
      from: "ekaxada@gmail.com",
      to: email,
      subject: "DEI Badging report",
      html: replacedHTML,
    };
  }

  // Send the email
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log("Error:", error);
    } else {
      console.log("Email sent:", info.response);
    }
  });
};

module.exports = mailer;
