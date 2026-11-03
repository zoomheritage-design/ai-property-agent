"use client";

import { useEffect, useState } from "react";
import * as XLSX from "xlsx";

export default function ExportButtons({ leads, filters }) {
  const [busy, setBusy] = useState(false);

  async function fetchAll() {
    // Export respects the currently applied filters, up to 5000 rows.
    const params = new URLSearchParams(filters);
    params.set("limit", "5000");
    const res = await fetch(`/api/leads?${params}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);
    return data.leads || [];
  }

  const columns = [
    ["id", "Serial No"],
    ["discovered_at", "Discovered At"],
    ["post_published_at", "Original Post At"],
    ["public_name", "Public Name"],
    ["post_url", "Post URL"],
    ["source_platform", "Source Platform"],
    ["post_description", "Post Description"],
    ["property_type", "Property Type"],
    ["plot_size", "Plot Size"],
    ["preferred_area", "Preferred Area"],
    ["budget", "Budget"],
    ["purchase_timeline", "Purchase Timeline"],
    ["contact_phone", "Contact Phone"],
    ["business_contact", "Business Contact"],
    ["other_contact", "Other Contact"],
    ["ai_summary", "AI Summary"],
    ["lead_class", "Lead Class"],
    ["confidence", "AI Confidence"],
    ["classification_reason", "Classification Reason"],
    ["status", "Status"],
    ["is_favourite", "Favourite"],
    ["notes", "Notes"],
  ];

  async function doExport(kind) {
    setBusy(true);
    try {
      const rows = await fetchAll();
      if (!rows.length) {
        alert("No leads match the current filters — nothing to export.");
        return;
      }
      const aoa = [columns.map(([, h]) => h)];
      rows.forEach((r) =>
        aoa.push(
          columns.map(([k]) => {
            const v = r[k];
            if (v === null || v === undefined || v === "") return "Not available";
            if (k === "discovered_at" || k === "post_published_at") {
              const d = new Date(v);
              return isNaN(d.getTime()) ? "Not available" : d.toLocaleString();
            }
            return typeof v === "boolean" ? (v ? "Yes" : "No") : v;
          })
        )
      );
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Buyer Leads");
      const stamp = new Date().toISOString().slice(0, 10);
      if (kind === "xlsx") {
        XLSX.writeFile(wb, `lahore-buyer-leads-${stamp}.xlsx`);
      } else {
        const csv = XLSX.utils.sheet_to_csv(ws);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `lahore-buyer-leads-${stamp}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
      }
    } catch (e) {
      alert(`Export failed: ${e.message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex gap-2">
      <button className="btn-ghost !py-1.5" disabled={busy} onClick={() => doExport("xlsx")}>
        📊 Excel
      </button>
      <button className="btn-ghost !py-1.5" disabled={busy} onClick={() => doExport("csv")}>
        📄 CSV
      </button>
    </div>
  );
}
