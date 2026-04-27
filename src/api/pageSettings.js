/**
 * Base URL for page settings API (Node proxy or same-origin on Pages).
 * With Vite dev + relative proxy, use same origin so /api is proxied.
 */
export function getPageSettingsBaseUrl() {
  const explicit =
    typeof import.meta !== "undefined" && import.meta.env?.VITE_PAGE_SETTINGS_BASE_URL?.trim();
  if (explicit) return String(explicit).replace(/\/$/, "");
  const proxy =
    typeof import.meta !== "undefined" &&
    (import.meta.env?.VITE_OPENROUTER_PROXY || import.meta.env?.VITE_ANTHROPIC_PROXY);
  if (!proxy) {
    if (typeof window !== "undefined") return window.location.origin;
    return "";
  }
  if (proxy.startsWith("/")) {
    if (typeof window !== "undefined") return window.location.origin;
    return "";
  }
  try {
    const u = new URL(proxy);
    return u.origin;
  } catch {
    return typeof window !== "undefined" ? window.location.origin : "";
  }
}

export function pageSettingsPublicUrl() {
  const base = getPageSettingsBaseUrl();
  const path = "/api/page-settings-public";
  return base ? `${base}${path}` : path;
}

export function pageSettingsPutUrl() {
  const base = getPageSettingsBaseUrl();
  const path = "/api/page-settings";
  return base ? `${base}${path}` : path;
}

export function pageSettingsLogoUrl() {
  const base = getPageSettingsBaseUrl();
  const path = "/api/page-settings-logo";
  return base ? `${base}${path}` : path;
}

function authMagicUrl() {
  const base = getPageSettingsBaseUrl();
  const path = "/api/auth/magic-link";
  return base ? `${base}${path}` : path;
}

function authSessionUrl() {
  const base = getPageSettingsBaseUrl();
  const path = "/api/auth/session";
  return base ? `${base}${path}` : path;
}

const credFetch = (url, init = {}) =>
  fetch(url, { ...init, credentials: "include" });

/**
 * @returns {Promise<{ ok: boolean, config: import("../settings/pageSettingsSchema").PageSettingsPublic | null, error?: string }>}
 */
export async function fetchPageSettingsPublic(signal) {
  try {
    const res = await fetch(pageSettingsPublicUrl(), { signal });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, config: null, error: data.error || res.statusText };
    return { ok: true, config: data.config ?? null };
  } catch (e) {
    return { ok: false, config: null, error: e.message || "Network error" };
  }
}

/**
 * @returns {Promise<{ signedIn: boolean, email?: string }>}
 */
export async function fetchAuthSession(signal) {
  try {
    const res = await credFetch(authSessionUrl(), { signal });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { signedIn: false };
    return { signedIn: !!data.signedIn, email: typeof data.email === "string" ? data.email : undefined };
  } catch {
    return { signedIn: false };
  }
}

/**
 * @param {string} email
 */
export async function requestMagicLink(email) {
  const res = await credFetch(authMagicUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText || "Request failed");
  return data;
}

function authHeaders(adminToken) {
  const t = (adminToken || "").trim();
  if (!t) return {};
  return { Authorization: `Bearer ${t}` };
}

/**
 * @param {Record<string, unknown>} patch
 * @param {string} [adminToken] optional break-glass bearer
 */
export async function savePageSettings(patch, adminToken) {
  const res = await credFetch(pageSettingsPutUrl(), {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(adminToken),
    },
    body: JSON.stringify(patch),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText || "Save failed");
  return data.config;
}

/**
 * @param {string} imageBase64 data URL
 * @param {"heroLogoUrl"|"docLogoUrl"} field
 * @param {string} [adminToken] optional break-glass bearer
 */
export async function uploadPageLogo(imageBase64, field, adminToken) {
  const res = await credFetch(pageSettingsLogoUrl(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(adminToken),
    },
    body: JSON.stringify({ imageBase64, field }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText || "Upload failed");
  return data;
}
