# Lahore Property Buyer Radar — AI Lead Finder

An automated AI research app that finds **genuine people publicly asking to BUY property in
Lahore, Pakistan** (houses, residential/commercial plots, apartments, shops, offices,
agricultural/investment land), qualifies them with AI (Hot / Warm / General / Rejected +
confidence + reason), and alerts you the moment a Hot lead appears.

The app **never ships sample or fabricated leads** — the dashboard stays empty until real,
publicly posted buyer requests are discovered through the API keys you configure.

---

## 1. What you need (third-party credentials)

| Credential | Required? | Where to get it | Free tier |
|---|---|---|---|
| **Serper.dev API key** *or* **Google Programmable Search (API key + CX)** | ✅ Required (one of the two) | serper.dev · programmablesearchengine.google.com + Google Cloud Console | Serper: 2,500 free queries · Google CSE: 100 queries/day |
| **OpenAI API key** | ✅ Required | platform.openai.com → API keys | Pay-as-you-go, pennies per scan (gpt-4o-mini) |
| Resend API key + your email | Optional (email alerts) | resend.com | Free tier |
| Telegram bot token + chat id | Optional (Telegram alerts) | @BotFather | Free |
| Supabase project | ✅ Required | supabase.com | Free tier |

**Sources that are intentionally NOT integrated** (shown honestly in the dashboard):
- **Facebook** — Meta deprecated the Groups API (April 2024) and the Graph API cannot search
  public posts/groups. No scraping/login bypass is done. Buyer posts from Facebook still appear
  via Google-indexed search.
- **Instagram** — official hashtag search works only through an Instagram *Business* account
  linked to a Meta app (30 unique hashtags / 7 days). Not enabled by default.
- **Zameen, Graana, OLX Pakistan** — no public buyer-request APIs; scraping would bypass their
  access controls, so the app refuses to do it.

## 2. One-time setup (≈ 15 minutes)

### Step 1 — Supabase
1. Create a free project at supabase.com.
2. SQL Editor → paste the whole of **`supabase/schema.sql`** → Run. (This creates all tables,
   indexes, realtime and security settings.)
3. Project Settings → API: copy the **Project URL**, **anon key** and **service_role key**.

### Step 2 — Vercel
1. Push this folder to a GitHub repo (or use Vercel CLI: `vercel`).
2. Import the repo on vercel.com → Framework preset: **Next.js**.
3. Add Environment Variables (Project → Settings → Environment Variables):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SCAN_SECRET` (optional — a random password that protects the scan endpoint)
4. Deploy. Open your app URL.

### Step 3 — In the app
1. Open **⚙️ Settings** and paste your search-API key, OpenAI key and (optionally)
   email/Telegram details. Press **Save settings**.
2. Press **▶ Run scan now** on the dashboard. Real buyer posts start appearing.
3. Tick favourites, mark leads Contacted / Interested / Converted, add notes, export to
   Excel/CSV.

## 3. Automatic every-minute scanning

Vercel Hobby cron runs **at most once a day** (`vercel.json` ships with a daily 06:00 UTC run).
For per-minute automation, enable it inside Supabase (free):

1. Supabase Dashboard → Database → Extensions → enable **pg_cron** and **pg_net**.
2. SQL Editor → run the commented block at the bottom of **`supabase/schema.sql`**
   (replace `<PROJECT-REF>` and `<SUPABASE_ANON_KEY>` with your values).

Supabase will then POST `/api/scan` **every minute**, free of charge, forever. Each scan batch
rotates through the keyword list (English / Roman Urdu / Urdu / Hindi) and area focus.
The dashboard shows the exact last-scan time and result for full transparency, and each
source displays its own permitted refresh interval and last successful sync.

## 4. Install on Android

Open the deployed URL in Chrome → ⋮ menu → **Add to Home screen / Install app**.
It runs full-screen as a PWA (details also at `/install` in the app).

## 5. Privacy & compliance

- Only public, search-engine-indexed posts are collected.
- No logins, CAPTCHAs or access controls are bypassed.
- Contact details are stored **only when publicly shown in the post text**; everything else is
  shown as **“Not available”** — never invented.
- Honour removal requests: deleting a lead in the dashboard removes it permanently.

## 6. Project layout

```
app/                     Next.js App Router (dashboard, settings, install, offline)
  api/leads|stats|sources|scan|scan-logs|settings/   backend routes
components/              LeadCard, ExportButtons
lib/                     supabase client, search connector, AI classifier, alerts
supabase/schema.sql      complete database (run once in SQL Editor)
public/                  PWA manifest + service worker
vercel.json              cron fallback (daily on Hobby plan)
```
