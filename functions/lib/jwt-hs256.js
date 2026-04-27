/**
 * Minimal HS256 JWT for admin_session cookie (Workers runtime, Web Crypto).
 */

function b64url(buf) {
  const bytes = new Uint8Array(buf);
  let bin = "";
  const chunk = 8192;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlDecode(s) {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacSign(secret, message) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return crypto.subtle.sign("HMAC", key, enc.encode(message));
}

export async function signAdminJwt(secret, email, ttlSec = 3600) {
  const header = b64url(new TextEncoder().encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(
    new TextEncoder().encode(
      JSON.stringify({
        sub: email,
        typ: "admin_session",
        iat: now,
        exp: now + ttlSec,
      })
    )
  );
  const msg = `${header}.${payload}`;
  const sig = await hmacSign(secret, msg);
  return `${msg}.${b64url(sig)}`;
}

export async function verifyAdminJwt(secret, token) {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [h, p, sig] = parts;
  const msg = `${h}.${p}`;
  const expected = await hmacSign(secret, msg);
  const expectedB64 = b64url(expected);
  if (expectedB64.length !== sig.length) return null;
  let ok = true;
  for (let i = 0; i < sig.length; i++) {
    if (sig.charCodeAt(i) !== expectedB64.charCodeAt(i)) ok = false;
  }
  if (!ok) return null;
  let payloadObj;
  try {
    payloadObj = JSON.parse(new TextDecoder().decode(b64urlDecode(p)));
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
    out[k] = decodeURIComponent(v);
  }
  return out;
}
