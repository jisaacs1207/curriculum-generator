import { signAdminJwt } from "../../../lib/jwt-hs256.js";

async function sha256Hex(text) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
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

export async function onRequestGet({ request, env }) {
  if (!env.AUTH_DB || !env.JWT_SECRET) {
    return new Response("Auth not configured", { status: 503 });
  }
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  if (!token) {
    return new Response("Missing token", { status: 400 });
  }
  const tokenHash = await sha256Hex(token);
  const now = Math.floor(Date.now() / 1000);
  const row = await env.AUTH_DB.prepare(
    "SELECT email, expires_at, used_at FROM magic_tokens WHERE token_hash = ?"
  )
    .bind(tokenHash)
    .first();
  if (!row || row.used_at != null || row.expires_at < now) {
    return new Response("Invalid or expired link", { status: 400 });
  }
  await env.AUTH_DB.prepare("UPDATE magic_tokens SET used_at = ? WHERE token_hash = ?")
    .bind(now, tokenHash)
    .run();
  const jwt = await signAdminJwt(env.JWT_SECRET, row.email, 3600);
  const origin = appOrigin(request, env);
  const redirect = `${origin}/?settings=1&signedIn=1`;
  const cookie = `admin_session=${encodeURIComponent(jwt)}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=3600`;
  return new Response(null, {
    status: 302,
    headers: {
      Location: redirect,
      "Set-Cookie": cookie,
    },
  });
}
