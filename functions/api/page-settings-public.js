function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json",
  };
}

import { toPublic } from "../lib/page-settings-kv.js";

export async function onRequestOptions() {
  return new Response(null, { status: 204, headers: cors() });
}

export async function onRequestGet({ env }) {
  const headers = cors();
  try {
    const raw = await env.PAGE_SETTINGS?.get("config");
    if (!raw) {
      return Response.json({ ok: true, config: null }, { headers });
    }
    const full = JSON.parse(raw);
    return Response.json({ ok: true, config: toPublic(full) }, { headers });
  } catch (e) {
    return Response.json({ ok: false, error: e.message || "KV read failed" }, { status: 500, headers });
  }
}
