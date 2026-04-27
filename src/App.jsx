import { useState, useRef, useMemo, useEffect } from "react";
import {
  MODES,
  ENGLISH_LEVELS,
  EMPHASIS_BY_LEVEL,
  COMMON_EMPHASIS,
  GRADUATE_OUTCOMES,
  getCourse,
} from "./constants";
import {
  Section,
  FL,
  Pill,
  CourseMatrix,
  SyllabusList,
  DocPreview,
  SettingsPage,
} from "./components";
import { useSettings } from "./context/SettingsContext";
import { callOpenRouter, USE_MOCK_CLAUDE, getNeedsApiSetup } from "./api/openrouter";
import { mdToHtml } from "./lib/mdToHtml";
import {
  buildGraduateOutcomesContext,
  buildRules,
  buildGradeBandPedagogy,
  buildInstructionalOptionsBlock,
} from "./lib/prompts";

const depthOpts = [
  { id: "units", label: "Unit Map with Chapter Alignment" },
  { id: "weekly", label: "Week-by-Week Lesson Plan" },
  { id: "daily", label: "Daily Lesson Objectives" },
  { id: "rubrics", label: "Assessment Rubrics" },
];

function resolvePublicUrl(pathOrUrl) {
  if (!pathOrUrl?.trim()) return "";
  const s = pathOrUrl.trim();
  if (s.startsWith("data:") || s.startsWith("http://") || s.startsWith("https://")) return s;
  if (typeof window === "undefined") return s;
  return `${window.location.origin}${s.startsWith("/") ? s : `/${s}`}`;
}

