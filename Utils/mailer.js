// utils/mailer.js
const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,     // Your Gmail address
    pass: process.env.GMAIL_PASS,     // App password, not your actual Gmail password
  },
});

const sendEmail = async (to, subject, html) => {
  const mailOptions = {
    from: `"Interview Scheduler" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;