import { getAdminClient } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

/** GET /api/sources — per-source availability + last sync times. */
export async function GET() {
  const admin = getAdminClient();
  if (!admin) {
    return Response.json({ error: "Supabase service key missing." }, { status: 500 });
  }
  const { data, error } = await admin
    .from("source_sync")
    .select("*")
    .order("source_key");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ sources: data || [] });
}
