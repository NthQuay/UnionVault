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

interface PayRow { icon: string; label: string; lines: string[] }

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { to, to_name, couple_id, couple_names, digital, physical, referenceNote, amount, title_override, intro_override, digital_note_override, physical_note_override, closing_override, design_opts, preview } = await req.json();
    const isPreview = !!preview;

    const toEmail = EMAIL_RE.test(String(to || "")) ? String(to).trim() : "";
    if (!isPreview && !toEmail) return json(400, { error: "missing or invalid 'to'" });

    const toRows = (arr: unknown): PayRow[] =>
      Array.isArray(arr)
        ? arr
            .filter((r: unknown): r is { icon?: unknown; label?: unknown; lines?: unknown } => !!r && typeof r === "object")
            .map((r) => ({
              icon: String((r as { icon?: unknown }).icon ?? "").slice(0, 20),
              label: String((r as { label?: unknown }).label ?? "").slice(0, 60),
              lines: (Array.isArray((r as { lines?: unknown }).lines) ? (r as { lines: unknown[] }).lines : [])
                .map((l) => String(l).slice(0, 200))
                .slice(0, 6),
            }))
            .filter((r) => r.label)
        : [];
    let digitalRows = toRows(digital);
    let physicalRows = toRows(physical);
    if (!digitalRows.length && !physicalRows.length) {
      if (!isPreview) return json(400, { error: "missing payment details" });
      digitalRows = [{ icon: "bank", label: "Bank transfer", lines: ["BSB: 000-000", "Acc no: 00000000"] }];
    }

    const coupleNames = String(couple_names || "").trim() || "the couple";
    const refNote = String(referenceNote || "").trim().slice(0, 120);

    // Reply-to the couple's own account email when we can resolve it — same convention
    // rsvp-confirm-email/send-appointment-email/send-guest-email already use. Also
    // resolves the couple's tier for the free/paid branding gate (no authenticated
    // caller here — the public Wishing Well page calls this with no sign-in).
    let replyTo: string | undefined;
    let senderTier = "free";
    let dbSettings: Record<string, any> | null = null;
    if (couple_id) {
      const SB_URL = Deno.env.get("SUPABASE_URL")!;
      const SB_SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      try {
        const supabase = createClient(SB_URL, SB_SERVICE);
        const { data: userData } = await supabase.auth.admin.getUserById(couple_id);
        if (userData?.user?.email) replyTo = userData.user.email;
      } catch (_e) {
        // Non-fatal — the email still sends without a reply-to.
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
      try {
        // The couple's own saved settings (Email design, Communications copy). Real sends come from the public
        // wedding website, which can't see these (they're private), so they're read here.
        const supabase = createClient(SB_URL, SB_SERVICE);
        const { data: sRow } = await supabase.from("planner_data").select("data").eq("user_id", couple_id).eq("section", "settings").maybeSingle();
        if (sRow?.data && typeof sRow.data === "object") dbSettings = sRow.data as Record<string, any>;
      } catch (_e) {
        // Non-fatal — falls back to whatever the caller sent, then to defaults.
      }
    }
    const showBranding = senderTier === "free";
    // Real sends use the couple's saved settings; app previews send their own (possibly
    // not-yet-synced) values, so those are used as-is.
    const useDb = !isPreview && !!dbSettings;
    const dbDesign = useDb ? (dbSettings!.commsDesign?.ww || dbSettings!.emailDesign || {}) : null;
    const dOpts = dbDesign
      ? {
          accentColor: dbDesign.accentColor,
          showLogo: dbDesign.showLogo,
          fontFamily: dbDesign.fontFamily,
          bodyFont: dbDesign.bodyFont,
          headerImage: dbDesign.headerImage === "none" ? "none"
            : (dbDesign.headerImage ? `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public/photos/${couple_id}/${dbDesign.headerImage}` : ""),
        }
      : design_opts;
    const dbText = useDb ? (dbSettings!.commsText?.ww || {}) : null;
    const titleOv = dbText ? dbText.title : title_override;
    const introOv = dbText ? dbText.intro : intro_override;
    const digitalNoteOv = dbText ? dbText.digitalNote : digital_note_override;
    const physicalNoteOv = dbText ? dbText.physicalNote : physical_note_override;
    const closingOv = dbText ? dbText.closing : closing_override;
    const HEX_RE = /^#[0-9a-fA-F]{6}$/;
    const accentColor = HEX_RE.test(String(dOpts?.accentColor || "")) ? String(dOpts.accentColor) : "#8a6a2c";
    const showLogo = dOpts?.showLogo !== false;
    const headerImageRaw = String(dOpts?.headerImage || "");
    const headerImageCustom = couple_id && headerImageRaw.startsWith(`${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public/photos/${couple_id}/`) && !headerImageRaw.includes("..")
      ? headerImageRaw : "";
    // No custom header → the UnionVault default banner; 'none' → the couple turned it off.
    const headerImage = headerImageRaw === "none" ? "" : (headerImageCustom || "https://unionvault.app/assets/email_header_default_blackgold.png");

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) return json(500, { error: "RESEND_API_KEY not set" });

    const amtNum = Number(amount);
    const hasAmount = Number.isFinite(amtNum) && amtNum > 0;
    const amountDisplay = hasAmount ? `$${amtNum.toFixed(2)}` : "";
    // Editable copy from the Communications page — {names} and (intro only) {amount} are
    // the only tokens that make sense here; everything else is assembled from the
    // couple's own payment details. Unset/blank overrides keep the original wording.
    const fillNames = (t: string) => t.replace(/\{names\}/g, coupleNames);
    const defaultIntro = hasAmount
      ? `We can't wait to celebrate with you!\nYou can send your selected gift amount of ${amountDisplay} using the payment info below.`
      : `We can't wait to celebrate with you!\nYou can find our payment info below.`;
    const amountBlock = typeof introOv === "string" && introOv.trim()
      ? fillNames(introOv.trim()).replace(/\{amount\}/g, amountDisplay)
      : defaultIntro;

    const defaultDigitalNote = refNote
      ? `Be sure to include ${refNote} in the reference so we know who to thank.`
      : "Be sure to write your name/s in the reference so we know who to thank.";
    const digitalNote = typeof digitalNoteOv === "string" && digitalNoteOv.trim()
      ? fillNames(digitalNoteOv.trim())
      : defaultDigitalNote;
    const physicalNote = typeof physicalNoteOv === "string" && physicalNoteOv.trim()
      ? fillNames(physicalNoteOv.trim())
      : "Place in a card and/or envelope with your name and drop it into the wishing well box on the wedding day.";
    const closingLine = typeof closingOv === "string" && closingOv.trim()
      ? fillNames(closingOv.trim())
      : "Thanks so much for your generosity!";
    const titleText = typeof titleOv === "string" && titleOv.trim()
      ? fillNames(titleOv.trim())
      : `${coupleNames}'s gift details`;

    // Plain-text fallback (the email's MIME text alternative, not what guests normally
    // see — the HTML below renders its own icon rows instead of paragraph-splitting
    // this). Each row becomes "Label: first line", with any further lines indented.
    const plainRow = (r: PayRow) => [r.lines.length ? `${r.label}: ${r.lines[0]}` : r.label, ...r.lines.slice(1).map((l) => `  ${l}`)].join("\n");
    const plainGroup = (title: string, note: string, rows: PayRow[]): string =>
      rows.length ? [title, note, rows.map(plainRow).join("\n")].join("\n") : "";
    // A lone non-breaking-space line becomes its own near-empty paragraph (a plain space
    // collapses to zero height in HTML, so it wouldn't add visible space) — an extra
    // beat of space around the payment block, on top of the normal paragraph gap.
    const text = [
      amountBlock,
      " ",
      `Here are ${coupleNames}'s wishing well details:`,
      plainGroup("Digital gifting options:", digitalNote, digitalRows),
      plainGroup("Physical gifting options:", physicalNote, physicalRows),
      " ",
      closingLine,
    ].filter(Boolean).join("\n\n");
    const subject = `${coupleNames}'s wishing well details`;
    const html = brandedHtml({
      kicker: "Wishing well details",
      title: titleText,
      text: [amountBlock, " ", `Here are ${coupleNames}'s wishing well details:`].join("\n\n"),
      afterText: [" ", closingLine].join("\n\n"),
      groups: [
        { title: "Digital gifting options", note: digitalNote, rows: digitalRows },
        { title: "Physical gifting options", note: physicalNote, rows: physicalRows },
      ],
      accentColor, showBranding, showLogo: showLogo || showBranding, headerImage,
      headerFont: FONT_STACKS[String(dOpts?.fontFamily || "")] || FONT_STACKS["serif"],
      bodyFont: FONT_STACKS[String(dOpts?.bodyFont || "")] || FONT_STACKS["sans-serif"],
    });

    if (isPreview) return json(200, { ok: true, html });

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
    if (emailRes.ok && couple_id) {
      await logSent(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", [{
        couple_id, kind: "ww", automatic: true, subject, to_email: toEmail,
        to_name: String(to_name || "").trim().slice(0, 120) || null,
        from_name: "UnionVault", resend_id: emailData?.id || null, html,
      }]);
    }
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
// Email-safe font stacks, keyed by the ids the app stores (fontFamily = header, bodyFont = body).
const FONT_STACKS: Record<string, string> = {
  'serif': "Georgia,'Times New Roman',serif",
  'palatino': "'Palatino Linotype',Palatino,'Book Antiqua',serif",
  'sans-serif': 'Helvetica,Arial,sans-serif',
  'trebuchet': "'Trebuchet MS',Verdana,sans-serif",
};
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

