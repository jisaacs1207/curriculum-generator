import { useState, useEffect, useCallback } from "react";
import { COLOR_PRESETS, defaultSettings } from "../settings/defaults";
import { defaultGenerationSettings } from "../settings/generationDefaults";
import { useSettings } from "../context/SettingsContext";
import {
  savePageSettings,
  uploadPageLogo,
  fetchAuthSession,
  requestMagicLink,
} from "../api/pageSettings";

const ADMIN_TOKEN_SESSION = "curriculum-page-settings-admin-token";
const ADMIN_TOKEN_PERSIST = "curriculum-page-settings-admin-token-persist";

const LOGO_PRESETS = [
  { id: "none", label: "Text mark only", hero: "", doc: "" },
  { id: "ph", label: "Placeholder", hero: "/branding-placeholder.svg", doc: "/branding-placeholder.svg" },
  { id: "book", label: "Book mark", hero: "/preset-mark-book.svg", doc: "/preset-mark-book.svg" },
  { id: "star", label: "Star mark", hero: "/preset-mark-star.svg", doc: "/preset-mark-star.svg" },
];

function loadAdminToken() {
  try {
    return (
      sessionStorage.getItem(ADMIN_TOKEN_SESSION) ||
      localStorage.getItem(ADMIN_TOKEN_PERSIST) ||
      ""
    );
  } catch {
    return "";
  }
}

function storeAdminToken(token, remember) {
  try {
    sessionStorage.removeItem(ADMIN_TOKEN_SESSION);
    localStorage.removeItem(ADMIN_TOKEN_PERSIST);
    if (!token) return;
    if (remember) localStorage.setItem(ADMIN_TOKEN_PERSIST, token);
    else sessionStorage.setItem(ADMIN_TOKEN_SESSION, token);
  } catch {
    /* ignore */
  }
}

