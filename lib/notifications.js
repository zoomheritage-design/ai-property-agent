/**
 * Alerting: in-app notifications are the leads themselves (dashboard badge),
 * plus optional Email (Resend) and Telegram for new HOT leads.
 */

export async function sendEmailAlert(settings, lead) {
  const key = settings.resend_api_key;
  const to = settings.alert_email;
  if (!key || !to) {
    return { sent: false, reason: "Email alerts not configured (Settings: Resend API key + alert email)." };
  }
  const subject = `🔥 HOT buyer lead: ${lead.property_type} — ${lead.preferred_area}`;
  const html = `
    <h2>New Hot Buyer Lead</h2>
    <p><b>${lead.property_type}</b> in <b>${lead.preferred_area}</b></p>
    <p>${lead.ai_summary || ""}</p>
    <ul>
      <li>Budget: ${lead.budget}</li>
      <li>Phone: ${lead.contact_phone}</li>
      <li>Posted: ${lead.post_published_at || "Not available"}</li>
    </ul>
    <p><a href="${lead.post_url}">Open original post</a></p>`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: settings.alert_from_email || "Buyer Radar <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });
  if (!res.ok) return { sent: false, reason: `Resend error ${res.status}` };
  return { sent: true };
}

export async function sendTelegramAlert(settings, lead) {
  const token = settings.telegram_bot_token;
  const chatId = settings.telegram_chat_id;
  if (!token || !chatId) {
    return { sent: false, reason: "Telegram alerts not configured (Settings: bot token + chat id)." };
  }
  const text =
    `🔥 <b>HOT BUYER LEAD</b>\n` +
    `<b>${lead.property_type}</b> — ${lead.preferred_area}\n` +
    `${lead.ai_summary || ""}\n` +
    `Budget: ${lead.budget}\n` +
    `Phone: ${lead.contact_phone}\n` +
    `<a href="${lead.post_url}">Open original post</a>`;
  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: false }),
  });
  if (!res.ok) return { sent: false, reason: `Telegram error ${res.status}` };
  return { sent: true };
}

export async function dispatchHotLeadAlerts(settings, lead) {
  const results = await Promise.allSettled([
    sendEmailAlert(settings, lead),
    sendTelegramAlert(settings, lead),
  ]);
  return results.map((r) =>
    r.status === "fulfilled" ? r.value : { sent: false, reason: String(r.reason) }
  );
}
