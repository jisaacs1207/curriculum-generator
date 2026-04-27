/**
 * Legacy static palette — the app theme is driven by Settings (CSS variables).
 * Orange #E8671A and black #111111 are primary; contrast meets WCAG AA.
 */
export const C = {
  orange: "#E8671A",
  orangeDk: "#C4540F",
  orangeLt: "#FFF4EE",
  black: "#111111",
  nearBlack: "#1A1A1A",
  charcoal: "#2D2D2D",
  darkGray: "#4A4A4A",
  midGray: "#7A7A7A",
  ltGray: "#E4E4E4",
  offWhite: "#F9F7F4",
  white: "#FFFFFF",
  errorBg: "#FEF2F2",
  errorBorder: "#FECACA",
  errorText: "#B91C1C",
};

export const S = {
  s4: 4,
  s6: 6,
  s8: 8,
  s10: 10,
  s12: 12,
  s14: 14,
  s16: 16,
  s18: 18,
  s20: 20,
  s24: 24,
  s28: 28,
  s32: 32,
  s40: 40,
  s48: 48,
};

/** Type scale (px) for consistent hierarchy */
export const T = {
  xs: 12,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 22,
  "2xl": 28,
};

/** Border radius */
export const R = { sm: 6, md: 8, lg: 10, xl: 12, full: 9999 };

/** Shadows */
export const SHADOW = {
  card: "0 1px 3px rgba(17,17,17,0.06)",
  cardHover: "0 4px 12px rgba(17,17,17,0.08)",
  header: "0 2px 8px rgba(0,0,0,0.08)",
};

export const SEL = {
  width: "100%",
  padding: "10px 12px",
  border: `1.5px solid ${C.ltGray}`,
  borderRadius: 8,
  fontSize: 15,
  color: C.charcoal,
  background: C.white,
  cursor: "pointer",
  minHeight: 44,
};
