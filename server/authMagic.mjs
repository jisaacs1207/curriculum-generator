import crypto from "crypto";
import { brevoSendEmail } from "./brevo.mjs";
import { signAdminJwt, parseCookies, verifyAdminJwt } from "./jwt-admin.mjs";
import * as magic from "./magicTokens.mjs";

function sha256Hex(text) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

function randomToken() {
  return crypto.randomBytes(32).toString("hex");
}

function parseAllowlist(raw) {
  return String(raw || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function appOrigin(req, ctx) {
  const o = String(ctx.APP_ORIGIN || "")
    .trim()
    .replace(/\/$/, "");
  if (o) return o;
  const ref = req.headers.referer;
  if (ref) {
    try {
      return new URL(ref).origin;
    } catch {
      /* ignore */
    }
  }
  const host = req.headers.host || "localhost:3001";
  const proto = req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
  return `${proto}://${host}`;
}

function readBearer(req) {
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : "";
}

export function authorizeAdminWriteNode(req, ctx) {
  const adminTok = ctx.PAGE_SETTINGS_ADMIN_TOKEN || "";
  const bearer = readBearer(req);
  if (adminTok && bearer === adminTok) return { type: "bearer" };
  const secret = ctx.JWT_SECRET || "";
  if (!secret) return null;
  const cookies = parseCookies(req.headers.cookie || "");
  const tok = cookies.admin_session;
  const admin = verifyAdminJwt(secret, tok);
  if (admin?.email) return { type: "cookie", email: admin.email };
  return null;
}

function cookieSecure(req) {
  return req.headers["x-forwarded-proto"] === "https";
}

/** @param {import("http").IncomingMessage} req @param {import("http").ServerResponse} res */
export async function handleMagicLinkPost(req, res, ctx) {
  if (!ctx.JWT_SECRET) {
    res.writeHead(503, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "JWT_SECRET not configured (local magic link disabled)" }));
    return;
  }
  let body = "";
  for await (const chunk of req) body += chunk;
  let parsed;
  try {
    parsed = JSON.parse(body || "{}");
  } catch {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid JSON" }));
    return;
  }
  const email = typeof parsed?.email === "string" ? parsed.email.trim().toLowerCase() : "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Valid email required" }));
    return;
  }
  const allow = parseAllowlist(ctx.ADMIN_EMAIL_ALLOWLIST);
  if (!allow.length) {
    res.writeHead(503, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "ADMIN_EMAIL_ALLOWLIST not configured" }));
    return;
  }
  if (!allow.includes(email)) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true, message: "If the address is allowed, a link was sent." }));
    return;
  }
  const token = randomToken();
  const tokenHash = sha256Hex(token);
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + 15 * 60;
  magic.magicInsert(tokenHash, email, expiresAt);
  const origin = appOrigin(req, ctx);
  const verifyUrl = `${origin}/api/auth/magic-link/verify?token=${encodeURIComponent(token)}`;
  const subject = "Sign in to curriculum admin";
  const html = `<p>Click the link below to sign in (valid 15 minutes, one use):</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`;
  try {
    await brevoSendEmail(ctx, { to: email, subject, htmlContent: html });
  } catch (e) {
    magic.magicDelete(tokenHash);
    res.writeHead(502, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: e.message || "Email send failed" }));
    return;
  }
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ ok: true, message: "Check your email for the sign-in link." }));
}

export async function handleMagicVerifyGet(req, res, ctx) {
  if (!ctx.JWT_SECRET) {
    res.writeHead(503, { "Content-Type": "text/plain" });
    res.end("Auth not configured");
    return;
  }
  const u = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const token = u.searchParams.get("token") || "";
  if (!token) {
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end("Missing token");
    return;
  }
  const tokenHash = sha256Hex(token);
  const now = Math.floor(Date.now() / 1000);
  const row = magic.magicGet(tokenHash);
  if (!row || row.used_at != null || row.expires_at < now) {
    res.writeHead(400, { "Content-Type": "text/plain" });
    res.end("Invalid or expired link");
    return;
  }
  magic.magicMarkUsed(tokenHash, now);
  const jwt = await signAdminJwt(ctx.JWT_SECRET, row.email, 3600);
  const origin = appOrigin(req, ctx);
  const redirect = `${origin}/?settings=1&signedIn=1`;
  const securePart = cookieSecure(req) ? "; Secure" : "";
  const cookie = `admin_session=${encodeURIComponent(jwt)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=3600${securePart}`;
  res.writeHead(302, { Location: redirect, "Set-Cookie": cookie });
  res.end();
}

export async function handleSessionGet(req, res, ctx) {
  const secret = ctx.JWT_SECRET || "";
  if (!secret) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ signedIn: false }));
    return;
  }
  const cookies = parseCookies(req.headers.cookie || "");
  const tok = cookies.admin_session;
  const admin = verifyAdminJwt(secret, tok);
  res.writeHead(200, { "Content-Type": "application/json" });
  if (!admin) res.end(JSON.stringify({ signedIn: false }));
  else res.end(JSON.stringify({ signedIn: true, email: admin.email }));
}
