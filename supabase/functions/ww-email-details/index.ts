import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (status: number, obj: unknown) =>
  new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });

const EMAIL_RE = /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$/;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { to, couple_id, couple_names, pay } = await req.json();

    const toEmail = EMAIL_RE.test(String(to || "")) ? String(to).trim() : "";
    if (!toEmail) return json(400, { error: "missing or invalid 'to'" });

    const payRows: Array<[string, string]> = Array.isArray(pay)
      ? pay
          .filter((r: unknown) => Array.isArray(r) && r.length === 2)
          .map((r: [unknown, unknown]) => [String(r[0]).slice(0, 60), String(r[1]).slice(0, 200)])
      : [];
    if (!payRows.length) return json(400, { error: "missing payment details" });

    const coupleNames = String(couple_names || "").trim() || "the couple";

    // Reply-to the couple's own account email when we can resolve it — same convention
    // rsvp-confirm-email/send-appointment-email/send-guest-email already use.
    let replyTo: string | undefined;
    if (couple_id) {
      try {
        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );
        const { data: userData } = await supabase.auth.admin.getUserById(couple_id);
        if (userData?.user?.email) replyTo = userData.user.email;
      } catch (_e) {
        // Non-fatal — the email still sends without a reply-to.
      }
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return json(500, { error: "RESEND_API_KEY not set" });

    const payLines = payRows.map(([label, value]) => `${label}: ${value}`).join("\n");
    const text = [
      `Here are ${coupleNames}'s wishing well details:`,
      payLines,
      "Thanks so much for your generosity!",
    ].join("\n\n");
    const subject = `${coupleNames}'s wishing well details`;
    const html = brandedHtml({ kicker: "Wishing well details", title: `${coupleNames}'s gift details`, text });

    const payload: Record<string, unknown> = { from: "UnionVault <notifications@unionvault.app>", to: [toEmail], subject, text, html };
    if (replyTo) payload.reply_to = replyTo;

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const emailData = await emailRes.json();
    return new Response(JSON.stringify(emailData), {
      status: emailRes.status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ww-email-details error:", e);
    return json(500, { error: "internal error" });
  }
});

// ── Branded HTML version of a plain-text email ────────────────────────────────
// Duplicated per function (not shared) — same pattern as every other function here.
const LOGO_BASE = "https://unionvault.app/assets";
const escH = (s: string) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
function linkify(escaped: string): string {
  return escaped.replace(
    /\bhttps?:\/\/[^\s<]+[^\s<.,;:!?)'"]/g,
    (u) => `<a href="${u}" style="color:#8a6a2c">${u}</a>`
  );
}
function brandedHtml(opts: { kicker?: string; title?: string; text: string }): string {
  const paras = String(opts.text ?? "")
    .trim()
    .split(/\n{2,}/)
    .map(
      (p) =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.6">${linkify(escH(p)).replace(/\n/g, "<br>")}</p>`
    )
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">
<style>@media (prefers-color-scheme: dark){.uv-bg{background:#111114!important}.uv-card{background:#1A1A1F!important;color:#EDE6DA!important}.uv-band{background:#111114!important}.uv-muted{color:#A79E92!important}.uv-kicker{color:#E3C878!important}}</style></head>
<body class="uv-bg" style="margin:0;padding:24px 12px;background:#EFEAE1;font-family:Helvetica,Arial,sans-serif;color:#2C2222">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="uv-card" style="max-width:560px;background:#FBF8F3;border-radius:12px;overflow:hidden">
<tr><td class="uv-band" align="center" style="background:#F4EEE4;padding:22px 0 16px">
<picture><source srcset="${LOGO_BASE}/email-logo-white.png" media="(prefers-color-scheme: dark)"><img src="${LOGO_BASE}/email-logo-black.png" width="120" alt="UnionVault" style="display:block;width:120px;height:auto;border:0"></picture>
</td></tr>
<tr><td style="padding:24px 26px 10px">
${opts.kicker ? `<div class="uv-kicker" style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#8a6a2c;margin-bottom:8px">${escH(opts.kicker)}</div>` : ""}
${opts.title ? `<div style="font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.2;margin-bottom:16px">${escH(opts.title)}</div>` : ""}
${paras}
</td></tr>
<tr><td class="uv-muted" style="padding:0 26px 22px;font-size:11.5px;color:#6E6259">Sent with <a href="https://unionvault.app" style="color:#8a6a2c">UnionVault</a></td></tr>
</table></td></tr></table></body></html>`;
}