export default function App() {
  const { settings, palette, generationSettings, pageSettingsPublic } = useSettings();
  const [uiView, setUiView] = useState("generator");
  const [partner, setPartner] = useState("");
  const [program, setProgram] = useState("");
  const [mode, setMode] = useState(generationSettings.defaultMode);
  const [slots, setSlots] = useState(generationSettings.defaultSlots);
  const [englishLevel, setEnglishLevel] = useState(generationSettings.defaultEnglishLevel || "");
  const [emphasis, setEmphasis] = useState([]);
  const [customEmphasis, setCustomEmphasis] = useState("");
  const [mapRows, setMapRows] = useState([
    { grade: "Grade 6" },
    { grade: "Grade 7" },
    { grade: "Grade 8" },
    { grade: "Grade 9" },
    { grade: "Grade 10" },
    { grade: "Grade 11" },
    { grade: "Grade 12" },
  ]);
  const [matrix, setMatrix] = useState({});
  const [syllCourses, setSyllCourses] = useState([{ course: "", grade: "" }]);
  const [depth, setDepth] = useState(() => [...generationSettings.defaultDepth]);
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("");
  const [sections, setSections] = useState([]);
  const [error, setError] = useState("");
  const resultRef = useRef();
  const abortRef = useRef(null);
  const emphasisInit = useRef(false);

  useEffect(() => {
    if (emphasisInit.current) return;
    const csv = generationSettings.defaultEmphasisCsv?.trim();
    if (csv) {
      emphasisInit.current = true;
      setEmphasis(csv.split(",").map((s) => s.trim()).filter(Boolean));
    }
  }, [generationSettings.defaultEmphasisCsv]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("settings") !== "1") return;
    setUiView("settings");
    const u = new URL(window.location.href);
    u.searchParams.delete("settings");
    u.searchParams.delete("signedIn");
    const q = u.searchParams.toString();
    window.history.replaceState({}, "", u.pathname + (q ? `?${q}` : "") + u.hash);
  }, []);

  const orgName = settings.organizationDisplayName?.trim() || "Your organization";
  const schoolName = settings.schoolName?.trim() || "Your School";

  const logoUrl = useMemo(() => {
    const h = settings.heroLogoUrl?.trim();
    if (h) return resolvePublicUrl(h);
    return typeof window !== "undefined"
      ? `${window.location.origin}/branding-placeholder.svg`
      : "";
  }, [settings.heroLogoUrl]);

  const docLogoUrl = useMemo(() => {
    const d = settings.docLogoUrl?.trim();
    if (d) return resolvePublicUrl(d);
    return logoUrl;
  }, [settings.docLogoUrl, logoUrl]);

  const toggleE = (v) =>
    setEmphasis((p) => (p.includes(v) ? p.filter((x) => x !== v) : [...p, v]));

  const loadingHint = useMemo(() => {
    if (mode === "both")
      return "Program overview first, then each course in order. Typical full run: about 1–3 minutes.";
    if (mode === "syllabus")
      return "Each course is generated in full. About 1–2 minutes per course is typical.";
    return "Single overview document—usually under a minute.";
  }, [mode]);

  const navSteps = useMemo(
    () => [
      { id: "program-details", label: "Details" },
      { id: "document-type", label: "Type" },
      { id: "english-level", label: "English" },
      ...(mode === "map" || mode === "both" ? [{ id: "course-map", label: "Map" }] : []),
      ...(mode === "syllabus" || mode === "both"
        ? [{ id: "curriculum-selection", label: "Courses" }]
        : []),
      { id: "emphasis", label: "Emphasis" },
    ],
    [mode]
  );
  const suggestedE = englishLevel ? EMPHASIS_BY_LEVEL[englishLevel] || [] : [];
  const allSuggestions = [...new Set([...suggestedE, ...COMMON_EMPHASIS])];
  const emphasisList =
    [...emphasis, ...customEmphasis.split(",").map((s) => s.trim()).filter(Boolean)].join(", ") ||
    "general academic excellence and student growth";
  const elevelObj = ENGLISH_LEVELS.find((e) => e.id === englishLevel);

  const outcomesBlock = useMemo(() => buildGraduateOutcomesContext(orgName), [orgName]);
  const rulesBlock = useMemo(() => buildRules(orgName), [orgName]);
  const gradeBandBlock = useMemo(
    () => buildGradeBandPedagogy(generationSettings.programGradeBand),
    [generationSettings.programGradeBand]
  );
  const instructionalBlock = useMemo(
    () => buildInstructionalOptionsBlock(generationSettings),
    [generationSettings]
  );
  const needsApiSetup = useMemo(
    () => getNeedsApiSetup(pageSettingsPublic),
    [pageSettingsPublic]
  );

  const buildMapDesc = () =>
    mapRows
      .map((r, ri) => {
        const cs = Array.from({ length: slots }, (_, ci) => {
          const t = matrix[`${ri}-${ci}`];
          if (!t) return "(unassigned)";
          const info = getCourse(t);
          return `${info.title} (text: ${info.book} by ${info.authors})`;
        });
        return `${r.grade || `Year ${ri + 1}`}: ${cs.join(" / ")}`;
      })
      .join("\n");

  const sharedCtx = `Partner Institution: ${partner || "partner institution (if applicable)"}
Program Name: ${program || "not specified"}
Student English Proficiency: ${elevelObj ? `${elevelObj.label} (${elevelObj.name}): ${elevelObj.desc}` : "not specified"}
Pedagogical Emphasis: ${emphasisList}
Program grade-band guidance: ${gradeBandBlock}
${instructionalBlock}
${outcomesBlock}
${rulesBlock}`;

  const mdOpts = useMemo(() => ({ strongColor: palette.ink }), [palette.ink]);
  const orOpts = useMemo(
    () => ({
      appTitle: settings.openRouterAppTitle?.trim() || `${schoolName} Curriculum`,
    }),
    [settings.openRouterAppTitle, schoolName]
  );

  const generate = async () => {
    setError("");
    setSections([]);
    if (
      (mode === "map" || mode === "both") &&
      !mapRows.some((_, ri) =>
        Array.from({ length: slots }, (_, ci) => matrix[`${ri}-${ci}`]).some(Boolean)
      )
    ) {
      setError("Please assign at least one course to the course map.");
      return;
    }
    if (
      (mode === "syllabus" || mode === "both") &&
      !syllCourses.some((s) => s.course && s.grade)
    ) {
      setError("Please select a course and grade level for the curriculum.");
      return;
    }
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;
    setLoading(true);
    const newSections = [];
    try {
      if (mode === "map" || mode === "both") {
        setLoadingMsg("Generating course map overview...");
        const text = await callOpenRouter(
          `${sharedCtx}

Write a professional course map overview for ${orgName}.

Program structure:
${buildMapDesc()}

# Academic Structure

Write a table: Category | Representative Courses | Instructor Profile
Three rows: English and Writing (required annually), Humanities and Social Sciences, Advanced and Elective Options.

# Program Rationale

For each year/level, write one substantive paragraph (3-4 sentences) covering: the pedagogical rationale for this course combination, integration of the emphasis areas (${emphasisList}), and the learning outcomes students work toward. Weave program outcome references naturally throughout using the inline format (Principle name — program outcome) described above. Do not label each year with "Year X Rationale:" just use the year/grade as a heading.

# Instructional Philosophy

Two paragraphs on the instructional philosophy of this program, how English proficiency shapes delivery, and how the course arc develops student capacity across years. Use program outcome references naturally where appropriate.`,
          signal,
          { mockKind: "map", ...orOpts }
        );
        newSections.push({ html: mdToHtml(text, mdOpts) });
      }

      if (mode === "syllabus" || mode === "both") {
        const valid = syllCourses.filter((s) => s.course && s.grade);
        for (let i = 0; i < valid.length; i++) {
          const sc = valid[i];
          const info = getCourse(sc.course);
          setLoadingMsg(`Generating curriculum ${i + 1} of ${valid.length}: ${sc.course}...`);
          const text = await callOpenRouter(
            `${sharedCtx}

Write a complete, detailed curriculum document for the following course. Do not truncate any section. Complete every section fully.

Course Title: ${info.title}
Primary Text: ${info.book} by ${info.authors}
Grade / Level: ${sc.grade}
Student English Proficiency: ${elevelObj ? elevelObj.label : "not specified"}

---

# ${info.title}

**Primary Text:** ${info.book}
**Authors:** ${info.authors}
**Grade Level:** ${sc.grade}
**Curriculum Design:** ${orgName}
**English Proficiency Level:** ${elevelObj ? `${elevelObj.label} (${elevelObj.name})` : "not specified"}

## Course Description

Write 4-5 sentences covering the academic scope, its relevance to students at this level, how the emphasis areas (${emphasisList}) shape instruction, and the overall learning arc. Do not add inline outcome tags in this section.

## Learning Outcomes

List 6-8 measurable course-level learning outcomes as bullet points. Do not add inline outcome tags in this section.

## Course Texts and Materials

Describe how **${info.book}** by ${info.authors} is used as the primary text. 2-3 sentences on how it is supplemented given the proficiency level and emphasis.

${depth.includes("units") ? `## Unit Map

Table columns: Unit | Title | Chapters | Weeks | Key Concepts | Learning Focus | Outcome alignment
Cover all major units. For Outcome alignment, write the principle name followed by (Principle name — program outcome).` : ""}

${depth.includes("weekly") ? `## Semester 1 Weekly Plan (Weeks 1-18)

Table: Week | Topic | Text Sections | Activities | Assessment | Outcome focus

## Semester 2 Weekly Plan (Weeks 19-36)

Same table format, continue through week 36.` : ""}

${depth.includes("daily") ? `## Sample Daily Lesson Sequence (Unit 1, 10 days)

Table: Day | Lesson Title | Objective | Method | Outcome` : ""}

${depth.includes("rubrics") ? `## Assessment Framework

3-4 sentences on assessment philosophy calibrated to ${elevelObj ? elevelObj.label : "this proficiency level"}.

### Formative Assessment Practices

List 4-5 formative strategies with descriptions and links to program outcomes where helpful.

### Summative Assessment Rubric

Table: Criterion | Exemplary | Proficient | Developing | Beginning
4-5 criteria; where natural, reference program outcomes in criterion labels.

### Signature Project

One paragraph describing a project-based assessment: task, product, outcomes, and alignment to program outcomes.` : ""}

## Differentiation and Adaptation

3-4 sentences on how instruction is differentiated for ${elevelObj ? `${elevelObj.label} (${elevelObj.name})` : "the enrolled cohort"} and how partner institutions may adapt this curriculum.`,
            signal,
            { mockKind: "syllabus", ...orOpts }
          );
          newSections.push({ html: mdToHtml(text, mdOpts) });
        }
      }

      setSections(newSections);
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth" }), 150);
    } catch (e) {
      if (e.name !== "AbortError") setError(`Generation failed: ${e.message}`);
    } finally {
      setLoading(false);
      setLoadingMsg("");
      abortRef.current = null;
    }
  };

  if (uiView === "settings") {
    return <SettingsPage onDone={() => setUiView("generator")} />;
  }

  return (
    <div className="app-root">
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>

      <header className="app-chrome" role="banner">
        <div className="app-chrome-brand">
          {settings.heroLogoUrl?.trim() ? (
            <img
              src={logoUrl}
              alt=""
              className="app-chrome-logo"
              height={36}
              width={120}
              style={{ objectFit: "contain", maxWidth: 140 }}
            />
          ) : (
            <span className="app-chrome-mark" aria-hidden>
              {schoolName.slice(0, 1).toUpperCase()}
            </span>
          )}
          <div className="app-chrome-text">
            <p className="app-chrome-name">{schoolName}</p>
            <p className="app-chrome-tag">{settings.marketingTagline}</p>
          </div>
        </div>
        <div className="app-chrome-actions">
          <button type="button" className="app-chrome-btn focus-ring" onClick={() => setUiView("settings")}>
            Settings
          </button>
        </div>
      </header>

      <div className="app-hero">
        <div className="app-hero-layout">
          {settings.heroLogoUrl?.trim() ? (
            <img
              src={logoUrl}
              alt=""
              className="app-hero-logo"
              decoding="async"
            />
          ) : null}
          <div>
            <h1 className="app-hero-title">Curriculum generator</h1>
            <p className="app-hero-lead">{settings.marketingTagline}</p>
            {USE_MOCK_CLAUDE && (
              <span className="app-hero-badge" role="status">
                Demo mode
              </span>
            )}
          </div>
        </div>
      </div>

      {needsApiSetup && (
        <div className="app-setup-banner" role="status">
          <strong className="app-setup-banner-title">API not configured</strong>
          <span className="app-setup-banner-text">
            Choose one: set <code>VITE_USE_MOCK_CLAUDE=true</code> for demo content; set{" "}
            <code>VITE_OPENROUTER_PROXY</code> to your Node proxy or Cloudflare <code>/api</code> URL; save an
            OpenRouter key under Settings → School &amp; site (server); or set{" "}
            <code>VITE_OPENROUTER_API_KEY</code> for direct browser calls (dev only).
          </span>
        </div>
      )}

      <main id="main-content" role="main" className="app-main">
        <nav className="app-form-nav" aria-label="Jump to form section">
          <div className="app-form-nav-inner">
            {navSteps.map((s) => (
              <a key={s.id} href={`#${s.id}`} className="app-form-nav-link focus-ring">
                {s.label}
              </a>
            ))}
            <a href="#generate-action" className="app-form-nav-link app-form-nav-link--cta focus-ring">
              Generate
            </a>
          </div>
        </nav>

        <Section
          id="program-details"
          step={1}
          title="Program details"
          description="Optional—shown on the generated document."
        >
          <div className="app-program-grid">
            <div>
              <FL htmlFor="partner">Institution name</FL>
              <input
                id="partner"
                type="text"
                value={partner}
                onChange={(e) => setPartner(e.target.value)}
                placeholder="e.g. Partner school name"
                className="app-field-input focus-ring"
              />
            </div>
            <div>
              <FL htmlFor="program">Program name</FL>
              <input
                id="program"
                type="text"
                value={program}
                onChange={(e) => setProgram(e.target.value)}
                placeholder="e.g. Dual diploma program"
                className="app-field-input focus-ring"
              />
            </div>
          </div>
        </Section>

        <Section
          id="document-type"
          step={2}
          title="Document type"
          description="One tap—full descriptions appear below."
        >
          <div role="group" aria-labelledby="document-type-heading" className="app-segmented">
            {MODES.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setMode(opt.id)}
                aria-pressed={mode === opt.id}
                aria-label={`${opt.title}: ${opt.desc}`}
                className={`app-segmented-btn focus-ring${mode === opt.id ? " is-selected" : ""}`}
              >
                {opt.shortLabel}
              </button>
            ))}
          </div>
          <p className="app-segmented-hint">{MODES.find((m) => m.id === mode)?.desc}</p>
        </Section>

        <Section
          id="english-level"
          step={3}
          title="English proficiency"
          description="Shapes vocabulary, activities, and assessments."
        >
          <FL id="english-level-label">Proficiency level</FL>
          <div role="group" aria-labelledby="english-level-label" className="app-pill-row">
            {ENGLISH_LEVELS.map((el) => (
              <button
                key={el.id}
                type="button"
                onClick={() => setEnglishLevel(el.id)}
                aria-pressed={englishLevel === el.id}
                aria-label={`${el.label} — ${el.name}`}
                title={el.desc}
                className={`focus-ring app-english-pill${englishLevel === el.id ? " is-selected" : ""}`}
              >
                <span className="app-english-pill-label">{el.label}</span>
                <span className="app-english-pill-meta">— {el.name}</span>
              </button>
            ))}
          </div>
          <p id="english-level-desc" className="app-muted">
            CEFR levels from beginner (A1) to advanced (C1). Choose Mixed for varied cohorts.
          </p>
        </Section>

        {(mode === "map" || mode === "both") && (
          <Section
            id="course-map"
            step={4}
            title="Assign courses by year"
            description="Courses per year, then fill each row."
          >
            <div className="app-courses-per-year" role="group" aria-labelledby="courses-per-year-label">
              <FL id="courses-per-year-label">Courses per year</FL>
              <div className="app-slot-row">
                {[2, 3, 4, 5, 6].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setSlots(n)}
                    aria-pressed={slots === n}
                    aria-label={`${n} courses per year`}
                    className={`focus-ring app-slot-btn${slots === n ? " is-selected" : ""}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <CourseMatrix
              rows={mapRows}
              cols={slots}
              matrix={matrix}
              onCell={(ri, ci, v) => setMatrix((p) => ({ ...p, [`${ri}-${ci}`]: v }))}
              onGrade={(ri, v) =>
                setMapRows((p) => p.map((r, i) => (i === ri ? { ...r, grade: v } : r)))
              }
              onRemove={(ri) => {
                setMapRows((p) => p.filter((_, i) => i !== ri));
                setMatrix((p) => {
                  const n = {};
                  Object.entries(p).forEach(([k, v]) => {
                    const [r, c] = k.split("-").map(Number);
                    if (r !== ri) n[`${r < ri ? r : r - 1}-${c}`] = v;
                  });
                  return n;
                });
              }}
              onAdd={() => setMapRows((p) => [...p, { grade: "" }])}
            />
          </Section>
        )}

        {(mode === "syllabus" || mode === "both") && (
          <Section
            id="curriculum-selection"
            step={5}
            title="Courses to include"
            description="One row per course plus grade. Add depth options below."
          >
            <SyllabusList
              items={syllCourses}
              onUpdate={(i, f, v) =>
                setSyllCourses((p) => p.map((s, j) => (j === i ? { ...s, [f]: v } : s)))
              }
              onAdd={() => setSyllCourses((p) => [...p, { course: "", grade: "" }])}
              onRemove={(i) => setSyllCourses((p) => p.filter((_, j) => j !== i))}
            />
            <div className="app-stack-mt" role="group" aria-labelledby="curriculum-depth-label">
              <FL id="curriculum-depth-label">Curriculum depth</FL>
              <p className="app-depth-lead">
                Include unit maps, weekly plans, daily objectives, and/or assessment rubrics.
              </p>
              <div className="app-pill-row">
                {depthOpts.map((d) => (
                  <Pill
                    key={d.id}
                    label={d.label}
                    selected={depth.includes(d.id)}
                    onClick={() =>
                      setDepth((p) =>
                        p.includes(d.id) ? p.filter((x) => x !== d.id) : [...p, d.id]
                      )
                    }
                  />
                ))}
              </div>
            </div>
          </Section>
        )}

        <Section
          id="emphasis"
          step={6}
          title="Emphasis (optional)"
          description={
            englishLevel
              ? `Suggestions for ${ENGLISH_LEVELS.find((e) => e.id === englishLevel)?.name}—tap to toggle.`
              : "Pick a proficiency level above for tailored suggestions."
          }
        >
          <div className="app-pill-row" style={{ marginBottom: 16 }}>
            {allSuggestions.map((k) => (
              <Pill key={k} label={k} selected={emphasis.includes(k)} onClick={() => toggleE(k)} />
            ))}
          </div>
          <FL htmlFor="custom-emphasis">Other emphasis (comma-separated)</FL>
          <input
            id="custom-emphasis"
            type="text"
            value={customEmphasis}
            onChange={(e) => setCustomEmphasis(e.target.value)}
            placeholder="e.g. Cultural integration, community building"
            className="app-field-input focus-ring"
          />
        </Section>

        <details className="app-details">
          <summary>Program learning outcomes (reference)</summary>
          <div className="app-details-body">
            <div className="app-outcome-quote">
              <p>
                Example inline style for generated documents: “Students examine how policy decisions affect
                vulnerable populations (Global Responsibility — program outcome).”
              </p>
            </div>
            <p className="app-outcome-list-title">Nine outcome themes</p>
            <ul className="app-outcome-list">
              {GRADUATE_OUTCOMES.map((g) => (
                <li key={g.n}>
                  <span className="app-outcome-num">{g.n}.</span> {g.label}
                </li>
              ))}
            </ul>
          </div>
        </details>

        {error && (
          <div id="generate-error" role="alert" aria-live="assertive" className="app-error-box">
            <p>{error}</p>
          </div>
        )}

        <div id="generate-action" className="app-sticky-cta">
          <button
            type="button"
            onClick={generate}
            disabled={loading}
            className="focus-ring app-generate-btn"
            aria-busy={loading}
            aria-describedby={error ? "generate-error" : undefined}
          >
            {loading ? "Generating…" : "Generate document"}
          </button>
        </div>

        {loading && (
          <div role="status" aria-live="polite" className="app-loading-panel">
            <div className="app-loading-row">
              <div className="app-loading-spinner" aria-hidden />
              <div>
                <p className="app-loading-title">{loadingMsg}</p>
                <p className="app-loading-sub">{loadingHint} Cancel anytime.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => abortRef.current?.abort()}
              className="focus-ring app-loading-cancel"
            >
              Cancel
            </button>
          </div>
        )}

        {sections.length > 0 && (
          <section
            ref={resultRef}
            id="result"
            aria-labelledby="result-heading"
            className="app-result-wrap"
          >
            <h2 id="result-heading" className="app-result-heading">
              Your document is ready
            </h2>
            <p className="app-result-lead">Review below, then download as PDF or print.</p>
            <DocPreview
              mapRows={mapRows}
              matrix={matrix}
              slots={slots}
              sections={sections}
              partner={partner}
              program={program}
              mode={mode}
              englishLevel={englishLevel}
              logoUrl={docLogoUrl}
              logoShieldUrl={docLogoUrl}
            />
          </section>
        )}
      </main>
    </div>
  );
}
