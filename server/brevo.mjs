/** Brevo transactional email (local proxy parity with Pages Function). */

export async function brevoSendEmail(ctx, { to, subject, htmlContent }) {
  const key = ctx.BREVO_API_KEY?.trim();
  if (!key) throw new Error("BREVO_API_KEY not configured");
  const fromEmail = (ctx.MAGIC_LINK_FROM_EMAIL || "").trim();
  if (!fromEmail) throw new Error("MAGIC_LINK_FROM_EMAIL not configured");
  const fromName = (ctx.MAGIC_LINK_FROM_NAME || "").trim() || "Curriculum admin";
  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { accept: "application/json", "api-key": key, "content-type": "application/json" },
    body: JSON.stringify({
      sender: { email: fromEmail, name: fromName },
      to: [{ email: to }],
      subject,
      htmlContent,
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t.slice(0, 400) || `Brevo HTTP ${res.status}`);
  }
}
