/** localStorage key for teacher / generation preferences only */
export const GENERATION_STORAGE_KEY = "curriculum-generator-generation-v1";

/**
 * @typedef {'6-8' | '9-10' | '11-12' | '6-12'} ProgramGradeBand
 * @typedef {'formative-heavy' | 'balanced' | 'summative-visible'} AssessmentBalance
 */

export function defaultGenerationSettings() {
  return {
    /** Default document mode when opening generator */
    defaultMode: "map",
    defaultSlots: 3,
    defaultDepth: ["units", "weekly"],
    defaultEnglishLevel: "",
    programGradeBand: "6-12",
    prioritizeUDL: false,
    assessmentBalance: "balanced",
    /** Optional comma-separated default emphasis chips */
    defaultEmphasisCsv: "",
  };
}

/**
 * @param {unknown} raw
 */
export function normalizeGenerationSettings(raw) {
  const d = defaultGenerationSettings();
  if (!raw || typeof raw !== "object") return d;
  const o = /** @type {Record<string, unknown>} */ (raw);
  return {
    defaultMode: ["map", "syllabus", "both"].includes(o.defaultMode) ? o.defaultMode : d.defaultMode,
    defaultSlots: Math.min(6, Math.max(1, parseInt(String(o.defaultSlots), 10) || d.defaultSlots)),
    defaultDepth: Array.isArray(o.defaultDepth)
      ? o.defaultDepth.filter((x) => typeof x === "string")
      : d.defaultDepth,
    defaultEnglishLevel: typeof o.defaultEnglishLevel === "string" ? o.defaultEnglishLevel : "",
    programGradeBand: ["6-8", "9-10", "11-12", "6-12"].includes(o.programGradeBand)
      ? o.programGradeBand
      : d.programGradeBand,
    prioritizeUDL: Boolean(o.prioritizeUDL),
    assessmentBalance: ["formative-heavy", "balanced", "summative-visible"].includes(
      o.assessmentBalance
    )
      ? o.assessmentBalance
      : d.assessmentBalance,
    defaultEmphasisCsv: typeof o.defaultEmphasisCsv === "string" ? o.defaultEmphasisCsv : "",
  };
}
