const nodemailer = require("nodemailer");
require("dotenv").config();
// Create a transporter using your email service provider's SMTP settings
const transporter = nodemailer.createTransport({
  service: "Gmail",
  auth: {
    user: "ekaxada@gmail.com",
    pass: process.env.mailPassword,
  },
});

// Define the email options
const mailOptions = {
  from: "your_email",
  to: "ekaxada@gmail.com",
  subject: "Hi",
  text: "Hello, this is a test email.",
};

// Send the email
transporter.sendMail(mailOptions, function (error, info) {
  if (error) {
    console.log("Error:", error);
  } else {
    console.log("Email sent:", info.response);
  }
});
