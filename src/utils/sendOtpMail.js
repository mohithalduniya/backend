
import nodemailer from "nodemailer";

const sendOtpMail = async (toemail, otp) => {
  try {
    // Create SMTP transporter
    const transporter = nodemailer.createTransport({
      service: "gmail",
      port: 587,
      secure: false, // STARTTLS
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Send OTP email
    const info = await transporter.sendMail({
      from: `"Your Store" <${process.env.SMTP_USER}>`,
      to: toemail,
      subject: "Email Verification OTP",
      text: `Your OTP is ${otp}. It is valid for 5 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: auto; padding: 24px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #5E3122;">Email Verification</h2>
          <p>Your OTP for email verification is:</p>
          <h1 style="letter-spacing: 8px; color: #5E3122;">${otp}</h1>
          <p>This OTP is valid for 5 minutes.</p>
          <p style="color: #777; font-size: 13px;">
            If you did not request this OTP, please ignore this email.
          </p>
        </div>
      `,
    });

    console.log("OTP email sent:", info.messageId);

    return {
      success: true,
      message: "OTP email sent successfully",
    };
  } catch (error) {
    console.error("OTP email error:", error.message);

    return {
      success: false,
      message: "Failed to send OTP email",
    };
  }
};

export default sendOtpMail;
