import { corsHeaders } from "../lib/cors.js";
import { authorizeAdminWrite } from "../lib/admin-auth.js";
import { normalize, mergePatch, toPublic } from "../lib/page-settings-kv.js";

export async function onRequestOptions({ request }) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request, "POST, OPTIONS", { "Content-Type": "application/json" }),
  });
}

export async function onRequestPost({ request, env }) {
  const headers = { ...corsHeaders(request, "POST, OPTIONS"), "Content-Type": "application/json" };
  if (!env.PAGE_SETTINGS) {
    return Response.json(
      {
        error:
          "KV binding PAGE_SETTINGS not configured. Create a KV namespace and add [[kv_namespaces]] to wrangler.toml.",
      },
      { status: 503, headers }
    );
  }
  const auth = await authorizeAdminWrite(request, env);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401, headers });
  }
  let data;
  try {
    data = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400, headers });
  }
  const { imageBase64, field } = data;
  if (typeof imageBase64 !== "string" || !imageBase64.startsWith("data:")) {
    return Response.json({ error: "Expected data URL in imageBase64" }, { status: 400, headers });
  }
  const max = 900_000;
  if (imageBase64.length > max) {
    return Response.json({ error: "Image too large (max ~650KB)" }, { status: 400, headers });
  }
  const m = imageBase64.match(/^data:image\/([\w+.-]+);base64,(.+)$/);
  if (!m) {
    return Response.json({ error: "Invalid data URL" }, { status: 400, headers });
  }
  const rawType = m[1].toLowerCase();
  const allowed = ["png", "jpeg", "jpg", "webp", "svg+xml"];
  if (!allowed.includes(rawType)) {
    return Response.json({ error: "Unsupported image type" }, { status: 400, headers });
  }
  const b64 = m[2];
  const approxBytes = Math.floor((b64.length * 3) / 4);
  if (approxBytes > 700_000) {
    return Response.json({ error: "Decoded image too large" }, { status: 400, headers });
  }
  const f = field === "docLogoUrl" ? "docLogoUrl" : "heroLogoUrl";
  let existing = {};
  try {
    const raw = await env.PAGE_SETTINGS.get("config");
    if (raw) existing = JSON.parse(raw);
  } catch {
    /* empty */
  }
  const next = mergePatch(existing, { [f]: imageBase64 });
  await env.PAGE_SETTINGS.put("config", JSON.stringify(next));
  return Response.json({ ok: true, url: imageBase64, config: toPublic(next) }, { headers });
}
