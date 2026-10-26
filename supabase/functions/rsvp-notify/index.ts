import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const dietLabels: Record<string, string> = {
  vegetarian: "Vegetarian",
  vegan: "Vegan",
  glutenfree: "Gluten-free",
  dairyfree: "Dairy-free",
  nutallergy: "Nut allergy",
  other: "Other",
};

function formatDietary(dietary: string[]): string {
  if (!dietary || !dietary.length) return "";
  return dietary.map((d) => dietLabels[d] || d).join(", ");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const {
      couple_id,
      guest_name,
      attending,
      members,
      phone,
      email,
      address,
      message,
    } = await req.json();

    if (!couple_id || !guest_name) {
      return new Response(JSON.stringify({ error: "missing fields" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: userData } = await supabase.auth.admin.getUserById(couple_id);
    const coupleEmail = userData?.user?.email;
    if (!coupleEmail) {
      return new Response(JSON.stringify({ error: "couple not found" }), {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) {
      return new Response(JSON.stringify({ error: "RESEND_API_KEY not set" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const anyYes = attending === "yes";
    const from =
      Deno.env.get("RESEND_FROM") ||
      "UnionVault <notifications@unionvault.app>";

    // Build per-guest lines
    const memberList: Array<{ name: string; attending: string; dietary: string[]; meal?: string | null }> =
      Array.isArray(members) && members.length ? members : [{ name: guest_name, attending, dietary: [] }];

    const guestLines = memberList
      .map((m: { name: string; attending: string; dietary: string[]; meal?: string | null }) => {
        const status = m.attending === "yes" ? "✓ Attending" : "✗ Declined";
        const diet = formatDietary(m.dietary || []);
        const meal = m.meal ? `Meal: ${m.meal}` : "";
        const details = [diet, meal].filter(Boolean).join("; ");
        return details ? `  • ${m.name} — ${status} (${details})` : `  • ${m.name} — ${status}`;
      })
      .join("\n");

    const contactLines: string[] = [];
    if (email) contactLines.push(`Email: ${email}`);
    if (phone) contactLines.push(`Phone: ${phone}`);
    if (address) contactLines.push(`Address: ${address}`);
    if (message) contactLines.push(`Message: ${message}`);

    const contactBlock = contactLines.length
      ? "\n\nContact details:\n" + contactLines.map((l) => `  ${l}`).join("\n")
      : "";

    const subject = anyYes
      ? `New RSVP ✓ ${guest_name} is attending!`
      : `New RSVP — ${guest_name} has declined`;

    const text = anyYes
      ? `Great news!\n\n${guest_name} has accepted your wedding invitation.\n\nGuest responses:\n${guestLines}${contactBlock}\n\nLog in to UnionVault to manage your guest list.\nhttps://unionvault.app`
      : `${guest_name} has regretfully declined your wedding invitation.\n\nGuest responses:\n${guestLines}${contactBlock}\n\nLog in to UnionVault to view all RSVP responses.\nhttps://unionvault.app`;

    const html = brandedHtml({
      kicker: "New RSVP",
      title: anyYes ? `${guest_name} is attending` : `${guest_name} has declined`,
      text,
    });

    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to: [coupleEmail], subject, text, html }),
    });

    const emailData = await emailRes.json();
    return new Response(JSON.stringify(emailData), {
      status: emailRes.status,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("rsvp-notify error:", e);
    return new Response(JSON.stringify({ error: "internal error" }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});

// ── Branded HTML version of a plain-text email ────────────────────────────────
// Everything passed in is plain text and is escaped here, so callers can't inject
// markup. Black logo on cream; email apps that honour prefers-color-scheme swap
// to the white logo on a dark band.
const LOGO_BASE = 'https://unionvault.app/assets'
const escH = (s: string) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
function linkify(escaped: string): string {
  return escaped.replace(/\bhttps?:\/\/[^\s<]+[^\s<.,;:!?)'"]/g, (u) => `<a href="${u}" style="color:#8a6a2c">${u}</a>`)
}
function brandedHtml(opts: { kicker?: string; title?: string; text: string }): string {
  const paras = String(opts.text ?? '').trim().split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6">${linkify(escH(p)).replace(/\n/g, '<br>')}</p>`).join('')
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
${opts.kicker ? `<div class="uv-kicker" style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:#8a6a2c;margin-bottom:8px">${escH(opts.kicker)}</div>` : ''}
${opts.title ? `<div style="font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.2;margin-bottom:16px">${escH(opts.title)}</div>` : ''}
${paras}
</td></tr>
<tr><td class="uv-muted" style="padding:0 26px 22px;font-size:11.5px;color:#6E6259">Sent with <a href="https://unionvault.app" style="color:#8a6a2c">UnionVault</a></td></tr>
</table></td></tr></table></body></html>`
}
