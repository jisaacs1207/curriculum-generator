/**
 * Local proxy: OpenRouter API + PDF + page settings store.
 * Run: node server/proxy.js
 * .env: VITE_OPENROUTER_API_KEY, VITE_OPENROUTER_PROXY=http://localhost:3001/api
 * Optional: PAGE_SETTINGS_ADMIN_TOKEN (Bearer for PUT /api/page-settings)
 */
import http from "http";
import { readFileSync, existsSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import {
  readPageSettingsFull,
  writePageSettingsFull,
  toPublic,
  mergePatch,
  saveUpload,
} from "./pageSettingsStore.mjs";
import {
  authorizeAdminWriteNode,
  handleMagicLinkPost,
  handleMagicVerifyGet,
  handleSessionGet,
} from "./authMagic.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnv() {
  const path = join(root, ".env");
  if (!existsSync(path)) return {};
  const content = readFileSync(path, "utf8");
  const out = {};
  for (const line of content.split("\n")) {
    const m = line.match(/^\s*([^#=]+)=(.*)$/);
    if (m) out[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = loadEnv();
const ENV_API_KEY =
  process.env.OPENROUTER_API_KEY ||
  env.VITE_OPENROUTER_API_KEY ||
  process.env.VITE_OPENROUTER_API_KEY;
const ADMIN_TOKEN =
  process.env.PAGE_SETTINGS_ADMIN_TOKEN || env.PAGE_SETTINGS_ADMIN_TOKEN || "";

function adminCtx() {
  return {
    JWT_SECRET: process.env.JWT_SECRET || env.JWT_SECRET || "",
    BREVO_API_KEY: process.env.BREVO_API_KEY || env.BREVO_API_KEY || "",
    MAGIC_LINK_FROM_EMAIL: process.env.MAGIC_LINK_FROM_EMAIL || env.MAGIC_LINK_FROM_EMAIL || "",
    MAGIC_LINK_FROM_NAME: process.env.MAGIC_LINK_FROM_NAME || env.MAGIC_LINK_FROM_NAME || "",
    ADMIN_EMAIL_ALLOWLIST:
      process.env.ADMIN_EMAIL_ALLOWLIST || env.ADMIN_EMAIL_ALLOWLIST || "",
    APP_ORIGIN: process.env.APP_ORIGIN || env.APP_ORIGIN || "",
    PAGE_SETTINGS_ADMIN_TOKEN: ADMIN_TOKEN,
  };
}

function envModel() {
  return (
    process.env.OPENROUTER_MODEL ||
    env.VITE_OPENROUTER_MODEL ||
    env.OPENROUTER_MODEL ||
    "anthropic/claude-sonnet-4.6"
  );
}

function envChatUrl() {
  return (
    process.env.OPENROUTER_API_URL?.trim() ||
    env.VITE_OPENROUTER_API_URL?.trim() ||
    "https://openrouter.ai/api/v1/chat/completions"
  );
}

function envMaxTokens() {
  const maxTokRaw = process.env.OPENROUTER_MAX_TOKENS || env.VITE_OPENROUTER_MAX_TOKENS;
  return Math.min(
    128000,
    Math.max(256, maxTokRaw ? parseInt(String(maxTokRaw), 10) || 16384 : 16384)
  );
}

function effectiveOpenRouterKey() {
  const store = readPageSettingsFull();
  const fromStore = store.openRouterApiKey?.trim();
  if (fromStore) return fromStore;
  return ENV_API_KEY?.trim() || "";
}

function parseApiErrorText(text) {
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

async function htmlToPdf(html) {
  const puppeteer = await import("puppeteer");
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  try {
    const page = await browser.newPage();
    await page.setContent(html, {
      waitUntil: "networkidle0",
      timeout: 15000,
    });
    const pdf = await page.pdf({
      format: "Letter",
      margin: { top: "0.5in", right: "0.5in", bottom: "0.5in", left: "0.5in" },
      printBackground: true,
    });
    return pdf;
  } finally {
    await browser.close();
  }
}

function sendJson(res, status, obj) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(obj));
}

function setCors(req, res, credentialed) {
  const origin = req.headers.origin;
  if (credentialed && origin && origin !== "null") {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Vary", "Origin");
  } else {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Cookie");
}

function pathname(req) {
  const u = req.url || "/";
  const q = u.indexOf("?");
  return q >= 0 ? u.slice(0, q) : u;
}

function readBearer(req) {
  const h = req.headers.authorization || "";
  const m = h.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : "";
}

const server = http.createServer(async (req, res) => {
  const path = pathname(req);
  const credentialedApi =
    path === "/api/page-settings" ||
    path === "/api/page-settings-logo" ||
    path === "/api/auth/magic-link" ||
    path === "/api/auth/session";

  if (req.method === "OPTIONS") {
    setCors(req, res, credentialedApi);
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === "GET" && path === "/api/page-settings-public") {
    setCors(req, res, false);
    sendJson(res, 200, { ok: true, config: toPublic(readPageSettingsFull()) });
    return;
  }

  if (req.method === "GET" && path === "/api/auth/magic-link/verify") {
    setCors(req, res, false);
    await handleMagicVerifyGet(req, res, adminCtx());
    return;
  }

  if (req.method === "GET" && path === "/api/auth/session") {
    setCors(req, res, true);
    await handleSessionGet(req, res, adminCtx());
    return;
  }

  if (req.method === "POST" && path === "/api/auth/magic-link") {
    setCors(req, res, true);
    await handleMagicLinkPost(req, res, adminCtx());
    return;
  }

  if (req.method === "PUT" && path === "/api/page-settings") {
    setCors(req, res, true);
    if (!authorizeAdminWriteNode(req, adminCtx())) {
      sendJson(res, 401, { error: "Unauthorized" });
      return;
    }
    let body = "";
    for await (const chunk of req) body += chunk;
    let patch;
    try {
      patch = JSON.parse(body || "{}");
    } catch {
      sendJson(res, 400, { error: "Invalid JSON" });
      return;
    }
    const next = mergePatch(readPageSettingsFull(), patch);
    writePageSettingsFull(next);
    sendJson(res, 200, { ok: true, config: toPublic(next) });
    return;
  }

  if (req.method === "POST" && path === "/api/page-settings-logo") {
    setCors(req, res, true);
    if (!authorizeAdminWriteNode(req, adminCtx())) {
      sendJson(res, 401, { error: "Unauthorized" });
      return;
    }
    let body = "";
    for await (const chunk of req) body += chunk;
    let data;
    try {
      data = JSON.parse(body || "{}");
    } catch {
      sendJson(res, 400, { error: "Invalid JSON" });
      return;
    }
    const { imageBase64, field } = data;
    if (typeof imageBase64 !== "string" || !imageBase64.startsWith("data:")) {
      sendJson(res, 400, { error: "Expected data URL in imageBase64" });
      return;
    }
    const max = 900_000;
    if (imageBase64.length > max) {
      sendJson(res, 400, { error: "Image too large (max ~650KB)" });
      return;
    }
    const m = imageBase64.match(/^data:image\/([\w+.-]+);base64,(.+)$/);
    if (!m) {
      sendJson(res, 400, { error: "Invalid data URL" });
      return;
    }
    const rawType = m[1].toLowerCase();
    const allowed = ["png", "jpeg", "jpg", "webp", "svg+xml"];
    if (!allowed.includes(rawType)) {
      sendJson(res, 400, { error: "Unsupported image type" });
      return;
    }
    const ext = rawType === "jpeg" ? "jpg" : rawType === "svg+xml" ? "svg" : rawType;
    let buf;
    try {
      buf = Buffer.from(m[2], "base64");
    } catch {
      sendJson(res, 400, { error: "Invalid base64" });
      return;
    }
    if (buf.length > 700_000) {
      sendJson(res, 400, { error: "Decoded image too large" });
      return;
    }
    const urlPath = saveUpload(buf, ext === "svg+xml" ? "svg" : ext);
    const cur = readPageSettingsFull();
    const f = field === "docLogoUrl" ? "docLogoUrl" : "heroLogoUrl";
    cur[f] = urlPath;
    writePageSettingsFull(cur);
    sendJson(res, 200, { ok: true, url: urlPath, config: toPublic(cur) });
    return;
  }

  if (req.method !== "POST") {
    setCors(req, res, false);
    sendJson(res, 404, { error: "Not found" });
    return;
  }

  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", async () => {
    try {
      if (path === "/api") {
        setCors(req, res, false);
        const apiKey = effectiveOpenRouterKey();
        if (!apiKey) {
          sendJson(res, 500, {
            error:
              "No OpenRouter API key: set in page settings (PUT /api/page-settings) or OPENROUTER_API_KEY / VITE_OPENROUTER_API_KEY in .env",
          });
          return;
        }
        const { prompt, appTitle } = JSON.parse(body || "{}");
        if (!prompt) {
          sendJson(res, 400, { error: "Missing prompt" });
          return;
        }
        const storeDoc = readPageSettingsFull();
        const referer =
          process.env.OPENROUTER_HTTP_REFERER ||
          env.VITE_OPENROUTER_HTTP_REFERER ||
          "http://localhost:5173";
        const title =
          (typeof appTitle === "string" && appTitle.trim()) ||
          storeDoc.openRouterAppTitle?.trim() ||
          process.env.OPENROUTER_APP_TITLE ||
          env.VITE_OPENROUTER_APP_TITLE ||
          "Curriculum generator";

        const model = storeDoc.openRouterModel?.trim() || envModel();
        const response = await fetch(envChatUrl(), {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": referer,
            "X-OpenRouter-Title": title,
          },
          body: JSON.stringify({
            model,
            max_tokens: envMaxTokens(),
            messages: [{ role: "user", content: prompt }],
          }),
        });
        const raw = await response.text();
        let data;
        try {
          data = JSON.parse(raw);
        } catch {
          sendJson(res, response.status || 502, { error: parseApiErrorText(raw) });
          return;
        }
        if (!response.ok) {
          const msg =
            typeof data.error === "string"
              ? data.error
              : data.error?.message || data.message || parseApiErrorText(raw);
          sendJson(res, response.status, { error: msg });
          return;
        }
        const text = messageContentToString(data.choices?.[0]?.message?.content) || "";
        sendJson(res, 200, { text });
        return;
      }

      if (path === "/pdf") {
        setCors(req, res, false);
        const { html, filename } = JSON.parse(body || "{}");
        if (!html) {
          sendJson(res, 400, { error: "Missing html" });
          return;
        }
        const pdf = await htmlToPdf(html);
        const name = (filename || "Curriculum.pdf").replace(/[^a-zA-Z0-9.-]/g, "_");
        res.writeHead(200, {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${name}"`,
          "Content-Length": pdf.length,
        });
        res.end(pdf);
        return;
      }

      setCors(req, res, false);
      sendJson(res, 404, { error: "Not found" });
    } catch (e) {
      if (path === "/pdf" && e.code === "MODULE_NOT_FOUND") {
        sendJson(res, 501, { error: "PDF requires puppeteer. Run: npm install" });
        return;
      }
      sendJson(res, 500, { error: e.message });
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Proxy: http://localhost:${PORT}/api (OpenRouter)`);
  console.log(`PDF:   http://localhost:${PORT}/pdf`);
  console.log(`Page settings: GET http://localhost:${PORT}/api/page-settings-public`);
  console.log(
    `               PUT http://localhost:${PORT}/api/page-settings (cookie session or Bearer PAGE_SETTINGS_ADMIN_TOKEN)`
  );
  console.log(`Auth: POST /api/auth/magic-link, GET /api/auth/magic-link/verify, GET /api/auth/session`);
  if (!effectiveOpenRouterKey()) console.warn("Warning: No OpenRouter API key in store or .env");
  if (!ADMIN_TOKEN && !adminCtx().JWT_SECRET)
    console.warn("Warning: No PAGE_SETTINGS_ADMIN_TOKEN or JWT_SECRET (saving page settings disabled)");
});
