import { COLOR_PRESETS } from "./defaults.js";

/**
 * Full document stored server-side (includes secret).
 * @typedef {Object} PageSettingsFull
 * @property {string} [openRouterApiKey]
 * @property {string} schoolName
 * @property {string} organizationDisplayName
 * @property {string} marketingTagline
 * @property {string} websiteLabel
 * @property {string} footerExtraLine
 * @property {string} heroLogoUrl
 * @property {string} docLogoUrl
 * @property {string} openRouterAppTitle
 * @property {string} [openRouterModel]
 * @property {string} colorPresetId
 * @property {boolean} useCustomColors
 * @property {Record<string, string>} colors
 */

/**
 * Public page settings (safe for GET; never includes raw API key).
 * @typedef {Object} PageSettingsPublic
 * @property {boolean} hasOpenRouterKey
 * @property {string} [openRouterKeyLast4]
 * @property {string} schoolName
 * @property {string} organizationDisplayName
 * @property {string} marketingTagline
 * @property {string} websiteLabel
 * @property {string} footerExtraLine
 * @property {string} heroLogoUrl
 * @property {string} docLogoUrl
 * @property {string} openRouterAppTitle
 * @property {string} [openRouterModel]
 * @property {string} colorPresetId
 * @property {boolean} useCustomColors
 * @property {Record<string, string>} colors
 */

export function emptyPageSettingsFull() {
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
    colors: { ...COLOR_PRESETS.apple },
  };
}

/**
 * @param {Partial<PageSettingsFull>} raw
 * @returns {PageSettingsFull}
 */
export function normalizePageSettingsFull(raw) {
  const base = emptyPageSettingsFull();
  if (!raw || typeof raw !== "object") return base;
  const merged = { ...base, ...raw, colors: { ...base.colors, ...(raw.colors || {}) } };
  if (typeof merged.openRouterApiKey !== "string") merged.openRouterApiKey = "";
  return merged;
}

/**
 * @param {PageSettingsFull} full
 * @returns {PageSettingsPublic}
 */
export function toPageSettingsPublic(full) {
  const key = full.openRouterApiKey?.trim() || "";
  const {
    openRouterApiKey: _omit,
    ...rest
  } = full;
  return {
    ...rest,
    hasOpenRouterKey: key.length > 0,
    openRouterKeyLast4: key.length >= 4 ? key.slice(-4) : "",
  };
}