export function SettingsPage({ onDone }) {
  const {
    settings,
    palette,
    generationSettings,
    updateGenerationSettings,
    resetGenerationSettings,
    pageSettingsPublic,
    pageSettingsLoadState,
    pageSettingsError,
    refetchPageSettings,
    setPageSettingsPublicLocal,
  } = useSettings();

  const [tab, setTab] = useState("site");
  const [toast, setToast] = useState(null);
  const [saving, setSaving] = useState(false);

  const [draft, setDraft] = useState(() => ({ ...defaultSettings(), ...settings }));
  const [genDraft, setGenDraft] = useState(() => ({ ...defaultGenerationSettings(), ...generationSettings }));

  const [adminToken, setAdminToken] = useState(loadAdminToken);
  const [rememberAdminToken, setRememberAdminToken] = useState(() => !!localStorage.getItem(ADMIN_TOKEN_PERSIST));

  const [magicEmail, setMagicEmail] = useState("");
  const [magicSending, setMagicSending] = useState(false);
  const [sessionSignedIn, setSessionSignedIn] = useState(false);
  const [sessionEmail, setSessionEmail] = useState("");

  const [newApiKey, setNewApiKey] = useState("");
  const [clearKeyRequested, setClearKeyRequested] = useState(false);

  useEffect(() => {
    setDraft((d) => ({ ...defaultSettings(), ...settings, ...d, ...settings }));
  }, [settings]);

  useEffect(() => {
    setGenDraft({ ...defaultGenerationSettings(), ...generationSettings });
  }, [generationSettings]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const s = await fetchAuthSession();
      if (cancelled) return;
      setSessionSignedIn(!!s.signedIn);
      setSessionEmail(s.email || "");
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const canWriteServer = sessionSignedIn || !!adminToken.trim();

  const set = (k, v) => setDraft((d) => ({ ...d, [k]: v }));
  const setGen = (k, v) => setGenDraft((d) => ({ ...d, [k]: v }));

  const showToast = useCallback((msg, kind = "ok") => {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 4200);
  }, []);

  const applyPreset = (id) => {
    const p = COLOR_PRESETS[id];
    if (!p) return;
    setDraft((d) => ({
      ...d,
      colorPresetId: id,
      useCustomColors: false,
      colors: { ...p },
    }));
  };

  const applyLogoPreset = (presetId) => {
    const p = LOGO_PRESETS.find((x) => x.id === presetId);
    if (!p) return;
    set("heroLogoUrl", p.hero);
    set("docLogoUrl", p.doc);
  };

  const readFileAsDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result || ""));
      r.onerror = reject;
      r.readAsDataURL(file);
    });

  const onPickLogo = async (e, field) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!canWriteServer) {
      showToast("Sign in with email link or enter a break-glass admin token to upload a logo.", "err");
      return;
    }
    if (file.size > 700_000) {
      showToast("Image too large (max about 650KB).", "err");
      return;
    }
    try {
      setSaving(true);
      const dataUrl = await readFileAsDataUrl(file);
      const { config } = await uploadPageLogo(dataUrl, field, adminToken.trim() || undefined);
      if (adminToken.trim()) storeAdminToken(adminToken.trim(), rememberAdminToken);
      setPageSettingsPublicLocal(config);
      setDraft((d) => ({
        ...d,
        heroLogoUrl: config.heroLogoUrl || d.heroLogoUrl,
        docLogoUrl: config.docLogoUrl || d.docLogoUrl,
      }));
      showToast("Logo uploaded.");
    } catch (err) {
      showToast(err.message || "Upload failed", "err");
    } finally {
      setSaving(false);
    }
  };

  const saveSite = async () => {
    if (!canWriteServer) {
      showToast("Sign in with email link or enter a break-glass admin token to save school & site settings.", "err");
      return;
    }
    setSaving(true);
    try {
      const patch = {
        schoolName: draft.schoolName,
        organizationDisplayName: draft.organizationDisplayName,
        marketingTagline: draft.marketingTagline,
        websiteLabel: draft.websiteLabel,
        footerExtraLine: draft.footerExtraLine,
        heroLogoUrl: draft.heroLogoUrl,
        docLogoUrl: draft.docLogoUrl,
        openRouterAppTitle: draft.openRouterAppTitle,
        openRouterModel: draft.openRouterModel || "",
        colorPresetId: draft.colorPresetId,
        useCustomColors: draft.useCustomColors,
        colors: draft.colors,
      };
      if (clearKeyRequested) patch.openRouterApiKey = "";
      else if (newApiKey.trim()) patch.openRouterApiKey = newApiKey.trim();

      const config = await savePageSettings(patch, adminToken.trim() || undefined);
      if (adminToken.trim()) storeAdminToken(adminToken.trim(), rememberAdminToken);
      const s = await fetchAuthSession();
      setSessionSignedIn(!!s.signedIn);
      setSessionEmail(s.email || "");
      setNewApiKey("");
      setClearKeyRequested(false);
      setPageSettingsPublicLocal(config);
      await refetchPageSettings();
      showToast("School & site settings saved on server.");
    } catch (e) {
      showToast(e.message || "Save failed", "err");
    } finally {
      setSaving(false);
    }
  };

  const saveGeneration = () => {
    updateGenerationSettings(genDraft);
    showToast("Curriculum defaults saved on this device.");
  };

  return (
    <div className="settings-shell">
      <header className="settings-shell-top">
        <button type="button" className="settings-back focus-ring" onClick={onDone}>
          ← Generator
        </button>
        <div className="settings-shell-heading">
          <h1 className="settings-shell-title">Settings</h1>
          <p className="settings-shell-sub">
            School &amp; site (server) · Curriculum defaults (this browser)
          </p>
        </div>
        <span className="settings-spacer" aria-hidden />
      </header>

      {toast && (
        <div className={`settings-toast settings-toast--${toast.kind}`} role="status">
          {toast.msg}
        </div>
      )}

      <div className="settings-tabs" role="tablist" aria-label="Settings sections">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "site"}
          className={`settings-tab focus-ring${tab === "site" ? " is-active" : ""}`}
          onClick={() => setTab("site")}
        >
          School &amp; site
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "curriculum"}
          className={`settings-tab focus-ring${tab === "curriculum" ? " is-active" : ""}`}
          onClick={() => setTab("curriculum")}
        >
          Curriculum defaults
        </button>
      </div>

      <div className="settings-scroll">
        {tab === "site" && (
          <>
            <section className="settings-card">
              <h2 className="settings-card-title">Connection</h2>
              <p className="settings-card-lead">
                Page settings load from <code className="settings-code">GET /api/page-settings-public</code> (same host as
                your OpenRouter proxy, or Cloudflare Pages). To save, sign in with a one-time email link (production), or use
                an optional break-glass bearer token if the server exposes{" "}
                <code className="settings-code">PAGE_SETTINGS_ADMIN_TOKEN</code>.
              </p>
              {pageSettingsLoadState === "loading" && (
                <p className="settings-muted">Loading server settings…</p>
              )}
              {pageSettingsError && (
                <p className="settings-error-inline" role="alert">
                  {pageSettingsError} — using local fallbacks until the server responds.
                </p>
              )}
              {pageSettingsPublic?.hasOpenRouterKey && (
                <p className="settings-muted">
                  OpenRouter key on server: configured
                  {pageSettingsPublic.openRouterKeyLast4
                    ? ` (ends …${pageSettingsPublic.openRouterKeyLast4})`
                    : ""}
                </p>
              )}
            </section>

            <section className="settings-card">
              <h2 className="settings-card-title">Admin sign-in</h2>
              {sessionSignedIn ? (
                <p className="settings-muted">
                  Signed in{sessionEmail ? ` as ${sessionEmail}` : ""}. Session expires after about an hour.
                </p>
              ) : (
                <>
                  <p className="settings-card-lead">
                    Enter the email on the server allowlist; you will receive a one-time link (about 15 minutes) that sets an
                    HttpOnly session cookie.
                  </p>
                  <label className="settings-label" htmlFor="magic-em">
                    Admin email
                  </label>
                  <input
                    id="magic-em"
                    type="email"
                    autoComplete="username"
                    className="settings-field focus-ring"
                    value={magicEmail}
                    onChange={(e) => setMagicEmail(e.target.value)}
                    placeholder="you@school.org"
                  />
                  <div className="settings-upload-row settings-check-mt">
                    <button
                      type="button"
                      className="settings-btn-primary focus-ring"
                      disabled={magicSending || !magicEmail.trim()}
                      onClick={async () => {
                        setMagicSending(true);
                        try {
                          await requestMagicLink(magicEmail.trim());
                          showToast("If the address is allowed, check your email for the link.");
                        } catch (e) {
                          showToast(e.message || "Could not send link", "err");
                        } finally {
                          setMagicSending(false);
                        }
                      }}
                    >
                      {magicSending ? "Sending…" : "Email me a sign-in link"}
                    </button>
                  </div>
                </>
              )}
            </section>

            <section className="settings-card">
              <h2 className="settings-card-title">Break-glass admin token (optional)</h2>
              <p className="settings-card-lead">
                If the server sets <code className="settings-code">PAGE_SETTINGS_ADMIN_TOKEN</code>, you can paste it here
                instead of the email link flow.
              </p>
              <label className="settings-label" htmlFor="adm">
                Bearer token for save / upload
              </label>
              <input
                id="adm"
                type="password"
                autoComplete="off"
                className="settings-field focus-ring"
                value={adminToken}
                onChange={(e) => setAdminToken(e.target.value)}
                placeholder="Optional — from server env"
              />
              <label className="settings-check settings-check-mt">
                <input
                  type="checkbox"
                  checked={rememberAdminToken}
                  onChange={(e) => setRememberAdminToken(e.target.checked)}
                />
                Remember token on this device
              </label>
            </section>

            <section className="settings-card">
              <h2 className="settings-card-title">OpenRouter</h2>
              <label className="settings-label" htmlFor="ork">
                New API key (optional — replaces server key when you save)
              </label>
              <input
                id="ork"
                type="password"
                autoComplete="off"
                className="settings-field focus-ring"
                value={newApiKey}
                onChange={(e) => setNewApiKey(e.target.value)}
                placeholder="sk-or-v1-…"
              />
              <label className="settings-check settings-check-mt">
                <input
                  type="checkbox"
                  checked={clearKeyRequested}
                  onChange={(e) => setClearKeyRequested(e.target.checked)}
                />
                Clear stored API key on save
              </label>
              <label className="settings-label settings-label-mt" htmlFor="orm">
                Model override (optional)
              </label>
              <input
                id="orm"
                className="settings-field focus-ring"
                value={draft.openRouterModel || ""}
                onChange={(e) => set("openRouterModel", e.target.value)}
                placeholder="e.g. anthropic/claude-sonnet-4.6"
              />
            </section>

            <section className="settings-card">
              <h2 className="settings-card-title">Identity</h2>
              <label className="settings-label" htmlFor="sn">
                School short name
              </label>
              <input
                id="sn"
                className="settings-field focus-ring"
                value={draft.schoolName}
                onChange={(e) => set("schoolName", e.target.value)}
                autoComplete="organization"
              />
              <label className="settings-label" htmlFor="org">
                Full organization name (programs office)
              </label>
              <input
                id="org"
                className="settings-field focus-ring"
                value={draft.organizationDisplayName}
                onChange={(e) => set("organizationDisplayName", e.target.value)}
              />
              <label className="settings-label" htmlFor="tag">
                Tagline
              </label>
              <input
                id="tag"
                className="settings-field focus-ring"
                value={draft.marketingTagline}
                onChange={(e) => set("marketingTagline", e.target.value)}
              />
              <label className="settings-label" htmlFor="web">
                Website label (footer)
              </label>
              <input
                id="web"
                className="settings-field focus-ring"
                value={draft.websiteLabel}
                onChange={(e) => set("websiteLabel", e.target.value)}
              />
              <label className="settings-label" htmlFor="ft">
                Optional footer note
              </label>
              <textarea
                id="ft"
                className="settings-field settings-textarea focus-ring"
                rows={2}
                value={draft.footerExtraLine}
                onChange={(e) => set("footerExtraLine", e.target.value)}
              />
              <label className="settings-label" htmlFor="ort">
                OpenRouter app title (attribution header)
              </label>
              <input
                id="ort"
                className="settings-field focus-ring"
                value={draft.openRouterAppTitle}
                onChange={(e) => set("openRouterAppTitle", e.target.value)}
              />
            </section>

            <section className="settings-card">
              <h2 className="settings-card-title">Logos</h2>
              <p className="settings-card-lead">
                Choose a preset, paste a public URL, or upload. With the local Node proxy, files go under{" "}
                <code className="settings-code">public/uploads</code>. On Cloudflare Pages, uploads are stored in KV as data
                URLs (keep images reasonably small).
              </p>
              <p className="settings-muted">Presets</p>
              <div className="settings-logo-presets">
                {LOGO_PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="settings-logo-preset focus-ring"
                    onClick={() => applyLogoPreset(p.id)}
                  >
                    {p.hero ? (
                      <img src={p.hero} alt="" className="settings-logo-preset-img" />
                    ) : (
                      <span className="settings-logo-preset-placeholder">Aa</span>
                    )}
                    <span>{p.label}</span>
                  </button>
                ))}
              </div>
              <label className="settings-label" htmlFor="hero">
                Hero logo URL
              </label>
              <input
                id="hero"
                className="settings-field focus-ring"
                value={draft.heroLogoUrl}
                onChange={(e) => set("heroLogoUrl", e.target.value)}
              />
              <div className="settings-upload-row">
                <label className="settings-btn-upload focus-ring">
                  Upload hero logo
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden onChange={(e) => onPickLogo(e, "heroLogoUrl")} />
                </label>
              </div>
              <label className="settings-label" htmlFor="doc">
                Document logo URL
              </label>
              <input
                id="doc"
                className="settings-field focus-ring"
                value={draft.docLogoUrl}
                onChange={(e) => set("docLogoUrl", e.target.value)}
              />
              <div className="settings-upload-row">
                <label className="settings-btn-upload focus-ring">
                  Upload document logo
                  <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden onChange={(e) => onPickLogo(e, "docLogoUrl")} />
                </label>
              </div>
            </section>

            <section className="settings-card">
              <h2 className="settings-card-title">Colors</h2>
              <div className="settings-presets">
                {Object.entries(COLOR_PRESETS).map(([id, p]) => (
                  <button
                    key={id}
                    type="button"
                    className={`settings-preset focus-ring${draft.colorPresetId === id && !draft.useCustomColors ? " is-selected" : ""}`}
                    onClick={() => applyPreset(id)}
                  >
                    <span className="settings-preset-swatch" style={{ background: p.accent }} />
                    {p.label}
                  </button>
                ))}
              </div>
              <label className="settings-check">
                <input
                  type="checkbox"
                  checked={draft.useCustomColors}
                  onChange={(e) => set("useCustomColors", e.target.checked)}
                />
                Edit custom colors
              </label>
              {draft.useCustomColors && (
                <div className="settings-color-grid">
                  {[
                    ["accent", "Accent"],
                    ["accentDark", "Accent (pressed)"],
                    ["accentSoft", "Accent tint"],
                    ["ink", "Primary text"],
                    ["inkMuted", "Secondary text"],
                    ["surface", "Cards"],
                    ["pageBg", "Page background"],
                    ["border", "Borders"],
                    ["headerBar", "Header & tables"],
                    ["tableStripe", "Table stripe"],
                  ].map(([key, label]) => (
                    <label key={key} className="settings-color-row">
                      <span>{label}</span>
                      <input
                        type="color"
                        value={draft.colors?.[key] || palette[key] || "#000000"}
                        onChange={(e) =>
                          setDraft((d) => ({
                            ...d,
                            colors: { ...d.colors, [key]: e.target.value },
                          }))
                        }
                        aria-label={label}
                      />
                    </label>
                  ))}
                </div>
              )}
            </section>

            <div className="settings-actions">
              <button type="button" className="settings-btn-secondary focus-ring" onClick={() => setDraft({ ...defaultSettings(), ...settings })}>
                Reset form from loaded values
              </button>
              <button
                type="button"
                className="settings-btn-primary focus-ring"
                disabled={saving}
                onClick={saveSite}
              >
                {saving ? "Saving…" : "Save school & site to server"}
              </button>
            </div>
          </>
        )}

        {tab === "curriculum" && (
          <>
            <section className="settings-card">
              <h2 className="settings-card-title">Defaults for new runs</h2>
              <p className="settings-card-lead">
                Stored in this browser only. Reload the generator after saving if you want the same tab to pick up
                new defaults immediately.
              </p>
              <label className="settings-label">Default document mode</label>
              <div className="settings-seg">
                {["map", "syllabus", "both"].map((id) => (
                  <button
                    key={id}
                    type="button"
                    className={`settings-seg-btn focus-ring${genDraft.defaultMode === id ? " is-selected" : ""}`}
                    onClick={() => setGen("defaultMode", id)}
                  >
                    {id}
                  </button>
                ))}
              </div>
              <label className="settings-label" htmlFor="slots">
                Default courses per year
              </label>
              <select
                id="slots"
                className="settings-field focus-ring"
                value={genDraft.defaultSlots}
                onChange={(e) => setGen("defaultSlots", parseInt(e.target.value, 10))}
              >
                {[2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
              <label className="settings-label" htmlFor="el">
                Default English proficiency (optional)
              </label>
              <select
                id="el"
                className="settings-field focus-ring"
                value={genDraft.defaultEnglishLevel}
                onChange={(e) => setGen("defaultEnglishLevel", e.target.value)}
              >
                <option value="">(none)</option>
                <option value="A1">A1</option>
                <option value="A2">A2</option>
                <option value="B1">B1</option>
                <option value="B2">B2</option>
                <option value="C1">C1</option>
                <option value="mixed">Mixed</option>
              </select>
              <label className="settings-label">Program grade band (prompts)</label>
              <select
                className="settings-field focus-ring"
                value={genDraft.programGradeBand}
                onChange={(e) => setGen("programGradeBand", e.target.value)}
              >
                <option value="6-12">Grades 6–12 (vertical coherence)</option>
                <option value="6-8">Grades 6–8</option>
                <option value="9-10">Grades 9–10</option>
                <option value="11-12">Grades 11–12</option>
              </select>
              <label className="settings-check">
                <input
                  type="checkbox"
                  checked={genDraft.prioritizeUDL}
                  onChange={(e) => setGen("prioritizeUDL", e.target.checked)}
                />
                Prioritize flexible means of representation, action, and engagement
              </label>
              <label className="settings-label">Assessment balance (prompts)</label>
              <select
                className="settings-field focus-ring"
                value={genDraft.assessmentBalance}
                onChange={(e) => setGen("assessmentBalance", e.target.value)}
              >
                <option value="balanced">Balanced formative and summative</option>
                <option value="formative-heavy">Formative-heavy</option>
                <option value="summative-visible">Summative milestones visible early</option>
              </select>
              <label className="settings-label" htmlFor="defdep">
                Default curriculum depth (toggle ids: units, weekly, daily, rubrics)
              </label>
              <div className="settings-pill-grid">
                {["units", "weekly", "daily", "rubrics"].map((id) => (
                  <label key={id} className="settings-check">
                    <input
                      type="checkbox"
                      checked={genDraft.defaultDepth?.includes(id)}
                      onChange={() => {
                        setGenDraft((d) => {
                          const cur = d.defaultDepth || [];
                          const has = cur.includes(id);
                          const next = has ? cur.filter((x) => x !== id) : [...cur, id];
                          return { ...d, defaultDepth: next.length ? next : ["units"] };
                        });
                      }}
                    />
                    {id}
                  </label>
                ))}
              </div>
              <label className="settings-label" htmlFor="dem">
                Default emphasis chips (comma-separated labels)
              </label>
              <input
                id="dem"
                className="settings-field focus-ring"
                value={genDraft.defaultEmphasisCsv}
                onChange={(e) => setGen("defaultEmphasisCsv", e.target.value)}
                placeholder="e.g. Project-based learning, literacy across subjects"
              />
            </section>
            <div className="settings-actions">
              <button type="button" className="settings-btn-secondary focus-ring" onClick={resetGenerationSettings}>
                Reset curriculum defaults
              </button>
              <button type="button" className="settings-btn-primary focus-ring" onClick={saveGeneration}>
                Save curriculum defaults locally
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
