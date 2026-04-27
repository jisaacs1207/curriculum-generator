/** Shared KV page-settings document shape (matches Node proxy JSON). */

export function normalize(doc) {
  const base = {
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
  if (!doc || typeof doc !== "object") return base;
  return {
    ...base,
    ...doc,
    colors: { ...base.colors, ...(doc.colors || {}) },
    openRouterApiKey:
      typeof doc.openRouterApiKey === "string" ? doc.openRouterApiKey : base.openRouterApiKey,
  };
}

export function mergePatch(existing, patch) {
  const cur = normalize(existing);
  if (!patch || typeof patch !== "object") return cur;
  const next = { ...cur, colors: { ...cur.colors, ...(patch.colors || {}) } };
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

export function toPublic(full) {
  const key = (full.openRouterApiKey || "").trim();
  const { openRouterApiKey: _a, ...rest } = full;
  return {
    ...rest,
    hasOpenRouterKey: key.length > 0,
    openRouterKeyLast4: key.length >= 4 ? key.slice(-4) : "",
  };
}
