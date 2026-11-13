import { Resend } from "resend";

const SEND_TIMEOUT_MS = 8000;

// Created lazily: ES imports are evaluated before dotenv.config() runs in index.js,
// so reading process.env at module load time would miss RESEND_API_KEY.
let resendClient = null;
const getResend = () => {
  if (!process.env.RESEND_API_KEY) return null;
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY.trim());
  return resendClient;
};

const getFrom = () =>
  process.env.RESEND_FROM?.trim() || "Nestro <onboarding@resend.dev>";

export const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

/**
 * Send an email through Resend. Never throws: always resolves to
 * { success: boolean, message: string, id?: string }.
 * A timeout keeps API requests (e.g. /register) from hanging on a slow provider.
 */
export const sendMail = async ({ to, subject, html, replyTo }) => {
  const resend = getResend();
  if (!resend) {
    console.error("Resend is not configured: RESEND_API_KEY is missing.");
    return { success: false, message: "Email service is not configured" };
  }

  try {
    const payload = {
      from: getFrom(),
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    };
    if (replyTo) payload.replyTo = replyTo;

    const { data, error } = await Promise.race([
      resend.emails.send(payload),
      new Promise((_, reject) =>
        setTimeout(
          () => reject(new Error("Resend request timed out")),
          SEND_TIMEOUT_MS,
        ),
      ),
    ]);

    if (error) {
      console.error("Resend error:", error);
      return { success: false, message: error.message || "Resend rejected the email" };
    }

    console.log("Email sent via Resend:", data?.id);
    return { success: true, message: "Email sent successfully", id: data?.id };
  } catch (err) {
    console.error("Resend send failed:", err?.message || err);
    return { success: false, message: err?.message || "Failed to send email" };
  }
};
