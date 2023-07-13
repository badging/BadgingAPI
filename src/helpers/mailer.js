const nodemailer = require("nodemailer");
require("dotenv").config();

const mailer = (email, results) => {
  // Create a transporter using your email service provider's SMTP settings
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: "ekaxada@gmail.com",
      pass: process.env.MAIL_PASSWORD,
    },
  });

  // Define the email options
  const mailOptions = {
    from: "ekaxada@gmail.com",
    to: email,
    subject: "DEI Badging report",
    text: results,
  };

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
