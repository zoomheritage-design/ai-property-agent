-- =====================================================================
-- LAHORE PROPERTY BUYER RADAR - complete database schema
-- Run this once in: Supabase Dashboard -> SQL Editor -> New query
-- =====================================================================

-- ---------------- LEADS ----------------
create table if not exists public.leads (
  id                    bigserial primary key,
  dedupe_hash           text unique not null,
  post_published_at     timestamptz,            -- date/time of the original post
  discovered_at         timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  public_name           text not null default 'Not available',
  post_url              text not null,
  source_platform       text not null,
  post_description      text not null,
  property_type         text not null default 'Unspecified',
  plot_size             text not null default 'Not available',
  preferred_area        text not null default 'Not available',
  budget                text not null default 'Not available',
  purchase_timeline     text not null default 'Not available',
  contact_phone         text not null default 'Not available',
  business_contact      text not null default 'Not available',
  other_contact         text not null default 'Not available',
  ai_summary            text not null default 'Not available',
  lead_class            text not null default 'General Lead'
                        check (lead_class in ('Hot Lead','Warm Lead','General Lead','Rejected')),
  confidence            numeric(4,3) not null default 0,
  classification_reason text not null default 'Not available',
  status                text not null default 'New'
                        check (status in ('New','Contacted','Interested','Converted','Removed')),
  is_favourite          boolean not null default false,
  notes                 text not null default ''
);

create index if not exists leads_class_idx   on public.leads (lead_class);
create index if not exists leads_status_idx  on public.leads (status);
create index if not exists leads_area_idx    on public.leads (preferred_area);
create index if not exists leads_discovered_idx on public.leads (discovered_at desc);

-- ---------------- SOURCE SYNC STATUS ----------------
create table if not exists public.source_sync (
  source_key        text primary key,          -- e.g. 'google_indexed_web'
  label             text not null,
  status            text not null,             -- 'available' | 'restricted' | 'unavailable_or_restricted'
  last_success_at   timestamptz,
  last_error        text,
  permitted_note    text not null default ''
);

insert into public.source_sync (source_key, label, status, permitted_note) values
  ('google_indexed_web', 'Google-indexed public web', 'available',
   'Primary source. Refresh interval follows your search-API plan (Google CSE: 100 free queries/day).'),
  ('facebook', 'Facebook public posts & groups', 'unavailable_or_restricted',
   'Meta deprecated the Groups API in April 2024; the Graph API cannot search public posts/groups. Buyer posts are still found via Google-indexed search.'),
  ('instagram', 'Instagram', 'restricted',
   'Official hashtag search requires an Instagram Business account linked to a Meta app (max 30 unique hashtags / 7 days).'),
  ('zameen', 'Zameen.com', 'unavailable_or_restricted',
   'No public buyer-request API; scraping would bypass access controls.'),
  ('graana', 'Graana.com', 'unavailable_or_restricted',
   'No public developer API for buyer requests.'),
  ('olx_pakistan', 'OLX Pakistan', 'unavailable_or_restricted',
   'No authorized public API. Buyer ("wanted") posts may surface via Google-indexed search.')
on conflict (source_key) do nothing;

-- ---------------- SCAN / JOB LOGS ----------------
create table if not exists public.scan_logs (
  id             bigserial primary key,
  started_at     timestamptz not null default now(),
  finished_at    timestamptz,
  status         text not null default 'running',   -- running | success | error
  trigger        text not null default 'manual',    -- manual | cron
  keywords_used  integer not null default 0,
  results_seen   integer not null default 0,
  new_leads      integer not null default 0,
  hot_leads      integer not null default 0,
  error_message  text
);

create table if not exists public.app_settings (
  key          text primary key,
  value        text not null,
  updated_at   timestamptz not null default now()
);

-- =====================================================================
-- REALTIME: the dashboard subscribes to leads changes.
-- =====================================================================
alter table public.leads replica identity full;
alter publication supabase_realtime add table public.leads;

-- =====================================================================
-- SECURITY: the app uses the service-role key server-side only, which
-- bypasses RLS. RLS is enabled with no public policies so the anon key
-- alone can never read lead data.
-- =====================================================================
alter table public.leads          enable row level security;
alter table public.source_sync    enable row level security;
alter table public.scan_logs      enable row level security;
alter table public.app_settings   enable row level security;

-- =====================================================================
-- AUTOMATION (optional but recommended): call the scan API every minute
-- using pg_cron + pg_net directly from Supabase. Requires the
-- "pg_cron" and "pg_net" extensions (Database -> Extensions).
-- Vercel Hobby cron cannot run per-minute jobs, so Supabase cron is used.
-- Replace <PROJECT-REF> with your Supabase project ref.
-- =====================================================================
-- select cron.schedule(
--   'buyer-radar-scan',
--   '* * * * *',
--   $$
--   select net.http_post(
--     url    := 'https://<PROJECT-REF>.supabase.co/functions/v1/radar-scan',
--     headers := jsonb_build_object(
--        'Content-Type', 'application/json',
--        'Authorization', 'Bearer <SUPABASE_ANON_KEY>'
--     ),
--     body := '{}'::jsonb
--   );
--   $$
-- );
