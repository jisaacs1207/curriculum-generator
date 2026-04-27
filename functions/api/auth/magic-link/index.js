import { corsHeaders } from "../../../lib/cors.js";
import { brevoSendEmail } from "../../../lib/brevo.js";

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomToken() {
  const a = new Uint8Array(32);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function parseAllowlist(env) {
  const raw = env.ADMIN_EMAIL_ALLOWLIST || "";
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function appOrigin(request, env) {
  const o = (env.APP_ORIGIN || "").trim().replace(/\/$/, "");
  if (o) return o;
  const ref = request.headers.get("Referer");
  if (ref) {
    try {
      return new URL(ref).origin;
    } catch {
      /* ignore */
    }
  }
  return new URL(request.url).origin;
}

export async function onRequestOptions({ request }) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request, "POST, OPTIONS", { "Content-Type": "application/json" }),
  });
}

export async function onRequestPost({ request, env }) {
  const headers = { ...corsHeaders(request, "POST, OPTIONS"), "Content-Type": "application/json" };
  if (!env.AUTH_DB) {
    return Response.json({ error: "AUTH_DB (D1) not bound" }, { status: 503, headers });
  }
  if (!env.JWT_SECRET) {
    return Response.json({ error: "JWT_SECRET not configured" }, { status: 503, headers });
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400, headers });
  }
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Valid email required" }, { status: 400, headers });
  }
  const allow = parseAllowlist(env);
  if (!allow.length) {
    return Response.json({ error: "ADMIN_EMAIL_ALLOWLIST not configured" }, { status: 503, headers });
  }
  if (!allow.includes(email)) {
    return Response.json({ ok: true, message: "If the address is allowed, a link was sent." }, { headers });
  }
  const token = randomToken();
  const tokenHash = await sha256Hex(token);
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + 15 * 60;
  try {
    await env.AUTH_DB.prepare(
      "INSERT INTO magic_tokens (token_hash, email, expires_at, used_at) VALUES (?, ?, ?, NULL)"
    )
      .bind(tokenHash, email, expiresAt)
      .run();
  } catch (e) {
    return Response.json({ error: e.message || "Database error" }, { status: 500, headers });
  }
  const origin = appOrigin(request, env);
  const verifyUrl = `${origin}/api/auth/magic-link/verify?token=${encodeURIComponent(token)}`;
  const subject = "Sign in to curriculum admin";
  const html = `<p>Click the link below to sign in (valid 15 minutes, one use):</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`;
  try {
    await brevoSendEmail(env, { to: email, subject, htmlContent: html });
  } catch (e) {
    await env.AUTH_DB.prepare("DELETE FROM magic_tokens WHERE token_hash = ?").bind(tokenHash).run();
    return Response.json({ error: e.message || "Email send failed" }, { status: 502, headers });
  }
  return Response.json({ ok: true, message: "Check your email for the sign-in link." }, { headers });
}
