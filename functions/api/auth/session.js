import { corsHeaders } from "../../lib/cors.js";
import { getAdminFromRequest } from "../../lib/admin-auth.js";

export async function onRequestOptions({ request }) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request, "GET, OPTIONS", { "Content-Type": "application/json" }),
  });
}

export async function onRequestGet({ request, env }) {
  const headers = { ...corsHeaders(request, "GET, OPTIONS"), "Content-Type": "application/json" };
  const admin = await getAdminFromRequest(request, env);
  if (!admin) {
    return Response.json({ signedIn: false }, { headers });
  }
  return Response.json({ signedIn: true, email: admin.email }, { headers });
}
