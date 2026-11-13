import { sendMail } from "./mailer.js";

const sendOtpMail = async (toEmail, otp) => {
  const html = `
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

  return sendMail({
    to: toEmail,
    subject: "Nestro Email Verification OTP",
    html,
  });
};

export default sendOtpMail;
