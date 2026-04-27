# Curriculum generator

React app for generating program course maps and course-level curriculum documents for **grades 6–12**, using textbook **title and author only** in copy (no publisher names in generated text). **School & site** settings (name, logos, colors, OpenRouter key, model override) can be stored **on the server** via the bundled proxy or Cloudflare KV; **curriculum defaults** (grade band, assessment stance, optional multi-language-design hints, default depth) stay in the **browser** per device. Generation uses **[OpenRouter](https://openrouter.ai/)** ([chat completions API](https://openrouter.ai/docs/quickstart)); default model **Anthropic Claude Sonnet 4.6** (`anthropic/claude-sonnet-4.6`). Output weaves nine **program learning outcomes** without exposing internal jargon in the UI.

**Analytics (optional):** When `VITE_PUBLIC_POSTHOG_KEY` is set on the build, the app loads [PostHog](https://posthog.com/) (`posthog-js`) with US host `https://us.i.posthog.com` by default. Avoid sending PII in custom event names; see [PostHog privacy](https://posthog.com/docs/privacy).

## Quick start (dev)

```bash
npm install
cp .env.example .env
npm run dev
```

Open http://localhost:5173. With the default `.env` (`VITE_USE_MOCK_CLAUDE=true`), you can click **Generate document** without an API key.

## OpenRouter API (reference)

- **Endpoint:** `POST https://openrouter.ai/api/v1/chat/completions`
- **Auth:** `Authorization: Bearer <OPENROUTER_API_KEY>`
- **Body (non-streaming):** `{ "model": "<provider>/<model>", "messages": [{ "role": "user", "content": "..." }], "max_tokens": N }`
- **Response:** OpenAI-compatible `choices[0].message.content` (string or, for some models, structured content parts).
- **Optional headers:** `HTTP-Referer`, `X-OpenRouter-Title` for [app attribution](https://openrouter.ai/docs/app-attribution).

This app uses `fetch` to that endpoint (browser) or your proxy (recommended for production).

## Project structure

```
src/
  api/openrouter.js   # OpenRouter client + mock mode
  App.jsx             # Main form and generate flow
  ...
functions/api/        # Cloudflare Pages Functions (OpenRouter proxy, page settings, magic-link auth)
server/proxy.js       # Local Node: OpenRouter + Puppeteer PDF + auth parity
wrangler.toml         # Pages build dir + D1 binding name (replace database_id)
migrations/           # D1 SQL for magic_tokens
.github/workflows/ci.yml   # npm ci + build (no Cloudflare deploy — avoids double deploy)
```

## Setup (real API)

1. **Environment** – copy `.env.example` to `.env`.
2. **Option A (dev, key in browser):** Set `VITE_OPENROUTER_API_KEY` from [OpenRouter keys](https://openrouter.ai/keys). Set `VITE_USE_MOCK_CLAUDE=false`. Optional: `VITE_OPENROUTER_MODEL` (default `anthropic/claude-sonnet-4.6`), `VITE_OPENROUTER_MAX_TOKENS`, `VITE_OPENROUTER_API_URL`.
3. **Option B (local proxy, recommended for dev):** `npm run proxy` (port 3001). In `.env`: `VITE_OPENROUTER_API_KEY=<key>` (or store the key only via Settings → School & site) and `VITE_OPENROUTER_PROXY=http://localhost:3001/api`. Vite proxies `/api/*` to the proxy. For saving settings you can use **email magic link** (Brevo + `JWT_SECRET` + allowlist in `.env`) and/or optional **`PAGE_SETTINGS_ADMIN_TOKEN`** (break-glass bearer). **PDF:** `POST /pdf`; set `VITE_PDF_ENDPOINT` if needed.
4. **Option C (custom backend):** Any `POST` that accepts `{ "prompt" }` and returns `{ "text" }` — set `VITE_OPENROUTER_PROXY` (or legacy `VITE_ANTHROPIC_PROXY`) to that URL. Optionally accept `{ "appTitle" }` and forward it as `X-OpenRouter-Title` (same as the bundled proxy and Cloudflare function).

## Commit → production (Cloudflare Pages + GitHub + PostHog + Brevo)

### 1. GitHub → Cloudflare Pages (recommended deploy path)

1. Push this repo to GitHub.
2. In [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
3. Select the repo, production branch **`main`**, build command **`npm run build`**, output directory **`dist`**.
4. Add **environment variables** (Production and Preview as needed):
   - **Public (plain text):** `VITE_OPENROUTER_PROXY=/api`, `VITE_USE_MOCK_CLAUDE=false`, optional `VITE_PUBLIC_POSTHOG_KEY`, `VITE_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com`.
5. **Do not** put secrets in `VITE_*`. Use **encrypted** / **Secrets** in the dashboard or `wrangler pages secret put` (see below).

This repo includes **`.github/workflows/ci.yml`** which runs `npm ci` and `npm run build` on pushes to `main` and on pull requests. It does **not** deploy to Cloudflare (Cloudflare’s Git integration remains the single deploy authority unless you deliberately add `wrangler-action`).

### 2. D1 (magic-link state only)

1. **D1** → Create database (e.g. `curriculum-auth`) → copy **database_id**.
2. In **`wrangler.toml`**, set `database_id` under `[[d1_databases]]` (replace the placeholder), or bind **AUTH_DB** in the Pages project: **Settings → Functions → D1 database bindings** → variable name **`AUTH_DB`**.
3. Apply migrations to the remote database:

```bash
npx wrangler d1 migrations apply curriculum-auth --remote
```

For local `wrangler pages dev` with D1:

```bash
npx wrangler d1 migrations apply curriculum-auth --local
```

Use the **`database_name`** value from `wrangler.toml` (here `curriculum-auth`), not the binding name `AUTH_DB`.

Schema: `magic_tokens(token_hash, email, expires_at, used_at)` — only a **SHA-256 hex** of the opaque token is stored.

### 3. KV (page settings JSON)

1. Create a KV namespace, bind it as **`PAGE_SETTINGS`** on the Pages project (same variable name as in code).
2. Uncomment `[[kv_namespaces]]` in `wrangler.toml` with your namespace **id** if you deploy via Wrangler CLI; dashboard binding alone is enough for Git-connected Pages.

### 4. Secrets matrix (Pages / `wrangler pages secret put`)

| Name | Purpose |
|------|---------|
| `OPENROUTER_API_KEY` | Fallback model API key if not in KV |
| `JWT_SECRET` | Signs **admin_session** cookie (long random) |
| `BREVO_API_KEY` | [Brevo](https://developers.brevo.com/docs/send-a-transactional-email) transactional API |
| `MAGIC_LINK_FROM_EMAIL` | Verified sender email in Brevo |
| `MAGIC_LINK_FROM_NAME` | Optional display name |
| `ADMIN_EMAIL_ALLOWLIST` | Comma-separated; only these may receive a link |
| `APP_ORIGIN` | Exact site origin (e.g. `https://your-project.pages.dev`) for links and redirects when Referer is absent |
| `PAGE_SETTINGS_ADMIN_TOKEN` | Optional break-glass bearer for `PUT` / logo |

### 5. Brevo

1. Create API key (**SMTP & API** → v3 API key).
2. Verify sender domain or sender in Brevo.
3. Store **`BREVO_API_KEY`** only as a Pages secret (never `VITE_*`).

### 6. PostHog US (optional)

1. Create a US project at [posthog.com](https://posthog.com).
2. Set **`VITE_PUBLIC_POSTHOG_KEY`** and **`VITE_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com`** (or the host shown in your project snippet) on the **build** environment for Pages.

### 7. End-to-end check

1. Production deploy green.
2. Request magic link from **Settings** → receive email → follow link → redirected to **/?settings=1** with session cookie.
3. Save school & site settings; confirm **`GET /api/page-settings-public`** reflects changes.

Puppeteer PDF does not run on Workers; use **Print → Save as PDF** when server PDF is unavailable.

## Local magic-link parity

The Node proxy implements the same routes as Pages where possible:

- `POST /api/auth/magic-link` — in-memory token store + Brevo send
- `GET /api/auth/magic-link/verify` — sets `admin_session` cookie, redirects to `/?settings=1&signedIn=1`
- `GET /api/auth/session` — `{ signedIn, email? }`
- `PUT /api/page-settings` / `POST /api/page-settings-logo` — **cookie session** or **`PAGE_SETTINGS_ADMIN_TOKEN`**

Set **`APP_ORIGIN=http://127.0.0.1:5173`** (or your dev URL) so email links and redirects target the Vite app when the API is reached via a different host/port.

```bash
npm run build
npx wrangler pages deploy dist --project-name=your-project
npx wrangler pages secret put OPENROUTER_API_KEY --project-name=your-project
```

## Features

- **Document type:** Course Map, Course Curriculum, or Full Package.
- **Grades:** 6–12 map rows and syllabus grade list; prompts include grade-band pedagogy from curriculum defaults.
- **English proficiency:** CEFR A1–C1 plus Mixed.
- **Course map:** 2–6 courses per year (defaults configurable).
- **Curriculum depth:** Units, weekly, daily, rubrics.
- **Emphasis:** Presets + custom; optional default emphasis string in curriculum settings.
- **Settings:** Server **school & site** (proxy/KV) vs local **curriculum defaults**.

## Cancellation

Use **Cancel** while generating; the request is aborted and no error is shown.
