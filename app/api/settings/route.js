import { getAdminClient } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

const ALLOWED_KEYS = new Set([
  "serper_api_key",
  "google_cse_api_key",
  "google_cse_cx",
  "openai_api_key",
  "openai_model",
  "resend_api_key",
  "alert_email",
  "alert_from_email",
  "telegram_bot_token",
  "telegram_chat_id",
  "area_filter",
]);

/** GET /api/settings — masked key status (never returns raw secrets). */
export async function GET() {
  const admin = getAdminClient();
  if (!admin) {
    return Response.json({ error: "Supabase service key missing." }, { status: 500 });
  }
  const { data, error } = await admin.from("app_settings").select("key,value");
  if (error) return Response.json({ error: error.message }, { status: 500 });

  const mask = (v) => {
    if (!v) return "";
    if (v.length <= 6) return "•".repeat(v.length);
    return v.slice(0, 3) + "•".repeat(Math.min(10, v.length - 6)) + v.slice(-3);
  };
  const out = {};
  (data || []).forEach((r) => {
    out[r.key] = ALLOWED_KEYS.has(r.key) ? mask(r.value) : "";
  });
  return Response.json({ settings: out });
}

/** POST /api/settings — save one or more settings { key: value, ... }. */
export async function POST(request) {
  const admin = getAdminClient();
  if (!admin) {
    return Response.json({ error: "Supabase service key missing." }, { status: 500 });
  }
  const body = await request.json().catch(() => ({}));
  const rows = [];
  for (const [key, value] of Object.entries(body)) {
    if (!ALLOWED_KEYS.has(key)) continue;
    if (typeof value === "string" && /•/.test(value)) continue; // don't overwrite masked values
    rows.push({ key, value: String(value ?? "") });
  }
  if (!rows.length) return Response.json({ error: "No valid settings supplied." }, { status: 400 });

  const { error } = await admin
    .from("app_settings")
    .upsert(rows, { onConflict: "key" });
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, saved: rows.map((r) => r.key) });
}
