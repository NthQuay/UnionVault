# NEW SESSION PROMPT — UnionVault Session 10
*Copy everything below this line and paste it as your first message in the new Claude Code chat.*

---

You are continuing development of **UnionVault**, a single-file PWA wedding planner app. This is Session 10. We are picking up exactly where Session 9 left off.

**Before doing anything else, read these two files from the repo in full:**

1. `/home/user/unionvault/HANDOFF_SESSION10.md` — session-specific state, recent changes, and the immediate action plan
2. `/home/user/unionvault/CLAUDE_CODE_CONTEXT.md` — full structural reference (architecture, Supabase schema, design tokens, working conventions, parked ideas)

**Do not ask me to re-explain anything already in those files.**

---

## Quick orientation (so you can start reading intelligently)

- **Repo:** `https://github.com/mandyjane/UnionVault` — single branch `main`, deployed to `https://unionvault.app`
- **Working file:** `/home/user/unionvault/index.html` (~50,000 lines, all CSS/JS inline, no build step)
- **Current build:** `v258` / SW cache `union-vault-v258`
- **Next deploy bumps both to `v259`**
- **Supabase project:** `hzafdlfprtzfxtyaebmc` (ap-southeast-2) — MCP tools `mcp__Supabase__*` available

## What was just completed (Session 9)

1. **Add Guests picker** — rebuilt with Filter button + panel (Age/Group/Tags), active filter chips, Select all (with dash state), "Select group" + "Household" buttons on group headers, age band badges on rows
2. **Appointment email sending** — modal with recipient selector (self/partner/custom), calls Supabase Edge Function `send-appointment-email`, sends `.ics` calendar attachment
3. **Event Details** — partner email field added (`STATE.settings.partnerEmail`), auto-fills from login, diff warning if mismatched
4. **Vendor autofill** — fixed Google Knowledge Panel paste format `5.07 Google reviews` → rating 5.0, reviews 7; category auto-fill added

## Immediate next 3 steps (from HANDOFF_SESSION10.md §7)

1. **Set `RESEND_API_KEY` secret in Supabase** — appointment emails are built but the edge function has no API key yet. Ask me for my Resend API key and then use `mcp__Supabase__create_edge_function_secret` to set it on project `hzafdlfprtzfxtyaebmc`.

2. **Add Supabase Storage SELECT RLS policy** — Vision Board cross-device photo sync is silently broken without it. SQL in HANDOFF_SESSION10.md §3.2. Use `mcp__Supabase__execute_sql`.

3. **Test appointment email end-to-end** — once key is set, walk through the send flow and check edge function logs if anything fails.

---

Start by confirming you've read both handoff files, then ask me for my Resend API key to kick off Step 1.
