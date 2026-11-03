import { getAdminClient } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

/** GET /api/stats — dashboard KPIs and breakdowns. */
export async function GET() {
  const admin = getAdminClient();
  if (!admin) {
    return Response.json({ error: "Supabase service key missing." }, { status: 500 });
  }

  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);

  const [all, today, byClass, byArea, byType, bySource, latest, lastScan] =
    await Promise.all([
      admin.from("leads").select("id", { count: "exact", head: true }),
      admin
        .from("leads")
        .select("id", { count: "exact", head: true })
        .gte("discovered_at", startOfDay.toISOString()),
      admin.from("leads").select("lead_class"),
      admin.from("leads").select("preferred_area"),
      admin.from("leads").select("property_type"),
      admin.from("leads").select("source_platform"),
      admin.from("leads").select("*").order("discovered_at", { ascending: false }).limit(8),
      admin.from("scan_logs").select("*").order("started_at", { ascending: false }).limit(1),
    ]);

  if (all.error) return Response.json({ error: all.error.message }, { status: 500 });

  const tally = (rows, key) => {
    const map = {};
    (rows || []).forEach((r) => {
      const k = r[key] || "Unknown";
      map[k] = (map[k] || 0) + 1;
    });
    return map;
  };

  return Response.json({
    total_leads: all.count || 0,
    today_leads: today.count || 0,
    by_class: tally(byClass.data, "lead_class"),
    by_area: tally(byArea.data, "preferred_area"),
    by_type: tally(byType.data, "property_type"),
    by_source: tally(bySource.data, "source_platform"),
    latest: latest.data || [],
    last_scan: lastScan.data ? lastScan.data[0] : null,
  });
}
