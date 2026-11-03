import { getAdminClient } from "@/lib/supabaseClient";

export const dynamic = "force-dynamic";

/**
 * GET /api/leads — full lead list with server-side filtering.
 * Query params: q, lead_class, status, area, property_type,
 *               date_from, date_to, budget_min, budget_max,
 *               favourite_only, sort, dir, limit, offset
 */
export async function GET(request) {
  const admin = getAdminClient();
  if (!admin) {
    return Response.json(
      { error: "Supabase service key missing. Set SUPABASE_SERVICE_ROLE_KEY in Vercel environment variables." },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  let query = admin.from("leads").select("*", { count: "exact" });

  const q = (searchParams.get("q") || "").trim();
  if (q) {
    query = query.or(
      [
        `public_name.ilike.%${q}%`,
        `preferred_area.ilike.%${q}%`,
        `contact_phone.ilike.%${q}%`,
        `post_description.ilike.%${q}%`,
      ].join(",")
    );
  }
  const eq = (param, col) => {
    const v = searchParams.get(param);
    if (v && v !== "all") query = query.eq(col, v);
  };
  eq("lead_class", "lead_class");
  eq("status", "status");
  eq("area", "preferred_area");
  eq("property_type", "property_type");

  const dateFrom = searchParams.get("date_from");
  const dateTo = searchParams.get("date_to");
  if (dateFrom) query = query.gte("discovered_at", `${dateFrom}T00:00:00Z`);
  if (dateTo) query = query.lte("discovered_at", `${dateTo}T23:59:59Z`);

  const budgetMin = searchParams.get("budget_min");
  const budgetMax = searchParams.get("budget_max");
  if (budgetMin) query = query.gte("budget_lakh", Number(budgetMin));
  if (budgetMax) query = query.lte("budget_lakh", Number(budgetMax));

  if (searchParams.get("favourite_only") === "true") {
    query = query.eq("is_favourite", true);
  }

  const sort = searchParams.get("sort") || "discovered_at";
  const dir = searchParams.get("dir") === "asc" ? "asc" : "desc";
  query = query.order(sort, { ascending: dir === "asc" });

  const limit = Math.min(Number(searchParams.get("limit")) || 50, 500);
  const offset = Number(searchParams.get("offset")) || 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ leads: data || [], total: count || 0 });
}

/**
 * PATCH /api/leads?id=<id> — lead management actions.
 * Body may include: status, is_favourite, notes.
 */
export async function PATCH(request) {
  const admin = getAdminClient();
  if (!admin) {
    return Response.json({ error: "Supabase service key missing." }, { status: 500 });
  }
  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));
  if (!id) return Response.json({ error: "Missing lead id." }, { status: 400 });

  const body = await request.json().catch(() => ({}));
  const update = { updated_at: new Date().toISOString() };
  const validStatuses = ["New", "Contacted", "Interested", "Converted", "Removed"];
  if (body.status !== undefined) {
    if (!validStatuses.includes(body.status)) {
      return Response.json({ error: "Invalid status." }, { status: 400 });
    }
    update.status = body.status;
  }
  if (body.is_favourite !== undefined) update.is_favourite = Boolean(body.is_favourite);
  if (body.notes !== undefined) update.notes = String(body.notes).slice(0, 5000);

  const { data, error } = await admin
    .from("leads")
    .update(update)
    .eq("id", id)
    .select()
    .single();
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ lead: data });
}

/** DELETE /api/leads?id=<id> — permanently remove an irrelevant lead. */
export async function DELETE(request) {
  const admin = getAdminClient();
  if (!admin) {
    return Response.json({ error: "Supabase service key missing." }, { status: 500 });
  }
  const { searchParams } = new URL(request.url);
  const id = Number(searchParams.get("id"));
  if (!id) return Response.json({ error: "Missing lead id." }, { status: 400 });
  const { error } = await admin.from("leads").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