// Small circular monogram badge, same visual language as the couple's own "UV" mark —
// no external images or emoji, so it renders consistently across email clients.
const ICON_GLYPH: Record<string, string> = { payid: "ID", paypal: "PP", bank: "BT", cash: "$", cheque: "CQ" };
function iconBadge(icon: string, color: string): string {
  const glyph = ICON_GLYPH[icon] || "•";
  return `<td width="26" valign="top" style="padding:1px 10px 0 0"><span style="display:inline-block;width:22px;height:22px;line-height:22px;text-align:center;border-radius:50%;background:#F4EEE4;color:${color};font-size:10px;font-weight:700">${escH(glyph)}</span></td>`;
}
// "Label: value" → [label, value], for the aligned sub-field table below.
function splitLabelValue(line: string): [string, string] {
  const i = line.indexOf(": ");
  return i >= 0 ? [line.slice(0, i), line.slice(i + 2)] : ["", line];
}
function rowHtml(r: PayRow, color: string): string {
  // Bank transfer: label on its own line, then BSB/Acc no/Acc name as a tight,
  // colon-aligned mini table instead of one line per field with normal line spacing.
  if (r.icon === "bank" && r.lines.length) {
    const pairs = r.lines.map(splitLabelValue);
    const sub = `<table role="presentation" cellpadding="0" cellspacing="0">${pairs
      .map(([l, v]) => `<tr><td style="font-size:15px;line-height:1.45;padding-right:6px;white-space:nowrap">${escH(l)}:</td><td style="font-size:15px;line-height:1.45">${linkifyWith(escH(v), color)}</td></tr>`)
      .join("")}</table>`;
    return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:9px"><tr>${iconBadge(r.icon, color)}<td style="padding-top:1px"><div style="font-size:15px;line-height:1.6;margin-bottom:2px">${escH(r.label)}</div>${sub}</td></tr></table>`;
  }
  const first = r.lines.length ? `${escH(r.label)}: ${linkifyWith(escH(r.lines[0]), color)}` : escH(r.label);
  const rest = r.lines.slice(1).map((l) => `<div style="margin-top:2px">${linkifyWith(escH(l), color)}</div>`).join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:9px"><tr>${iconBadge(r.icon, color)}<td style="font-size:15px;line-height:1.6;padding-top:1px">${first}${rest}</td></tr></table>`;
}
function groupHtml(group: { title: string; note: string; rows: PayRow[] }, color: string): string {
  if (!group.rows.length) return "";
  return `<div style="margin-bottom:18px">
<div style="font-size:13.5px;font-weight:700;margin-bottom:2px">${escH(group.title)}</div>
<div class="uv-muted" style="font-size:12.5px;font-style:italic;color:#6E6259;margin-bottom:10px">${applyInlineMarkup(escH(group.note))}</div>
${group.rows.map((r) => rowHtml(r, color)).join("")}
</div>`;
}

