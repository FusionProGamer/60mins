export function onRequestGet({ env }) {
  return Response.json({
    ok: true,
    model: env.GEMINI_MODEL || "gemini-3.8-flash",
    has_key: Boolean(env.GEMINI_API_KEY),
  });
}
