/** localStorage key for persisted school + theme settings */
export const SETTINGS_STORAGE_KEY = "curriculum-generator-school-settings-v1";

/** Curated palettes: Apple-like, warm orange, neutral graphite */
export const COLOR_PRESETS = {
  apple: {
    label: "Apple-style (blue accent)",
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
  warm: {
    label: "Warm (orange accent)",
    accent: "#e8671a",
    accentDark: "#c4540f",
    accentSoft: "#fff4ee",
    ink: "#1d1d1f",
    inkMuted: "#6e6e73",
    surface: "#ffffff",
    pageBg: "#f9f7f4",
    border: "#e4e4e4",
    headerBar: "#111111",
    tableStripe: "#f9f7f4",
    errorBg: "#fef2f2",
    errorBorder: "#fecaca",
    errorText: "#b91c1c",
  },
  graphite: {
    label: "Graphite",
    accent: "#424245",
    accentDark: "#1d1d1f",
    accentSoft: "#f5f5f7",
    ink: "#1d1d1f",
    inkMuted: "#6e6e73",
    surface: "#ffffff",
    pageBg: "#f5f5f7",
    border: "#d2d2d7",
    headerBar: "#2d2d2d",
    tableStripe: "#fafafa",
    errorBg: "#fef2f2",
    errorBorder: "#fecaca",
    errorText: "#b91c1c",
  },
};

export function defaultSettings() {
  return {
    schoolName: "Your School",
    /** Full program office name used in documents and AI prompts */
    organizationDisplayName: "Your School Global Programs",
    marketingTagline:
      "Coherent course maps and syllabi for grades 6–12, grounded in named texts and aligned to proficiency.",
    websiteLabel: "yourschool.org",
    /** Optional extra footer line (e.g. partnership); leave empty to omit */
    footerExtraLine: "",
    /** Public URL to horizontal logo; empty = text mark only in app header */
    heroLogoUrl: "",
    /** Logo for PDF/print header; falls back to hero then absolute /branding-placeholder.svg */
    docLogoUrl: "",
    openRouterAppTitle: "Curriculum Generator",
    colorPresetId: "apple",
    /** When true, colors mirror `colors` object; when false, use colorPresetId palette */
    useCustomColors: false,
    colors: { ...COLOR_PRESETS.apple },
  };
}

export function resolvePalette(settings) {
  if (settings.useCustomColors && settings.colors) return { ...COLOR_PRESETS.apple, ...settings.colors };
  const preset = COLOR_PRESETS[settings.colorPresetId] || COLOR_PRESETS.apple;
  return { ...preset };
}
