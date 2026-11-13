import { sendMail, escapeHtml } from "../utils/mailer.js";
import { sendBadRequest } from "../utils/response.js";

const SUBJECTS = ["General Enquiry", "Order Support", "Custom Furniture"];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const sendContactMessage = async (req, res) => {
  try {
    const { firstName, lastName, email, subject, message } = req.body || {};

    if (!firstName?.trim() || !email?.trim() || !message?.trim()) {
      return sendBadRequest(res, "First name, email and message are required");
    }
    if (!EMAIL_RE.test(email.trim())) {
      return sendBadRequest(res, "Please enter a valid email address");
    }
    if (message.trim().length > 3000) {
      return sendBadRequest(res, "Message is too long (max 3000 characters)");
    }

    const to = process.env.CONTACT_TO_EMAIL?.trim();
    if (!to) {
      console.error("CONTACT_TO_EMAIL is not set; contact messages cannot be delivered.");
      return res.status(503).json({
        success: false,
        message: "Contact form is temporarily unavailable. Please email us directly.",
      });
    }

    const safeSubject = SUBJECTS.includes(subject) ? subject : "General Enquiry";
    const fullName = `${firstName} ${lastName || ""}`.trim();

    const result = await sendMail({
      to,
      replyTo: email.trim(),
      subject: `[Nestro Contact] ${safeSubject} - ${fullName}`.slice(0, 200),
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto;">
          <h2 style="color:#8C5A3C;">New contact message</h2>
          <p><strong>Name:</strong> ${escapeHtml(fullName)}</p>
          <p><strong>Email:</strong> ${escapeHtml(email.trim())}</p>
          <p><strong>Subject:</strong> ${escapeHtml(safeSubject)}</p>
          <p style="white-space:pre-wrap;">${escapeHtml(message.trim())}</p>
        </div>`,
    });

    if (!result.success) {
      return res.status(502).json({
        success: false,
        message: "Could not send your message right now. Please try again later.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Thank you! Your message has been sent. We will reply within 24 hours.",
    });
  } catch (error) {
    console.error("Contact Error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
};
