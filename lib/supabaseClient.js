import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Intentionally not throwing at import time so the settings page can
  // explain what is missing. Server code below guards before use.
  console.warn("Supabase env vars are missing: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
}

export const supabase = createClient(url || "http://placeholder.invalid", anonKey || "placeholder", {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Admin client (server-side only, uses the service-role key). */
export function getAdminClient() {
  const adminUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || url;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!adminUrl || !serviceKey) return null;
  return createClient(adminUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function missingEnvVars() {
  const missing = [];
  if (!url) missing.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!anonKey) missing.push("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  return missing;
}
