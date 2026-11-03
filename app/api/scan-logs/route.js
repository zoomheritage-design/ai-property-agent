import { getAdminClient } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

/**
 * GET /api/scan-logs — recent scan history (automation transparency).
 */
export async function GET() {
  const admin = getAdminClient();
  if (!admin) {
    return Response.json({ error: "Supabase service key missing." }, { status: 500 });
  }
  const { data, error } = await admin
    .from("scan_logs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(20);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ logs: data || [] });
}
