// require("dotenv").config();
const nodemailer = require("nodemailer");
const fs = require("fs");
const path = require("path");
const logger = require("./logger");

// Create a transporter for Microsoft 365 (Office 365) SMTP
const transporter = nodemailer.createTransport({
  service: "Gmail",
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth: {
    user: process.env.ADMIN_NODEMAILER_EMAIL_ADDRESS,
    pass: process.env.ADMIN_NODEMAILER_EMAIL_PASSWORD,
  },
});

/**
 * Validates email configuration
 * @throws {Error} If email credentials are not configured
 */
const validateEmailConfig = () => {
  if (
    !process.env.ADMIN_NODEMAILER_EMAIL_ADDRESS ||
    !process.env.ADMIN_NODEMAILER_EMAIL_PASSWORD
  ) {
    const missing = [];
    if (!process.env.ADMIN_NODEMAILER_EMAIL_ADDRESS)
      missing.push("ADMIN_NODEMAILER_EMAIL_ADDRESS");
    if (!process.env.ADMIN_NODEMAILER_EMAIL_PASSWORD)
      missing.push("ADMIN_NODEMAILER_EMAIL_PASSWORD");

    throw new Error(
      `Email configuration error: Missing required environment variables: ${missing.join(
        ", "
      )}. ` +
        `Please configure these in your .env file to enable email functionality.`
    );
  }
};

const sendRegistrationEmail = async (toEmail, username) => {
  try {
    const templatePath = path.join(
      __dirname,
      "../templates/registrationConfirmationEmail.html"
    );

    // Read the external HTML file
    let emailTemplate = fs.readFileSync(templatePath, "utf8");

    // Replace the placeholder {{username}} with the actual username
    emailTemplate = emailTemplate.replace("{{username}}", username);

    const mailOptions = {
      from: process.env.ADMIN_NODEMAILER_EMAIL_ADDRESS,
      to: toEmail,
      subject: "Confirmation: Kyber Vision Registration ",
      html: emailTemplate,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info("Email sent:", info.response);
    return info;
  } catch (error) {
    logger.error("Error sending email:", error);
    throw error;
  }
};

const sendResetPasswordEmail = async (toEmail, resetLink) => {
  logger.info(`- Sending reset password email to: ${toEmail}`);

  logger.info(
    "[MAILER DEBUG] ADMIN_NODEMAILER_EMAIL_ADDRESS:",
    process.env.ADMIN_NODEMAILER_EMAIL_ADDRESS
  );
  logger.info("[MAILER DEBUG] NODE_ENV:", process.env.NODE_ENV);

  try {
    // Validate configuration before attempting to send
    validateEmailConfig();

    const templatePath = path.join(
      __dirname,
      "../templates/resetPasswordLinkEmail.html"
    );

    // Read the external HTML file
    let emailTemplate = fs.readFileSync(templatePath, "utf8");

    // Replace the placeholder {{username}} with the actual username
    emailTemplate = emailTemplate.replace("{{resetLink}}", resetLink);

    const mailOptions = {
      from: process.env.ADMIN_NODEMAILER_EMAIL_ADDRESS,
      to: toEmail,
      subject: "Password Reset Request",
      html: emailTemplate,
    };

    const info = await transporter.sendMail(mailOptions);
    logger.info(`✓ Password reset email sent successfully:`, info.response);
    return info;
  } catch (error) {
    // Enhanced error logging with context
    logger.error("❌ [MAILER DEBUG] Error type:", typeof error);
    logger.error("❌ [MAILER DEBUG] Error is null/undefined?", error == null);
    logger.error(
      "❌ [MAILER DEBUG] Error stringified:",
      JSON.stringify(error, null, 2)
    );
    logger.error("❌ [MAILER DEBUG] Error toString:", String(error));
    logger.error("❌ [MAILER DEBUG] Error.message:", error?.message);
    logger.error("❌ [MAILER DEBUG] Error.code:", error?.code);
    logger.error("❌ [MAILER DEBUG] Full error:", error);
    logger.error(
      "❌ [MAILER DEBUG] ADMIN_NODEMAILER_EMAIL_ADDRESS:",
      process.env.ADMIN_NODEMAILER_EMAIL_ADDRESS
    );
    logger.info("❌ [MAILER DEBUG] NODE_ENV:", process.env.NODE_ENV);

    if (error?.message && error.message.includes("Email configuration error")) {
      logger.error("❌ EMAIL CONFIGURATION ERROR:", error.message);
    } else if (error?.code === "EAUTH") {
      logger.error(
        "❌ EMAIL AUTHENTICATION FAILED: Invalid ADMIN_NODEMAILER_EMAIL_ADDRESS or ADMIN_NODEMAILER_EMAIL_PASSWORD. " +
          "Please verify your Gmail credentials in .env file."
      );
    } else if (error?.code === "ENOTFOUND" || error?.code === "ECONNECTION") {
      logger.error(
        "❌ EMAIL NETWORK ERROR: Cannot reach Gmail SMTP server.",
        error?.message
      );
    } else {
      logger.error("❌ EMAIL SEND ERROR:", error?.message || "Unknown error");
    }

    throw error; // Re-throw for route handler to catch
  }
};

module.exports = {
  sendRegistrationEmail,
  sendResetPasswordEmail,
};
