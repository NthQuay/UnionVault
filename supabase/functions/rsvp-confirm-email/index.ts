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

function fmtDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

const DIET_LABELS: Record<string, string> = {
  vegetarian: "Vegetarian", pescatarian: "Pescatarian", vegan: "Vegan", halal: "Halal",
  kosher: "Kosher", lactose: "Lactose intolerant", gluten: "Gluten intolerant",
  allergy: "Allergy", other: "Other", glutenfree: "GF", dairyfree: "DF", nutallergy: "Nut allergy",
};
function describeDiet(d: string): string {
  if (d.startsWith("other:")) return "Other" + (d.slice(6) ? ` (${d.slice(6)})` : "");
  if (d.startsWith("allergy:")) return "Allergy" + (d.slice(8) ? `: ${d.slice(8)}` : "");
  return DIET_LABELS[d] || d;
}
function mergeDiet(items: string[]): string[] {
  const detail: Record<string, string> = {};
  items.forEach((d) => {
    if (d.startsWith("allergy:")) detail.allergy = d.slice(8);
    else if (d.startsWith("other:")) detail.other = d.slice(6);
  });
  const seen = new Set<string>();
  const base: string[] = [];
  items.forEach((d) => {
    if (!d || d.startsWith("allergy:") || d.startsWith("other:")) return;
    if (seen.has(d)) return;
    seen.add(d);
    base.push(d);
  });
  // A detail can in principle arrive with no matching bare token (e.g. a legacy row) —
  // don't let it silently vanish, surface it as its own entry.
  if (detail.allergy && !base.includes("allergy")) base.push("allergy");
  if (detail.other && !base.includes("other")) base.push("other");
  return base.map((d) => {
    if (d === "allergy" && detail.allergy) return `allergy:${detail.allergy}`;
    if (d === "other" && detail.other) return `other:${detail.other}`;
    return d;
  });
}

function base64Encode(text: string): string {
  // TextEncoder + manual base64, not a plain btoa(text) — couple/guest names can contain
  // non-ASCII characters, and btoa only handles latin1.
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { to, couple_id, couple_names, wedding_date, wedding_time, venue, site_url, members, ics_text } = await req.json();

    const toEmail = EMAIL_RE.test(String(to || "")) ? String(to).trim() : "";
    if (!toEmail) return json(400, { error: "missing or invalid 'to'" });

    const memberList: Array<{ name: string; attending: string; dietary?: unknown }> = Array.isArray(members) ? members : [];
    if (!memberList.length) return json(400, { error: "missing members" });

    const coupleNames = String(couple_names || "").trim() || "the couple";

    // Reply-to the couple's own account email when we can resolve it, so a guest
    // replying to their confirmation ("actually my number's different") reaches the
    // couple directly instead of landing in a dead notifications@ inbox — same
    // reply-to convention send-appointment-email/send-guest-email already use when
    // the couple is the one sending. No DB write here, read-only lookup.
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
        // Non-fatal — the confirmation still sends without a reply-to.
      }
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return json(500, { error: "RESEND_API_KEY not set" });

    const attendingNames = memberList.filter((m) => m.attending === "yes").map((m) => m.name);
    const declinedNames = memberList.filter((m) => m.attending === "no").map((m) => m.name);
    const joinN = (arr: string[]) =>
      arr.length <= 1 ? (arr[0] || "") : arr.slice(0, -1).join(", ") + " & " + arr[arr.length - 1];

    const lines: string[] = [`Thanks for RSVPing to ${coupleNames}'s wedding! Here's what we've got:`];
    if (attendingNames.length) lines.push(`${joinN(attendingNames)} confirmed as attending.`);
    if (declinedNames.length) lines.push(`${joinN(declinedNames)} let ${coupleNames} know they can't make it.`);

    // Each member can carry both the bare checkbox token ("allergy") and its free-text
    // detail ("allergy:<note>") as two separate array entries — merge them into one
    // ("allergy:<note>") before describing, same as the admin Online RSVPs card does, and
    // attribute each requirement to the guest who has it instead of one flat unlabelled list.
    const dietaryLines = memberList
      .map((m) => {
        const items = (Array.isArray(m.dietary) ? m.dietary : []).filter((d): d is string => typeof d === "string" && !!d);
        const merged = mergeDiet(items);
        if (!merged.length) return null;
        return `${m.name}: ${merged.map(describeDiet).join(", ")}`;
      })
      .filter((l): l is string => !!l);
    if (dietaryLines.length) lines.push(`Dietary notes:\n${dietaryLines.join("\n")}`);

    if (wedding_date) {
      const dateTime = [fmtDate(String(wedding_date)), wedding_time || null].filter(Boolean).join(" at ");
      const whenWhere = [dateTime, venue || null].filter(Boolean).join(" at ");
      lines.push(`The wedding is ${whenWhere}.`);
    }

    const hasIcs = typeof ics_text === "string" && ics_text.trim().length > 0;
    if (hasIcs) lines.push("We've attached a calendar invite so it's easy to save the date.");

    const siteUrl = /^https?:\/\//i.test(String(site_url || "")) ? String(site_url).trim() : "";
    if (siteUrl) lines.push(`You can revisit the wedding website any time here: ${siteUrl}`);

    lines.push("If anything above isn't right, just reply to this email and let them know.");

    const text = lines.join("\n\n");
    const subject = `Your RSVP to ${coupleNames}'s wedding`;
    const html = brandedHtml({ kicker: "RSVP confirmed", title: `${coupleNames} have received your reply.`, text });

    const payload: Record<string, unknown> = { from: "UnionVault <notifications@unionvault.app>", to: [toEmail], subject, text, html };
    if (replyTo) payload.reply_to = replyTo;
    if (hasIcs) {
      payload.attachments = [
        { filename: "wedding.ics", content: base64Encode(String(ics_text)) },
      ];
    }

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
    console.error("rsvp-confirm-email error:", e);
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
