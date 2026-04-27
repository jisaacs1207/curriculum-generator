/**
 * Send transactional email via Brevo REST API v3.
 * @see https://developers.brevo.com/docs/send-a-transactional-email
 */
export async function brevoSendEmail(env, { to, subject, htmlContent }) {
  const key = env.BREVO_API_KEY;
  if (!key) throw new Error("BREVO_API_KEY not configured");
  const fromEmail = env.MAGIC_LINK_FROM_EMAIL;
  const fromName = env.MAGIC_LINK_FROM_NAME || "Curriculum admin";
  if (!fromEmail) throw new Error("MAGIC_LINK_FROM_EMAIL not configured");

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": key,
    },
    body: JSON.stringify({
      sender: { name: fromName, email: fromEmail },
      to: [{ email: to }],
      subject,
      htmlContent,
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    let err = text.slice(0, 400);
    try {
      const j = JSON.parse(text);
      err = j.message || j.error || err;
    } catch {
      /* ignore */
    }
    throw new Error(`Brevo ${res.status}: ${err}`);
  }
}
