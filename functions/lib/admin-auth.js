import { parseCookies, verifyAdminJwt } from "./jwt-hs256.js";

export async function getAdminFromRequest(request, env) {
  const secret = env.JWT_SECRET;
  if (!secret || typeof secret !== "string") return null;
  const cookies = parseCookies(request.headers.get("Cookie") || "");
  const tok = cookies.admin_session;
  if (!tok) return null;
  return await verifyAdminJwt(secret, tok);
}

export function bearerMatchesFixedToken(request, env) {
  const t = (request.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "").trim();
  return !!(env.PAGE_SETTINGS_ADMIN_TOKEN && t === env.PAGE_SETTINGS_ADMIN_TOKEN);
}

/** @returns {Promise<{ type: 'bearer' } | { type: 'cookie', email: string } | null>} */
export async function authorizeAdminWrite(request, env) {
  if (bearerMatchesFixedToken(request, env)) return { type: "bearer" };
  const admin = await getAdminFromRequest(request, env);
  if (admin?.email) return { type: "cookie", email: admin.email };
  return null;
}
