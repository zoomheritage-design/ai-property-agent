"use client";

import { useMemo, useState } from "react";

const CLASS_STYLES = {
  "Hot Lead": "bg-red-100 text-red-700",
  "Warm Lead": "bg-amber-100 text-amber-700",
  "General Lead": "bg-sky-100 text-sky-700",
  Rejected: "bg-slate-200 text-slate-600",
};

const STATUS_STYLES = {
  New: "bg-brand-100 text-brand-700",
  Contacted: "bg-indigo-100 text-indigo-700",
  Interested: "bg-purple-100 text-purple-700",
  Converted: "bg-emerald-100 text-emerald-700",
  Removed: "bg-slate-200 text-slate-600",
};

function fmt(dt) {
  if (!dt) return "Not available";
  const d = new Date(dt);
  if (isNaN(d.getTime())) return "Not available";
  return d.toLocaleString();
}

function confPct(c) {
  const n = Number(c);
  if (!isFinite(n) || n <= 0) return "Not available";
  return `${Math.round(n * 100)}%`;
}

export default function LeadCard({ lead, onUpdate, onDelete }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(lead.notes || "");
  const [saving, setSaving] = useState(false);

  const isNA = (v) => !v || v === "Not available";

  async function patch(body) {
    setSaving(true);
    await onUpdate(lead.id, body);
    setSaving(false);
  }

  const details = useMemo(
    () => [
      ["Property type", lead.property_type],
      ["Plot size", lead.plot_size],
      ["Preferred area", lead.preferred_area],
      ["Budget", lead.budget],
      ["Purchase timeline", lead.purchase_timeline],
      ["Contact phone", lead.contact_phone],
      ["Business contact", lead.business_contact],
      ["Other contact", lead.other_contact],
      ["Posted at", fmt(lead.post_published_at)],
      ["Discovered at", fmt(lead.discovered_at)],
      ["Source", lead.source_platform],
      ["AI confidence", confPct(lead.confidence)],
      ["Classification reason", lead.classification_reason],
    ],
    [lead]
  );

  return (
    <div className="card p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`badge ${CLASS_STYLES[lead.lead_class] || "bg-slate-100"}`}>
              {lead.lead_class}
            </span>
            <span className={`badge ${STATUS_STYLES[lead.status] || "bg-slate-100"}`}>
              {lead.status}
            </span>
            {lead.is_favourite && <span title="Favourite">⭐</span>}
          </div>
          <p className="mt-2 line-clamp-2 text-sm font-medium text-navy-800">
            {lead.ai_summary && lead.ai_summary !== "Not available"
              ? lead.ai_summary
              : lead.post_description?.slice(0, 180)}
          </p>
          <p className="mt-1 text-xs text-navy-400">
            {lead.preferred_area} · {lead.property_type} ·{" "}
            {isNA(lead.budget) ? "Budget not available" : lead.budget}
          </p>
        </div>
        <button
          className="text-lg leading-none text-slate-400 hover:text-amber-500"
          title={lead.is_favourite ? "Remove favourite" : "Mark favourite"}
          onClick={() => patch({ is_favourite: !lead.is_favourite })}
        >
          {lead.is_favourite ? "★" : "☆"}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <a className="btn-ghost !py-1.5" href={lead.post_url} target="_blank" rel="noopener noreferrer">
          🔗 Original post
        </a>
        {["Contacted", "Interested", "Converted"].map((s) => (
          <button
            key={s}
            disabled={saving || lead.status === s}
            className={`btn-ghost !py-1.5 ${lead.status === s ? "!bg-brand-50 !border-brand-400 !text-brand-700" : ""}`}
            onClick={() => patch({ status: s })}
          >
            {s}
          </button>
        ))}
        <button
          className="btn-ghost !py-1.5"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Hide details" : "Details / Notes"}
        </button>
        <button
          className="btn-danger !py-1.5"
          title="Remove this lead permanently"
          onClick={() => {
            if (confirm("Remove this lead permanently?")) onDelete(lead.id);
          }}
        >
          🗑 Remove
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            {details.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3 border-b border-dashed border-slate-100 pb-1">
                <dt className="text-navy-400">{k}</dt>
                <dd className={`text-right font-medium ${isNA(v) ? "text-slate-400 italic" : "text-navy-800"}`}>
                  {isNA(v) ? "Not available" : String(v)}
                </dd>
              </div>
            ))}
          </dl>
          <div>
            <p className="label">Post description (exact)</p>
            <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-xl bg-slate-50 p-3 text-xs text-navy-700">
              {lead.post_description}
            </pre>
          </div>
          <div>
            <label className="label" htmlFor={`notes-${lead.id}`}>Personal notes</label>
            <textarea
              id={`notes-${lead.id}`}
              className="input min-h-[70px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Your private notes about this lead…"
            />
            <button
              className="btn-primary mt-2 !py-1.5"
              disabled={saving || notes === (lead.notes || "")}
              onClick={() => patch({ notes })}
            >
              {saving ? "Saving…" : "Save notes"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
