/**
 * OpenRouter unified API (OpenAI-compatible chat completions).
 * @see https://openrouter.ai/docs/quickstart
 *
 * Env: VITE_OPENROUTER_API_KEY, optional VITE_OPENROUTER_PROXY (POST { prompt } → { text }),
 * VITE_OPENROUTER_MODEL, VITE_OPENROUTER_MAX_TOKENS, VITE_OPENROUTER_API_URL (full chat URL override).
 * Mock: VITE_USE_MOCK_CLAUDE=true (name kept for existing .env files).
 */
const getEnv = (key) =>
  (typeof import.meta !== "undefined" && import.meta.env?.[key]) ??
  (typeof process !== "undefined" && process.env?.[key]);

const DEFAULT_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "anthropic/claude-sonnet-4.6";
const DEFAULT_MAX_TOKENS = 16384;

export const OPENROUTER_API_KEY =
  getEnv("VITE_OPENROUTER_API_KEY") ?? getEnv("REACT_APP_OPENROUTER_API_KEY");
/** Same-origin or absolute URL to POST { prompt }; legacy VITE_ANTHROPIC_PROXY still read. */
export const OPENROUTER_PROXY =
  getEnv("VITE_OPENROUTER_PROXY") ??
  getEnv("REACT_APP_OPENROUTER_PROXY") ??
  getEnv("VITE_ANTHROPIC_PROXY") ??
  getEnv("REACT_APP_ANTHROPIC_PROXY");

export const USE_MOCK_CLAUDE =
  getEnv("VITE_USE_MOCK_CLAUDE") === "true" ||
  getEnv("VITE_USE_MOCK_CLAUDE") === "1";

export const OPENROUTER_MODEL =
  getEnv("VITE_OPENROUTER_MODEL") ??
  getEnv("OPENROUTER_MODEL") ??
  DEFAULT_MODEL;

const maxTokRaw = getEnv("VITE_OPENROUTER_MAX_TOKENS") ?? getEnv("VITE_ANTHROPIC_MAX_TOKENS");
export const OPENROUTER_MAX_TOKENS = Math.min(
  128000,
  Math.max(256, maxTokRaw ? parseInt(String(maxTokRaw), 10) || DEFAULT_MAX_TOKENS : DEFAULT_MAX_TOKENS)
);

export const OPENROUTER_CHAT_URL =
  getEnv("VITE_OPENROUTER_API_URL")?.trim() || DEFAULT_CHAT_URL;

/** True when a real OpenRouter call can be made (mock off and key or proxy set). */
export const CAN_CALL_OPENROUTER =
  !USE_MOCK_CLAUDE && !!(OPENROUTER_PROXY || OPENROUTER_API_KEY);

/** @deprecated use getNeedsApiSetup(pagePublic) */
export const NEEDS_API_SETUP = !USE_MOCK_CLAUDE && !OPENROUTER_PROXY && !OPENROUTER_API_KEY;

/**
 * @param {{ hasOpenRouterKey?: boolean } | null | undefined} pagePublic — from GET /api/page-settings-public
 */
export function getNeedsApiSetup(pagePublic) {
  if (USE_MOCK_CLAUDE) return false;
  if (OPENROUTER_PROXY) return false;
  if (OPENROUTER_API_KEY) return false;
  if (pagePublic?.hasOpenRouterKey) return false;
  return true;
}

function resolveProxyUrl(proxy) {
  if (!proxy) return "";
  if (typeof window !== "undefined" && proxy.startsWith("/")) {
    return `${window.location.origin}${proxy}`;
  }
  return proxy;
}

/** Parse OpenRouter / OpenAI-style JSON error bodies. */
export function parseApiErrorText(text) {
  const slice = text?.slice(0, 1200) || "";
  try {
    const j = JSON.parse(slice);
    const err = j?.error;
    if (typeof err === "string") return err;
    if (err?.message) return err.message;
    if (j?.message) return j.message;
  } catch {
    /* ignore */
  }
  return slice.slice(0, 280) || "Unknown error";
}

function messageContentToString(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((p) => p && (p.type === "text" || p.text))
    .map((p) => p.text || "")
    .join("");
}

