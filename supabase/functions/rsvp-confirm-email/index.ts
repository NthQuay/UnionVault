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
    const { to, couple_id, couple_names, wedding_date, wedding_time, venue, site_url, members, ics_text, title_override, intro_override, closing_override, design_opts, preview } = await req.json();
    const isPreview = !!preview;

    const toEmail = EMAIL_RE.test(String(to || "")) ? String(to).trim() : "";
    if (!isPreview && !toEmail) return json(400, { error: "missing or invalid 'to'" });

    let memberList: Array<{ name: string; attending: string; dietary?: unknown }> = Array.isArray(members) ? members : [];
    if (!memberList.length) {
      if (!isPreview) return json(400, { error: "missing members" });
      memberList = [{ name: "[guest name]", attending: "yes", dietary: [] }];
    }

    const coupleNames = String(couple_names || "").trim() || "the couple";

    // Reply-to the couple's own account email when we can resolve it, so a guest
    // replying to their confirmation ("actually my number's different") reaches the
    // couple directly instead of landing in a dead notifications@ inbox — same
    // reply-to convention send-appointment-email/send-guest-email already use when
    // the couple is the one sending. No DB write here, read-only lookup.
    // Also resolves the couple's tier, for the same free/paid branding gate
    // send-guest-email uses — there's no authenticated caller here (the public RSVP
    // page calls this with no sign-in), so it's looked up from couple_id instead.
    let replyTo: string | undefined;
    let senderTier = "free";
    if (couple_id) {
      const SB_URL = Deno.env.get("SUPABASE_URL")!;
      const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      try {
        const supabase = createClient(SB_URL, SB_SERVICE);
        const { data: userData } = await supabase.auth.admin.getUserById(couple_id);
        if (userData?.user?.email) replyTo = userData.user.email;
      } catch (_e) {
        // Non-fatal — the confirmation still sends without a reply-to.
      }
      try {
        // compute_tier mirrors get_my_subscription()'s effective-tier logic (granted
        // access + subscriptions table), not just the bare user_profiles.tier column —
        // a plain column read missed any couple on a granted-access or active plan.
        const pr = await fetch(`${SB_URL}/rest/v1/rpc/compute_tier`, {
          method: "POST",
          headers: { apikey: SB_SERVICE, Authorization: `Bearer ${SB_SERVICE}`, "Content-Type": "application/json" },
          body: JSON.stringify({ p_user_id: couple_id }),
        });
        const t = await pr.json();
        if (typeof t === "string" && t) senderTier = t;
      } catch (_e) {
        // Non-fatal — defaults to free, branding shown.
      }
    }
    const showBranding = senderTier === "free";
    const HEX_RE = /^#[0-9a-fA-F]{6}$/;
    const accentColor = HEX_RE.test(String(design_opts?.accentColor || "")) ? String(design_opts.accentColor) : "#8a6a2c";
    const showLogo = design_opts?.showLogo !== false;
    const headerImageRaw = String(design_opts?.headerImage || "");
    const headerImageCustom = couple_id && headerImageRaw.startsWith(`${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public/photos/${couple_id}/`) && !headerImageRaw.includes("..")
      ? headerImageRaw : "";
    // No custom header → the UnionVault default banner; 'none' → the couple turned it off.
    const headerImage = headerImageRaw === "none" ? "" : (headerImageCustom || "https://unionvault.app/assets/email_header_default_blackgold.png");

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return json(500, { error: "RESEND_API_KEY not set" });

    const attendingNames = memberList.filter((m) => m.attending === "yes").map((m) => m.name);
    const declinedNames = memberList.filter((m) => m.attending === "no").map((m) => m.name);
    const joinN = (arr: string[]) =>
      arr.length <= 1 ? (arr[0] || "") : arr.slice(0, -1).join(", ") + " & " + arr[arr.length - 1];

    // Editable copy from the Communications page — {names} is the only token that makes
    // sense here (everything else in the body is assembled from the guest's own answers),
    // so it's the only one substituted. Unset/blank overrides keep the original wording.
    const fillNames = (t: string) => t.replace(/\{names\}/g, coupleNames);
    const introLine = typeof intro_override === "string" && intro_override.trim()
      ? fillNames(intro_override.trim())
      : `Thanks for RSVPing to ${coupleNames}'s wedding! Here's what we've got:`;
    const closingLine = typeof closing_override === "string" && closing_override.trim()
      ? fillNames(closing_override.trim())
      : "If anything above isn't right, just reply to this email and let them know.";

    const lines: string[] = [introLine];
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

    lines.push(closingLine);

    const text = lines.join("\n\n");
    const subject = `Your RSVP to ${coupleNames}'s wedding`;
    const titleText = typeof title_override === "string" && title_override.trim()
      ? fillNames(title_override.trim())
      : `${coupleNames} have received your reply.`;
    const html = brandedHtml({
      kicker: "RSVP confirmed", title: titleText, text,
      accentColor, showBranding, showLogo: showLogo || showBranding, headerImage,
    });

    if (isPreview) return json(200, { ok: true, html });

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
function linkifyWith(escaped: string, color: string): string {
  return escaped.replace(
    /\bhttps?:\/\/[^\s<]+[^\s<.,;:!?)'"]/g,
    (u) => `<a href="${u}" style="color:${color}">${u}</a>`
  );
}
// The Communications page's lightweight formatting markup — **bold** *italic* __underline__
// — applied after escaping/linkifying, so typed text can never inject real HTML, only
// these specific patterns become tags. Double-star before single-star so **bold** doesn't
// get half-eaten by the italic pass.
function applyInlineMarkup(s: string): string {
  return s.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/__(.+?)__/g, "<u>$1</u>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}
function brandedHtml(opts: { kicker?: string; title?: string; text: string; accentColor?: string; showBranding?: boolean; showLogo?: boolean; headerImage?: string }): string {
  const ac = escH(opts.accentColor || "#8a6a2c");
  const showBranding = opts.showBranding !== false;
  const showLogo = opts.showLogo !== false;
  const paras = String(opts.text ?? "")
    .trim()
    .split(/\n{2,}/)
    .map((p) => {
      const isHeading = /^##\s+/.test(p);
      const body = isHeading ? p.replace(/^##\s+/, "") : p;
      const html = applyInlineMarkup(linkifyWith(escH(body), ac)).replace(/\n/g, "<br>");
      return isHeading
        ? `<p style="margin:0 0 14px;font-size:17px;line-height:1.4;font-style:italic;font-weight:500">${html}</p>`
        : `<p style="margin:0 0 14px;font-size:15px;line-height:1.6">${html}</p>`;
    })
    .join("");
  const logoImg = `<picture><source srcset="${LOGO_BASE}/email-logo-white.png" media="(prefers-color-scheme: dark)"><img src="${LOGO_BASE}/email-logo-black.png" width="60" alt="Union Vault" style="display:block;width:60px;height:auto;border:0;margin:0 auto"></picture>`;
  const headerBand = opts.headerImage
    ? `<tr><td style="padding:0"><img src="${escH(opts.headerImage)}" width="560" alt="" style="display:block;width:100%;height:auto;border:0"></td></tr>`
    : "";
  // Footer (same as send-guest-email's): shown when Show logo is on, and always on the
  // free plan. Logo only when Show logo is on; the "Wedding planned with" line whenever
  // the footer shows. Lives in the footer so a header image can't displace the logo.
  const brandingFooter = (showBranding || showLogo)
    ? `<tr><td style="padding:0 26px 6px"><hr class="uv-rule" style="border:none;border-top:1px solid #E0D8CF;margin:0 0 14px"></td></tr>
${showLogo ? `<tr><td align="center" style="padding:0 26px 10px"><a href="https://unionvault.app" style="text-decoration:none">${logoImg}</a></td></tr>` : ""}
<tr><td align="center" class="uv-muted" style="padding:0 26px 22px;font-size:11px;color:#6E6259">Wedding planned with <a href="https://unionvault.app" style="color:${ac};text-decoration:none">Union Vault</a></td></tr>`
    : `<tr><td style="height:16px;line-height:16px;font-size:0">&nbsp;</td></tr>`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">
<style>@media (prefers-color-scheme: dark){.uv-bg{background:#111114!important}.uv-card{background:#1A1A1F!important;color:#EDE6DA!important}.uv-band{background:#111114!important}.uv-muted{color:#A79E92!important}.uv-kicker{color:#E3C878!important}.uv-rule{border-top-color:#34343B!important}}</style></head>
<body class="uv-bg" style="margin:0;padding:24px 12px;background:#EFEAE1;font-family:Helvetica,Arial,sans-serif;color:#2C2222">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="uv-card" style="max-width:560px;background:#FBF8F3;border-radius:12px;overflow:hidden">
${headerBand}
<tr><td style="padding:24px 26px 10px">
${opts.kicker ? `<div class="uv-kicker" style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${ac};margin-bottom:8px">${escH(opts.kicker)}</div>` : ""}
${opts.title ? `<div style="font-family:Georgia,'Times New Roman',serif;font-size:24px;line-height:1.2;margin-bottom:16px">${escH(opts.title)}</div>` : ""}
${paras}
</td></tr>
${brandingFooter}
</table></td></tr></table></body></html>`;
}
