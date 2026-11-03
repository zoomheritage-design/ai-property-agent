import { getAdminClient } from "@/lib/supabaseClient";
import { fetchSearchResults } from "@/lib/searchConnector";
import { classifyLead } from "@/lib/aiClassifier";
import { dispatchHotLeadAlerts } from "@/lib/notifications";
import { computeDedupeHash, extractPhone, extractBudget } from "@/lib/extract";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SOURCE_LABEL = "Google-indexed public web";

/** Load app settings (API keys) from Supabase. */
async function loadSettings(admin) {
  const { data, error } = await admin.from("app_settings").select("key,value");
  if (error) throw new Error(`Cannot read app_settings: ${error.message}`);
  const map = {};
  (data || []).forEach((r) => (map[r.key] = r.value));
  return map;
}

/**
 * POST /api/scan — runs one discovery batch:
 * search -> AI-qualify -> dedupe -> store -> alert on new Hot Leads.
 * Triggered manually from the dashboard or automatically by Supabase cron
 * (pg_cron + pg_net) every minute, or by Vercel cron (min daily on Hobby).
 */
export async function POST(request) {
  const admin = getAdminClient();
  if (!admin) {
    return Response.json(
      { error: "Supabase service key missing. Set SUPABASE_SERVICE_ROLE_KEY in environment variables." },
      { status: 500 }
    );
  }

  // Simple shared-secret guard for the cron endpoint (optional).
  const url = new URL(request.url);
  const secret = process.env.SCAN_SECRET;
  if (secret) {
    const provided =
      request.headers.get("x-scan-secret") || url.searchParams.get("secret");
    if (provided !== secret) {
      return Response.json({ error: "Unauthorized." }, { status: 401 });
    }
  }

  const { searchParams } = new URL(request.url);
  const area = searchParams.get("area") || "All Lahore";
  const batchOffset = Number(searchParams.get("offset")) || Math.floor(Date.now() / 60000); // rotates keywords every minute

  let settings;
  try {
    settings = await loadSettings(admin);
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 });
  }
  if (settings.area_filter && area === "All Lahore" && searchParams.get("area") === null) {
    // Respect the area saved on the Settings page for automated runs.
    const savedArea = settings.area_filter;
    if (savedArea && savedArea !== "All Lahore") {
      // fall through using savedArea below
      searchParams.set("area", savedArea);
    }
  }
  const effectiveArea = searchParams.get("area") || "All Lahore";

  const { data: logRow, error: logErr } = await admin
    .from("scan_logs")
    .insert({ status: "running", trigger: "manual", keywords_used: 1 })
    .select("id")
    .single();
  if (logErr) return Response.json({ error: logErr.message }, { status: 500 });
  const logId = logRow.id;

  try {
    // ---------- 1. Search ----------
    const results = await fetchSearchResults(settings, {
      area: effectiveArea,
      batchOffset,
      num: 10,
    });

    let newLeads = 0;
    let hotLeads = 0;
    const inserted = [];

    for (const r of results) {
      if (!r.url || !r.snippet) continue;
      const dedupeHash = computeDedupeHash({ postUrl: r.url, title: r.title, snippet: r.snippet });

      // ---------- 2. AI qualification ----------
      let ai;
      try {
        ai = await classifyLead({ ...r, settings });
      } catch (e) {
        // Log AI failure once on the scan log, keep scanning other posts.
        await admin.from("scan_logs").update({ error_message: e.message.slice(0, 500) }).eq("id", logId);
        continue;
      }

      if (ai.lead_class === "Rejected") continue;

      // ---------- 3. Dedupe + store ----------
      const row = {
        dedupe_hash: dedupeHash,
        post_published_at: null, // search APIs rarely expose exact post time; shown as Not available
        public_name: ai.public_name || "Not available",
        post_url: r.url,
        source_platform: SOURCE_LABEL,
        post_description: `${r.title || ""}\n\n${r.snippet || ""}`.trim(),
        property_type: ai.property_type,
        plot_size: ai.plot_size,
        preferred_area: ai.preferred_area,
        budget: ai.budget,
        purchase_timeline: ai.purchase_timeline,
        contact_phone: ai.contact_phone !== "Not available" ? ai.contact_phone : extractPhone(`${r.title} ${r.snippet}`),
        business_contact: ai.business_contact,
        other_contact: ai.other_contact,
        ai_summary: ai.ai_summary,
        lead_class: ai.lead_class,
        confidence: ai.confidence,
        classification_reason: ai.reason,
      };

      const { data: upserted, error: upErr } = await admin
        .from("leads")
        .upsert(row, { onConflict: "dedupe_hash", ignoreDuplicates: true })
        .select()
        .single();

      if (upErr) {
        // Unique violation means duplicate — ignore; anything else is real.
        if (!/duplicate key/i.test(upErr.message)) {
          await admin.from("scan_logs").update({ error_message: upErr.message.slice(0, 500) }).eq("id", logId);
        }
        continue;
      }
      if (!upserted) continue; // duplicate skipped by ignoreDuplicates

      newLeads += 1;
      inserted.push(upserted);
      if (upserted.lead_class === "Hot Lead") hotLeads += 1;
    }

    // ---------- 4. Alerts for new HOT leads ----------
    const alertResults = [];
    for (const lead of inserted.filter((l) => l.lead_class === "Hot Lead")) {
      const r = await dispatchHotLeadAlerts(settings, lead);
      alertResults.push(...r);
    }

    // ---------- 5. Update sync status + finish log ----------
    await admin
      .from("source_sync")
      .update({ last_success_at: new Date().toISOString(), last_error: null })
      .eq("source_key", "google_indexed_web");

    await admin
      .from("scan_logs")
      .update({
        status: "success",
        finished_at: new Date().toISOString(),
        results_seen: results.length,
        new_leads: newLeads,
        hot_leads: hotLeads,
        error_message: null,
      })
      .eq("id", logId);

    return Response.json({
      ok: true,
      scan_id: logId,
      area: effectiveArea,
      results_seen: results.length,
      new_leads: newLeads,
      hot_leads: hotLeads,
      alerts: alertResults,
    });
  } catch (e) {
    await admin
      .from("scan_logs")
      .update({
        status: "error",
        finished_at: new Date().toISOString(),
        error_message: String(e.message || e).slice(0, 800),
      })
      .eq("id", logId);
    await admin
      .from("source_sync")
      .update({ last_error: String(e.message || e).slice(0, 500) })
      .eq("source_key", "google_indexed_web");
    return Response.json({ error: String(e.message || e), scan_id: logId }, { status: 502 });
  }
}

export async function GET() {
  return Response.json(
    { info: "POST to this endpoint to run a scan batch. Protected by SCAN_SECRET if set." },
    { status: 405 }
  );
}