const MOCK_RESPONSE_MAP = `# Academic Structure

| Category | Representative Courses | Instructor Profile |
|----------|------------------------|---------------------|
| English and Writing (required annually) | Writing and Communication; Rhetoric and Composition | Experienced in second-language pedagogy |
| Humanities and Social Sciences | Introduction to Psychology; U.S. History | Content-area and language support |
| Advanced and Elective Options | AP Psychology; Calculus I | Qualified in advanced placement |

# Program Rationale

**Grade 9** – This year establishes foundational academic literacy and critical thinking (Critical Thinking and Problem Solving — program outcome). Courses are selected to build vocabulary and analytical skills.

**Grade 10** – Students deepen inquiry and collaboration (Collaboration Across Networks and Leading by Example — program outcome) while engaging with core disciplines.

# Instructional Philosophy

Instruction is student-centered and calibrated to English proficiency. We integrate formative assessment and growth mindset (Initiative and Entrepreneurship — program outcome) throughout.
`;

const MOCK_RESPONSE_SYLLABUS = `# Introduction to Psychology

**Primary Text:** Introduction to Psychology
**Authors:** Rose M. Spielman
**Grade Level:** Grade 10
**Curriculum Design:** Your organization
**English Proficiency Level:** B1 (Intermediate)

## Course Description

This course introduces core psychological concepts and research methods. Students develop scientific literacy and apply evidence to behavior in social and academic contexts. Emphasis areas shape how examples are chosen and how discussion is scaffolded for language learners.

## Learning Outcomes

- Explain major theoretical perspectives in psychology
- Design simple investigations using ethical guidelines
- Interpret descriptive statistics in published summaries
- Connect biological bases to behavior and cognition
- Analyze motivation and emotion in learning contexts
- Evaluate claims using peer-reviewed sources

## Course Texts and Materials

**Introduction to Psychology** anchors each unit; supplementary readings and visuals support proficiency-appropriate pacing.

## Unit Map

| Unit | Title | Chapters | Weeks | Key Concepts | Learning Focus | Outcome alignment |
|------|-------|----------|-------|--------------|----------------|---------------|
| 1 | Introduction | 1–2 | 3 | Science of psychology | Methods and ethics | (Accessing and Analyzing Information — program outcome) |
`;

/**
 * @param {string} prompt
 * @param {AbortSignal} [signal]
 * @param {{ mockKind?: 'map' | 'syllabus'; appTitle?: string }} [opts]
 */
export async function callOpenRouter(prompt, signal, opts = {}) {
  if (USE_MOCK_CLAUDE) {
    await new Promise((r) => setTimeout(r, 800));
    if (signal?.aborted) throw Object.assign(new Error("Aborted"), { name: "AbortError" });
    return opts.mockKind === "syllabus" ? MOCK_RESPONSE_SYLLABUS : MOCK_RESPONSE_MAP;
  }
  const proxyUrl = resolveProxyUrl(OPENROUTER_PROXY);
  if (proxyUrl) {
    const res = await fetch(proxyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt,
        ...(opts.appTitle?.trim() ? { appTitle: opts.appTitle.trim() } : {}),
      }),
      signal,
    });
    const t = await res.text();
    if (!res.ok) {
      throw new Error(`Proxy ${res.status}: ${parseApiErrorText(t)}`);
    }
    let d;
    try {
      d = JSON.parse(t);
    } catch {
      throw new Error(`Proxy ${res.status}: invalid JSON`);
    }
    if (d.error != null)
      throw new Error(
        typeof d.error === "string" ? d.error : d.error?.message || String(d.error) || "Proxy error"
      );
    return d.text ?? d.content ?? "";
  }
  if (!OPENROUTER_API_KEY)
    throw new Error(
      "Set VITE_OPENROUTER_API_KEY in .env, or VITE_OPENROUTER_PROXY (or legacy VITE_ANTHROPIC_PROXY). For UI-only testing, set VITE_USE_MOCK_CLAUDE=true."
    );

  const referer =
    (typeof window !== "undefined" && window.location?.origin) ||
    getEnv("VITE_OPENROUTER_HTTP_REFERER") ||
    "https://localhost";
  const title =
    (opts.appTitle && String(opts.appTitle).trim()) ||
    getEnv("VITE_OPENROUTER_APP_TITLE") ||
    "Curriculum generator";

  const res = await fetch(OPENROUTER_CHAT_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
      "HTTP-Referer": referer,
      "X-OpenRouter-Title": title,
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      max_tokens: OPENROUTER_MAX_TOKENS,
      messages: [{ role: "user", content: prompt }],
    }),
    signal,
  });
  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`OpenRouter ${res.status}: ${parseApiErrorText(raw)}`);
  }
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    throw new Error(`OpenRouter ${res.status}: invalid JSON response`);
  }
  if (data.error) {
    const em = typeof data.error === "string" ? data.error : data.error?.message;
    if (em) throw new Error(em);
  }
  const text = messageContentToString(data.choices?.[0]?.message?.content);
  return text || "";
}
