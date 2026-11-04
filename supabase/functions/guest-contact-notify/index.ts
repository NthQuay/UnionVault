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
    const { couple_id, guest_name, guest_email, message } = await req.json();

    const name = String(guest_name || "").trim().slice(0, 200);
    const msg = String(message || "").trim().slice(0, 1000);
    const email = EMAIL_RE.test(String(guest_email || "")) ? String(guest_email).trim() : "";

    if (!couple_id || !name || !msg) {
      return json(400, { error: "missing fields" });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: userData } = await supabase.auth.admin.getUserById(couple_id);
    const coupleEmail = userData?.user?.email;
    if (!coupleEmail) {
      return json(404, { error: "couple not found" });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return json(500, { error: "RESEND_API_KEY not set" });
    }

    const from =
      Deno.env.get("RESEND_FROM") || "UnionVault <notifications@unionvault.app>";
    const subject = `New message from ${name}`;
    const replyLine = email
      ? `Reply to this email to answer ${name} directly at ${email}.`
      : "They didn't leave an email address — you'll need to find them another way to reply.";
    // Plain-text fallback keeps the quote marks (no box to lean on there).
    const text = `${name} sent you a message from your wedding website's RSVP page:\n\n"${msg}"\n\n${replyLine}\n\nLog in to UnionVault to manage your guest list.\nhttps://unionvault.app`;
    const html = brandedHtml({
      kicker: "New message",
      title: `${name} wants to get in touch`,
      text: `${name} sent you a message from your wedding website's RSVP page:`,
      extraHtml: `<div class="uv-quote" style="border-left:3px solid #C9A84C;border-radius:8px;padding:14px 16px;margin:0 0 16px;font-size:15px;line-height:1.6;font-style:italic">${linkify(escH(msg)).replace(/\n/g, "<br>")}</div>`,
      afterText: `${replyLine}\n\nLog in to UnionVault to manage your guest list.\nhttps://unionvault.app`,
    });

    const payload: Record<string, unknown> = { from, to: [coupleEmail], subject, text, html };
    if (email) payload.reply_to = email;

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
    console.error("guest-contact-notify error:", e);
    return json(500, { error: "internal error" });
  }
});

// ── Branded HTML version of a plain-text email ────────────────────────────────
// Everything passed in is plain text and is escaped here, so callers can't inject
// markup. Black logo on cream; email apps that honour prefers-color-scheme swap
// to the white logo on a dark band. Duplicated per function (not shared) — same
// pattern as rsvp-notify and ww-contribute.
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
function brandedHtml(opts: { kicker?: string; title?: string; text: string; extraHtml?: string; afterText?: string }): string {
  const buildParas = (t: string) =>
    String(t ?? "")
      .trim()
      .split(/\n{2,}/)
      .map(
        (p) =>
          `<p style="margin:0 0 14px;font-size:15px;line-height:1.6">${linkify(escH(p)).replace(/\n/g, "<br>")}</p>`
      )
      .join("");
  const paras = buildParas(opts.text);
  const afterParas = opts.afterText ? buildParas(opts.afterText) : "";
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">
<style>.uv-quote{background:#F4EEE4;color:#2C2222}@media (prefers-color-scheme: dark){.uv-bg{background:#111114!important}.uv-card{background:#1A1A1F!important;color:#EDE6DA!important}.uv-band{background:#111114!important}.uv-muted{color:#A79E92!important}.uv-kicker{color:#E3C878!important}.uv-quote{background:#232019!important;color:#EDE6DA!important}}</style></head>
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
${opts.extraHtml || ""}
${afterParas}
</td></tr>
<tr><td class="uv-muted" style="padding:0 26px 22px;font-size:11.5px;color:#6E6259">Sent with <a href="https://unionvault.app" style="color:#8a6a2c">UnionVault</a></td></tr>
</table></td></tr></table></body></html>`;
}
