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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const { couple_id, name, amount, message } = await req.json();

    if (!couple_id || !amount || Number(amount) <= 0) {
      return json(400, { error: "missing or invalid fields" });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: userData } = await supabase.auth.admin.getUserById(couple_id);
    if (!userData?.user) {
      return json(404, { error: "couple not found" });
    }
    const coupleEmail = userData.user.email;

    const { data: rows } = await supabase
      .from("planner_data")
      .select("data")
      .eq("user_id", couple_id)
      .eq("section", "wishingwell")
      .single();

    if (!rows?.data) {
      return json(404, { error: "wishing well not found" });
    }

    const ww = rows.data as Record<string, unknown>;
    const contributions = Array.isArray(ww.contributions)
      ? ww.contributions
      : [];

    const now = new Date().toISOString();
    const newContrib = {
      id: crypto.randomUUID().replace(/-/g, "").slice(0, 12),
      name: String(name || "Anonymous").trim().slice(0, 200),
      amount: Math.round(Number(amount) * 100) / 100,
      message: String(message || "").trim().slice(0, 500),
      date: now.slice(0, 10),
      method: "website",
      thanked: false,
    };

    contributions.push(newContrib);
    ww.contributions = contributions;

    const { error: updateErr } = await supabase
      .from("planner_data")
      .update({ data: ww, updated_at: now })
      .eq("user_id", couple_id)
      .eq("section", "wishingwell");

    if (updateErr) {
      console.error("Update failed:", updateErr);
      return json(500, { error: "failed to log contribution" });
    }

    // Email the couple
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey && coupleEmail) {
      const displayName = newContrib.name || "Someone";
      const amt = `$${newContrib.amount.toFixed(2)}`;
      const subject = `New gift ${amt} from ${displayName}`;
      const text = `${displayName} has contributed ${amt} to your wishing well${newContrib.message ? `:\n\n"${newContrib.message}"` : "."}\n\nLog in to UnionVault to view your contributions.\nhttps://unionvault.app`;
      const html = brandedHtml({
        kicker: "Wishing Well",
        title: `${displayName} gifted ${amt}`,
        text,
      });
      const from =
        Deno.env.get("RESEND_FROM") ||
        "UnionVault <notifications@unionvault.app>";

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ from, to: [coupleEmail], subject, text, html }),
      }).catch(() => {});
    }

    return json(200, { ok: true });
  } catch (e) {
    console.error("ww-contribute error:", e);
    return json(500, { error: "internal error" });
  }
});

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
function brandedHtml(opts: {
  kicker?: string;
  title?: string;
  text: string;
}): string {
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
