/**
 * CORS for credentialed requests: cannot use * with credentials.
 */
export function corsHeaders(request, methods, extra = {}) {
  const origin = request.headers.get("Origin") || "*";
  const allow = origin === "null" || !origin ? "*" : origin;
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": methods,
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Cookie",
    "Access-Control-Allow-Credentials": allow === "*" ? "false" : "true",
    Vary: "Origin",
    ...extra,
  };
}