function brandedHtml(opts: {
  kicker?: string; title?: string; text: string; afterText?: string; groups?: Array<{ title: string; note: string; rows: PayRow[] }>
  accentColor?: string; showBranding?: boolean; showLogo?: boolean; headerImage?: string; headerFont?: string; bodyFont?: string
}): string {
  const ac = escH(opts.accentColor || "#8a6a2c");
  const showBranding = opts.showBranding !== false;
  const showLogo = opts.showLogo !== false;
  const buildParas = (t: string) =>
    String(t ?? "")
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
  const paras = buildParas(opts.text);
  const groupsHtml = (opts.groups || []).map((g) => groupHtml(g, ac)).join("");
  const afterParas = opts.afterText ? buildParas(opts.afterText) : "";
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
<body class="uv-bg" style="margin:0;padding:24px 12px;background:#EFEAE1;font-family:${escH(opts.bodyFont || "Helvetica,Arial,sans-serif")};color:#2C2222">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="uv-card" style="max-width:560px;background:#FBF8F3;border-radius:12px;overflow:hidden">
${headerBand}
<tr><td style="padding:24px 26px 10px;font-family:${escH(opts.bodyFont || "Helvetica,Arial,sans-serif")}">
${opts.kicker ? `<div class="uv-kicker" style="font-size:11px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${ac};margin-bottom:8px">${escH(opts.kicker)}</div>` : ""}
${opts.title ? `<div style="font-family:${escH(opts.headerFont || "Georgia,'Times New Roman',serif")};font-size:24px;line-height:1.2;margin-bottom:16px">${escH(opts.title)}</div>` : ""}
${paras}
${groupsHtml}
${afterParas}
</td></tr>
${brandingFooter}
</table></td></tr></table></body></html>`;
}

// ── Sent-emails log ──────────────────────────────────────────────────────────
// One row per recipient in email_log (Communications → Sent). Best effort: a failed
// write is logged and never fails the send itself.
async function logSent(sbUrl: string, sbService: string, rows: Record<string, unknown>[]): Promise<void> {
  if (!sbUrl || !sbService || !rows.length) return
  try {
    const r = await fetch(`${sbUrl}/rest/v1/email_log`, {
      method: 'POST',
      headers: { apikey: sbService, Authorization: `Bearer ${sbService}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify(rows),
    })
    if (!r.ok) console.error('email_log insert failed', r.status, await r.text())
  } catch (e) { console.error('email_log insert failed', e) }
}
