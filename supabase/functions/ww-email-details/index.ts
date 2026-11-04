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
    const { to, couple_id, couple_names, digital, physical, referenceNote, amount } = await req.json();

    const toEmail = EMAIL_RE.test(String(to || "")) ? String(to).trim() : "";
    if (!toEmail) return json(400, { error: "missing or invalid 'to'" });

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
    const digitalRows = toRows(digital);
    const physicalRows = toRows(physical);
    if (!digitalRows.length && !physicalRows.length) return json(400, { error: "missing payment details" });

    const coupleNames = String(couple_names || "").trim() || "the couple";
    const refNote = String(referenceNote || "").trim().slice(0, 120);

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

    const amtNum = Number(amount);
    const hasAmount = Number.isFinite(amtNum) && amtNum > 0;
    const amountBlock = hasAmount
      ? `We can't wait to celebrate with you!\nYou can send your selected gift amount of $${amtNum.toFixed(2)} using the payment info below.`
      : `We can't wait to celebrate with you!\nYou can find our payment info below.`;

    const digitalNote = refNote
      ? `Be sure to include ${refNote} in the reference so we know who to thank.`
      : "Be sure to write your name/s in the reference so we know who to thank.";
    const physicalNote = "Place in a card and/or envelope with your name on and drop it into the wishing well box on the wedding day.";

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
      "Thanks so much for your generosity!",
    ].filter(Boolean).join("\n\n");
    const subject = `${coupleNames}'s wishing well details`;
    const html = brandedHtml({
      kicker: "Wishing well details",
      title: `${coupleNames}'s gift details`,
      text: [amountBlock, " ", `Here are ${coupleNames}'s wishing well details:`].join("\n\n"),
      afterText: [" ", "Thanks so much for your generosity!"].join("\n\n"),
      groups: [
        { title: "Digital gifting options", note: digitalNote, rows: digitalRows },
        { title: "Physical gifting options", note: physicalNote, rows: physicalRows },
      ],
    });

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

// Small circular monogram badge, same visual language as the couple's own "UV" mark —
// no external images or emoji, so it renders consistently across email clients.
const ICON_GLYPH: Record<string, string> = { payid: "ID", paypal: "PP", bank: "BT", cash: "$", cheque: "CQ" };
function iconBadge(icon: string): string {
  const glyph = ICON_GLYPH[icon] || "•";
  return `<td width="26" valign="top" style="padding:1px 10px 0 0"><span style="display:inline-block;width:22px;height:22px;line-height:22px;text-align:center;border-radius:50%;background:#F4EEE4;color:#8a6a2c;font-size:10px;font-weight:700">${escH(glyph)}</span></td>`;
}
function rowHtml(r: PayRow): string {
  const first = r.lines.length ? `${escH(r.label)}: ${linkify(escH(r.lines[0]))}` : escH(r.label);
  const rest = r.lines.slice(1).map((l) => `<div style="margin-top:2px">${linkify(escH(l))}</div>`).join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:9px"><tr>${iconBadge(r.icon)}<td style="font-size:15px;line-height:1.6;padding-top:1px">${first}${rest}</td></tr></table>`;
}
function groupHtml(group: { title: string; note: string; rows: PayRow[] }): string {
  if (!group.rows.length) return "";
  return `<div style="margin-bottom:18px">
<div style="font-size:13.5px;font-weight:700;margin-bottom:2px">${escH(group.title)}</div>
<div class="uv-muted" style="font-size:12.5px;font-style:italic;color:#6E6259;margin-bottom:10px">${escH(group.note)}</div>
${group.rows.map(rowHtml).join("")}
</div>`;
}

function brandedHtml(opts: { kicker?: string; title?: string; text: string; afterText?: string; groups?: Array<{ title: string; note: string; rows: PayRow[] }> }): string {
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
  const groupsHtml = (opts.groups || []).map(groupHtml).join("");
  const afterParas = opts.afterText ? buildParas(opts.afterText) : "";
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
${groupsHtml}
${afterParas}
</td></tr>
<tr><td class="uv-muted" style="padding:0 26px 22px;font-size:11.5px;color:#6E6259">Sent with <a href="https://unionvault.app" style="color:#8a6a2c">UnionVault</a></td></tr>
</table></td></tr></table></body></html>`;
}
