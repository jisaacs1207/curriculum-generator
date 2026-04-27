/**
 * Optional default logo paths under public/images/ (override via Settings → logo URLs).
 */
export const LOGO_HERO = "/images/wasatch-logo.png";
export const LOGO_HEADER = "/images/logo-stacked.png";
export const LOGO_DOC = "/images/logo-stacked.png";
export const LOGO_SHIELD_PATH = "/logo-shield.webp";

export function getLogoUrl() {
  if (typeof window === "undefined") return LOGO_HEADER;
  return window.location.origin + LOGO_HEADER;
}

export function getLogoShieldUrl() {
  if (typeof window === "undefined") return LOGO_SHIELD_PATH;
  return window.location.origin + LOGO_SHIELD_PATH;
}

/** For backward compatibility */
export const LOGO_PATH = LOGO_HEADER;

/**
 * Server PDF POST endpoint (e.g. local Node proxy + Puppeteer).
 * Set VITE_PDF_ENDPOINT explicitly for a custom PDF service.
 * Otherwise /pdf is only inferred for the local proxy (localhost / 127.0.0.1 + /api), not Cloudflare.
 */
export function getPdfUrl() {
  const explicit =
    typeof import.meta !== "undefined" && import.meta.env?.VITE_PDF_ENDPOINT;
  if (explicit) return String(explicit).trim() || null;
  const proxy =
    typeof import.meta !== "undefined" &&
    (import.meta.env?.VITE_OPENROUTER_PROXY || import.meta.env?.VITE_ANTHROPIC_PROXY);
  if (!proxy) return null;
  if (proxy.startsWith("/")) return null;
  try {
    const { hostname } = new URL(proxy);
    if (hostname !== "localhost" && hostname !== "127.0.0.1") return null;
  } catch {
    return null;
  }
  return proxy.replace(/\/api\/?$/i, "") + "/pdf";
}
