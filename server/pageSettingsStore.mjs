import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const DATA_DIR = join(root, "data");
export const PAGE_SETTINGS_PATH = join(DATA_DIR, "page-settings.json");
const UPLOADS_DIR = join(root, "public", "uploads");

function emptyDoc() {
  return {
    openRouterApiKey: "",
    schoolName: "Your School",
    organizationDisplayName: "Your School Global Programs",
    marketingTagline:
      "Course maps and syllabi for grades 6–12, aligned to proficiency and program learning outcomes.",
    websiteLabel: "yourschool.org",
    footerExtraLine: "",
    heroLogoUrl: "",
    docLogoUrl: "",
    openRouterAppTitle: "Curriculum Generator",
    openRouterModel: "",
    colorPresetId: "apple",
    useCustomColors: false,
    colors: {
      accent: "#0071e3",
      accentDark: "#0077ed",
      accentSoft: "#e8f2ff",
      ink: "#1d1d1f",
      inkMuted: "#6e6e73",
      surface: "#ffffff",
      pageBg: "#f5f5f7",
      border: "#d2d2d7",
      headerBar: "#1d1d1f",
      tableStripe: "#fafafa",
      errorBg: "#fef2f2",
      errorBorder: "#fecaca",
      errorText: "#b91c1c",
    },
  };
}

function normalize(doc) {
  const base = emptyDoc();
  if (!doc || typeof doc !== "object") return base;
  return {
    ...base,
    ...doc,
    colors: { ...base.colors, ...(doc.colors || {}) },
    openRouterApiKey:
      typeof doc.openRouterApiKey === "string" ? doc.openRouterApiKey : base.openRouterApiKey,
  };
}

export function readPageSettingsFull() {
  try {
    if (!existsSync(PAGE_SETTINGS_PATH)) return emptyDoc();
    const raw = JSON.parse(readFileSync(PAGE_SETTINGS_PATH, "utf8"));
    return normalize(raw);
  } catch {
    return emptyDoc();
  }
}

export function writePageSettingsFull(doc) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(PAGE_SETTINGS_PATH, JSON.stringify(normalize(doc), null, 2), "utf8");
}

export function toPublic(full) {
  const key = (full.openRouterApiKey || "").trim();
  const { openRouterApiKey: _a, ...rest } = full;
  return {
    ...rest,
    hasOpenRouterKey: key.length > 0,
    openRouterKeyLast4: key.length >= 4 ? key.slice(-4) : "",
  };
}

export function mergePatch(existing, patch) {
  const cur = normalize(existing);
  if (!patch || typeof patch !== "object") return cur;
  const next = {
    ...cur,
    colors: { ...cur.colors, ...(patch.colors || {}) },
  };
  const skip = new Set(["colors", "openRouterApiKey"]);
  for (const k of Object.keys(patch)) {
    if (skip.has(k)) continue;
    if (patch[k] !== undefined) next[k] = patch[k];
  }
  if (Object.prototype.hasOwnProperty.call(patch, "openRouterApiKey")) {
    const v = patch.openRouterApiKey;
    if (v === "" || v === null) next.openRouterApiKey = "";
    else if (typeof v === "string" && v.trim()) next.openRouterApiKey = v.trim();
    else next.openRouterApiKey = cur.openRouterApiKey;
  }
  return normalize(next);
}

/** @param {Buffer} buf @param {string} ext */
export function saveUpload(buf, ext) {
  mkdirSync(UPLOADS_DIR, { recursive: true });
  const safe = String(ext || "png").replace(/[^a-z0-9]/gi, "").slice(0, 6) || "png";
  const name = `logo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safe}`;
  const abs = join(UPLOADS_DIR, name);
  writeFileSync(abs, buf);
  return `/uploads/${name}`;
}
