import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { SETTINGS_STORAGE_KEY, defaultSettings, resolvePalette } from "../settings/defaults";
import {
  GENERATION_STORAGE_KEY,
  defaultGenerationSettings,
  normalizeGenerationSettings,
} from "../settings/generationDefaults";
import { fetchPageSettingsPublic } from "../api/pageSettings";

const SettingsContext = createContext(null);

function loadGeneration() {
  try {
    const raw = localStorage.getItem(GENERATION_STORAGE_KEY);
    if (!raw) return defaultGenerationSettings();
    return normalizeGenerationSettings(JSON.parse(raw));
  } catch {
    return defaultGenerationSettings();
  }
}

/** Legacy v1 blob (branding only); migrated once into client until server provides branding */
function loadLegacyV1Branding() {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const d = defaultSettings();
    const keys = Object.keys(d).filter((k) => k !== "colors");
    const out = {};
    for (const k of keys) {
      if (parsed[k] !== undefined) out[k] = parsed[k];
    }
    if (parsed.colors) out.colors = { ...d.colors, ...parsed.colors };
    return out;
  } catch {
    return null;
  }
}

function stripServerOnlyFields(pub) {
  if (!pub || typeof pub !== "object") return {};
  const { hasOpenRouterKey, openRouterKeyLast4, ...rest } = pub;
  return rest;
}

function applyCssVars(palette) {
  const root = document.documentElement;
  const set = (k, v) => root.style.setProperty(k, v);
  set("--color-accent", palette.accent);
  set("--color-accent-dark", palette.accentDark);
  set("--color-accent-soft", palette.accentSoft);
  set("--color-ink", palette.ink);
  set("--color-ink-muted", palette.inkMuted);
  set("--color-surface", palette.surface);
  set("--color-page-bg", palette.pageBg);
  set("--color-border", palette.border);
  set("--color-header-bar", palette.headerBar);
  set("--color-table-stripe", palette.tableStripe);
  set("--color-error-bg", palette.errorBg);
  set("--color-error-border", palette.errorBorder);
  set("--color-error-text", palette.errorText);
}

export function SettingsProvider({ children }) {
  const [pageSettingsPublic, setPageSettingsPublic] = useState(null);
  const [pageSettingsLoadState, setPageSettingsLoadState] = useState("idle");
  const [pageSettingsError, setPageSettingsError] = useState(null);
  const [generationSettings, setGenerationSettingsState] = useState(loadGeneration);
  const [legacyMigrated, setLegacyMigrated] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    setPageSettingsLoadState("loading");
    fetchPageSettingsPublic(ac.signal)
      .then((r) => {
        if (r.ok) {
          setPageSettingsPublic(r.config);
          setPageSettingsError(null);
        } else {
          setPageSettingsPublic(null);
          setPageSettingsError(r.error || "Failed to load page settings");
        }
        setPageSettingsLoadState("ready");
      })
      .catch(() => {
        setPageSettingsPublic(null);
        setPageSettingsError("Failed to load page settings");
        setPageSettingsLoadState("ready");
      });
    return () => ac.abort();
  }, []);

  const refetchPageSettings = useCallback(async () => {
    setPageSettingsLoadState("loading");
    const r = await fetchPageSettingsPublic();
    if (r.ok) {
      setPageSettingsPublic(r.config);
      setPageSettingsError(null);
    } else {
      setPageSettingsError(r.error || "Failed");
    }
    setPageSettingsLoadState("ready");
  }, []);

  const brandingSettings = useMemo(() => {
    const base = defaultSettings();
    const legacy = !legacyMigrated ? loadLegacyV1Branding() : null;
    const fromServer = stripServerOnlyFields(pageSettingsPublic || {});
    return {
      ...base,
      ...(legacy || {}),
      ...fromServer,
      colors: {
        ...base.colors,
        ...(legacy?.colors || {}),
        ...(fromServer.colors || {}),
      },
    };
  }, [pageSettingsPublic, legacyMigrated]);

  useEffect(() => {
    if (pageSettingsLoadState !== "ready" || legacyMigrated) return;
    if (pageSettingsPublic && loadLegacyV1Branding()) {
      try {
        localStorage.removeItem(SETTINGS_STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
    setLegacyMigrated(true);
  }, [pageSettingsLoadState, pageSettingsPublic, legacyMigrated]);

  useEffect(() => {
    try {
      localStorage.setItem(GENERATION_STORAGE_KEY, JSON.stringify(generationSettings));
    } catch {
      /* ignore */
    }
  }, [generationSettings]);

  const palette = useMemo(() => resolvePalette(brandingSettings), [brandingSettings]);

  useEffect(() => {
    applyCssVars(palette);
  }, [palette]);

  useEffect(() => {
    document.title = `${brandingSettings.schoolName} — Curriculum`;
  }, [brandingSettings.schoolName]);

  const updateGenerationSettings = useCallback((partial) => {
    setGenerationSettingsState((prev) => normalizeGenerationSettings({ ...prev, ...partial }));
  }, []);

  const resetGenerationSettings = useCallback(() => {
    setGenerationSettingsState(defaultGenerationSettings());
    try {
      localStorage.removeItem(GENERATION_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const setPageSettingsPublicLocal = useCallback((config) => {
    setPageSettingsPublic(config);
  }, []);

  const value = useMemo(
    () => ({
      settings: brandingSettings,
      palette,
      generationSettings,
      updateGenerationSettings,
      resetGenerationSettings,
      pageSettingsPublic,
      pageSettingsLoadState,
      pageSettingsError,
      refetchPageSettings,
      setPageSettingsPublicLocal,
    }),
    [
      brandingSettings,
      palette,
      generationSettings,
      updateGenerationSettings,
      resetGenerationSettings,
      pageSettingsPublic,
      pageSettingsLoadState,
      pageSettingsError,
      refetchPageSettings,
      setPageSettingsPublicLocal,
    ]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
