import { ALL_KEYWORDS, AREAS } from "./constants";

/**
 * Search-provider adapters. The ONLY sanctioned source is Google-indexed
 * public web search, run through an authorized search API:
 *   1. Serper.dev        (2,500 free queries on sign-up, no card needed)
 *   2. Google Programmable Search JSON API (100 free queries/day)
 * No connector bypasses logins, CAPTCHAs or platform access controls.
 * Facebook / Instagram / Zameen / Graana / OLX have no authorized
 * buyer-request search APIs (verified Nov 2026) and are NOT scraped.
 */

const AREA_SITE_HINTS = [
  "site:facebook.com",
  "site:forum.zameen.com",
  "site:reddit.com",
  "site:olx.com.pk",
  "",
];

function rotate(array, offset) {
  if (!array.length) return array;
  const i = ((offset % array.length) + array.length) % array.length;
  return array[i];
}

/**
 * Fetch buyer-intent results from the configured provider.
 * @param {object} settings  decrypted app settings (api keys)
 * @param {object} opts      { area, batchOffset, num }
 * @returns {Array<{title, snippet, url, provider}>}
 */
export async function fetchSearchResults(settings, opts = {}) {
  const { area = "All Lahore", batchOffset = 0, num = 10 } = opts;

  const keyword = rotate(ALL_KEYWORDS, batchOffset);
  const siteHint = rotate(AREA_SITE_HINTS, Math.floor(batchOffset / ALL_KEYWORDS.length));
  const areaPart = area === "All Lahore" ? "Lahore" : `${area} Lahore`;
  const query = `${keyword} ${areaPart} ${siteHint} -for-sale -"for sale" -dealer -agency`.trim();

  if (settings.serper_api_key) {
    return serperSearch(query, settings.serper_api_key, num);
  }
  if (settings.google_cse_api_key && settings.google_cse_cx) {
    return googleCseSearch(query, settings.google_cse_api_key, settings.google_cse_cx, num);
  }
  const err = new Error(
    "No search API configured. Add a Serper.dev or Google Programmable Search key on the Settings page."
  );
  err.code = "NO_SEARCH_API";
  throw err;
}

async function serperSearch(query, apiKey, num) {
  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ q: query, num, gl: "pk", hl: "en" }),
  });
  if (!res.ok) {
    throw new Error(`Serper API error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = await res.json();
  return (data.organic || []).map((r) => ({
    title: r.title || "",
    snippet: r.snippet || "",
    url: r.link || "",
    provider: "serper",
  }));
}

async function googleCseSearch(query, apiKey, cx, num) {
  const params = new URLSearchParams({
    key: apiKey,
    cx,
    q: query,
    num: String(Math.min(num, 10)),
  });
  const res = await fetch(`https://www.googleapis.com/customsearch/v1?${params}`);
  if (!res.ok) {
    throw new Error(`Google CSE error ${res.status}: ${(await res.text()).slice(0, 200)}`);
  }
  const data = await res.json();
  return (data.items || []).map((r) => ({
    title: r.title || "",
    snippet: r.snippet || "",
    url: r.link || "",
    provider: "google_cse",
  }));
}
