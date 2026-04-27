/**
 * Cloudflare Pages Function: POST /api → OpenRouter chat completions.
 * Reads optional PAGE_SETTINGS KV "config" for API key and model override.
 */

const DEFAULT_MODEL = "anthropic/claude-sonnet-4.6";
const DEFAULT_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";
const MAX_TOKENS = 16384;

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function messageContentToString(content) {
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .filter((p) => p && (p.type === "text" || p.text))
    .map((p) => p.text || "")
    .join("");
}

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function onRequestPost({ request, env }) {
  const headers = { ...corsHeaders(), "Content-Type": "application/json" };
  let apiKey = env.OPENROUTER_API_KEY || "";
  let model = env.OPENROUTER_MODEL || DEFAULT_MODEL;
  try {
    const raw = await env.PAGE_SETTINGS?.get("config");
    if (raw) {
      const cfg = JSON.parse(raw);
      if (cfg.openRouterApiKey?.trim()) apiKey = cfg.openRouterApiKey.trim();
      if (cfg.openRouterModel?.trim()) model = cfg.openRouterModel.trim();
    }
  } catch {
    /* ignore */
  }
  if (!apiKey) {
    return Response.json(
      {
        error:
          "No OpenRouter API key: set OPENROUTER_API_KEY secret or configure PAGE_SETTINGS KV with openRouterApiKey",
      },
      { status: 500, headers }
    );
  }
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400, headers });
  }
  const prompt = body?.prompt;
  if (!prompt || typeof prompt !== "string") {
    return Response.json({ error: "Missing prompt" }, { status: 400, headers });
  }
  const url = (env.OPENROUTER_API_URL || DEFAULT_CHAT_URL).trim();
  const referer = env.OPENROUTER_HTTP_REFERER || "https://pages.dev";
  const title =
    (typeof body.appTitle === "string" && body.appTitle.trim()) ||
    env.OPENROUTER_APP_TITLE ||
    "Curriculum generator";

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": referer,
      "X-OpenRouter-Title": title,
    },
    body: JSON.stringify({
      model,
      max_tokens: MAX_TOKENS,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const raw = await res.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return Response.json({ error: "Invalid response from OpenRouter" }, { status: 502, headers });
  }
  if (!res.ok) {
    const msg =
      typeof data.error === "string"
        ? data.error
        : data.error?.message || data.message || "OpenRouter API error";
    return Response.json({ error: msg }, { status: res.status, headers });
  }
  const text = messageContentToString(data.choices?.[0]?.message?.content) || "";
  return Response.json({ text }, { headers });
}
