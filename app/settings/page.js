"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AREAS } from "@/lib/constants";

const FIELDS = [
  {
    group: "1. Search API (required — pick ONE)",
    hint: "The radar searches Google-indexed public web pages through an authorized search API. Without one of these, no scanning is possible.",
    items: [
      { key: "serper_api_key", label: "Serper.dev API key", help: "Recommended. 2,500 free queries, no card. Get it at serper.dev → API Keys." },
      { key: "google_cse_api_key", label: "Google Programmable Search API key", help: "Free 100 queries/day. Google Cloud Console → Credentials → API key (Custom Search API enabled)." },
      { key: "google_cse_cx", label: "Google Programmable Search CX id", help: "programmablesearchengine.google.com → create engine (search entire web) → copy the CX id." },
    ],
  },
  {
    group: "2. AI qualification (required)",
    hint: "Classifies each post as Hot / Warm / General / Rejected with a confidence score and reason.",
    items: [
      { key: "openai_api_key", label: "OpenAI API key", help: "platform.openai.com → API keys. Uses the inexpensive gpt-4o-mini model." },
    ],
  },
  {
    group: "3. Email alerts for new Hot leads (optional)",
    hint: "Sends an email with the original post link whenever a new Hot Lead is discovered.",
    items: [
      { key: "resend_api_key", label: "Resend API key", help: "resend.com → API Keys. Free tier available." },
      { key: "alert_email", label: "Alert email address", help: "Where hot-lead alerts should be sent.", type: "email" },
      { key: "alert_from_email", label: "From address (optional)", help: "e.g. radar@yourdomain.com. Leave blank to use Resend's onboarding sender while testing." },
    ],
  },
  {
    group: "4. Telegram alerts for new Hot leads (optional)",
    hint: "Create a bot with @BotFather, send it any message, then open https://api.telegram.org/bot<TOKEN>/getUpdates to find your chat id.",
    items: [
      { key: "telegram_bot_token", label: "Telegram bot token" },
      { key: "telegram_chat_id", label: "Telegram chat id" },
    ],
  },
  {
    group: "5. Scan preferences",
    items: [
      { key: "area_filter", label: "Default scan area", type: "select", options: AREAS },
      { key: "openai_model", label: "AI model (optional)", help: "Default: gpt-4o-mini." },
    ],
  },
];

export default function SettingsForm() {
  const [values, setValues] = useState({});
  const [status, setStatus] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (!data.error) setValues(data.settings || {});
      else setStatus({ kind: "error", text: data.error });
      setLoaded(true);
    })();
  }, []);

  async function save() {
    setSaving(true);
    setStatus(null);
    const res = await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json();
    if (data.error) setStatus({ kind: "error", text: data.error });
    else setStatus({ kind: "ok", text: `Saved: ${data.saved.join(", ")}` });
    setSaving(false);
  }

  const setV = (k, v) => setValues((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16 pt-6 sm:px-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-navy-800">⚙️ API Connections & Settings</h1>
          <p className="text-xs text-navy-400">
            Keys are stored securely in your own Supabase database and are shown masked after saving.
          </p>
        </div>
        <Link className="btn-ghost !py-1.5" href="/">← Back to dashboard</Link>
      </header>

      {status && (
        <div
          className={`mb-4 rounded-xl px-4 py-3 text-sm ${
            status.kind === "error" ? "bg-red-50 text-red-700" : "bg-brand-50 text-brand-700"
          }`}
        >
          {status.text}
        </div>
      )}

      {!loaded ? (
        <p className="text-sm text-slate-400">Loading settings…</p>
      ) : (
        <div className="space-y-4">
          {FIELDS.map((g) => (
            <section key={g.group} className="card p-4 sm:p-5">
              <h2 className="text-sm font-bold text-navy-700">{g.group}</h2>
              {g.hint && <p className="mt-1 text-xs text-navy-400">{g.hint}</p>}
              <div className="mt-3 space-y-3">
                {g.items.map((item) => (
                  <div key={item.key}>
                    <label className="label" htmlFor={item.key}>{item.label}</label>
                    {item.type === "select" ? (
                      <select
                        id={item.key}
                        className="input"
                        value={values[item.key] || item.options[0]}
                        onChange={(e) => setV(item.key, e.target.value)}
                      >
                        {item.options.map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id={item.key}
                        className="input"
                        type={item.type || "text"}
                        value={values[item.key] || ""}
                        placeholder={item.key === "area_filter" ? "" : "paste key here…"}
                        onChange={(e) => setV(item.key, e.target.value)}
                      />
                    )}
                    {item.help && <p className="mt-1 text-xs text-slate-400">{item.help}</p>}
                  </div>
                ))}
              </div>
            </section>
          ))}

          <button className="btn-primary w-full" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "💾 Save settings"}
          </button>

          <section className="card p-4 text-xs text-navy-500">
            <h2 className="mb-2 text-sm font-bold text-navy-700">Sources that cannot be integrated (and why)</h2>
            <p>
              Facebook groups/posts (Meta's Groups API was deprecated in April 2024 and public-post
              search is not offered), Zameen, Graana and OLX Pakistan (no public buyer-request APIs —
              scraping them would bypass their access controls, which this app will not do). Buyer
              posts from these platforms still surface through the Google-indexed web search above.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
