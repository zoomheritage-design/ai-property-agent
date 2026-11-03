import crypto from "crypto";

/**
 * Stable dedupe hash: canonical URL (or title+snippet when no URL).
 * Weaker normalizations like stripping all punctuation are avoided so that
 * distinct posts keep distinct hashes.
 */
export function computeDedupeHash({ postUrl, title, snippet }) {
  const base =
    (postUrl || "").trim().toLowerCase().replace(/[#?].*$/, "") ||
    `${(title || "").trim().toLowerCase()}|${(snippet || "").trim().slice(0, 200).toLowerCase()}`;
  return crypto.createHash("sha256").update(base).digest("hex");
}

/** Extract a publicly displayed phone number from post text. */
export function extractPhone(text) {
  if (!text) return "Not available";
  const m = text.match(
    /(?:\+92|0)\s?-?\d{2,3}[\s-]?\d{7}|\+92[\s-]?\d{3}[\s-]?\d{7}|03\d{2}[\s-]?\d{7}/
  );
  return m ? m[0].trim() : "Not available";
}

/** Extract a Pakistani Rupee budget from post text. */
export function extractBudget(text) {
  if (!text) return "Not available";
  const m = text.match(
    /(\d+(?:\.\d+)?)\s*(crore|karor|lakh|lac|arab|million|mn)\b/i
  );
  if (!m) return "Not available";
  const unit = m[2].toLowerCase();
  return `PKR ${m[1]} ${unit.charAt(0).toUpperCase() + unit.slice(1)}`;
}

/** Detect the language family of the query/post. */
export function detectLanguage(text) {
  if (/[\u0600-\u06FF]/.test(text)) return "urdu";
  if (/[\u0900-\u097F]/.test(text)) return "hindi";
  return "english_or_roman_urdu";
}
