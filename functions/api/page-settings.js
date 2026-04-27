import { corsHeaders } from "../lib/cors.js";
import { authorizeAdminWrite } from "../lib/admin-auth.js";
import { normalize, mergePatch, toPublic } from "../lib/page-settings-kv.js";

export async function onRequestOptions({ request }) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request, "PUT, OPTIONS", { "Content-Type": "application/json" }),
  });
}

export async function onRequestPut({ request, env }) {
  const headers = { ...corsHeaders(request, "PUT, OPTIONS"), "Content-Type": "application/json" };
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
  let patch;
  try {
    patch = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400, headers });
  }
  let existing = {};
  try {
    const raw = await env.PAGE_SETTINGS.get("config");
    if (raw) existing = JSON.parse(raw);
  } catch {
    /* empty */
  }
  const next = mergePatch(existing, patch);
  await env.PAGE_SETTINGS.put("config", JSON.stringify(next));
  return Response.json({ ok: true, config: toPublic(next) }, { headers });
}
