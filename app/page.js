"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import LeadCard from "@/components/LeadCard";
import ExportButtons from "@/components/ExportButtons";
import { AREAS, PROPERTY_TYPES, SOURCE_STATUS } from "@/lib/constants";

const CLASSES = ["Hot Lead", "Warm Lead", "General Lead"];
const STATUSES = ["New", "Contacted", "Interested", "Converted", "Removed"];

function StatCard({ label, value, accent, icon }) {
  return (
    <div className="card flex items-center gap-4 p-4">
      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${accent}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-navy-400">{label}</p>
        <p className="text-2xl font-bold text-navy-800">{value}</p>
      </div>
    </div>
  );
}

function Bars({ title, data, color }) {
  const entries = Object.entries(data || {}).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const max = Math.max(1, ...entries.map(([, v]) => v));
  return (
    <div className="card p-4">
      <h3 className="mb-3 text-sm font-bold text-navy-700">{title}</h3>
      {entries.length === 0 ? (
        <p className="text-sm text-slate-400">No data yet — run a scan.</p>
      ) : (
        <div className="space-y-2">
          {entries.map(([k, v]) => (
            <div key={k} className="flex items-center gap-2 text-xs">
              <span className="w-28 shrink-0 truncate text-navy-500" title={k}>{k}</span>
              <div className="h-2.5 flex-1 rounded-full bg-slate-100">
                <div
                  className={`h-2.5 rounded-full ${color}`}
                  style={{ width: `${Math.max(6, (v / max) * 100)}%` }}
                />
              </div>
              <span className="w-6 text-right font-semibold text-navy-700">{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [sources, setSources] = useState([]);
  const [scanLogs, setScanLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [banner, setBanner] = useState(null);
  const [newHotCount, setNewHotCount] = useState(0);
  const [showLogs, setShowLogs] = useState(false);
  const lastScanAtRef = useRef(null);

  const [filters, setFilters] = useState({
    q: "",
    lead_class: "all",
    status: "all",
    area: "all",
    property_type: "all",
    date_from: "",
    date_to: "",
    budget_min: "",
    budget_max: "",
    favourite_only: false,
    sort: "discovered_at",
    dir: "desc",
  });

  const buildParams = useMemo(() => {
    const p = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v && v !== "all") p.set(k, v);
    });
    return p;
  }, [filters]);

  const loadStats = useCallback(async () => {
    const res = await fetch("/api/stats");
    const data = await res.json();
    if (!data.error) setStats(data);
  }, []);

  const loadLeads = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/leads?${buildParams}`);
    const data = await res.json();
    if (data.error) setBanner({ kind: "error", text: data.error });
    else {
      setLeads(data.leads || []);
      setTotal(data.total || 0);
    }
    setLoading(false);
  }, [buildParams]);

  const loadMeta = useCallback(async () => {
    const [s, l] = await Promise.all([fetch("/api/sources"), fetch("/api/scan-logs")]);
    const sd = await s.json();
    const ld = await l.json();
    if (!sd.error) setSources(sd.sources || []);
    if (!ld.error) setScanLogs(ld.logs || []);
  }, []);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  useEffect(() => {
    loadStats();
    loadMeta();
    const iv = setInterval(() => {
      loadStats();
      loadMeta();
    }, 60000);
    return () => clearInterval(iv);
  }, [loadStats, loadMeta]);

  // Realtime: refresh when a scan inserts new leads, notify on new Hot Leads.
  useEffect(() => {
    let channel = null;
    (async () => {
      const { createClient } = await import("@supabase/supabase-js");
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !key) return;
      const sb = createClient(url, key, { auth: { persistSession: false } });
      channel = sb
        .channel("leads-live")
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "leads" }, (payload) => {
          loadLeads();
          loadStats();
          if (payload.new?.lead_class === "Hot Lead") {
            setNewHotCount((c) => c + 1);
          }
        })
        .subscribe();
    })();
    return () => {
      if (channel) channel.unsubscribe();
    };
  }, [loadLeads, loadStats]);

  async function runScan() {
    setScanning(true);
    setBanner(null);
    try {
      const areaParam = filters.area !== "all" ? filters.area : "";
      const res = await fetch(`/api/scan${areaParam ? `?area=${encodeURIComponent(areaParam)}` : ""}`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.error) setBanner({ kind: "error", text: `Scan problem: ${data.error}` });
      else
        setBanner({
          kind: "ok",
          text: `Scan finished: ${data.results_seen} posts checked, ${data.new_leads} new leads, ${data.hot_leads} hot.`,
        });
      await Promise.all([loadLeads(), loadStats(), loadMeta()]);
    } catch (e) {
      setBanner({ kind: "error", text: String(e.message || e) });
    } finally {
      setScanning(false);
    }
  }

  async function onUpdateLead(id, body) {
    const res = await fetch(`/api/leads?id=${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (data.error) {
      setBanner({ kind: "error", text: data.error });
      return;
    }
    setLeads((prev) => prev.map((l) => (l.id === id ? data.lead : l)));
  }

  async function onDeleteLead(id) {
    const res = await fetch(`/api/leads?id=${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.error) {
      setBanner({ kind: "error", text: data.error });
      return;
    }
    setLeads((prev) => prev.filter((l) => l.id !== id));
    loadStats();
  }

  const setF = (k, v) => setFilters((f) => ({ ...f, [k]: v }));

  const lastScan = stats?.last_scan;
  const hotCount = stats?.by_class?.["Hot Lead"] || 0;
  const warmCount = stats?.by_class?.["Warm Lead"] || 0;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-6 sm:px-6">
      {/* Header */}
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-2xl text-white shadow">
            🏙️
          </div>
          <div>
            <h1 className="text-lg font-extrabold leading-tight text-navy-800 sm:text-xl">
              LAHORE PROPERTY BUYER RADAR
            </h1>
            <p className="text-xs text-navy-400">AI Lead Finder · genuine property buyers in Lahore</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {newHotCount > 0 && (
            <span className="badge bg-red-100 text-red-700">🔥 {newHotCount} new hot lead(s)</span>
          )}
          <a className="btn-ghost !py-1.5" href="/settings">
            ⚙️ Settings
          </a>
          <button className="btn-primary !py-1.5" onClick={runScan} disabled={scanning}>
            {scanning ? "Scanning…" : "▶ Run scan now"}
          </button>
        </div>
      </header>

      {banner && (
        <div
          className={`mb-4 rounded-xl px-4 py-3 text-sm ${
            banner.kind === "error" ? "bg-red-50 text-red-700" : "bg-brand-50 text-brand-700"
          }`}
        >
          {banner.text}
        </div>
      )}

      {/* KPI cards */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total buyer leads" value={stats?.total_leads ?? "—"} accent="bg-brand-100 text-brand-700" icon="🎯" />
        <StatCard label="Today's new leads" value={stats?.today_leads ?? "—"} accent="bg-sky-100 text-sky-700" icon="🆕" />
        <StatCard label="Hot leads" value={stats ? hotCount : "—"} accent="bg-red-100 text-red-700" icon="🔥" />
        <StatCard label="Warm leads" value={stats ? warmCount : "—"} accent="bg-amber-100 text-amber-700" icon="🌤️" />
      </section>

      {/* Automation status */}
      <section className="card mt-4 flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
        <div>
          <p className="font-semibold text-navy-700">Automation status</p>
          <p className="text-xs text-navy-400">
            Last scan:{" "}
            {lastScan ? (
              <>
                {new Date(lastScan.started_at).toLocaleString()} —{" "}
                <span
                  className={lastScan.status === "success" ? "text-brand-600" : "text-red-500"}
                >
                  {lastScan.status}
                </span>
                {lastScan.error_message ? ` (${lastScan.error_message})` : ""}
              </>
            ) : (
              "no scan has run yet"
            )}
          </p>
        </div>
        <button className="btn-ghost !py-1.5" onClick={() => setShowLogs((s) => !s)}>
          {showLogs ? "Hide scan history" : "Scan history"}
        </button>
      </section>

      {showLogs && (
        <section className="card mt-3 overflow-x-auto p-4">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead className="text-navy-400">
              <tr>
                <th className="py-1">Started</th>
                <th>Status</th>
                <th>Trigger</th>
                <th>Posts seen</th>
                <th>New</th>
                <th>Hot</th>
                <th>Error</th>
              </tr>
            </thead>
            <tbody>
              {scanLogs.length === 0 && (
                <tr>
                  <td colSpan="7" className="py-3 text-slate-400">No scans logged yet.</td>
                </tr>
              )}
              {scanLogs.map((l) => (
                <tr key={l.id} className="border-t border-slate-100">
                  <td className="py-1.5">{new Date(l.started_at).toLocaleString()}</td>
                  <td>{l.status}</td>
                  <td>{l.trigger}</td>
                  <td>{l.results_seen}</td>
                  <td>{l.new_leads}</td>
                  <td>{l.hot_leads}</td>
                  <td className="max-w-[220px] truncate text-red-500" title={l.error_message || ""}>
                    {l.error_message || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Source transparency */}
      <section className="card mt-4 p-4">
        <h3 className="mb-2 text-sm font-bold text-navy-700">Source availability (honest status)</h3>
        <ul className="space-y-1.5 text-xs">
          {Object.entries(SOURCE_STATUS).map(([key, s]) => {
            const sync = sources.find((x) => x.source_key === key);
            const ok = s.status === "available";
            return (
              <li key={key} className="flex flex-wrap items-baseline gap-x-2">
                <span className={`badge ${ok ? "bg-brand-100 text-brand-700" : "bg-slate-200 text-slate-600"}`}>
                  {ok ? "AVAILABLE" : s.status === "restricted" ? "RESTRICTED" : "UNAVAILABLE"}
                </span>
                <span className="font-semibold text-navy-700">{s.label}</span>
                <span className="text-navy-400">{s.note}</span>
                {sync?.last_success_at && (
                  <span className="text-navy-300">
                    · last sync {new Date(sync.last_success_at).toLocaleString()}
                  </span>
                )}
                {sync?.last_error && (
                  <span className="text-red-500">· last error: {sync.last_error}</span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* Breakdowns */}
      <section className="mt-4 grid gap-3 md:grid-cols-3">
        <Bars title="Area-wise leads" data={stats?.by_area} color="bg-brand-500" />
        <Bars title="Property types" data={stats?.by_type} color="bg-navy-500" />
        <Bars title="Sources" data={stats?.by_source} color="bg-amber-500" />
      </section>

      {/* Filters */}
      <section className="card mt-4 p-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <div className="col-span-2 sm:col-span-3 lg:col-span-4">
            <label className="label" htmlFor="f-q">Search name, area, phone or text</label>
            <input
              id="f-q"
              className="input"
              placeholder="e.g. DHA, 0321…, ghar chahiye"
              value={filters.q}
              onChange={(e) => setF("q", e.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="f-class">Lead class</label>
            <select id="f-class" className="input" value={filters.lead_class} onChange={(e) => setF("lead_class", e.target.value)}>
              <option value="all">All classes</option>
              {CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="f-status">Status</label>
            <select id="f-status" className="input" value={filters.status} onChange={(e) => setF("status", e.target.value)}>
              <option value="all">All statuses</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="f-area">Area</label>
            <select id="f-area" className="input" value={filters.area} onChange={(e) => setF("area", e.target.value)}>
              <option value="all">All areas</option>
              {AREAS.filter((a) => a !== "All Lahore").map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="f-type">Property type</label>
            <select id="f-type" className="input" value={filters.property_type} onChange={(e) => setF("property_type", e.target.value)}>
              <option value="all">All types</option>
              {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="f-from">From date</label>
            <input id="f-from" type="date" className="input" value={filters.date_from} onChange={(e) => setF("date_from", e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="f-to">To date</label>
            <input id="f-to" type="date" className="input" value={filters.date_to} onChange={(e) => setF("date_to", e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="f-bmin">Budget min (lakh PKR)</label>
            <input id="f-bmin" type="number" className="input" value={filters.budget_min} onChange={(e) => setF("budget_min", e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="f-bmax">Budget max (lakh PKR)</label>
            <input id="f-bmax" type="number" className="input" value={filters.budget_max} onChange={(e) => setF("budget_max", e.target.value)} />
          </div>
          <label className="flex items-center gap-2 self-end text-sm text-navy-600">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-slate-300"
              checked={filters.favourite_only}
              onChange={(e) => setF("favourite_only", e.target.checked)}
            />
            Favourites only
          </label>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-navy-400">
            {loading ? "Loading leads…" : `${total} lead(s) match the filters`}
          </p>
          <ExportButtons leads={leads} filters={Object.fromEntries(buildParams)} />
        </div>
      </section>

      {/* Leads */}
      <section className="mt-4 space-y-3">
        {!loading && leads.length === 0 && (
          <div className="card p-8 text-center text-sm text-slate-400">
            No buyer leads yet. Configure your API keys on the{" "}
            <a className="text-brand-600 underline" href="/settings">Settings</a> page, then press
            “Run scan now”. The app never shows fabricated leads — this list only fills with real,
            publicly posted buyer requests.
          </div>
        )}
        {leads.map((lead) => (
          <LeadCard key={lead.id} lead={lead} onUpdate={onUpdateLead} onDelete={onDeleteLead} />
        ))}
      </section>

      <footer className="mt-10 text-center text-xs text-slate-400">
        Lahore Property Buyer Radar · finds only publicly posted buyer intent · no logins or private
        data are ever bypassed · missing information is always shown as “Not available”.
      </footer>
    </div>
  );
}
