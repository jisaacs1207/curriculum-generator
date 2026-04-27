/**
 * HS256 admin_session JWT — same claims as functions/lib/jwt-hs256.js (Node crypto).
 */
import crypto from "crypto";

function b64urlJson(obj) {
  return Buffer.from(JSON.stringify(obj), "utf8").toString("base64url");
}

function b64urlBuf(buf) {
  return Buffer.from(buf).toString("base64url");
}

function b64urlDecode(s) {
  return Buffer.from(s, "base64url");
}

export async function signAdminJwt(secret, email, ttlSec = 3600) {
  const header = b64urlJson({ alg: "HS256", typ: "JWT" });
  const now = Math.floor(Date.now() / 1000);
  const payload = b64urlJson({
    sub: email,
    typ: "admin_session",
    iat: now,
    exp: now + ttlSec,
  });
  const msg = `${header}.${payload}`;
  const sig = crypto.createHmac("sha256", secret).update(msg).digest();
  return `${msg}.${b64urlBuf(sig)}`;
}

export function verifyAdminJwt(secret, token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, p, sig] = parts;
  const msg = `${h}.${p}`;
  const expected = crypto.createHmac("sha256", secret).update(msg).digest("base64url");
  if (expected.length !== sig.length) return null;
  let ok = true;
  for (let i = 0; i < sig.length; i++) {
    if (sig.charCodeAt(i) !== expected.charCodeAt(i)) ok = false;
  }
  if (!ok) return null;
  let payloadObj;
  try {
    payloadObj = JSON.parse(b64urlDecode(p).toString("utf8"));
  } catch {
    return null;
  }
  if (payloadObj.typ !== "admin_session" || !payloadObj.sub) return null;
  const now = Math.floor(Date.now() / 1000);
  if (typeof payloadObj.exp !== "number" || payloadObj.exp < now) return null;
  return { email: String(payloadObj.sub) };
}

export function parseCookies(cookieHeader) {
  const out = {};
  if (!cookieHeader || typeof cookieHeader !== "string") return out;
  for (const part of cookieHeader.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    try {
      out[k] = decodeURIComponent(v);
    } catch {
      out[k] = v;
    }
  }
  return out;
}
