/**
 * AI lead qualification via OpenAI (gpt-4o-mini by default).
 * Returns lead_class, confidence (0-1), reason, and normalized fields.
 * Missing information is ALWAYS "Not available" — never invented.
 */

const SYSTEM_PROMPT = `You are a real-estate lead qualification engine for Lahore, Pakistan.
You are given one public web post. Decide whether the AUTHOR is a person who WANTS TO PURCHASE property (house, residential/commercial plot, apartment/flat, shop, office, agricultural/investment land) in Lahore.

Rules:
- Sellers, dealers/agents advertising listings, property news, market reports, price indexes and anything irrelevant are REJECTED.
- Only public information may be used. If a phone number or contact appears in the post text, copy it EXACTLY; never guess or format it yourself.
- If a piece of information is not present in the post, output exactly the string "Not available" for that field. NEVER invent names, numbers, budgets or areas.
- Areas must be localities of Lahore (DHA, Bahria Town, Johar Town, Gulberg, Model Town, etc.) and must be mentioned or clearly implied by the post.

Respond with ONLY a JSON object (no markdown) using this schema:
{
  "is_buyer": true|false,
  "lead_class": "Hot Lead" | "Warm Lead" | "General Lead" | "Rejected",
  "confidence": 0.0-1.0,
  "reason": "one or two sentences explaining the classification",
  "property_type": "Residential Plot"|"House"|"Apartment / Flat"|"Commercial Plot"|"Shop"|"Office"|"Agricultural / Investment Land"|"Unspecified",
  "plot_size": "e.g. 5 Marla, or Not available",
  "preferred_area": "area name or Not available",
  "budget": "as stated, or Not available",
  "purchase_timeline": "as stated, or Not available",
  "contact_phone": "exactly as publicly shown, or Not available",
  "business_contact": "as shown, or Not available",
  "other_contact": "as shown, or Not available",
  "ai_summary": "2-3 sentence summary of the buyer requirement in English",
  "public_name": "author/account name only if visible in the post text, else Not available"
}

Classification guide:
- Hot Lead: explicit purchase requirement plus area and/or budget.
- Warm Lead: clearly interested in buying but missing area and budget.
- General Lead: vague purchase interest only.
- Rejected: seller/dealer ad, duplicate, news, or irrelevant.`;

export async function classifyLead(post) {
  const apiKey = post.settings?.openai_api_key;
  if (!apiKey) {
    // Honest fallback: store raw candidate unclassified rather than guess.
    return {
      is_buyer: null,
      lead_class: "General Lead",
      confidence: 0,
      reason:
        "AI classification unavailable: no OpenAI API key configured. Add a key on the Settings page to qualify leads automatically.",
      property_type: "Unspecified",
      plot_size: "Not available",
      preferred_area: "Not available",
      budget: "Not available",
      purchase_timeline: "Not available",
      contact_phone: "Not available",
      business_contact: "Not available",
      other_contact: "Not available",
      ai_summary: "Not available (AI key missing)",
      public_name: "Not available",
    };
  }

  const userContent = `Post title: ${post.title || "Not available"}
Post text: ${post.snippet || "Not available"}
Post URL: ${post.url || "Not available"}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: post.settings?.openai_model || "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenAI API error ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }

  const data = await res.json();
  let parsed;
  try {
    parsed = JSON.parse(data.choices?.[0]?.message?.content || "{}");
  } catch {
    throw new Error("AI returned invalid JSON for a post.");
  }

  // Force every missing field to the honest "Not available" value.
  const NA = "Not available";
  const str = (v) => (typeof v === "string" && v.trim() ? v.trim() : NA);
  const validClasses = ["Hot Lead", "Warm Lead", "General Lead", "Rejected"];
  const cls = validClasses.includes(parsed.lead_class)
    ? parsed.lead_class
    : parsed.is_buyer === false
    ? "Rejected"
    : "General Lead";
  const conf = Math.max(0, Math.min(1, Number(parsed.confidence) || 0));

  return {
    is_buyer: Boolean(parsed.is_buyer),
    lead_class: cls,
    confidence: conf,
    reason: str(parsed.reason),
    property_type: str(parsed.property_type),
    plot_size: str(parsed.plot_size),
    preferred_area: str(parsed.preferred_area),
    budget: str(parsed.budget),
    purchase_timeline: str(parsed.purchase_timeline),
    contact_phone: str(parsed.contact_phone),
    business_contact: str(parsed.business_contact),
    other_contact: str(parsed.other_contact),
    ai_summary: str(parsed.ai_summary),
    public_name: str(parsed.public_name),
  };
}
