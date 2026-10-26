import { BrevoClient } from "@getbrevo/brevo";
import nodemailer from "nodemailer";

const sendOtpMail = async (toEmail, otp) => {
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 24px; border: 1px solid #ddd; border-radius: 10px;">
      <h2 style="color: #0d9488;">Nestro Email Verification</h2>
      <p>Your OTP for email verification is:</p>
      <h1 style="letter-spacing: 8px; color: #0d9488; font-size: 32px;">${otp}</h1>
      <p>This OTP is valid for 5 minutes.</p>
      <p style="color: #777; font-size: 13px;">
        If you did not request this OTP, please ignore this email.
      </p>
    </div>
  `;

  // 1. Attempt sending with Brevo API v6
  if (process.env.BREVO_API_KEY) {
    try {
      const brevo = new BrevoClient({
        apiKey: process.env.BREVO_API_KEY.trim(),
      });

      const result = await brevo.transactionalEmails.sendTransacEmail({
        sender: {
          name: "Nestro",
          email: process.env.SMTP_USER || "workt7200@gmail.com",
        },
        to: [{ email: toEmail }],
        subject: "Nestro Email Verification OTP",
        htmlContent,
      });

      console.log("OTP email sent via Brevo:", result?.messageId || "Success");
      return {
        success: true,
        message: "OTP email sent successfully",
      };
    } catch (brevoError) {
      console.warn(
        "Brevo API error, trying SMTP fallback:",
        brevoError?.response?.body || brevoError?.message || brevoError
      );
    }
  }

  // 2. Fallback to Nodemailer SMTP
  if (process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const info = await transporter.sendMail({
        from: `"Nestro" <${process.env.SMTP_USER}>`,
        to: toEmail,
        subject: "Nestro Email Verification OTP",
        html: htmlContent,
      });

      console.log("OTP email sent via Nodemailer:", info.messageId);
      return {
        success: true,
        message: "OTP email sent successfully",
      };
    } catch (smtpError) {
      console.error("Nodemailer SMTP error:", smtpError?.message || smtpError);
    }
  }

  return {
    success: false,
    message: "Failed to send OTP email",
  };
};

export default sendOtpMail;