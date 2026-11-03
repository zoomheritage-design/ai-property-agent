-- ============================================================
-- ONE-TIME API-KEY SET UP (run in Supabase SQL Editor)
-- Fill the values on the right, then run. Alternatively enter
-- the same keys in the app's Settings page after deployment.
-- ============================================================
insert into public.app_settings (key, value) values
  ('serper_api_key',    'PASTE-SERPER-KEY'),
  ('google_cse_api_key','PASTE-GOOGLE-API-KEY'),
  ('google_cse_cx',     'PASTE-CSE-CX-ID'),
  ('openai_api_key',    'PASTE-OPENAI-KEY'),
  ('resend_api_key',    'PASTE-RESEND-KEY'),
  ('alert_email',       'you@example.com'),
  ('telegram_bot_token',''),
  ('telegram_chat_id',  ''),
  ('area_filter',       'All Lahore')
on conflict (key) do update set value = excluded.value, updated_at = now();
